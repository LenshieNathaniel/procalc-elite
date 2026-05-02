import { useEffect, useRef } from "react";
import { AD_CONFIG } from "../lib/adConfig.js";

/**
 * AdBanner — renders an Adsterra 300×250 display banner.
 * The ad script is injected once and cleaned up on unmount.
 */
export default function AdBanner({ style = {} }) {
  const containerRef = useRef(null);
  const injected = useRef(false);

  useEffect(() => {
    if (!AD_CONFIG.enabled) return;
    if (injected.current) return;
    if (!containerRef.current) return;
    const key = AD_CONFIG.adsterra.banner300x250Key;
    if (!key || key.startsWith("REPLACE")) return;

    injected.current = true;

    // Options script
    const optsScript = document.createElement("script");
    optsScript.type = "text/javascript";
    optsScript.text = `
      atOptions = {
        'key': '${key}',
        'format': 'iframe',
        'height': 250,
        'width': 300,
        'params': {}
      };
    `;

    // Invoke script
    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `//www.highperformanceformat.com/${key}/invoke.js`;
    invokeScript.async = true;

    containerRef.current.appendChild(optsScript);
    containerRef.current.appendChild(invokeScript);

    return () => {
      injected.current = false;
    };
  }, []);

  if (!AD_CONFIG.enabled) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: 300,
        height: 250,
        margin: "20px auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
      aria-label="Advertisement"
    />
  );
}
