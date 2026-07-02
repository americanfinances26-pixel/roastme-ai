// RoastMe AI — /api/roast
// Security: backend builds all prompts, validates all inputs, ignores plan from client.
// Plan enforcement will move to Supabase token validation in Phase 1.

const ALLOWED_ORIGINS = [
  "https://roastme-ai26.vercel.app",  // actual production domain
  "https://roastmeai.vercel.app",      // keep for if domain changes
  "https://roastmeai.com",
  "https://www.roastmeai.com"
];

// FIX FAIL-7/15: exact regex anchors — no more includes() substring spoofing
const DEV_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/[a-z0-9]+(--[a-z0-9]+)*\.csb\.app$/,
  /^https:\/\/[a-z0-9-]+\.codesandbox\.io$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/  // preview deploys
];

function isDevOrigin(origin) {
  if (!origin) return false;
  return DEV_ORIGIN_PATTERNS.some(p => p.test(origin));
}

const VALID_MODES       = ["Savage", "Honest", "Mentor", "Comedian"];
const VALID_INTENSITIES = ["mild", "spicy", "savage", "nuclear", "obliterate"];

// FIX FAIL-14: plan is NOT accepted from client body.
// Until Supabase is live, all requests are treated as "free".
// Phase 1 will validate plan via Supabase JWT.
const CHAR_LIMITS  = { free: 600,  fired_up: 2000, brutal: 4000 };
const MAX_TOKENS   = { free: 1000, fired_up: 1200, brutal: 1500 };

function buildSystemPrompt(mode, plan, intensity) {
  const isBrutal = plan === "brutal";

  const scoringRubric = `
SCORING RUBRIC (apply consistently):
1-2: Objectively terrible — clichés, zero originality, embarrassing
3-4: Weak and forgettable — some effort but fails on every level
5-6: Mediocre — has something but buried under bad execution
7-8: Decent with real problems — good bones, bad delivery
9-10: Only for genuinely strong content that barely needs fixing`;

  const itemCount = isBrutal ? 7 : 3;
  const items = n => Array.from({length:n},(_,i)=>`"item ${i+1}"`).join(",");
  const steps = n => Array.from({length:n},(_,i)=>`"step ${i+1}"`).join(",");

  const deepInstruction = isBrutal
    ? " Give exactly 7 detailed specific problems and exactly 7 concrete actionable solutions."
    : " Give exactly 3 specific problems and exactly 3 concrete actionable solutions.";

  const intensityMap = {
    mild:       " INTENSITY: MILD — be constructive and relatively gentle.",
    spicy:      " INTENSITY: SPICY — no sugarcoating, direct and honest, but not brutal.",
    savage:     " INTENSITY: SAVAGE — zero mercy, use their exact words against them.",
    nuclear:    " INTENSITY: NUCLEAR — maximum aggression. Every word they wrote is a weapon.",
    obliterate: " INTENSITY: OBLITERATE — this is not therapy. Unforgettable. Absolutely merciless."
  };
  const intensityInstruction = isBrutal ? (intensityMap[intensity] || intensityMap.savage) : "";

  const jsonSchema = `{"score": number 1-10, "wrong": [${items(itemCount)}], "works": ["strength"], "fix": [${steps(itemCount)}], "theFix": "rewrite max 300 words", "oneliner": "one-liner under 20 words", "verdict": "2-3 sentences"}`;

  const basePrompts = {
    Savage: `You are RoastMe AI in SAVAGE mode — brutally honest and aggressively funny. Zero filter. Take their EXACT words and turn them into weapons. Every sentence must feel written ONLY for this specific person. Never generic.\n${scoringRubric}\ntheFix: Quote their exact weak phrase, give the exact replacement. Flowing savage prose. Max 300 words.\nRespond ONLY with valid JSON: ${jsonSchema}`,

    Honest: `You are RoastMe AI in HONEST mode. You are a $500/hour consultant. No feelings, no flattery, no sugarcoating. Say exactly what is wrong and how to fix it. Zero jokes. Pure signal. Every observation must have a number, a metric, or a concrete reference.\n${scoringRubric}\ntheFix: Write the actual rewrite. Quote their exact weak words and give the precise replacement. Flowing prose. Max 300 words.\nRespond ONLY with valid JSON: ${jsonSchema}`,

    Mentor: `You are RoastMe AI in MENTOR mode. Hardest on the students you believe in most. Surgical, honest, but you genuinely see what this person could become. Every criticism comes with a concrete solution and WHY it matters.\n${scoringRubric}\ntheFix: Rewrite the weak parts yourself. Quote their exact words, give the replacement, explain why it works better. Mentor voice. Max 300 words.\nRespond ONLY with valid JSON: ${jsonSchema}`,

    Comedian: `You are RoastMe AI in COMEDIAN mode — world-class stand-up comedian. Take their exact words, make comparisons so absurd and specific they cannot believe an AI said that. Each observation must escalate in absurdity. Score the CONTENT quality, not how funny it is to roast.\n${scoringRubric}\ntheFix: Rewrite their weak lines — funny but actually better. Flowing comedic prose. Max 300 words.\nRespond ONLY with valid JSON: ${jsonSchema}`
  };

  return basePrompts[mode] + deepInstruction + intensityInstruction;
}

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────
  const origin = req.headers.origin;
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd && isDevOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (isProd && origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!origin && !isProd) {
    // server-to-server or curl in dev — allow
  } else {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  // ── Input validation ──────────────────────────────────────────
  // FIX FAIL-14: plan is NOT read from req.body — always enforced server-side
  const { text, mode, intensity = "savage", inputType } = req.body;
  // Read plan from Supabase JWT
  let plan = "free";
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const authHeader = req.headers.authorization?.replace("Bearer ", "");
  if (authHeader) {
    const { data: { user } } = await supabase.auth.getUser(authHeader);
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
      if (profile?.plan) plan = profile.plan;
    }
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid text" });
  }
  if (!VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: "Invalid mode" });
  }
  if (!VALID_INTENSITIES.includes(intensity)) {
    return res.status(400).json({ error: "Invalid intensity" });
  }

  // Char limit enforced by plan (currently always "free" = 600)
  const charLimit = CHAR_LIMITS[plan];
  if (text.length > charLimit) {
    return res.status(400).json({ error: `Text exceeds ${charLimit} characters` });
  }

  // ── API key ───────────────────────────────────────────────────
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "API not configured" });
  }

  // ── Build prompt server-side ──────────────────────────────────
  const systemPrompt = buildSystemPrompt(mode, plan, intensity);
  const userMessage  = `Roast this (category: ${inputType || "Anything"}): "${text.trim()}"`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: MAX_TOKENS[plan],
        temperature: 0.85,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage }
        ]
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      return res.status(groqRes.status).json({ error: data.error?.message || "AI error" });
    }

    const raw = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "AI returned invalid response format" });
    }

    // Sanity-check the parsed result
    if (typeof parsed.score !== "number" || !Array.isArray(parsed.wrong)) {
      return res.status(500).json({ error: "AI response missing required fields" });
    }

    return res.status(200).json({ result: parsed });

  } catch (err) {
    return res.status(500).json({ error: "Request failed" });
  }
}
