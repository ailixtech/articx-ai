// Centred "Chats" window (History in the account menu, or Ctrl/⌘ K): search and New chat on top,
// every chat grouped by date below. Search matches titles and the messages inside each chat
// (loaded on the first search, then cached by the page). A click outside or Escape closes it.
import { useEffect, useMemo, useRef, useState } from "react";
import { PiChatCircle } from "react-icons/pi";
import { CloseIcon, PenIcon, PinIcon, SearchIcon } from "../components/Icons";
import { iconBtn } from "../components/ui";
import { useLang } from "../i18n";
import { groupOf } from "./Sidebar";

const heading = "px-3 pt-4 pb-[.35rem] font-head text-[.76rem] font-semibold text-muted";

// ~90 characters around the first match, with the match marked.
function Snippet({ text, query }) {
  const at = text.toLowerCase().indexOf(query);
  if (at < 0) return null;
  const start = Math.max(0, at - 40), end = Math.min(text.length, at + query.length + 50);
  const clip = (x) => x.replace(/\s+/g, " ");
  return (
    <span className="block truncate text-[.82rem] text-muted">
      {start > 0 && "…"}{clip(text.slice(start, at))}
      <mark className="rounded-[3px] bg-lake-soft px-[1px] text-ink">{text.slice(at, at + query.length)}</mark>
      {clip(text.slice(at + query.length, end))}{end < text.length && "…"}
    </span>
  );
}

export default function HistoryDialog({ chats, currentId, chatText, onPick, onNew, onClose }) {
  const { s } = useLang();
  const t = s.chat.history, ts = s.chat.sidebar;
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [texts, setTexts] = useState({}); // chat id -> message text
  const [loading, setLoading] = useState(false);
  const loadStarted = useRef(false);
  const query = q.trim().toLowerCase();

  // First real search: load every chat's messages, a few at a time.
  useEffect(() => {
    if (query.length < 2 || loadStarted.current || !chatText) return;
    loadStarted.current = true;
    let live = true;
    setLoading(true);
    const queue = chats.map((c) => c.id);
    const worker = async () => {
      while (live && queue.length) {
        const id = queue.shift();
        try { const text = await chatText(id); if (live) setTexts((x) => ({ ...x, [id]: text })); }
        catch (e) { console.error("History search load failed:", e); }
      }
    };
    Promise.all(Array.from({ length: 5 }, worker)).finally(() => { if (live) setLoading(false); });
    return () => { live = false; loadStarted.current = false; };
  }, [query.length >= 2]); // eslint-disable-line react-hooks/exhaustive-deps
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement;
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close.current(); } };
    document.addEventListener("keydown", onKey, true);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey, true); document.body.style.overflow = ""; before?.focus?.(); };
  }, []);

  // Rows in display order (pinned first, then by date group), with headings between them.
  const { rows, items } = useMemo(() => {
    const inText = (c) => query.length >= 2 && (texts[c.id] || "").toLowerCase().includes(query);
    const shown = query ? chats.filter((c) => c.title.toLowerCase().includes(query) || inText(c)) : chats;
    const pinned = shown.filter((c) => c.pinned).sort((a, b) => b.pinned - a.pinned);
    const out = [], list = [];
    if (pinned.length) {
      out.push({ heading: ts.pinned, pin: true });
      pinned.forEach((c) => { out.push({ chat: c, i: list.length }); list.push(c); });
    }
    let group = null;
    for (const c of shown) {
      if (c.pinned) continue;
      const g = groupOf(c.updated, ts);
      if (g !== group) { group = g; out.push({ heading: g }); }
      out.push({ chat: c, i: list.length });
      list.push(c);
    }
    return { rows: out, items: list };
  }, [chats, query, texts, ts]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && items[active]) { e.preventDefault(); onPick(items[active].id); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(8,20,27,.55)] px-4 pt-[min(12vh,7rem)] pb-4 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={t.title}
        className="flex max-h-[min(640px,calc(100dvh-2rem))] w-[min(680px,100%)] flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-card motion-safe:animate-rise">
        <div className="flex items-center gap-2 border-b border-line py-2 pr-2 pl-4">
          <SearchIcon className="i size-[18px] flex-none text-muted" />
          <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
            placeholder={t.search} aria-label={t.search} autoComplete="off"
            aria-controls="history-list" aria-activedescendant={items[active] ? `history-${items[active].id}` : undefined}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent text-[1rem] text-ink outline-none" />
          <button type="button" className={iconBtn} aria-label={t.close} title={t.close} onClick={onClose}><CloseIcon /></button>
        </div>
        <div ref={listRef} id="history-list" role="listbox" aria-label={t.title} className="min-h-0 flex-1 overflow-y-auto p-2">
          <button type="button" onClick={onNew}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border-0 bg-transparent px-3 py-[.7rem] text-left font-head text-[.93rem] font-semibold text-ink hover:bg-bg-2">
            <PenIcon className="i size-[18px]" />{t.newChat}
          </button>
          {rows.map((r) => (r.heading
            ? <div key={`h-${r.heading}`} className={`${heading} ${r.pin ? "flex items-center gap-[.35rem]" : ""}`}>{r.pin && <PinIcon className="i size-[13px]" />}{r.heading}</div>
            : (
              <button key={r.chat.id} id={`history-${r.chat.id}`} data-i={r.i} type="button" role="option" aria-selected={r.i === active}
                onMouseMove={() => setActive(r.i)} onClick={() => onPick(r.chat.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-[12px] border-0 px-3 py-[.65rem] text-left text-[.93rem] text-ink ${r.i === active ? "bg-bg-2" : "bg-transparent"}`}>
                <PiChatCircle aria-hidden="true" className="size-[18px] flex-none text-muted" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${r.chat.id === currentId ? "font-semibold" : ""}`}>{r.chat.title}</span>
                  {query.length >= 2 && !r.chat.title.toLowerCase().includes(query) && texts[r.chat.id] && <Snippet text={texts[r.chat.id]} query={query} />}
                </span>
              </button>
            )))}
          {loading && <p role="status" className="flex items-center gap-2 px-3 py-3 text-[.86rem] text-muted"><span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />{t.searching}</p>}
          {!items.length && !loading && <p className="px-3 py-4 text-[.9rem] text-muted">{query ? ts.noMatch : ts.empty}</p>}
        </div>
      </div>
    </div>
  );
}
