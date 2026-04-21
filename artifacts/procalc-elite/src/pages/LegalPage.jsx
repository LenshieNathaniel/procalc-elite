import { T } from "../ProCalcElite.jsx";

/**
 * Shared layout for static legal pages (Privacy Policy, Terms of Service).
 * Reuses the brand tokens (T) from the main app for visual consistency.
 *
 * Props:
 *   - title:        h1 text
 *   - effectiveDate: short string shown under the title
 *   - intro:        optional intro paragraph (string or JSX)
 *   - sections:     [{ heading, body }] — body may be string or JSX
 */
export default function LegalPage({ title, effectiveDate, intro, sections }) {
  const basePath = import.meta.env.BASE_URL;

  return (
    <main style={{
      background: T.dark,
      minHeight: "100vh",
      fontFamily: T.sans,
      color: T.text,
      padding: "48px 24px 64px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Back link */}
        <a
          href={basePath}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: T.mono,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: T.mutedHi,
            textDecoration: "none",
            marginBottom: 28,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.light; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.mutedHi; }}
        >
          <span aria-hidden="true">←</span> Back to ProCalc Elite
        </a>

        {/* Title block */}
        <header style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: T.sans,
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 800,
            color: T.light,
            lineHeight: 1.15,
            marginBottom: 10,
            letterSpacing: "-0.01em",
          }}>
            {title}
          </h1>
          <p style={{
            fontFamily: T.mono,
            fontSize: 12,
            color: T.muted,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: 0,
          }}>
            Effective Date: {effectiveDate}
          </p>
        </header>

        {/* Optional intro */}
        {intro && (
          <p style={{
            fontFamily: T.sans,
            fontSize: 15,
            color: T.mutedHi,
            lineHeight: 1.75,
            marginBottom: 36,
          }}>
            {intro}
          </p>
        )}

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {sections.map((s, i) => (
            <section key={i}>
              <h2 style={{
                fontFamily: T.sans,
                fontSize: 18,
                fontWeight: 700,
                color: T.light,
                marginBottom: 10,
                letterSpacing: "-0.005em",
              }}>
                {`${i + 1}. ${s.heading}`}
              </h2>
              <div style={{
                fontFamily: T.sans,
                fontSize: 14.5,
                color: T.mutedHi,
                lineHeight: 1.75,
              }}>
                {s.body}
              </div>
            </section>
          ))}
        </div>

        {/* Footer mark */}
        <div style={{
          marginTop: 56,
          paddingTop: 20,
          borderTop: `1px solid ${T.border}`,
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: T.mono,
            fontSize: 11,
            color: T.muted,
            margin: 0,
            letterSpacing: "0.04em",
          }}>
            © 2026 MobixaTech · ProCalc Elite
          </p>
        </div>
      </div>
    </main>
  );
}
