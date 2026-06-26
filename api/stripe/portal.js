// POST /api/stripe/portal
// Creates a Stripe Billing Portal session for subscription management.
// User can cancel, update payment method, view invoices.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return res.status(400).json({ error: "No billing account found" });
  }

  const appUrl = process.env.APP_URL || "https://roastmeai.vercel.app";
  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${appUrl}/account`,
  });

  return res.status(200).json({ url: portalSession.url });
}
