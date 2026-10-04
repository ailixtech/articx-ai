import { useCallback, useEffect, useState } from "react";
import { store } from "./storage";

// Theme preference: "light", "dark", or "system" (follow the device).
// public/theme-init.js applies a saved light/dark choice before the page paints.
const KEY = "articx-theme";
const dark = () => matchMedia("(prefers-color-scheme: dark)");
const savedPref = () => { const t = store("local", KEY); return t === "light" || t === "dark" ? t : "system"; };
const resolve = (pref) => (pref === "system" ? (dark().matches ? "dark" : "light") : pref);

export function useTheme() {
  const [pref, setPrefState] = useState(savedPref);
  const [theme, setTheme] = useState(() => resolve(savedPref()));
  useEffect(() => {
    const mq = dark();
    const sync = () => setTheme(resolve(savedPref()));
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const setPref = useCallback((next) => {
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    store("local", KEY, next === "system" ? null : next);
    setPrefState(next);
    setTheme(resolve(next));
  }, []);
  return { pref, theme, setPref };
}
