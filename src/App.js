import { useState, useEffect, useRef } from "react";
// Supabase client - initialized via CDN script
const SUPABASE_URL = "https://lrlqnuyezqyffjwcitqw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybHFudXllenF5ZmZqd2NpdHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTc2MDcsImV4cCI6MjA5NzM3MzYwN30.8FoPtj67vpIhaq1Psl5q0vwOAHbSAg9FcoahPIlI_hI";

let supabase;
try {
  const { createClient } = window.supabase || require("@supabase/supabase-js");
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) {
  // Fallback mock for environments where supabase isn't available
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: async () => {},
      signInWithOtp: async () => {},
      signOut: async () => {}
    }
  };
}

const FIRE_ICON = () => (
  <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
    <path d="M50 5 C50 5 70 30 65 50 C75 40 72 20 72 20 C85 40 80 65 65 78 C68 68 62 60 62 60 C62 75 55 88 50 95 C45 88 38 75 38 60 C38 60 32 68 35 78 C20 65 15 40 28 20 C28 20 25 40 35 50 C30 30 50 5 50 5Z" fill="url(#fireGrad)"/>
    <defs>
      <linearGradient id="fireGrad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FF4500"/>
        <stop offset="60%" stopColor="#FF6B00"/>
        <stop offset="100%" stopColor="#FFB300"/>
      </linearGradient>
    </defs>
  </svg>
);

const ROAST_WEEKLY_LIMIT = 5;
const STORAGE_KEY = "roastme_data";

function getStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getWeekStart() {
  const data = getStoredData();
  if (!data || !data.weekStart) return null;
  // Check if 7 days have passed since first roast
  if (Date.now() - data.weekStart >= 7 * 24 * 60 * 60 * 1000) return null;
  return data.weekStart;
}

function getRoastsUsed() {
  const data = getStoredData();
  if (!data) return 0;
  // If 7 days passed since first roast, reset
  if (!data.weekStart || Date.now() - data.weekStart >= 7 * 24 * 60 * 60 * 1000) return 0;
  return data.roastsUsed || 0;
}

function incrementRoasts() {
  const data = getStoredData() || {};
  const used = getRoastsUsed();
  const weekStart = (data.weekStart && Date.now() - data.weekStart < 7 * 24 * 60 * 60 * 1000) 
    ? data.weekStart 
    : Date.now(); // Start counting from NOW if first roast
  saveData({ weekStart, roastsUsed: used + 1, history: getHistory() });
}

function getHistory() {
  const data = getStoredData();
  return data?.history || [];
}

function saveToHistory(roast) {
  const history = getHistory();
  history.unshift({ ...roast, date: new Date().toLocaleDateString() });
  const data = getStoredData() || {};
  saveData({ ...data, history: history.slice(0, 50) });
}

export default function App() {
  const [dark, setDark] = useState(true);
  const [screen, setScreen] = useState("landing");
  const [mode, setMode] = useState("Savage");
  const [inputType, setInputType] = useState("Anything");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [roastsUsed, setRoastsUsed] = useState(getRoastsUsed());
  const [showPaywall, setShowPaywall] = useState(false);
  const [plan, setPlan] = useState("free");
  const [animScore, setAnimScore] = useState(0);
  const [history, setHistory] = useState(getHistory());
  const [shareMsg, setShareMsg] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const canvasRef = useRef(null);

  const c = {
    bg: dark ? "#0A0A0A" : "#FAFAFA",
    bg2: dark ? "#111111" : "#F1F1F1",
    bg3: dark ? "#1A1A1A" : "#E5E5E5",
    text: dark ? "#FFFFFF" : "#0A0A0A",
    text2: dark ? "#A0A0A0" : "#666666",
    border: dark ? "#2A2A2A" : "#DDDDDD",
    accent: "#FF4500",
    accentHover: "#FF6B00",
  };

  const modes = ["Savage","Honest","Mentor","Comedian"];
  const inputTypes = ["My CV","My Bio","My Idea","My Email","Anything"];
  const isPaid = plan !== "free";

  useEffect(() => {
    if (result && screen === "result") {
      setAnimScore(0);
      const target = result.score;
      let current = 0;
      const step = () => {
        current += 0.5;
        if (current >= target) { setAnimScore(target); return; }
        setAnimScore(Math.round(current * 10) / 10);
        setTimeout(step, 30);
      };
      setTimeout(step, 400);
    }
  }, [result, screen]);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load Hall of Fame roast from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roastParam = params.get('roast');
    if (roastParam) {
      try {
        const roastData = JSON.parse(decodeURIComponent(roastParam));
        setResult(roastData);
        setScreen("halloffame");
      } catch(e) {}
    }
  }, []);

  async function handleRoast() {
    if (!text.trim()) return;
    // Comedian is now free for everyone
    if (roastsUsed >= ROAST_WEEKLY_LIMIT && !isPaid) { setShowPaywall(true); return; }

    setLoading(true);
    setScreen("loading");

    const systemPrompts = {
      Savage: `You are RoastMe AI in SAVAGE mode. You are the most brutally honest and aggressively funny AI ever created. You analyze ANY type of text. You are like that friend with absolutely zero filter who says what everyone else is thinking but never says out loud. You pick apart the EXACT words the person used and turn them into weapons against them. You are aggressive, sharp, and relentless. Example: if someone says "I am passionate about synergies" you say "The LinkedIn algorithm wrote that, got embarrassed, deleted it, and you went to the trash and posted it anyway." Every single sentence must feel like it was written ONLY for this specific person. NEVER say anything generic. The one-liner must hit so hard they immediately send it to their friends. Respond ONLY with valid JSON: {"score": number 1-10, "wrong": ["brutal specific observation 1","brutal specific observation 2","brutal specific observation 3"], "works": ["one genuine strength said with a backhanded edge"], "fix": ["brutal but actionable step 1","brutal but actionable step 2","brutal but actionable step 3"], "oneliner": "devastating one-liner under 20 words using their exact words", "verdict": "2-3 aggressively funny sentences specific to what they wrote"}`,
      Honest: `You are RoastMe AI in HONEST mode. You are not aggressive. You are not funny. You are simply and completely honest. You analyze ANY type of text like a $500/hour consultant who has no time for feelings, flattery, or sugarcoating. You say exactly what is wrong, exactly why it is wrong, and exactly how to fix it. Nothing more. No jokes. No encouragement. No softening. Every problem must be specific — attach a number, a metric, or a concrete example. "This is vague" is not feedback. "You used the phrase passionate professional which appears in 4.2 million LinkedIn bios and differentiates you from none of them" IS feedback. You never end with encouragement. You state the truth and stop. Respond ONLY with valid JSON: {"score": number 1-10, "wrong": ["cold specific observation 1","cold specific observation 2","cold specific observation 3"], "works": ["one genuine factual strength, no flattery"], "fix": ["precise actionable step with specifics 1","precise actionable step 2","precise actionable step 3"], "oneliner": "cold honest one-liner under 20 words, no jokes", "verdict": "2-3 sentences of pure factual truth, no encouragement"}`,
      Mentor: `You are RoastMe AI in MENTOR mode. You are the professor who was hard on students because you believed in them more than they believed in themselves. You analyze ANY type of text. You are honest like the Honest mode — you never lie or sugarcoat — but you genuinely believe in the person's potential. You see both their blind spots AND what they could become. Every single criticism comes with a concrete solution and an explanation of WHY it matters. You pick apart their exact words surgically. The person should finish reading feeling both challenged AND motivated — like someone just pushed them to be better. Never vague. Never generic. Always specific. Respond ONLY with valid JSON: {"score": number 1-10, "wrong": ["specific criticism with why it matters 1","specific criticism with why it matters 2","specific criticism with why it matters 3"], "works": ["genuine strength with real encouragement"], "fix": ["concrete solution with how and why 1","concrete solution 2","concrete solution 3"], "oneliner": "tough but motivating one-liner under 20 words", "verdict": "2-3 sentences that challenge and motivate simultaneously"}`,
      Comedian: `You are RoastMe AI in COMEDIAN mode — a world-class stand-up comedian doing the roast of a lifetime. You analyze ANY type of text and turn it into pure comedy gold. Your weapon is the unexpected — you take their exact words and make comparisons so absurd, so specific, and so ridiculous that the person cannot believe an AI just said that. Each observation must be more absurd than the last — build the comedy, escalate the ridiculousness. Example: if someone says "I love coffee" you say "You love coffee. Incredible. You are the first developer in human history to mention that. What is next, telling us you breathe air? Do you also enjoy water? Perhaps sleeping?" Your jokes must make people actually laugh out loud — not dry humor, not forced jokes, REAL laugh-out-loud absurd comedy. The goal is that they immediately screenshot this and send it to 5 friends at 2am. Respond ONLY with valid JSON: {"score": number 1-10, "wrong": ["absurd hilarious observation 1","even more absurd observation 2","most absurd observation 3"], "works": ["backhanded compliment that is actually funny"], "fix": ["ridiculous advice that somehow makes sense 1","even more ridiculous advice 2","most ridiculous advice 3"], "oneliner": "the most devastatingly funny one-liner under 20 words", "verdict": "2-3 sentences of pure unhinged comedy gold"}`
    };

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: systemPrompts[mode],
          messages: [{ role: "user", content: `Roast this (category: ${inputType}): "${text}"${plan === "brutal" ? " This is a DEEP ROAST — give exactly 7 detailed specific problems and exactly 7 concrete actionable solutions. Be thorough, specific and devastating." : ""}` }]
        })
      });
      const data = await response.json();
      const raw = data.content[0].text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      parsed.mode = mode;
      parsed.input = text.slice(0, 60) + (text.length > 60 ? "..." : "");
      setResult(parsed);
      if (!isPaid) {
        incrementRoasts();
        setRoastsUsed(getRoastsUsed());
      }
      saveToHistory(parsed);
      setHistory(getHistory());
      setScreen("result");
      if (!isPaid) setTimeout(() => setShowLogin(true), 1500);
    } catch {
      setResult({
        score: 1,
        wrong: ["Something went wrong","The AI is judging you for breaking it","Try again"],
        works: ["At least you tried"],
        fix: ["Try again","Check your internet","Pray"],
        oneliner: "Even the AI gave up on you. That's impressive.",
        verdict: "Something went wrong. But honestly, maybe it's a sign.",
        mode,
        input: text.slice(0, 60)
      });
      setScreen("result");
    }
    setLoading(false);
  }

  function shareRoast() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");

    // Background black
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, 1080, 1080);

    // Subtle gradient overlay
    const bgGrad = ctx.createRadialGradient(540, 540, 0, 540, 540, 700);
    bgGrad.addColorStop(0, "rgba(255,69,0,0.06)");
    bgGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Orange top bar thick
    const grad = ctx.createLinearGradient(0, 0, 1080, 0);
    grad.addColorStop(0, "#FF4500");
    grad.addColorStop(1, "#FF6B00");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 16);

    // Fire emoji
    ctx.font = "90px serif";
    ctx.textAlign = "center";
    ctx.fillText("🔥", 540, 170);

    // ROASTME AI logo - tight together
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 80px Arial Black, Arial, sans-serif";
    const roastmeWidth = ctx.measureText("ROASTME").width;
    const startX = (1080 - roastmeWidth - 60) / 2;
    ctx.fillText("ROASTME", startX, 265);
    ctx.fillStyle = "#FF4500";
    ctx.font = "bold 44px Arial Black, Arial, sans-serif";
    ctx.fillText("AI", startX + roastmeWidth + 8, 265);
    ctx.textAlign = "center";

    // Divider
    ctx.strokeStyle = "#1E1E1E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 300);
    ctx.lineTo(1020, 300);
    ctx.stroke();

    // Score as trophy - big and centered
    const scoreColor = result?.score <= 3 ? "#FF4500" : result?.score <= 6 ? "#FFB300" : "#22C55E";
    
    // Score background circle
    ctx.beginPath();
    ctx.arc(540, 480, 180, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,69,0,0.08)";
    ctx.fill();
    ctx.strokeStyle = scoreColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = scoreColor;
    ctx.font = "900 200px Arial Black, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(result?.score, 480, 540);
    ctx.fillStyle = "#444444";
    ctx.font = "bold 80px Arial, sans-serif";
    ctx.fillText("/10", 720, 510);

    // Trophy label for high scores
    if (result?.score >= 7) {
      ctx.fillStyle = "#FFB300";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillText("🏆 TOP SCORE", 540, 590);
    } else {
      ctx.fillStyle = "#FF4500";
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillText("● " + result?.mode?.toUpperCase() + " MODE", 540, 590);
    }

    // Divider
    ctx.strokeStyle = "#1E1E1E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 615);
    ctx.lineTo(1020, 615);
    ctx.stroke();

    // One liner wrapped
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "italic 42px Georgia, serif";
    ctx.textAlign = "center";
    const oneliner = '"' + (result?.oneliner || "") + '"';
    const words = oneliner.split(" ");
    let line = "";
    let y = 710;
    const maxWidth = 900;
    for (let word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxWidth && line !== "") {
        ctx.fillText(line.trim(), 540, y);
        line = word + " ";
        y += 58;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), 540, y);

    // Bottom orange bar
    ctx.fillStyle = grad;
    ctx.fillRect(0, 1064, 1080, 16);

    // Website bold and visible
    ctx.fillStyle = "#FF4500";
    ctx.font = "bold 30px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("wgrrts.csb.app", 540, 1048);

    // Watermark for free users
    if (!isPaid) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "bold 72px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.save();
      ctx.translate(540, 540);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText("FREE PLAN", 0, 0);
      ctx.fillText("roastmeai.com", 0, 100);
      ctx.restore();
    }

    // Convert to blob and share
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "RoastMe-AI-just-roasted-me.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "RoastMe AI just destroyed me 🔥",
          text: `🔥 RoastMe AI just destroyed me\n\nScore: ${result?.score}/10\n"${result?.oneliner}"\n\n👉 Get roasted → wgrrts.csb.app`
        });
      } else if (navigator.share) {
        navigator.share({
          title: "RoastMe AI just destroyed me 🔥",
          text: `🔥 RoastMe AI just destroyed me\n\nScore: ${result?.score}/10\n"${result?.oneliner}"\n\n👉 Get roasted → wgrrts.csb.app`
        });
      } else {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-roast.png";
        a.click();
        setShareMsg("Image saved!");
        setTimeout(() => setShareMsg(""), 2000);
      }
    }, "image/png");
  }

  const scoreColor = (s) => s <= 3 ? "#FF4500" : s <= 6 ? "#FFB300" : "#22C55E";

  const styles = {
    app: { minHeight:"100vh", background:c.bg, color:c.text, fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif", transition:"all 0.3s ease" },
    header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${c.border}`, position:"sticky", top:0, background:c.bg, zIndex:100, backdropFilter:"blur(10px)" },
    logo: { display:"flex", alignItems:"center", gap:"3px", cursor:"pointer" },
    logoText: { fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text },
    logoTextSmall: { fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text },
    logoFire: { width:"20px", height:"24px", marginBottom:"1px" },
    logoAI: { fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px" },
    toggle: { background:"none", border:`1px solid ${c.border}`, borderRadius:"20px", padding:"6px 12px", cursor:"pointer", color:c.text, fontSize:"16px", transition:"all 0.2s" },
    btn: { background:c.accent, color:"#fff", border:"none", borderRadius:"12px", padding:"16px 28px", fontSize:"16px", fontWeight:700, cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.3px" },
    btnOutline: { background:"transparent", color:c.text, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"12px 20px", fontSize:"14px", fontWeight:600, cursor:"pointer", transition:"all 0.2s" },
    card: { background:c.bg2, borderRadius:"16px", padding:"20px", border:`1px solid ${c.border}` },
    section: { padding:"0 20px 20px" },
    label: { fontSize:"12px", fontWeight:700, color:c.text2, textTransform:"uppercase", letterSpacing:"1px", marginBottom:"10px" },
    chipRow: { display:"flex", flexWrap:"wrap", gap:"8px" },
    chip: (active) => ({ padding:"10px 16px", borderRadius:"10px", border:`1.5px solid ${active ? c.accent : c.border}`, background: active ? `${c.accent}18` : "transparent", color: active ? c.accent : c.text2, fontSize:"14px", fontWeight:600, cursor:"pointer", transition:"all 0.2s" }),
    textarea: { width:"100%", background:c.bg3, border:`1.5px solid ${c.border}`, borderRadius:"12px", padding:"16px", color:c.text, fontSize:"15px", resize:"none", outline:"none", fontFamily:"inherit", boxSizing:"border-box", lineHeight:1.5 },
    counter: { display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", background:`${c.accent}15`, borderRadius:"8px", border:`1px solid ${c.accent}30` },
  };

  // LANDING
  if (screen === "landing") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={styles.logoText}>ROASTME</span>
          <span style={styles.logoAI}>AI</span>
        </div>
        <button style={styles.toggle} onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
      </header>

      <div style={{padding:"60px 20px 40px", textAlign:"center", maxWidth:"480px", margin:"0 auto"}}>
        <div style={{width:"80px", height:"96px", margin:"0 auto 28px"}}>
          <FIRE_ICON/>
        </div>
        <h1 style={{fontSize:"42px", fontWeight:900, lineHeight:1.05, margin:"0 0 16px", letterSpacing:"-1.5px"}}>
          Get Roasted.<br/>
          <span style={{color:c.accent}}>Get Better.</span>
        </h1>
        <p style={{fontSize:"17px", color:c.text2, lineHeight:1.6, margin:"0 0 36px"}}>
          The only AI that tells you the brutal truth — and actually helps you grow. No sugarcoating. No lies. Just results.
        </p>
        <button style={{...styles.btn, width:"100%", fontSize:"18px", padding:"18px", borderRadius:"14px"}}
          onClick={() => setScreen("app")}>
          🔥 Roast Me Now — It's Free
        </button>
        <p style={{fontSize:"13px", color:c.text2, marginTop:"12px"}}>5 free roasts per week. No credit card needed.</p>

        <div style={{fontSize:"12px", fontWeight:700, color:c.text2, textTransform:"uppercase", letterSpacing:"1px", marginTop:"48px", marginBottom:"10px"}}>Choose Your Mode</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
          {[
            {icon:"🔥", title:"Savage", desc:"Brutal, funny, uses your own words against you"},
            {icon:"💬", title:"Honest", desc:"Direct, clear, no sugarcoating"},
            {icon:"🎓", title:"Mentor", desc:"Tough but caring, every problem has a solution"},
            {icon:"😂", title:"Comedian", desc:"Pure entertainment, cry-laugh guaranteed"},
          ].map(m => (
            <div key={m.title} style={{...styles.card, textAlign:"center", padding:"20px 12px", minHeight:"110px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
              <div style={{fontSize:"28px", marginBottom:"8px"}}>{m.icon}</div>
              <div style={{fontWeight:700, fontSize:"14px", marginBottom:"4px"}}>{m.title}</div>
              <div style={{fontSize:"12px", color:c.text2}}>{m.desc}</div>
            </div>
          ))}
        </div>

        <div style={{...styles.card, marginTop:"20px", textAlign:"left"}}>
          <div style={{fontSize:"12px", color:c.accent, fontWeight:700, marginBottom:"8px"}}>EXAMPLE ROAST</div>
          <div style={{fontSize:"13px", color:c.text2, fontStyle:"italic", lineHeight:1.6}}>
            "You listed 'Microsoft Word' as a skill in 2026. Your cat walks across the keyboard and produces better content. Score: 2/10."
          </div>
        </div>
      </div>
    </div>
  );

  // LOADING
  const loadingMessages = {
    Savage: [
      "The AI is sharpening its knives... 🔪",
      "Preparing the most brutal truth of your life...",
      "No mercy. No filters. No sugarcoating...",
      "The AI just read your submission and laughed...",
      "Buckle up. This is going to hurt. 😈"
    ],
    Honest: [
      "Cutting through the noise...",
      "The AI is reading between the lines...",
      "No flattery. Just facts. Processing...",
      "Analyzing every word you wrote...",
      "The truth is loading. Brace yourself."
    ],
    Mentor: [
      "Your mentor is reviewing every word...",
      "The AI sees potential. And exactly how to unlock it.",
      "Preparing feedback that will actually change things...",
      "Reading carefully. This will be worth it.",
      "Your growth starts now. Brace yourself."
    ],
    Comedian: [
      "The AI is writing your roast set... 😂",
      "Preparing material. This is going to be legendary.",
      "The crowd is waiting. The AI is cooking...",
      "Stand up comedy incoming. You asked for this.",
      "Warning: may cause uncontrollable laughter. 💀"
    ]
  };
  const randomMsg = loadingMessages[mode][Math.floor(Math.random() * 5)];

  if (screen === "loading") return (
    <div style={{...styles.app, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}>
      <div style={{width:"80px", height:"96px", animation:"pulse 1s ease-in-out infinite"}}>
        <FIRE_ICON/>
      </div>
      <p style={{marginTop:"24px", fontSize:"18px", fontWeight:700, color:c.text}}>Roasting you...</p>
      <p style={{fontSize:"14px", color:c.text2, marginTop:"8px", textAlign:"center", padding:"0 40px"}}>{randomMsg}</p>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
    </div>
  );

  // RESULT
  if (screen === "result" && result) return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{...styles.logo, cursor:"default"}}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={{fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text}}>ROASTME</span>
          <span style={{fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px"}}>AI</span>
        </div>
        <button style={styles.toggle} onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
      </header>

      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        {/* Score */}
        <div style={{...styles.card, textAlign:"center", marginBottom:"16px", padding:"28px 20px"}}>
          <div style={{fontSize:"13px", color:c.text2, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
            {result.mode} Mode 🔥
          </div>
          <div style={{fontSize:"72px", fontWeight:900, color:scoreColor(animScore), lineHeight:1, transition:"color 0.3s"}}>
            {animScore}<span style={{fontSize:"32px", color:c.text2}}>/10</span>
          </div>
          <div style={{marginTop:"16px", fontSize:"15px", color:c.text2, fontStyle:"italic", lineHeight:1.5}}>
            "{result.verdict}"
          </div>
        </div>

        {/* One-liner */}
        <div style={{...styles.card, marginBottom:"16px", background:`${c.accent}12`, border:`1px solid ${c.accent}40`}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px"}}>💬 The One-Liner</div>
          <div style={{fontSize:"17px", fontWeight:700, lineHeight:1.4, color:c.text}}>"{result.oneliner}"</div>
        </div>

        {/* What's wrong */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{fontSize:"11px", color:"#FF4500", fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>💀 What's Wrong</div>
          {result.wrong.map((w,i) => (
            <div key={i} style={{display:"flex", gap:"10px", marginBottom:"10px", alignItems:"flex-start"}}>
              <span style={{color:c.accent, fontWeight:700, minWidth:"20px"}}>#{i+1}</span>
              <span style={{fontSize:"14px", lineHeight:1.5, color:c.text}}>{w}</span>
            </div>
          ))}
        </div>

        {/* What works */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{fontSize:"11px", color:"#22C55E", fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>✅ What Works</div>
          {result.works.map((w,i) => (
            <div key={i} style={{display:"flex", gap:"10px", marginBottom:"8px", alignItems:"flex-start"}}>
              <span style={{color:"#22C55E", minWidth:"20px"}}>✓</span>
              <span style={{fontSize:"14px", lineHeight:1.5, color:c.text}}>{w}</span>
            </div>
          ))}
        </div>

        {/* How to fix */}
        <div style={{...styles.card, marginBottom:"24px"}}>
          <div style={{fontSize:"11px", color:"#3B82F6", fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>🚀 How to Fix It</div>
          {result.fix.map((f,i) => (
            <div key={i} style={{display:"flex", gap:"10px", marginBottom:"10px", alignItems:"flex-start"}}>
              <span style={{color:"#3B82F6", fontWeight:700, minWidth:"20px"}}>{i+1}.</span>
              <span style={{fontSize:"14px", lineHeight:1.5, color:c.text}}>{f}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"32px"}}>
          <button style={{...styles.btn, width:"100%"}} onClick={shareRoast}>
            {shareMsg || "📤 Share My Roast"}
          </button>
          <button style={{...styles.btnOutline, width:"100%"}} onClick={() => { setText(""); setResult(null); setScreen("app"); }}>
            🔥 Roast Again
          </button>
          <button style={{...styles.btnOutline, width:"100%"}} onClick={() => setScreen("history")}>
            📜 My History
          </button>
          <button style={{...styles.btnOutline, width:"100%"}} onClick={() => {
            const roastData = encodeURIComponent(JSON.stringify({
              score: result?.score,
              oneliner: result?.oneliner,
              mode: result?.mode,
              verdict: result?.verdict
            }));
            const link = `${window.location.href.split('?')[0]}?roast=${roastData}`;
            navigator.clipboard.writeText(link);
            setShareMsg("Hall of Fame link copied! 🏆");
            setTimeout(() => setShareMsg(""), 3000);
          }}>
            🏆 Copy Hall of Fame Link
          </button>
        </div>

        {!isPaid && (
          <div style={{...styles.card, textAlign:"center", border:`1px solid ${c.accent}40`, background:`${c.accent}08`}}>
            <div style={{fontSize:"14px", fontWeight:700, marginBottom:"8px"}}>
              {ROAST_WEEKLY_LIMIT - roastsUsed} roasts left this week
            </div>
            <div style={{fontSize:"13px", color:c.text2, marginBottom:"12px"}}>Upgrade for unlimited roasts + Comedian mode</div>
            <button style={{...styles.btn, padding:"12px 24px", fontSize:"14px"}} onClick={() => setShowPaywall(true)}>
              Upgrade Now
            </button>
          </div>
        )}
      </div>

      {showPaywall && <Paywall c={c} onClose={() => setShowPaywall(false)} onUpgrade={(p) => { setPlan(p); setShowPaywall(false); }} dark={dark}/>}
    </div>
  );

  // PROFILE
  if (screen === "profile") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("app")}>← Back</button>
          <span style={{fontWeight:800, fontSize:"18px"}}>My Account</span>
        </div>
        <button style={styles.toggle} onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
      </header>

      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        
        {/* Current Plan */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>MY PLAN</div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
            <div>
              <div style={{fontSize:"20px", fontWeight:900, color:c.text}}>
                {plan === "free" ? "🆓 Free" : plan === "fired_up" ? "🔥 Fired Up" : "💀 Brutal"}
              </div>
              <div style={{fontSize:"13px", color:c.text2, marginTop:"4px"}}>
                {plan === "free" ? "5 roasts per week" : plan === "fired_up" ? "$2.99/month" : "$5.99/month"}
              </div>
            </div>
            {plan !== "free" && (
              <div style={{fontSize:"12px", color:c.text2, textAlign:"right"}}>
                <div>Next billing</div>
                <div style={{fontWeight:600, color:c.text}}>July 1, 2026</div>
              </div>
            )}
          </div>

          {/* Upgrade button */}
          {plan === "free" && (
            <button style={{...styles.btn, width:"100%", marginBottom:"8px"}} onClick={() => setShowPaywall(true)}>
              ⚡ Upgrade Plan
            </button>
          )}
          {plan === "fired_up" && (
            <button style={{...styles.btn, width:"100%", marginBottom:"8px"}} onClick={() => { setPlan("brutal"); }}>
              ⬆️ Upgrade to 💀 Brutal — $5.99/month
            </button>
          )}

          {/* Cancel button - shows for paid plans */}
          {plan !== "free" && !showCancelConfirm && (
            <button onClick={() => setShowCancelConfirm(true)} style={{width:"100%", background:"none", border:"none", color:"#666", fontSize:"13px", cursor:"pointer", padding:"8px"}}>
              Cancel Plan
            </button>
          )}

          {/* Cancel confirm - with downgrade option */}
          {showCancelConfirm && (
            <div style={{background:c.bg3, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"16px", marginTop:"8px"}}>
              <div style={{fontSize:"15px", fontWeight:800, color:c.text, marginBottom:"6px"}}>⚠️ Before you cancel...</div>
              <div style={{fontSize:"13px", color:c.text2, marginBottom:"16px"}}>Choose what works best for you:</div>
              
              {plan === "brutal" && (
                <button onClick={() => { setPlan("fired_up"); setShowCancelConfirm(false); }} style={{width:"100%", padding:"14px", borderRadius:"12px", background:`${c.accent}15`, border:`1px solid ${c.accent}40`, color:c.text, fontWeight:700, cursor:"pointer", fontSize:"14px", marginBottom:"10px", textAlign:"left"}}>
                  <div style={{color:c.accent, fontWeight:800, marginBottom:"4px"}}>⬇️ Switch to 🔥 Fired Up — $2.99/mo</div>
                  <div style={{fontSize:"12px", color:c.text2, fontWeight:400}}>Keep unlimited roasts at a lower price</div>
                </button>
              )}

              <button onClick={() => { setPlan("free"); setShowCancelConfirm(false); }} style={{width:"100%", padding:"14px", borderRadius:"12px", background:"transparent", border:`1px solid ${c.border}`, color:c.text2, fontWeight:600, cursor:"pointer", fontSize:"13px", marginBottom:"10px", textAlign:"left"}}>
                <div style={{fontWeight:700, marginBottom:"4px"}}>❌ Cancel completely</div>
                <div style={{fontSize:"12px"}}>Go back to Free on July 1, 2026</div>
              </button>

              <button onClick={() => setShowCancelConfirm(false)} style={{width:"100%", padding:"12px", borderRadius:"12px", background:"#FF4500", border:"none", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:"14px"}}>
                Keep {plan === "brutal" ? "💀 Brutal" : "🔥 Fired Up"} — I'm staying!
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>MY STATS</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px"}}>
            <div style={{textAlign:"center", padding:"12px", background:c.bg3, borderRadius:"10px"}}>
              <div style={{fontSize:"26px", fontWeight:900, color:c.accent}}>{history.length}</div>
              <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>Total Roasts</div>
            </div>
            <div style={{textAlign:"center", padding:"12px", background:c.bg3, borderRadius:"10px"}}>
              <div style={{fontSize:"26px", fontWeight:900, color:c.accent}}>
                {history.length > 0 ? Math.round(history.reduce((a,b) => a + (b.score||0), 0) / history.length * 10) / 10 : 0}
              </div>
              <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>Avg Score</div>
            </div>
            <div style={{textAlign:"center", padding:"12px", background:c.bg3, borderRadius:"10px"}}>
              <div style={{fontSize:"26px", fontWeight:900, color: history.length >= 2 && history[0].score > history[history.length-1].score ? "#22C55E" : "#FF4500"}}>
                {history.length >= 2 ? (history[0].score > history[history.length-1].score ? "↑" : "↓") : "—"}
              </div>
              <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>Trend</div>
            </div>
          </div>
        </div>

        {/* Weekly Report for Brutal */}
        {plan === "brutal" && history.length > 0 && (
          <div style={{...styles.card, marginBottom:"16px", border:`1px solid ${c.accent}40`, background:`${c.accent}08`}}>
            <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>📊 Weekly Roast Report</div>
            <div style={{fontSize:"13px", color:c.text, lineHeight:1.6, marginBottom:"10px"}}>
              <strong>This week's summary:</strong>
            </div>
            <div style={{fontSize:"13px", color:c.text2, lineHeight:2}}>
              <div>• You completed <strong style={{color:c.text}}>{Math.min(history.length, 3)} roasts</strong> this week</div>
              <div>• Your average score is <strong style={{color:c.accent}}>{history.length > 0 ? Math.round(history.reduce((a,b) => a + (b.score||0), 0) / history.length * 10) / 10 : 0}/10</strong></div>
              <div>• Most used mode: <strong style={{color:c.text}}>{(() => { const modes = history.map(h=>h.mode); return modes.sort((a,b) => modes.filter(v=>v===a).length - modes.filter(v=>v===b).length).pop() || "Savage"; })()}</strong></div>
            </div>
            <div style={{marginTop:"12px", padding:"10px", background:c.bg3, borderRadius:"10px", fontSize:"12px", color:c.text2}}>
              📧 Full report sent to your email every Sunday
            </div>
          </div>
        )}

        {/* Quick links */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>QUICK LINKS</div>
          <button onClick={() => setScreen("history")} style={{display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", background:"none", border:"none", color:c.text, fontSize:"15px", cursor:"pointer", padding:"10px 0", borderBottom:`1px solid ${c.border}`}}>
            <span>📜 My Roast History</span>
            <span style={{color:c.text2}}>→</span>
          </button>
          <button style={{display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", background:"none", border:"none", color:c.text, fontSize:"15px", cursor:"pointer", padding:"10px 0"}}>
            <span>🏆 Hall of Fame</span>
              <span style={{color:c.text2, fontSize:"11px"}}>Share after a roast →</span>
          </button>
        </div>

      </div>
      {showPaywall && <Paywall c={c} onClose={() => setShowPaywall(false)} onUpgrade={(p) => { setPlan(p); setShowPaywall(false); }} dark={dark}/>}
    </div>
  );

  // HALL OF FAME VIEWER
  if (screen === "halloffame" && result) return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{...styles.logo, cursor:"default"}}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={{fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text}}>ROASTME</span>
          <span style={{fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px"}}>AI</span>
        </div>
        <button style={styles.toggle} onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"24px"}}>
          <div style={{fontSize:"13px", color:c.accent, fontWeight:700, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px"}}>🏆 Hall of Fame</div>
          <div style={{fontSize:"14px", color:c.text2}}>{result?.score >= 7 ? "Someone scored big. 🏆" : "Someone got roasted. Badly. 💀"}</div>
        </div>
        <div style={{...styles.card, textAlign:"center", marginBottom:"16px", padding:"28px 20px"}}>
          <div style={{fontSize:"13px", color:c.text2, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>{result.mode} Mode 🔥</div>
          <div style={{fontSize:"72px", fontWeight:900, color:scoreColor(result.score), lineHeight:1}}>{result.score}<span style={{fontSize:"32px", color:c.text2}}>/10</span></div>
          <div style={{marginTop:"16px", fontSize:"15px", color:c.text2, fontStyle:"italic", lineHeight:1.5}}>"{result.verdict}"</div>
        </div>
        <div style={{...styles.card, marginBottom:"16px", background:`${c.accent}12`, border:`1px solid ${c.accent}40`}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px"}}>💬 The One-Liner</div>
          <div style={{fontSize:"17px", fontWeight:700, lineHeight:1.4, color:c.text}}>"{result.oneliner}"</div>
        </div>
        <button style={{...styles.btn, width:"100%", marginBottom:"10px"}} onClick={() => { setScreen("landing"); setResult(null); window.history.pushState({}, '', window.location.pathname); }}>
          🔥 Get My Own Roast
        </button>
      </div>
    </div>
  );

  // HISTORY
  if (screen === "history") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("app")}>← Back</button>
          <span style={{fontWeight:800, fontSize:"18px"}}>My Roast History</span>
        </div>
        <button style={styles.toggle} onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        {/* Progress Chart */}
        {history.length >= 2 && (
          <div style={{...styles.card, marginBottom:"20px"}}>
            <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"16px", textTransform:"uppercase", letterSpacing:"1px"}}>📈 Progress Tracking</div>
            <div style={{display:"flex", alignItems:"flex-end", gap:"6px", height:"80px", padding:"0 4px"}}>
              {history.slice(0,10).reverse().map((h,i) => (
                <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px"}}>
                  <div style={{fontSize:"9px", color:c.text2}}>{h.score}</div>
                  <div style={{
                    width:"100%",
                    height:`${(h.score/10)*70}px`,
                    background: h.score <= 3 ? "#FF4500" : h.score <= 6 ? "#FFB300" : "#22C55E",
                    borderRadius:"4px 4px 0 0",
                    minHeight:"4px"
                  }}/>
                </div>
              ))}
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginTop:"8px"}}>
              <span style={{fontSize:"11px", color:c.text2}}>Oldest</span>
              <span style={{fontSize:"11px", color:c.text2}}>Latest</span>
            </div>
            <div style={{marginTop:"12px", padding:"10px", background:c.bg3, borderRadius:"10px", textAlign:"center"}}>
              {history.length >= 2 && history[0].score > history[history.length-1].score ? (
                <span style={{fontSize:"13px", color:"#22C55E", fontWeight:700}}>📈 You're improving! +{history[0].score - history[history.length-1].score} points</span>
              ) : history.length >= 2 && history[0].score < history[history.length-1].score ? (
                <span style={{fontSize:"13px", color:"#FF4500", fontWeight:700}}>📉 Score dropped {history[history.length-1].score - history[0].score} points — time to step up</span>
              ) : (
                <span style={{fontSize:"13px", color:"#FFB300", fontWeight:700}}>➡️ Consistent score — push for higher</span>
              )}
            </div>
          </div>
        )}

        {history.length === 0 ? (
          <div style={{textAlign:"center", padding:"60px 0", color:c.text2}}>
            <div style={{fontSize:"48px", marginBottom:"16px"}}>🔥</div>
            <div style={{fontWeight:700, marginBottom:"8px"}}>No roasts yet</div>
            <div style={{fontSize:"14px"}}>Get your first roast to see history</div>
          </div>
        ) : history.map((h,i) => (
          <div key={i} style={{...styles.card, marginBottom:"12px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px"}}>
              <span style={{fontSize:"12px", color:c.accent, fontWeight:700}}>{h.mode} Mode</span>
              <span style={{fontSize:"11px", color:c.text2}}>{h.date}</span>
            </div>
            <div style={{fontSize:"13px", color:c.text2, marginBottom:"8px"}}>{h.input}</div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{fontSize:"22px", fontWeight:900, color:scoreColor(h.score)}}>{h.score}/10</div>
              <div style={{fontSize:"13px", color:c.text2, fontStyle:"italic", maxWidth:"200px", textAlign:"right"}}>"{h.oneliner}"</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // MAIN APP
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={() => setScreen("landing")}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={{fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text}}>ROASTME</span>
          <span style={{fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px"}}>AI</span>
        </div>
        <div style={{display:"flex", gap:"8px", alignItems:"center"}}>
          {user ? (
            <span style={{fontSize:"11px", color:c.text2, cursor:"pointer"}} onClick={() => supabase.auth.signOut()}>👤 {user.email?.split("@")[0]} (logout)</span>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{fontSize:"12px", fontWeight:700, color:c.accent, background:"transparent", border:`1px solid ${c.accent}`, borderRadius:"8px", padding:"4px 10px", cursor:"pointer"}}>
              Sign In
            </button>
          )}
          {isPaid && <span style={{fontSize:"11px", fontWeight:700, color:c.accent, border:`1px solid ${c.accent}`, borderRadius:"6px", padding:"3px 8px"}}>{plan.toUpperCase()}</span>}
          <button style={styles.toggle} onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
        </div>
      </header>

      <div style={{maxWidth:"480px", margin:"0 auto"}}>
        {/* Counter */}
        {!isPaid && (
          <div style={{padding:"12px 20px"}}>
            <div style={styles.counter}>
              <span style={{fontSize:"14px"}}>🔥</span>
              <span style={{fontSize:"13px", fontWeight:600, color:c.accent}}>
                {ROAST_WEEKLY_LIMIT - roastsUsed} of {ROAST_WEEKLY_LIMIT} free roasts left this week
              </span>
            </div>
          </div>
        )}

        {/* Mode */}
        <div style={styles.section}>
          <div style={styles.label}>Choose Your Mode</div>
          <div style={styles.chipRow}>
            {modes.map(m => (
              <button key={m} style={styles.chip(mode === m)} onClick={() => {
                if (m === "Comedian" && !isPaid) { setShowPaywall(true); return; }
                setMode(m);
              }}>
                {m === "Savage" ? "🔥" : m === "Honest" ? "💬" : m === "Mentor" ? "🎓" : "😂"} {m}
                
              </button>
            ))}
          </div>
        </div>

        {/* Input type */}
        <div style={styles.section}>
          <div style={styles.label}>What are we roasting?</div>
          <div style={styles.chipRow}>
            {inputTypes.map(t => (
              <button key={t} style={styles.chip(inputType === t)} onClick={() => setInputType(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* Text */}
        <div style={styles.section}>
          <div style={styles.label}>Paste Your Text</div>
          <textarea
            style={styles.textarea}
            rows={7}
            placeholder={inputType === "My CV" ? "Paste your CV here and prepare for the truth..." : inputType === "My Bio" ? "Paste your bio here and prepare for the truth..." : inputType === "My Idea" ? "Describe your idea here and prepare for the truth..." : inputType === "My Email" ? "Paste your email here and prepare for the truth..." : "Paste anything here and prepare for the truth..."}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div style={{fontSize:"12px", color:c.text2, marginTop:"6px", textAlign:"right"}}>{text.length} characters</div>
        </div>

        {/* Roast button */}
        <div style={{padding:"0 20px 32px"}}>
          <button
            style={{...styles.btn, width:"100%", fontSize:"18px", padding:"18px", borderRadius:"14px", opacity: text.trim() ? 1 : 0.5}}
            onClick={handleRoast}
            disabled={!text.trim() || loading}
          >
            🔥 Roast Me
          </button>

          <div style={{display:"flex", gap:"8px", marginTop:"12px"}}>
            <button style={{...styles.btnOutline, flex:1, fontSize:"13px"}} onClick={() => setScreen("history")}>
              📜 History
            </button>
            <button style={{...styles.btnOutline, flex:1, fontSize:"13px"}} onClick={() => setScreen("profile")}>
              👤 Account
            </button>
            {!isPaid && (
              <button style={{...styles.btnOutline, flex:1, fontSize:"13px", borderColor:c.accent, color:c.accent}} onClick={() => setShowPaywall(true)}>
                ⚡ Upgrade
              </button>
            )}
          </div>
        </div>
      </div>

      {showPaywall && <Paywall c={c} onClose={() => setShowPaywall(false)} onUpgrade={(p) => { setPlan(p); setShowPaywall(false); }} dark={dark}/>}
      {showLogin && <LoginModal c={c} dark={dark} onClose={() => setShowLogin(false)} loginEmail={loginEmail} setLoginEmail={setLoginEmail}/>}
    </div>
  );
}

function LoginModal({ c, dark, onClose, loginEmail, setLoginEmail }) {
  const [showEmail, setShowEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)"}}>
      <div style={{background: dark ? "#111" : "#fff", borderRadius:"24px 24px 0 0", padding:"28px 20px 44px", width:"100%", maxWidth:"480px"}}>
        
        <div style={{width:"40px", height:"4px", background: dark ? "#333" : "#ddd", borderRadius:"2px", margin:"0 auto 24px"}}/>
        
        <div style={{textAlign:"center", marginBottom:"24px"}}>
          <div style={{fontSize:"28px", marginBottom:"10px"}}>🔥</div>
          <div style={{fontSize:"20px", fontWeight:900, color: dark ? "#fff" : "#000", marginBottom:"6px"}}>
            Save Your Roast
          </div>
          <div style={{fontSize:"14px", color:"#888", lineHeight:1.5}}>
            Get 2 more free roasts this week and keep your history forever.
          </div>
        </div>

        {!showEmail ? (
          <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"20px"}}>

            <button onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: "https://wgrrts.csb.app" }
                });
              }} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", padding:"14px", borderRadius:"12px", border:`1px solid ${dark ? "#333" : "#ddd"}`, background: dark ? "#1A1A1A" : "#f5f5f5", color: dark ? "#fff" : "#000", fontSize:"15px", fontWeight:600, cursor:"pointer"}}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg> Continue with Google
            </button>
            <button onClick={() => setShowEmail(true)} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", padding:"14px", borderRadius:"12px", border:`1px solid ${dark ? "#333" : "#ddd"}`, background: dark ? "#1A1A1A" : "#f5f5f5", color: dark ? "#fff" : "#000", fontSize:"15px", fontWeight:600, cursor:"pointer"}}>
              <span style={{fontSize:"20px"}}>📧</span> Continue with Email
            </button>
          </div>
        ) : (
          <div style={{marginBottom:"20px"}}>
            {!submitted ? (
              <>
                <input
                  type="email"
                  placeholder="Enter your email..."
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  style={{width:"100%", padding:"14px", borderRadius:"12px", border:`1px solid ${dark ? "#333" : "#ddd"}`, background: dark ? "#1A1A1A" : "#f5f5f5", color: dark ? "#fff" : "#000", fontSize:"15px", outline:"none", boxSizing:"border-box", marginBottom:"10px", fontFamily:"inherit"}}
                />
                <button
                  onClick={async () => {
                    if (!loginEmail) return;
                    await supabase.auth.signInWithOtp({ email: loginEmail, options: { emailRedirectTo: "https://wgrrts.csb.app" } });
                    setSubmitted(true);
                  }}
                  style={{width:"100%", padding:"14px", borderRadius:"12px", background:"#FF4500", color:"#fff", fontSize:"15px", fontWeight:700, border:"none", cursor:"pointer"}}>
                  Continue 🔥
                </button>
              </>
            ) : (
              <div style={{textAlign:"center", padding:"20px 0"}}>
                <div style={{fontSize:"32px", marginBottom:"10px"}}>✅</div>
                <div style={{fontWeight:700, color: dark ? "#fff" : "#000", marginBottom:"6px"}}>Check your email!</div>
                <div style={{fontSize:"14px", color:"#888"}}>We sent you a magic link to sign in.</div>
              </div>
            )}
          </div>
        )}

        <div style={{textAlign:"center", marginBottom:"16px"}}>
          <span style={{fontSize:"13px", color:"#888"}}>Already have an account? </span>
          <span style={{fontSize:"13px", color:"#FF4500", fontWeight:600, cursor:"pointer"}}>Sign in</span>
        </div>

        <button onClick={onClose} style={{width:"100%", background:"none", border:"none", cursor:"pointer", padding:"8px"}}>
          <div style={{fontSize:"13px", color:"#888"}}>⚠️ Skip — my roast history won't be saved</div>
        </button>

      </div>
    </div>
  );
}

function Paywall({ c, onClose, onUpgrade, dark }) {
  const plans = [
    { id:"free", name:"Free", price:"", period:"", features:["5 roasts/week","All 4 modes","📸 Shareable card with watermark"], highlight:false },
    { id:"fired_up", name:"🔥 Fired Up", price:"$2.99", period:"/month", features:["Unlimited roasts","📸 Clean card — no watermark","Full roast history & tracking"], highlight:true },
    { id:"brutal", name:"💀 Brutal", price:"$5.99", period:"/month", features:["Everything in Fired Up","🔍 Deep Roast — 7 detailed problems","📊 Weekly Roast Report","📈 Progress Tracking","🏆 Hall of Fame"], highlight:false },
  ];

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)"}}>
      <div style={{background: dark ? "#111" : "#fff", borderRadius:"24px 24px 0 0", padding:"28px 20px 40px", width:"100%", maxWidth:"480px"}}>
        <div style={{textAlign:"center", marginBottom:"24px"}}>
          <div style={{fontSize:"32px", marginBottom:"8px"}}>🔥</div>
          <div style={{fontSize:"20px", fontWeight:900, color: dark ? "#fff" : "#000", marginBottom:"6px"}}>
            Unlock the Full Roast
          </div>
          <div style={{fontSize:"14px", color:"#888"}}>Get unlimited roasts + all premium features</div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"20px"}}>
          {plans.map(p => (
            <div key={p.id} style={{border:`2px solid ${p.highlight ? "#FF4500" : dark ? "#2A2A2A" : "#E5E5E5"}`, borderRadius:"14px", padding:"16px", background: p.highlight ? "#FF450012" : "transparent", cursor:"pointer"}}
              onClick={() => onUpgrade(p.id)}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px"}}>
                <div style={{fontWeight:800, fontSize:"16px", color: dark ? "#fff" : "#000"}}>{p.name}</div>
                <div style={{fontWeight:900, fontSize:"18px", color: p.highlight ? "#FF4500" : dark ? "#fff" : "#000"}}>
                  {p.price}<span style={{fontSize:"12px", fontWeight:400, color:"#888"}}>{p.period}</span>
                </div>
              </div>
              <div style={{display:"flex", flexWrap:"wrap", gap:"6px"}}>
                {p.features.map((f,i) => (
                  <span key={i} style={{fontSize:"12px", color:"#888"}}>✓ {f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button style={{width:"100%", background:"none", border:"none", color:"#888", fontSize:"14px", cursor:"pointer", padding:"8px"}} onClick={onClose}>
          {(() => {
            const data = (() => { try { const r = localStorage.getItem("roastme_data"); return r ? JSON.parse(r) : null; } catch { return null; } })();
            if (data && data.weekStart) {
              const resetDate = data.weekStart + 7 * 24 * 60 * 60 * 1000;
              const now = Date.now();
              const msLeft = resetDate - now;
              if (msLeft > 0) {
                const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                return `Roasts reset in ${daysLeft} day${daysLeft === 1 ? "" : "s"} 🕐`;
              }
            }
            return "Roasts reset soon 🕐";
          })()}
        </button>
      </div>
    </div>
  );
}
