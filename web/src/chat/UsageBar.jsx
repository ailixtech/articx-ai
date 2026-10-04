import { useLang } from "../i18n";

// A thin bar for today's message allowance; hovering (or focusing) shows % used and left.
export default function UsageBar({ used, limit, wide = false }) {
  const { s } = useLang();
  const t = s.chat.usage;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 90 ? "bg-red" : pct >= 70 ? "bg-[#d4a017]" : "bg-lake";
  const text = t.title(pct, 100 - pct);
  return (
    <div tabIndex={0} role="progressbar" aria-label={t.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={text}
      className="group relative flex h-8 cursor-default items-center rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-lake">
      <div className={`h-[6px] overflow-hidden rounded-full bg-line ${wide ? "w-full" : "w-[min(160px,30vw)]"}`}>
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div role="tooltip"
        className="pointer-events-none absolute top-full left-1 z-50 mt-1 whitespace-nowrap rounded-lg border border-line bg-surface px-[.65rem] py-[.4rem] font-head text-[.8rem] text-ink opacity-0 shadow-card transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        {text}
      </div>
    </div>
  );
}
