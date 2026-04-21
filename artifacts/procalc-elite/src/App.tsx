import { useEffect, useState } from "react";
import ProCalcElite from "./ProCalcElite.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";

/**
 * Minimal pathname-based router (no external dependency).
 * Subscribes to popstate so back/forward navigation works,
 * and respects the artifact's BASE_URL prefix.
 */
function useRoute() {
  const [pathname, setPathname] = useState<string>(
    typeof window === "undefined" ? "/" : window.location.pathname
  );

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return pathname;
}

export default function App() {
  const pathname = useRoute();
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Strip the artifact's base prefix so we can match routes locally
  const route = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const normalised = route.replace(/\/$/, "") || "/";

  if (normalised === "/privacy-policy") return <PrivacyPolicy />;
  if (normalised === "/terms-of-service") return <TermsOfService />;
  return <ProCalcElite />;
}
