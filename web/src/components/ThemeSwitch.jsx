import { useEffect, useRef, useState } from "react";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "./Icons";
import { iconBtn } from "./ui";
import { useLang } from "../i18n";

const OPTIONS = [["light", SunIcon], ["dark", MoonIcon], ["system", MonitorIcon]];
const ICON = Object.fromEntries(OPTIONS);

// Light / dark / system. `labelled` shows all three as a segmented control (Settings);
// otherwise a single icon button opens a small menu.
export default function ThemeSwitch({ pref, onChange, labelled = false, className = "" }) {
  const { s } = useLang();
  const t = s.chat.theme;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.querySelector('[role="menuitemradio"][aria-checked="true"]')?.focus();
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); ref.current?.querySelector("button")?.focus(); } };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (labelled) {
    return (
      <div role="radiogroup" aria-label={t.label}
        className={`inline-flex flex-none items-center gap-[2px] rounded-full border border-line bg-bg-2 p-[3px] ${className}`}>
        {OPTIONS.map(([id, Icon]) => {
          const on = pref === id;
          return (
            <button key={id} type="button" role="radio" aria-checked={on} onClick={() => onChange(id)}
              className={`inline-flex h-[30px] cursor-pointer items-center justify-center gap-[.4rem] rounded-full border-0 px-3 font-head text-[.82rem] font-medium transition-colors
                ${on ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "bg-transparent text-muted hover:text-ink"}`}>
              <Icon className="i size-[16px]" />{t[id]}
            </button>
          );
        })}
      </div>
    );
  }

  const Current = ICON[pref] || MonitorIcon;
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" className={iconBtn} aria-label={`${t.label}: ${t[pref]}`} title={t.label}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Current />
      </button>
      {open && (
        <div role="menu" aria-label={t.label} className="absolute top-[calc(100%+6px)] right-0 z-40 w-[170px] rounded-[12px] border border-line bg-surface p-[.3rem] shadow-card">
          {OPTIONS.map(([id, Icon]) => (
            <button key={id} type="button" role="menuitemradio" aria-checked={pref === id}
              onClick={() => { onChange(id); setOpen(false); }}
              className="flex w-full cursor-pointer items-center gap-[.6rem] rounded-[8px] border-0 bg-transparent px-[.6rem] py-[.5rem] text-left font-head text-[.88rem] text-ink hover:bg-bg-2">
              <Icon className="i size-[17px] text-muted" />
              <span className="flex-1">{t[id]}</span>
              {pref === id && <CheckIcon className="i size-[16px] text-lake" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
