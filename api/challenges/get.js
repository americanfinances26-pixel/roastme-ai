// GET /api/challenges/get?id=UUID
// Returns challenge data for display in battle-intro screen.
// Public endpoint — no auth required (anyone with the link can view).
// Validates: exists, not expired, status=pending.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: "Invalid challenge ID" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("id, challenger_score, challenger_oneliner, mode, input_type, status, expires_at, view_count, accept_count")
    .eq("id", id)
    .single();

  if (error || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  if (challenge.status !== "pending") {
    return res.status(410).json({ error: "Challenge already accepted or expired" });
  }

  if (new Date(challenge.expires_at) < new Date()) {
    // Mark as expired
    await supabase.from("challenges").update({ status: "expired" }).eq("id", id);
    return res.status(410).json({ error: "Challenge has expired" });
  }

  // Increment view count (non-blocking)
  supabase.from("challenges")
    .update({ view_count: challenge.view_count + 1 })
    .eq("id", id)
    .then(() => {});

  return res.status(200).json({
    challenge: {
      id:                  challenge.id,
      score:               challenge.challenger_score,
      oneliner:            challenge.challenger_oneliner,
      mode:                challenge.mode,
      inputType:           challenge.input_type,
      expiresAt:           challenge.expires_at,
    }
  });
}
