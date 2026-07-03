import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lrlqnuyezqyffjwcitqw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybHFudXllenF5ZmZqd2NpdHF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTc2MDcsImV4cCI6MjA5NzM3MzYwN30.8FoPtj67vpIhaq1Psl5q0vwOAHbSAg9FcoahPIlI_hI";

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) {
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
    : Date.now();
  // Only update roast counters — never overwrite other fields like history or plan
  saveData({ ...data, weekStart, roastsUsed: used + 1 });
}

function getHistory() {
  const data = getStoredData();
  return data?.history || [];
}

const IMAGE_LIMIT_FIRED_UP = 20;
const IMAGE_LIMIT_BRUTAL = 50;

function getMonthStart() {
  const data = getStoredData();
  if (!data || !data.imageMonthStart) return null;
  if (Date.now() - data.imageMonthStart >= 30 * 24 * 60 * 60 * 1000) return null;
  return data.imageMonthStart;
}

function getImagesUsed() {
  const data = getStoredData();
  if (!data) return 0;
  if (!data.imageMonthStart || Date.now() - data.imageMonthStart >= 30 * 24 * 60 * 60 * 1000) return 0;
  return data.imagesUsed || 0;
}

function incrementImagesUsed() {
  const data = getStoredData() || {};
  const used = getImagesUsed();
  const imageMonthStart = (data.imageMonthStart && Date.now() - data.imageMonthStart < 30 * 24 * 60 * 60 * 1000)
    ? data.imageMonthStart
    : Date.now();
  saveData({ ...data, imageMonthStart, imagesUsed: used + 1 });
}



function saveToHistory(roast) {
  // Guard: only save if there's meaningful data in localStorage (user is active)
  // This prevents writing history for a signed-out user due to race conditions
  const currentData = getStoredData() || {};
  const history = currentData.history || [];
  history.unshift({ ...roast, date: new Date().toLocaleDateString() });
  saveData({ ...currentData, history: history.slice(0, 50) });
}

function getBattleHistory() {
  const data = getStoredData();
  return data?.battleHistory || [];
}

function saveToBattleHistory(battle) {
  const bh = getBattleHistory();
  bh.unshift({ ...battle, date: new Date().toLocaleDateString() });
  const data = getStoredData() || {};
  saveData({ ...data, battleHistory: bh.slice(0, 30) });
}

const INTENSITY_LEVELS = [
  { id:"mild",       label:"Mild",       tagline:"I'll be gentle... ish",   emoji:"🌶️" },
  { id:"spicy",      label:"Spicy",      tagline:"No sugarcoating",         emoji:"🔥" },
  { id:"savage",     label:"Savage",     tagline:"Zero mercy",              emoji:"💀" },
  { id:"nuclear",    label:"Nuclear",    tagline:"You asked for this",      emoji:"☢️" },
  { id:"obliterate", label:"Obliterate", tagline:"This is not therapy",     emoji:"👹" },
];

function getSavedPlan() {
  const data = getStoredData();
  return data?.plan || "free";
}

function savePlan(planValue) {
  // Atomic write — only updates plan field, never touches other data
  const data = getStoredData() || {};
  const { plan: _old, billingStart: _bs, history: _h, battleHistory: _bh, ...deviceData } = data;
  saveData({ ...deviceData, plan: planValue });
}

function getBillingDate(planValue) {
  // Pure read — never writes to localStorage
  if (planValue === "free") return null;
  const data = getStoredData();
  if (!data?.billingStart) return null; // no write — caller must set billingStart separately
  const next = new Date(data.billingStart);
  next.setMonth(next.getMonth() + 1);
  while (next < new Date()) next.setMonth(next.getMonth() + 1);
  return next;
}

function setBillingStart() {
  // Separate function for writing billingStart — only called when plan is actually set
  const data = getStoredData() || {};
  if (!data.billingStart) {
    saveData({ ...data, billingStart: Date.now() });
  }
}

function formatBillingDate(date) {
  if (!date) return null;
  return date.toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
}


// ─── Global Bottom Navigation ───────────────────────────
function BottomNav({ screen, setScreen, dark, c, hasNewResult }) {
  const tabs = [
    {
      id: "app",
      label: "Roast",
      screens: ["app", "loading", "result"],
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth={active ? "2.5" : "1.8"} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
      )
    },
    {
      id: "history",
      label: "History",
      screens: ["history", "battle-history"],
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth={active ? "2.5" : "1.8"} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    },
    {
      id: "battle-hub",
      label: "Battle",
      screens: ["battle-hub", "battle-intro", "battle-result"],
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth={active ? "2.5" : "1.8"} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
          <path d="M13 19l6-6"/>
          <path d="M16 16l4 4"/>
          <path d="M19 21l2-2"/>
          <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/>
          <path d="M5 14l4 4"/>
          <path d="M7 17l-3 3"/>
          <path d="M3 19l2 2"/>
        </svg>
      )
    },
    {
      id: "profile",
      label: "Account",
      screens: ["profile", "help", "about", "privacy", "terms"],
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth={active ? "2.5" : "1.8"} strokeLinecap="round" strokeLinejoin="round" opacity={active ? 1 : 0.45}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
  ];

  const HIDDEN_SCREENS = ["onboarding", "loading"];
  if (HIDDEN_SCREENS.includes(screen)) return null;

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: dark ? "rgba(10,10,10,0.96)" : "rgba(250,250,250,0.96)",
      backdropFilter: "blur(20px)",
      borderTop: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {tabs.map(tab => {
        const active = tab.screens.includes(screen) || screen === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 4px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              position: "relative",
              transition: "opacity 0.15s",
            }}
          >
            {tab.icon(active)}
            <span style={{
              fontSize: "10px",
              fontWeight: active ? 700 : 500,
              color: "#FF4500",
              opacity: active ? 1 : 0.45,
              letterSpacing: "0.3px",
              transition: "color 0.15s",
            }}>
              {tab.label}
            </span>
            {active && (
              <div style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "24px",
                height: "2px",
                background: "#FF4500",
                borderRadius: "0 0 2px 2px",
              }}/>
            )}
          </button>
        );
      })}
    </nav>
  );
}


// ─── Reusable screen components ─────────────────────────
function EmptyState({ icon, title, sub, cta, onCta, c }) {
  return (
    <div style={{textAlign:"center", padding:"48px 24px"}}>
      <div style={{width:"64px", height:"64px", borderRadius:"50%", background:`${c.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}>
        {icon}
      </div>
      <div style={{fontSize:"18px", fontWeight:800, color:c.text, marginBottom:"8px"}}>{title}</div>
      <div style={{fontSize:"14px", color:c.text2, lineHeight:1.6, marginBottom:"24px", maxWidth:"260px", margin:"0 auto 24px"}}>{sub}</div>
      {cta && <button onClick={onCta} style={{background:"#FF4500", color:"#fff", border:"none", borderRadius:"14px", padding:"13px 28px", fontSize:"15px", fontWeight:700, cursor:"pointer"}}>{cta}</button>}
    </div>
  );
}

function StatCard({ label, value, color, sub, c }) {
  return (
    <div style={{background:c.bg3, borderRadius:"14px", padding:"14px 12px", textAlign:"center"}}>
      <div style={{fontSize:"26px", fontWeight:900, color: color || c.accent, lineHeight:1}}>{value ?? "—"}</div>
      {sub && <div style={{fontSize:"10px", color:color||c.accent, fontWeight:700, marginTop:"2px", opacity:0.8}}>{sub}</div>}
      <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>{label}</div>
    </div>
  );
}

function Metric({ label, value, c, BAR_COLOR }) {
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"6px"}}>
        <span style={{fontSize:"13px", color:c.text2, fontWeight:500}}>{label}</span>
        <span style={{fontSize:"14px", fontWeight:800, color:BAR_COLOR(value)}}>{value}</span>
      </div>
      <div style={{height:"3px", background:c.bg3, borderRadius:"2px", overflow:"hidden"}}>
        <div style={{height:"100%", width:`${(value/10)*100}%`, background:BAR_COLOR(value), borderRadius:"2px", transition:"width 0.8s ease"}}/>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div style={{minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px", textAlign:"center", fontFamily:"-apple-system, sans-serif", background:"#0A0A0A", color:"#fff"}}>
        <div style={{fontSize:"48px", marginBottom:"16px"}}>🔥</div>
        <div style={{fontSize:"22px", fontWeight:900, marginBottom:"8px"}}>Something went wrong</div>
        <div style={{fontSize:"14px", color:"#888", marginBottom:"24px"}}>The roast machine hit an unexpected error.</div>
        <button onClick={() => window.location.reload()} style={{padding:"12px 28px", borderRadius:"12px", background:"#FF4500", color:"#fff", fontWeight:700, fontSize:"15px", border:"none", cursor:"pointer"}}>
          Reload App
        </button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const [dark, setDark] = useState(() => { const d = getStoredData(); return d?.darkMode !== undefined ? d.darkMode : true; });
  const [screen, setScreen] = useState("landing");
  const [mode, setMode] = useState("Savage");
  const [inputType, setInputType] = useState("Anything");
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState(null);
  const [imageError, setImageError] = useState("");
  const [imagesUsed, setImagesUsed] = useState(getImagesUsed());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [roastsUsed, setRoastsUsed] = useState(getRoastsUsed());
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallPreselect, setPaywallPreselect] = useState(null);
  const [plan, setPlanState] = useState(getSavedPlan);
  const [animScore, setAnimScore] = useState(0);
  const [history, setHistory] = useState(getHistory());
  const [shareMsg, setShareMsg] = useState("");
  const [battleOpponent, setBattleOpponent] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [histTab, setHistTab] = useState("roasts");
  const [showInsights, setShowInsights] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const data = getStoredData();
    return !data?.onboardingDone;
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [username, setUsername] = useState(() => getStoredData()?.username || "");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [billingProfile, setBillingProfile] = useState(null);
  const [mainGoal, setMainGoal] = useState(() => getStoredData()?.mainGoal || "");
  const [profession, setProfession] = useState(() => getStoredData()?.profession || "");
  const [avatarColor, setAvatarColor] = useState(() => getStoredData()?.avatarColor || "#FF4500");
  const [intensity, setIntensity] = useState("savage");
  const [battleHistory, setBattleHistory] = useState(getBattleHistory());
  const canvasRef = useRef(null);

  // Persist plan to localStorage — atomic, only touches plan field
  function setPlan(p) {
    setPlanState(p);
    savePlan(p);
    if (p !== "free") {
      setBillingStart(); // separate atomic write, only sets if not already set
    }
  }

  // Persist dark mode
  function toggleDark() {
    const newDark = !dark;
    setDark(newDark);
    const data = getStoredData() || {};
    saveData({ ...data, darkMode: newDark });
  }

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
  const inputTypes = ["💕 My Bio","📸 My Caption","💬 Should I Send This?","📄 My CV","✨ Anything"];
  const isPaid = plan !== "free";
  const CHAR_LIMIT = plan === "brutal" ? 4000 : plan === "fired_up" ? 2000 : 600;
  const IMAGE_LIMIT = plan === "brutal" ? IMAGE_LIMIT_BRUTAL : IMAGE_LIMIT_FIRED_UP;

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

  async function handleSignOut() {
    // Await signOut before clearing state to prevent double-execution
    try { await supabase.auth.signOut(); } catch(e) {}
    clearUserState();
  }

  function clearUserState() {
    // Clear React user state — called by handleSignOut AND onAuthStateChange SIGNED_OUT
    setUser(null);
    setPlanState("free");
    setHistory([]);
    setBattleHistory([]);
    setResult(null);
    setRoastsUsed(getRoastsUsed());
    setIntensity("savage");
    setShowPaywall(false);
    setShowLogin(false);
    setShowCancelConfirm(false);
    setShowDeleteConfirm(false);
    setShowLogoutConfirm(false);
    setDisplayName("");
    setEditingName(false);
    setUsername("");
    setMainGoal("");
    setProfession("");
    setBattleOpponent(null);
    setBattleResult(null);
    setScreen("landing");

    // Clear localStorage — only user data, preserve device data
    const data = getStoredData() || {};
    saveData({
      darkMode:        data.darkMode,
      weekStart:       data.weekStart,
      roastsUsed:      data.roastsUsed,
      imageMonthStart: data.imageMonthStart,
      imagesUsed:      data.imagesUsed,
    });
  }

  // ── Stripe helpers ──────────────────────────────────────────
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  async function handleUpgrade(planId) {
    if (!user) { setShowLogin(true); return; }
    setUpgrading(true);
    setUpgradeError("");
    try {
      const res = await apiCall("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.type === "checkout" && data.url) {
        window.location.href = data.url;
      } else if (data.type === "updated") {
        setPlan(data.plan);
        setShowPaywall(false);
        setPaywallPreselect(null);
        setUpgrading(false);
      } else {
        setUpgrading(false);
        setUpgradeError(data.error || "Payments not configured yet. Coming soon.");
      }
    } catch(e) {
      setUpgrading(false);
      setUpgradeError("Payments not configured yet. Coming soon.");
    }
  }

  async function handleOpenPortal() {
    try {
      const res = await apiCall("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch(e) {
      console.error("Portal failed:", e);
    }
  }

  // Effective plan accounts for cancel_at_period_end grace period
  function getEffectivePlan(profileData) {
    if (!profileData) return "free";
    if (profileData.cancel_at_period_end &&
        profileData.stripe_current_period_end &&
        new Date(profileData.stripe_current_period_end) > new Date()) {
      return profileData.plan; // still within paid period
    }
    if (profileData.stripe_subscription_status === "past_due") return "free";
    return profileData.plan || "free";
  }

  // ── Supabase API helpers ────────────────────────────────────
  async function apiCall(path, options = {}) {
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    return fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  }

  async function loadProfileFromSupabase(userId) {
    try {
      const res = await apiCall("/api/profile/get");
      if (!res.ok) return null;
      const { profile } = await res.json();
      return profile;
    } catch { return null; }
  }

  async function runMigrationIfNeeded(profile) {
    if (profile?.migration_completed_at) return; // already done
    const localData = getStoredData() || {};
    const history = localData.history || [];
    const battleHistory = localData.battleHistory || [];
    if (history.length === 0 && battleHistory.length === 0) {
      // Nothing to migrate — mark as done
      await apiCall("/api/profile/migrate", {
        method: "POST",
        body: JSON.stringify({ history: [], battleHistory: [] }),
      });
      return;
    }
    try {
      await apiCall("/api/profile/migrate", {
        method: "POST",
        body: JSON.stringify({ history, battleHistory }),
      });
    } catch (e) {
      console.error("Migration failed:", e);
      // Non-fatal — will retry next login
    }
  }

  async function saveRoastToSupabase(roastData, roastId) {
    // roastId = optional, the localStorage-generated id (not used for Supabase)
    try {
      const res = await apiCall("/api/roasts/save", {
        method: "POST",
        body: JSON.stringify({
          mode:       roastData.mode,
          inputType:  inputType,
          inputText:  text.slice(0, 500),
          score:      roastData.score,
          oneliner:   roastData.oneliner,
          verdict:    roastData.verdict,
          wrong:      roastData.wrong,
          works:      roastData.works,
          fix:        roastData.fix,
          theFix:     roastData.theFix,
          intensity,
        }),
      });
      if (!res.ok) return null;
      const { id } = await res.json();
      return id; // Supabase UUID — needed for challenge creation
    } catch { return null; }
  }

  async function saveBattleToSupabase(battleData, supabaseRoastId) {
    try {
      await apiCall("/api/battles/save", {
        method: "POST",
        body: JSON.stringify({
          challengerRoastId: supabaseRoastId || null,
          challengerScore:   battleData.myScore,
          challengerOneliner: battleData.myOneliner,
          opponentScore:     battleData.opponentScore,
          opponentOneliner:  battleData.opponentOneliner,
          mode:              battleData.mode,
          result:            battleData.result,
        }),
      });
    } catch { /* non-fatal */ }
  }

  // Auth state listener — loads real profile from Supabase on login
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const profile = await loadProfileFromSupabase(session.user.id);
        if (profile) {
          const effectivePlan = getEffectivePlan(profile);
          setPlanState(effectivePlan);
          savePlan(effectivePlan);
          if (profile.display_name) setDisplayName(profile.display_name);
          if (profile.username) setUsername(profile.username);
          if (profile.main_goal) setMainGoal(profile.main_goal);
          if (profile.profession) setProfession(profile.profession);
          if (profile.avatar_color) setAvatarColor(profile.avatar_color);
          setBillingProfile(profile);
          await runMigrationIfNeeded(profile);
        }
        // Load history from Supabase
        try {
          const hRes = await apiCall("/api/roasts/list");
          const hData = await hRes.json();
          if (hData.roasts && hData.roasts.length > 0) {
            setHistory(hData.roasts);
          }
        } catch(e) {}
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        clearUserState();
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        const profile = await loadProfileFromSupabase(session.user.id);
        if (profile) {
          const effectivePlan = getEffectivePlan(profile);
          setPlanState(effectivePlan);
          savePlan(effectivePlan);
          if (profile.display_name) setDisplayName(profile.display_name);
          setBillingProfile(profile);
          await runMigrationIfNeeded(profile);
        }
        // Load history from Supabase on sign in
        try {
          const hRes = await apiCall("/api/roasts/list");
          const hData = await hRes.json();
          if (hData.roasts && hData.roasts.length > 0) {
            setHistory(hData.roasts);
          }
        } catch(e) {}
      } else {
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set meta tags for social sharing
  useEffect(() => {
    document.title = "RoastMe AI — Get Brutally Honest Feedback";
    const setMeta = (name, content, prop=false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", "The only AI that tells you the brutal truth. Get honest feedback on your bio, CV, captions, and messages. No sugarcoating.");
    setMeta("og:title", "RoastMe AI — Brutally Honest Feedback", true);
    setMeta("og:description", "Paste your bio, CV, or caption and get a ruthless AI roast. Improve everything.", true);
    setMeta("og:type", "website", true);
    setMeta("og:url", "https://roastme-ai26.vercel.app", true);
    setMeta("og:image", "https://roastme-ai26.vercel.app/og-image.svg", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "RoastMe AI — Brutally Honest Feedback");
    setMeta("twitter:description", "The AI that tells you the brutal truth about your bio, CV, and captions.");
    setMeta("twitter:image", "https://roastme-ai26.vercel.app/og-image.svg");
  }, []);

  // Load Hall of Fame roast or Battle challenge from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeParam = params.get("challenge");   // new: UUID
    const battleParam    = params.get("battle");       // legacy: JSON (keep for old links)
    const roastParam     = params.get("roast");        // Hall of Fame JSON (legacy)
    const upgradedParam  = params.get("upgraded");     // Stripe success redirect
    const planParam      = params.get("plan");

    // Handle Stripe checkout success redirect
    if (upgradedParam === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      if (planParam && ["fired_up","brutal"].includes(planParam)) {
        setPlan(planParam); // optimistic — webhook will confirm/correct
      }
      setScreen("profile");
      return;
    }

    if (challengeParam) {
      // New secure challenge system
      fetch(`/api/challenges/get?id=${encodeURIComponent(challengeParam)}`)
        .then(r => r.json())
        .then(data => {
          if (data.challenge) {
            setBattleOpponent({
              score:     data.challenge.score,
              oneliner:  data.challenge.oneliner,
              mode:      data.challenge.mode,
              inputType: data.challenge.inputType,
              challengeId: data.challenge.id,
            });
            setInputType(data.challenge.inputType || "✨ Anything");
            setMode(data.challenge.mode || "Savage");
            setScreen("battle-intro");
          } else if (data.error === "Challenge has expired") {
            window.history.replaceState({}, "", window.location.pathname);
            setScreen("challenge-expired");
          } else {
            // Not found or other error
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .catch(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
    } else if (battleParam) {
      // Legacy JSON battle link — parse and use as before
      try {
        const opponentData = JSON.parse(decodeURIComponent(battleParam));
        setBattleOpponent(opponentData);
        setInputType(opponentData.inputType || "✨ Anything");
        setMode(opponentData.mode || "Savage");
        setScreen("battle-intro");
      } catch(e) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } else if (roastParam) {
      try {
        const roastData = JSON.parse(decodeURIComponent(roastParam));
        setResult(roastData);
        setScreen("halloffame");
      } catch(e) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageError("");

    if (imagesUsed >= IMAGE_LIMIT) {
      setImageError(`You've used all ${IMAGE_LIMIT} image uploads this month. Resets next month, or upgrade for more.`);
      e.target.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Image too large — please use one under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      setImageData({ base64, mediaType: file.type, previewUrl: reader.result });
      setText("");
    };
    reader.onerror = () => setImageError("Couldn't read that image — try a different one");
    reader.readAsDataURL(file);
  }

  async function handleRoast() {
    if (!text.trim() && !imageData) return;
    if (text.length > CHAR_LIMIT) return;
    // Comedian is now free for everyone
    if (roastsUsed >= ROAST_WEEKLY_LIMIT && !isPaid) { setShowPaywall(true); return; }

    setLoading(true);
    setScreen("loading");

    // Safety timeout — if API doesn't respond in 30s, show error
    const timeoutId = setTimeout(() => {
      setLoading(false);
      const timeoutResult = {
        score: 1,
        wrong: ["Something went wrong","The AI is judging you for breaking it","Try again"],
        works: ["At least you tried"],
        fix: ["Try again","Check your internet","Pray"],
        oneliner: "Even the AI gave up on you. That's impressive.",
        verdict: "Something went wrong. But honestly, maybe it's a sign.",
        mode,
        input: text.slice(0, 60)
      };
      setResult(timeoutResult);
      if (battleOpponent) {
        setBattleResult(timeoutResult);
        setScreen("battle-result");
      } else {
        setScreen("result");
      }
    }, 30000);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, intensity, inputType })
      });
      const data = await response.json();
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(data.error || `API error ${response.status}`);
      const parsed = data.result;
      if (!parsed || typeof parsed.score === "undefined") throw new Error("Invalid response from AI");
      parsed.mode = mode;
      parsed.input = imageData ? "📷 Image upload" : text.slice(0, 60) + (text.length > 60 ? "..." : "");

      setResult(parsed);

      // 1. Save locally (always, immediate)
      if (!isPaid) {
        incrementRoasts();
        setRoastsUsed(getRoastsUsed());
      }
      saveToHistory(parsed);
      setHistory(getHistory());

      // 2. Dual-write to Supabase if logged in (non-blocking)
      let supabaseRoastId = null;
      if (user) {
        supabaseRoastId = await saveRoastToSupabase(parsed);
        if (supabaseRoastId) parsed.supabaseRoastId = supabaseRoastId;
      }

      if (imageData) {
        incrementImagesUsed();
        setImagesUsed(getImagesUsed());
      }
      setImageData(null);

      if (battleOpponent) {
        setBattleResult(parsed);
        const battleEntry = {
          myScore:          parsed.score,
          opponentScore:    battleOpponent.score,
          myOneliner:       parsed.oneliner,
          opponentOneliner: battleOpponent.oneliner,
          mode:             parsed.mode,
          result:           parsed.score > battleOpponent.score ? "win" : parsed.score < battleOpponent.score ? "loss" : "tie",
        };
        saveToBattleHistory(battleEntry);
        setBattleHistory(getBattleHistory());
        // Dual-write battle to Supabase
        if (user) {
          await saveBattleToSupabase(battleEntry, supabaseRoastId);
        }
        setScreen("battle-result");
      } else {
        setScreen("result");
        if (!isPaid) setTimeout(() => setShowLogin(true), 1500);
      }
    } catch(err) {
      clearTimeout(timeoutId);
      console.error("RoastMe API error:", err);
      const errorResult = {
        score: 1,
        wrong: ["Something went wrong","The AI is judging you for breaking it","Try again"],
        works: ["At least you tried"],
        fix: ["Try again","Check your internet","Pray"],
        oneliner: "Even the AI gave up on you. That's impressive.",
        verdict: "Something went wrong. But honestly, maybe it's a sign.",
        mode,
        input: text.slice(0, 60)
      };
      setResult(errorResult);
      if (battleOpponent) {
        setBattleResult(errorResult);
        setScreen("battle-result");
      } else {
        setScreen("result");
      }
    }
    setLoading(false);
  }

  function shareRoast() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");

    const cardBg = dark ? "#000000" : "#FFFFFF";
    const cardFill = dark ? "#111111" : "#FFFFFF";
    const cardBorder = dark ? "rgba(255,69,0,0.5)" : "rgba(255,107,0,0.6)";
    const titleColor = dark ? "#FFFFFF" : "#1A1A1A";
    const dividerColor = dark ? "#2A2A2A" : "#E5E5E5";
    const oneLinerColor = dark ? "#FFFFFF" : "#1A1A1A";
    const ctaTextColor = dark ? "#FFFFFF" : "#1A1A1A";
    const slashColor = dark ? "#666666" : "#999999";
    const glowAlpha = dark ? "0.45" : "0.22";
    const scoreColor = result?.score <= 3 ? "#FF4500" : result?.score <= 6 ? "#FFB300" : "#22C55E";

    ctx.fillStyle = cardBg;
    ctx.fillRect(0, 0, 1080, 1400);

    function roundRectPath(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    const cardX = 60, cardY = 90, cardW = 960, cardH = 1220, cardR = 40;

    // Glow + card
    ctx.save();
    ctx.shadowColor = `rgba(255,69,0,${glowAlpha})`;
    ctx.shadowBlur = 70;
    roundRectPath(cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = cardFill;
    ctx.fill();
    ctx.restore();

    roundRectPath(cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = cardFill;
    ctx.fill();
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Watermark for Free plan
    if (!isPaid) {
      ctx.save();
      roundRectPath(cardX, cardY, cardW, cardH, cardR);
      ctx.clip();
      ctx.fillStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
      ctx.font = "bold 30px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.rotate(-Math.PI / 8);
      for (let wy = -200; wy < 1700; wy += 160) {
        for (let wx = -200; wx < 1700; wx += 380) {
          ctx.fillText("FREE PLAN", wx, wy);
          ctx.fillText("roastme-ai26.vercel.app", wx, wy + 36);
        }
      }
      ctx.restore();
    }

    // Fire emoji logo
    ctx.textAlign = "center";
    ctx.font = "72px serif";
    ctx.fillText("🔥", 540, 210);

    // ROASTME AI
    ctx.font = "900 70px Arial Black, Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = titleColor;
    const roastmeWidth = ctx.measureText("ROASTME").width;
    const startX = (1080 - roastmeWidth - 58) / 2;
    ctx.fillText("ROASTME", startX, 300);
    ctx.fillStyle = "#FF4500";
    ctx.font = "bold 38px Arial Black, Arial, sans-serif";
    ctx.fillText("AI", startX + roastmeWidth + 10, 300);
    ctx.textAlign = "center";

    // Score circle
    const circleX = 540, circleY = 530, circleR = 200;

    ctx.save();
    ctx.shadowColor = scoreColor;
    ctx.shadowBlur = 45;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = scoreColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = scoreColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Score number + /10
    const scoreStr = String(result?.score ?? "—");
    ctx.font = "900 160px Arial Black, Arial, sans-serif";
    const scoreNumWidth = ctx.measureText(scoreStr).width;
    ctx.font = "bold 65px Arial, sans-serif";
    const slash10Width = ctx.measureText("/10").width;
    const totalW = scoreNumWidth + 12 + slash10Width;
    const blockStartX = circleX - totalW / 2;

    ctx.textAlign = "left";
    ctx.fillStyle = scoreColor;
    ctx.font = "900 160px Arial Black, Arial, sans-serif";
    ctx.fillText(scoreStr, blockStartX, circleY + 55);
    ctx.fillStyle = slashColor;
    ctx.font = "bold 65px Arial, sans-serif";
    ctx.fillText("/10", blockStartX + scoreNumWidth + 12, circleY + 45);
    ctx.textAlign = "center";

    // Mode pill — dynamically positioned below circle
    const pillText = "● " + (result?.mode?.toUpperCase() || "SAVAGE") + " MODE";
    ctx.font = "bold 26px Arial, sans-serif";
    const pillTextWidth = ctx.measureText(pillText).width;
    const pillPadX = 28, pillH = 52;
    const pillW = pillTextWidth + pillPadX * 2;
    const pillX = circleX - pillW / 2;
    const pillY = circleY + circleR + 24;

    roundRectPath(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.strokeStyle = "rgba(255,69,0,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#FF4500";
    ctx.font = "bold 26px Arial, sans-serif";
    ctx.fillText(pillText, circleX, pillY + 34);

    // Brutal badge — only for Brutal plan
    if (plan === "brutal") {
      const badgeText = "BRUTAL";
      ctx.font = "bold 20px Arial, sans-serif";
      const badgeW = ctx.measureText(badgeText).width + 36;
      const badgeH = 40;
      const badgeX = cardX + cardW - 60 - badgeW;
      const badgeY = pillY - badgeH / 2 + pillH / 2;
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
      } else {
        roundRectPath(badgeX, badgeY, badgeW, badgeH, 20);
      }
      ctx.fillStyle = "#FF4500";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 27);
      ctx.restore();
    }

    // Divider — dynamically after pill
    const divider1Y = pillY + pillH + 40;
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 60, divider1Y);
    ctx.lineTo(cardX + cardW - 60, divider1Y);
    ctx.stroke();

    // One-liner with dynamic wrap
    ctx.font = "italic 40px Georgia, serif";
    ctx.textAlign = "center";
    const oneliner = result?.oneliner || "";
    const words = oneliner.split(" ");
    let line = "";
    const lineHeight = 56;
    const maxWidth = 760;
    const lines = [];
    for (let word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxWidth && line !== "") {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line = test;
      }
    }
    lines.push(line.trim());

    const quoteStartY = divider1Y + 70;
    const textStartY = quoteStartY + 10;

    ctx.fillStyle = "#FF4500";
    ctx.font = "italic 900 60px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText("\u201C", cardX + 70, quoteStartY);
    ctx.textAlign = "right";
    const lastLineY = textStartY + (lines.length - 1) * lineHeight;
    ctx.fillText("\u201D", cardX + cardW - 70, lastLineY);
    ctx.textAlign = "center";

    ctx.fillStyle = oneLinerColor;
    ctx.font = "italic 40px Georgia, serif";
    lines.forEach((l, i) => ctx.fillText(l, 540, textStartY + i * lineHeight));

    // Divider above footer — dynamically after one-liner
    const divider2Y = textStartY + lines.length * lineHeight + 50;
    ctx.strokeStyle = dividerColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 60, divider2Y);
    ctx.lineTo(cardX + cardW - 60, divider2Y);
    ctx.stroke();

    // Footer CTA
    const ctaY = divider2Y + 60;
    ctx.font = "28px Arial, sans-serif";
    const ctaMid = "Roast yours at ";
    const midWidth = ctx.measureText(ctaMid).width;
    ctx.font = "bold 28px Arial, sans-serif";
    const ctaSite = "roastme-ai26.vercel.app";
    const siteWidth = ctx.measureText(ctaSite).width;
    const fireWidth = 38;
    const gap = 14;
    const ctaTotalWidth = fireWidth + gap + midWidth + siteWidth;
    let ctaX = 540 - ctaTotalWidth / 2;

    ctx.font = "34px serif";
    ctx.textAlign = "left";
    ctx.fillStyle = ctaTextColor;
    ctx.fillText("🔥", ctaX, ctaY);
    ctaX += fireWidth + gap;
    ctx.font = "28px Arial, sans-serif";
    ctx.fillStyle = ctaTextColor;
    ctx.fillText(ctaMid, ctaX, ctaY);
    ctaX += midWidth;
    ctx.fillStyle = "#FF4500";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.fillText(ctaSite, ctaX, ctaY);

    // Convert to blob and share
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "RoastMe-AI-just-roasted-me.png", { type: "image/png" });
      try {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "RoastMe AI just destroyed me 🔥",
            text: `🔥 RoastMe AI just destroyed me\n\nScore: ${result?.score}/10\n"${result?.oneliner}"\n\n👉 Get roasted at roastme-ai26.vercel.app`
          });
        } else if (navigator.share) {
          await navigator.share({
            title: "RoastMe AI just destroyed me 🔥",
            text: `🔥 RoastMe AI just destroyed me\n\nScore: ${result?.score}/10\n"${result?.oneliner}"\n\n👉 Get roasted at roastme-ai26.vercel.app`
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
      } catch(e) {
        if (e?.name !== "AbortError") {
          const url = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = url;
          a.download = "my-roast.png";
          a.click();
          setShareMsg("Image saved!");
          setTimeout(() => setShareMsg(""), 2000);
        }
        // AbortError = user cancelled, do nothing
      }
    }, "image/png");
  }

  const scoreColor = (s) => s <= 3 ? "#FF4500" : s <= 6 ? "#FFB300" : "#22C55E";

  const styles = {
    app: { minHeight:"100vh", background:c.bg, color:c.text, fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif", transition:"all 0.3s ease", animation:"fadeIn 0.2s ease-out" },
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
  // CHALLENGE EXPIRED
  if (screen === "challenge-expired") return (
    <div style={{...styles.app, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:"20px", textAlign:"center"}}>
      <div style={{width:"64px", height:"64px", borderRadius:"50%", background:"#FF450015", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px"}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div style={{fontSize:"22px", fontWeight:900, color:c.text, marginBottom:"8px"}}>Challenge Expired</div>
      <div style={{fontSize:"14px", color:c.text2, lineHeight:1.6, marginBottom:"28px", maxWidth:"300px"}}>This challenge link has expired. Challenge links are valid for 7 days.</div>
      <button onClick={() => setScreen("app")} style={{...styles.btn, padding:"14px 28px", fontSize:"15px"}}>Start Your Own Roast</button>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
  );

  // ONBOARDING — shown once to new users
  if (showOnboarding) return (
    <div style={{...styles.app, display:"flex", flexDirection:"column", minHeight:"100vh"}}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={{fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text}}>ROASTME</span>
          <span style={{fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px"}}>AI</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"32px 20px", flex:1, display:"flex", flexDirection:"column", justifyContent:"center"}}>
        <div style={{textAlign:"center", marginBottom:"32px"}}>
          <div style={{width:"72px", height:"86px", margin:"0 auto 20px"}}><FIRE_ICON/></div>
          <h1 style={{fontSize:"32px", fontWeight:900, letterSpacing:"-1px", margin:"0 0 12px", color:c.text}}>Welcome to RoastMe AI</h1>
          <p style={{fontSize:"16px", color:c.text2, lineHeight:1.6, margin:0}}>The only AI that tells you the brutal truth — and actually helps you improve.</p>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:"12px", marginBottom:"32px"}}>
          {[
            { icon:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z", title:"Paste any text", desc:"Your bio, a caption, a message, your CV — anything." },
            { icon:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z", title:"Choose your mode", desc:"Savage, Honest, Mentor, or Comedian. Each hits differently." },
            { icon:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z", title:"Get brutal feedback", desc:"A score out of 10, what's wrong, what works, and how to fix it." },
          ].map((step, i) => (
            <div key={i} style={{display:"flex", gap:"16px", alignItems:"flex-start", padding:"16px", background:c.bg2, borderRadius:"14px", border:`1px solid ${c.border}`}}>
              <div style={{width:"40px", height:"40px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={step.icon}/></svg>
              </div>
              <div>
                <div style={{fontWeight:700, fontSize:"15px", color:c.text, marginBottom:"4px"}}>{step.title}</div>
                <div style={{fontSize:"13px", color:c.text2, lineHeight:1.5}}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button style={{...styles.btn, width:"100%", fontSize:"17px", padding:"18px"}} onClick={() => {
          const data = getStoredData() || {};
          saveData({ ...data, onboardingDone: true });
          setShowOnboarding(false);
        }}>
          Get Started — It's Free
        </button>
        <p style={{textAlign:"center", fontSize:"13px", color:c.text2, marginTop:"12px"}}>5 free roasts per week. No credit card needed.</p>
      </div>
    </div>
  );

  if (screen === "landing") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={styles.logoText}>ROASTME</span>
          <span style={styles.logoAI}>AI</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
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
        <button style={{...styles.btn, width:"100%", fontSize:"18px", padding:"18px", borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"9px"}}
          onClick={() => setScreen("app")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          Roast Me Now — It's Free
        </button>
        <p style={{fontSize:"13px", color:c.text2, marginTop:"12px"}}>5 free roasts per week. No credit card needed.</p>

        <div style={{fontSize:"12px", fontWeight:700, color:c.text2, textTransform:"uppercase", letterSpacing:"1px", marginTop:"48px", marginBottom:"10px"}}>Choose Your Mode</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
          {[
            { title:"Savage", desc:"Brutal, funny, uses your own words against you", d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" },
            { title:"Honest", desc:"Direct, clear, no sugarcoating", d:"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
            { title:"Mentor", desc:"Tough but caring, every problem has a solution", d:"M22 10 12 5 2 10l10 5 10-5Z", d2:"M6 12v5c3 3 9 3 12 0v-5" },
            { title:"Comedian", desc:"Pure entertainment, cry-laugh guaranteed", circle:true, d:"M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12z", d2:"M9 9L9.01 9", d3:"M15 9L15.01 9" },
          ].map(m => (
            <div key={m.title} style={{...styles.card, textAlign:"center", padding:"20px 12px", minHeight:"110px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
              <div style={{width:"40px", height:"40px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {m.circle && <circle cx="12" cy="12" r="10"/>}
                  {m.d && <path d={m.d}/>}
                  {m.d2 && <path d={m.d2}/>}
                  {m.d3 && <path d={m.d3}/>}
                </svg>
              </div>
              <div style={{fontWeight:700, fontSize:"14px", marginBottom:"4px"}}>{m.title}</div>
              <div style={{fontSize:"12px", color:c.text2}}>{m.desc}</div>
            </div>
          ))}
        </div>

        <div style={{...styles.card, marginTop:"20px", textAlign:"left", border:`1px solid ${c.accent}30`}}>
          <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px"}}>
            <div style={{fontSize:"11px", color:c.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px"}}>Live Example — Savage Mode</div>
            <div style={{fontSize:"11px", color:c.text2, background:c.bg3, borderRadius:"6px", padding:"2px 8px"}}>CV Roast</div>
          </div>
          <div style={{fontSize:"13px", color:c.text2, fontStyle:"italic", lineHeight:1.6, marginBottom:"12px", padding:"10px", background:c.bg3, borderRadius:"8px", borderLeft:`3px solid ${c.accent}`}}>
            "You listed 'Microsoft Word' as a skill in 2026. Your cat walks across the keyboard and produces better content. You have 11 years of experience at the same company, which either means you are irreplaceable or they forgot you were there."
          </div>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div style={{fontSize:"28px", fontWeight:900, color:"#FF4500"}}>2<span style={{fontSize:"16px", color:c.text2}}>/10</span></div>
            <button onClick={() => setScreen("app")} style={{...styles.btn, padding:"10px 20px", fontSize:"14px"}}>
              Try it on yours →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // LOADING
  const loadingMessages = {
    Savage: [
      "Sharpening the knives...",
      "Preparing the most brutal truth of your life...",
      "No mercy. No filters. No sugarcoating...",
      "Reading your submission very carefully...",
      "This is going to sting. In a good way."
    ],
    Honest: [
      "Cutting through the noise...",
      "Reading between the lines...",
      "No flattery. Just facts. Processing...",
      "Analysing every word you wrote...",
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
      "Writing your roast set...",
      "Preparing material. This is going to be legendary.",
      "The crowd is waiting. The AI is cooking...",
      "Stand up comedy incoming. You asked for this.",
      "Warning: may cause uncontrollable laughter."
    ]
  };
  const randomMsg = loadingMessages[mode]?.[Math.floor(Math.random() * 5)] || "Analysing your submission...";

  if (screen === "loading") return (
    <div style={{...styles.app, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}>
      <div style={{width:"80px", height:"96px", animation:"pulse 1s ease-in-out infinite"}}>
        <FIRE_ICON/>
      </div>
      <p style={{marginTop:"24px", fontSize:"18px", fontWeight:700, color:c.text}}>Roasting you...</p>
      <p style={{fontSize:"14px", color:c.text2, marginTop:"8px", textAlign:"center", padding:"0 40px"}}>{randomMsg}</p>
      <p style={{fontSize:"12px", color:c.text2, marginTop:"16px", opacity:0.6}}>Usually takes 5–15 seconds</p>
      <button onClick={() => { setScreen("app"); setLoading(false); }} style={{marginTop:"32px", background:"none", border:`1px solid ${c.border}`, borderRadius:"8px", color:c.text2, fontSize:"13px", cursor:"pointer", padding:"8px 20px"}}>
        Cancel
      </button>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
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
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>

      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        {/* Score */}
        <div style={{...styles.card, textAlign:"center", marginBottom:"16px", padding:"28px 20px"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", fontSize:"13px", color:c.text2, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
            {result.mode} Mode
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          </div>
          <div style={{fontSize:"72px", fontWeight:900, color:scoreColor(animScore), lineHeight:1, transition:"color 0.3s"}}>
            {animScore}<span style={{fontSize:"32px", color:c.text2}}>/10</span>
          </div>
          <div style={{marginTop:"16px", fontSize:"15px", color:c.text2, fontStyle:"italic", lineHeight:1.5}}>
            "{result.verdict}"
          </div>

          {/* B3.3 — Result Memory: personal records */}
          {(() => {
            const prevAll   = history.filter(h => h.score > 0).map(h => h.score);
            const prevMode  = history.filter(h => h.mode === result.mode && h.score > 0).map(h => h.score);
            const now       = new Date();
            const prevMonth = history.filter(h => { const d = new Date(h.date||h.created_at); return !isNaN(d) && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() && h.score > 0; }).map(h=>h.score);

            const isNewBest       = prevAll.length > 0 && result.score > Math.max(...prevAll);
            const isNewModeBest   = prevMode.length > 0 && result.score > Math.max(...prevMode);
            const isNewMonthBest  = prevMonth.length > 0 && result.score > Math.max(...prevMonth);

            if (isNewBest) return (
              <div style={{marginTop:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px"}}>
                <span style={{fontSize:"16px"}}>✦</span>
                <span style={{fontSize:"13px", fontWeight:700, color:c.accent}}>New Personal Best</span>
                <span style={{fontSize:"16px"}}>✦</span>
              </div>
            );
            if (isNewModeBest) return (
              <div style={{marginTop:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px"}}>
                <span style={{fontSize:"13px", fontWeight:700, color:"#22C55E"}}>Best {result.mode} Result Yet</span>
              </div>
            );
            if (isNewMonthBest && prevMonth.length >= 2) return (
              <div style={{marginTop:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px"}}>
                <span style={{fontSize:"13px", fontWeight:700, color:"#22C55E"}}>Best Result This Month</span>
              </div>
            );
            return null;
          })()}
        </div>

        {/* B2.8 — Result contextual line */}
        {(() => {
          const prevScores = history.filter(h => h.score > 0).map(h => h.score);
          if (prevScores.length < 2) return null;
          const avg = Math.round(prevScores.reduce((a,b)=>a+b,0) / prevScores.length * 10) / 10;
          const diff = result.score - avg;

          // Check if it's the best score in last 14 days
          const fourteenDaysAgo = Date.now() - 14*24*60*60*1000;
          const recent14 = history.filter(h => {
            const d = new Date(h.date || h.created_at);
            return !isNaN(d) && d.getTime() > fourteenDaysAgo && h.score > 0;
          }).map(h => h.score);
          const bestIn14 = recent14.length > 0 && result.score >= Math.max(...recent14);

          // Check if it's one of best this month
          const now = new Date();
          const thisMonthScores = history.filter(h => {
            const d = new Date(h.date || h.created_at);
            return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && h.score > 0;
          }).map(h => h.score);
          const isTopThisMonth = thisMonthScores.length >= 3 && result.score >= Math.max(...thisMonthScores);

          let label, color;
          if (isTopThisMonth) {
            label = "One of your strongest results this month"; color = "#22C55E";
          } else if (bestIn14 && recent14.length >= 3) {
            label = "Your best score in the last 14 days"; color = "#22C55E";
          } else if (diff > 1.5) {
            label = "Strong improvement detected"; color = "#22C55E";
          } else if (diff > 0.4) {
            label = `Above your recent average · ${avg}/10`; color = "#22C55E";
          } else if (diff < -0.4) {
            label = `Below your recent average · ${avg}/10`; color = "#FF4500";
          } else {
            label = `Matches your average · ${avg}/10`; color = "#FFB300";
          }

          return (
            <div style={{display:"flex", alignItems:"center", gap:"7px", marginBottom:"14px", padding:"9px 14px", background:`${color}10`, border:`1px solid ${color}25`, borderRadius:"10px"}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {color === "#22C55E"
                  ? (<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>)
                  : color === "#FF4500"
                  ? (<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>)
                  : (<line x1="5" y1="12" x2="19" y2="12"/>)}
              </svg>
              <span style={{fontSize:"12px", fontWeight:600, color}}>{label}</span>
            </div>
          );
        })()}

        {/* One-liner */}
        <div style={{...styles.card, marginBottom:"16px", background:`${c.accent}12`, border:`1px solid ${c.accent}40`}}>
          <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            The One-Liner
          </div>
          <div style={{fontSize:"17px", fontWeight:700, lineHeight:1.4, color:c.text}}>"{result.oneliner}"</div>
        </div>

        {/* What's wrong */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:"#FF4500", fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            What's Wrong
          </div>
          {result.wrong.map((w,i) => (
            <div key={i} style={{display:"flex", gap:"10px", marginBottom:"10px", alignItems:"flex-start"}}>
              <span style={{color:c.accent, fontWeight:700, minWidth:"20px"}}>#{i+1}</span>
              <span style={{fontSize:"14px", lineHeight:1.5, color:c.text}}>{w}</span>
            </div>
          ))}
        </div>

        {/* What works */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:"#22C55E", fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            What Works
          </div>
          {result.works.map((w,i) => (
            <div key={i} style={{display:"flex", gap:"10px", marginBottom:"8px", alignItems:"flex-start"}}>
              <span style={{color:"#22C55E", minWidth:"20px"}}>✓</span>
              <span style={{fontSize:"14px", lineHeight:1.5, color:c.text}}>{w}</span>
            </div>
          ))}
        </div>

        {/* How to fix */}
        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:"#3B82F6", fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
            How to Fix It
          </div>
          {result.fix.map((f,i) => (
            <div key={i} style={{display:"flex", gap:"10px", marginBottom:"10px", alignItems:"flex-start"}}>
              <span style={{color:"#3B82F6", fontWeight:700, minWidth:"20px"}}>{i+1}.</span>
              <span style={{fontSize:"14px", lineHeight:1.5, color:c.text}}>{f}</span>
            </div>
          ))}
        </div>

        {/* The Fix — direct rewrite, paid only */}
        {result.theFix && (
          isPaid ? (
            <div style={{...styles.card, marginBottom:"24px", background:`${c.accent}08`, border:`1px solid ${c.accent}35`}}>
              <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                The Fix — Done For You
              </div>
              <div style={{fontSize:"14px", lineHeight:1.7, color:c.text, whiteSpace:"pre-wrap"}}>{result.theFix}</div>
            </div>
          ) : (
            <div style={{...styles.card, marginBottom:"24px", position:"relative", overflow:"hidden"}}>
              <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                The Fix — Done For You
              </div>
              <div style={{fontSize:"14px", lineHeight:1.7, color:c.text2, filter:"blur(4px)", userSelect:"none"}}>{result.theFix}</div>
              <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background: dark ? "rgba(17,17,17,0.75)" : "rgba(255,255,255,0.8)", padding:"20px", textAlign:"center"}}>
                <div style={{display:"flex", alignItems:"center", gap:"6px", fontSize:"13px", fontWeight:700, color:c.text, marginBottom:"8px"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Unlock the actual rewrite
                </div>
                <div style={{fontSize:"12px", color:c.text2, marginBottom:"14px"}}>We already wrote the exact fix — upgrade to see it</div>
                <button style={{...styles.btn, padding:"10px 24px", fontSize:"13px", display:"flex", alignItems:"center", gap:"7px"}} onClick={() => setShowPaywall(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Upgrade to Unlock
                </button>
              </div>
            </div>
          )
        )}

        {/* FREE PLAN: roasts remaining bar */}
        {!isPaid && (
          <div style={{marginBottom:"20px"}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px", color:c.text2, marginBottom:"6px"}}>
              <span>{ROAST_WEEKLY_LIMIT - roastsUsed} of {ROAST_WEEKLY_LIMIT} roasts left this week</span>
              <button onClick={() => setShowPaywall(true)} style={{background:"none", border:"none", color:c.accent, fontSize:"12px", fontWeight:700, cursor:"pointer", padding:0}}>Upgrade</button>
            </div>
            <div style={{height:"3px", background:c.bg3, borderRadius:"2px", overflow:"hidden"}}>
              <div style={{height:"100%", width:`${((ROAST_WEEKLY_LIMIT - roastsUsed) / ROAST_WEEKLY_LIMIT) * 100}%`, background:"#FF4500", borderRadius:"2px", transition:"width 0.5s"}}/>
            </div>
          </div>
        )}

        {/* Action buttons — 3 max, clear hierarchy */}
        <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"32px"}}>
          {/* Hall of Fame — Brutal only, above share */}
          {plan === "brutal" && (
            <button onClick={() => setScreen("halloffame-hub")}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",padding:"13px",borderRadius:"12px",background:`${c.accent}15`,border:`1px solid ${c.accent}40`,color:c.accent,fontWeight:700,fontSize:"14px",cursor:"pointer",marginBottom:"4px"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h2.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 5H4.5a2.5 2.5 0 0 0 0 5H7"/></svg>
              Add to Hall of Fame
            </button>
          )}

          {/* PRIMARY: Share */}
          <button style={{...styles.btn, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontSize:"16px", padding:"17px"}} onClick={shareRoast}>
            {shareMsg ? <span style={{fontWeight:700}}>{shareMsg}</span> : (<>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share My Roast
            </>)}
          </button>

          {/* SECONDARY: Roast Again — full width */}
          <button style={{...styles.btnOutline, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"15px"}} onClick={() => { setText(""); setResult(null); setImageData(null); setScreen("app"); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            Roast Again
          </button>

          {/* Challenge button — full width, distinct style — REMOVED: merged above */}
          <button style={{width:"100%", padding:"14px", borderRadius:"14px", border:"none", cursor:"pointer", fontSize:"14px", fontWeight:700, color:"#fff", background:"linear-gradient(135deg, #FF4500, #B91C1C)", boxShadow:"0 4px 16px rgba(255,69,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px"}} onClick={async () => {
            const baseUrl = window.location.href.split('?')[0];
            let link;
            if (user && result?.supabaseRoastId) {
              try {
                const res = await apiCall("/api/challenges/create", {
                  method: "POST",
                  body: JSON.stringify({ roastId: result.supabaseRoastId, score: result?.score, oneliner: result?.oneliner, mode: result?.mode, inputType }),
                });
                const data = await res.json();
                if (data.challengeId) link = `${baseUrl}?challenge=${data.challengeId}`;
              } catch(e) {}
            }
            if (!link) {
              const battleData = encodeURIComponent(JSON.stringify({ score: result?.score, oneliner: result?.oneliner, mode: result?.mode, inputType }));
              link = `${baseUrl}?battle=${battleData}`;
            }

            // Generate battle invite card
            const canvas = document.createElement("canvas");
            canvas.width = 1080;
            canvas.height = 1080;
            const ctx = canvas.getContext("2d");

            // Background — deep black
            ctx.fillStyle = "#0A0A0A";
            ctx.fillRect(0, 0, 1080, 1080);

            // Red-orange gradient overlay at top
            const bgGrad = ctx.createLinearGradient(0, 0, 1080, 400);
            bgGrad.addColorStop(0, "rgba(185,28,28,0.35)");
            bgGrad.addColorStop(0.5, "rgba(255,69,0,0.18)");
            bgGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1080, 1080);

            // Diagonal accent line
            ctx.save();
            ctx.strokeStyle = "rgba(255,69,0,0.15)";
            ctx.lineWidth = 2;
            for (let i = -5; i < 15; i++) {
              ctx.beginPath();
              ctx.moveTo(i * 120 - 200, 0);
              ctx.lineTo(i * 120 + 400, 1080);
              ctx.stroke();
            }
            ctx.restore();

            // Top label
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "bold 28px Arial, sans-serif";
            ctx.letterSpacing = "4px";
            ctx.fillText("ROASTME AI  ·  BATTLE CHALLENGE", 540, 80);

            // Main headline
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "900 96px Arial Black, Arial, sans-serif";
            ctx.fillText("Think you can", 540, 210);

            // "beat this?" in red gradient
            const headGrad = ctx.createLinearGradient(200, 220, 880, 330);
            headGrad.addColorStop(0, "#FF4500");
            headGrad.addColorStop(1, "#B91C1C");
            ctx.fillStyle = headGrad;
            ctx.font = "900 110px Arial Black, Arial, sans-serif";
            ctx.fillText("beat this?", 540, 330);

            // Score display — big circle
            const cx = 540, cy = 590, cr = 170;
            const sc = result?.score ?? 0;
            const scoreCol = sc <= 3 ? "#FF4500" : sc <= 6 ? "#FFB300" : "#22C55E";

            // Circle glow
            ctx.save();
            ctx.shadowColor = scoreCol;
            ctx.shadowBlur = 60;
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.strokeStyle = scoreCol;
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.restore();

            // Circle crisp
            ctx.beginPath();
            ctx.arc(cx, cy, cr, 0, Math.PI * 2);
            ctx.strokeStyle = scoreCol;
            ctx.lineWidth = 5;
            ctx.stroke();

            // Score number
            const scoreStr = String(sc);
            ctx.font = "900 150px Arial Black, Arial, sans-serif";
            const snW = ctx.measureText(scoreStr).width;
            ctx.font = "bold 60px Arial, sans-serif";
            const s10W = ctx.measureText("/10").width;
            const totalW = snW + 10 + s10W;
            const bx = cx - totalW / 2;

            ctx.textAlign = "left";
            ctx.fillStyle = scoreCol;
            ctx.font = "900 150px Arial Black, Arial, sans-serif";
            ctx.fillText(scoreStr, bx, cy + 50);
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.font = "bold 60px Arial, sans-serif";
            ctx.fillText("/10", bx + snW + 10, cy + 40);
            ctx.textAlign = "center";

            // Mode pill
            const modeText = (result?.mode || "Savage").toUpperCase() + " MODE";
            ctx.font = "bold 24px Arial, sans-serif";
            const mW = ctx.measureText(modeText).width + 48;
            const mH = 46;
            const mX = cx - mW / 2;
            const mY = cy + cr + 20;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(mX, mY, mW, mH, mH/2) : (()=>{
              ctx.moveTo(mX + mH/2, mY);
              ctx.arcTo(mX+mW, mY, mX+mW, mY+mH, mH/2);
              ctx.arcTo(mX+mW, mY+mH, mX, mY+mH, mH/2);
              ctx.arcTo(mX, mY+mH, mX, mY, mH/2);
              ctx.arcTo(mX, mY, mX+mW, mY, mH/2);
              ctx.closePath();
            })();
            ctx.strokeStyle = "rgba(255,69,0,0.7)";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "#FF4500";
            ctx.font = "bold 24px Arial, sans-serif";
            ctx.fillText(modeText, cx, mY + 30);
            ctx.restore();

            // CTA bar at bottom
            const barY = 930;
            const barGrad = ctx.createLinearGradient(0, barY, 1080, barY);
            barGrad.addColorStop(0, "#B91C1C");
            barGrad.addColorStop(1, "#FF4500");
            ctx.fillStyle = barGrad;
            ctx.fillRect(0, barY, 1080, 150);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "900 38px Arial Black, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Accept the challenge →", 540, 990);
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.font = "bold 26px Arial, sans-serif";
            ctx.fillText("roastme-ai26.vercel.app", 540, 1040);

            // Share the card
            canvas.toBlob(async (blob) => {
              const file = new File([blob], "roastme-battle-challenge.png", { type: "image/png" });
              const shareText = `🔥 I scored ${result?.score}/10 on RoastMe AI in ${result?.mode} mode.\n\nThink you can beat me? Accept the challenge 👇\n${link}`;

              try {
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    files: [file],
                    title: "Can you beat my RoastMe score? 🔥",
                    text: shareText
                  });
                } else if (navigator.share) {
                  await navigator.share({
                    title: "Can you beat my RoastMe score? 🔥",
                    text: shareText,
                    url: link
                  });
                } else {
                  await navigator.clipboard.writeText(shareText);
                  setShareMsg("Challenge link copied!");
                  setTimeout(() => setShareMsg(""), 3000);
                }
              } catch(e) {
                if (e?.name !== "AbortError") {
                  await navigator.clipboard.writeText(link);
                  setShareMsg("Challenge link copied!");
                  setTimeout(() => setShareMsg(""), 3000);
                }
                // AbortError = user cancelled share sheet, do nothing
              }
            }, "image/png");
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
              <path d="M13 19l6-6"/>
              <path d="M16 16l4 4"/>
              <path d="M19 21l2-2"/>
              <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/>
              <path d="M5 14l4 4"/>
              <path d="M7 17l-3 3"/>
              <path d="M3 19l2 2"/>
            </svg>
            Challenge a Friend to Beat This
          </button>
        </div>

      </div>

      {showPaywall && <Paywall c={c} onClose={() => { setShowPaywall(false); setPaywallPreselect(null); setUpgradeError(""); }} onUpgrade={handleUpgrade} dark={dark} currentPlan={plan} preselect={paywallPreselect} upgradeError={upgradeError}/>}
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
  );

  // PROFILE — Evolution Profile
  if (screen === "profile") {
    const sc = (s) => s <= 3 ? "#FF4500" : s <= 6 ? "#FFB300" : "#22C55E";

    // Compute stats
    const allScores  = history.map(h => h.score || 0).filter(s => s > 0);
    const avgScore   = allScores.length > 0
      ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length*10)/10 : null;
    const bestScore  = allScores.length > 0 ? Math.max(...allScores) : null;

    // Communication Score (overall)
    const weighted   = allScores.map((s,i) => s*(1+(allScores.length-1-i)*0.05));
    const commScore  = allScores.length >= 3
      ? Math.min(10, Math.round(weighted.reduce((a,b)=>a+b,0)/weighted.length*10)/10) : null;

    // Battle rank
    const wins = battleHistory.filter(b=>b.result==="win").length;
    const RANKS = [
      {name:"Bronze I",min:0,next:3},{name:"Bronze II",min:3,next:7},
      {name:"Silver I",min:7,next:12},{name:"Silver II",min:12,next:18},
      {name:"Gold I",min:18,next:25},{name:"Gold II",min:25,next:33},
      {name:"Platinum",min:33,next:42},{name:"Diamond",min:42,next:null},
    ];
    const rank = [...RANKS].reverse().find(r=>wins>=r.min)||RANKS[0];
    const rankColor = rank.name.startsWith("Diamond")?"#818CF8"
      :rank.name.startsWith("Platinum")?"#22D3EE"
      :rank.name.startsWith("Gold")?"#FFB300"
      :rank.name.startsWith("Silver")?"#A0AEC0":"#CD7F32";

    // Battle streak
    let streak=0;
    for(let i=0;i<battleHistory.length;i++){if(battleHistory[i].result==="win")streak++;else break;}





    const saveProfileField = async (field, value) => {
      const data = getStoredData() || {};
      saveData({...data, [field.replace('_','')]: value});
      if (user) {
        try { await supabase.from("profiles").update({[field]: value}).eq("id", user.id); } catch {}
      }
    };



    return (
    <div style={{...styles.app, paddingBottom:"80px"}}>
      <div style={{maxWidth:"480px", margin:"0 auto"}}>

        {/* ── HERO ─────────────────────────────────────── */}
        <div style={{padding:"28px 20px 24px", borderBottom:`1px solid ${c.border}`}}>

          {/* Avatar row */}
          <div style={{display:"flex", alignItems:"flex-start", gap:"16px", marginBottom:"20px"}}>

            {/* Avatar with colour picker */}
            <div style={{position:"relative", flexShrink:0}}>
              <div style={{width:"76px", height:"76px", borderRadius:"50%",
                background:`${c.accent}22`, border:`2.5px solid ${c.accent}60`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"30px", fontWeight:900, color:c.accent, userSelect:"none"}}>
                {user ? (displayName?.[0]||user.email?.[0]||"?").toUpperCase() : "?"}
              </div>
              {isPaid && (
                <div style={{position:"absolute", bottom:"-2px", right:"-2px",
                  background: plan==="brutal"?"#FF4500":"#FFB300",
                  borderRadius:"8px", padding:"2px 6px", fontSize:"8px", fontWeight:900,
                  color:"#fff", border:`2px solid ${dark?"#0A0A0A":"#FAFAFA"}`}}>
                  {plan==="brutal"?"BRUTAL":"FIRED UP"}
                </div>
              )}
            </div>

            {/* Name + username + member since */}
            <div style={{flex:1, minWidth:0}}>
              {user ? (
                <>
                  {/* Display name */}
                  {editingName ? (
                    <div style={{display:"flex", gap:"6px", marginBottom:"4px"}}>
                      <input value={nameInput} onChange={e=>setNameInput(e.target.value)}
                        onKeyDown={async e=>{
                          if(e.key==="Enter"){if(nameInput.trim()){setDisplayName(nameInput.trim());await supabase.from("profiles").update({display_name:nameInput.trim()}).eq("id",user.id);}setEditingName(false);}
                          if(e.key==="Escape")setEditingName(false);
                        }} autoFocus placeholder="Your name"
                        style={{flex:1,padding:"6px 10px",borderRadius:"8px",border:`1.5px solid ${c.accent}`,background:c.bg3,color:c.text,fontSize:"16px",fontWeight:700,outline:"none",fontFamily:"inherit"}}/>
                      <button onClick={async()=>{if(nameInput.trim()){setDisplayName(nameInput.trim());await supabase.from("profiles").update({display_name:nameInput.trim()}).eq("id",user.id);}setEditingName(false);}}
                        style={{padding:"6px 12px",borderRadius:"8px",background:c.accent,color:"#fff",border:"none",fontWeight:700,fontSize:"13px",cursor:"pointer"}}>Save</button>
                    </div>
                  ) : (
                    <div style={{display:"flex", alignItems:"center", gap:"6px", marginBottom:"3px"}}>
                      <div style={{fontSize:"20px", fontWeight:800, color:c.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {displayName || user.email?.split("@")[0] || "User"}
                      </div>
                      <button onClick={()=>{setNameInput(displayName||user.email?.split("@")[0]||"");setEditingName(true);}}
                        style={{background:"none",border:"none",cursor:"pointer",padding:"2px",color:c.text2,flexShrink:0}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  )}

                  {/* Username */}
                  {editingUsername ? (
                    <div style={{display:"flex", gap:"6px", marginBottom:"4px"}}>
                      <div style={{display:"flex", alignItems:"center", flex:1, background:c.bg3, borderRadius:"8px", border:`1.5px solid ${c.accent}`, padding:"0 10px"}}>
                        <span style={{color:c.text2, fontSize:"14px"}}>@</span>
                        <input value={usernameInput} onChange={e=>setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))}
                          onKeyDown={async e=>{
                            if(e.key==="Enter"){if(usernameInput.trim()){setUsername(usernameInput.trim());await saveProfileField("username",usernameInput.trim());}setEditingUsername(false);}
                            if(e.key==="Escape")setEditingUsername(false);
                          }} autoFocus placeholder="username"
                          style={{flex:1,background:"none",border:"none",color:c.text,fontSize:"14px",fontWeight:600,outline:"none",fontFamily:"inherit",padding:"6px 4px"}}/>
                      </div>
                      <button onClick={async()=>{if(usernameInput.trim()){setUsername(usernameInput.trim());await saveProfileField("username",usernameInput.trim());}setEditingUsername(false);}}
                        style={{padding:"6px 12px",borderRadius:"8px",background:c.accent,color:"#fff",border:"none",fontWeight:700,fontSize:"13px",cursor:"pointer"}}>Save</button>
                    </div>
                  ) : (
                    <div style={{display:"flex", alignItems:"center", gap:"5px", marginBottom:"4px"}}>
                      <div style={{fontSize:"13px", color:c.text2, fontWeight:500}}>
                        {username ? `@${username}` : <span style={{color:c.accent, cursor:"pointer"}} onClick={()=>{setUsernameInput("");setEditingUsername(true);}}>+ Add username</span>}
                      </div>
                      {username && (
                        <button onClick={()=>{setUsernameInput(username);setEditingUsername(true);}}
                          style={{background:"none",border:"none",cursor:"pointer",padding:"1px",color:c.text2}}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{fontSize:"11px", color:c.text2, opacity:0.6}}>
                    Member since {user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB",{month:"long",year:"numeric"}) : "today"}
                  </div>
                </>
              ) : (
                <div>
                  <div style={{fontSize:"18px", fontWeight:800, color:c.text, marginBottom:"6px"}}>Guest</div>
                  <div style={{fontSize:"13px", color:c.text2, marginBottom:"14px"}}>Sign in to track your evolution</div>
                  <button onClick={()=>setShowLogin(true)} style={{...styles.btn, padding:"10px 20px", fontSize:"14px"}}>Sign In</button>
                </div>
              )}
            </div>
          </div>


        </div>

        {/* ── PROGRESS ─────────────────────────────────── */}
        {(allScores.length > 0 || battleHistory.length > 0) && (
          <div style={{padding:"20px 20px 0"}}>
            <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Your Progress</div>

            {/* Communication Score — hero stat */}
            {commScore !== null && (
              <div style={{background:`${c.accent}10`, border:`1px solid ${c.accent}30`, borderRadius:"16px", padding:"16px 20px", marginBottom:"12px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:"11px", fontWeight:700, color:c.accent, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"4px"}}>Communication Score</div>
                  <div style={{fontSize:"48px", fontWeight:900, lineHeight:1, color:sc(commScore)}}>
                    {commScore}<span style={{fontSize:"22px", fontWeight:400, color:c.text2}}>/10</span>
                  </div>
                </div>
                {/* Arc */}
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="28" fill="none" stroke={dark?"#1E1E1E":"#E5E5E5"} strokeWidth="6"/>
                  <circle cx="36" cy="36" r="28" fill="none"
                    stroke={sc(commScore)} strokeWidth="6"
                    strokeDasharray={`${(commScore/10)*175.9} 175.9`}
                    strokeLinecap="round" transform="rotate(-90 36 36)"
                    style={{transition:"stroke-dasharray 0.8s ease"}}/>
                  <text x="36" y="41" textAnchor="middle" fontSize="12" fontWeight="800" fill={sc(commScore)}>
                    {commScore>=8?"Strong":commScore>=5?"Good":"Growing"}
                  </text>
                </svg>
              </div>
            )}

            {/* Stats grid */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"12px"}}>
              <StatCard c={c} label="Roasts" value={history.length} color={c.accent}/>
              <StatCard c={c} label="Avg Score" value={avgScore ? `${avgScore}` : null} color={avgScore ? sc(avgScore) : c.text2}/>
              <StatCard c={c} label="Best Score" value={bestScore ? `${bestScore}` : null} color={bestScore ? sc(bestScore) : c.text2}/>
            </div>

            {/* Battle stats */}
            {battleHistory.length > 0 && (
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"12px"}}>
                <StatCard c={c} label="Battle Rank" value={rank.name} color={rankColor}/>
                <StatCard c={c} label="Win Streak" value={streak >= 1 ? `${streak}` : "0"} sub={streak>=3?"On fire":null} color={streak>=3?c.accent:c.text2}/>
              </div>
            )}
          </div>
        )}



        {/* ── PLAN ─────────────────────────────────────── */}
        <div style={{padding:"20px 20px 0"}}>
          <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Plan</div>
          <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", overflow:"hidden"}}>
            {/* Current plan row */}
            <div style={{padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"15px", fontWeight:700, color:c.text}}>
                  {plan==="free"?"Free Plan":plan==="fired_up"?"Fired Up":"Brutal"}
                </div>
                <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>
                  {plan==="free" ? "5 roasts per week · Free forever" :
                   billingProfile?.cancel_at_period_end && billingProfile?.stripe_current_period_end ?
                   `Active until ${new Date(billingProfile.stripe_current_period_end).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}` :
                   plan==="fired_up" ? `$2.99/mo${billingProfile?.stripe_current_period_end ? ` · Renews ${new Date(billingProfile.stripe_current_period_end).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}` : ""}` :
                   `$5.99/mo${billingProfile?.stripe_current_period_end ? ` · Renews ${new Date(billingProfile.stripe_current_period_end).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}` : ""}`}
                </div>
              </div>
              {plan==="free"
                ? <button onClick={()=>setShowPaywall(true)} style={{background:c.accent,color:"#fff",border:"none",borderRadius:"8px",padding:"7px 14px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>Upgrade</button>
                : <button onClick={()=>setShowCancelConfirm(s=>!s)} style={{background:"none",color:c.text2,border:`1px solid ${c.border}`,borderRadius:"8px",padding:"7px 14px",fontSize:"12px",fontWeight:600,cursor:"pointer"}}>{showCancelConfirm ? "Close" : "Manage"}</button>
              }
            </div>

            {/* Manage panel — no Paywall, clean options */}
            {showCancelConfirm && plan !== "free" && (
              <div style={{borderTop:`1px solid ${c.border}`, padding:"14px 16px", display:"flex", flexDirection:"column", gap:"8px"}}>

                {/* Upgrade option — only for Fired Up */}
                {plan === "fired_up" && (
                  <div style={{background:c.bg3, borderRadius:"12px", padding:"14px", marginBottom:"4px"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px"}}>
                      <div>
                        <div style={{fontSize:"14px", fontWeight:800, color:c.text}}>Brutal — $5.99/mo</div>
                        <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>Everything you have, plus:</div>
                      </div>
                    </div>
                    {["Deep Roast — 7 Problems + 7 Fixes","All 5 Intensity Levels","Advanced Communication Insights","Hall of Fame","Brutal Badge on Share Card"].map((f,i) => (
                      <div key={i} style={{display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px"}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{fontSize:"12px", color:c.text2}}>{f}</span>
                      </div>
                    ))}
                    <button onClick={async()=>{setShowCancelConfirm(false);await handleUpgrade("brutal");}}
                      style={{width:"100%",marginTop:"12px",padding:"11px",borderRadius:"9px",background:c.accent,color:"#fff",border:"none",fontWeight:700,cursor:"pointer",fontSize:"13px"}}>
                      Upgrade to Brutal
                    </button>
                  </div>
                )}

                {/* Downgrade option — only for Brutal */}
                {plan === "brutal" && (
                  <div style={{background:c.bg3, borderRadius:"12px", padding:"14px", marginBottom:"4px"}}>
                    <div style={{fontSize:"14px", fontWeight:800, color:c.text, marginBottom:"4px"}}>Downgrade to Fired Up — $2.99/mo</div>
                    <div style={{fontSize:"12px", color:c.text2, marginBottom:"10px"}}>You'll lose access to:</div>
                    {["Deep Roast (7 Problems + 7 Fixes)","All Intensity Levels","Hall of Fame","Brutal Badge on Share Card"].map((f,i) => (
                      <div key={i} style={{display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px"}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span style={{fontSize:"12px", color:c.text2}}>{f}</span>
                      </div>
                    ))}
                    <button onClick={async()=>{setShowCancelConfirm(false);await handleUpgrade("fired_up");}}
                      style={{width:"100%",marginTop:"12px",padding:"11px",borderRadius:"9px",background:"none",color:c.text,border:`1px solid ${c.border}`,fontWeight:600,cursor:"pointer",fontSize:"13px"}}>
                      Switch to Fired Up
                    </button>
                  </div>
                )}

                {/* Cancel */}
                <button onClick={()=>{handleOpenPortal();setShowCancelConfirm(false);}}
                  style={{width:"100%",padding:"11px",borderRadius:"9px",background:"none",border:"none",color:"#FF4500",fontWeight:600,cursor:"pointer",fontSize:"13px"}}>
                  Cancel subscription
                </button>
              </div>
            )}
          </div>

          {/* Downgrade notice */}
          {billingProfile?.cancel_at_period_end && billingProfile?.stripe_current_period_end && plan !== "free" && (
            <div style={{marginTop:"10px", padding:"12px 16px", background:"#FFB30015", border:"1px solid #FFB30040", borderRadius:"12px", display:"flex", alignItems:"flex-start", gap:"10px"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0, marginTop:"1px"}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <div>
                <div style={{fontSize:"13px", fontWeight:700, color:"#FFB300", marginBottom:"3px"}}>
                  Plan change scheduled
                </div>
                <div style={{fontSize:"12px", color:c.text2, lineHeight:1.5}}>
                  You have full access to <strong>{plan==="brutal"?"Brutal":"Fired Up"}</strong> until <strong>{new Date(billingProfile.stripe_current_period_end).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</strong>. After that, your plan changes to {plan==="brutal"?"Fired Up":"Free"}.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── PREFERENCES ──────────────────────────────── */}
        <div style={{padding:"20px 20px 0"}}>
          <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Preferences</div>
          <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", overflow:"hidden"}}>
            {/* Dark mode */}
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom:`1px solid ${c.border}`}}>
              <span style={{fontSize:"14px", fontWeight:600, color:c.text}}>{dark?"Dark Mode":"Light Mode"}</span>
              <button onClick={toggleDark} style={{width:"46px",height:"27px",borderRadius:"20px",border:"none",background:dark?c.accent:c.bg3,cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
                <div style={{position:"absolute",top:"2.5px",left:dark?"21px":"2.5px",width:"22px",height:"22px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
              </button>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", cursor:"pointer", borderBottom:`1px solid ${c.border}`}} onClick={()=>setScreen("help")}>
              <span style={{fontSize:"14px", fontWeight:600, color:c.text, flex:1}}>Help & FAQ</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", cursor:"pointer"}} onClick={()=>setScreen("about")}>
              <span style={{fontSize:"14px", fontWeight:600, color:c.text, flex:1}}>About & Legal</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>

        {/* ── DATA & ACCOUNT ────────────────────────────── */}
        {user && (
          <div style={{padding:"20px 20px 32px"}}>
            <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Data & Account</div>
            <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", overflow:"hidden"}}>
              <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", cursor:"pointer", borderBottom:`1px solid ${c.border}`}}
                onClick={()=>{const blob=new Blob([JSON.stringify({history,battleHistory,plan,email:user?.email,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="roastme-export.json";a.click();}}>
                <span style={{fontSize:"14px", fontWeight:600, color:c.text, flex:1}}>Export My Data</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", cursor:"pointer", borderBottom:`1px solid ${c.border}`}}
                onClick={()=>setShowLogoutConfirm(true)}>
                <span style={{fontSize:"14px", fontWeight:600, color:c.text, flex:1}}>Sign Out</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:"12px", padding:"14px 16px", cursor:"pointer"}}
                onClick={()=>setShowDeleteConfirm(true)}>
                <span style={{fontSize:"14px", fontWeight:600, color:"#FF4500", flex:1}}>Delete Account</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </div>
            </div>
          </div>
        )}

      </div>

      {showPaywall && <Paywall c={c} onClose={()=>{setShowPaywall(false);setPaywallPreselect(null);setUpgradeError("");}} onUpgrade={handleUpgrade} dark={dark} currentPlan={plan} preselect={paywallPreselect} upgradeError={upgradeError}/>}
      {showLogin && <LoginModal c={c} dark={dark} onClose={()=>setShowLogin(false)} loginEmail={loginEmail} setLoginEmail={setLoginEmail}/>}

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:"0 0 20px"}}>
          <div style={{background:c.bg2,borderRadius:"20px 20px 0 0",padding:"28px 24px",width:"100%",maxWidth:"480px",border:`1px solid ${c.border}`}}>
            <div style={{textAlign:"center",marginBottom:"20px"}}>
              <div style={{fontSize:"18px",fontWeight:800,color:c.text,marginBottom:"8px"}}>Sign Out?</div>
              <div style={{fontSize:"14px",color:c.text2,lineHeight:1.5}}>Your progress is saved. Sign back in any time.</div>
            </div>
            <button onClick={()=>{setShowLogoutConfirm(false);handleSignOut();}} style={{width:"100%",padding:"16px",borderRadius:"12px",border:"none",background:"#FF4500",color:"#fff",fontWeight:700,fontSize:"16px",cursor:"pointer",marginBottom:"10px"}}>Yes, Sign Out</button>
            <button onClick={()=>setShowLogoutConfirm(false)} style={{width:"100%",padding:"16px",borderRadius:"12px",border:`1px solid ${c.border}`,background:"none",color:c.text,fontWeight:600,fontSize:"15px",cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,padding:"0 0 20px"}}>
          <div style={{background:c.bg2,borderRadius:"20px 20px 0 0",padding:"28px 24px",width:"100%",maxWidth:"480px",border:`1px solid #FF450040`}}>
            <div style={{textAlign:"center",marginBottom:"20px"}}>
              <div style={{fontSize:"18px",fontWeight:800,color:"#FF4500",marginBottom:"8px"}}>Delete Account?</div>
              <div style={{fontSize:"14px",color:c.text2,lineHeight:1.6}}>This permanently deletes your account, roasts, and all data. Cannot be undone.</div>
            </div>
            <button onClick={async()=>{
              try {
                await apiCall("/api/account/delete", { method:"DELETE" });
              } catch(e) {}
              clearUserState();
            }} style={{width:"100%",padding:"16px",borderRadius:"12px",border:"none",background:"#FF4500",color:"#fff",fontWeight:700,fontSize:"16px",cursor:"pointer",marginBottom:"10px"}}>Delete Everything</button>
            <button onClick={()=>setShowDeleteConfirm(false)} style={{width:"100%",padding:"16px",borderRadius:"12px",border:`1px solid ${c.border}`,background:"none",color:c.text,fontWeight:600,fontSize:"15px",cursor:"pointer"}}>Keep My Account</button>
          </div>
        </div>
      )}

      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
    );
  }

      // HELP & FAQ
  if (screen === "help") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("profile")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>Help & FAQ</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"28px"}}>
          <div style={{width:"56px", height:"56px", borderRadius:"50%", background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div style={{fontSize:"24px", fontWeight:900, color:c.text}}>Frequently Asked Questions</div>
        </div>

        {[
          { q:"What is RoastMe AI?", a:"RoastMe AI uses artificial intelligence to give you brutally honest, funny, or constructive feedback on any text — your bio, captions, messages, CV, or anything else. Choose your mode and brace yourself." },
          { q:"What do the 4 modes mean?", a:"Savage: zero filter, uses your exact words against you. Honest: cold hard truth like a $500/hour consultant. Mentor: tough but caring, every problem has a solution. Comedian: stand-up roast that makes you laugh out loud." },
          { q:"What are the 5 Intensity Levels?", a:"Exclusive to Brutal plan. From Mild ('I'll be gentle... ish') all the way to Obliterate ('This is not therapy'). You choose how hard the AI goes. Warning: Obliterate is exactly what it sounds like." },
          { q:"Why do I only get 5 roasts per week on Free?", a:"The Free plan gives you 5 roasts every 7 days. Upgrade to Fired Up or Brutal for unlimited roasts, longer text, and premium features." },
          { q:"What is The Fix?", a:"The Fix is an exclusive premium feature where the AI actually rewrites your text for you — not just points out problems, but gives you the exact words to use instead. Available on Fired Up and Brutal." },
          { q:"What is Battle Mode?", a:"After any roast, you can generate a link and challenge a friend to beat your score. They submit the same type of content, get roasted, and you compare scores side by side. Battle History tracks your record on Fired Up and Brutal." },
          { q:"What is Hall of Fame?", a:"Hall of Fame lets you turn your best (or worst) roast into a permanent shareable link. Whoever opens it sees your score and one-liner. Exclusive to Brutal plan." },
          { q:"What is the Brutal badge on the share card?", a:"Brutal plan users get an exclusive badge on their share card so everyone knows they went all the way. A mark of distinction. Or suffering. Both." },
          { q:"Does my history save between sessions?", a:"Yes — your roast history, battle history, and plan are saved locally on your device. Sign in with Google to sync across all your devices." },
          { q:"How do I cancel my plan?", a:"Go to Account → My Plan → Cancel Plan. You can downgrade to Fired Up or cancel completely. Your plan stays active until the next billing date." },
        ].map((faq, i) => (
          <div key={i} style={{...styles.card, marginBottom:"10px"}}>
            <div style={{fontSize:"14px", fontWeight:700, color:c.text, marginBottom:"8px"}}>{faq.q}</div>
            <div style={{fontSize:"13px", color:c.text2, lineHeight:1.6}}>{faq.a}</div>
          </div>
        ))}

        <div style={{...styles.card, marginTop:"8px", textAlign:"center"}}>
          <div style={{fontSize:"14px", fontWeight:700, color:c.text, marginBottom:"6px"}}>Still have questions?</div>
          <div style={{fontSize:"13px", color:c.text2}}>Contact us at <span style={{color:c.accent}}>support@roastmeai.com</span></div>
        </div>
      </div>
    </div>
  );

  // PRIVACY POLICY
  if (screen === "privacy") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("about")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>Privacy Policy</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark?(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>):(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px 20px 100px"}}>
        <div style={{fontSize:"12px", color:c.text2, marginBottom:"24px"}}>Last updated: June 2026</div>
        {[
          { title:"Who We Are", body:"RoastMe AI is operated as an independent product. We are a software-as-a-service product that provides AI-generated feedback on user-submitted text. Contact: support@roastmeai.com" },
          { title:"What We Collect", body:"When you use RoastMe AI, we collect: your email address (if you sign in), your Google account name and profile picture (if you sign in with Google), the text you submit for roasting, your roast results and history, your subscription and billing information (processed by Stripe — we never see your card number)." },
          { title:"What We Do Not Collect", body:"We do not collect your location, contacts, device identifiers, browsing history, or any data beyond what is necessary to provide the service. We do not sell your data to third parties. Ever." },
          { title:"How We Use Your Data", body:"We use your data exclusively to: provide and improve the RoastMe AI service, synchronise your roast history across your devices, process payments via Stripe, and send service-related emails (account confirmations, billing receipts)." },
          { title:"Data Storage", body:"Your data is stored securely on Supabase (PostgreSQL database hosted in the EU). Payment data is handled entirely by Stripe and is never stored on our servers. We use industry-standard encryption for all data in transit and at rest." },
          { title:"Your Rights (GDPR)", body:"If you are in the EU/EEA, you have the right to: access your data, correct inaccurate data, delete your account and all associated data (available in Account settings), export your data (available in Account settings), withdraw consent at any time." },
          { title:"Cookies", body:"We use only functional cookies necessary for authentication and session management. We do not use advertising or tracking cookies. We do not use any third-party analytics services." },
          { title:"Data Retention", body:"We retain your data for as long as your account is active. When you delete your account, all your personal data is permanently deleted within 30 days. Aggregated, anonymised usage statistics may be retained indefinitely." },
          { title:"Third-Party Services", body:"We use: Supabase for database and authentication, Stripe for payment processing, Groq for AI inference (text you submit is processed by Groq's API — see groq.com/privacy), Vercel for hosting." },
          { title:"Contact", body:"For any privacy-related questions or requests, contact us at: support@roastmeai.com. We will respond within 5 business days." },
        ].map((section, i) => (
          <div key={i} style={{marginBottom:"24px"}}>
            <div style={{fontSize:"15px", fontWeight:800, color:c.text, marginBottom:"8px"}}>{section.title}</div>
            <div style={{fontSize:"14px", color:c.text2, lineHeight:1.7}}>{section.body}</div>
          </div>
        ))}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
  );

  // TERMS OF SERVICE
  if (screen === "terms") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("about")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>Terms of Service</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark?(<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>):(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px 20px 100px"}}>
        <div style={{fontSize:"12px", color:c.text2, marginBottom:"24px"}}>Last updated: June 2026</div>
        {[
          { title:"Acceptance", body:"By using RoastMe AI, you agree to these Terms of Service. If you do not agree, please do not use the service. These terms apply to all users, including free and paid accounts." },
          { title:"The Service", body:"RoastMe AI provides AI-generated feedback on text submitted by users. The feedback is generated by large language models and is intended to be entertaining and educational. It does not constitute professional advice of any kind." },
          { title:"User Accounts", body:"You are responsible for maintaining the security of your account. You must provide accurate information when creating an account. You may not use another person's account or share your account credentials." },
          { title:"Acceptable Use", body:"You agree not to: submit content that is illegal, defamatory, or that infringes intellectual property rights; submit personal information of others without their consent; attempt to reverse-engineer, scrape, or abuse the service; use the service to generate content intended to harm others." },
          { title:"Content You Submit", body:"You retain ownership of any text you submit. By submitting text, you grant RoastMe AI a limited license to process it through our AI system to generate feedback. We do not use your content to train AI models. We do not share your content with third parties except as necessary to operate the service (e.g., processing by Groq's API)." },
          { title:"Subscriptions and Billing", body:"Paid subscriptions (Fired Up and Brutal) are billed monthly. You may cancel at any time through the Billing Portal in your account. Cancellation takes effect at the end of the current billing period. We do not offer refunds for partial periods." },
          { title:"Disclaimer", body:"RoastMe AI is provided as-is. We make no warranties about the accuracy, completeness, or suitability of the AI-generated feedback. The service is for entertainment and educational purposes. We are not liable for any decisions made based on feedback from our service." },
          { title:"Changes to Terms", body:"We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of significant changes by email." },
          { title:"Contact", body:"For questions about these terms, contact: support@roastmeai.com" },
        ].map((section, i) => (
          <div key={i} style={{marginBottom:"24px"}}>
            <div style={{fontSize:"15px", fontWeight:800, color:c.text, marginBottom:"8px"}}>{section.title}</div>
            <div style={{fontSize:"14px", color:c.text2, lineHeight:1.7}}>{section.body}</div>
          </div>
        ))}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
  );

  // ABOUT
  if (screen === "about") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("profile")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>About</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"32px"}}>
          <div style={{width:"72px", height:"86px", margin:"0 auto 16px"}}>
            <FIRE_ICON/>
          </div>
          <div style={{fontSize:"28px", fontWeight:900, color:c.text, letterSpacing:"-1px"}}>RoastMe AI</div>
          <div style={{fontSize:"13px", color:c.text2, marginTop:"6px"}}>Version 1.0 · {new Date().getFullYear()}</div>
        </div>

        <div style={{...styles.card, marginBottom:"12px"}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"10px", textTransform:"uppercase", letterSpacing:"1px"}}>Our Mission</div>
          <div style={{fontSize:"14px", color:c.text, lineHeight:1.7}}>RoastMe AI exists to tell you the truth — brutally, honestly, and actually usefully. No flattery. No AI positivity bias. Just real feedback that helps you improve.</div>
        </div>

        <div style={{...styles.card, marginBottom:"12px", padding:"8px"}}>
          {[
            { label:"Contact / Support", value:"support@roastmeai.com", href:"mailto:support@roastmeai.com" },
            { label:"App URL", value:"roastme-ai26.vercel.app", href:"https://roastme-ai26.vercel.app" },
            { label:"Privacy Policy", value:"View Policy", href:null, screen:"privacy" },
            { label:"Terms of Service", value:"View Terms", href:null, screen:"terms" },
          ].map((link, i, arr) => (
            <div key={i} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 8px", borderBottom: i < arr.length-1 ? `1px solid ${c.border}` : "none"}}>
              <span style={{fontSize:"14px", color:c.text, fontWeight:600}}>{link.label}</span>
              {link.href ? (
                <a href={link.href} target="_blank" rel="noreferrer" style={{fontSize:"13px", color:c.accent, textDecoration:"none"}}>{link.value}</a>
              ) : link.screen ? (
                <span onClick={() => setScreen(link.screen)} style={{fontSize:"13px", color:c.accent, cursor:"pointer", display:"flex", alignItems:"center", gap:"4px"}}>{link.value} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
              ) : (
                <span style={{fontSize:"13px", color:c.text2}}>{link.value}</span>
              )}
            </div>
          ))}
        </div>

        <div style={{textAlign:"center", fontSize:"12px", color:c.text2, marginTop:"20px"}}>
          Made with love by RoastMe AI<br/>
          <span style={{marginTop:"4px", display:"block"}}>© 2026 RoastMe AI. All rights reserved.</span>
        </div>
      </div>
    </div>
  );

  // BATTLE HISTORY
  if (screen === "battle-history") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("profile")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>Battle History</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"24px"}}>
          <div style={{width:"56px", height:"56px", borderRadius:"50%", background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4"/><path d="M7 17l-3 3"/><path d="M3 19l2 2"/>
            </svg>
          </div>
          <div style={{fontSize:"24px", fontWeight:900, color:c.text}}>Your Battle Record</div>

          {/* Win/Loss Summary */}
          {battleHistory.length > 0 && (
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginTop:"16px"}}>
              {[
                { value: battleHistory.filter(b => b.result === "win").length, label:"Wins", color:"#22C55E" },
                { value: battleHistory.filter(b => b.result === "loss").length, label:"Losses", color:"#FF4500" },
                { value: battleHistory.filter(b => b.result === "tie").length, label:"Ties", color:"#FFB300" },
              ].map((s,i) => (
                <div key={i} style={{textAlign:"center", padding:"14px 8px", background:c.bg2, borderRadius:"12px", border:`1px solid ${c.border}`}}>
                  <div style={{fontSize:"28px", fontWeight:900, color:s.color}}>{s.value}</div>
                  <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {battleHistory.length === 0 ? (
          <div style={{textAlign:"center", padding:"40px 20px", color:c.text2}}>
            <div style={{width:"68px", height:"68px", borderRadius:"50%", background:`${c.accent}15`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4"/><path d="M7 17l-3 3"/><path d="M3 19l2 2"/>
              </svg>
            </div>
            <div style={{fontWeight:700, color:c.text, marginBottom:"8px"}}>No battles yet</div>
            <div style={{fontSize:"14px", marginBottom:"24px"}}>Challenge a friend after your next roast</div>
            <button style={{...styles.btn, padding:"14px 28px", fontSize:"15px", display:"flex", alignItems:"center", gap:"8px", margin:"0 auto"}} onClick={() => setScreen("app")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              Get Roasted Now
            </button>
          </div>
        ) : battleHistory.map((b,i) => (
          <div key={i} style={{...styles.card, marginBottom:"12px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
              <span style={{fontSize:"12px", fontWeight:700, color: b.result === "win" ? "#22C55E" : b.result === "loss" ? "#FF4500" : "#FFB300", textTransform:"uppercase", letterSpacing:"1px"}}>
                {b.result === "win" ? "Victory" : b.result === "loss" ? "Defeat" : "Tie"}
              </span>
              <span style={{fontSize:"11px", color:c.text2}}>{b.date}</span>
            </div>
            <div style={{display:"flex", gap:"10px"}}>
              <div style={{flex:1, textAlign:"center", padding:"12px", background:c.bg3, borderRadius:"10px"}}>
                <div style={{fontSize:"11px", color:c.text2, marginBottom:"4px"}}>You</div>
                <div style={{fontSize:"28px", fontWeight:900, color: b.myScore > b.opponentScore ? "#22C55E" : b.myScore < b.opponentScore ? "#FF4500" : "#FFB300"}}>{b.myScore}</div>
              </div>
              <div style={{display:"flex", alignItems:"center", fontSize:"14px", fontWeight:900, color:c.text2}}>VS</div>
              <div style={{flex:1, textAlign:"center", padding:"12px", background:c.bg3, borderRadius:"10px"}}>
                <div style={{fontSize:"11px", color:c.text2, marginBottom:"4px"}}>Friend</div>
                <div style={{fontSize:"28px", fontWeight:900, color: b.opponentScore > b.myScore ? "#22C55E" : b.opponentScore < b.myScore ? "#FF4500" : "#FFB300"}}>{b.opponentScore}</div>
              </div>
            </div>
            {b.myOneliner && (
              <div style={{marginTop:"10px", fontSize:"12px", color:c.text2, fontStyle:"italic"}}>"{b.myOneliner}"</div>
            )}
          </div>
        ))}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
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
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"24px"}}>
          <div style={{fontSize:"13px", color:c.accent, fontWeight:700, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px"}}>Hall of Fame</div>
          <div style={{fontSize:"14px", color:c.text2}}>{result?.score >= 7 ? "Someone scored big." : "Someone got roasted. Badly."}</div>
        </div>
        <div style={{...styles.card, textAlign:"center", marginBottom:"16px", padding:"28px 20px"}}>
          <div style={{fontSize:"13px", color:c.text2, fontWeight:700, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"1px"}}>{result.mode} Mode 🔥</div>
          <div style={{fontSize:"72px", fontWeight:900, color:scoreColor(result.score), lineHeight:1}}>{result.score}<span style={{fontSize:"32px", color:c.text2}}>/10</span></div>
          <div style={{marginTop:"16px", fontSize:"15px", color:c.text2, fontStyle:"italic", lineHeight:1.5}}>"{result.verdict}"</div>
        </div>
        <div style={{...styles.card, marginBottom:"16px", background:`${c.accent}12`, border:`1px solid ${c.accent}40`}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px"}}>The One-Liner</div>
          <div style={{fontSize:"17px", fontWeight:700, lineHeight:1.4, color:c.text}}>"{result.oneliner}"</div>
        </div>
        <button style={{...styles.btn, width:"100%", marginBottom:"10px"}} onClick={() => { setScreen("landing"); setResult(null); window.history.replaceState({}, '', window.location.pathname); setResult(null); }}>
          Get My Own Roast
        </button>
      </div>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
  );

  // HALL OF FAME HUB — intro screen reached from Account quick links
  if (screen === "halloffame-hub") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("profile")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>Hall of Fame</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", margin:"20px 0 32px"}}>
          <div style={{width:"68px", height:"68px", borderRadius:"50%", background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h2.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 5H4.5a2.5 2.5 0 0 0 0 5H7"/></svg></div>
          <div style={{fontSize:"36px", fontWeight:900, color:c.text, letterSpacing:"-1px", lineHeight:1.1}}>Wear Your<br/>Roast With Pride.</div>
          <div style={{fontSize:"14px", color:c.text2, marginTop:"10px", lineHeight:1.5}}>Turn your score into a link. Send it anywhere — it shows your result exactly as you got it.</div>
          {plan !== "brutal" && (
            <div style={{display:"inline-block", marginTop:"12px", fontSize:"11px", fontWeight:700, color:"#FFB300", border:"1px solid #FFB30050", borderRadius:"8px", padding:"4px 10px"}}>🔒 Brutal Plan Only</div>
          )}
        </div>

        <div style={{...styles.card, marginBottom:"16px"}}>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start", marginBottom:"16px"}}>
            <span style={{fontSize:"15px", fontWeight:900, color:"#FF4500", background:"#FF450022", width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>1</span>
            <div>
              <div style={{fontWeight:700, fontSize:"14px", color:c.text}}>Get roasted</div>
              <div style={{fontSize:"13px", color:c.text2}}>Pick a mode, paste your text, see your score</div>
            </div>
          </div>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start", marginBottom:"16px"}}>
            <span style={{fontSize:"15px", fontWeight:900, color:"#FF4500", background:"#FF450022", width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>2</span>
            <div>
              <div style={{fontWeight:700, fontSize:"14px", color:c.text}}>Copy your Hall of Fame link</div>
              <div style={{fontSize:"13px", color:c.text2}}>One tap, right after your result</div>
            </div>
          </div>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start"}}>
            <span style={{fontSize:"15px", fontWeight:900, color:"#FF4500", background:"#FF450022", width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>3</span>
            <div>
              <div style={{fontWeight:700, fontSize:"14px", color:c.text}}>Send it anywhere</div>
              <div style={{fontSize:"13px", color:c.text2}}>Whoever opens it sees your score and one-liner instantly</div>
            </div>
          </div>
        </div>

        <button style={{...styles.btn, width:"100%", fontSize:"17px", padding:"18px"}} onClick={() => plan === "brutal" ? setScreen("app") : setShowPaywall(true)}>
          {plan === "brutal" ? "Get Roasted Now" : "Unlock with Brutal"}
        </button>
      </div>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
      {showPaywall && <Paywall c={c} onClose={() => { setShowPaywall(false); setPaywallPreselect(null); setUpgradeError(""); }} onUpgrade={handleUpgrade} dark={dark} currentPlan={plan} preselect={paywallPreselect} upgradeError={upgradeError}/>}
    </div>
  );

  // BATTLE HUB — intro screen reached from Account quick links
  if (screen === "battle-hub") return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          <button style={{...styles.btnOutline, padding:"8px 12px"}} onClick={() => setScreen("profile")}><span style={{display:"flex", alignItems:"center", gap:"4px"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>Back</span></button>
          <span style={{fontWeight:800, fontSize:"18px"}}>Battle Mode</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        {/* B1.5.6 — Battle Rank */}
        {(() => {
          const wins = battleHistory.filter(b => b.result === "win").length;
          const RANKS = [
            { name:"Bronze I",   min:0,  next:3  },
            { name:"Bronze II",  min:3,  next:7  },
            { name:"Silver I",   min:7,  next:12 },
            { name:"Silver II",  min:12, next:18 },
            { name:"Gold I",     min:18, next:25 },
            { name:"Gold II",    min:25, next:33 },
            { name:"Platinum",   min:33, next:42 },
            { name:"Diamond",    min:42, next:null },
          ];
          const rank = [...RANKS].reverse().find(r => wins >= r.min) || RANKS[0];
          const toNext = rank.next !== null ? rank.next - wins : null;
          const pct = rank.next !== null
            ? Math.round(((wins - rank.min) / (rank.next - rank.min)) * 100)
            : 100;
          const rankColor = rank.name.startsWith("Diamond") ? "#818CF8"
            : rank.name.startsWith("Platinum") ? "#22D3EE"
            : rank.name.startsWith("Gold") ? "#FFB300"
            : rank.name.startsWith("Silver") ? "#A0AEC0"
            : "#CD7F32";

          // Record + streak (absorbed from B1.2)
          let streak = 0;
          for (let i = 0; i < battleHistory.length; i++) {
            if (battleHistory[i].result === "win") streak++; else break;
          }
          const losses = battleHistory.filter(b=>b.result==="loss").length;
          const ties   = battleHistory.filter(b=>b.result==="tie").length;
          const winRate = battleHistory.length > 0 ? Math.round((wins/battleHistory.length)*100) : 0;

          return battleHistory.length > 0 ? (
            <div style={{background:c.bg2, border:`1px solid ${rankColor}40`, borderRadius:"18px", padding:"18px 20px", marginBottom:"20px"}}>
              <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Battle Rank</div>
              <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"14px"}}>
                <div>
                  <div style={{fontSize:"26px", fontWeight:900, color:rankColor, lineHeight:1}}>{rank.name}</div>
                  <div style={{fontSize:"12px", color:c.text2, marginTop:"4px"}}>{wins} win{wins===1?"":"s"} total</div>
                </div>
                {toNext !== null && RANKS[RANKS.indexOf(rank)+1] && (
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"11px", color:c.text2, marginBottom:"3px"}}>Next</div>
                    <div style={{fontSize:"16px", fontWeight:800, color:c.text}}>{RANKS[RANKS.indexOf(rank)+1].name}</div>
                    <div style={{fontSize:"11px", color:c.text2, marginTop:"2px"}}>{toNext} win{toNext===1?"":"s"} away</div>
                  </div>
                )}
                {toNext === null && (
                  <div style={{fontSize:"13px", fontWeight:700, color:rankColor}}>Max Rank</div>
                )}
              </div>
              <div style={{height:"5px", background:c.bg3, borderRadius:"3px", overflow:"hidden", marginBottom:"14px"}}>
                <div style={{height:"100%", width:`${pct}%`, background:rankColor, borderRadius:"3px", transition:"width 0.6s ease"}}/>
              </div>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", borderTop:`1px solid ${c.border}`, paddingTop:"12px"}}>
                <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                  <span style={{fontSize:"13px", fontWeight:700, color:"#22C55E"}}>{wins}W</span>
                  <span style={{fontSize:"13px", fontWeight:700, color:"#FF4500"}}>{losses}L</span>
                  <span style={{fontSize:"13px", fontWeight:700, color:"#FFB300"}}>{ties}T</span>
                  <span style={{fontSize:"11px", color:c.text2}}>· {winRate}%</span>
                </div>
                {streak >= 2 && <span style={{fontSize:"12px", fontWeight:700, color:c.accent}}>{streak} win streak</span>}
              </div>
            </div>
          ) : null;
        })()}

        {/* B3.4 — Battle Identity */}
        {battleHistory.length >= 3 && (() => {
          const wins   = battleHistory.filter(b=>b.result==="win").length;
          const losses = battleHistory.filter(b=>b.result==="loss").length;
          const ties   = battleHistory.filter(b=>b.result==="tie").length;
          const total  = battleHistory.length;
          const winRate = Math.round((wins/total)*100);

          // Detect comeback: lost then won consecutively
          let comingBack = false;
          if (battleHistory.length >= 4) {
            const recent4 = battleHistory.slice(0,4);
            const hadLoss = recent4.slice(2).some(b=>b.result==="loss");
            const thenWon = recent4.slice(0,2).every(b=>b.result==="win");
            comingBack = hadLoss && thenWon;
          }

          // Current streak
          let streak = 0;
          for (let i=0; i<battleHistory.length; i++) {
            if (battleHistory[i].result==="win") streak++; else break;
          }

          let identity, identitySub;
          if (comingBack) {
            identity = "Comeback Fighter";
            identitySub = "You take losses and come back stronger.";
          } else if (winRate >= 70) {
            identity = "Consistent Winner";
            identitySub = `${winRate}% win rate. Rarely beaten.`;
          } else if (streak >= 3) {
            identity = "On a Roll";
            identitySub = `${streak} wins in a row. Keep going.`;
          } else if (losses > wins && winRate < 40) {
            identity = "Challenger";
            identitySub = "Keep roasting. The rank will follow.";
          } else {
            identity = "Strategic Competitor";
            identitySub = "You pick your battles. That's a skill too.";
          }

          return (
            <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"14px 18px", marginBottom:"20px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"5px"}}>Battle Identity</div>
                <div style={{fontSize:"16px", fontWeight:800, color:c.text}}>{identity}</div>
                <div style={{fontSize:"12px", color:c.text2, marginTop:"3px"}}>{identitySub}</div>
              </div>
            </div>
          );
        })()}

        <div style={{textAlign:"center", margin:"0 0 24px"}}>
          <div style={{width:"68px", height:"68px", borderRadius:"50%", background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg></div>
          <div style={{fontSize:"36px", fontWeight:900, color:c.text, letterSpacing:"-1px", lineHeight:1.1}}>Roast Them.<br/>Beat Them.</div>
          <div style={{fontSize:"14px", color:c.text2, marginTop:"10px", lineHeight:1.5}}>Get roasted, then send the score to a friend. Whoever scores higher wins bragging rights.</div>
        </div>

        <div style={{...styles.card, marginBottom:"16px", border:"1px solid #FF450040", background:"#FF450008"}}>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start", marginBottom:"16px"}}>
            <span style={{fontSize:"15px", fontWeight:900, color:"#FF4500", background:"#FF450022", width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>1</span>
            <div>
              <div style={{fontWeight:700, fontSize:"14px", color:c.text}}>Get roasted</div>
              <div style={{fontSize:"13px", color:c.text2}}>Pick a mode, paste your text, see your score</div>
            </div>
          </div>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start", marginBottom:"16px"}}>
            <span style={{fontSize:"15px", fontWeight:900, color:"#FF4500", background:"#FF450022", width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>2</span>
            <div>
              <div style={{fontWeight:700, fontSize:"14px", color:c.text}}>Challenge a friend</div>
              <div style={{fontSize:"13px", color:c.text2}}>Send them your score with one tap</div>
            </div>
          </div>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start"}}>
            <span style={{fontSize:"15px", fontWeight:900, color:"#FF4500", background:"#FF450022", width:"26px", height:"26px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>3</span>
            <div>
              <div style={{fontWeight:700, fontSize:"14px", color:c.text}}>See who wins</div>
              <div style={{fontSize:"13px", color:c.text2}}>Head-to-head comparison, instantly</div>
            </div>
          </div>
        </div>



        <button style={{...styles.btn, width:"100%", fontSize:"17px", padding:"18px", display:"flex", alignItems:"center", justifyContent:"center", gap:"9px"}} onClick={() => setScreen("app")}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
          Start a Battle
        </button>

        {isPaid && (
          <button onClick={() => setScreen("battle-history")} style={{display:"flex", alignItems:"center", gap:"12px", width:"100%", background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left", marginTop:"12px"}}>
            <div style={{width:"44px", height:"44px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4"/><path d="M7 17l-3 3"/><path d="M3 19l2 2"/>
              </svg>
            </div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontWeight:700, fontSize:"15px", color:c.text}}>Battle History</div>
              <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>
                {battleHistory.length > 0 ? `${battleHistory.filter(b=>b.result==="win").length}W · ${battleHistory.filter(b=>b.result==="loss").length}L · ${battleHistory.filter(b=>b.result==="tie").length}T` : "No battles yet"}
              </div>
            </div>
            <span style={{color:c.text2, fontSize:"20px", flexShrink:0}}>›</span>
          </button>
        )}
      </div>
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
  );

  // BATTLE INTRO — challenge received from a friend
  if (screen === "battle-intro" && battleOpponent) return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{...styles.logo, cursor:"default"}}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={{fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text}}>ROASTME</span>
          <span style={{fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px"}}>AI</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"20px"}}>
          <div style={{width:"68px", height:"68px", borderRadius:"50%", background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px"}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg></div>
          <div style={{fontSize:"22px", fontWeight:900, color:c.text, marginBottom:"6px"}}>You've Been Challenged!</div>
          <div style={{fontSize:"14px", color:c.text2}}>A friend thinks you can't beat their score</div>
        </div>

        <div style={{...styles.card, textAlign:"center", marginBottom:"20px", padding:"28px 20px", background:`linear-gradient(135deg, ${c.accent}15, transparent)`, border:`1.5px solid ${c.accent}50`}}>
          <div style={{fontSize:"11px", color:c.text2, fontWeight:700, marginBottom:"10px", textTransform:"uppercase", letterSpacing:"1px"}}>Their Score · {battleOpponent.mode} Mode</div>
          <div style={{fontSize:"64px", fontWeight:900, color:scoreColor(battleOpponent.score), lineHeight:1}}>{battleOpponent.score}<span style={{fontSize:"28px", color:c.text2}}>/10</span></div>
          <div style={{marginTop:"14px", fontSize:"15px", color:c.text, fontStyle:"italic", lineHeight:1.4}}>"{battleOpponent.oneliner}"</div>
        </div>

        <div style={{...styles.card, marginBottom:"20px", textAlign:"center"}}>
          <div style={{fontSize:"15px", fontWeight:700, color:c.text, marginBottom:"4px"}}>Think you can beat them? 🔥</div>
          <div style={{fontSize:"13px", color:c.text2}}>Submit your {battleOpponent.inputType?.replace(/^[^\s]+\s/, "") || "text"} in {battleOpponent.mode} mode and find out</div>
        </div>

        <button style={{...styles.btn, width:"100%", fontSize:"17px", padding:"18px"}} onClick={() => { setScreen("app"); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>
          Accept the Challenge
        </button>
        <button style={{...styles.btnOutline, width:"100%", marginTop:"10px"}} onClick={() => { setScreen("landing"); setBattleOpponent(null); window.history.replaceState({}, '', window.location.pathname); }}>
          Maybe later
        </button>
      </div>
    </div>
  );

  // BATTLE RESULT — head to head comparison
  if (screen === "battle-result" && battleResult && battleOpponent) {
    const youWin = battleResult.score > battleOpponent.score;
    const tie = battleResult.score === battleOpponent.score;
    return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={{...styles.logo, cursor:"default"}}>
          <div style={styles.logoFire}><FIRE_ICON/></div>
          <span style={{fontSize:"20px", fontWeight:900, letterSpacing:"-0.5px", color:c.text}}>ROASTME</span>
          <span style={{fontSize:"11px", fontWeight:700, color:c.accent, marginLeft:"2px"}}>AI</span>
        </div>
        <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
      </header>
      <div style={{maxWidth:"480px", margin:"0 auto", padding:"20px"}}>
        <div style={{textAlign:"center", marginBottom:"20px"}}>
          <div style={{width:"68px", height:"68px", borderRadius:"50%", background: tie ? `${c.text2}20` : youWin ? "#22C55E20" : "#FF450020", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px"}}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={tie ? c.text2 : youWin ? "#22C55E" : "#FF4500"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {tie ? (
                <line x1="5" y1="12" x2="19" y2="12"/>
              ) : (
                <>
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
                  <path d="M13 19l6-6"/>
                  <path d="M16 16l4 4"/>
                  <path d="M19 21l2-2"/>
                  <path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/>
                  <path d="M5 14l4 4"/>
                  <path d="M7 17l-3 3"/>
                  <path d="M3 19l2 2"/>
                </>
              )}
            </svg>
          </div>
          <div style={{fontSize:"24px", fontWeight:900, color: tie ? c.text : youWin ? "#22C55E" : "#FF4500"}}>
            {tie ? "It's a Tie!" : youWin ? "You Won!" : "You Got Roasted Worse"}
          </div>
        </div>

        <div style={{display:"flex", gap:"10px", marginBottom:"20px"}}>
          <div style={{...styles.card, flex:1, textAlign:"center", padding:"18px 10px", border: youWin ? "2px solid #22C55E" : `1px solid ${c.border}`}}>
            <div style={{fontSize:"11px", color:c.text2, fontWeight:700, marginBottom:"8px", textTransform:"uppercase"}}>You</div>
            <div style={{fontSize:"44px", fontWeight:900, color:scoreColor(battleResult.score), lineHeight:1}}>{battleResult.score}</div>
            <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>/10</div>
          </div>
          <div style={{display:"flex", alignItems:"center", fontSize:"20px", fontWeight:900, color:c.text2}}>VS</div>
          <div style={{...styles.card, flex:1, textAlign:"center", padding:"18px 10px", border: !youWin && !tie ? "2px solid #22C55E" : `1px solid ${c.border}`}}>
            <div style={{fontSize:"11px", color:c.text2, fontWeight:700, marginBottom:"8px", textTransform:"uppercase"}}>Friend</div>
            <div style={{fontSize:"44px", fontWeight:900, color:scoreColor(battleOpponent.score), lineHeight:1}}>{battleOpponent.score}</div>
            <div style={{fontSize:"11px", color:c.text2, marginTop:"4px"}}>/10</div>
          </div>
        </div>

        <div style={{...styles.card, marginBottom:"16px", background:`${c.accent}10`, border:`1px solid ${c.accent}40`}}>
          <div style={{fontSize:"11px", color:c.accent, fontWeight:700, marginBottom:"6px", textTransform:"uppercase", letterSpacing:"1px"}}>Your Roast</div>
          <div style={{fontSize:"15px", fontWeight:700, color:c.text, fontStyle:"italic"}}>"{battleResult.oneliner}"</div>
        </div>

        <button style={{...styles.btn, width:"100%", marginBottom:"10px"}} onClick={() => {
          const rematchData = encodeURIComponent(JSON.stringify({
            score: battleResult.score,
            oneliner: battleResult.oneliner,
            mode: battleResult.mode,
            inputType: inputType
          }));
          const link = `${window.location.href.split('?')[0]}?battle=${rematchData}`;
          navigator.clipboard.writeText(link);
          setShareMsg("Rematch link copied!");
          setTimeout(() => setShareMsg(""), 3000);
        }}>
          {!shareMsg && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>}
          {shareMsg || "Challenge Someone Else"}
        </button>
        <button style={{...styles.btnOutline, width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px"}} onClick={() => { setScreen("landing"); setBattleOpponent(null); setBattleResult(null); setResult(null); window.history.replaceState({}, '', window.location.pathname); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          Get My Own Roast
        </button>
      </div>
    </div>
  );
  }

  // HISTORY — Tabs: Roasts + Battles
  if (screen === "history") {

    return (
    <div style={styles.app}>
      <div style={{maxWidth:"480px", margin:"0 auto"}}>
        {/* Header */}
        <div style={{padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div style={{fontSize:"24px", fontWeight:900, color:c.text, letterSpacing:"-0.5px"}}>History</div>
          {(history.length > 0 || battleHistory.length > 0) && (
            <div style={{fontSize:"12px", color:c.text2}}>{history.length} roasts · {battleHistory.length} battles</div>
          )}
        </div>

        {/* C2 — COMMUNICATION SCORE */}
        {history.length >= 3 && (() => {
          const allScores = history.map(h => h.score || 0).filter(s => s > 0);
          if (allScores.length < 3) return null;

          // Overall — weighted avg (recent scores count more)
          const weighted = allScores.map((s, i) => s * (1 + (allScores.length - 1 - i) * 0.05));
          const overall  = Math.min(10, Math.round(weighted.reduce((a,b)=>a+b,0) / weighted.length * 10) / 10);

          // By mode
          const byMode = {};
          history.forEach(h => { if (h.mode && h.score) { if (!byMode[h.mode]) byMode[h.mode]=[]; byMode[h.mode].push(h.score); } });
          const modeAvg = m => byMode[m]?.length >= 2 ? byMode[m].reduce((a,b)=>a+b,0)/byMode[m].length : null;

          // Confidence — Mentor mode scores. Fallback: overall scaled by trajectory
          const half = Math.ceil(allScores.length/2);
          const recentHalf = allScores.slice(0, half);
          const olderHalf  = allScores.slice(half);
          const recentAvg  = recentHalf.reduce((a,b)=>a+b,0)/recentHalf.length;
          const olderAvg   = olderHalf.length > 0 ? olderHalf.reduce((a,b)=>a+b,0)/olderHalf.length : recentAvg;
          const trajectoryBonus = Math.max(-1, Math.min(1, (recentAvg - olderAvg) * 0.5));

          const raw_confidence  = modeAvg("Mentor")  ?? Math.min(10, Math.max(1, overall + trajectoryBonus * 1.2));
          const raw_clarity     = modeAvg("Honest")  ?? Math.min(10, Math.max(1, overall - 0.3));
          const raw_persuasion  = modeAvg("Savage")  ?? Math.min(10, Math.max(1, overall + trajectoryBonus * 0.8));

          // Authenticity — inverse of score variance (consistent = more authentic)
          const mean = allScores.reduce((a,b)=>a+b,0)/allScores.length;
          const variance = allScores.reduce((a,s)=>a+Math.pow(s-mean,2),0)/allScores.length;
          const raw_authenticity = Math.min(10, Math.max(1, 10 - variance * 0.4 + trajectoryBonus * 0.5));

          // Round all to 1dp
          const scores_c2 = {
            overall:      Math.round(overall * 10) / 10,
            confidence:   Math.round(raw_confidence * 10) / 10,
            clarity:      Math.round(raw_clarity * 10) / 10,
            authenticity: Math.round(raw_authenticity * 10) / 10,
            persuasion:   Math.round(raw_persuasion * 10) / 10,
          };

          const BAR_COLOR = val =>
            val >= 7.5 ? "#22C55E"
            : val >= 5  ? "#FFB300"
            : "#FF4500";



          return (
            <div style={{margin:"16px 20px 0", background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"18px", padding:"20px 20px 6px"}}>
              {/* Header */}
              <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"20px"}}>
                <div>
                  <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"8px"}}>Communication Score</div>
                  <div style={{fontSize:"42px", fontWeight:900, lineHeight:1, color:BAR_COLOR(scores_c2.overall)}}>
                    {scores_c2.overall}
                    <span style={{fontSize:"18px", fontWeight:500, color:c.text2}}>/10</span>
                  </div>
                </div>
                {/* Arc indicator */}
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke={c.bg3} strokeWidth="5"/>
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke={BAR_COLOR(scores_c2.overall)} strokeWidth="5"
                    strokeDasharray={`${(scores_c2.overall/10) * 163.4} 163.4`}
                    strokeLinecap="round"
                    transform="rotate(-90 32 32)"
                    style={{transition:"stroke-dasharray 0.8s ease"}}
                  />
                  <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="800" fill={BAR_COLOR(scores_c2.overall)}>
                    {scores_c2.overall >= 8 ? "Strong" : scores_c2.overall >= 5 ? "Good" : "Growing"}
                  </text>
                </svg>
              </div>

              {/* Metrics */}
              <Metric c={c} BAR_COLOR={BAR_COLOR} label="Confidence"   value={scores_c2.confidence} />
              <Metric c={c} BAR_COLOR={BAR_COLOR} label="Clarity"      value={scores_c2.clarity} />
              <Metric c={c} BAR_COLOR={BAR_COLOR} label="Authenticity" value={scores_c2.authenticity} />
              <Metric c={c} BAR_COLOR={BAR_COLOR} label="Persuasion"   value={scores_c2.persuasion} />

              <div style={{fontSize:"11px", color:c.text2, marginTop:"4px", marginBottom:"14px", opacity:0.6}}>
                Based on {allScores.length} roast{allScores.length===1?"":"s"} · Updates with every result
              </div>
            </div>
          );
        })()}

        {/* B3.5 — Monthly Report Foundation (data computed here, used in future phases) */}
        {/* B2.4 — Monthly Report Preview */}
        {history.length >= 3 && (() => {
          const now = new Date();
          const monthName = now.toLocaleString("default", { month:"long" });
          const thisMonth = history.filter(h => {
            const d = new Date(h.date || h.created_at);
            return !isNaN(d) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          });
          if (thisMonth.length === 0) return null;
          const monthScores = thisMonth.map(h => h.score || 0).filter(s => s > 0);
          const monthAvg = monthScores.length > 0 ? monthScores.reduce((a,b)=>a+b,0)/monthScores.length : 0;
          const allScores = history.map(h=>h.score||0).filter(s=>s>0);
          const allAvg = allScores.length > 0 ? allScores.reduce((a,b)=>a+b,0)/allScores.length : 0;
          const improved = monthAvg > allAvg;
          // Days left in month
          const lastDay = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
          const daysLeft = lastDay - now.getDate();

          return (
            <div style={{margin:"14px 20px 0", background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"6px"}}>{monthName} Report</div>
                <div style={{fontSize:"13px", color:c.text, fontWeight:600, marginBottom:"2px"}}>{thisMonth.length} roast{thisMonth.length===1?"":"s"} this month</div>
                <div style={{fontSize:"12px", color: improved ? "#22C55E" : c.text2}}>
                  {improved ? "Improvement detected" : "Keep going to see a trend"}
                </div>
              </div>
              <div style={{textAlign:"right", flexShrink:0}}>
                <div style={{fontSize:"11px", color:c.text2, marginBottom:"3px"}}>
                  {daysLeft > 0 ? `${daysLeft} days left` : "Month complete"}
                </div>

              </div>
            </div>
          );
        })()}

        {/* B1.5 — Progress Intelligence */}
        {history.length >= 1 && (() => {
          // ── Core calculations ──────────────────────────────
          const scores = history.map(h => h.score || 0).filter(s => s > 0);
          const avg = scores.length > 0
            ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length * 10) / 10
            : null;
          const bestScore = scores.length > 0 ? Math.max(...scores) : null;

          // Split into recent half vs older half for trend
          const half = Math.ceil(scores.length / 2);
          const recent = scores.slice(0, half);
          const older  = scores.slice(half);
          const recentAvg = recent.length > 0 ? recent.reduce((a,b)=>a+b,0)/recent.length : null;
          const olderAvg  = older.length  > 0 ? older.reduce((a,b)=>a+b,0)/older.length   : null;
          const trend = recentAvg && olderAvg ? recentAvg - olderAvg : null;

          // Status label
          const status = scores.length < 3
            ? { label: "Needs More Data", color: c.text2, sub: `${3 - scores.length} more roast${3-scores.length===1?"":"s"} to unlock insights` }
            : trend === null ? { label: "Stable", color: "#FFB300", sub: "Keep going to see your trend" }
            : trend > 1.5    ? { label: "Improving Fast", color: "#22C55E", sub: "Your scores are rising quickly" }
            : trend > 0.3    ? { label: "Improving Steadily", color: "#22C55E", sub: "Consistent upward trend" }
            : trend > -0.3   ? { label: "Stable", color: "#FFB300", sub: "Scores are holding steady" }
            : { label: "Keep Pushing", color: "#FF4500", sub: "Recent scores are lower than before" };

          // Next milestone
          const MILESTONES = [3, 5, 7, 8, 9];
          const nextMilestone = avg !== null ? MILESTONES.find(m => m > avg) : null;
          const distToMilestone = nextMilestone && avg ? Math.round((nextMilestone - avg) * 10) / 10 : null;
          const milestoneReached = avg !== null ? MILESTONES.filter(m => m <= avg) : [];
          const justReached = milestoneReached.length > 0 && distToMilestone !== null && distToMilestone < 0.3;

          // Personal insight — one pattern
          const modes = history.map(h => h.mode).filter(Boolean);
          const types = history.map(h => h.inputType || h.input_type).filter(Boolean);
          const topMode = modes.length > 0
            ? Object.entries(modes.reduce((a,m)=>({...a,[m]:(a[m]||0)+1}),{})).sort((a,b)=>b[1]-a[1])[0]
            : null;
          const topType = types.length > 0
            ? Object.entries(types.reduce((a,t)=>({...a,[t]:(a[t]||0)+1}),{})).sort((a,b)=>b[1]-a[1])[0]
            : null;
          const weakMode = modes.length >= 4
            ? Object.entries(modes.reduce((a,m)=>({...a,[m]:(a[m]||0)+1}),{})).sort((a,b)=>a[1]-b[1])[0]
            : null;

          // Score by mode to find strongest/weakest
          const byMode = {};
          history.forEach(h => {
            if (!h.mode || !h.score) return;
            if (!byMode[h.mode]) byMode[h.mode] = [];
            byMode[h.mode].push(h.score);
          });
          const modeAvgs = Object.entries(byMode)
            .filter(([,s]) => s.length >= 2)
            .map(([m,s]) => [m, s.reduce((a,b)=>a+b,0)/s.length])
            .sort((a,b)=>b[1]-a[1]);

          let insight = null;
          if (modeAvgs.length >= 2) {
            insight = `Your strongest mode is ${modeAvgs[0][0]} (avg ${Math.round(modeAvgs[0][1]*10)/10}/10)`;
          } else if (topType && topType[1] >= 2) {
            const cleanType = topType[0].replace(/[💕📸💬📄✨]/g,"").trim();
            insight = cleanType ? `Most of your roasts are about ${cleanType.toLowerCase()}` : null;
          } else if (topMode && topMode[1] >= 2) {
            insight = `You favour ${topMode[0]} mode — ${topMode[1]} of your ${history.length} roasts`;
          }

          // Monthly timeline
          const monthMap = {};
          history.forEach(h => {
            const d = new Date(h.date || h.created_at);
            if (isNaN(d)) return;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
            const label = d.toLocaleString("default", {month:"short"});
            if (!monthMap[key]) monthMap[key] = { label, scores:[] };
            monthMap[key].scores.push(h.score || 0);
          });
          const timeline = Object.entries(monthMap)
            .sort((a,b) => a[0].localeCompare(b[0]))
            .map(([,v]) => ({ label:v.label, avg: Math.round(v.scores.reduce((a,b)=>a+b,0)/v.scores.length*10)/10 }));

          return (
            <div style={{padding:"16px 20px 0"}}>
              <button onClick={()=>setShowInsights(s=>!s)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:`1px solid ${c.border}`,borderRadius:"14px",padding:"13px 16px",cursor:"pointer",marginBottom:showInsights?"12px":"0"}}>
                <span style={{fontSize:"13px",fontWeight:700,color:c.text}}>Insights</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform:showInsights?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showInsights && <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>

              {/* 1 — YOUR PROGRESS */}
              <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"18px", padding:"20px", position:"relative", overflow:"hidden"}}>
                {/* Subtle gradient accent */}
                <div style={{position:"absolute", top:0, right:0, width:"120px", height:"120px", background:`radial-gradient(circle, ${status.color}18 0%, transparent 70%)`, pointerEvents:"none"}}/>
                <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Your Progress</div>
                <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"16px"}}>
                  <div>
                    <div style={{fontSize:"44px", fontWeight:900, color: avg ? scoreColor(avg) : c.text2, lineHeight:1}}>
                      {avg ?? "—"}<span style={{fontSize:"20px", color:c.text2, fontWeight:600}}>/10</span>
                    </div>
                    <div style={{fontSize:"12px", color:c.text2, marginTop:"5px"}}>Average score</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{display:"inline-flex", alignItems:"center", gap:"5px", background:`${status.color}18`, border:`1px solid ${status.color}40`, borderRadius:"20px", padding:"5px 11px", marginBottom:"6px"}}>
                      <div style={{width:"6px", height:"6px", borderRadius:"50%", background:status.color, flexShrink:0}}/>
                      <span style={{fontSize:"12px", fontWeight:700, color:status.color}}>{status.label}</span>
                    </div>
                    <div style={{fontSize:"11px", color:c.text2}}>{status.sub}</div>
                  </div>
                </div>
                <div style={{padding:"10px 12px", background:c.bg3, borderRadius:"10px", display:"inline-block", minWidth:"80px"}}>
                  <div style={{fontSize:"18px", fontWeight:900, color:c.accent}}>{history.length}</div>
                  <div style={{fontSize:"10px", color:c.text2, marginTop:"2px"}}>Total roasts</div>
                </div>
              </div>

              {/* B3.1 — COMMUNICATION PROFILE */}
              {scores.length >= 4 && (() => {
                // Derive profile from real patterns only
                // 1. Mode distribution — what does the user reach for?
                const modeCount = {};
                history.forEach(h => { if (h.mode) modeCount[h.mode] = (modeCount[h.mode]||0)+1; });
                const topMode = Object.entries(modeCount).sort((a,b)=>b[1]-a[1])[0]?.[0];

                // 2. Score trajectory — improving or flat?
                const firstHalf  = scores.slice(Math.ceil(scores.length/2)).reverse(); // oldest first
                const secondHalf = scores.slice(0, Math.ceil(scores.length/2)).reverse(); // newest first
                const firstAvg  = firstHalf.reduce((a,b)=>a+b,0)/firstHalf.length;
                const secondAvg = secondHalf.reduce((a,b)=>a+b,0)/secondHalf.length;
                const improving  = secondAvg - firstAvg > 0.5;
                const consistent = Math.abs(secondAvg - firstAvg) <= 0.5;

                // 3. Score level — what tier?
                const highScorer = avg !== null && avg >= 7;
                const midScorer  = avg !== null && avg >= 5 && avg < 7;

                // Derive exactly one profile — no random, no invention
                let profile, profileSub;
                if (topMode === "Savage" && highScorer) {
                  profile = "Direct Communicator";
                  profileSub = "You cut through noise. Your writing is clear and doesn't waste words.";
                } else if (topMode === "Mentor" && improving) {
                  profile = "Confidence Builder";
                  profileSub = "You seek growth over validation. Your scores reflect that.";
                } else if (topMode === "Honest" && consistent) {
                  profile = "Structured Thinker";
                  profileSub = "You value clarity and logic over style. Consistent by design.";
                } else if (topMode === "Comedian") {
                  profile = "Creative Communicator";
                  profileSub = "You use tone and personality as tools. Not everyone can do that.";
                } else if (improving && midScorer) {
                  profile = "Emerging Writer";
                  profileSub = "Your trajectory is clear. You're getting better with every roast.";
                } else if (highScorer) {
                  profile = "Persuasive Writer";
                  profileSub = "Your writing moves people. That's the hardest thing to teach.";
                } else if (consistent) {
                  profile = "Concise Communicator";
                  profileSub = "You're steady. Now push for sharp.";
                } else {
                  profile = "Detail Oriented";
                  profileSub = "You go deep. The challenge is learning what to cut.";
                }

                // Strength — mode with highest avg (min 2 roasts)
                const byMode = {};
                history.forEach(h => { if (h.mode && h.score) { if (!byMode[h.mode]) byMode[h.mode] = []; byMode[h.mode].push(h.score); } });
                const modeAvgs = Object.entries(byMode).filter(([,s])=>s.length>=2).map(([m,s])=>[m, s.reduce((a,b)=>a+b,0)/s.length]).sort((a,b)=>b[1]-a[1]);

                const AREA_LABELS = { Savage:"Directness", Honest:"Clarity", Mentor:"Structure", Comedian:"Tone" };
                const strongestArea = modeAvgs.length > 0 ? AREA_LABELS[modeAvgs[0][0]] || modeAvgs[0][0] : null;
                const focusArea     = modeAvgs.length > 1 ? AREA_LABELS[modeAvgs[modeAvgs.length-1][0]] || modeAvgs[modeAvgs.length-1][0] : null;

                return (
                  <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"18px", padding:"18px 20px"}}>
                    <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"14px"}}>Your Communication Profile</div>

                    {/* Profile name */}
                    <div style={{fontSize:"19px", fontWeight:800, color:c.text, marginBottom:"6px"}}>{profile}</div>
                    <div style={{fontSize:"13px", color:c.text2, lineHeight:1.6, marginBottom:"16px"}}>{profileSub}</div>

                    {/* Strength + Focus as two quiet lines */}
                    {(strongestArea || focusArea) && (
                      <div style={{borderTop:`1px solid ${c.border}`, paddingTop:"14px", display:"flex", gap:"0", flexDirection:"column", gap:"10px"}}>
                        {strongestArea && (
                          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <span style={{fontSize:"12px", color:c.text2}}>Strongest Area</span>
                            <span style={{fontSize:"13px", fontWeight:700, color:"#22C55E"}}>{strongestArea}</span>
                          </div>
                        )}
                        {focusArea && focusArea !== strongestArea && (
                          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <span style={{fontSize:"12px", color:c.text2}}>Focus Area</span>
                            <span style={{fontSize:"13px", fontWeight:700, color:c.accent}}>{focusArea}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 2 — NEXT MILESTONE */}
              {avg !== null && scores.length >= 2 && (
                <div style={{background: justReached ? `${c.accent}10` : c.bg2, border:`1px solid ${justReached ? c.accent + "60" : c.border}`, borderRadius:"18px", padding:"18px 20px", transition:"all 0.4s"}}>
                  <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"12px"}}>Next Milestone</div>
                  {justReached ? (
                    <div style={{display:"flex", alignItems:"center", gap:"10px"}}>
                      <div style={{fontSize:"24px", fontWeight:900, color:c.accent}}>✦</div>
                      <div>
                        <div style={{fontSize:"15px", fontWeight:800, color:c.accent}}>Milestone reached — {avg}/10</div>
                        <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>Keep going to reach the next level</div>
                      </div>
                    </div>
                  ) : nextMilestone ? (
                    <>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"10px"}}>
                        <div>
                          <span style={{fontSize:"13px", color:c.text2}}>Target </span>
                          <span style={{fontSize:"20px", fontWeight:900, color:"#22C55E"}}>{nextMilestone}/10</span>
                        </div>
                        <div style={{fontSize:"12px", color:c.text2}}>{distToMilestone} pts away</div>
                      </div>
                      <div style={{height:"6px", background:c.bg3, borderRadius:"4px", overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${Math.min(((avg - (nextMilestone-1)) / 1) * 100, 100)}%`, background:`linear-gradient(90deg, ${scoreColor(avg)}, #22C55E)`, borderRadius:"4px", transition:"width 0.7s ease"}}/>
                      </div>
                      {/* B2.3 — Next Target: why it matters */}
                      {(() => {
                        const WHY = {
                          3: "A score above 3 means your writing has something worth building on.",
                          5: "Reaching 5 puts you above average. Most people never get here.",
                          7: "Above 7, your writing becomes genuinely compelling. People notice.",
                          8: "At 8, you're in rare company. Communication this strong opens doors.",
                          9: "A 9 is elite. Almost nothing needs to change."
                        };
                        return WHY[nextMilestone] ? (
                          <div style={{marginTop:"12px", paddingTop:"12px", borderTop:`1px solid ${c.border}`}}>
                            <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"6px"}}>Why it matters</div>
                            <div style={{fontSize:"13px", color:c.text2, lineHeight:1.6}}>{WHY[nextMilestone]}</div>
                          </div>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <div style={{fontSize:"14px", color:"#22C55E", fontWeight:700}}>You've reached all milestones. Elite level.</div>
                  )}
                </div>
              )}

              {/* 4 — IMPROVEMENT TIMELINE */}
              {timeline.length >= 2 && (
                <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"18px", padding:"18px 20px"}}>
                  <div style={{fontSize:"10px", fontWeight:700, color:c.text2, letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"16px"}}>Timeline</div>
                  <div style={{display:"flex", flexDirection:"column", gap:"0"}}>
                    {timeline.map((m, i) => {
                      const isLast = i === timeline.length - 1;
                      const prev = i > 0 ? timeline[i-1].avg : null;
                      const up = prev !== null ? m.avg > prev : null;
                      return (
                        <div key={i} style={{display:"flex", alignItems:"center", gap:"12px", paddingBottom: isLast ? "0" : "16px", position:"relative"}}>
                          {/* Vertical line */}
                          {!isLast && <div style={{position:"absolute", left:"19px", top:"28px", bottom:"0", width:"1px", background:c.border}}/>}
                          {/* Dot */}
                          <div style={{width:"14px", height:"14px", borderRadius:"50%", border:`2px solid ${isLast ? c.accent : c.border}`, background: isLast ? c.accent : c.bg3, flexShrink:0, zIndex:1, marginLeft:"13px"}}/>
                          {/* Content */}
                          <div style={{flex:1, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                            <span style={{fontSize:"13px", color: isLast ? c.text : c.text2, fontWeight: isLast ? 700 : 400}}>{m.label}</span>
                            <div style={{display:"flex", alignItems:"center", gap:"6px"}}>
                              {up !== null && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={up ? "#22C55E" : "#FF4500"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  {up ? (<><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>) : (<><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>)}
                                </svg>
                              )}
                              <span style={{fontSize:"14px", fontWeight: isLast ? 900 : 600, color: isLast ? scoreColor(m.avg) : c.text2}}>{m.avg}<span style={{fontSize:"10px", color:c.text2, fontWeight:400}}>/10</span></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              </div>}
            </div>
          );
        })()}

        {/* Tabs */}
        <div style={{display:"flex", gap:"0", margin:"16px 20px 0", background:c.bg2, borderRadius:"12px", padding:"4px", border:`1px solid ${c.border}`}}>
          {[
            { id:"roasts", label:`Roasts${history.length > 0 ? ` (${history.length})` : ""}` },
            { id:"battles", label:`Battles${battleHistory.length > 0 ? ` (${battleHistory.length})` : ""}` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setHistTab(tab.id)} style={{flex:1, padding:"9px", borderRadius:"9px", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:700, transition:"all 0.15s",
              background: histTab === tab.id ? (dark ? "#222" : "#fff") : "transparent",
              color: histTab === tab.id ? c.text : c.text2,
              boxShadow: histTab === tab.id ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{padding:"12px 20px 100px"}}>
          {histTab === "roasts" ? (
            history.length === 0 ? (
              <EmptyState c={c}
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>}
                title="Start your first roast"
                sub={user ? "Your progress will appear here. Start your first roast." : "Sign in to save your history and track your progress across devices."}
                cta={user ? "Get Roasted" : "Sign In to Save History"}
                onCta={() => user ? setScreen("app") : setShowLogin(true)}
              />
            ) : (
              <>
              {/* B3.2 — Personal Records */}
              {(() => {
                if (history.length < 2) return null;

                // Best score ever
                const best = history.reduce((b,h) => (!b || (h.score||0)>(b.score||0)) ? h : b, null);
                const bestDate = best ? new Date(best.date || best.created_at) : null;
                const bestDateStr = bestDate && !isNaN(bestDate) ? bestDate.toLocaleString("default",{month:"short",year:"numeric"}) : "";

                // Most improved month — month where avg rose most vs previous month
                const monthMap = {};
                history.forEach(h => {
                  const d = new Date(h.date || h.created_at);
                  if (isNaN(d) || !h.score) return;
                  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
                  const label = d.toLocaleString("default",{month:"short", year:"numeric"});
                  if (!monthMap[key]) monthMap[key] = { label, scores:[] };
                  monthMap[key].scores.push(h.score);
                });
                const months = Object.entries(monthMap).sort((a,b)=>a[0].localeCompare(b[0]));
                let mostImprovedMonth = null;
                let maxImprovement = 0;
                for (let i = 1; i < months.length; i++) {
                  const prev = months[i-1][1].scores.reduce((a,b)=>a+b,0)/months[i-1][1].scores.length;
                  const curr = months[i][1].scores.reduce((a,b)=>a+b,0)/months[i][1].scores.length;
                  const delta = curr - prev;
                  if (delta > maxImprovement) { maxImprovement = delta; mostImprovedMonth = months[i][1].label; }
                }

                // Most used mode
                const modeCount = {};
                history.forEach(h => { if (h.mode) modeCount[h.mode] = (modeCount[h.mode]||0)+1; });
                const topMode = Object.entries(modeCount).sort((a,b)=>b[1]-a[1])[0];

                const rows = [
                  best ? {
                    label: "Best Score",
                    value: `${best.score}/10`,
                    sub: `${best.mode} Mode${bestDateStr ? ` · ${bestDateStr}` : ""}`,
                    color: scoreColor(best.score)
                  } : null,
                  mostImprovedMonth ? {
                    label: "Most Improved",
                    value: mostImprovedMonth,
                    sub: `+${Math.round(maxImprovement*10)/10} avg pts`,
                    color: "#22C55E"
                  } : null,
                  topMode ? {
                    label: "Favourite Mode",
                    value: topMode[0],
                    sub: `${topMode[1]} of ${history.length} roasts`,
                    color: c.accent
                  } : null,
                ].filter(Boolean);

                if (rows.length === 0) return null;

                return (
                  <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", marginBottom:"12px", overflow:"hidden"}}>
                    {rows.map((row, i) => (
                      <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 18px", borderBottom: i < rows.length-1 ? `1px solid ${c.border}` : "none"}}>
                        <div>
                          <div style={{fontSize:"12px", color:c.text2}}>{row.label}</div>
                          <div style={{fontSize:"11px", color:c.text2, opacity:0.6, marginTop:"2px"}}>{row.sub}</div>
                        </div>
                        <div style={{fontSize:"17px", fontWeight:900, color:row.color}}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {history.map((h, i) => (
                <div key={i} onClick={() => {
                  setResult({ score:h.score, oneliner:h.oneliner, verdict:h.verdict||"", wrong:Array.isArray(h.wrong)?h.wrong:[], works:Array.isArray(h.works)?h.works:[], fix:Array.isArray(h.fix)?h.fix:[], theFix:h.theFix||h.the_fix||null, mode:h.mode||"Savage", input:h.input||h.input_text||"" });
                  setScreen("result");
                }}
                style={{background:c.bg2, borderRadius:"14px", padding:"16px", marginBottom:"10px", border:`1px solid ${c.border}`, cursor:"pointer", transition:"all 0.15s"}}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.accent}50`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px"}}>
                    <div>
                      <span style={{fontSize:"11px", fontWeight:700, color:c.accent, textTransform:"uppercase", letterSpacing:"0.8px"}}>{h.mode} Mode</span>
                      <div style={{fontSize:"12px", color:c.text2, marginTop:"3px"}}>{h.date || h.created_at?.split("T")[0] || ""}</div>
                    </div>
                    <div style={{fontSize:"28px", fontWeight:900, color:scoreColor(h.score), lineHeight:1}}>
                      {h.score}<span style={{fontSize:"14px", color:c.text2, fontWeight:600}}>/10</span>
                    </div>
                  </div>
                  {(h.input || h.input_text) && (
                    <div style={{fontSize:"12px", color:c.text2, marginBottom:"8px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontStyle:"italic"}}>
                      "{h.input || h.input_text}"
                    </div>
                  )}
                  <div style={{fontSize:"13px", color:c.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {h.oneliner}
                  </div>
                </div>
              ))
              }
              </>
            )
          ) : (
            battleHistory.length === 0 ? (
              <EmptyState c={c}
                icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4"/><path d="M7 17l-3 3"/><path d="M3 19l2 2"/></svg>}
                title="No battles yet"
                sub="Challenge someone and start climbing."
                cta="Start a Roast"
                onCta={() => setScreen("app")}
              />
            ) : (
              <>
                {/* Battle record summary */}
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"16px"}}>
                  {[
                    { val:battleHistory.filter(b=>b.result==="win").length, label:"Wins", color:"#22C55E" },
                    { val:battleHistory.filter(b=>b.result==="loss").length, label:"Losses", color:"#FF4500" },
                    { val:battleHistory.filter(b=>b.result==="tie").length, label:"Ties", color:"#FFB300" },
                  ].map((s,i) => (
                    <div key={i} style={{textAlign:"center", padding:"12px 8px", background:c.bg2, borderRadius:"12px", border:`1px solid ${c.border}`}}>
                      <div style={{fontSize:"24px", fontWeight:900, color:s.color}}>{s.val}</div>
                      <div style={{fontSize:"11px", color:c.text2, marginTop:"2px"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {battleHistory.map((b, i) => (
                  <div key={i} style={{background:c.bg2, borderRadius:"14px", padding:"14px 16px", marginBottom:"8px", border:`1px solid ${b.result==="win" ? "#22C55E40" : b.result==="loss" ? "#FF450040" : c.border}`, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px"}}>
                        <span style={{fontSize:"14px", fontWeight:700, color: b.result==="win" ? "#22C55E" : b.result==="loss" ? "#FF4500" : "#FFB300"}}>
                          {b.result === "win" ? "Victory" : b.result === "loss" ? "Defeat" : "Tie"}
                        </span>
                        <span style={{fontSize:"11px", color:c.text2}}>{b.mode} Mode</span>
                      </div>
                      <div style={{fontSize:"12px", color:c.text2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                        {b.myOneliner || b.challenger_oneliner || "—"}
                      </div>
                    </div>
                    <div style={{textAlign:"center", marginLeft:"12px", flexShrink:0}}>
                      <div style={{fontSize:"20px", fontWeight:900, color:scoreColor(b.myScore||b.challenger_score)}}>
                        {b.myScore || b.challenger_score || "—"}<span style={{fontSize:"11px", color:c.text2}}>/10</span>
                      </div>
                      <div style={{fontSize:"10px", color:c.text2}}>vs {b.opponentScore || b.opponent_score || "—"}</div>
                    </div>
                  </div>
                ))}
              </>
            )
          )}
        </div>
      </div>

      {showPaywall && <Paywall c={c} onClose={() => { setShowPaywall(false); setPaywallPreselect(null); setUpgradeError(""); }} onUpgrade={handleUpgrade} dark={dark} currentPlan={plan} preselect={paywallPreselect} upgradeError={upgradeError}/>}
      {showLogin && <LoginModal c={c} dark={dark} onClose={() => setShowLogin(false)} loginEmail={loginEmail} setLoginEmail={setLoginEmail}/>}
      <BottomNav screen={screen} setScreen={setScreen} dark={dark} c={c}/>
    </div>
    );
  }

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
            <div onClick={() => setScreen("profile")} style={{display:"flex", alignItems:"center", gap:"7px", cursor:"pointer"}} title="My Account">
              <div style={{width:"32px", height:"32px", borderRadius:"50%", background:`${c.accent}20`, border:`1.5px solid ${c.accent}60`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"border-color 0.2s"}}>
                <span style={{fontSize:"12px", fontWeight:800, color:c.accent}}>
                  {(user.email?.[0] || "?").toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{fontSize:"12px", fontWeight:700, color:c.accent, background:"transparent", border:`1px solid ${c.accent}`, borderRadius:"8px", padding:"4px 10px", cursor:"pointer"}}>
              Sign In
            </button>
          )}
          {isPaid && <span style={{fontSize:"11px", fontWeight:700, color:c.accent, border:`1px solid ${c.accent}`, borderRadius:"6px", padding:"3px 8px"}}>{plan === "fired_up" ? "FIRED UP" : "BRUTAL"}</span>}
          <button style={styles.toggle} onClick={toggleDark}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{dark ? (<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>)}</svg></button>
        </div>
      </header>

      <div style={{maxWidth:"480px", margin:"0 auto"}}>
        {/* Counter */}
        {!isPaid && (
          <div style={{padding:"12px 20px"}}>
            <div style={styles.counter}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              <span style={{fontSize:"13px", fontWeight:600, color:c.accent}}>
                {ROAST_WEEKLY_LIMIT - roastsUsed} of {ROAST_WEEKLY_LIMIT} free roasts left this week
              </span>
            </div>
          </div>
        )}

        {/* B2.6 — Comeback System */}
        {(() => {
          if (history.length === 0) return null;
          const lastEntry = history[0];
          const lastDate = new Date(lastEntry?.date || lastEntry?.created_at);
          if (isNaN(lastDate.getTime())) return null;
          const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000*60*60*24));
          if (daysSince < 7) return null;
          return (
            <div style={{background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"14px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"12px"}}>
              <div style={{width:"36px", height:"36px", borderRadius:"50%", background:`${c.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              </div>
              <div>
                <div style={{fontSize:"14px", fontWeight:700, color:c.text}}>Welcome back</div>
                <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>Let's see if you've improved.</div>
              </div>
            </div>
          );
        })()}

        {/* Mode */}
        <div style={styles.section}>
          <div style={styles.label}>Choose Your Mode</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"8px"}}>
            {[
              { name:"Savage", tagline:"No mercy.", d:"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" },
              { name:"Honest", tagline:"The truth hurts.", d:"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
              { name:"Mentor", tagline:"Tough love.", d:"M22 10 12 5 2 10l10 5 10-5Z", d2:"M6 12v5c3 3 9 3 12 0v-5" },
              { name:"Comedian", tagline:"Pure chaos.", circle:true, d:"M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12z", d2:"M9 9L9.01 9", d3:"M15 9L15.01 9" },
            ].map(m => (
              <button key={m.name} onClick={() => setMode(m.name)} style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", padding:"16px 6px", background: mode === m.name ? `${c.accent}12` : c.bg2, border:`1.5px solid ${mode === m.name ? c.accent : c.border}`, borderRadius:"16px", cursor:"pointer"}}>
                <div style={{width:"40px", height:"40px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {m.circle && <circle cx="12" cy="12" r="10"/>}
                    {m.d && <path d={m.d}/>}
                    {m.d2 && <path d={m.d2}/>}
                    {m.d3 && <path d={m.d3}/>}
                  </svg>
                </div>
                <span style={{fontWeight:700, fontSize:"13px", color: mode === m.name ? c.accent : c.text, textAlign:"center"}}>{m.name}</span>
                <span style={{fontSize:"10px", color:c.text2, textAlign:"center", lineHeight:1.2}}>{m.tagline}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input type */}
        <div style={styles.section}>
          <div style={styles.label}>What are we roasting?</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
            {[
              { value:"💕 My Bio", full:false, d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", d2:"M14 2L14 8 20 8", d3:"M16 13L8 13", d4:"M16 17L8 17" },
              { value:"📸 My Caption", full:false, d:"M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", circle:"8.5 8.5 1.5", poly:"21 15 16 10 5 21" },
              { value:"💬 Should I Send This?", full:false, d:"M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
              { value:"📄 My CV", full:false, d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", d2:"M14 2L14 8 20 8" },
              { value:"✨ Anything", full:true, d:"m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z", d2:"M5 3v4", d3:"M19 17v4", d4:"M3 5h4", d5:"M17 19h4" },
            ].map(t => (
              <button key={t.value} onClick={() => setInputType(t.value)} style={{gridColumn: t.full ? "1 / -1" : "auto", display:"flex", alignItems:"center", gap:"12px", width:"100%", background: inputType === t.value ? `${c.accent}12` : c.bg2, border:`1.5px solid ${inputType === t.value ? c.accent : c.border}`, borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left"}}>
                <div style={{width:"40px", height:"40px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {t.d && <path d={t.d}/>}
                    {t.d2 && <path d={t.d2}/>}
                    {t.d3 && <path d={t.d3}/>}
                    {t.d4 && <path d={t.d4}/>}
                    {t.d5 && <path d={t.d5}/>}
                    {t.circle && <circle cx={t.circle.split(" ")[0]} cy={t.circle.split(" ")[1]} r={t.circle.split(" ")[2]}/>}
                    {t.poly && <polyline points={t.poly}/>}
                  </svg>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <span style={{fontWeight:700, fontSize:"15px", color: inputType === t.value ? c.accent : c.text}}>{t.value.replace(/^[^\s]+\s/, "")}</span>
                </div>
                <span style={{color:c.text2, fontSize:"20px", flexShrink:0}}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text or Image */}
        <div style={styles.section}>
          <div style={styles.label}>{imageData ? "Your Image" : "Paste Your Text"}</div>

          {!imageData && (
            <button
              onClick={() => { if (!isPaid) { setShowPaywall(true); } }}
              style={{position:"relative", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", background:"none", border:`1.5px dashed ${c.border}`, borderRadius:"12px", padding:"14px", color:c.text2, fontSize:"14px", fontWeight:600, cursor: isPaid ? "default" : "pointer", marginBottom:"10px", opacity:0.5}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              Upload Image — Coming Soon
              {!isPaid && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{position:"absolute", right:"14px"}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            </button>
          )}
          <input id="roast-image-input" type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload} />

          {imageError && <div style={{fontSize:"13px", color:"#FF4500", marginBottom:"8px"}}>{imageError}</div>}

          {imageData ? (
            <div>
              <div style={{position:"relative"}}>
                <img src={imageData.previewUrl} alt="Upload preview" style={{width:"100%", maxHeight:"320px", objectFit:"contain", borderRadius:"12px", border:`1.5px solid ${c.border}`, background:c.bg3}} />
                <button
                  onClick={() => setImageData(null)}
                  style={{position:"absolute", top:"10px", right:"10px", background:"rgba(0,0,0,0.7)", color:"#fff", border:"none", borderRadius:"50%", width:"32px", height:"32px", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}
                ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
              <textarea
                style={{...styles.textarea, marginTop:"10px"}}
                rows={3}
                placeholder="Add context or a specific question (optional)..."
                value={text}
                onChange={e => setText(e.target.value)}
              />
            </div>
          ) : (
            <>
              {(() => {
                const basePlaceholder = inputType === "💕 My Bio" ? "Paste your dating or social media bio..."
                  : inputType === "📸 My Caption" ? "Paste the caption you're about to post..."
                  : inputType === "💬 Should I Send This?" ? "Paste the message you're nervous about sending..."
                  : inputType === "📄 My CV" ? "Paste your CV and brace yourself..."
                  : "Paste anything. We'll find something.";

                return (
                  <>

                    <textarea
                      style={styles.textarea}
                      rows={7}
                      placeholder={basePlaceholder}
                      value={text}
                      onChange={e => setText(e.target.value)}
                    />
                  </>
                );
              })()}
              <div style={{fontSize:"12px", color: text.length > CHAR_LIMIT ? "#FF4500" : text.length > CHAR_LIMIT * 0.75 ? "#FFB300" : "#22C55E", marginTop:"6px", textAlign:"right", fontWeight: text.length > CHAR_LIMIT ? 700 : 400}}>
                {text.length} / {CHAR_LIMIT} characters
                {text.length > CHAR_LIMIT && <span> — over limit, <span style={{textDecoration:"underline", cursor:"pointer"}} onClick={() => setShowPaywall(true)}>upgrade for more</span></span>}
              </div>
            </>
          )}
        </div>

        {/* Intensity selector — Brutal only */}
        {plan === "brutal" && (
          <div style={styles.section}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"10px"}}>
              <div style={styles.label}>Roast Intensity</div>
              <div style={{fontSize:"11px", color:c.accent, fontWeight:700, background:`${c.accent}15`, borderRadius:"6px", padding:"3px 8px"}}>Brutal Only</div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:"6px"}}>
              {INTENSITY_LEVELS.map(lvl => (
                <button key={lvl.id} onClick={() => setIntensity(lvl.id)} style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", padding:"10px 4px", background: intensity === lvl.id ? `${c.accent}12` : c.bg2, border:`1.5px solid ${intensity === lvl.id ? c.accent : c.border}`, borderRadius:"12px", cursor:"pointer"}}>
                  <div style={{width:"32px", height:"32px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center"}}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={intensity === lvl.id ? c.accent : c.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {lvl.id === "mild" && <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/>}
                      {lvl.id === "spicy" && <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>}
                      {lvl.id === "savage" && <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>}
                      {lvl.id === "nuclear" && <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M19.07 19.07l-2.83-2.83M18 12h4M19.07 4.93l-2.83 2.83M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0z"/>}
                      {lvl.id === "obliterate" && <path d="M3 3l18 18M10.5 6A7.5 7.5 0 0 1 19.5 15M13.5 18A7.5 7.5 0 0 1 4.5 9"/>}
                    </svg>
                  </div>
                  <span style={{fontSize:"10px", fontWeight:700, color: intensity === lvl.id ? c.accent : c.text2, textAlign:"center", lineHeight:1.2}}>{lvl.label}</span>
                </button>
              ))}
            </div>
            <div style={{marginTop:"8px", fontSize:"12px", color:c.text2, textAlign:"center", fontStyle:"italic"}}>
              {INTENSITY_LEVELS.find(l => l.id === intensity)?.tagline}
            </div>
          </div>
        )}

        {/* Roast button */}
        <div style={{padding:"0 20px 32px"}}>
          <button
            style={{...styles.btn, width:"100%", fontSize:"18px", padding:"18px", borderRadius:"14px", opacity: ((text.trim() && text.length <= CHAR_LIMIT) || imageData) ? 1 : 0.5, display:"flex", alignItems:"center", justifyContent:"center", gap:"9px"}}
            onClick={handleRoast}
            disabled={(!text.trim() && !imageData) || loading || text.length > CHAR_LIMIT}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            Roast Me
          </button>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginTop:"12px"}}>
            <button onClick={() => setScreen("history")} style={{display:"flex", alignItems:"center", gap:"12px", width:"100%", background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left"}}>
              <div style={{width:"44px", height:"44px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:700, fontSize:"15px", color:c.text}}>History</div>
                <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>View your past roasts</div>
              </div>
              <span style={{color:c.text2, fontSize:"20px", flexShrink:0}}>›</span>
            </button>

            <button onClick={() => setScreen("profile")} style={{display:"flex", alignItems:"center", gap:"12px", width:"100%", background:c.bg2, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left"}}>
              <div style={{width:"44px", height:"44px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:700, fontSize:"15px", color:c.text}}>Account</div>
                <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>Manage your profile</div>
              </div>
              <span style={{color:c.text2, fontSize:"20px", flexShrink:0}}>›</span>
            </button>

            {!isPaid && (
              <button onClick={() => setShowPaywall(true)} style={{gridColumn:"1 / -1", display:"flex", alignItems:"center", gap:"12px", width:"100%", background:c.bg2, border:`1px solid ${c.accent}50`, borderRadius:"16px", padding:"14px", cursor:"pointer", textAlign:"left"}}>
                <div style={{width:"44px", height:"44px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:700, fontSize:"15px", color:c.accent}}>Upgrade</div>
                  <div style={{fontSize:"12px", color:c.text2, marginTop:"2px"}}>Unlock unlimited roasts & more</div>
                </div>
                <span style={{color:c.text2, fontSize:"20px", flexShrink:0}}>›</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showPaywall && <Paywall c={c} onClose={() => { setShowPaywall(false); setPaywallPreselect(null); setUpgradeError(""); }} onUpgrade={handleUpgrade} dark={dark} currentPlan={plan} preselect={paywallPreselect} upgradeError={upgradeError}/>}
      {showLogin && <LoginModal c={c} dark={dark} onClose={() => setShowLogin(false)} loginEmail={loginEmail} setLoginEmail={setLoginEmail}/>}
    </div>
  );
}

function LoginModal({ c, dark, onClose, loginEmail, setLoginEmail }) {
  const [step, setStep] = useState("main"); // main | email | sent
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const bg     = dark ? "#111111" : "#ffffff";
  const border = dark ? "#2a2a2a" : "#e5e5e5";
  const text   = dark ? "#ffffff" : "#000000";
  const text2  = dark ? "#888888" : "#666666";
  const input  = dark ? "#1a1a1a" : "#f5f5f5";

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  }

  async function handleEmail() {
    if (!loginEmail || !loginEmail.includes("@")) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    setEmailError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    if (error) {
      setEmailError("Something went wrong. Please try again.");
    } else {
      setStep("sent");
    }
  }

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)"}} onClick={e => { if(e.target === e.currentTarget) onClose(); }}>
      <div style={{background:bg, borderRadius:"24px 24px 0 0", padding:"28px 20px 44px", width:"100%", maxWidth:"480px", boxShadow:"0 -4px 40px rgba(0,0,0,0.3)"}}>

        {/* Handle bar */}
        <div style={{width:"36px", height:"4px", background:border, borderRadius:"2px", margin:"0 auto 24px"}}/>

        {step === "sent" ? (
          /* ── EMAIL SENT STATE ── */
          <div style={{textAlign:"center", padding:"12px 0 24px"}}>
            <div style={{width:"64px", height:"64px", borderRadius:"50%", background:"#22C55E20", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div style={{fontSize:"22px", fontWeight:900, color:text, marginBottom:"8px"}}>Check your email</div>
            <div style={{fontSize:"14px", color:text2, lineHeight:1.6, marginBottom:"8px"}}>
              We sent a sign-in link to
            </div>
            <div style={{fontSize:"15px", fontWeight:700, color:"#FF4500", marginBottom:"20px"}}>{loginEmail}</div>
            <div style={{fontSize:"13px", color:text2, lineHeight:1.6, padding:"12px 16px", background: dark ? "#1a1a1a" : "#f5f5f5", borderRadius:"12px", marginBottom:"24px"}}>
              Click the link in the email to sign in. No password needed. Works for both new and existing accounts.
            </div>
            <button onClick={() => setStep("email")} style={{background:"none", border:"none", cursor:"pointer", fontSize:"14px", color:text2, textDecoration:"underline"}}>
              Use a different email
            </button>
          </div>
        ) : step === "email" ? (
          /* ── EMAIL INPUT STATE ── */
          <div>
            <button onClick={() => setStep("main")} style={{background:"none", border:"none", cursor:"pointer", color:text2, fontSize:"14px", display:"flex", alignItems:"center", gap:"6px", marginBottom:"20px", padding:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <div style={{fontSize:"22px", fontWeight:900, color:text, marginBottom:"6px"}}>Enter your email</div>
            <div style={{fontSize:"14px", color:text2, marginBottom:"24px", lineHeight:1.5}}>
              Works for both sign in and sign up. No password needed — we'll send you a magic link.
            </div>
            <input
              type="email"
              autoFocus
              placeholder="you@example.com"
              value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); setEmailError(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleEmail(); }}
              style={{width:"100%", padding:"16px", borderRadius:"12px", border:`1.5px solid ${emailError ? "#FF4500" : border}`, background:input, color:text, fontSize:"16px", outline:"none", boxSizing:"border-box", marginBottom:"8px", fontFamily:"inherit"}}
            />
            {emailError && <div style={{fontSize:"13px", color:"#FF4500", marginBottom:"12px"}}>{emailError}</div>}
            <button
              onClick={handleEmail}
              disabled={loading}
              style={{width:"100%", padding:"16px", borderRadius:"12px", background:"#FF4500", color:"#fff", fontSize:"16px", fontWeight:700, border:"none", cursor:loading ? "wait" : "pointer", opacity:loading ? 0.7 : 1, marginBottom:"0"}}>
              {loading ? "Sending..." : "Send Sign-in Link"}
            </button>
            <div style={{fontSize:"12px", color:text2, textAlign:"center", marginTop:"12px", lineHeight:1.5}}>
              By continuing you agree to our Terms of Service and Privacy Policy.
            </div>
          </div>
        ) : (
          /* ── MAIN STATE ── */
          <div>
            <div style={{textAlign:"center", marginBottom:"28px"}}>
              <div style={{width:"56px", height:"56px", borderRadius:"50%", background:"#FF450015", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px"}}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
              </div>
              <div style={{fontSize:"24px", fontWeight:900, color:text, marginBottom:"8px"}}>Sign in to RoastMe AI</div>
              <div style={{fontSize:"14px", color:text2, lineHeight:1.5}}>Save your history, sync across devices, and unlock your weekly roasts.</div>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"20px"}}>
              {/* Google */}
              <button onClick={handleGoogle} disabled={loading} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", padding:"16px", borderRadius:"14px", border:`1.5px solid ${border}`, background:input, color:text, fontSize:"16px", fontWeight:600, cursor:"pointer", transition:"opacity 0.2s"}}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                <div style={{flex:1, height:"1px", background:border}}/>
                <span style={{fontSize:"13px", color:text2}}>or</span>
                <div style={{flex:1, height:"1px", background:border}}/>
              </div>

              {/* Email */}
              <button onClick={() => setStep("email")} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", padding:"16px", borderRadius:"14px", border:`1.5px solid ${border}`, background:input, color:text, fontSize:"16px", fontWeight:600, cursor:"pointer"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Continue with Email
              </button>
            </div>

            <div style={{fontSize:"12px", color:text2, textAlign:"center", lineHeight:1.5, marginBottom:"20px"}}>
              New here? Just sign in — an account is created automatically.
            </div>

            {/* Skip */}
            <button onClick={onClose} style={{width:"100%", background:"none", border:`1px solid ${border}`, borderRadius:"12px", cursor:"pointer", padding:"12px", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", color:text2, fontSize:"14px", fontWeight:500}}>
              Continue without signing in
            </button>
            <div style={{fontSize:"12px", color:text2, textAlign:"center", marginTop:"8px"}}>Your roasts won't be saved between sessions</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Paywall({ c, onClose, onUpgrade, dark, currentPlan, preselect, upgradeError }) {
  const planIconPaths = {
    free: ["M3 8h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z","M12 8v13","M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7","M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8","M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8"],
    fired_up: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
    brutal: ["M12 2C7 2 4 5.5 4 10c0 3 1.5 5 3 6.5V19a1 1 0 0 0 1 1h1v1.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V20h2v1.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V20h1a1 1 0 0 0 1-1v-2.5c1.5-1.5 3-3.5 3-6.5 0-4.5-3-8-8-8Z","M9 10m-1.3 0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0","M15 10m-1.3 0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0","M12 12.5v2"],
  };
  const plans = [
    { id:"free", name:"Free", price:"", period:"", features:["AI Roast Feedback","5 roasts per week","Battle Mode"] },
    { id:"fired_up", name:"Fired Up", popular:true, price:"$2.99", period:"/month", features:["Unlimited Roasts","The Fix — AI rewrites your exact text","Communication Score","Progress Tracking","Full Roast History","Battle History & Performance"] },
    { id:"brutal", name:"Brutal", price:"$5.99", period:"/month", features:["Everything in Fired Up","Deep Roast — 7 Problems + 7 Fixes","All 5 Intensity Levels","Advanced Communication Insights","Hall of Fame","Brutal Badge on Share Card"] },
  ];
  const isPaidUser = currentPlan === "fired_up" || currentPlan === "brutal";

  const trustItems = [
    { d1:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", d2:"m9 12 2 2 4-4", title:"Secure payments", sub:"Cancel anytime" },
    { poly:"13 2 3 14 12 14 11 22 21 10 12 10 13 2", title:"Instant access", sub:"Start roasting now" },
    { d1:"M3 12a9 9 0 1 0 3-6.7", poly2:"3 3 3 9 9 9", title:"Risk-free", sub:"Upgrade or cancel anytime" },
  ];

  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)"}}>
      <div style={{background: dark ? "#111" : "#fff", borderRadius:"24px 24px 0 0", padding:"20px 20px 40px", width:"100%", maxWidth:"480px", maxHeight:"92vh", overflowY:"auto", position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute", top:"18px", left:"18px", width:"40px", height:"40px", borderRadius:"50%", border:"none", background: dark ? "#2A2A2A" : "#EFEFEF", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2, padding:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dark ? "#fff" : "#1A1A1A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div style={{textAlign:"center", marginBottom:"24px", paddingTop:"24px"}}>
          <div style={{width:"56px", height:"56px", borderRadius:"50%", background:"#FF450020", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px"}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          </div>
          <div style={{fontSize:"22px", fontWeight:900, marginBottom:"6px", lineHeight:1.3}}>
            <span style={{color: dark ? "#fff" : "#000"}}>Unlock the </span>
            <span style={{color:"#FF4500"}}>Full Roast</span>
          </div>
          <div style={{fontSize:"14px", color:"#888"}}>Get unlimited roasts + all premium features</div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:"10px", marginBottom:"4px"}}>
          {plans.map(p => {
            const isCurrent = p.id === currentPlan;
            const isPreselected = !isCurrent && p.id === preselect;
            return (
              <div key={p.id} style={{border:`2px solid ${isCurrent ? "#FF4500" : isPreselected ? "#FF4500" : dark ? "#2A2A2A" : "#E5E5E5"}`, borderRadius:"16px", padding:"18px 16px 16px", background: isCurrent ? "#FF450012" : isPreselected ? "#FF450008" : "transparent", cursor: isPreselected ? "default" : "pointer", position:"relative"}}
                onClick={() => !isPreselected && onUpgrade(p.id)}>
                {isCurrent && (
                  <div style={{position:"absolute", top:"-11px", right:"16px", background:"linear-gradient(135deg, #FF4500, #FF6B00)", color:"#fff", fontSize:"10px", fontWeight:800, padding:"4px 12px", borderRadius:"20px", letterSpacing:"0.5px", boxShadow:"0 2px 8px rgba(255,69,0,0.4)"}}>CURRENT PLAN</div>
                )}
                {isPreselected && (
                  <div style={{position:"absolute", top:"-11px", right:"16px", background:"linear-gradient(135deg, #FF4500, #FF6B00)", color:"#fff", fontSize:"10px", fontWeight:800, padding:"4px 12px", borderRadius:"20px", letterSpacing:"0.5px", boxShadow:"0 2px 8px rgba(255,69,0,0.4)"}}>RECOMMENDED</div>
                )}
                <div style={{display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px"}}>
                  <div style={{width:"44px", height:"44px", borderRadius:"50%", background:`${c.accent}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {planIconPaths[p.id].map((d,i) => <path key={i} d={d}/>)}
                  </svg>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                      <span style={{fontWeight:800, fontSize:"17px", color: dark ? "#fff" : "#000"}}>{p.name}</span>
                      {p.popular && (
                        <span style={{fontSize:"10px", fontWeight:800, color:"#fff", background:"#FF4500", borderRadius:"20px", padding:"3px 9px", letterSpacing:"0.3px"}}>MOST POPULAR</span>
                      )}
                    </div>
                  </div>
                  <div style={{textAlign:"right", flexShrink:0}}>
                    <span style={{fontWeight:900, fontSize:"18px", color: isCurrent ? "#FF4500" : dark ? "#fff" : "#000"}}>{p.price}</span>
                    <span style={{fontSize:"12px", fontWeight:400, color:"#888"}}>{p.period}</span>
                  </div>
                </div>
                <div style={{display:"flex", flexDirection:"column", gap:"7px"}}>
                  {p.features.map((f,i) => (
                    <div key={i} style={{display:"flex", alignItems:"flex-start", gap:"8px"}}>
                      <span style={{color:"#FF4500", fontSize:"13px", fontWeight:700, flexShrink:0, marginTop:"1px"}}>✓</span>
                      <span style={{fontSize:"13px", color: dark ? "#bbb" : "#555", lineHeight:1.4}}>{f}</span>
                    </div>
                  ))}
                </div>
                {isPreselected && (
                  <button
                    onClick={() => onUpgrade(p.id)}
                    style={{width:"100%", marginTop:"16px", padding:"14px", borderRadius:"12px", background:"#FF4500", border:"none", color:"#fff", fontSize:"15px", fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", boxShadow:"0 4px 14px rgba(255,69,0,0.35)"}}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Upgrade to Brutal — {p.price}{p.period}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!isPaidUser && (
          <button style={{width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", background:"none", border:"none", color:"#888", fontSize:"13px", cursor:"pointer", padding:"10px 8px 4px"}} onClick={onClose}>
            {(() => {
              const data = getStoredData();
              if (data && data.weekStart) {
                const resetDate = data.weekStart + 7 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                const msLeft = resetDate - now;
                if (msLeft > 0) {
                  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                  const used = data.roastsUsed || 0;
                  if (used < ROAST_WEEKLY_LIMIT) {
                    return `${ROAST_WEEKLY_LIMIT - used} free roast${ROAST_WEEKLY_LIMIT - used === 1 ? "" : "s"} left this week`;
                  }
                  return (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{`Roasts reset in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}</>);
                }
              }
              return `${ROAST_WEEKLY_LIMIT} free roasts available this week`;
            })()}
          </button>
        )}

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginTop:"16px", paddingTop:"16px", borderTop:`1px solid ${dark ? "#2A2A2A" : "#E5E5E5"}`, marginBottom:"16px"}}>
          {upgradeError && (
            <div style={{margin:"0 0 16px", padding:"12px 16px", background:"#FF450015", border:"1px solid #FF450040", borderRadius:"12px", fontSize:"13px", color:"#FF4500", fontWeight:600, textAlign:"center"}}>
              {upgradeError}
            </div>
          )}
          {trustItems.map((t,i) => (
            <div key={i} style={{textAlign:"center"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:"6px"}}>
                {t.d1 && <path d={t.d1}/>}
                {t.d2 && <path d={t.d2}/>}
                {t.poly && <polygon points={t.poly}/>}
                {t.poly2 && <polyline points={t.poly2}/>}
              </svg>
              <div style={{fontSize:"11px", fontWeight:700, color: dark ? "#fff" : "#000"}}>{t.title}</div>
              <div style={{fontSize:"10px", color:"#888", marginTop:"2px"}}>{t.sub}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", fontSize:"11px", color:"#888", textAlign:"center"}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Your payment information is always secure and encrypted.
        </div>
      </div>
    </div>
  );
}
