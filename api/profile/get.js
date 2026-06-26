// GET /api/profile/get
// Returns the authenticated user's profile including plan.
// Called on login to load real plan from Supabase instead of localStorage.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, plan, stripe_subscription_status, cancel_at_period_end, stripe_current_period_end, billing_start, migration_completed_at, created_at")
    .eq("id", user.id)
    .single();

  if (error) return res.status(500).json({ error: "Profile not found" });

  return res.status(200).json({ profile });
}
