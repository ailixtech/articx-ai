import { useEffect, useRef, useState } from "react";
import { CheckIcon, Leaf, LockIcon } from "../components/Icons";
import { CONFIG } from "../config";
import { useLang } from "../i18n";

// The "Maple" chip in the message box. Opens upward, since the box sits at the bottom.
export default function ModelPicker({ model, onChange, isGuest, onSignUp }) {
  const { s } = useLang();
  const t = s.chat.picker;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = CONFIG.models.find((m) => m.id === model) || CONFIG.models[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); ref.current?.querySelector("button")?.focus(); } };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey, true);
    ref.current?.querySelector("[aria-checked=true]")?.focus();
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey, true); };
  }, [open]);

  function pick(m) {
    if (m.accountsOnly && isGuest) { setOpen(false); onSignUp(); return; }
    onChange(m.id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-[.4rem] rounded-full border border-line bg-surface py-[.3rem] pr-[.6rem] pl-[.6rem] font-head text-[.8rem] font-semibold text-ink hover:border-muted">
        <Leaf size={14} />{current.name}
        <svg viewBox="0 0 24 24" className={`i size-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div role="menu" aria-label={t.choose}
          className="absolute bottom-[calc(100%+.5rem)] left-0 z-20 w-[min(300px,calc(100vw-2.5rem))] rounded-[14px] border border-line bg-surface p-[.35rem] shadow-card">
          {CONFIG.models.map((m) => {
            const locked = m.accountsOnly && isGuest;
            const selected = m.id === current.id;
            return (
              <button key={m.id} type="button" role="menuitemradio" aria-checked={selected} onClick={() => pick(m)}
                className="flex w-full cursor-pointer items-start gap-3 rounded-[10px] border-0 bg-transparent px-3 py-[.6rem] text-left hover:bg-bg-2">
                <Leaf size={16} className="mt-[3px]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-head text-[.9rem] font-semibold text-ink">
                    {m.name}
                    {m.id === CONFIG.defaultModel && <span className="rounded-full bg-lake-soft px-2 py-px text-[.7rem] font-semibold text-lake-deep">{t.default}</span>}
                  </span>
                  <span className="block text-[.82rem] leading-snug text-muted">{t.descriptions[m.id]}</span>
                  {locked && <span className="mt-1 block text-[.8rem] font-semibold text-lake-deep">{t.signUpToUse}</span>}
                </span>
                {locked ? <LockIcon className="i mt-[3px] size-4 text-muted" /> : selected && <CheckIcon className="i mt-[3px] size-4 text-lake-deep" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
