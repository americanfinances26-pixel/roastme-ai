// POST /api/profile/migrate
// One-time migration of localStorage history to Supabase.
// Called once per user after first login.
// Idempotent: uses migration_completed_at flag.

import { createClient } from "@supabase/supabase-js";

const VALID_MODES = ["Savage", "Honest", "Mentor", "Comedian"];

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  // Try ISO first
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Try DD/MM/YYYY (Portuguese locale)
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const iso = new Date(`${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`);
    if (!isNaN(iso.getTime())) return iso.toISOString();
  }
  return new Date().toISOString();
}

function normalizeRoast(entry, userId) {
  return {
    user_id:    userId,
    mode:       VALID_MODES.includes(entry.mode) ? entry.mode : "Savage",
    input_type: entry.inputType || "Anything",
    input_text: (entry.input || "").slice(0, 500),
    score:      Math.min(10, Math.max(1, Number(entry.score) || 1)),
    oneliner:   entry.oneliner || "",
    verdict:    entry.verdict  || null,
    wrong:      Array.isArray(entry.wrong) ? entry.wrong : [],
    works:      Array.isArray(entry.works) ? entry.works : [],
    fix:        Array.isArray(entry.fix)   ? entry.fix   : [],
    the_fix:    entry.theFix || null,
    intensity:  ["mild","spicy","savage","nuclear","obliterate"].includes(entry.intensity)
                  ? entry.intensity : "savage",
    created_at: parseLocalDate(entry.date),
  };
}

function normalizeBattle(entry, userId) {
  return {
    challenger_id:     userId,
    challenger_score:  Math.min(10, Math.max(1, Number(entry.myScore) || 1)),
    challenger_oneliner: entry.myOneliner || "",
    opponent_score:    Math.min(10, Math.max(1, Number(entry.opponentScore) || 1)),
    opponent_oneliner: entry.opponentOneliner || null,
    opponent_is_anonymous: true,
    mode:              VALID_MODES.includes(entry.mode) ? entry.mode : "Savage",
    result:            ["win","loss","tie"].includes(entry.result) ? entry.result : "tie",
    created_at:        parseLocalDate(entry.date),
  };
}

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

  // Check if already migrated
  const { data: profile } = await supabase
    .from("profiles")
    .select("migration_completed_at")
    .eq("id", user.id)
    .single();

  if (profile?.migration_completed_at) {
    return res.status(200).json({ skipped: true, reason: "already_migrated" });
  }

  const { history = [], battleHistory = [] } = req.body;

  // Nothing to migrate — mark as complete immediately
  if (history.length === 0 && battleHistory.length === 0) {
    await supabase
      .from("profiles")
      .update({ migration_completed_at: new Date().toISOString() })
      .eq("id", user.id);
    return res.status(200).json({ success: true, roastsInserted: 0, battlesInserted: 0 });
  }

  let roastsInserted = 0;
  let battlesInserted = 0;
  const errors = [];

  // Migrate roasts in batches of 10
  if (history.length > 0) {
    const normalized = history
      .map(e => { try { return normalizeRoast(e, user.id); } catch { return null; } })
      .filter(Boolean);

    for (let i = 0; i < normalized.length; i += 10) {
      const batch = normalized.slice(i, i + 10);
      const { error } = await supabase.from("roasts").insert(batch);
      if (error) {
        errors.push(`roasts batch ${i}: ${error.message}`);
      } else {
        roastsInserted += batch.length;
      }
    }
  }

  // Migrate battles in batches of 10
  if (battleHistory.length > 0) {
    const normalized = battleHistory
      .map(e => { try { return normalizeBattle(e, user.id); } catch { return null; } })
      .filter(Boolean);

    for (let i = 0; i < normalized.length; i += 10) {
      const batch = normalized.slice(i, i + 10);
      const { error } = await supabase.from("battles").insert(batch);
      if (error) {
        errors.push(`battles batch ${i}: ${error.message}`);
      } else {
        battlesInserted += batch.length;
      }
    }
  }

  // Mark migration complete regardless of partial errors
  // (partial data is better than infinite retry loops)
  await supabase
    .from("profiles")
    .update({ migration_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  return res.status(200).json({
    success: true,
    roastsInserted,
    battlesInserted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
