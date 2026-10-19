import { API_BASE } from "../config";
import { useEffect, useState } from "react";

// Province from the browser's time zone (+ language for Quebec). No location permission, no IP lookup.
const TZ = {
  "America/Vancouver": "BC", "America/Edmonton": "AB", "America/Regina": "SK", "America/Swift_Current": "SK",
  "America/Winnipeg": "MB", "America/Toronto": "ON", "America/Montreal": "QC", "America/Halifax": "NS",
  "America/Glace_Bay": "NS", "America/Moncton": "NB", "America/St_Johns": "NL", "America/Goose_Bay": "NL",
  "America/Whitehorse": "YT", "America/Dawson": "YT", "America/Yellowknife": "NT", "America/Inuvik": "NT",
  "America/Iqaluit": "NU", "America/Rankin_Inlet": "NU", "America/Cambridge_Bay": "NU",
};
export function guessProvince(lang) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const p = TZ[tz] || "CA";
    return p === "ON" && lang === "fr" ? "QC" : p; // Montreal uses the Toronto time zone
  } catch { return "CA"; }
}

// The 5 chips under the chat box: weather, trending in the province, popular this week (functions/starters.js).
// Falls back to the fixed list from i18n if the request fails.
export default function useStarters(lang, fallback) {
  const [chips, setChips] = useState(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setChips(null);
    fetch(`${API_BASE}/api/starters?lang=${lang}&prov=${guessProvince(lang)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (Array.isArray(d?.chips) && d.chips.length >= 3) setChips(d.chips); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [lang]);
  return chips || fallback.map((x) => ({ kind: "fixed", label: x, prompt: x }));
}
