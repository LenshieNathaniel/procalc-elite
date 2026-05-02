import { useEffect, useRef } from "react";
import { AD_CONFIG } from "../lib/adConfig.js";

/**
 * AdInPagePush — injects Monetag In-Page Push zone.
 * Renders a styled notification-style ad below the Diagnostic Summary.
 */
export default function AdInPagePush() {
  const injected = useRef(false);

  useEffect(() => {
    if (!AD_CONFIG.enabled) return;
    if (injected.current) return;
    const zoneId = AD_CONFIG.monetag.inPagePushZoneId;
    if (!zoneId || zoneId.startsWith("REPLACE")) return;

    injected.current = true;

    const s = document.createElement("script");
    s.src = `https://vaugroar.com/401/${zoneId}`;
    s.async = true;
    try {
      (document.body || document.documentElement).appendChild(s);
    } catch (e) {}
  }, []);

  return null;
}
