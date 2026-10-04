import { useLang } from "../i18n";

export function Boot({ message }) {
  const { s } = useLang();
  return (
    <div role="status" className="flex h-dvh flex-col items-center justify-center gap-3 font-head text-[.95rem] text-muted">
      <img src="/favicon.svg" alt="" className="size-10 rounded-[10px] motion-safe:animate-pulse-soft" />
      <span>{message ?? s.chat.loading}</span>
    </div>
  );
}
