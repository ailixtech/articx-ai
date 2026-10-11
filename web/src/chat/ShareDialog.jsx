import { useEffect, useRef, useState } from "react";
import Dialog from "../components/Dialog";
import { CheckIcon, CloseIcon, LinkIcon } from "../components/Icons";
import { btn, iconBtn } from "../components/ui";
import { useLang } from "../i18n";
import { call } from "./account";

// Opens with the chat's public link ready to copy (functions/share.js): the link is created
// on open if the chat isn't shared yet. chat.shareId comes from the live chat list.
export default function ShareDialog({ fb, chat, onClose }) {
  const { s } = useLang();
  const t = s.chat.share;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [madeId, setMadeId] = useState(null); // shown right away, before the chat list catches up
  const started = useRef(false);
  const id = stopped ? null : chat.shareId || madeId;
  const url = id ? `${location.origin}/share/${id}` : null;

  const run = async (data = {}) => {
    setBusy(true); setError(null); setCopied(false);
    try {
      const r = await call(fb, "shareChat", { chatId: chat.id, ...data });
      setMadeId(r.id || null);
      setStopped(!!data.stop);
    } catch (e) {
      console.error(e);
      setError(e?.code === "functions/failed-precondition" ? t.empty : t.failed);
    } finally { setBusy(false); }
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!chat.shareId) run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { document.getElementById("share-url")?.select(); }
  };

  return (
    <Dialog title={t.title} onClose={onClose}>
      <button type="button" data-skip-focus className={`${iconBtn} absolute top-3 right-3`} aria-label={t.close} title={t.close} onClick={onClose}><CloseIcon /></button>
      <p className="m-0 mb-1 truncate font-head text-[.95rem] font-semibold">{chat.title}</p>
      <p className="m-0 mb-4 text-[.86rem] text-muted">{stopped ? t.stopped : t.lead}</p>
      {!stopped && (
        <div className="mb-3 flex items-center gap-2 rounded-full border border-line bg-bg-2 py-[.3rem] pr-[.3rem] pl-4">
          <LinkIcon className="i size-4 flex-none text-muted" />
          <input id="share-url" readOnly value={url || (busy ? t.creating : "")} aria-label={t.title} onFocus={(e) => e.target.select()}
            className={`min-w-0 flex-1 border-0 bg-transparent text-[.9rem] outline-none ${url ? "text-ink" : "text-muted"}`} />
          <button type="button" className={`${btn("primary", "sm")} rounded-full!`} disabled={!url || busy} onClick={copy}>
            {busy && !url
              ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
              : copied ? <><CheckIcon className="i size-4" />{t.copied}</> : t.copy}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-0 mb-3 text-[.85rem] text-red">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {url && <button type="button" className={`${btn("quiet", "sm")} mr-auto text-red!`} disabled={busy} onClick={() => run({ stop: true })}>{t.stop}</button>}
        {(url || stopped || error) && (
          <button type="button" className={btn("ghost", "sm")} disabled={busy} onClick={() => run()}>
            {error && !url ? t.retry : url ? t.update : t.create}
          </button>
        )}
      </div>
    </Dialog>
  );
}
