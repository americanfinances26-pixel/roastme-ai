// GET /api/challenges/get?id=UUID
// Returns a challenge by UUID. Public endpoint — no auth required.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing challenge ID" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("id, score, oneliner, mode, input_type, expires_at, created_at")
    .eq("id", id)
    .single();

  if (error || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Check expiry
  if (challenge.expires_at && new Date(challenge.expires_at) < new Date()) {
    return res.status(410).json({ error: "Challenge has expired" });
  }

  return res.status(200).json({ challenge });
}
