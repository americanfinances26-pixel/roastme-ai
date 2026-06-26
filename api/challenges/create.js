// POST /api/challenges/create
// Creates a challenge with a server-generated UUID.
// Replaces the JSON-in-URL pattern that allowed score forgery.
// Rate limited: max 20 challenges per hour per user.

import { createClient } from "@supabase/supabase-js";

const VALID_MODES = ["Savage","Honest","Mentor","Comedian"];

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

  // Rate limit: max 20 challenges per hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("challenges")
    .select("id", { count: "exact", head: true })
    .eq("challenger_id", user.id)
    .gte("created_at", hourAgo);

  if (count >= 20) {
    return res.status(429).json({ error: "Too many challenges. Try again in an hour." });
  }

  const { roastId, score, oneliner, mode, inputType } = req.body;

  if (!VALID_MODES.includes(mode)) return res.status(400).json({ error: "Invalid mode" });
  if (typeof score !== "number" || score < 1 || score > 10) return res.status(400).json({ error: "Invalid score" });
  if (!oneliner) return res.status(400).json({ error: "Missing oneliner" });

  // If roastId provided, verify it belongs to this user
  if (roastId) {
    const { data: roast } = await supabase
      .from("roasts")
      .select("id")
      .eq("id", roastId)
      .eq("user_id", user.id)
      .single();
    if (!roast) return res.status(403).json({ error: "Roast not found or not yours" });
  }

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      challenger_id:       user.id,
      roast_id:            roastId || null,
      challenger_score:    score,
      challenger_oneliner: oneliner,
      mode,
      input_type:          inputType || "Anything",
      expires_at:          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: "Failed to create challenge" });

  return res.status(200).json({ challengeId: challenge.id });
}
