// POST /api/roasts/save
// Saves a completed roast to Supabase.
// Called after every successful roast for authenticated users.
// Returns the new roast id so the frontend can use it for challenges.

import { createClient } from "@supabase/supabase-js";

const VALID_MODES       = ["Savage","Honest","Mentor","Comedian"];
const VALID_INTENSITIES = ["mild","spicy","savage","nuclear","obliterate"];

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

  const { mode, inputType, inputText, score, oneliner, verdict, wrong, works, fix, theFix, intensity } = req.body;

  // Validate required fields
  if (!VALID_MODES.includes(mode)) return res.status(400).json({ error: "Invalid mode" });
  if (typeof score !== "number" || score < 1 || score > 10) return res.status(400).json({ error: "Invalid score" });
  if (!oneliner) return res.status(400).json({ error: "Missing oneliner" });

  const { data: roast, error } = await supabase
    .from("roasts")
    .insert({
      user_id:       user.id,
      mode,
      input_type:    inputType  || "Anything",
      input_text:    (inputText || "").slice(0, 500),
      score,
      oneliner,
      verdict:       verdict    || null,
      wrong:         Array.isArray(wrong) ? wrong : [],
      works:         Array.isArray(works) ? works : [],
      fix:           Array.isArray(fix)   ? fix   : [],
      the_fix:       theFix     || null,
      intensity:     VALID_INTENSITIES.includes(intensity) ? intensity : "savage",
      prompt_version: 2,
    })
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: "Failed to save roast" });

  return res.status(200).json({ id: roast.id });
}
