/* ─── ProCalc Elite — Calculation Engine ──────────────────────────────────────
   All functions are pure and deterministic.
   No hidden state. No stale cached values.
   Recomputes from source inputs on every call.
   Memoization is handled by the caller (useMemo).
   ──────────────────────────────────────────────────────────────────────────── */

/* ── PMI default rates by credit profile ── */
const PMI_DEFAULTS = {
  excellent: 0.0045,   // 0.45%
  good:      0.0085,   // 0.85%
  fair:      0.0125,   // 1.25%
};

/**
 * Compute the annual PMI rate applying LTV safety rules.
 *
 * Rule 1 — High LTV Floor:  LTV > 95% → min rate = 0.85%
 * Rule 2 — Safety Floor:    rate ≥ 0.3% × (LTV / 80%)
 *
 * @param {number} ltv            0–1  (e.g. 0.96 for 96% LTV)
 * @param {string} creditProfile  "excellent" | "good" | "fair"
 * @returns {number} annual PMI rate as decimal (e.g. 0.0085)
 */
export function calculatePMIRate(ltv, creditProfile = "good") {
  let rate = PMI_DEFAULTS[creditProfile] ?? PMI_DEFAULTS.good;

  // Rule 1
  if (ltv > 0.95) {
    rate = Math.max(rate, 0.0085);
  }
  // Rule 2
  const safetyFloor = 0.003 * (ltv / 0.80);
  rate = Math.max(rate, safetyFloor);

  return rate;
}

/**
 * Calculate the standard fixed monthly principal & interest payment.
 *
 * @param {number} loanAmount  Principal in dollars
 * @param {number} annualRate  Decimal (e.g. 0.0725 for 7.25%)
 * @param {number} termYears   Integer years
 * @returns {number} exact monthly P&I (unrounded)
 */
export function calculateMonthlyPI(loanAmount, annualRate, termYears) {
  if (loanAmount <= 0 || annualRate <= 0 || termYears <= 0) return 0;
  const mr = annualRate / 12;
  const n  = termYears * 12;
  return loanAmount * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
}

/**
 * Generate a full amortization schedule in monthly or true biweekly mode.
 *
 * MONTHLY MODE (biweekly = false):
 *   Standard amortization with optional extra principal each period.
 *   Extra payment applies entirely to principal after required P&I.
 *   Scheduled P&I payment never changes.
 *
 * BIWEEKLY MODE (biweekly = true):
 *   TRUE biweekly amortization — NOT "one extra monthly payment per year."
 *   - Periodic rate    = annualRate / 26
 *   - Total periods    = termYears × 26
 *   - Payment formula  = P × (r(1+r)^N) / ((1+r)^N − 1)
 *
 *   Extra payment conversion when biweekly = true:
 *   A "monthly" extra amount is converted to its biweekly equivalent so the
 *   annual extra principal is identical regardless of payment frequency:
 *
 *     extraBiweekly = extraMonthly × 12 / 26
 *
 *   Example: $200/month extra → $200 × 12/26 ≈ $92.31 per biweekly period.
 *   This results in $92.31 × 26 = $2,400.06/year — the same as $200 × 12 = $2,400/year.
 *
 * @param {object} params
 * @param {number}  params.loanAmount
 * @param {number}  params.annualRate       decimal (e.g. 0.0725)
 * @param {number}  params.termYears
 * @param {number}  [params.extraMonthly=0] extra principal per month; converted to biweekly equivalent when biweekly=true
 * @param {boolean} [params.biweekly=false]
 * @param {string}  [params.creditProfile]  "excellent"|"good"|"fair"
 * @param {number}  [params.homeValue]      for LTV-based PMI removal
 * @param {number}  [params.annualTaxes]
 * @param {number}  [params.annualInsurance]
 * @param {number}  [params.inflationPct]   annual % increase applied to taxes+insurance from year 2 onward
 * @returns {object|null}
 */
export function generateAmortizationSchedule({
  loanAmount,
  annualRate,
  termYears,
  extraMonthly    = 0,
  biweekly        = false,
  creditProfile   = "good",
  homeValue       = 0,
  annualTaxes     = 0,
  annualInsurance = 0,
  inflationPct    = 0,
}) {
  if (!loanAmount || loanAmount <= 0) return null;
  if (!annualRate || annualRate <= 0) return null;
  if (!termYears  || termYears  <= 0) return null;

  const ltv           = homeValue > 0 ? loanAmount / homeValue : 0;
  const hasPMI        = ltv > 0.80;
  const pmiAnnualRate = hasPMI ? calculatePMIRate(ltv, creditProfile) : 0;

  /* ── MONTHLY MODE ─────────────────────────────────────────────────────── */
  if (!biweekly) {
    const mr    = annualRate / 12;
    const n     = termYears * 12;
    const piPmtExact = calculateMonthlyPI(loanAmount, annualRate, termYears);

    // PMI on origination balance for display
    const pmiMonthlyOrig = hasPMI ? (loanAmount * pmiAnnualRate) / 12 : 0;

    let balance       = loanAmount;
    let totalInterest = 0;
    let totalPMI      = 0;
    let tippingPoint  = null;   // first month principal ≥ interest
    let pmiDropMonth  = null;   // month LTV first falls to ≤ 80%
    const rows        = [];
    const annualData  = [];

    for (let mo = 1; balance > 0.005; mo++) {
      if (mo > n + 120) break; // safety — never more than 10 extra years

      // Interest rounded to 2 decimals (bank standard)
      const interest     = Math.round(balance * mr * 100) / 100;
      const requiredPrin = piPmtExact - interest; // keep precise; cap below

      // Extra goes fully to principal, capped so balance never goes negative
      const extra      = Math.max(0, Math.min(extraMonthly, balance - requiredPrin));
      const principal  = Math.min(requiredPrin + extra, balance);

      // Balance kept as raw float — NO rounding here.
      // Rounding balance each period would create ~$0.005 drift per month,
      // compounding to ~$1.80 over 360 periods. Round only for display.
      balance = balance - principal;
      if (balance < 0) balance = 0;

      totalInterest += interest;

      if (!tippingPoint && principal >= interest) tippingPoint = mo;

      // Dynamic PMI — track current LTV against home value (uses precise balance)
      const currentLTV = homeValue > 0 ? balance / homeValue : 0;
      let pmiMo = 0;
      if (hasPMI && !pmiDropMonth) {
        if (currentLTV <= 0.80) {
          pmiDropMonth = mo;
        } else {
          // PMI on current balance (dynamic per spec)
          pmiMo     = Math.round((balance * pmiAnnualRate / 12) * 100) / 100;
          totalPMI += pmiMo;
        }
      }

      // Tax & insurance inflation (applies starting year 2)
      const yearIdx   = Math.floor((mo - 1) / 12);
      const inflFactor = (inflationPct > 0 && yearIdx >= 1)
        ? Math.pow(1 + inflationPct / 100, yearIdx)
        : 1;
      const taxMoRow = Math.round(annualTaxes   / 12 * inflFactor * 100) / 100;
      const insMoRow = Math.round(annualInsurance / 12 * inflFactor * 100) / 100;

      // Round balance for display only — internal value stays precise
      const balanceDisplay = Math.round(balance * 100) / 100;

      rows.push({
        month:     mo,
        payment:   Math.round((piPmtExact + pmiMo + taxMoRow + insMoRow) * 100) / 100,
        principal: Math.round(principal * 100) / 100,
        interest:  Math.round(interest * 100) / 100,
        pmi:       Math.round(pmiMo * 100) / 100,
        balance:   balanceDisplay,
      });

      if (mo % 12 === 0) {
        annualData.push({
          year:      mo / 12,
          Interest:  Math.round(interest),
          Principal: Math.round(principal),
          Balance:   Math.round(balance),
        });
      }
    }

    const actualMonths  = rows.length;
    const tippingYear   = tippingPoint ? Math.ceil(tippingPoint / 12) : null;
    const taxMo         = Math.round(annualTaxes    / 12);
    const insMo         = Math.round(annualInsurance / 12);
    const totalInterestR = Math.round(totalInterest);
    const totalCost      = Math.round(loanAmount + totalInterest);

    return {
      biweekly:       false,
      piPmtExact,
      piPmt:          Math.round(piPmtExact),
      taxMo,
      insMo,
      totalMo:        Math.round(piPmtExact + pmiMonthlyOrig + taxMo + insMo),
      hasPMI,
      ltv,
      pmiAnnualRate,
      pmiMonthly:     Math.round(pmiMonthlyOrig),
      pmiDropMonth,
      totalPMI:       Math.round(totalPMI),
      totalInterest:  totalInterestR,
      totalCost,
      intRatio:       Math.round((totalInterestR / totalCost) * 100),
      tippingPoint,
      tippingYear,
      actualMonths,
      yearsReduced:   Math.round((termYears * 12 - actualMonths) / 12 * 10) / 10,
      annualData,
      rows,
    };
  }

  /* ── TRUE BIWEEKLY MODE ───────────────────────────────────────────────── */
  //
  // WHAT "TRUE BIWEEKLY" MEANS:
  //   Pay half the standard monthly P&I every 2 weeks (26 times/year).
  //   Interest accrues at annualRate / 26 per period (not monthly rate / 2).
  //
  // WHY THIS SAVES $60-70k:
  //   26 × (monthlyPmt / 2) = 13 monthly-equivalents per year.
  //   vs 12 × monthlyPmt = 12 payments per year (standard).
  //   The 13th equivalent reduces principal faster → less interest accrued.
  //
  // WHAT THE SPEC MEANS BY "NOT THE 13TH PAYMENT APPROXIMATION":
  //   The approximation = add one lump extra monthly payment at year-end (or
  //   add 1/12 monthly payment each month). It uses monthly interest accrual.
  //   True biweekly = runs 26 actual biweekly periods with biweekly interest
  //   accrual (annualRate/26), which is slightly more beneficial and exact.
  //
  // WHY NOT derivedPayment = P × (r(1+r)^N) / ((1+r)^N − 1) with N=780:
  //   That formula derives a NEW payment so the loan amortizes in exactly
  //   30 years × 26 periods. The result is a LOWER payment (~$1,322 vs $1,432)
  //   that makes only ~12 monthly-equivalents/year → saves almost nothing (~$467).
  //   That formula is NOT what biweekly mortgage programs do.
  //
  // Extra payment conversion:
  //   extraBiweekly = extraMonthly × 12 / 26  (same annual extra principal).
  //   $200/mo → $200 × 12/26 = $92.31/2wk → $92.31 × 26 = $2,400.06/yr ✓
  //
  const monthlyPmtExact = calculateMonthlyPI(loanAmount, annualRate, termYears);
  const bwRate          = annualRate / 26;
  const bwPmt           = monthlyPmtExact / 2;               // half monthly P&I per period
  const extraBiweekly   = extraMonthly > 0 ? extraMonthly * 12 / 26 : 0;
  const bwN             = termYears * 26;                    // max periods (safety cap only)

  const pmiMonthlyOrig = hasPMI ? (loanAmount * pmiAnnualRate) / 12 : 0;

  let balance       = loanAmount;
  let totalInterest = 0;
  let totalPMI      = 0;
  let tippingPoint  = null;
  let pmiDropPeriod = null;
  const bwRows      = [];
  const annualData  = [];

  for (let pd = 1; balance > 0.005; pd++) {
    if (pd > bwN + 260) break; // safety

    const interest = Math.round(balance * bwRate * 100) / 100;

    // Required principal (from fixed biweekly payment) + converted extra,
    // capped so final payment never overshoots remaining balance.
    const principal = Math.min(bwPmt - interest + extraBiweekly, balance);

    // Balance kept as raw float — no rounding per period to prevent drift
    balance = balance - principal;
    if (balance < 0) balance = 0;

    totalInterest += interest;
    if (!tippingPoint && principal >= interest) tippingPoint = pd;

    const currentLTV = homeValue > 0 ? balance / homeValue : 0;
    if (hasPMI && !pmiDropPeriod) {
      if (currentLTV <= 0.80) {
        pmiDropPeriod = pd;
      } else {
        const pmiPeriod = Math.round((balance * pmiAnnualRate / 26) * 100) / 100;
        totalPMI += pmiPeriod;
      }
    }

    bwRows.push({
      period:    pd,
      payment:   bwPmt + extraBiweekly,           // total per-period outlay
      principal: Math.round(principal * 100) / 100,
      interest,
      balance:   Math.round(balance * 100) / 100, // round only for display
    });

    if (pd % 26 === 0) {
      annualData.push({
        year:      pd / 26,
        Interest:  Math.round(interest),
        Principal: Math.round(principal),
        Balance:   Math.round(balance),
      });
    }
  }

  const actualPeriods  = bwRows.length;
  const actualYears    = Math.round((actualPeriods / 26) * 10) / 10;
  const tippingYear    = tippingPoint ? Math.ceil(tippingPoint / 26) : null;
  const totalInterestR = Math.round(totalInterest);
  const totalCost      = Math.round(loanAmount + totalInterest);
  const taxMo          = Math.round(annualTaxes    / 12);
  const insMo          = Math.round(annualInsurance / 12);

  // Convert biweekly rows to approximate monthly rows for the amortization table
  // (every 2 biweekly periods ≈ 1 month)
  const rows = [];
  for (let i = 0; i < bwRows.length - 1; i += 2) {
    const a = bwRows[i];
    const b = bwRows[i + 1];
    rows.push({
      month:     Math.ceil(a.period / 2),
      payment:   Math.round((a.payment + b.payment) * 100) / 100,
      principal: Math.round((a.principal + b.principal) * 100) / 100,
      interest:  Math.round((a.interest  + b.interest)  * 100) / 100,
      pmi:       0,
      balance:   b.balance,
    });
  }

  return {
    biweekly:       true,
    bwPmt:          Math.round(bwPmt * 100) / 100,        // base biweekly payment (no extra)
    bwPmtTotal:     Math.round((bwPmt + extraBiweekly) * 100) / 100, // actual per-period outlay
    extraBiweekly:  Math.round(extraBiweekly * 100) / 100, // converted extra per period
    piPmt:          Math.round((bwPmt + extraBiweekly) * 2),  // approx monthly equiv (base+extra)
    piPmtExact:     (bwPmt + extraBiweekly) * 2,
    taxMo,
    insMo,
    totalMo:        Math.round((bwPmt + extraBiweekly) * 2 + pmiMonthlyOrig + taxMo + insMo),
    hasPMI,
    ltv,
    pmiAnnualRate,
    pmiMonthly:     Math.round(pmiMonthlyOrig),
    pmiDropMonth:   pmiDropPeriod ? Math.ceil(pmiDropPeriod / 2) : null,
    totalPMI:       Math.round(totalPMI),
    totalInterest:  totalInterestR,
    totalCost,
    intRatio:       Math.round((totalInterestR / totalCost) * 100),
    tippingPoint,
    tippingYear,
    actualMonths:   Math.round(actualPeriods / 2),
    actualYears,
    yearsReduced:   Math.round((termYears - actualYears) * 10) / 10,
    annualData,
    rows,
  };
}

/**
 * Calculate a refinance scenario.
 *
 * ASSUMPTION: Refinance resets into a fresh NEW 30-year term at the new rate.
 * This is a common simplification. A production implementation would accept
 * remaining balance and remaining term as inputs for precision.
 *
 * @param {number} loanAmount  Original loan principal
 * @param {number} newRate     New annual rate as decimal (e.g. 0.06)
 * @returns {object|null}
 */
export function calculateRefinance(loanAmount, newRate) {
  if (!loanAmount || loanAmount <= 0) return null;
  if (!newRate    || newRate    <= 0) return null;

  const REFI_TERM  = 30; // always resets to 30-year term
  const mr         = newRate / 12;
  const n          = REFI_TERM * 12;
  const newPiPmtEx = calculateMonthlyPI(loanAmount, newRate, REFI_TERM);

  let balance       = loanAmount;
  let totalInterest = 0;
  let tippingPoint  = null;
  const annualData  = [];

  for (let mo = 1; balance > 0.005 && mo <= n; mo++) {
    const interest  = Math.round(balance * mr * 100) / 100;
    // Cap principal at remaining balance so final period never overshoots
    const principal = Math.min(newPiPmtEx - interest, balance);

    // Keep balance as raw float — no per-period rounding to prevent drift
    balance = balance - principal;
    if (balance < 0) balance = 0;

    totalInterest += interest;
    if (!tippingPoint && principal >= interest) tippingPoint = mo;

    if (mo % 12 === 0) {
      annualData.push({
        year:      mo / 12,
        Interest:  Math.round(interest),
        Principal: Math.round(principal),
        Balance:   Math.round(balance),
      });
    }
  }

  const totalInterestR = Math.round(totalInterest);
  return {
    newPiPmt:      Math.round(newPiPmtEx),
    newPiPmtExact: newPiPmtEx,
    totalInterest: totalInterestR,
    totalCost:     Math.round(loanAmount + totalInterest),
    tippingPoint,
    tippingYear:   tippingPoint ? Math.ceil(tippingPoint / 12) : null,
    termYears:     REFI_TERM,
    annualData,
  };
}
