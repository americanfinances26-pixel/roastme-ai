// POST /api/stripe/checkout
// Creates a Stripe Checkout session for new subscriptions,
// or updates an existing subscription for upgrades/downgrades.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PRICE_IDS = {
  fired_up: process.env.STRIPE_PRICE_FIRED_UP,
  brutal:   process.env.STRIPE_PRICE_BRUTAL,
};

const PLAN_FROM_PRICE = Object.fromEntries(
  Object.entries(PRICE_IDS).map(([plan, price]) => [price, plan])
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { planId } = req.body;
  if (!["fired_up", "brutal"].includes(planId)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const priceId = PRICE_IDS[planId];
  if (!priceId) return res.status(500).json({ error: "Price not configured" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status")
    .eq("id", user.id)
    .single()
    .catch(() => ({ data: null }));

  // Get or create Stripe customer
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // If active subscription exists — update (upgrade/downgrade with prorate)
  if (profile?.stripe_subscription_id &&
      ["active","trialing","past_due"].includes(profile?.stripe_subscription_status)) {
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      const currentItemId = subscription.items.data[0]?.id;

      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: currentItemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: { supabase_user_id: user.id },
      });

      // Optimistic update — webhook will confirm
      const oldPlan = profile.plan;
      await supabase.from("profiles")
        .update({ plan: planId })
        .eq("id", user.id);

      await supabase.from("plan_history").insert({
        user_id:  user.id,
        old_plan: oldPlan,
        new_plan: planId,
        reason:   planId === oldPlan ? "downgrade" : "upgrade",
      });

      return res.status(200).json({ type: "updated", plan: planId });
    } catch(e) {
      // If update fails, fall through to new checkout session
    }
  }

  // New subscription — Stripe Checkout
  const appUrl = process.env.APP_URL || "https://roastme-ai26.vercel.app";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/account?upgraded=true&plan=${planId}`,
    cancel_url:  `${appUrl}/?cancelled=true`,
    metadata: { supabase_user_id: user.id, plan: planId },
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan: planId },
    },
  });

  return res.status(200).json({ type: "checkout", url: session.url });
}
