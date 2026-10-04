import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { MoreIcon, PenIcon, PinIcon, SearchIcon, ShareIcon, SidebarIcon, TrashIcon, UnpinIcon } from "../components/Icons";
import { Brand, iconBtn } from "../components/ui";
import { useLang } from "../i18n";

function groupOf(d, t, locale) {
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 864e5);
  if (diff <= 0) return t.today;
  if (diff === 1) return t.yesterday;
  if (diff < 7) return t.week;
  if (diff < 30) return t.month;
  const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const heading = "px-[.7rem] pt-4 pb-[.35rem] font-head text-[.76rem] font-semibold text-muted";
const menuItem = "flex w-full cursor-pointer items-center gap-[.65rem] rounded-[8px] border-0 bg-transparent px-[.65rem] py-[.5rem] text-left font-head text-[.88rem] hover:bg-bg-2";

// The ⋯ menu for one chat. Rendered into <body> so the sidebar's scroll area and transform don't clip it.
function ChatMenu({ chat, at, t, onClose, onPin, onShare, onRename, onDelete }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) close.current(); };
    const onKey = (e) => {
      if (e.key === "Escape") close.current(true);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...ref.current.querySelectorAll("button")];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
      }
    };
    const onScroll = () => close.current();
    // Wait a tick so the click that opened the menu doesn't close it. The timer is cleared on
    // unmount, or a listener added after cleanup would linger and close every later menu.
    const timer = setTimeout(() => document.addEventListener("click", onDoc));
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  const top = Math.min(at.top, window.innerHeight - 190);
  const pick = (fn) => () => { onClose(); fn(chat); };
  return createPortal(
    <div ref={ref} role="menu" aria-label={t.more(chat.title)} style={{ top, left: at.left }}
      className="fixed z-60 w-[190px] rounded-[12px] border border-line bg-surface p-[.3rem] shadow-card">
      <button type="button" role="menuitem" className={`${menuItem} text-ink`} onClick={pick(onPin)}>
        {chat.pinned ? <UnpinIcon className="i size-[17px] text-muted" /> : <PinIcon className="i size-[17px] text-muted" />}
        {chat.pinned ? t.unpin : t.pin}
      </button>
      <button type="button" role="menuitem" className={`${menuItem} text-ink`} onClick={pick(onShare)}>
        <ShareIcon className="i size-[17px] text-muted" />{t.share}
      </button>
      <button type="button" role="menuitem" className={`${menuItem} text-ink`} onClick={pick(onRename)}>
        <PenIcon className="i size-[17px] text-muted" />{t.rename}
      </button>
      <div className="my-[.25rem] border-t border-line" />
      <button type="button" role="menuitem" className={`${menuItem} text-red hover:bg-red/10`} onClick={pick(onDelete)}>
        <TrashIcon className="i size-[17px]" />{t.remove}
      </button>
    </div>,
    document.body,
  );
}

function RenameField({ chat, t, onSave, onCancel }) {
  const [value, setValue] = useState(chat.title);
  const done = useRef(false);
  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    const title = value.replace(/\s+/g, " ").trim().slice(0, 120);
    if (save && title && title !== chat.title) onSave(chat.id, title);
    else onCancel();
  };
  return (
    <input autoFocus aria-label={t.renameLabel} value={value} maxLength={120} onFocus={(e) => e.target.select()}
      onChange={(e) => setValue(e.target.value)} onBlur={() => finish(true)}
      onKeyDown={(e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") { e.stopPropagation(); finish(false); } }}
      className="m-[.15rem] min-w-0 flex-1 rounded-[8px] border border-lake bg-surface px-[.55rem] py-[.4rem] text-[.9rem] text-ink outline-none" />
  );
}

export default function Sidebar({ open, onClose, onNew, chats, currentId, onDelete, onPin, onRename, onShare, onPick, searchRef }) {
  const { s } = useLang();
  const t = s.chat.sidebar;
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(null); // { id, at: { top, left } }
  const [editing, setEditing] = useState(null);
  const moreRefs = useRef({});
  const query = q.trim().toLowerCase();
  const shown = query ? chats.filter((c) => c.title.toLowerCase().includes(query)) : chats;
  const pinned = shown.filter((c) => c.pinned).sort((a, b) => b.pinned - a.pinned);

  const openMenu = (c, e) => {
    if (menu?.id === c.id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ id: c.id, at: { top: r.bottom + 4, left: Math.min(r.right - 190, window.innerWidth - 198) } });
  };
  const closeMenu = (refocus) => {
    if (refocus && menu) moreRefs.current[menu.id]?.focus();
    setMenu(null);
  };

  const row = (c) => {
    const active = c.id === currentId;
    const menuOpen = menu?.id === c.id;
    if (editing === c.id) {
      return (
        <div key={c.id} className="flex items-center rounded-[10px] bg-surface">
          <RenameField chat={c} t={t} onCancel={() => setEditing(null)} onSave={(id, title) => { setEditing(null); onRename(id, title); }} />
        </div>
      );
    }
    return (
      <div key={c.id} className={`group flex items-center rounded-[10px] ${active ? "bg-lake-soft" : menuOpen ? "bg-surface" : "hover:bg-surface"}`}>
        <Link to={`/chat/${c.id}`} title={c.title} aria-current={active ? "page" : undefined} onClick={onPick}
          className={`min-w-0 flex-1 truncate px-[.7rem] py-[.55rem] text-[.9rem] text-ink no-underline ${active ? "font-semibold" : ""}`}>
          {c.title}
        </Link>
        <button ref={(el) => { moreRefs.current[c.id] = el; }} type="button" title={t.more(c.title)} aria-label={t.more(c.title)}
          aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => openMenu(c, e)}
          className={`${iconBtn} size-8! opacity-100 focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ${active || menuOpen ? "lg:opacity-100" : ""}`}>
          <MoreIcon className="i size-4" />
        </button>
      </div>
    );
  };

  const rows = [];
  if (pinned.length) {
    rows.push(<div key="g-pinned" className={`${heading} flex items-center gap-[.35rem]`}><PinIcon className="i size-[13px]" />{t.pinned}</div>);
    pinned.forEach((c) => rows.push(row(c)));
  }
  let group = null;
  for (const c of shown) {
    if (c.pinned) continue;
    const g = groupOf(c.updated, t, s.locale);
    if (g !== group) { group = g; rows.push(<div key={`g-${g}`} className={heading}>{g}</div>); }
    rows.push(row(c));
  }
  const menuChat = menu && chats.find((c) => c.id === menu.id);

  return (
    <>
      <aside id="sidebar" aria-label={t.label}
        className={`fixed inset-y-0 left-0 z-30 w-[min(300px,86vw)] flex-none overflow-hidden border-r border-line bg-bg-2 shadow-[0_0_40px_rgba(0,0,0,.25)] transition-transform duration-200 motion-reduce:transition-none
          lg:static lg:z-auto lg:translate-x-0 lg:shadow-none lg:transition-[width]
          ${open ? "translate-x-0 lg:w-[280px]" : "-translate-x-[102%] lg:w-0 lg:border-transparent"}`}>
        <div className="flex h-full w-full flex-col px-[.7rem] pt-[calc(.75rem+env(safe-area-inset-top))] pb-[calc(.75rem+env(safe-area-inset-bottom))] lg:w-[280px]">
          <div className="flex items-center justify-between pb-[.7rem] pl-[.35rem]">
            <Brand small icon={false} className="text-[1.1rem]" />
            <button type="button" className={iconBtn} aria-label={t.close} title={t.close} onClick={onClose}><SidebarIcon /></button>
          </div>
          <label className="mb-[.6rem] flex h-10 items-center gap-[.55rem] rounded-[10px] border border-line bg-surface px-[.7rem] text-muted focus-within:border-lake">
            <SearchIcon className="i size-[17px]" />
            <span className="sr-only">{t.search}</span>
            <input ref={searchRef} type="search" placeholder={t.search} autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-[.92rem] text-ink outline-none" />
          </label>
          <div className="-mx-[.2rem] flex-1 overflow-y-auto px-[.2rem]" onScroll={() => menu && setMenu(null)}>
            {rows.length ? rows : <p className="px-[.7rem] py-[.8rem] text-[.88rem] text-muted">{query ? t.noMatch : t.empty}</p>}
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <button type="button" onClick={onNew}
              className="flex w-full cursor-pointer items-center justify-center gap-[.55rem] rounded-[12px] border-0 bg-lake px-[.7rem] py-[.7rem] font-head text-[.93rem] font-semibold text-lake-ink transition-[filter] hover:brightness-110">
              <PenIcon className="i size-[18px]" /> {t.newChat}
            </button>
          </div>
        </div>
      </aside>
      {menuChat && (
        <ChatMenu chat={menuChat} at={menu.at} t={t} onClose={closeMenu}
          onPin={onPin} onShare={onShare} onRename={(c) => setEditing(c.id)} onDelete={(c) => onDelete(c.id, c.title)} />
      )}
      {open && <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-25 bg-[rgba(8,20,27,.45)] lg:hidden" />}
    </>
  );
}
