import { useEffect, useRef } from "react";
import { GearIcon, HelpIcon, HistoryIcon, LogoutIcon } from "../components/Icons";
import { useLang } from "../i18n";
import UsageBar from "./UsageBar";

const item = "flex w-full cursor-pointer items-center gap-[.7rem] rounded-[9px] border-0 bg-transparent px-[.7rem] py-[.6rem] text-left font-head text-[.9rem] text-ink no-underline hover:bg-bg-2";

export default function UserMenu({ user, usage, onHistory, onSettings, onSignOut, onClose, anchorRef }) {
  const { s } = useLang();
  const t = s.chat.menu;
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    ref.current?.querySelector("button, a")?.focus();
    const onDoc = (e) => { if (!ref.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) close.current(); };
    const onKey = (e) => { if (e.key === "Escape") { close.current(); anchorRef.current?.focus(); } };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [anchorRef]);
  return (
    <div ref={ref} role="menu" className="fixed top-[calc(56px+env(safe-area-inset-top))] right-3 z-40 w-[270px] rounded-[14px] border border-line bg-surface p-[.4rem] shadow-card">
      <div className="mb-[.3rem] flex min-w-0 flex-col border-b border-line px-[.7rem] pt-[.6rem] pb-[.7rem]">
        <strong className="truncate font-head text-[.93rem]">{user.displayName || t.yourAccount}</strong>
        <span className="truncate text-[.84rem] text-muted">{user.email || ""}</span>
        {usage && <div className="mt-2 -mx-1 sm:hidden"><UsageBar used={usage.used} limit={usage.limit} wide /></div>}
      </div>
      <button type="button" role="menuitem" className={item} onClick={onHistory}><HistoryIcon className="i size-[18px] text-muted" />{t.history}</button>
      <a role="menuitem" className={item} href={`mailto:${t.supportEmail}`} onClick={onClose}><HelpIcon className="i size-[18px] text-muted" />{t.support}</a>
      <button type="button" role="menuitem" className={item} onClick={onSettings}><GearIcon className="i size-[18px] text-muted" />{t.settings}</button>
      <div className="my-[.3rem] border-t border-line" />
      <button type="button" role="menuitem" className={item} onClick={onSignOut}><LogoutIcon className="i size-[18px] text-muted" />{t.signOut}</button>
    </div>
  );
}
