// POST /api/stripe/webhook
// Processes Stripe subscription lifecycle events.
// Critical: raw body required for signature verification.
// Idempotent: uses stripe_event_id unique constraint.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// CRITICAL for Vercel: disable body parsing to get raw body
export const config = { api: { bodyParser: false } };

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_FIRED_UP]: "fired_up",
  [process.env.STRIPE_PRICE_BRUTAL]:   "brutal",
};

function getPlanFromSubscription(subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  return PRICE_TO_PLAN[priceId] || "free";
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end",  ()    => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function getUserIdFromCustomer(supabase, customerId, metadata) {
  // Try by stripe_customer_id first
  const { data } = await supabase
    .from("profiles")
    .select("id, plan")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (data) return data;

  // Fallback: find by supabase_user_id in metadata
  const userId = metadata?.supabase_user_id;
  if (!userId) return null;

  const { data: profileById } = await supabase
    .from("profiles")
    .select("id, plan")
    .eq("id", userId)
    .maybeSingle();

  // Save customer_id for future lookups
  if (profileById) {
    await supabase.from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  return profileById;
}

async function handleSubscriptionChange(supabase, subscription, eventId, reason) {
  console.log("WEBHOOK: handleSubscriptionChange", subscription.customer, subscription.id);
  const profile = await getUserIdFromCustomer(supabase, subscription.customer, subscription.metadata);
  console.log("WEBHOOK: profile found", profile?.id || "NOT FOUND");
  if (!profile) return; // customer not found — ignore

  const newPlan = getPlanFromSubscription(subscription);
  const oldPlan = profile.plan;

  // Idempotency check
  const { data: existing } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();
  if (existing) return; // already processed

  // In newer Stripe API versions, current_period_end is on the subscription item
  const periodEnd = subscription.current_period_end
    || subscription.items?.data?.[0]?.current_period_end
    || null;
  const periodStart = subscription.current_period_start
    || subscription.items?.data?.[0]?.current_period_start
    || null;

  // Update profile
  await supabase.from("profiles").update({
    plan:                       newPlan,
    stripe_subscription_id:     subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end:  periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    cancel_at_period_end:       subscription.cancel_at_period_end || false,
    billing_start:              periodStart
      ? new Date(periodStart * 1000).toISOString()
      : null,
  }).eq("id", profile.id);

  // Log event with idempotency key
  await supabase.from("subscription_events").insert({
    user_id:         profile.id,
    stripe_event_id: eventId,
    event_type:      reason,
    old_plan:        oldPlan,
    new_plan:        newPlan,
    metadata:        { subscription_id: subscription.id, status: subscription.status },
  });

  // Log plan history only on actual change
  if (oldPlan !== newPlan) {
    await supabase.from("plan_history").insert({
      user_id:  profile.id,
      old_plan: oldPlan,
      new_plan: newPlan,
      reason:   "stripe_webhook",
    });
  }
}

async function handleSubscriptionDeleted(supabase, subscription, eventId) {
  const profile = await getUserIdFromCustomer(supabase, subscription.customer);
  if (!profile) return;

  const { data: existing } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();
  if (existing) return;

  const oldPlan = profile.plan;

  await supabase.from("profiles").update({
    plan:                       "free",
    stripe_subscription_status: "canceled",
    cancel_at_period_end:       false,
    stripe_current_period_end:  null,
  }).eq("id", profile.id);

  await supabase.from("subscription_events").insert({
    user_id:         profile.id,
    stripe_event_id: eventId,
    event_type:      "customer.subscription.deleted",
    old_plan:        oldPlan,
    new_plan:        "free",
  });

  if (oldPlan !== "free") {
    await supabase.from("plan_history").insert({
      user_id:  profile.id,
      old_plan: oldPlan,
      new_plan: "free",
      reason:   "stripe_webhook",
    });
  }
}

async function handlePaymentFailed(supabase, invoice, eventId) {
  const profile = await getUserIdFromCustomer(supabase, invoice.customer);
  if (!profile) return;

  const { data: existing } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .maybeSingle();
  if (existing) return;

  await supabase.from("profiles").update({
    stripe_subscription_status: "past_due",
  }).eq("id", profile.id);

  await supabase.from("subscription_events").insert({
    user_id:         profile.id,
    stripe_event_id: eventId,
    event_type:      "invoice.payment_failed",
    metadata:        { invoice_id: invoice.id, amount: invoice.amount_due },
  });
  // Note: email notification TODO — integrate Resend/SendGrid post-launch
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Get raw body for signature verification
  const rawBody = await getRawBody(req);
  const sig     = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature failed: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(supabase, event.data.object, event.id, event.type);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object, event.id);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(supabase, event.data.object, event.id);
        break;
      case "invoice.payment_succeeded":
        // Subscription already updated by subscription.updated event
        // Just log for audit trail
        const inv = event.data.object;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription);
          await handleSubscriptionChange(supabase, sub, event.id, "invoice.payment_succeeded");
        }
        break;
      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    // Log error but still return 200 to prevent Stripe retries for non-recoverable errors
    console.error("Webhook handler error:", err);
    return res.status(200).json({ received: true, error: err.message });
  }
}
