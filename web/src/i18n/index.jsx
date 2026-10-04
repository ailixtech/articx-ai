// English / French. The choice is remembered on this device; first visits follow the browser language.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./en";
import fr from "./fr";
import { store } from "../lib/storage";

const DICTS = { en, fr };
const KEY = "articx-lang";
const LangContext = createContext({ lang: "en", s: en, setLang: () => {} });

function initialLang() {
  const saved = store("local", KEY);
  if (saved === "en" || saved === "fr") return saved;
  return (navigator.language || "").toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  useEffect(() => { document.documentElement.lang = DICTS[lang].locale; }, [lang]);
  const setLang = useCallback((l) => { setLangState(l); store("local", KEY, l); }, []);
  const value = useMemo(() => ({ lang, s: DICTS[lang], setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

// "FR" on the English site, "EN" on the French one.
export function LangToggle({ className = "" }) {
  const { lang, s, setLang } = useLang();
  return (
    <button type="button" onClick={() => setLang(lang === "en" ? "fr" : "en")} aria-label={s.switchTo.label} title={s.switchTo.label}
      lang={lang === "en" ? "fr" : "en"}
      className={`inline-flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-[10px] border border-line bg-transparent px-2.5 font-head text-[.8rem] font-semibold tracking-[.04em] text-ink hover:border-muted hover:bg-bg-2 ${className}`}>
      {s.switchTo.code}
    </button>
  );
}
