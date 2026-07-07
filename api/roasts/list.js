// GET /api/roasts/list
// Returns the authenticated user's roast history (summary, no heavy fields).
// Pagination via ?offset=N

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  const offset = parseInt(req.query.offset || "0", 10);
  const limit  = 50;

  // Fetch all fields including wrong, works, fix, the_fix
  const { data: roasts, error } = await supabase
    .from("roasts")
    .select("id, score, oneliner, verdict, mode, input_text, intensity, wrong, works, fix, the_fix, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: "Failed to load history" });

  return res.status(200).json({ roasts: roasts || [] });
}
