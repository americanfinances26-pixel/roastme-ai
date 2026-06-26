// POST /api/battles/save
// Saves a completed battle result to Supabase.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const { challengerRoastId, challengerScore, challengerOneliner, opponentScore, opponentOneliner, mode, result, challengeId } = req.body;

  if (!["win","loss","tie"].includes(result)) return res.status(400).json({ error: "Invalid result" });

  const { data: battle, error } = await supabase
    .from("battles")
    .insert({
      challenger_id:        user.id,
      challenger_roast_id:  challengerRoastId || null,
      challenger_score:     Math.min(10, Math.max(1, Number(challengerScore) || 1)),
      challenger_oneliner:  challengerOneliner || null,
      opponent_score:       Math.min(10, Math.max(1, Number(opponentScore) || 1)),
      opponent_oneliner:    opponentOneliner || null,
      opponent_is_anonymous: true,
      challenge_id:         challengeId || null,
      mode:                 mode || "Savage",
      result,
    })
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: "Failed to save battle" });

  return res.status(200).json({ id: battle.id });
}
