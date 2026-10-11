import { useEffect, useRef } from "react";

// A centred modal: closes on Escape or a click outside, focuses its first control, and returns focus on close.
export default function Dialog({ title, onClose, children, width = 520 }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.querySelector("select, textarea, input, button:not([data-skip-focus])")?.focus();
    const onKey = (e) => { if (e.key === "Escape") close.current(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); before?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,20,27,.45)] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dialog-title" style={{ width: `min(${width}px, 100%)` }}
        className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[18px] border border-line bg-surface p-6 shadow-card">
        <h2 id="dialog-title" className="m-0 mb-4 pr-10 font-head text-[1.3rem] font-bold tracking-[-.01em]">{title}</h2>
        {children}
      </div>
    </div>
  );
}
