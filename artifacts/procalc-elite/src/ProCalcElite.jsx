import { useState, useMemo, useRef, memo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import AdBanner       from "./components/AdBanner.jsx";
import AdInPagePush   from "./components/AdInPagePush.jsx";
import AdInterstitial from "./components/AdInterstitial.jsx";
import {
  calculateMonthlyPI,
  generateAmortizationSchedule,
  calculateRefinance,
} from "./lib/calcEngine.js";

/* ─── Brand Tokens ─────────────────────────────────────────── */
export const T = {
  primary:    "#6366F1",
  primaryDim: "#4F46E5",
  success:    "#10B981",
  alert:      "#F43F5E",
  warning:    "#F97316",
  dark:       "#0F172A",
  card:       "#111827",
  cardHigh:   "#1E293B",
  border:     "#1E293B",
  borderHi:   "#334155",
  light:      "#F8FAFC",
  muted:      "#64748B",
  mutedHi:    "#94A3B8",
  text:       "#E2E8F0",
  mono:       "'JetBrains Mono', monospace",
  sans:       "'Plus Jakarta Sans', sans-serif",
};

/* ─── Helpers ───────────────────────────────────────────────── */
const usd = (n, dec = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    maximumFractionDigits: dec,
  }).format(n ?? 0);

const pct   = (n) => `${Number(n).toFixed(2)}%`;
const comma = (n) => Number(n).toLocaleString();
const yrs   = (n) => n === 1 ? "1 yr" : `${n} yrs`;

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

function InputField({ label, hint, value, onChange, onBlur, prefix, suffix, ariaLabel }) {
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
          type="text"
          inputMode="decimal"
          className="elite-input"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-label={ariaLabel || label}
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

const MetricCard = memo(function MetricCard({ label, value, sub, color, icon, delay = "" }) {
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
});

const DiagCard = memo(function DiagCard({ diag, delay = "" }) {
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
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: colBg, pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
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

        <h3 style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.light, marginBottom: 12, lineHeight: 1.2 }}>{diag.title}</h3>

        <div style={{
          background: `${diag.color}15`,
          border: `1px solid ${diag.color}33`,
          borderRadius: 8, padding: "12px 16px", marginBottom: 14,
        }}>
          <p style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: diag.color, lineHeight: 1 }}>{diag.metric}</p>
          <p style={{ fontFamily: T.sans, fontSize: 12, color: T.mutedHi, marginTop: 4 }}>{diag.metricLabel}</p>
        </div>

        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, lineHeight: 1.65, marginBottom: 18 }}>{diag.body}</p>

        <button
          style={{
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
});

/* Scenario comparison card */
const ScenarioCard = memo(function ScenarioCard({ title, badge, monthly, totalInterest, duration, tippingYear, isBest, color, delay }) {
  return (
    <div className={`fade-up${delay}`} style={{
      background: T.card,
      border: `2px solid ${isBest ? color : T.border}`,
      borderRadius: 14,
      padding: "22px",
      position: "relative",
      overflow: "hidden",
    }}>
      {isBest && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: color, borderRadius: 20,
          padding: "3px 10px",
          fontFamily: T.mono, fontSize: 9, fontWeight: 700,
          color: "#fff", letterSpacing: "0.1em",
        }}>
          BEST OUTCOME
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
        <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>{title}</p>
        {badge && <span style={{ fontFamily: T.mono, fontSize: 9, color, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 6px" }}>{badge}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "Monthly Payment",  val: usd(monthly)        },
          { label: "Total Interest",   val: usd(totalInterest), highlight: true },
          { label: "Loan Duration",    val: duration            },
          { label: "Tipping Point",    val: tippingYear ? `Year ${tippingYear}` : "—" },
        ].map(r => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: T.sans, fontSize: 12, color: T.muted }}>{r.label}</span>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: r.highlight ? color : T.text }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ─── Affiliate CTA ─────────────────────────────────────────── */
const AFFILIATE_URL = "https://mobixatech.com/go/mortgage-partners";

const ActionCTA = memo(function ActionCTA({ inputs, D, T: Tk }) {
  if (!D) return null;

  let label, color, kicker;
  if (inputs.rate > 6) {
    label = "Stop the Interest Drain";
    color = Tk.alert;
    kicker = "Recommended Action";
  } else if (D.hasPMI) {
    label = "Eliminate the PMI Trap";
    color = Tk.warning;
    kicker = "Recommended Action";
  } else {
    label = "Maximize Wealth Velocity";
    color = Tk.success;
    kicker = "Optimization Path";
  }

  return (
    <div className="fade-up-d2" style={{
      background: Tk.card,
      border: `1px solid ${color}55`,
      borderRadius: 14,
      padding: "22px 24px",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 0, flex: "1 1 280px" }}>
        <p style={{
          fontFamily: Tk.mono, fontSize: 10, fontWeight: 700,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color, marginBottom: 6,
        }}>
          {kicker}
        </p>
        <p style={{ fontFamily: Tk.sans, fontSize: 14, color: Tk.mutedHi, lineHeight: 1.55, margin: 0 }}>
          Connect with a vetted lending partner to translate this diagnostic into a real-world quote.
          {" "}<span style={{ color: Tk.muted }}>Sponsored partner referral.</span>
        </p>
      </div>
      <a
        href={AFFILIATE_URL}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        aria-label={label}
        style={{
          flex: "0 0 auto",
          padding: "13px 22px",
          background: color,
          color: "#fff",
          borderRadius: 10,
          fontFamily: Tk.sans, fontSize: 14, fontWeight: 700,
          letterSpacing: "0.04em",
          textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 10,
          transition: "transform 0.15s, filter 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
      >
        <span>{label}</span>
        <span aria-hidden="true">→</span>
      </a>
    </div>
  );
});

/* ─── Chart ─────────────────────────────────────────────────── */
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

const AmortizationChart = memo(function AmortizationChart({ annualData, tippingYear }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={annualData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        {tippingYear && (
          <ReferenceLine x={tippingYear} stroke={T.primary} strokeDasharray="4 4" strokeWidth={1.5}
            label={{ value: "Tipping Point", position: "top", fill: T.primary, fontSize: 11, fontFamily: T.mono }} />
        )}
        <Area type="monotone" dataKey="Interest"  stroke={T.alert}   strokeWidth={2} fill="url(#gInterest)"  name="Monthly Interest"  />
        <Area type="monotone" dataKey="Principal" stroke={T.success} strokeWidth={2} fill="url(#gPrincipal)" name="Monthly Principal" />
      </AreaChart>
    </ResponsiveContainer>
  );
});

/* ─── Labor Reclaimed ───────────────────────────────────────── */
const LaborReclaimed = memo(function LaborReclaimed({ D, wage, rate }) {
  if (!wage || wage <= 0) {
    return (
      <section className="fade-up-d3" style={{
        background: `${T.card}`,
        border: `1px solid ${T.border}`,
        borderRadius: 14, padding: "22px 24px", marginBottom: 20,
        textAlign: "center",
      }}>
        <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>
          Enter your hourly wage above to see the Labor Reclaimed analysis.
        </span>
      </section>
    );
  }

  return (
    <section aria-label="Labor reclaimed analysis" className="fade-up-d3" style={{
      background: `linear-gradient(135deg, #0A0F1A 0%, #0D1220 100%)`,
      border: `1px solid ${T.primary}44`,
      borderRadius: 14, padding: "28px 24px", marginBottom: 20,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 200, height: 200, borderRadius: "50%",
        background: `${T.primary}08`,
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }} aria-hidden="true">⏱</span>
          <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted }}>Labor Reclaimed Analysis</p>
        </div>
        <h2 style={{ fontFamily: T.sans, fontSize: 22, fontWeight: 800, color: T.light, marginBottom: 6 }}>
          The True Cost: Your Time
        </h2>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.mutedHi, marginBottom: 24, maxWidth: 560, lineHeight: 1.6 }}>
          At ${wage}/hr, your interest burden converts directly into working hours.
          <br />
          This is the metric lenders rarely disclose.
        </p>
        <div className="bento-grid grid-3">
          {[
            {
              icon: "🔴", label: "Hours Allocated to Interest",
              value: comma(D.hoursInterest), unit: "hrs",
              sub: `Roughly ${Math.round(D.hoursInterest / 2080)} years of full-time work`,
              color: T.alert,
            },
            {
              icon: "🟠", label: "Hours Allocated to PMI",
              value: D.hasPMI ? comma(D.hoursPMI) : "None",
              unit: D.hasPMI ? "hrs" : "",
              sub: D.hasPMI ? "Recoverable once you reach 20% equity" : "PMI does not apply to this loan",
              color: T.warning,
            },
            {
              icon: "🟢", label: "Hours Reclaimed via Refinance",
              value: rate > 6.0 ? comma(D.hoursRfSave) : "Optimal",
              unit: rate > 6.0 ? "hrs" : "",
              sub: rate > 6.0 ? "Modeled against a 6.0% benchmark" : "Rate is within the optimal range",
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
    </section>
  );
});

/* ─── Main Component ────────────────────────────────────────── */
export default function ProCalcElite() {

  /* ── Defaults ──────────────────────────────────────────────── */
  const DEFAULTS = {
    homeValue:    500000,
    downPayment:   80000,
    rate:            7.25,
    term:              30,
    taxes:           6000,
    insurance:       1500,
    wage:              45,
    extraPayment:       0,
    refiRate:        6.00,
    inflationPct:       0,
  };

  /* ── URL state restore (optional shareable params) ─────────── */
  const getInitialInputs = useCallback(() => {
    const p = new URLSearchParams(window.location.search);
    const get = (key, fallback) => {
      const v = parseFloat(p.get(key));
      return isNaN(v) ? fallback : v;
    };
    return {
      homeValue:    get("hv",   DEFAULTS.homeValue),
      downPayment:  get("dp",   DEFAULTS.downPayment),
      rate:         get("ir",   DEFAULTS.rate),
      term:         get("lt",   DEFAULTS.term),
      taxes:        get("tx",   DEFAULTS.taxes),
      insurance:    get("ins",  DEFAULTS.insurance),
      wage:         get("wg",   DEFAULTS.wage),
      extraPayment: get("ep",   DEFAULTS.extraPayment),
      refiRate:     get("rr",   DEFAULTS.refiRate),
      inflationPct: get("ip",   DEFAULTS.inflationPct),
    };
  }, []);

  const [inputs, setInputs] = useState(getInitialInputs);
  const [inputStrings, setInputStrings] = useState(() => {
    const base = getInitialInputs();
    const o = {};
    for (const k in base) o[k] = String(base[k]);
    return o;
  });

  /* ── Feature toggles & UI state ───────────────────────────── */
  const [creditProfile,   setCreditProfile]   = useState(() => new URLSearchParams(window.location.search).get("cp") || "good");
  // Restore toggle state from URL — "1" = enabled, anything else = disabled
  const [biweeklyEnabled, setBiweeklyEnabled] = useState(() => new URLSearchParams(window.location.search).get("bw") === "1");
  const [inflationEnabled,setInflationEnabled] = useState(() => new URLSearchParams(window.location.search).get("ie") === "1");
  const [amortOpen,       setAmortOpen]       = useState(false);
  const [amortLimit,      setAmortLimit]      = useState(60);
  const [calculated,      setCalculated]      = useState(false);
  const [interstitialTriggered, setInterstitialTriggered] = useState(false);
  const resultsRef = useRef(null);

  // Auto-calculate on load when URL params are present (shareable links show results immediately)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("hv")) {
      setCalculated(true);
    }
  }, []);

  /* ── Input handlers ────────────────────────────────────────── */
  const handleInput = useCallback((k) => (e) => {
    let raw = e.target.value.replace(/[^0-9.]/g, "");
    const firstDot = raw.indexOf(".");
    if (firstDot !== -1) {
      raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, "");
    }
    if (raw.length > 1 && raw[0] === "0" && raw[1] !== ".") {
      raw = raw.replace(/^0+/, "") || "0";
    }
    setInputStrings(prev => ({ ...prev, [k]: raw }));
    const parsed = parseFloat(raw);
    setInputs(prev => ({ ...prev, [k]: isNaN(parsed) ? 0 : parsed }));
  }, []);

  const handleBlur = useCallback((k) => () => {
    setInputStrings(prev => {
      if (prev[k] === "" || prev[k] === ".") return { ...prev, [k]: "0" };
      return prev;
    });
    setInputs(prev => (isNaN(prev[k]) ? { ...prev, [k]: 0 } : prev));
  }, []);

  /* ── Validation helpers ────────────────────────────────────── */
  const validationErrors = useMemo(() => {
    const e = [];
    if (inputs.homeValue <= 0)             e.push("Home value must be greater than $0.");
    if (inputs.downPayment > inputs.homeValue) e.push("Down payment cannot exceed home value.");
    if (inputs.rate <= 0)                  e.push("Interest rate must be greater than 0%.");
    if (inputs.rate >= 50)                 e.push("Interest rate must be below 50%.");
    if (inputs.term <= 0)                  e.push("Loan term must be greater than 0 years.");
    if (inputs.term > 50)                  e.push("Loan term cannot exceed 50 years.");
    return e;
  }, [inputs]);

  const isZeroDown = inputs.downPayment === 0 && inputs.homeValue > 0;
  const isHighLTV  = inputs.homeValue > 0
    && (inputs.homeValue - inputs.downPayment) / inputs.homeValue > 0.95;

  /* ── BASE amortization (no extra, monthly) ─────────────────── */
  const D = useMemo(() => {
    if (validationErrors.length > 0) return null;
    const { homeValue, downPayment, rate, term, taxes, insurance, wage, inflationPct } = inputs;

    const loan = homeValue - downPayment;
    if (loan <= 0) return null;

    const sched = generateAmortizationSchedule({
      loanAmount:     loan,
      annualRate:     rate / 100,
      termYears:      term,
      extraMonthly:   0,
      biweekly:       false,
      creditProfile,
      homeValue,
      annualTaxes:    taxes,
      annualInsurance: insurance,
      inflationPct:   inflationEnabled ? inflationPct : 0,
    });
    if (!sched) return null;

    /* Refi benchmark @ 6.0% for diagnostics / labor display (same formula as before) */
    const rfMr     = 0.06 / 12;
    const rfN      = term * 12;
    const rfPmtRaw = loan * (rfMr * Math.pow(1 + rfMr, rfN)) / (Math.pow(1 + rfMr, rfN) - 1);
    const rfSavMo  = sched.piPmtExact - rfPmtRaw;
    const rfSavTot = rfSavMo * rfN;

    return {
      loan,
      ...sched,
      rfSavMo:       Math.round(rfSavMo),
      rfSavTot:      Math.round(rfSavTot),
      hoursInterest: wage > 0 ? Math.round(sched.totalInterest / wage) : 0,
      hoursPMI:      (wage > 0 && sched.hasPMI) ? Math.round(sched.totalPMI / wage) : 0,
      hoursRfSave:   wage > 0 ? Math.round(Math.max(rfSavTot, 0) / wage) : 0,
    };
  }, [inputs, creditProfile, inflationEnabled, validationErrors]);

  /* ── EXTRA PAYMENT scenario ────────────────────────────────── */
  const extraD = useMemo(() => {
    if (!D || inputs.extraPayment <= 0 || biweeklyEnabled) return null;
    const { homeValue, downPayment, rate, term, taxes, insurance, inflationPct } = inputs;
    const loan = homeValue - downPayment;
    return generateAmortizationSchedule({
      loanAmount:     loan,
      annualRate:     rate / 100,
      termYears:      term,
      extraMonthly:   inputs.extraPayment,
      biweekly:       false,
      creditProfile,
      homeValue,
      annualTaxes:    taxes,
      annualInsurance: insurance,
      inflationPct:   inflationEnabled ? inflationPct : 0,
    });
  }, [D, inputs, creditProfile, inflationEnabled, biweeklyEnabled]);

  /* ── TRUE BIWEEKLY scenario ────────────────────────────────── */
  const biweeklyD = useMemo(() => {
    if (!D || !biweeklyEnabled) return null;
    const { homeValue, downPayment, rate, term, taxes, insurance } = inputs;
    const loan = homeValue - downPayment;
    return generateAmortizationSchedule({
      loanAmount:     loan,
      annualRate:     rate / 100,
      termYears:      term,
      extraMonthly:   inputs.extraPayment, // converted to biweekly equiv inside engine
      biweekly:       true,
      creditProfile,
      homeValue,
      annualTaxes:    taxes,
      annualInsurance: insurance,
      inflationPct:   0,
    });
  }, [D, inputs, creditProfile, biweeklyEnabled]);

  /* ── REFINANCE scenario ────────────────────────────────────── */
  const refiD = useMemo(() => {
    if (!D || !inputs.refiRate || inputs.refiRate <= 0) return null;
    return calculateRefinance(D.loan, inputs.refiRate / 100);
  }, [D, inputs.refiRate]);

  /* ── Diagnostics ───────────────────────────────────────────── */
  const diagnostics = useMemo(() => {
    if (!D) return [];
    const out = [];

    if (inputs.rate > 6.5) {
      out.push({
        type: "alert", color: T.alert,
        title: "Interest Drain Detected",
        metric: usd(D.rfSavTot),
        metricLabel: "recoverable vs a 6.0% benchmark rate",
        body: `Your ${inputs.rate}% rate is ${(inputs.rate - 6.5).toFixed(2)} points above the 6.5% efficiency threshold. Over the life of the loan, ${usd(D.totalInterest)} — ${D.intRatio}% of total cost — is paid to the lender as interest.`,
        cta: "Explore Refinance Options",
      });
    }
    if (D.hasPMI) {
      out.push({
        type: "warning", color: T.warning,
        title: "PMI Premium Active",
        metric: usd(D.totalPMI),
        metricLabel: "in PMI premiums until you reach 80% LTV",
        body: `Your ${pct(D.ltv * 100)} LTV requires PMI at ${usd(D.pmiMonthly)}/mo (${(D.pmiAnnualRate * 100).toFixed(2)}% — ${creditProfile} credit profile). Coverage protects the lender, not you, and continues until month ${D.pmiDropMonth ?? "—"} (Year ${D.pmiDropMonth ? Math.ceil(D.pmiDropMonth / 12) : "—"}).`,
        cta: "See PMI Removal Strategies",
      });
    }
    if (inputs.term > 20) {
      out.push({
        type: "info", color: T.primary,
        title: "Equity Velocity Notice",
        metric: inputs.wage > 0 ? `${comma(D.hoursInterest)} hrs` : usd(D.totalInterest),
        metricLabel: inputs.wage > 0 ? `of labor at $${inputs.wage}/hr allocated to interest` : "total interest over loan life",
        body: `Across a ${inputs.term}-year term, principal does not overtake interest until Year ${D.tippingYear ?? "—"}. Until that milestone, the lender's equity grows faster than yours.`,
        cta: "View Acceleration Strategies",
      });
    }
    return out;
  }, [D, inputs, creditProfile]);

  /* ── Scenario comparison data ──────────────────────────────── */
  const scenarios = useMemo(() => {
    if (!D) return [];
    const base = {
      id:            "base",
      title:         "Base Loan",
      badge:         null,
      monthly:       D.piPmt,
      totalInterest: D.totalInterest,
      duration:      yrs(inputs.term),
      tippingYear:   D.tippingYear,
      color:         T.primary,
      delay:         "-d1",
    };

    const extra = extraD ? {
      id:            "extra",
      title:         "Extra Payment",
      badge:         `+${usd(inputs.extraPayment)}/mo`,
      monthly:       D.piPmt + inputs.extraPayment,
      totalInterest: extraD.totalInterest,
      duration:      `${Math.floor(extraD.actualMonths / 12)} yrs ${extraD.actualMonths % 12} mo`,
      tippingYear:   extraD.tippingYear,
      color:         T.success,
      delay:         "-d2",
    } : null;

    const bw = biweeklyD ? {
      id:            "biweekly",
      title:         inputs.extraPayment > 0 ? "Biweekly + Extra" : "True Biweekly",
      badge:         inputs.extraPayment > 0
        ? `${usd(biweeklyD.bwPmt)} + ${usd(biweeklyD.extraBiweekly)}/2wk`
        : `${usd(biweeklyD.bwPmt)}/2wk`,
      monthly:       biweeklyD.piPmt,
      totalInterest: biweeklyD.totalInterest,
      duration:      `${biweeklyD.actualYears} yrs`,
      tippingYear:   biweeklyD.tippingYear,
      color:         "#38BDF8",
      delay:         "-d2",
    } : null;

    const refi = refiD ? {
      id:            "refi",
      title:         `Refinance @ ${inputs.refiRate}%`,
      badge:         "New 30-yr term",
      monthly:       refiD.newPiPmt,
      totalInterest: refiD.totalInterest,
      duration:      yrs(refiD.termYears),
      tippingYear:   refiD.tippingYear,
      color:         T.warning,
      delay:         "-d3",
    } : null;

    const list = [base, extra, bw, refi].filter(Boolean);
    const bestInterest = Math.min(...list.map(s => s.totalInterest));
    return list.map(s => ({ ...s, isBest: s.totalInterest === bestInterest }));
  }, [D, extraD, biweeklyD, refiD, inputs]);

  /* ── URL encode on calculate ───────────────────────────────── */
  const encodeURL = useCallback(() => {
    const { homeValue, downPayment, rate, term, taxes, insurance, wage, extraPayment, refiRate, inflationPct } = inputs;
    const p = new URLSearchParams({
      hv:  homeValue,
      dp:  downPayment,
      ir:  rate,
      lt:  term,
      tx:  taxes,
      ins: insurance,
      wg:  wage,
      ep:  extraPayment,
      rr:  refiRate,
      ip:  inflationPct,
      cp:  creditProfile,
      bw:  biweeklyEnabled  ? "1" : "0",
      ie:  inflationEnabled ? "1" : "0",
    });
    window.history.replaceState({}, "", `?${p.toString()}`);
  }, [inputs, creditProfile, biweeklyEnabled, inflationEnabled]);

  /* ── Handle calculate ──────────────────────────────────────── */
  const handleCalculate = () => {
    setCalculated(true);
    setInterstitialTriggered(true);
    setAmortLimit(60);
    encodeURL();
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  /* ── Ticker ─────────────────────────────────────────────────── */
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

  /* ── Breakdown bar ──────────────────────────────────────────── */
  const breakItems = D ? [
    { label: "Principal & Interest", val: D.piPmt,     color: T.primary,  w: (D.piPmt    / D.totalMo) * 100 },
    { label: "Property Tax",         val: D.taxMo,     color: T.mutedHi,  w: (D.taxMo    / D.totalMo) * 100 },
    { label: "Insurance",            val: D.insMo,     color: "#38BDF8",  w: (D.insMo    / D.totalMo) * 100 },
    ...(D.hasPMI ? [{ label: "PMI ⚠", val: D.pmiMonthly, color: T.warning, w: (D.pmiMonthly / D.totalMo) * 100 }] : []),
  ] : [];

  /* ── Amortization table rows ────────────────────────────────── */
  const tableRows = (biweeklyEnabled && biweeklyD) ? biweeklyD.rows
    : (extraD) ? extraD.rows
    : D?.rows ?? [];

  /* ─── Render ──────────────────────────────────────────────── */
  return (
    <>
      <style>{`
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

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--dark); }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

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

        .fade-up    { animation: fadeUp 0.55s ease both; }
        .fade-up-d1 { animation: fadeUp 0.55s 0.08s ease both; }
        .fade-up-d2 { animation: fadeUp 0.55s 0.16s ease both; }
        .fade-up-d3 { animation: fadeUp 0.55s 0.24s ease both; }
        .fade-up-d4 { animation: fadeUp 0.55s 0.32s ease both; }
        .fade-up-d5 { animation: fadeUp 0.55s 0.40s ease both; }
        .fade-up-d6 { animation: fadeUp 0.55s 0.48s ease both; }

        .cursor-blink::after {
          content: '|';
          animation: blink 1s step-end infinite;
          color: var(--primary);
          margin-left: 2px;
        }

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
        .shimmer-btn:active {
          transform: scale(0.97) translateY(0);
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        }

        .elite-input:focus {
          outline: none;
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.18);
        }
        .elite-input:hover { border-color: #334155 !important; }
        .elite-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          cursor: pointer;
        }

        .diag-card { transition: transform 0.25s, box-shadow 0.25s; }
        .diag-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }
        .diag-card:active {
          transform: scale(0.98);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .ticker-wrap  { overflow: hidden; white-space: nowrap; }
        .ticker-inner { display: inline-block; animation: ticker 28s linear infinite; }

        .bento-grid { display: grid; gap: 16px; }
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

        .amort-table { width: 100%; border-collapse: collapse; }
        .amort-table th {
          fontFamily: ${T.mono}; font-size: 10px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: ${T.muted}; padding: 10px 12px;
          border-bottom: 1px solid ${T.border}; text-align: right;
        }
        .amort-table th:first-child { text-align: left; }
        .amort-table td {
          font-family: 'JetBrains Mono', monospace; font-size: 12px;
          color: ${T.mutedHi}; padding: 9px 12px; text-align: right;
          border-bottom: 1px solid ${T.border}22;
        }
        .amort-table td:first-child { color: ${T.muted}; text-align: left; }
        .amort-table tr:hover td { background: ${T.cardHigh}; }

        .footer-link:hover,
        .footer-link:focus-visible {
          color: ${T.light};
          text-decoration: underline;
          text-underline-offset: 3px;
          outline: none;
        }

        @media (max-width: 520px) {
          .footer-nav { flex-direction: column; gap: 12px; }
        }
      `}</style>

      <main style={{ background: T.dark, minHeight: "100vh", fontFamily: T.sans, color: T.text, overflowX: "hidden" }}>

        {/* ═══ HEADER ════════════════════════════════════════════ */}
        <header style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "0 24px", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(15,23,42,0.92)",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <p style={{ fontFamily: T.sans, fontSize: 16, color: T.mutedHi, maxWidth: 540, margin: "0 auto", lineHeight: 1.65 }}>
              A bank-grade amortization engine that surfaces hidden interest drain,
              <br />
              pinpoints your Wealth Tipping Point, and quantifies the cost of inaction.
            </p>
          </div>

          {/* Input card */}
          <div className="fade-up-d1" style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 16, overflow: "hidden",
          }}>
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

              {/* ── Core inputs ── */}
              <div className="bento-grid grid-2" style={{ marginBottom: 24 }}>
                <InputField label="Home Value"          prefix="$"   value={inputStrings.homeValue}   onChange={handleInput("homeValue")}   onBlur={handleBlur("homeValue")}   ariaLabel="Home value in US dollars" />
                <InputField label="Down Payment"        prefix="$"   value={inputStrings.downPayment} onChange={handleInput("downPayment")} onBlur={handleBlur("downPayment")} ariaLabel="Down payment in US dollars"
                  hint={D ? `LTV: ${pct(D.ltv * 100)}` : ""} />
                <InputField label="Interest Rate"       suffix="%"   value={inputStrings.rate}        onChange={handleInput("rate")}        onBlur={handleBlur("rate")}        ariaLabel="Annual interest rate percentage" hint="Annual" />
                <InputField label="Loan Term"           suffix="yrs" value={inputStrings.term}        onChange={handleInput("term")}        onBlur={handleBlur("term")}        ariaLabel="Loan term in years" />
                <InputField label="Annual Property Tax" prefix="$"   value={inputStrings.taxes}       onChange={handleInput("taxes")}       onBlur={handleBlur("taxes")}       ariaLabel="Annual property tax in US dollars" />
                <InputField label="Annual Insurance"    prefix="$"   value={inputStrings.insurance}   onChange={handleInput("insurance")}   onBlur={handleBlur("insurance")}   ariaLabel="Annual homeowners insurance in US dollars" />
              </div>

              <div style={{ marginBottom: 24, maxWidth: 320 }}>
                <InputField label="Your Hourly Wage" prefix="$" suffix="/hr" value={inputStrings.wage} onChange={handleInput("wage")} onBlur={handleBlur("wage")}
                  ariaLabel="Your hourly wage in US dollars" hint="For labor-hours analysis" />
              </div>

              {/* ── Divider ── */}
              <div style={{ borderTop: `1px solid ${T.border}`, marginBottom: 24 }} />
              <p style={{ fontFamily: T.mono, fontSize: 10, color: T.primary, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 20 }}>
                Scenario Engine
              </p>

              {/* ── Credit Profile + Extra Payment ── */}
              <div className="bento-grid grid-2" style={{ marginBottom: 20 }}>
                <div>
                  <Label hint="Affects PMI rate calculation">Credit Profile</Label>
                  <select
                    value={creditProfile}
                    onChange={e => setCreditProfile(e.target.value)}
                    aria-label="Credit profile for PMI calculation"
                    className="elite-input elite-select"
                    style={{
                      width: "100%", height: 52,
                      background: "#0A0F1A",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      color: T.text,
                      fontFamily: T.mono, fontSize: 14, fontWeight: 500,
                      padding: "0 14px",
                    }}
                  >
                    <option value="excellent">Excellent (720+) — 0.45% PMI</option>
                    <option value="good">Good (680–719) — 0.85% PMI</option>
                    <option value="fair">Fair (620–679) — 1.25% PMI</option>
                  </select>
                </div>
                <InputField label="Extra Monthly Payment" prefix="$" hint="Applied to principal"
                  value={inputStrings.extraPayment} onChange={handleInput("extraPayment")} onBlur={handleBlur("extraPayment")}
                  ariaLabel="Extra monthly principal payment" />
              </div>

              {/* ── Refinance Rate ── */}
              <div style={{ marginBottom: 20, maxWidth: 320 }}>
                <InputField label="Refinance Simulation Rate" suffix="%" hint="New rate to compare (new 30-yr term)"
                  value={inputStrings.refiRate} onChange={handleInput("refiRate")} onBlur={handleBlur("refiRate")}
                  ariaLabel="Refinance simulation rate" />
              </div>

              {/* ── Biweekly Toggle ── */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                marginBottom: 16, cursor: "pointer",
                background: biweeklyEnabled ? `${T.primary}10` : "#0A0F1A",
                border: `1px solid ${biweeklyEnabled ? T.primary + "55" : T.border}`,
                borderRadius: 8, padding: "14px 16px",
                transition: "background 0.2s, border-color 0.2s",
              }}>
                <input
                  type="checkbox"
                  checked={biweeklyEnabled}
                  onChange={e => setBiweeklyEnabled(e.target.checked)}
                  style={{ marginTop: 2, accentColor: T.primary, width: 16, height: 16, cursor: "pointer" }}
                />
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                    Enable True Biweekly Payments
                  </p>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
                    26 payments/year at exact biweekly rate — not the common "13th payment" approximation.
                    {biweeklyEnabled && inputs.extraPayment > 0 && (
                      <span style={{ color: "#38BDF8" }}>
                        {" "}Extra payment converted: ${(inputs.extraPayment * 12 / 26).toFixed(2)}/2wk (same annual principal as ${inputs.extraPayment}/mo).
                      </span>
                    )}
                  </p>
                </div>
              </label>

              {/* ── Tax & Insurance Inflation ── */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                marginBottom: inflationEnabled ? 12 : 20, cursor: "pointer",
                background: inflationEnabled ? `${T.warning}0A` : "#0A0F1A",
                border: `1px solid ${inflationEnabled ? T.warning + "44" : T.border}`,
                borderRadius: 8, padding: "14px 16px",
                transition: "background 0.2s, border-color 0.2s",
              }}>
                <input
                  type="checkbox"
                  checked={inflationEnabled}
                  onChange={e => setInflationEnabled(e.target.checked)}
                  style={{ marginTop: 2, accentColor: T.warning, width: 16, height: 16, cursor: "pointer" }}
                />
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                    Apply Annual Increase to Tax &amp; Insurance
                  </p>
                  <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted }}>
                    Projected monthly payment may increase over time.
                  </p>
                </div>
              </label>
              {inflationEnabled && (
                <div style={{ maxWidth: 220, marginBottom: 20, paddingLeft: 4 }}>
                  <InputField label="Annual Increase Rate" suffix="%" hint="Applied from Year 2 onward"
                    value={inputStrings.inflationPct} onChange={handleInput("inflationPct")} onBlur={handleBlur("inflationPct")}
                    ariaLabel="Annual inflation rate for taxes and insurance" />
                </div>
              )}

              {/* ── Zero-down warning ── */}
              {isZeroDown && (
                <div role="alert" style={{
                  background: `${T.alert}0D`, border: `1px solid ${T.alert}44`,
                  borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                  fontFamily: T.sans, fontSize: 12, color: T.alert,
                }}>
                  ⚠ High-risk loan: LTV = 100%. PMI will be elevated based on your credit profile.
                </div>
              )}
              {isHighLTV && !isZeroDown && (
                <div role="alert" style={{
                  background: `${T.warning}0D`, border: `1px solid ${T.warning}44`,
                  borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                  fontFamily: T.sans, fontSize: 12, color: T.warning,
                }}>
                  ⚠ LTV above 95%: minimum PMI rate floor of 0.85% applies.
                </div>
              )}

              {/* ── Validation errors ── */}
              {validationErrors.length > 0 && (
                <div role="status" aria-live="polite" style={{
                  background: `${T.primary}0D`, border: `1px solid ${T.primary}33`,
                  borderRadius: 8, padding: "12px 16px", marginBottom: 20,
                }}>
                  {validationErrors.map((e, i) => (
                    <p key={i} style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, marginBottom: i < validationErrors.length - 1 ? 4 : 0 }}>
                      {e}
                    </p>
                  ))}
                </div>
              )}

              <button
                className="shimmer-btn"
                onClick={handleCalculate}
                disabled={!D}
                aria-label="Run mortgage diagnostic"
                style={{
                  width: "100%", height: 56,
                  border: "none", borderRadius: 10,
                  color: "#fff",
                  fontFamily: T.sans, fontSize: 16, fontWeight: 800,
                  letterSpacing: "0.04em", cursor: D ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  opacity: D ? 1 : 0.5,
                }}
              >
                <span aria-hidden="true">→</span>
                <span>Run Diagnostic</span>
              </button>

              <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
                {["Bank-Grade Precision", "No Data Stored", "Instant Results"].map(t => (
                  <span key={t} style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: T.success }} aria-hidden="true">✓</span> {t}
                  </span>
                ))}
              </div>

              <div style={{
                marginTop: 18, textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{
                  fontFamily: T.mono, fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: T.success,
                }}>
                  Privacy-First
                </span>
                <p style={{ fontFamily: T.sans, fontSize: 11, color: T.muted, lineHeight: 1.6, margin: 0 }}>
                  All calculations run locally in your browser.
                  <br />
                  No data is collected, stored, or transmitted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ AD: Interstitial overlay (Monetag) — once per session ══ */}
        <AdInterstitial triggered={interstitialTriggered} onClose={() => {}} />

        {/* ═══ RESULTS ════════════════════════════════════════════ */}
        {calculated && D && (
          <section ref={resultsRef} aria-live="polite" aria-label="Mortgage diagnostic report" style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>

            {/* ── AD PLACEMENT 1: Leaderboard (Adsterra) ── */}
            <AdBanner style={{ width: "100%", maxWidth: 728, height: "auto", minHeight: 90, marginBottom: 24 }} />

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.primary, letterSpacing: "0.15em" }}>DIAGNOSTIC REPORT</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>

            {/* ── KPI CARDS ── */}
            <div className="bento-grid grid-4" style={{ marginBottom: 20 }}>
              <MetricCard label="Total Monthly"  value={usd(D.totalMo)}        sub="All-in payment"               color={T.primary}  icon="💳" delay="-d1" />
              <MetricCard label="P&I Payment"    value={usd(D.piPmt)}           sub="Principal + Interest"         color="#818CF8"    icon="🏦" delay="-d2" />
              <MetricCard label="Total Interest" value={usd(D.totalInterest)}   sub={`${D.intRatio}% of loan cost`} color={T.alert}   icon="🔥" delay="-d3" />
              <MetricCard label="Total Cost"     value={usd(D.totalCost)}       sub="Loan + interest"              color={T.mutedHi}  icon="📊" delay="-d4" />
            </div>

            {/* ── SCENARIO COMPARISON ENGINE ── */}
            {scenarios.length > 1 && (
              <section aria-label="Scenario comparison" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 20, background: T.primary, borderRadius: 2 }} />
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.mutedHi }}>
                    Scenario Comparison — {scenarios.length} Scenarios
                  </p>
                </div>
                <div className={`bento-grid grid-${Math.min(scenarios.length, 3)}`}>
                  {scenarios.map(s => (
                    <ScenarioCard key={s.id} {...s} />
                  ))}
                </div>
                {extraD && (
                  <div style={{
                    background: `${T.success}08`, border: `1px solid ${T.success}22`,
                    borderRadius: 8, padding: "12px 16px", marginTop: 12,
                    fontFamily: T.sans, fontSize: 12, color: T.mutedHi,
                  }}>
                    Extra payment saves <strong style={{ color: T.success }}>{usd(D.totalInterest - extraD.totalInterest)}</strong> in interest
                    and pays off <strong style={{ color: T.success }}>{extraD.yearsReduced} years</strong> early.
                  </div>
                )}
                {biweeklyD && (
                  <div style={{
                    background: "#38BDF808", border: "1px solid #38BDF822",
                    borderRadius: 8, padding: "12px 16px", marginTop: 12,
                    fontFamily: T.sans, fontSize: 12, color: T.mutedHi,
                  }}>
                    {inputs.extraPayment > 0
                      ? <>Biweekly + extra saves <strong style={{ color: "#38BDF8" }}>{usd(D.totalInterest - biweeklyD.totalInterest)}</strong> in interest
                         and pays off <strong style={{ color: "#38BDF8" }}>{biweeklyD.yearsReduced} yrs</strong> early.
                         Base: <strong style={{ color: "#38BDF8" }}>{usd(biweeklyD.bwPmt)}/2wk</strong> +
                         extra: <strong style={{ color: "#38BDF8" }}>{usd(biweeklyD.extraBiweekly)}/2wk</strong> (${inputs.extraPayment}/mo × 12 ÷ 26).</>
                      : <>True biweekly payments save <strong style={{ color: "#38BDF8" }}>{usd(D.totalInterest - biweeklyD.totalInterest)}</strong> in interest
                         and pay off <strong style={{ color: "#38BDF8" }}>{biweeklyD.yearsReduced} years</strong> early.
                         Each payment: <strong style={{ color: "#38BDF8" }}>{usd(biweeklyD.bwPmt)}</strong>.</>
                    }
                  </div>
                )}
                {refiD && (
                  <div style={{
                    background: `${T.warning}08`, border: `1px solid ${T.warning}22`,
                    borderRadius: 8, padding: "12px 16px", marginTop: 12,
                    fontFamily: T.sans, fontSize: 12, color: T.mutedHi,
                  }}>
                    Refinancing to <strong style={{ color: T.warning }}>{inputs.refiRate}%</strong> saves <strong style={{ color: T.warning }}>{usd(D.totalInterest - refiD.totalInterest)}</strong> in interest.
                    Monthly P&I drops from <strong style={{ color: T.text }}>{usd(D.piPmt)}</strong> to <strong style={{ color: T.warning }}>{usd(refiD.newPiPmt)}</strong>.{" "}
                    <span style={{ color: T.muted }}>Assumes new 30-yr term.</span>
                  </div>
                )}
              </section>
            )}

            {/* ── PAYMENT BREAKDOWN + LOAN INTELLIGENCE ── */}
            <div className="bento-grid grid-2" style={{ marginBottom: 20 }}>

              {/* Breakdown bar */}
              <div className="fade-up-d1" style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "24px",
              }}>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 16 }}>Monthly Payment Breakdown</p>
                <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
                  {breakItems.map(b => (
                    <div key={b.label} style={{ width: `${b.w}%`, background: b.color, transition: "width 0.8s ease" }} />
                  ))}
                </div>
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
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.light }}>Total Monthly</span>
                    <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.primary }}>{usd(D.totalMo)}</span>
                  </div>
                </div>
              </div>

              {/* Loan Intelligence */}
              <div className="fade-up-d2" style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: "24px",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 16 }}>Loan Intelligence</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Loan Amount",    val: usd(D.loan),                       color: T.text    },
                    { label: "Down Payment",   val: usd(inputs.downPayment),            color: T.success },
                    { label: "LTV Ratio",      val: pct(D.ltv * 100),                  color: D.ltv > 0.8 ? T.alert : T.success },
                    { label: "PMI Status",     val: D.hasPMI ? `ACTIVE — ${usd(D.pmiMonthly)}/mo` : "CLEAR",
                                                color: D.hasPMI ? T.warning : T.success },
                    ...(D.hasPMI ? [
                      { label: "PMI Rate",     val: `${(D.pmiAnnualRate * 100).toFixed(2)}% (${creditProfile})`,
                                                color: T.warning },
                      { label: "PMI Removes",  val: `Month ${D.pmiDropMonth ?? "—"} · Yr ${D.pmiDropMonth ? Math.ceil(D.pmiDropMonth / 12) : "—"}`,
                                                color: T.mutedHi },
                    ] : []),
                    { label: "Interest Ratio", val: `${D.intRatio}% of total cost`,    color: T.alert   },
                    { label: "Tipping Point",  val: `Month ${D.tippingPoint ?? "—"} (Yr ${D.tippingYear ?? "—"})`,
                                                color: T.primary },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: T.sans, fontSize: 12, color: T.mutedHi }}>{r.label}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                  {D.hasPMI && (
                    <div style={{
                      background: `${T.warning}0A`, border: `1px solid ${T.warning}33`,
                      borderRadius: 6, padding: "8px 10px", marginTop: 4,
                    }}>
                      <p style={{ fontFamily: T.sans, fontSize: 10, color: T.warning, lineHeight: 1.55 }}>
                        PMI automatically terminates at 80% LTV based on amortization schedule.
                        Actual removal may require a lender request or new appraisal.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── DIAGNOSTIC CARDS ── */}
            {diagnostics.length > 0 && (
              <section id="strategic-signals" aria-label="Strategic financial signals">
                <h2 style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
                  Strategic Financial Signals
                </h2>
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
              </section>
            )}

            {/* ── AD PLACEMENT 4: In-Page Push (Monetag) ── */}
            <AdInPagePush />

            {/* ── DYNAMIC ACTION CTA ── */}
            <ActionCTA inputs={inputs} D={D} T={T} />

            {/* ── WEALTH TIPPING POINT CHART ── */}
            <section id="amortization-chart" aria-label="Amortization intelligence map" className="fade-up-d2" style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "28px 24px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Amortization Intelligence Map</p>
                  <h2 style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 800, color: T.light }}>
                    Wealth Tipping Point — Year {D.tippingYear ?? "—"}
                  </h2>
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
              <AmortizationChart annualData={D.annualData} tippingYear={D.tippingYear} />
              <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
                {[
                  { color: T.alert,   label: "Monthly Interest",  val: "Early payments: mostly interest" },
                  { color: T.success, label: "Monthly Principal", val: "Accelerates after tipping point"  },
                  { color: T.primary, label: "Tipping Point",     val: `Year ${D.tippingYear ?? "—"} milestone` },
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
            </section>

            {/* ── AD PLACEMENT 2: 300×250 Banner (Adsterra) ── */}
            <AdBanner />

            {/* ── LABOR RECLAIMED ── */}
            <LaborReclaimed D={D} wage={inputs.wage} rate={inputs.rate} />

            {/* ── COLLAPSIBLE AMORTIZATION TABLE ── */}
            <section aria-label="Full amortization schedule" className="fade-up-d4" style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, marginBottom: 20, overflow: "hidden",
            }}>
              <button
                onClick={() => setAmortOpen(o => !o)}
                style={{
                  width: "100%", padding: "18px 24px",
                  background: "transparent", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", color: T.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 3, height: 18, background: T.primary, borderRadius: 2 }} />
                  <p style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 700, color: T.text }}>
                    View Full Amortization Schedule
                  </p>
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted }}>
                    ({tableRows.length} rows
                    {biweeklyEnabled && biweeklyD ? " · biweekly mode" : extraD ? " · extra payment applied" : ""})
                  </span>
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 16, color: T.primary, transition: "transform 0.2s", transform: amortOpen ? "rotate(180deg)" : "none" }}>
                  ▾
                </span>
              </button>

              {amortOpen && (
                <div>
                  <div style={{ overflowX: "auto", padding: "0 4px" }}>
                    <table className="amort-table">
                      <thead>
                        <tr>
                          <th style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, padding: "10px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "left" }}>Month</th>
                          <th style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, padding: "10px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>Payment</th>
                          <th style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, padding: "10px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>Principal</th>
                          <th style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, padding: "10px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>Interest</th>
                          <th style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, padding: "10px 12px", borderBottom: `1px solid ${T.border}`, textAlign: "right" }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.slice(0, amortLimit).map((row) => (
                          <tr key={row.month}>
                            <td style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, padding: "9px 12px", borderBottom: `1px solid ${T.border}22` }}>{row.month}</td>
                            <td style={{ fontFamily: T.mono, fontSize: 12, color: T.mutedHi, padding: "9px 12px", borderBottom: `1px solid ${T.border}22`, textAlign: "right" }}>{usd(row.payment, 2)}</td>
                            <td style={{ fontFamily: T.mono, fontSize: 12, color: T.success, padding: "9px 12px", borderBottom: `1px solid ${T.border}22`, textAlign: "right" }}>{usd(row.principal, 2)}</td>
                            <td style={{ fontFamily: T.mono, fontSize: 12, color: T.alert, padding: "9px 12px", borderBottom: `1px solid ${T.border}22`, textAlign: "right" }}>{usd(row.interest, 2)}</td>
                            <td style={{ fontFamily: T.mono, fontSize: 12, color: T.text, padding: "9px 12px", borderBottom: `1px solid ${T.border}22`, textAlign: "right" }}>{usd(row.balance, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {amortLimit < tableRows.length && (
                    <div style={{ padding: "16px 24px", borderTop: `1px solid ${T.border}` }}>
                      <button
                        onClick={() => setAmortLimit(l => l + 60)}
                        style={{
                          background: "transparent", border: `1px solid ${T.borderHi}`,
                          borderRadius: 8, padding: "10px 20px",
                          fontFamily: T.sans, fontSize: 13, fontWeight: 600,
                          color: T.mutedHi, cursor: "pointer",
                          transition: "border-color 0.2s, color 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.color = T.primary; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderHi; e.currentTarget.style.color = T.mutedHi; }}
                      >
                        Load More ({Math.min(60, tableRows.length - amortLimit)} more rows)
                      </button>
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginLeft: 16 }}>
                        Showing {Math.min(amortLimit, tableRows.length)} of {tableRows.length} rows
                      </span>
                    </div>
                  )}
                  {amortLimit >= tableRows.length && (
                    <div style={{ padding: "12px 24px", borderTop: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 10, color: T.muted }}>
                      All {tableRows.length} rows shown. No cumulative rounding drift — values rounded to 2 decimals per row.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── STRATEGIC SUMMARY ── */}
            <section id="wealth-tipping-point" aria-label="Wealth tipping point summary" className="fade-up-d4" style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "24px",
            }}>
              <h2 style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 16 }}>Diagnostic Summary</h2>
              <div className="bento-grid grid-2">
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, lineHeight: 1.75 }}>
                    Your interest-to-cost ratio is <strong style={{ color: T.alert }}>{D.intRatio}%</strong> — meaning {D.intRatio} cents of every dollar paid services interest rather than equity.
                    The Wealth Tipping Point arrives at <strong style={{ color: T.primary }}>Year {D.tippingYear ?? "—"}</strong>; until then, the lender accumulates equity faster than you do.
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: T.sans, fontSize: 13, color: T.mutedHi, lineHeight: 1.75 }}>
                    Lifetime interest exposure totals <strong style={{ color: T.alert }}>{usd(D.totalInterest)}</strong>.
                    {inputs.rate > 6.5 && ` Refinancing to 6.0% could recover ${usd(D.rfSavTot)} — equivalent to ${comma(D.hoursRfSave)} hours of labor.`}
                    {D.hasPMI && ` Removing PMI would save an additional ${usd(D.totalPMI)}.`}
                  </p>
                </div>
              </div>
            </section>

          </section>
        )}

        {/* ═══ AUTHORITY CONTENT ════════════════════════════════ */}
        <section aria-label="Wealth tipping point thesis" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 48px" }}>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "32px 28px",
          }}>
            <p style={{ fontFamily: T.mono, fontSize: 11, color: T.primary, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
              The Long View
            </p>
            <h2 style={{
              fontFamily: T.sans, fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800,
              color: T.light, lineHeight: 1.25, marginBottom: 18,
            }}>
              The Wealth Tipping Point: Beyond the Monthly Payment
            </h2>
            <h3 style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, marginTop: 18, marginBottom: 8 }}>
              Interest Drain vs Equity Gain
            </h3>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
              A monthly mortgage payment is two transactions disguised as one. Part of every dollar buys you equity in the
              property. The other part — frequently the larger part for the first decade — pays the lender for the privilege
              of borrowing. Treating the payment as a single line item hides this split, and with it, the true velocity at
              which your wealth is actually compounding.
            </p>
            <h3 style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, marginTop: 18, marginBottom: 8 }}>
              Ownership Acceleration
            </h3>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
              The Wealth Tipping Point is the inflection at which principal repayment finally exceeds interest expense on a
              monthly basis. Before it, the bank's balance sheet grows faster than yours. After it, every payment shifts
              decisively in your favor — and the curve only steepens. Knowing exactly when this point arrives is the
              difference between paying a mortgage and engineering ownership.
            </p>
            <h3 style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 700, color: T.text, marginTop: 18, marginBottom: 8 }}>
              Bank Profit vs Borrower Wealth Timeline
            </h3>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
              Lenders are not adversaries — they are counterparties operating on a different timeline. The structure of a
              standard amortization schedule guarantees they collect the bulk of their return early, while you collect yours
              late. ProCalc Elite exists to make that timeline visible, quantifiable, and — through extra-principal,
              recasting, or refinance strategy — re-negotiable.
            </p>
          </div>
        </section>

        {/* ═══ FAQ ══════════════════════════════════════════════ */}
        <section id="faq" aria-label="Frequently asked questions" style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 64px" }}>
          <div style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 14, padding: "32px 28px",
          }}>
            <p style={{ fontFamily: T.mono, fontSize: 11, color: T.primary, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
              Reference
            </p>
            <h2 style={{
              fontFamily: T.sans, fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800,
              color: T.light, lineHeight: 1.25, marginBottom: 22,
            }}>
              Frequently Asked Questions
            </h2>
            <dl style={{ margin: 0 }}>
              <dt style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.light, marginBottom: 8 }}>
                What is a Mortgage Wealth Tipping Point?
              </dt>
              <dd style={{ margin: "0 0 24px 0", fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
                The moment principal paid exceeds interest paid. Before this point, the larger share of every payment
                services the loan; after it, the larger share builds your equity.
              </dd>
              <dt style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.light, marginBottom: 8 }}>
                What is the Labor Hour Debt Metric?
              </dt>
              <dd style={{ margin: "0 0 24px 0", fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
                A conversion of mortgage interest into hours of labor required to service that debt at your stated hourly
                wage. It re-prices the cost of borrowing in time rather than dollars.
              </dd>
              <dt style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.light, marginBottom: 8 }}>
                How does the Extra Payment engine work?
              </dt>
              <dd style={{ margin: "0 0 24px 0", fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
                Each extra dollar entered goes entirely to principal after the required P&I payment is applied. The
                scheduled payment never changes — the extra amount is additive. The engine regenerates the full
                amortization from month 1, stopping when the balance reaches zero.
              </dd>
              <dt style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 700, color: T.light, marginBottom: 8 }}>
                What is True Biweekly amortization?
              </dt>
              <dd style={{ margin: "0 0 0 0", fontFamily: T.sans, fontSize: 14, color: T.mutedHi, lineHeight: 1.75 }}>
                True biweekly uses 26 actual payment periods per year at a periodic rate of annualRate ÷ 26. This is
                mathematically distinct from the common shortcut of adding one extra monthly payment per year. The
                interest savings are real but the payment amount and payoff date differ from approximations.
              </dd>
            </dl>
          </div>
        </section>

        {/* ═══ FOOTER — Trust Layer ══════════════════════════════ */}
        <footer style={{
          borderTop: `1px solid ${T.border}`,
          padding: "32px 24px 28px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", gap: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 5,
              background: `linear-gradient(135deg, ${T.primary}, #818CF8)`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 10, color: "#fff" }}>MT</span>
            </div>
            <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 13, color: T.light }}>ProCalc Elite</span>
          </div>

          <nav aria-label="Footer" className="footer-nav" style={{
            display: "flex", flexWrap: "wrap",
            alignItems: "center", justifyContent: "center", gap: 24,
          }}>
            {(() => {
              const base = import.meta.env.BASE_URL;
              const links = [
                { label: "Privacy Policy",   href: `${base}privacy-policy`,   internal: true },
                { label: "Terms of Service", href: `${base}terms-of-service`, internal: true },
                { label: "Contact",          href: "mailto:mobixatech@protonmail.com", internal: false },
              ];
              const navigate = (e, href) => {
                e.preventDefault();
                window.history.pushState({}, "", href);
                window.dispatchEvent(new PopStateEvent("popstate"));
                window.scrollTo(0, 0);
              };
              return links.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="footer-link"
                  onClick={link.internal ? (e) => navigate(e, link.href) : undefined}
                  style={{
                    fontFamily: T.mono, fontSize: 11, color: T.mutedHi,
                    textDecoration: "none", letterSpacing: "0.04em",
                    transition: "color 0.18s, opacity 0.18s",
                  }}
                >
                  {link.label}
                </a>
              ));
            })()}
          </nav>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, maxWidth: 640 }}>
            {[
              "ProCalc Elite is a wealth intelligence engine for educational purposes only.",
              "We utilize local browser processing and do not store or collect user financial data.",
              "© 2026 MobixaTech.",
            ].map((line, i) => (
              <p key={i} style={{
                fontFamily: T.mono, fontSize: 11, color: T.muted,
                lineHeight: 1.6, margin: 0, textAlign: "center",
              }}>
                {line}
              </p>
            ))}
          </div>
        </footer>

      </main>
    </>
  );
}
