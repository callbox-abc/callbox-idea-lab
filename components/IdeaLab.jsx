"use client";

import { useState, useMemo, useRef } from "react";
import { callAI } from "../lib/ai";

const YEAR = new Date().getFullYear();
const RL = { US: "🦅 US", SG: "🦁 SG", AU: "🕷️ AU" };

// NOTE: holiday dates are for 2026. Update this list each year.
// SG dates follow the official MOM 2026 list.
const STATIC_HOLIDAYS = {
  US: [
    { id: "u1", name: "New Year's Day", icon: "🎆", date: "2026-01-01" },
    { id: "u2", name: "Martin Luther King Day", icon: "✊", date: "2026-01-19" },
    { id: "u4", name: "Valentine's Day", icon: "💝", date: "2026-02-14" },
    { id: "u3", name: "Presidents' Day", icon: "🏛️", date: "2026-02-16" },
    { id: "u4b", name: "Lenten Season", icon: "✝️", date: "2026-02-18 – 2026-04-02" },
    { id: "u5", name: "Easter Sunday", icon: "🐣", date: "2026-04-05" },
    { id: "u6", name: "Mother's Day", icon: "💐", date: "2026-05-10" },
    { id: "u7", name: "Memorial Day", icon: "🎖️", date: "2026-05-25" },
    { id: "u8", name: "Juneteenth", icon: "✊", date: "2026-06-19" },
    { id: "u9", name: "Independence Day", icon: "🎇", date: "2026-07-04" },
    { id: "u10", name: "Labor Day", icon: "👷", date: "2026-09-07" },
    { id: "u11", name: "Columbus Day", icon: "🧭", date: "2026-10-12" },
    { id: "u12", name: "Halloween", icon: "🎃", date: "2026-10-31" },
    { id: "u13", name: "Veterans Day", icon: "🎖️", date: "2026-11-11" },
    { id: "u14", name: "Thanksgiving", icon: "🦃", date: "2026-11-26" },
    { id: "u15", name: "Black Friday", icon: "🛍️", date: "2026-11-27" },
    { id: "u16", name: "Christmas Day", icon: "🎄", date: "2026-12-25" },
  ],
  SG: [
    { id: "s1", name: "New Year's Day", icon: "🎆", date: "2026-01-01" },
    { id: "s2", name: "Chinese New Year", icon: "🧧", date: "2026-02-17" },
    { id: "s3", name: "Chinese New Year Day 2", icon: "🧧", date: "2026-02-18" },
    { id: "s5", name: "Hari Raya Puasa", icon: "🌙", date: "2026-03-21" },
    { id: "s4", name: "Good Friday", icon: "✝️", date: "2026-04-03" },
    { id: "s6", name: "Labour Day", icon: "👷", date: "2026-05-01" },
    { id: "s8", name: "Hari Raya Haji", icon: "🌙", date: "2026-05-27" },
    { id: "s7", name: "Vesak Day", icon: "☸️", date: "2026-05-31" },
    { id: "s9", name: "National Day", icon: "🎌", date: "2026-08-09" },
    { id: "s10", name: "Deepavali", icon: "🪔", date: "2026-11-08" },
    { id: "s11", name: "Christmas Day", icon: "🎄", date: "2026-12-25" },
  ],
  AU: [
    { id: "a1", name: "New Year's Day", icon: "🎆", date: "2026-01-01" },
    { id: "a2", name: "Australia Day", icon: "🇦🇺", date: "2026-01-26" },
    { id: "a3", name: "Good Friday", icon: "✝️", date: "2026-04-03" },
    { id: "a4", name: "Easter Saturday", icon: "🐣", date: "2026-04-04" },
    { id: "a5", name: "Easter Sunday", icon: "🐣", date: "2026-04-05" },
    { id: "a6", name: "Easter Monday", icon: "🐣", date: "2026-04-06" },
    { id: "a7", name: "ANZAC Day", icon: "🌺", date: "2026-04-25" },
    { id: "a8", name: "King's Birthday", icon: "👑", date: "2026-06-08" },
    { id: "a9", name: "Melbourne Cup", icon: "🏇", date: "2026-11-03" },
    { id: "a10", name: "Christmas Day", icon: "🎄", date: "2026-12-25" },
    { id: "a11", name: "Boxing Day", icon: "🎁", date: "2026-12-26" },
  ],
};

const IND = ["Any", "IT", "SaaS", "Cybersecurity", "AI", "Cloud", "HealthTech", "FinTech"];
const SVC = ["Any", "Lead Gen", "ABM", "Event Marketing", "Webinar", "Outsourced SDR"];
const CATS = ["Lead Generation", "Event Marketing", "ABM", "Appointment Setting", "Webinar Marketing", "Cross-Border", "Outsourced SDR"];
const BTYPES = [
  { id: "listicle", label: "Listicle", min: 1500, max: 1800 },
  { id: "howto", label: "How-To", min: 1700, max: 2000 },
  { id: "article", label: "Article", min: 500, max: 800 },
  { id: "strategy", label: "Strategy", min: 1800, max: 2000 },
];
const TONES = ["Professional", "Conversational/Casual", "Informative", "Encouraging/Positive", "Witty/Humorous", "Assertive/Confident"];

const VOICE = `Role:SEO & AEO Content Strategist for Callbox Inc (callboxinc.com). Style:casual but authoritative,peer-to-peer,EEAT. Structure:Meta Title(60ch),Meta Description(155ch),H1 with primary keyword,First Fold Rule(keyword in first 50-100 words),AEO Definition Box(2-sentence Featured Snippet answer),Expert Tip callout boxes,2-3 soft CTAs + 1 hard CTA for Callbox,HubSpot stats,NEVER em dashes,Slug 3-5 words. Format:ONLY "## " headings,bold key phrases,bulleted lists.`;

const VOICE_LISTICLE = `Role:SEO & AEO Content Strategist for Callbox Inc (callboxinc.com). Style:casual but authoritative,peer-to-peer,EEAT. NEVER em dashes. Format:ONLY "## " headings,bold key phrases,bulleted lists. Structure: Hook(industry pain point,2-3 sentences) -> AEO Definition Box(2-sentence Featured Snippet) -> Main Listicle Body(categorized named players with 1-2 sentence specialty descriptions per entry) -> Industry Insight callout(market stat or trend) -> Benefits/Integration section(bulleted,quantified where possible) -> Lead Gen section(what works,ABM+multi-channel+content) -> Callbox Highlight(leads the vendor section,3-5 sentences,outcome language: deals closed,leads generated,dollar amounts) -> Competitors(1-2 sentences each,niche framing only,NO head-to-head comparison,NO comparison tables,each gets their own lane) -> Expert Tip callout -> Closing CTA. Rules: Callbox always listed first in any vendor section. Competitors described by specialty/niche only never directly compared to Callbox. Only Callbox gets outcome/results language. Vendor section sandwiched between educational content and CTAs. 2-3 soft CTAs + 1 hard CTA for Callbox.`;

const VOICE_HOWTO = `Role:SEO & AEO Content Strategist for Callbox Inc (callboxinc.com). Style:casual but authoritative,conversational,peer-to-peer,EEAT. NEVER em dashes. Format:ONLY "## " headings,bold key phrases,bulleted lists. Structure: Hook(2-3 sentence conversational opener with rhetorical question addressing a real pain point) -> "What this covers" teaser(bullet list of what reader will learn) -> AEO Definition Box(direct 2-sentence answer to the core question,quotable for AI/search snippets) -> Numbered Steps or Phases(each step has a bold label + 2-3 sub-tactics or sub-points,actionable and specific) -> Key Insight callouts(standalone pull-quote lines mid-section,italicized or bold,not in a box) -> Industry-Specific Application section(tailor the how-to per vertical or use case relevant to the topic) -> Callbox reference(woven in naturally via a case study result or outcome stat,NOT a hard vendor pitch) -> FAQ section(4-6 questions,concise AEO-optimized answers,direct,no fluff) -> Closing(2-3 lines,forward-looking,motivational,no hard sell). Rules: Steps must be actionable not theoretical. Each step should answer "how exactly" not just "what". Callbox only appears once mid-article as a soft proof point and once in the final CTA. NEVER list Callbox as one of many vendors. FAQ answers must be self-contained and answer-engine ready.`;

const VOICE_STRATEGY = `Role:SEO & AEO Content Strategist for Callbox Inc (callboxinc.com). Style:authoritative,data-forward,market-intelligence tone,EEAT. NEVER em dashes. Format:ONLY "## " headings,bold key phrases,bulleted lists. Structure: Opening(2-3 sentences,authoritative market context,NO rhetorical question,1 strong stat or market fact in first 50-100 words) -> "What this Guide Covers" section(short paragraph or bullet list framing the scope and who it is for) -> "Why This Matters in [YEAR]" section(market forces + competitive pressures + buyer behavior shifts,2-3 bullets or short paragraphs,data-backed) -> Core Strategy Pillars(4-6 named pillars or trends,NOT numbered steps,each has bold sub-label + 2-3 paragraphs + supporting data or insight callout) -> Key Insight callouts(standalone data lines mid-section,format: bold stat + 1-sentence context) -> Industry or Regional Application section(contextualizes strategy for a specific market,vertical,or geography relevant to the topic) -> "Key Takeaways" section(3-5 bullets or short paragraphs,forward-looking,synthesizes the pillars) -> Callbox closing CTA(positioned as a trusted long-term partner,references multichannel approach + proven results,NEVER listed among competitors,1 hard CTA). Rules: NO FAQ section. Strategy blogs close with Key Takeaways then Callbox CTA only. Stats must appear in at least 3 sections. Each pillar must connect back to business growth or pipeline impact. Callbox appears only in the closing section.`;

const VOICE_ARTICLE = `Role:SEO & AEO Content Strategist for Callbox Inc (callboxinc.com). Style:human,editorial,personality-driven,peer-to-peer,EEAT. NEVER em dashes. Format:ONLY "## " headings,bold key phrases,mix of short paragraphs and bullets. Structure: Hook(1-3 sentences,punchy and personality-driven, can be a relatable scenario,a bold statement,a quote,or a metaphor. NO corporate opener. Keyword must appear within first 50-100 words) -> "What this Blog Covers" section(1 short conversational paragraph telling the reader exactly what they will get,friendly tone) -> Context or Why It Matters section(2-3 short paragraphs or bullets,frames the problem or market reality,light data or observation,no heavy stats dump) -> Core Body Sections(thematic sections NOT numbered steps NOT named pillars,each uses bold inline sub-labels or questions as mini-subheadings inside flowing prose mixed with bullets,editorial and conversational throughout) -> Inline callouts(short bold questions or statements used as visual breaks inside sections) -> Regional or Audience Breakdown section(optional but include when topic has geographic or segment angle,short and specific) -> Key Takeaways section(3-5 lines max,punchy,forward-looking,no fluff) -> FAQ section(optional,include when topic has common buyer questions,4-6 questions,answers written like a real person not a bot,direct and warm) -> Closing CTA(warm and conversational,1-2 sentences + one action prompt,NO hard sell language). Rules: This is the most human and creative blog type. Humor,metaphors,and personality are encouraged. Less data-heavy than Strategy. Less instructional than How-To. Callbox appears naturally in the body once as a soft proof point and once in the closing CTA. NEVER list Callbox among competitors.`;

const lt = { bg: "#fff", sf: "#f7f7f8", cd: "#fff", bd: "#e5e5e5", tx: "#1a1a1a", ts: "#6b6b6b", ac: "#2a2a2a", tb: "#f0f0f0", tt: "#4a4a4a", ib: "#fff", tg: "#e5e5e5", ea: "#1a1a1a", eb: "#f7f7f8", et: "#1a1a1a", eA: "#fff", sT: "#2a7a2a", hc: "#fafafa" };
const dk = { bg: "#121212", sf: "#1a1a1a", cd: "#1e1e1e", bd: "#2a2a2a", tx: "#e0e0e0", ts: "#888", ac: "#e0e0e0", tb: "#2a2a2a", tt: "#aaa", ib: "#1a1a1a", tg: "#333", ea: "#e0e0e0", eb: "#1e1e1e", et: "#c0c0c0", eA: "#121212", sT: "#88cc88", hc: "#252525" };

const TOOLTIPS = {
  home: "Back to the main dashboard",
  generate: "Generate B2B blog topics and full articles using AI",
  blogpacked: "View, rewrite, and export all your saved articles",
  counter: "Count characters, words, sentences, and reading time",
  eventbased: "Pick a seasonal event to generate relevant B2B topics for that holiday or occasion",
  custom: "Enter your own blog title and keywords to generate a full article from scratch",
  abrakada: "Magically surface trending B2B topics inspired by top SEO publications",
  regenerate: "Generate a fresh set of 5 topics for this event",
  optimize: "Run an SEO audit and get an optimized version of this article",
  apply: "Replace the current article content with the optimized version",
  graphics: "Generate AI image prompt ideas for this article",
  copyall: "Copy the full article including meta, excerpt, and content to clipboard",
  download: "Download this article as a .doc file",
  bucket: "View all your saved articles",
  darkmode: "Toggle between light and dark mode",
  back: "Return to the topic list",
  star: "Save this article to your Blog Packed bucket",
  rewrite: "Rewrite this article with the selected tone and character count",
  applyrewrite: "Replace the saved article with this rewritten version",
  regionselect: "Switch between US, SG, and AU seasonal events",
  blogtype: "Choose the format. Each type follows a different structure and word count",
  industry: "Filter topics by a specific industry vertical",
  service: "Filter topics by a Callbox service type",
  tone: "Set the writing tone for the rewritten version",
  minchars: "Set the minimum character count for the rewrite",
  maxchars: "Set the maximum character count for the rewrite",
};

function parseJSON(t) {
  try {
    return JSON.parse(t.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

function safeArr(v) {
  return Array.isArray(v) ? v : typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function copyText(txt, setCp, key) {
  try {
    const el = document.createElement("textarea");
    el.value = txt;
    el.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  } catch {}
  setCp(key);
  setTimeout(() => setCp(null), 2000);
}

function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const onEnter = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    }
    setShow(true);
  };

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }} onMouseEnter={onEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y - 8,
            transform: "translate(-50%, -100%)",
            background: "#1a1a2e",
            color: "#e8e8f0",
            fontSize: 11,
            fontWeight: 500,
            padding: "5px 10px",
            borderRadius: 7,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 99999,
            boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
            letterSpacing: 0.2,
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #1a1a2e",
            }}
          />
        </span>
      )}
    </span>
  );
}

function parseBold(str, tx) {
  return str.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} style={{ color: tx }}>
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    )
  );
}

function Content({ text, t }) {
  if (!text) return null;
  return (
    <div>
      {text.split("\n").map((l, i) => {
        if (l.startsWith("## ")) {
          return (
            <h2 key={i} style={{ fontSize: 18, fontWeight: 600, margin: "22px 0 10px", color: t.tx }}>
              {parseBold(l.slice(3), t.tx)}
            </h2>
          );
        }
        if (l.startsWith("- ")) {
          return (
            <div key={i} style={{ fontSize: 14, lineHeight: 1.8, color: t.tx, paddingLeft: 16, marginBottom: 4 }}>
              {"• "}
              {parseBold(l.slice(2), t.tx)}
            </div>
          );
        }
        if (!l.trim()) return <br key={i} />;
        return (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: t.tx, marginBottom: 8 }}>
            {parseBold(l, t.tx)}
          </p>
        );
      })}
    </div>
  );
}

function Loader() {
  return (
    <div style={{ padding: "28px 0" }}>
      <div style={{ width: "75%", padding: "24px 28px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>Generating</div>
        {[82, 95, 65, 88, 50].map((w, i) => (
          <div key={i} style={{ height: 8, borderRadius: 5, background: "rgba(255,255,255,0.07)", marginBottom: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: w + "%", borderRadius: 5, background: "rgba(255,255,255,0.13)", animation: "ldA 1.8s ease " + i * 0.18 + "s infinite" }} />
          </div>
        ))}
      </div>
      <style>{"@keyframes ldA{0%,100%{opacity:.35;transform:scaleX(.97)}50%{opacity:1;transform:scaleX(1)}}"}</style>
    </div>
  );
}

export default function IdeaLab() {
  const [isDark, setDark] = useState(true);
  const [tab, setTab] = useState(0);
  const [region, setRegion] = useState("US");
  const [selEvent, setSelEvent] = useState(null);
  const events = STATIC_HOLIDAYS[region] || [];
  const [industry, setIndustry] = useState("Any");
  const [service, setService] = useState("Any");
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list");
  const [selTopic, setSelTopic] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [bucket, setBucket] = useState([]);
  const [showBucket, setShowBucket] = useState(false);
  const [graphics, setGraphics] = useState(null);
  const [gfxLoading, setGfxLoading] = useState(false);
  const [optResult, setOptResult] = useState("");
  const [optLoading, setOptLoading] = useState(false);
  const [optDone, setOptDone] = useState(false);
  const [optKw, setOptKw] = useState(null);
  const [counterText, setCounterText] = useState("");
  const [genMode, setGenMode] = useState("event");
  const [customTitle, setCustomTitle] = useState("");
  const [customPK, setCustomPK] = useState("");
  const [customSK, setCustomSK] = useState("");
  const [customCat, setCustomCat] = useState(CATS[0]);
  const [customLoading, setCustomLoading] = useState(false);
  const [abInd, setAbInd] = useState("Any");
  const [abSvc, setAbSvc] = useState("Any");
  const [abLoading, setAbLoading] = useState(false);
  const [blogType, setBlogType] = useState("article");
  const [bpTone, setBpTone] = useState("Professional");
  const [bpCharMin, setBpCharMin] = useState(null);
  const [bpCharMax, setBpCharMax] = useState(null);
  const [bpRewriting, setBpRewriting] = useState(false);
  const [bpRewriteResult, setBpRewriteResult] = useState("");
  const [bpRewriteDone, setBpRewriteDone] = useState(false);
  const [bpSelTitle, setBpSelTitle] = useState(null);
  const [aiError, setAiError] = useState("");

  const t = isDark ? dk : lt;
  const bt = BTYPES.find((b) => b.id === blogType) || BTYPES[2];
  const btP = "Type:" + bt.label + " " + bt.min + "-" + bt.max + "ch.";
  const activeVoice =
    blogType === "listicle" ? VOICE_LISTICLE : blogType === "howto" ? VOICE_HOWTO : blogType === "strategy" ? VOICE_STRATEGY : blogType === "article" ? VOICE_ARTICLE : VOICE;

  const fail = (e) => setAiError((e && e.message) || "Something went wrong. Please try again.");
  const unreadable = () => setAiError("The AI response could not be read. Please try again.");

  const toggleBucket = (tp) => setBucket((p) => (p.find((b) => b.title === tp.title) ? p.filter((b) => b.title !== tp.title) : [...p, { ...tp }]));
  const updateBucket = (tp) => setBucket((p) => p.map((b) => (b.title === tp.title ? { ...b, ...tp } : b)));
  const inBucket = (title) => bucket.some((b) => b.title === title);

  const btnS = (on) => ({
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid " + t.bd,
    background: on ? t.ac : "transparent",
    color: on ? (isDark ? "#121212" : "#fff") : t.tx,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  });
  const inpS = { padding: "10px 12px", borderRadius: 8, border: "1px solid " + t.bd, background: t.ib, color: t.tx, fontSize: 13, outline: "none", boxSizing: "border-box", width: "100%" };
  const mx = { maxWidth: 1024, margin: "0 auto" };

  const btSel = (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: t.ts }}>Blog Type</label>
      <Tip text={TOOLTIPS.blogtype}>
        <select value={blogType} onChange={(e) => setBlogType(e.target.value)} style={{ ...inpS, width: "auto" }}>
          {BTYPES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label} ({b.min}-{b.max}ch)
            </option>
          ))}
        </select>
      </Tip>
    </div>
  );

  const errBanner = aiError ? (
    <div style={mx}>
      <div style={{ margin: "12px 18px 0", padding: "10px 14px", borderRadius: 8, background: "#7f1d1d", color: "#fecaca", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <span>⚠️ {aiError}</span>
        <button onClick={() => setAiError("")} style={{ background: "none", border: "none", color: "#fecaca", cursor: "pointer", fontSize: 16 }}>
          ✕
        </button>
      </div>
    </div>
  ) : null;

  const genTopics = async (evt) => {
    if (!evt) return;
    setAiError("");
    setLoading(true);
    setTopics([]);
    try {
      const raw = await callAI(
        '5 topics for Callbox Inc about "' + evt.name + '" B2B lead gen ' + region + ". " + btP + ' Titles:"' + YEAR + '". ' + (industry !== "Any" ? "Industry:" + industry + "." : "") + (service !== "Any" ? " Service:" + service + "." : "") + " ONLY JSON [{title,hook,service,industries}]",
        1500,
        true
      );
      const parsed = parseJSON(raw);
      if (Array.isArray(parsed)) setTopics(parsed);
      else unreadable();
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  };

  const genCustom = async () => {
    if (!customTitle.trim()) return;
    setAiError("");
    setCustomLoading(true);
    const stub = { title: customTitle, service: customCat, industries: [], meta_description: "", excerpt: "", content: "" };
    setSelTopic(stub);
    setView("detail");
    setDetailLoading(true);
    setGraphics(null);
    setOptResult("");
    setOptDone(false);
    setOptKw(null);
    try {
      const raw = await callAI(
        'Blog Callbox Inc."' + customTitle + '" PK:"' + customPK + '"' + (customSK ? ' SK:"' + customSK + '"' : "") + " Cat:" + customCat + ". " + btP + " " + activeVoice + ' ONLY JSON:{meta_description,excerpt,content(' + bt.min + "-" + bt.max + 'ch,"## " only,' + YEAR + "),service,industries}",
        4096,
        true
      );
      const p = parseJSON(raw);
      if (p) {
        const full = { ...stub, ...p, title: customTitle };
        setSelTopic(full);
        setBucket((prev) => {
          const ex = prev.find((b) => b.title === customTitle);
          return ex ? prev.map((b) => (b.title === customTitle ? { ...b, ...full } : b)) : [...prev, full];
        });
      } else {
        unreadable();
      }
    } catch (e) {
      fail(e);
    } finally {
      setDetailLoading(false);
      setCustomLoading(false);
    }
  };

  const genAbrakada = async () => {
    setAiError("");
    setAbLoading(true);
    setTopics([]);
    try {
      const raw = await callAI(
        "Callbox Inc. 5 topics from Neil Patel/Moz/Search Engine Land/Semrush Blog/Ahrefs Blog/Backlinko trends. " + (abInd !== "Any" ? "Industry:" + abInd + "." : "") + (abSvc !== "Any" ? " Service:" + abSvc + "." : "") + btP + ' Titles:"' + YEAR + '". ONLY JSON:[{title,hook,service,industries,inspired_by}]',
        1500,
        true
      );
      const parsed = parseJSON(raw);
      if (Array.isArray(parsed)) setTopics(parsed);
      else unreadable();
    } catch (e) {
      fail(e);
    } finally {
      setAbLoading(false);
    }
  };

  const openDetail = async (tp) => {
    setAiError("");
    const stub = { ...tp, meta_description: "", excerpt: "", content: "" };
    setSelTopic(stub);
    setView("detail");
    setDetailLoading(true);
    setGraphics(null);
    setOptResult("");
    setOptDone(false);
    setOptKw(null);
    try {
      const raw = await callAI(
        'Blog Callbox Inc."' + tp.title + '" "' + tp.hook + '" svc:' + tp.service + ". " + btP + " " + activeVoice + ' ONLY JSON:{meta_description,excerpt,content(' + bt.min + "-" + bt.max + 'ch,"## " only,' + YEAR + ")}",
        4096,
        true
      );
      const p = parseJSON(raw);
      if (p) {
        const full = { ...stub, ...p };
        setSelTopic(full);
        setBucket((prev) => {
          const ex = prev.find((b) => b.title === tp.title);
          return ex ? prev.map((b) => (b.title === tp.title ? { ...b, ...full } : b)) : [...prev, full];
        });
      } else {
        unreadable();
      }
    } catch (e) {
      fail(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const genGraphics = async () => {
    if (!selTopic) return;
    setAiError("");
    setGfxLoading(true);
    try {
      const raw = await callAI('4 graphics:"' + selTopic.title + '".Each:{type,description,dimensions,style,ai_prompt}.ONLY JSON.', 1500, true);
      const parsed = parseJSON(raw);
      if (Array.isArray(parsed)) setGraphics(parsed);
      else {
        setGraphics([]);
        unreadable();
      }
    } catch (e) {
      setGraphics([]);
      fail(e);
    } finally {
      setGfxLoading(false);
    }
  };

  const runOptimize = async () => {
    if (!selTopic?.content) return;
    setAiError("");
    setOptLoading(true);
    setOptResult("");
    setOptDone(false);
    setOptKw(null);
    try {
      const kwRaw = await callAI(
        'SEO:"' + selTopic.title + '" Content:' + selTopic.content.substring(0, 2500) + ". ONLY JSON:{seo_score:num,seo_grade:str,primary_keywords:[{keyword,density,search_intent,volume_estimate,relevance_score}],recommendations:[str],readability_score:num}",
        1800,
        true
      );
      const kw = parseJSON(kwRaw);
      setOptKw(kw);
      setOptResult(
        await callAI(
          "Optimize Callbox article. De-humanize+SEO. Recs:" + ((kw && kw.recommendations) || []).join(";") + ". " + bt.label + ":" + bt.min + "-" + bt.max + 'ch. ONLY "## " headings. ONLY text.\n\n' + selTopic.content
        )
      );
    } catch (e) {
      fail(e);
    } finally {
      setOptLoading(false);
    }
  };

  const applyOpt = () => {
    if (!selTopic || !optResult) return;
    const updated = { ...selTopic, content: optResult };
    setSelTopic(updated);
    updateBucket(updated);
    setOptDone(true);
  };

  const runBpRewrite = async (item) => {
    if (!item?.content) return;
    setAiError("");
    setBpRewriting(true);
    setBpRewriteResult("");
    setBpRewriteDone(false);
    const charMin = bpCharMin || item.content.length - 200;
    const charMax = bpCharMax || item.content.length + 200;
    try {
      setBpRewriteResult(
        await callAI("Rewrite this Callbox blog article with a " + bpTone + " tone. Target character count: " + charMin + "-" + charMax + ' characters. Keep "## " headings only. ONLY return the rewritten article text, no preamble.\n\n' + item.content)
      );
    } catch (e) {
      fail(e);
    } finally {
      setBpRewriting(false);
    }
  };

  const applyBpRewrite = (item) => {
    if (!bpRewriteResult) return;
    const updated = { ...item, content: bpRewriteResult };
    updateBucket(updated);
    if (selTopic?.title === item.title) setSelTopic(updated);
    setBpRewriteDone(true);
  };

  const dlDoc = (tp) => {
    const safeName = (tp.title || "article").replace(/[^a-z0-9 _-]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
    const h = (tp.content || "")
      .split("\n")
      .map((l) => {
        if (l.startsWith("## ")) return "<h2>" + l.slice(3).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>") + "</h2>";
        const styled = l.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
        return l.trim() ? "<p>" + styled + "</p>" : "";
      })
      .join("");
    const b = new Blob(
      ["\ufeff", "<html><head><meta charset='utf-8'></head><body style='font-family:Arial;max-width:700px;margin:40px auto;line-height:1.7'><h1>" + (tp.title || "") + "</h1>" + h + "</body></html>"],
      { type: "application/msword" }
    );
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = (safeName || "article") + ".doc";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(u);
  };

  const cpAll = (tp) => {
    let x = (tp.title || "").toUpperCase() + "\n" + "=".repeat(40) + "\n\n";
    if (tp.meta_description) x += "Meta: " + tp.meta_description + "\n\n";
    if (tp.excerpt) x += tp.excerpt + "\n\n---\n\n";
    (tp.content || "").split("\n").forEach((l) => {
      if (l.startsWith("## ")) x += "\n" + l.slice(3).toUpperCase() + "\n---\n\n";
      else if (l.trim()) x += l + "\n\n";
    });
    x += "---\nCallbox Inc.\n";
    copyText(x, setCopied, "cpAll");
  };

  const cStats = useMemo(() => {
    const c = counterText.length;
    const w = counterText.trim() ? counterText.trim().split(/\s+/).length : 0;
    const s = counterText.trim() ? counterText.split(/[.!?]+/).filter((x) => x.trim()).length : 0;
    return { c, w, s, r: Math.max(1, Math.ceil(w / 200)) };
  }, [counterText]);

  const openFromBucket = (it) => {
    setShowBucket(false);
    setSelTopic(it);
    setTab(1);
    setView("detail");
    setDetailLoading(false);
    setGraphics(null);
    setOptResult("");
    setOptKw(null);
    setOptDone(false);
  };

  const bDraw = showBucket ? (
    <>
      <div onClick={() => setShowBucket(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 999 }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: 280, maxWidth: "85vw", height: "100vh", background: t.sf, borderLeft: "1px solid " + t.bd, zIndex: 1000, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid " + t.bd, display: "flex", justifyContent: "space-between" }}>
          <b style={{ fontSize: 14 }}>⭐ Bucket ({bucket.length})</b>
          <button onClick={() => setShowBucket(false)} style={{ background: "none", border: "none", color: t.tx, cursor: "pointer", fontSize: 16 }}>
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {bucket.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: t.ts, fontSize: 13 }}>No saved articles</div>
          ) : (
            bucket.map((it, i) => (
              <div key={i} style={{ padding: 10, borderRadius: 8, background: t.cd, border: "1px solid " + t.bd, marginBottom: 6 }}>
                <div onClick={() => openFromBucket(it)} style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {it.title}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {it.content && (
                    <Tip text={TOOLTIPS.download}>
                      <button onClick={() => dlDoc(it)} style={{ ...btnS(false), fontSize: 11, padding: "3px 8px" }}>
                        ⬇
                      </button>
                    </Tip>
                  )}
                  <Tip text="Remove from bucket">
                    <button onClick={() => toggleBucket(it)} style={{ ...btnS(false), fontSize: 11, padding: "3px 8px", color: "#ef4444" }}>
                      ✕
                    </button>
                  </Tip>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  ) : null;

  const topBar = (
    <div style={mx}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderBottom: "1px solid " + t.bd, background: t.sf, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {view === "detail" && (
            <Tip text={TOOLTIPS.back}>
              <button
                onClick={() => {
                  setView("list");
                  setSelTopic(null);
                  setGraphics(null);
                  setOptResult("");
                  setOptKw(null);
                }}
                style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + t.bd, background: "transparent", color: t.tx, cursor: "pointer", fontSize: 13 }}
              >
                ← Back
              </button>
            </Tip>
          )}
          <b
            style={{ fontSize: 17, cursor: "pointer" }}
            onClick={() => {
              setTab(0);
              setView("list");
            }}
          >
            💡 Callbox Idea Lab
          </b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tab === 1 && view === "list" && genMode === "event" && (
            <Tip text={TOOLTIPS.regionselect}>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setSelEvent(null);
                  setTopics([]);
                }}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid " + t.bd, background: t.ib, color: t.tx, fontSize: 13 }}
              >
                {Object.entries(RL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Tip>
          )}
          <Tip text={TOOLTIPS.bucket}>
            <button onClick={() => setShowBucket(!showBucket)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid " + t.bd, background: "transparent", color: "#f59e0b", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              ⭐ {bucket.length}
            </button>
          </Tip>
          <Tip text={TOOLTIPS.darkmode}>
            <button onClick={() => setDark(!isDark)} style={{ padding: "6px 14px", borderRadius: 16, border: "1px solid " + t.bd, background: t.tg, color: t.tx, cursor: "pointer", fontSize: 14 }}>
              {isDark ? "☀" : "🌙"}
            </button>
          </Tip>
        </div>
      </div>
    </div>
  );

  const TAB_TIPS = [TOOLTIPS.home, TOOLTIPS.generate, TOOLTIPS.blogpacked, TOOLTIPS.counter];
  const TAB_LABELS = ["Home", "Let's Generate!", "Blog Packed", "Char Counter"];

  const tabBar =
    view !== "detail" ? (
      <div style={mx}>
        <div style={{ display: "flex", borderBottom: "1px solid " + t.bd, background: t.sf, padding: "0 18px", overflowX: "auto" }}>
          {TAB_LABELS.map((l, i) => (
            <Tip key={i} text={TAB_TIPS[i]}>
              <button
                onClick={() => setTab(i)}
                style={{
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: tab === i ? 700 : 400,
                  color: tab === i ? t.tx : t.ts,
                  background: "transparent",
                  border: "none",
                  borderBottom: tab === i ? "2px solid " + t.ac : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {l}
              </button>
            </Tip>
          ))}
        </div>
      </div>
    ) : null;

  // ---------- Detail view ----------
  if (tab === 1 && view === "detail") {
    return (
      <div style={{ background: t.bg, minHeight: "100vh", color: t.tx, fontFamily: "system-ui" }}>
        {topBar}
        {errBanner}
        <div style={{ ...mx, padding: "24px 18px" }}>
          {detailLoading ? (
            <Loader />
          ) : (
            selTopic && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3, flex: 1, margin: 0 }}>{selTopic.title}</h1>
                  <Tip text={TOOLTIPS.star}>
                    <button onClick={() => toggleBucket(selTopic)} style={{ padding: 8, borderRadius: 8, border: "1px solid " + t.bd, background: "transparent", cursor: "pointer", fontSize: 18 }}>
                      {inBucket(selTopic.title) ? "⭐" : "☆"}
                    </button>
                  </Tip>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, background: t.ac, color: isDark ? "#121212" : "#fff", fontWeight: 600 }}>{selTopic.service}</span>
                  {selTopic.inspired_by && <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, background: "#6366f1", color: "#fff" }}>✨ {selTopic.inspired_by}</span>}
                  {safeArr(selTopic.industries).map((x, j) => (
                    <span key={j} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, background: t.tb, color: t.tt }}>
                      {x}
                    </span>
                  ))}
                </div>
                {selTopic.meta_description && (
                  <div style={{ fontSize: 13, color: t.ts, padding: "10px 14px", background: t.tb, borderRadius: 8, borderLeft: "3px solid " + t.ac, marginBottom: 12 }}>
                    <b>Meta:</b> {selTopic.meta_description}
                  </div>
                )}
                {selTopic.excerpt && (
                  <div style={{ fontSize: 13, fontStyle: "italic", color: t.ts, padding: "10px 14px", background: t.tb, borderRadius: 8, borderLeft: "3px solid " + t.ac, marginBottom: 18 }}>{selTopic.excerpt}</div>
                )}
                <Content text={selTopic.content} t={t} />

                {selTopic.content && (
                  <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <b style={{ fontSize: 16 }}>📦 Blog Packed</b>
                      {!optResult && !optLoading && (
                        <Tip text={TOOLTIPS.optimize}>
                          <button onClick={runOptimize} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#0891b2)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                            ✨ Optimize
                          </button>
                        </Tip>
                      )}
                    </div>
                    {optLoading && <Loader />}
                    {optKw && !optLoading && (
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        {[
                          ["SEO", optKw.seo_score, optKw.seo_score >= 80 ? "#22c55e" : optKw.seo_score >= 60 ? "#f59e0b" : "#ef4444"],
                          ["Read", optKw.readability_score, optKw.readability_score >= 70 ? "#22c55e" : "#f59e0b"],
                        ].map(([l, v, c], i) => (
                          <div key={i} style={{ padding: 12, borderRadius: 8, background: t.tb, textAlign: "center", flex: 1 }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
                            <div style={{ fontSize: 12, color: t.ts }}>{l}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {optResult && !optLoading && (
                      <div style={{ borderRadius: 8, border: "1px solid " + t.bd, overflow: "hidden" }}>
                        <div style={{ padding: "10px 16px", borderBottom: "1px solid " + t.bd, display: "flex", justifyContent: "space-between" }}>
                          <b style={{ fontSize: 13 }}>Optimized</b>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Tip text="Copy optimized content">
                              <button onClick={() => copyText(optResult, setCopied, "optCp")} style={{ ...btnS(false), fontSize: 12 }}>
                                {copied === "optCp" ? "✓" : "Copy"}
                              </button>
                            </Tip>
                            {!optDone ? (
                              <Tip text={TOOLTIPS.apply}>
                                <button onClick={applyOpt} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                                  Apply
                                </button>
                              </Tip>
                            ) : (
                              <span style={{ fontSize: 12, color: t.sT }}>✓ Applied</span>
                            )}
                          </div>
                        </div>
                        <div style={{ padding: 16, maxHeight: 350, overflowY: "auto" }}>
                          <Content text={optResult} t={t} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selTopic.content && (
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <b style={{ fontSize: 14 }}>🎨 Graphics</b>
                      {!graphics && (
                        <Tip text={TOOLTIPS.graphics}>
                          <button onClick={genGraphics} disabled={gfxLoading} style={{ ...btnS(true), opacity: gfxLoading ? 0.6 : 1, fontSize: 12 }}>
                            {gfxLoading ? "..." : "Generate"}
                          </button>
                        </Tip>
                      )}
                    </div>
                    {gfxLoading && <Loader />}
                    {graphics &&
                      graphics.map((g, i) => (
                        <div key={i} style={{ padding: 10, borderRadius: 8, background: t.tb, border: "1px solid " + t.bd, marginBottom: 8 }}>
                          <b style={{ fontSize: 13, color: t.ac }}>{g.type}</b>
                          <div style={{ fontSize: 12, color: t.ts, margin: "4px 0" }}>{g.description}</div>
                          {g.ai_prompt && (
                            <div style={{ position: "relative" }}>
                              <div style={{ fontSize: 11, color: t.ts, background: isDark ? "#1a1a1a" : "#f8f8f8", padding: "8px 32px 8px 10px", borderRadius: 6, fontFamily: "monospace", lineHeight: 1.4, border: "1px solid " + t.bd, wordBreak: "break-word" }}>
                                <b style={{ color: t.tt }}>{"// "}</b>
                                {g.ai_prompt}
                              </div>
                              <Tip text="Copy AI prompt">
                                <button onClick={() => copyText(g.ai_prompt, setCopied, "g" + i)} style={{ position: "absolute", top: 4, right: 4, padding: "2px 6px", borderRadius: 4, border: "1px solid " + t.bd, background: t.cd, cursor: "pointer", fontSize: 10 }}>
                                  {copied === "g" + i ? "✓" : "Copy"}
                                </button>
                              </Tip>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {selTopic.content && (
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd }}>
                    <b style={{ fontSize: 14 }}>📤 Export</b>
                    <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
                      <Tip text={TOOLTIPS.copyall}>
                        <button onClick={() => cpAll(selTopic)} style={btnS(false)}>
                          {copied === "cpAll" ? "✓ Copied!" : "📋 Copy All"}
                        </button>
                      </Tip>
                      <Tip text={TOOLTIPS.download}>
                        <button onClick={() => dlDoc(selTopic)} style={btnS(false)}>
                          ⬇ DOC
                        </button>
                      </Tip>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
        {bDraw}
      </div>
    );
  }

  // ---------- Main view ----------
  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.tx, fontFamily: "system-ui" }}>
      {topBar}
      {tabBar}
      {errBanner}
      <div style={{ ...mx, padding: 18 }}>
        {tab === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>💡 Callbox Idea Lab</h1>
            <p style={{ fontSize: 14, color: t.ts, margin: "8px auto 28px" }}>AI-powered content suite for Callbox Inc.</p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                ["🚀", "Let's Generate!", 1, TOOLTIPS.generate],
                ["📦", "Blog Packed", 2, TOOLTIPS.blogpacked],
                ["🔢", "Char Counter", 3, TOOLTIPS.counter],
              ].map(([ic, l, n, tip], i) => (
                <Tip key={i} text={tip}>
                  <div onClick={() => setTab(n)} style={{ padding: 20, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd, cursor: "pointer", textAlign: "center", width: 140 }}>
                    <div style={{ fontSize: 26 }}>{ic}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{l}</div>
                  </div>
                </Tip>
              ))}
            </div>
          </div>
        )}

        {tab === 1 && view === "list" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                ["event", "🎉 Event-Based", TOOLTIPS.eventbased],
                ["custom", "✍️ Custom Topic", TOOLTIPS.custom],
                ["abrakada", "✨ Abrakada Blog", TOOLTIPS.abrakada],
              ].map(([k, l, tip]) => (
                <Tip key={k} text={tip}>
                  <button
                    onClick={() => {
                      setGenMode(k);
                      setTopics([]);
                    }}
                    style={{ ...btnS(genMode === k), fontSize: 14, padding: "9px 18px" }}
                  >
                    {l}
                  </button>
                </Tip>
              ))}
            </div>

            {genMode === "event" && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {events.map((ev) => {
                    const a = selEvent?.id === ev.id;
                    return (
                      <Tip key={ev.id} text={"Generate topics for " + ev.name + (ev.date ? " · " + ev.date : "")}>
                        <button
                          onClick={() => {
                            setSelEvent(ev);
                            genTopics(ev);
                          }}
                          style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "1px solid " + (a ? "transparent" : t.bd), background: a ? t.ea : t.eb, color: a ? t.eA : t.et, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}
                        >
                          {ev.icon} {ev.name}
                        </button>
                      </Tip>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: t.ts }}>Industry</label>
                    <Tip text={TOOLTIPS.industry}>
                      <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...inpS, width: "auto" }}>
                        {IND.map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                      </select>
                    </Tip>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: t.ts }}>Service</label>
                    <Tip text={TOOLTIPS.service}>
                      <select value={service} onChange={(e) => setService(e.target.value)} style={{ ...inpS, width: "auto" }}>
                        {SVC.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Tip>
                  </div>
                  {btSel}
                  {selEvent && (
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <Tip text={TOOLTIPS.regenerate}>
                        <button onClick={() => genTopics(selEvent)} disabled={loading} style={{ ...btnS(true), opacity: loading ? 0.6 : 1 }}>
                          Regenerate
                        </button>
                      </Tip>
                    </div>
                  )}
                </div>
                {!selEvent && !loading && topics.length === 0 && (
                  <div style={{ padding: 40, borderRadius: 12, border: "2px dashed " + t.bd, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Pick an event above</div>
                  </div>
                )}
              </>
            )}

            {genMode === "custom" && (
              <div style={{ padding: 22, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✍️ Custom Topic</div>
                {[
                  ["Blog Title *", customTitle, setCustomTitle, "e.g. How AI Transforms B2B Lead Gen"],
                  ["Primary Keyword *", customPK, setCustomPK, "e.g. AI lead generation"],
                  ["Secondary Keywords", customSK, setCustomSK, "e.g. B2B marketing, sales"],
                ].map(([l, v, fn, ph], i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>{l}</label>
                    <input value={v} onChange={(e) => fn(e.target.value)} placeholder={ph} style={inpS} />
                  </div>
                ))}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>Category</label>
                  <select value={customCat} onChange={(e) => setCustomCat(e.target.value)} style={inpS}>
                    {CATS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 18 }}>{btSel}</div>
                <Tip text="Generate the full article using your inputs">
                  <button
                    onClick={genCustom}
                    disabled={!customTitle.trim() || !customPK.trim() || customLoading}
                    style={{ ...btnS(true), fontSize: 14, padding: "10px 28px", opacity: !customTitle.trim() || !customPK.trim() || customLoading ? 0.5 : 1 }}
                  >
                    {customLoading ? "Generating..." : "Generate"}
                  </button>
                </Tip>
              </div>
            )}

            {genMode === "abrakada" && (
              <div style={{ padding: 22, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>✨ Abrakada Blog</div>
                <div style={{ fontSize: 13, color: t.ts, marginBottom: 16 }}>Inspired by Neil Patel, Moz, Search Engine Land, Semrush Blog, Ahrefs Blog, and Backlinko.</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Industry</label>
                    <Tip text={TOOLTIPS.industry}>
                      <select value={abInd} onChange={(e) => setAbInd(e.target.value)} style={{ ...inpS, width: "auto" }}>
                        {IND.map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                      </select>
                    </Tip>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Service</label>
                    <Tip text={TOOLTIPS.service}>
                      <select value={abSvc} onChange={(e) => setAbSvc(e.target.value)} style={{ ...inpS, width: "auto" }}>
                        {SVC.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Tip>
                  </div>
                  {btSel}
                </div>
                <Tip text={TOOLTIPS.abrakada}>
                  <button onClick={genAbrakada} disabled={abLoading} style={{ ...btnS(true), fontSize: 14, padding: "10px 28px", opacity: abLoading ? 0.5 : 1 }}>
                    {abLoading ? "✨ Conjuring..." : "✨ Abrakada!"}
                  </button>
                </Tip>
              </div>
            )}

            {(loading || abLoading) && (
              <div style={{ marginTop: 18 }}>
                <Loader />
              </div>
            )}

            {!loading && !abLoading && topics.length > 0 && (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                {topics.map((tp, i) => (
                  <Tip key={i} text="Click to generate the full article">
                    <div
                      onClick={() => openDetail(tp)}
                      style={{ padding: 18, borderRadius: 12, background: t.cd, border: "1px solid " + t.bd, cursor: "pointer", width: "100%", boxSizing: "border-box" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.hc;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = t.cd;
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{tp.title}</div>
                      <div style={{ fontSize: 13, color: t.ts, marginBottom: 10 }}>{tp.hook}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: t.ac, color: isDark ? "#121212" : "#fff" }}>{tp.service}</span>
                        {tp.inspired_by && <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "#6366f1", color: "#fff" }}>✨ {tp.inspired_by}</span>}
                        {safeArr(tp.industries).map((x, j) => (
                          <span key={j} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, background: t.tb, color: t.tt }}>
                            {x}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Tip>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 2 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📦 Blog Packed</div>
            {!bucket.filter((b) => b.content).length ? (
              <div style={{ textAlign: "center", padding: 40, color: t.ts, border: "2px dashed " + t.bd, borderRadius: 12 }}>
                {"⭐ No articles yet. Generate one in \"Let's Generate!\""}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bucket
                  .filter((b) => b.content)
                  .map((it, i) => {
                    const isSel = bpSelTitle === it.title;
                    return (
                      <div key={i} style={{ borderRadius: 12, background: t.cd, border: "1px solid " + t.bd, overflow: "hidden" }}>
                        <div onClick={() => setBpSelTitle(isSel ? null : it.title)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600 }}>{it.title}</div>
                            <div style={{ fontSize: 12, color: t.ts, marginTop: 3 }}>
                              {it.service} · {it.content.length} chars
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <Tip text="Open full article view">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFromBucket(it);
                                }}
                                style={{ ...btnS(false), fontSize: 11, padding: "4px 10px" }}
                              >
                                View
                              </button>
                            </Tip>
                            <Tip text={TOOLTIPS.download}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dlDoc(it);
                                }}
                                style={{ ...btnS(false), fontSize: 11, padding: "4px 10px" }}
                              >
                                ⬇
                              </button>
                            </Tip>
                            <Tip text="Remove from bucket">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBucket(it);
                                }}
                                style={{ ...btnS(false), fontSize: 11, padding: "4px 10px", color: "#ef4444" }}
                              >
                                ✕
                              </button>
                            </Tip>
                            <span style={{ fontSize: 12, color: t.ts }}>{isSel ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {isSel && (
                          <div style={{ padding: "0 18px 18px", borderTop: "1px solid " + t.bd }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 10 }}>✏️ Rewrite Options</div>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5, color: t.ts }}>Tone</label>
                                <Tip text={TOOLTIPS.tone}>
                                  <select
                                    value={bpTone}
                                    onChange={(e) => {
                                      setBpTone(e.target.value);
                                      setBpRewriteResult("");
                                      setBpRewriteDone(false);
                                    }}
                                    style={inpS}
                                  >
                                    {TONES.map((tn) => (
                                      <option key={tn}>{tn}</option>
                                    ))}
                                  </select>
                                </Tip>
                              </div>
                              <div style={{ flex: 1, minWidth: 120 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5, color: t.ts }}>Min Chars</label>
                                <Tip text={TOOLTIPS.minchars}>
                                  <input
                                    type="number"
                                    value={bpCharMin ?? ""}
                                    onChange={(e) => {
                                      setBpCharMin(e.target.value ? parseInt(e.target.value, 10) : null);
                                      setBpRewriteResult("");
                                      setBpRewriteDone(false);
                                    }}
                                    placeholder={String(Math.max(300, it.content.length - 300))}
                                    style={inpS}
                                  />
                                </Tip>
                              </div>
                              <div style={{ flex: 1, minWidth: 120 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5, color: t.ts }}>Max Chars</label>
                                <Tip text={TOOLTIPS.maxchars}>
                                  <input
                                    type="number"
                                    value={bpCharMax ?? ""}
                                    onChange={(e) => {
                                      setBpCharMax(e.target.value ? parseInt(e.target.value, 10) : null);
                                      setBpRewriteResult("");
                                      setBpRewriteDone(false);
                                    }}
                                    placeholder={String(it.content.length + 300)}
                                    style={inpS}
                                  />
                                </Tip>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                              <Tip text={TOOLTIPS.rewrite}>
                                <button
                                  onClick={() => {
                                    setBpRewriteResult("");
                                    setBpRewriteDone(false);
                                    runBpRewrite(it);
                                  }}
                                  disabled={bpRewriting}
                                  style={{ ...btnS(true), opacity: bpRewriting ? 0.6 : 1, fontSize: 13 }}
                                >
                                  {bpRewriting ? "✨ Rewriting..." : "✨ Rewrite"}
                                </button>
                              </Tip>
                              {bpRewriteResult && !bpRewriting && !bpRewriteDone && (
                                <Tip text={TOOLTIPS.applyrewrite}>
                                  <button onClick={() => applyBpRewrite(it)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                                    Apply
                                  </button>
                                </Tip>
                              )}
                              {bpRewriteDone && <span style={{ fontSize: 13, color: t.sT, alignSelf: "center" }}>✓ Applied!</span>}
                            </div>
                            {bpRewriting && <Loader />}
                            {bpRewriteResult && !bpRewriting && (
                              <div style={{ borderRadius: 8, border: "1px solid " + t.bd, overflow: "hidden" }}>
                                <div style={{ padding: "8px 14px", borderBottom: "1px solid " + t.bd, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                                    Preview · {bpRewriteResult.length} chars · {bpTone}
                                  </span>
                                  <Tip text="Copy rewritten content">
                                    <button onClick={() => copyText(bpRewriteResult, setCopied, "bpCp_" + i)} style={{ ...btnS(false), fontSize: 11, padding: "3px 8px" }}>
                                      {copied === "bpCp_" + i ? "✓" : "Copy"}
                                    </button>
                                  </Tip>
                                </div>
                                <div style={{ padding: 14, maxHeight: 300, overflowY: "auto" }}>
                                  <Content text={bpRewriteResult} t={t} />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {tab === 3 && (
          <div>
            <b style={{ fontSize: 16 }}>🔢 Character Counter</b>
            <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
              {[
                ["Characters", cStats.c, "Total number of characters"],
                ["Words", cStats.w, "Total word count"],
                ["Sentences", cStats.s, "Estimated sentence count"],
                ["~Min Read", cStats.r, "Estimated reading time in minutes"],
              ].map(([l, v, tip], i) => (
                <Tip key={i} text={tip}>
                  <div style={{ padding: 14, borderRadius: 10, background: t.cd, border: "1px solid " + t.bd, textAlign: "center", flex: 1, cursor: "default" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: t.ac }}>{v}</div>
                    <div style={{ fontSize: 12, color: t.ts }}>{l}</div>
                  </div>
                </Tip>
              ))}
            </div>
            {bucket.filter((b) => b.content).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>Load from Bucket</label>
                <Tip text="Load a saved article into the counter">
                  <select
                    onChange={(e) => {
                      const it = bucket.find((b) => b.title === e.target.value);
                      if (it) setCounterText(it.content || "");
                    }}
                    style={inpS}
                    defaultValue=""
                  >
                    <option value="">-- Select --</option>
                    {bucket
                      .filter((b) => b.content)
                      .map((b, i) => (
                        <option key={i} value={b.title}>
                          {b.title}
                        </option>
                      ))}
                  </select>
                </Tip>
              </div>
            )}
            <textarea value={counterText} onChange={(e) => setCounterText(e.target.value)} placeholder="Paste content here..." style={{ ...inpS, minHeight: 220, resize: "vertical", lineHeight: 1.7 }} />
          </div>
        )}
      </div>
      {bDraw}
    </div>
  );
}
