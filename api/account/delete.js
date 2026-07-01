// DELETE /api/account/delete
// Permanently deletes the user's account and all associated data.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: "Invalid token" });

  try {
    // Delete all user data
    await supabase.from("roasts").delete().eq("user_id", user.id);
    await supabase.from("battles").delete().eq("user_id", user.id);
    await supabase.from("challenges").delete().eq("created_by", user.id);
    await supabase.from("plan_history").delete().eq("user_id", user.id);
    await supabase.from("subscription_events").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);

    // Delete auth user completely
    await supabase.auth.admin.deleteUser(user.id);

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to delete account" });
  }
}
