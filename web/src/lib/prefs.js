// Small per-browser preferences (Settings > General), kept in localStorage.
// usePref re-renders every component using a preference when it changes.
import { useEffect, useState } from "react";
import { store } from "./storage";

const PREFS = {
  enterSends: ["articx-enter-sends", "1"], // "1": Enter sends, Shift+Enter adds a line. "0": Ctrl/Cmd+Enter sends.
  textSize: ["articx-text-size", "md"],    // chat text: "sm" | "md" | "lg"
};
const EVENT = "articx-pref";

export const getPref = (name) => store("local", PREFS[name][0]) ?? PREFS[name][1];

export function setPref(name, value) {
  store("local", PREFS[name][0], value);
  if (name === "textSize") applyTextSize();
  window.dispatchEvent(new CustomEvent(EVENT, { detail: name }));
}

export function usePref(name) {
  const [value, setValue] = useState(() => getPref(name));
  useEffect(() => {
    const on = (e) => { if (e.detail === name) setValue(getPref(name)); };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [name]);
  return [value, (v) => setPref(name, v)];
}

export function applyTextSize() {
  document.documentElement.dataset.textSize = getPref("textSize");
}
