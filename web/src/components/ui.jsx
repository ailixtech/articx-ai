import { Link } from "react-router";

// Shared button looks, as class strings so they work on <button> and <Link>.
const BTN = "inline-flex whitespace-nowrap items-center justify-center gap-[.55rem] font-head font-semibold leading-none no-underline cursor-pointer border transition-[background,border-color,filter] duration-150";
const VARIANT = {
  primary: "bg-lake text-lake-ink border-transparent hover:brightness-110",
  ghost: "bg-surface text-ink border-line hover:border-muted",
  quiet: "bg-transparent text-ink border-transparent hover:bg-bg-2",
};
const SIZE = {
  sm: "min-h-[38px] px-[.95rem] py-2 text-[.9rem] rounded-[10px]",
  md: "min-h-[44px] px-5 py-[.65rem] text-[.95rem] rounded-xl",
  lg: "min-h-[54px] px-[1.6rem] py-[.9rem] text-[1.05rem] rounded-[14px]",
};
export const btn = (variant = "primary", size = "md") => `${BTN} ${VARIANT[variant]} ${SIZE[size]}`;

export const iconBtn = "inline-grid place-items-center size-10 flex-none rounded-[10px] border-0 bg-transparent text-muted cursor-pointer hover:bg-bg-2 hover:text-ink";

export function Brand({ small = false, compact = false, icon = true, className = "" }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-[.55rem] font-head font-[750] tracking-[-.02em] text-ink no-underline ${small ? "text-base" : "text-[1.08rem]"} ${className}`}>
      {icon && <img src="/favicon.svg" alt="" className={small ? "size-[26px] rounded-[7px]" : "size-[30px] rounded-lg"} />}
      <span className={compact ? "max-[420px]:hidden" : ""}>ArticxAI</span>
    </Link>
  );
}

export const wrap = "mx-auto w-[min(1140px,100%-2.5rem)]";
