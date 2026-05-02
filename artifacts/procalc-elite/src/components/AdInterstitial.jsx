import { useEffect, useRef, useState, useCallback } from "react";
import { AD_CONFIG } from "../lib/adConfig.js";
import { T } from "../ProCalcElite.jsx";

const SESSION_KEY = "pce_interstitial_shown";
const COUNTDOWN = 5;

/**
 * AdInterstitial — shows a Monetag interstitial overlay once per session,
 * triggered 2 seconds after the diagnostic results appear.
 *
 * Props:
 *   triggered (bool) — set to true by parent when results are ready
 *   onClose  (fn)   — called when the overlay is dismissed
 */
export default function AdInterstitial({ triggered, onClose }) {
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const timerRef = useRef(null);
  const injected = useRef(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    clearInterval(timerRef.current);
    sessionStorage.setItem(SESSION_KEY, "1");
    if (onClose) onClose();
  }, [onClose]);

  // Inject Monetag interstitial script once
  useEffect(() => {
    if (!AD_CONFIG.enabled) return;
    if (injected.current) return;
    const zoneId = AD_CONFIG.monetag.interstitialZoneId;
    if (!zoneId || zoneId.startsWith("REPLACE")) return;

    injected.current = true;

    const s = document.createElement("script");
    s.src = `https://vaugroar.com/400/${zoneId}`;
    s.async = true;
    try {
      (document.body || document.documentElement).appendChild(s);
    } catch (e) {}
  }, []);

  // Show overlay 2s after triggered, once per session
  useEffect(() => {
    if (!triggered) return;
    if (!AD_CONFIG.enabled) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const zoneId = AD_CONFIG.monetag.interstitialZoneId;
    if (!zoneId || zoneId.startsWith("REPLACE")) return;

    const delay = setTimeout(() => {
      setVisible(true);
      setSeconds(COUNTDOWN);

      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            dismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 2000);

    return () => {
      clearTimeout(delay);
      clearInterval(timerRef.current);
    };
  }, [triggered, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Advertisement"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Ad label */}
      <p style={{
        fontFamily: T.mono, fontSize: 10, color: T.muted,
        letterSpacing: "0.14em", textTransform: "uppercase",
        marginBottom: 12,
      }}>
        Advertisement
      </p>

      {/* Ad content area — Monetag renders into this */}
      <div id="monetag-interstitial-slot" style={{
        background: T.card, borderRadius: 12,
        width: "100%", maxWidth: 640, minHeight: 300,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${T.border}`,
        overflow: "hidden",
      }} />

      {/* Skip / countdown */}
      <button
        onClick={dismiss}
        style={{
          marginTop: 20,
          padding: "10px 28px",
          background: seconds > 0 ? T.card : T.primary,
          border: `1.5px solid ${seconds > 0 ? T.border : T.primary}`,
          borderRadius: 8,
          color: seconds > 0 ? T.muted : "#fff",
          fontFamily: T.sans, fontSize: 13, fontWeight: 700,
          cursor: seconds > 0 ? "default" : "pointer",
          transition: "background 0.3s, color 0.3s",
          letterSpacing: "0.04em",
        }}
        disabled={seconds > 0}
        aria-disabled={seconds > 0}
      >
        {seconds > 0 ? `Skip in ${seconds}s` : "Continue to Results →"}
      </button>
    </div>
  );
}
