import { useState } from "react";
import Dialog from "../components/Dialog";
import { CheckIcon, LinkIcon } from "../components/Icons";
import { btn } from "../components/ui";
import { useLang } from "../i18n";
import { call } from "./account";

// Creates, refreshes or removes a chat's public link (functions/share.js).
// chat.shareId comes from the live chat list, so the dialog updates by itself.
export default function ShareDialog({ fb, chat, onClose }) {
  const { s } = useLang();
  const t = s.chat.share;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const url = chat.shareId ? `${location.origin}/share/${chat.shareId}` : null;

  const run = async (data) => {
    setBusy(true); setError(null);
    try {
      const { id } = await call(fb, "shareChat", { chatId: chat.id, ...data });
      if (id) copy(`${location.origin}/share/${id}`);
    } catch (e) {
      console.error(e);
      setError(e?.code === "functions/failed-precondition" ? t.empty : t.failed);
    } finally { setBusy(false); }
  };
  const copy = async (link) => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <Dialog title={t.title} onClose={onClose}>
      <p className="m-0 mb-4 truncate font-head text-[.95rem] font-semibold">{chat.title}</p>
      <p className="m-0 mb-4 text-[.88rem] text-muted">{t.lead}</p>
      {url && (
        <div className="mb-4 flex items-center gap-2 rounded-[10px] border border-line bg-bg-2 py-1 pr-1 pl-3">
          <LinkIcon className="i size-4 flex-none text-muted" />
          <input readOnly value={url} aria-label={t.title} onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 border-0 bg-transparent text-[.88rem] text-ink outline-none" />
          <button type="button" className={btn("primary", "sm")} onClick={() => copy(url)}>
            {copied ? <><CheckIcon className="i size-4" />{t.copied}</> : t.copy}
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-0 mb-3 text-[.85rem] text-red">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {url && <button type="button" className={`${btn("ghost", "sm")} mr-auto text-red!`} disabled={busy} onClick={() => run({ stop: true })}>{t.stop}</button>}
        <button type="button" className={btn("ghost", "sm")} onClick={onClose}>{t.close}</button>
        <button type="button" className={btn(url ? "ghost" : "primary", "sm")} disabled={busy} onClick={() => run({})}>
          {!url && copied ? t.copied : url ? t.update : t.create}
        </button>
      </div>
    </Dialog>
  );
}
