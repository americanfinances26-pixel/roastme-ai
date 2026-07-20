// POST /api/roasts/save
// Phase 1: persists axis scores + primary issue.
// Synchronously recalculates communication_context after every save.
// Order: save roast → update context → respond to frontend.

import { createClient } from "@supabase/supabase-js";

const VALID_MODES       = ["Savage","Honest","Mentor","Comedian"];
const VALID_INTENSITIES = ["mild","spicy","savage","nuclear","obliterate"];

// Axis weights — single source of truth (mirrors roast.js)
const AXIS_WEIGHTS = {
  clarity:      0.25,
  specificity:  0.25,
  first_line:   0.20,
  credibility:  0.15,
  voice:        0.10,
  reader_focus: 0.05,
};

// ─────────────────────────────────────────────────────────────────
// CALCULATE COMMUNICATION CONTEXT
// Reads last 20 roasts with axis scores.
// Returns a compact object that represents the user as a communicator.
// Called synchronously — result is awaited before responding.
// ─────────────────────────────────────────────────────────────────
async function recalculateCommunicationContext(supabase, userId) {
  const { data: roasts } = await supabase
    .from("roasts")
    .select(`
      clarity_score, specificity_score, first_line_score,
      credibility_score, voice_score, reader_focus_score,
      primary_issue_axis
    `)
    .eq("user_id", userId)
    .not("clarity_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!roasts || roasts.length < 1) return null;

  const n = roasts.length;

  // ── Weighted average score per roast (most recent = weight n)
  const roastScores = roasts.map((r, i) => {
    const s =
      (r.clarity_score      || 0) * AXIS_WEIGHTS.clarity +
      (r.specificity_score  || 0) * AXIS_WEIGHTS.specificity +
      (r.first_line_score   || 0) * AXIS_WEIGHTS.first_line +
      (r.credibility_score  || 0) * AXIS_WEIGHTS.credibility +
      (r.voice_score        || 0) * AXIS_WEIGHTS.voice +
      (r.reader_focus_score || 0) * AXIS_WEIGHTS.reader_focus;
    return { score: s, weight: n - i }; // most recent gets highest weight
  });

  // ── Average score (simple mean of calculated scores)
  const validScores = roastScores.filter(r => r.score > 0);
  const averageScore = validScores.length > 0
    ? Math.round(validScores.reduce((a, r) => a + r.score, 0) / validScores.length * 10) / 10
    : null;

  // ── Weighted average per axis
  const totalWeight = (n * (n + 1)) / 2;
  const axisMap = {
    clarity:      "clarity_score",
    specificity:  "specificity_score",
    first_line:   "first_line_score",
    credibility:  "credibility_score",
    voice:        "voice_score",
    reader_focus: "reader_focus_score",
  };

  const axisWeightedAvgs = {};
  for (const [axis, col] of Object.entries(axisMap)) {
    let wSum = 0, wTotal = 0;
    roasts.forEach((r, i) => {
      const val = r[col];
      if (val != null && val > 0) {
        const w = n - i;
        wSum   += val * w;
        wTotal += w;
      }
    });
    axisWeightedAvgs[axis] = wTotal > 0
      ? Math.round((wSum / wTotal) * 10) / 10
      : null;
  }

  // ── Weakest and strongest axis
  const validAxes = Object.entries(axisWeightedAvgs).filter(([, v]) => v !== null);
  validAxes.sort((a, b) => a[1] - b[1]);
  const weakestAxis   = validAxes.length > 0 ? validAxes[0][0]                    : null;
  const strongestAxis = validAxes.length > 1 ? validAxes[validAxes.length - 1][0] : null;

  // ── Recurring pattern (most frequent primary_issue_axis in last 10)
  const issueCounts = {};
  roasts.slice(0, 10).forEach(r => {
    if (r.primary_issue_axis) {
      issueCounts[r.primary_issue_axis] = (issueCounts[r.primary_issue_axis] || 0) + 1;
    }
  });
  const sortedIssues     = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]);
  const recurringPattern = sortedIssues.length > 0 ? sortedIssues[0][0] : null;
  const recurringCount   = sortedIssues.length > 0 ? sortedIssues[0][1] : 0;

  // ── Trajectory: weighted avg of most recent 5 vs previous 5
  let trajectory = "stable";
  if (n >= 6) {
    const avg5 = (slice) => {
      const vals = slice.map(r => r.score).filter(s => s > 0);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const recent5Avg = avg5(roastScores.slice(0, 5));
    const prev5Avg   = avg5(roastScores.slice(5, 10));
    if (recent5Avg !== null && prev5Avg !== null) {
      const diff = recent5Avg - prev5Avg;
      if (diff > 0.4)       trajectory = "improving";
      else if (diff < -0.4) trajectory = "declining";
    }
  }

  return {
    total_sessions:    n,
    average_score:     averageScore,
    weakest_axis:      weakestAxis,
    strongest_axis:    strongestAxis,
    recurring_pattern: recurringPattern,
    recurring_count:   recurringCount,
    trajectory,
    last_updated:      new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) return res.status(401).json({ error: "Invalid token" });

  const user = authData.user;
  const {
    mode, inputType, inputText, score, oneliner, verdict,
    wrong, works, fix, theFix, intensity,
    axisScores,
    primaryIssue,
  } = req.body;

  if (!VALID_MODES.includes(mode))    return res.status(400).json({ error: "Invalid mode" });
  if (typeof score !== "number" || score < 1 || score > 10)
    return res.status(400).json({ error: "Invalid score" });
  if (!oneliner) return res.status(400).json({ error: "Missing oneliner" });

  const hasAxisScores = axisScores && typeof axisScores === "object";

  // ── 1. Save roast
  const { data: roast, error } = await supabase
    .from("roasts")
    .insert({
      user_id:    user.id,
      mode,
      input_type: inputType || "Anything",
      input_text: (inputText || "").slice(0, 500),
      score,
      oneliner,
      verdict:    verdict || null,
      wrong:      Array.isArray(wrong) ? wrong : [],
      works:      Array.isArray(works) ? works : [],
      fix:        Array.isArray(fix)   ? fix   : [],
      the_fix:    theFix || null,
      intensity:  VALID_INTENSITIES.includes(intensity) ? intensity : "savage",
      prompt_version: 3,
      ...(hasAxisScores ? {
        clarity_score:      axisScores.clarity      ?? null,
        specificity_score:  axisScores.specificity  ?? null,
        first_line_score:   axisScores.first_line   ?? null,
        credibility_score:  axisScores.credibility  ?? null,
        voice_score:        axisScores.voice        ?? null,
        reader_focus_score: axisScores.reader_focus ?? null,
      } : {}),
      primary_issue_axis:        primaryIssue?.axis        ?? null,
      primary_issue_description: primaryIssue?.description ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error || !roast) return res.status(500).json({ error: "Failed to save roast" });

  // ── 2. Recalculate and update communication_context (synchronous)
  // Self-recovering: if this fails, next roast will recalculate from scratch.
  try {
    const ctx = await recalculateCommunicationContext(supabase, user.id);
    if (ctx) {
      await supabase
        .from("profiles")
        .update({ communication_context: ctx })
        .eq("id", user.id);
    }
  } catch (_) {
    // Never block the response — next save will recover
  }

  // ── 3. Respond
  return res.status(200).json({ id: roast.id });
}
