/**
 * ─── AD NETWORK CONFIGURATION ───────────────────────────────────────────────
 *
 * STEP 6 (after account approval):
 *   Replace every placeholder value below with your real IDs from each platform.
 *
 * HOW TO FIND YOUR IDs:
 *   Adsterra  → Publishers dashboard → My Sites → Ad Units → copy the "Key"
 *   Monetag   → Publishers dashboard → Ad Zones → copy the numeric Zone ID
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const AD_CONFIG = {
  enabled: true,

  adsterra: {
    /**
     * Popunder — fires once per session on first user interaction.
     * Adsterra dashboard: Ad Units → Popunder → copy the script src key.
     * Format:  https://pl<KEY>.profitablecpmrate.com/...
     * Replace the full src URL below.
     */
    popunderSrc: "//REPLACE_WITH_ADSTERRA_POPUNDER_SCRIPT_URL",

    /**
     * 300×250 Banner — in-content rectangle.
     * Adsterra dashboard: Ad Units → Display Banner → 300×250 → copy Key.
     */
    banner300x250Key: "REPLACE_WITH_ADSTERRA_BANNER_300x250_KEY",

    /**
     * Social Bar — sticky bottom bar, all devices.
     * Adsterra dashboard: Ad Units → Social Bar → copy the script src.
     */
    socialBarSrc: "//REPLACE_WITH_ADSTERRA_SOCIAL_BAR_SCRIPT_URL",
  },

  monetag: {
    /**
     * In-Page Push — notification-style unit shown below Diagnostic Summary.
     * Monetag dashboard: Ad Zones → In-Page Push → copy numeric Zone ID.
     */
    inPagePushZoneId: "REPLACE_WITH_MONETAG_INPAGE_PUSH_ZONE_ID",

    /**
     * Interstitial — full-screen overlay triggered after Run Diagnostic.
     * Monetag dashboard: Ad Zones → Interstitial → copy numeric Zone ID.
     */
    interstitialZoneId: "REPLACE_WITH_MONETAG_INTERSTITIAL_ZONE_ID",
  },
};
