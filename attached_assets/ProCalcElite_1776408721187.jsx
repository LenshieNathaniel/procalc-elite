import { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

/* ─── Brand Tokens ─────────────────────────────────────────── */
const T = {
  primary:   "#6366F1",
  primaryDim: "#4F46E5",
  success:   "#10B981",
  alert:     "#F43F5E",
  warning:   "#F97316",
  dark:      "#0F172A",
  card:      "#111827",
  cardHigh:  "#1E293B",
  border:    "#1E293B",
  borderHi:  "#334155",
  light:     "#F8FAFC",
  muted:     "#64748B",
  mutedHi:   "#94A3B8",
  text:      "#E2E8F0",
  mono:      "'JetBrains Mono', monospace",
  sans:      "'Plus Jakarta Sans', sans-serif",
};

/* ─── Helpers ───────────────────────────────────────────────── */
const usd = (n, dec = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    maximumFractionDigits: dec,
  }).format(n);

const pct = (n) => `${n.toFixed(2)}%`;
const comma = (n) => n.toLocaleString();

/* ─── Static CSS injected once ──────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #6366F1;
    --success: #10B981;
    --alert:   #F43F5E;
    --warn:    #F97316;
    --dark:    #0F172A;
    --card:    #111827;
    --border:  #1E293B;
    --text:    #E2E8F0;
    --muted:   #64748B;
  }

  html { scroll-behavior: smooth; }

  body {
    background: var(--dark);
    color: var(--text);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--dark); }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

  /* Input reset */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }

  /* Animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(400%); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    70%  { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
    100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
  }
  @keyframes blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  @keyframes ticker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  .fade-up       { animation: fadeUp 0.55s ease both; }
  .fade-up-d1    { animation: fadeUp 0.55s 0.08s ease both; }
  .fade-up-d2    { animation: fadeUp 0.55s 0.16s ease both; }
  .fade-up-d3    { animation: fadeUp 0.55s 0.24s ease both; }
  .fade-up-d4    { animation: fadeUp 0.55s 0.32s ease both; }
  .fade-up-d5    { animation: fadeUp 0.55s 0.40s ease both; }
  .fade-up-d6    { animation: fadeUp 0.55s 0.48s ease both; }

  .cursor-blink::after {
    content: '|';
    animation: blink 1s step-end infinite;
    color: var(--primary);
    margin-left: 2px;
  }

  /* Gradient shimmer for CTA */
  .shimmer-btn {
    background: linear-gradient(
      90deg,
      var(--primary) 0%,
      #818CF8 40%,
      var(--primary) 60%,
      #4F46E5 100%
    );
    background-size: 200% auto;
    animation: shimmer 3s linear infinite;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .shimmer-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(99,102,241,0.45);
  }
  .shimmer-btn:active { transform: translateY(0); }

  /* Input focus glow */
  .elite-input:focus {
    outline: none;
    border-color: var(--primary) !important;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
  }
  .elite-input:hover { border-color: #334155 !important; }

  /* Card hover */
  .diag-card {
    transition: transform 0.25s, box-shadow 0.25s;
  }
  .diag-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }

  /* Ticker */
  .ticker-wrap {
    overflow: hidden;
    white-space: nowrap;
  }
  .ticker-inner {
    display: inline-block;
    animation: ticker 28s linear infinite;
  }

  /* Grid helpers */
  .bento-grid {
    display: grid;
    gap: 16px;
  }
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }

  @media (max-width: 900px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  }
`;

/* ─── Sub-components ────────────────────────────────────────── */

function Label({ children, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{
        fontFamily: T.sans, fontSize: 11, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: T.mutedHi,
      }}>{children}</span>
      {hint && <span style={{ color: T.muted, fontSize: 10, marginLeft: 6 }}>{hint}</span>}
    </div>
  );
}

function InputField({ label, hint, value, onChange, prefix, suffix }) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)",
            fontFamily: T.mono, fontSize: 16, color: T.mutedHi, pointerEvents: "none",
          }}>{prefix}</span>
        )}
        <input
          type="number"
          className="elite-input"
          value={value}
          onChange={onChange}
          style={{
            width: "100%", height: 52,
            background: "#0A0F1A",
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text,
            fontFamily: T.mono, fontSize: 16, fontWeight: 500,
            paddingLeft: prefix ? 28 : 14,
            paddingRight: suffix ? 38 : 14,
            transition: "border-color 0.2s",
          }}
        />
        {suffix && (
          <span style={{
            position: "absolute", right: 14, top: "50%",
            transform: "translateY(-50%)",
            fontFamily: T.mono, fontSize: 13, color: T.muted, pointerEvents: "none",
          }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon, delay = "" }) {
  return (
    <div className={`fade-up${delay}`} style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "20px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: color,
        borderRadius: "12px 12px 0 0",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 8 }}>{label}</p>
          <p style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</p>}
        </div>
        {icon && <span style={{ fontSize: 22, opacity: 0.6 }}>{icon}</span>}
      </div>
    </div>
  );
}

function DiagCard({ diag, delay = "" }) {
  const colBg = diag.color === T.alert
    ? "rgba(244,63,94,0.07)"
    : diag.color === T.warning
    ? "rgba(249,115,22,0.07)"
    : "rgba(99,102,241,0.07)";

  return (
    <div className={`diag-card fade-up${delay}`} style={{
      background: T.card,
      border: `1px solid ${diag.color}44`,
      borderRadius: 14,
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow BG */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: colBg, pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: diag.color,
            boxShadow: `0 0 8px ${diag.color}`,
            animation: "pulse-ring 2s infinite",
          }} />
          <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: diag.color }}>
            {diag.type === "alert" ? "⚡ Critical Signal" : diag.type === "warning" ? "⚠ Warning Signal" : "◈ Strategic Signal"}
          </span>
        </div>

        {/* Title */}
        <h3 style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.light, marginBottom: 12, lineHeight: 1.2 }}>{diag.title}</h3>

        {/* Big Metric */}
        <div style={{
          background: `${diag.color}15`,
          border: `1px solid ${diag.color}33`,
          borderRadius: 8, padding: "12px 16px", marginBottom: 14,
        }}>
          <p style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: diag.color, lineHeight: 1 }}>{diag.metric}</p>
          <p style={{ fontFamily: T.sans, fontSize: 12, color: T.mutedHi, marginTop: 4 }}>{diag.metricLabel}</p>
        </div>

        {/* Body */}
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, lineHeight: 1.65, marginBottom: 18 }}>{diag.body}</p>

        {/* CTA */}
        <button style={{
          width: "100%", padding: "13px 20px",
          background: "transparent",
          border: `1.5px solid ${diag.color}`,
          borderRadius: 8, color: diag.color,
          fontFamily: T.sans, fontSize: 13, fontWeight: 700,
          letterSpacing: "0.05em", cursor: "pointer",
          transition: "background 0.2s, color 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = diag.color; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = diag.color; }}
        >
          {diag.cta}
        </button>
      </div>
    </div>
  );
}

/* Custom Tooltip for chart */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0D1421", border: `1px solid ${T.borderHi}`,
      borderRadius: 8, padding: "10px 14px",
    }}>
      <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, marginBottom: 6 }}>Year {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: T.mono, fontSize: 13, color: p.color, marginBottom: 2 }}>
          {p.name}: {usd(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */
export default function ProCalcElite() {
  /* Inject global styles & fonts */
  useEffect(() => {
    const id = "procalc-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = GLOBAL_CSS;
    document.head.appendChild(tag);
  }, []);

  const [inputs, setInputs] = useState({
    homeValue:   500000,
    downPayment:  80000,
    rate:           7.25,
    term:             30,
    taxes:          6000,
    insurance:      1500,
    wage:             45,
  });

  const [calculated, setCalculated] = useState(false);
  const resultsRef = useRef(null);

  const set = (k) => (e) =>
    setInputs(prev => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }));

  /* ── Amortization Engine ── */
  const D = useMemo(() => {
    const { homeValue, downPayment, rate, term, taxes, insurance, wage } = inputs;
    const loan = homeValue - downPayment;
    if (loan <= 0 || rate <= 0 || term <= 0) return null;

    const mr   = rate / 100 / 12;
    const n    = term * 12;
    const piPmt = loan * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);

    const ltv  = loan / homeValue;
    const hasPMI = ltv > 0.8;
    const pmiMonthly = hasPMI ? (loan * 0.0085) / 12 : 0;
    const taxMo  = taxes / 12;
    const insMo  = insurance / 12;
    const totalMo = piPmt + taxMo + insMo + pmiMonthly;

    let balance = loan;
    let totalInterest = 0;
    let tippingPoint  = null;
    let pmiDropMonth  = null;
    const schedule    = [];
    const annualData  = [];

    for (let mo = 1; mo <= n; mo++) {
      const interest  = balance * mr;
      const principal = piPmt - interest;
      balance        -= principal;
      totalInterest  += interest;

      if (!tippingPoint && principal >= interest) tippingPoint = mo;

      const currentLTV = Math.max(0, balance) / homeValue;
      if (hasPMI && !pmiDropMonth && currentLTV <= 0.80) pmiDropMonth = mo;

      schedule.push({ mo, interest, principal, balance: Math.max(0, balance) });

      if (mo % 12 === 0) {
        annualData.push({
          year: mo / 12,
          Interest: Math.round(interest),
          Principal: Math.round(principal),
          Balance: Math.round(Math.max(0, balance)),
        });
      }
    }

    const pmiTotal  = hasPMI ? pmiMonthly * (pmiDropMonth || n) : 0;
    const totalCost = loan + totalInterest;

    // Refi simulation @ 6.0%
    const rfRate  = 0.06 / 12;
    const rfPmt   = loan * (rfRate * Math.pow(1 + rfRate, n)) / (Math.pow(1 + rfRate, n) - 1);
    const rfSavMo  = piPmt - rfPmt;
    const rfSavTot = rfSavMo * n;

    const tippingYear = tippingPoint ? Math.ceil(tippingPoint / 12) : null;

    return {
      loan, ltv, hasPMI,
      piPmt:    Math.round(piPmt),
      pmiMonthly: Math.round(pmiMonthly),
      taxMo:    Math.round(taxMo),
      insMo:    Math.round(insMo),
      totalMo:  Math.round(totalMo),
      totalInterest: Math.round(totalInterest),
      totalCost:     Math.round(totalCost),
      tippingPoint, tippingYear,
      pmiDropMonth, pmiTotal: Math.round(pmiTotal),
      annualData,
      rfSavMo:  Math.round(rfSavMo),
      rfSavTot: Math.round(rfSavTot),
      intRatio: Math.round((totalInterest / totalCost) * 100),
      hoursInterest: Math.round(totalInterest / wage),
      hoursPMI:      Math.round(pmiTotal / wage),
      hoursRfSave:   Math.round(rfSavTot / wage),
    };
  }, [inputs]);

  /* ── Diagnostics ── */
  const diagnostics = useMemo(() => {
    if (!D) return [];
    const out = [];

    if (inputs.rate > 6.5) {
      out.push({
        type: "alert", color: T.alert,
        title: "Interest Drain Detected",
        metric: usd(D.rfSavTot),
        metricLabel: "recoverable over loan life vs 6.0% benchmark",
        body: `Your ${inputs.rate}% rate exceeds the 6.5% efficiency threshold by ${(inputs.rate - 6.5).toFixed(2)}%. At current trajectory you surrender ${usd(D.totalInterest)} — ${D.intRatio}% of total loan cost — directly to your lender. Every month of delay compounds this drain.`,
        cta: "Secure Lower Rate Now →",
      });
    }
    if (D.hasPMI) {
      out.push({
        type: "warning", color: T.warning,
        title: "PMI Trap Active",
        metric: usd(D.pmiTotal),
        metricLabel: "total dead-money premiums until 80% LTV",
        body: `Your ${pct(D.ltv * 100)} LTV locks you into PMI at ${usd(D.pmiMonthly)}/mo — insurance that protects the lender, not you. This drain runs until month ${D.pmiDropMonth ?? "—"} (year ${D.pmiDropMonth ? Math.ceil(D.pmiDropMonth / 12) : "—"}). Early equity acceleration eliminates this leak permanently.`,
        cta: "Eliminate PMI Dead Money →",
      });
    }
    if (inputs.term > 20) {
      out.push({
        type: "info", color: T.primary,
        title: "Capital Stagnation Alert",
        metric: `${comma(D.hoursInterest)} hrs`,
        metricLabel: `of your labor at $${inputs.wage}/hr surrendered to interest`,
        body: `Over ${inputs.term} years, your equity velocity is sub-optimal. The Wealth Tipping Point — where principal finally overtakes interest — doesn't arrive until Year ${D.tippingYear ?? "—"}. Every year before that milestone, the bank gains more equity than you do.`,
        cta: "Accelerate Equity Growth →",
      });
    }
    return out;
  }, [D, inputs]);

  const handleCalculate = () => {
    setCalculated(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  /* ── TICKER DATA ── */
  const tickerItems = D ? [
    `MONTHLY PAYMENT  ${usd(D.totalMo)}`,
    `TOTAL INTEREST  ${usd(D.totalInterest)}`,
    `LOAN AMOUNT  ${usd(D.loan)}`,
    `INTEREST RATIO  ${D.intRatio}%`,
    `TIPPING POINT  YR ${D.tippingYear ?? "—"}`,
    `PMI STATUS  ${D.hasPMI ? "ACTIVE ⚠" : "CLEAR ✓"}`,
  ] : [
    "PROCALC ELITE  WEALTH INTELLIGENCE ENGINE",
    "ENTER LOAN DATA TO BEGIN DIAGNOSTIC",
    "BANK-GRADE AMORTIZATION ENGINE",
    "IDENTIFY FINANCIAL LEAKS IN REAL TIME",
  ];

  /* ── Breakdown bar ── */
  const breakItems = D
    ? [
        { label: "Principal & Interest", val: D.piPmt,     color: T.primary,  w: (D.piPmt    / D.totalMo) * 100 },
        { label: "Property Tax",         val: D.taxMo,     color: T.mutedHi,  w: (D.taxMo    / D.totalMo) * 100 },
        { label: "Insurance",            val: D.insMo,     color: "#38BDF8",  w: (D.insMo    / D.totalMo) * 100 },
        ...(D.hasPMI ? [{ label: "PMI ⚠", val: D.pmiMonthly, color: T.warning, w: (D.pmiMonthly / D.totalMo) * 100 }] : []),
      ]
    : [];

  /* ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: T.dark, minHeight: "100vh", fontFamily: T.sans, color: T.text, overflowX: "hidden" }}>

      {/* ═══ HEADER ════════════════════════════════════════════ */}
      <header style={{
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(15,23,42,0.92)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo mark */}
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.primary}, #818CF8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 16px ${T.primary}66`,
          }}>
            <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14, color: "#fff" }}>MT</span>
          </div>
          <div>
            <p style={{ fontFamily: T.sans, fontWeight: 800, fontSize: 15, color: T.light, lineHeight: 1 }}>ProCalc Elite</p>
            <p style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Wealth Intelligence Engine</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: T.success,
            boxShadow: `0 0 6px ${T.success}`,
            animation: "pulse-ring 2.5s infinite",
          }} />
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.success }}>LIVE ENGINE</span>
        </div>
      </header>

      {/* ═══ TICKER ════════════════════════════════════════════ */}
      <div style={{
        background: "#080D16",
        borderBottom: `1px solid ${T.border}`,
        height: 32, overflow: "hidden",
        display: "flex", alignItems: "center",
      }}>
        <div style={{
          background: T.primary, height: "100%",
          display: "flex", alignItems: "center",
          padding: "0 16px", flexShrink: 0,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.12em" }}>DIAGNOSTIC</span>
        </div>
        <div className="ticker-wrap" style={{ flex: 1 }}>
          <div className="ticker-inner">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} style={{
                fontFamily: T.mono, fontSize: 10, color: T.mutedHi,
                marginRight: 48, letterSpacing: "0.08em",
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ HERO / INPUT ══════════════════════════════════════ */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px 40px" }}>

        {/* Hero text */}
        <div style={{ textAlign: "center", marginBottom: 40 }} className="fade-up">
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${T.primary}18`, border: `1px solid ${T.primary}44`,
            borderRadius: 20, padding: "5px 14px", marginBottom: 18,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.primary, animation: "pulse-ring 2s infinite" }} />
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.primary, letterSpacing: "0.12em", textTransform: "uppercase" }}>Financial Diagnostic Tool</span>
          </div>
          <h1 className="cursor-blink" style={{
            fontFamily: T.sans, fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 900, color: T.light,
            lineHeight: 1.15, marginBottom: 14,
          }}>
            Decode Your True<br />
            <span style={{ color: T.primary }}>Mortgage Cost</span>
          </h1>
          <p style={{ fontFamily: T.sans, fontSize: 16, color: T.mutedHi, maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
            Bank-grade amortization engine. Identify hidden financial leaks, locate your Wealth Tipping Point, and quantify the exact cost of inaction.
          </p>
        </div>

        {/* Input card */}
        <div className="fade-up-d1" style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16, overflow: "hidden",
        }}>
          {/* Card header */}
          <div style={{
            background: "#0A0F1A",
            borderBottom: `1px solid ${T.border}`,
            padding: "14px 24px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#F43F5E", "#F97316", "#10B981"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, letterSpacing: "0.08em" }}>
              mortgage_diagnostic.engine — input parameters
            </span>
          </div>

          <div style={{ padding: "28px 24px" }}>
            {/* Input grid */}
            <div className="bento-grid grid-2" style={{ marginBottom: 24 }}>
              <InputField label="Home Value" prefix="$" value={inputs.homeValue} onChange={set("homeValue")} />
              <InputField label="Down Payment" prefix="$" value={inputs.downPayment} onChange={set("downPayment")}
                hint={D ? `LTV: ${pct(D.ltv * 100)}` : ""} />
              <InputField label="Interest Rate" suffix="%" value={inputs.rate} onChange={set("rate")} hint="Annual" />
              <InputField label="Loan Term" suffix="yrs" value={inputs.term} onChange={set("term")} />
              <InputField label="Annual Property Tax" prefix="$" value={inputs.taxes} onChange={set("taxes")} />
              <InputField label="Annual Insurance" prefix="$" value={inputs.insurance} onChange={set("insurance")} />
            </div>

            {/* Hourly wage — full width */}
            <div style={{ marginBottom: 28, maxWidth: 320 }}>
              <InputField label="Your Hourly Wage" prefix="$" suffix="/hr" value={inputs.wage} onChange={set("wage")}
                hint="For labor-hours analysis" />
            </div>

            {/* CTA */}
            <button
              className="shimmer-btn"
              onClick={handleCalculate}
              style={{
                width: "100%", height: 56,
                border: "none", borderRadius: 10,
                color: "#fff",
                fontFamily: T.sans, fontSize: 16, fontWeight: 800,
                letterSpacing: "0.04em", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <span>⚡</span>
              <span>Run Full Mortgage Diagnostic</span>
            </button>

            {/* Trust bar */}
            <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
              {["Bank-Grade Math", "Zero Data Stored", "Instant Results"].map(t => (
                <span key={t} style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color: T.success }}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RESULTS ═══════════════════════════════════════════ */}
      {calculated && D && (
        <section ref={resultsRef} style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontFamily: T.mono, fontSize: 11, color: T.primary, letterSpacing: "0.15em" }}>DIAGNOSTIC REPORT</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* ── KPI CARDS ── */}
          <div className="bento-grid grid-4" style={{ marginBottom: 20 }}>
            <MetricCard label="Total Monthly" value={usd(D.totalMo)} sub="All-in payment" color={T.primary} icon="💳" delay="-d1" />
            <MetricCard label="P&I Payment"   value={usd(D.piPmt)}   sub="Principal + Interest" color="#818CF8" icon="🏦" delay="-d2" />
            <MetricCard label="Total Interest" value={usd(D.totalInterest)} sub={`${D.intRatio}% of loan cost`} color={T.alert} icon="🔥" delay="-d3" />
            <MetricCard label="Total Cost" value={usd(D.totalCost)} sub={`Loan + interest`} color={T.mutedHi} icon="📊" delay="-d4" />
          </div>

          {/* ── PAYMENT BREAKDOWN + PMI STATUS ── */}
          <div className="bento-grid grid-2" style={{ marginBottom: 20 }}>

            {/* Breakdown bar card */}
            <div className="fade-up-d1" style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "24px",
            }}>
              <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 16 }}>Monthly Payment Breakdown</p>
              {/* Stacked bar */}
              <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
                {breakItems.map(b => (
                  <div key={b.label} style={{ width: `${b.w}%`, background: b.color, transition: "width 0.8s ease" }} />
                ))}
              </div>
              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {breakItems.map(b => (
                  <div key={b.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: b.color }} />
                      <span style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi }}>{b.label}</span>
                    </div>
                    <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.text }}>{usd(b.val)}</span>
                  </div>
                ))}
                {/* Total */}
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.light }}>Total Monthly</span>
                  <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.primary }}>{usd(D.totalMo)}</span>
                </div>
              </div>
            </div>

            {/* LTV / Equity card */}
            <div className="fade-up-d2" style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "24px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 16 }}>Loan Intelligence</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { label: "Loan Amount",    val: usd(D.loan),                  color: T.text    },
                  { label: "Down Payment",   val: usd(inputs.downPayment),       color: T.success },
                  { label: "LTV Ratio",      val: pct(D.ltv * 100),             color: D.ltv > 0.8 ? T.alert : T.success },
                  { label: "PMI Status",     val: D.hasPMI ? `ACTIVE — ${usd(D.pmiMonthly)}/mo` : "CLEAR",
                                              color: D.hasPMI ? T.warning : T.success },
                  { label: "Interest Ratio", val: `${D.intRatio}% of total cost`, color: T.alert },
                  { label: "Tipping Point",  val: `Month ${D.tippingPoint ?? "—"} (Yr ${D.tippingYear ?? "—"})`,
                                              color: T.primary },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi }}>{r.label}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, color: r.color }}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── DIAGNOSTIC CARDS ── */}
          {diagnostics.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, marginTop: 12 }}>
                <div style={{ width: 3, height: 20, background: T.alert, borderRadius: 2 }} />
                <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.mutedHi }}>
                  {diagnostics.length} Financial Signal{diagnostics.length > 1 ? "s" : ""} Detected
                </p>
              </div>
              <div className={`bento-grid grid-${diagnostics.length >= 3 ? "3" : diagnostics.length}`} style={{ marginBottom: 20 }}>
                {diagnostics.map((d, i) => (
                  <DiagCard key={i} diag={d} delay={`-d${i + 1}`} />
                ))}
              </div>
            </>
          )}

          {/* ── WEALTH TIPPING POINT CHART ── */}
          <div className="fade-up-d2" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "28px 24px", marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Amortization Intelligence Map</p>
                <h3 style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.light }}>
                  Wealth Tipping Point — Year {D.tippingYear ?? "—"}
                </h3>
              </div>
              {D.tippingYear && (
                <div style={{
                  background: `${T.success}15`, border: `1px solid ${T.success}44`,
                  borderRadius: 8, padding: "10px 16px", textAlign: "right",
                }}>
                  <p style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.success }}>Year {D.tippingYear}</p>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: T.mutedHi, marginTop: 2 }}>Principal overtakes Interest</p>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={D.annualData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInterest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.alert} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={T.alert} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.success} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={T.success} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="year" tick={{ fontFamily: T.mono, fontSize: 11, fill: T.muted }} tickLine={false} axisLine={false}
                  label={{ value: "Year", position: "insideBottomRight", offset: -4, fontSize: 11, fill: T.muted, fontFamily: T.mono }} />
                <YAxis tick={{ fontFamily: T.mono, fontSize: 10, fill: T.muted }} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                {D.tippingYear && (
                  <ReferenceLine x={D.tippingYear} stroke={T.primary} strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: "Tipping Point", position: "top", fill: T.primary, fontSize: 11, fontFamily: T.mono }} />
                )}
                <Area type="monotone" dataKey="Interest"  stroke={T.alert}   strokeWidth={2} fill="url(#gInterest)"  name="Monthly Interest"  />
                <Area type="monotone" dataKey="Principal" stroke={T.success} strokeWidth={2} fill="url(#gPrincipal)" name="Monthly Principal" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
              {[
                { color: T.alert,   label: "Monthly Interest",  val: "Early payments: mostly interest" },
                { color: T.success, label: "Monthly Principal", val: "Accelerates after tipping point"  },
                { color: T.primary, label: "Tipping Point",     val: `Year ${D.tippingYear ?? "—"} milestone`     },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 3, background: l.color, borderRadius: 2 }} />
                  <div>
                    <p style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 600, color: T.text }}>{l.label}</p>
                    <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>{l.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── LABOR RECLAIMED ── */}
          <div className="fade-up-d3" style={{
            background: `linear-gradient(135deg, #0A0F1A 0%, #0D1220 100%)`,
            border: `1px solid ${T.primary}44`,
            borderRadius: 14, padding: "28px 24px", marginBottom: 20,
            position: "relative", overflow: "hidden",
          }}>
            {/* BG accent */}
            <div style={{
              position: "absolute", top: -40, right: -40,
              width: 200, height: 200, borderRadius: "50%",
              background: `${T.primary}08`,
              pointerEvents: "none",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>⏱</span>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>Labor Reclaimed Analysis</p>
              </div>
              <h3 style={{ fontFamily: T.sans, fontSize: 22, fontWeight: 800, color: T.light, marginBottom: 6 }}>
                The True Cost: Your Time
              </h3>
              <p style={{ fontFamily: T.sans, fontSize: 14, color: T.mutedHi, marginBottom: 24, maxWidth: 560, lineHeight: 1.6 }}>
                At ${inputs.wage}/hr, your interest burden translates directly into hours of your life surrendered to mortgage interest. This is the metric lenders never show you.
              </p>
              <div className="bento-grid grid-3">
                {[
                  {
                    icon: "🔴", label: "Hours Lost to Interest",
                    value: comma(D.hoursInterest), unit: "hrs",
                    sub: `≈ ${Math.round(D.hoursInterest / 2080)} years of full-time work`,
                    color: T.alert,
                  },
                  {
                    icon: "🟠", label: "Hours Lost to PMI",
                    value: D.hasPMI ? comma(D.hoursPMI) : "ZERO",
                    unit: D.hasPMI ? "hrs" : "",
                    sub: D.hasPMI ? "Recoverable with 20% equity" : "PMI not applicable",
                    color: T.warning,
                  },
                  {
                    icon: "🟢", label: "Hours Saved via Refi",
                    value: inputs.rate > 6.0 ? comma(D.hoursRfSave) : "OPTIMAL",
                    unit: inputs.rate > 6.0 ? "hrs" : "",
                    sub: inputs.rate > 6.0 ? "At 6.0% rate vs current" : "Rate within range",
                    color: T.success,
                  },
                ].map(m => (
                  <div key={m.label} style={{
                    background: `${m.color}10`, border: `1px solid ${m.color}33`,
                    borderRadius: 10, padding: "18px",
                  }}>
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, marginTop: 8, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{m.label}</p>
                    <p style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 700, color: m.color, lineHeight: 1 }}>
                      {m.value}<span style={{ fontSize: 14, marginLeft: 4 }}>{m.unit}</span>
                    </p>
                    <p style={{ fontFamily: T.sans, fontSize: 12, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>{m.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── STRATEGIC SUMMARY ── */}
          <div className="fade-up-d4" style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "24px",
          }}>
            <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 16 }}>Diagnostic Summary</p>
            <div className="bento-grid grid-2">
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, lineHeight: 1.7 }}>
                  Your diagnostic reveals a <strong style={{ color: T.alert }}>{D.intRatio}% interest-to-cost ratio</strong> — meaning {D.intRatio} cents of every loan dollar goes to the bank, not your equity.
                  The Wealth Tipping Point arrives at <strong style={{ color: T.primary }}>Year {D.tippingYear ?? "—"}</strong>, before which the bank builds equity faster than you do.
                </p>
              </div>
              <div>
                <p style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, lineHeight: 1.7 }}>
                  Total lifetime interest exposure: <strong style={{ color: T.alert }}>{usd(D.totalInterest)}</strong>.
                  {inputs.rate > 6.5 && ` A rate reduction to 6.0% could reclaim ${usd(D.rfSavTot)} — ${comma(D.hoursRfSave)} hours of your labor.`}
                  {D.hasPMI && ` Eliminating PMI saves an additional ${usd(D.pmiTotal)}.`}
                </p>
              </div>
            </div>
          </div>

        </section>
      )}

      {/* ═══ FOOTER ════════════════════════════════════════════ */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        padding: "20px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 5,
            background: `linear-gradient(135deg, ${T.primary}, #818CF8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 10, color: "#fff" }}>MT</span>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted }}>ProCalc Elite — Alpha v1.0</span>
        </div>
        <span style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, maxWidth: 480, textAlign: "right", lineHeight: 1.5 }}>
          For informational purposes only. Not financial advice. Calculations use standard amortization methodology. Consult a licensed mortgage professional.
        </span>
      </footer>

    </div>
  );
}
