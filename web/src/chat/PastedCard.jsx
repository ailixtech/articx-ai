import { useState } from "react";
import Dialog from "../components/Dialog";
import { CheckIcon, CloseIcon, CopyIcon, PenIcon } from "../components/Icons";
import { btn } from "../components/ui";
import { useLang } from "../i18n";

const lineCount = (text) => text.split("\n").length;

// Opens a pasted block in full: editable in the composer, read-only in a sent message.
export function PasteDialog({ text, onSave, onClose }) {
  const { s } = useLang();
  const t = s.chat.paste;
  const [value, setValue] = useState(text);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <Dialog title={t.title} onClose={onClose} width={760}>
      <p className="m-0 mb-2 text-[.82rem] text-muted">{t.size(value.length, lineCount(value))}</p>
      <textarea value={value} readOnly={!onSave} onChange={(e) => setValue(e.target.value)} aria-label={t.title} spellCheck={!!onSave}
        className="block h-[min(55vh,480px)] w-full resize-none rounded-[10px] border border-line bg-bg-2 p-3 font-mono text-[.84rem] leading-[1.5] text-ink outline-none focus:border-lake" />
      <div className="mt-4 flex justify-end gap-2">
        {onSave ? <>
          <button type="button" className={btn("ghost", "sm")} onClick={onClose}>{t.cancel}</button>
          <button type="button" className={btn("primary", "sm")} onClick={() => { onSave(value); onClose(); }}>{t.save}</button>
        </> : <>
          <button type="button" className={btn("ghost", "sm")} onClick={copy}>{copied ? <><CheckIcon className="i size-4" />{t.copied}</> : <><CopyIcon className="i size-4" />{t.copy}</>}</button>
          <button type="button" className={btn("primary", "sm")} onClick={onClose}>{t.close}</button>
        </>}
      </div>
    </Dialog>
  );
}

// A small card for one pasted block. With onRemove/onEdit it's in the composer; otherwise it's in a sent message.
export default function PastedCard({ text, onEdit, onRemove }) {
  const { s } = useLang();
  const t = s.chat.paste;
  const [open, setOpen] = useState(false);
  const editing = !!onEdit;
  return (
    <div className="group/paste relative flex h-[118px] w-[150px] flex-none flex-col rounded-[12px] border border-line bg-bg-2 p-[.6rem] text-left">
      <button type="button" onClick={() => setOpen(true)} aria-label={editing ? t.edit : t.view} title={editing ? t.edit : t.view}
        className="min-h-0 flex-1 cursor-pointer overflow-hidden border-0 bg-transparent p-0 text-left">
        <span className="line-clamp-4 text-[.72rem] leading-[1.35] break-all text-muted">{text.slice(0, 300)}</span>
      </button>
      <div className="mt-[.4rem] flex items-center justify-between gap-1">
        <span className="rounded-[6px] border border-line bg-surface px-[.4rem] py-[.05rem] font-head text-[.66rem] font-semibold tracking-[.06em] text-ink uppercase">{t.label}</span>
        {editing
          ? <button type="button" onClick={() => setOpen(true)} aria-label={t.edit} title={t.edit}
              className="grid size-7 cursor-pointer place-items-center rounded-[8px] border-0 bg-surface text-muted hover:text-ink"><PenIcon className="i size-[14px]" /></button>
          : <span className="text-[.66rem] text-muted">{t.lines(lineCount(text))}</span>}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={t.remove} title={t.remove}
          className="absolute -top-2 -right-2 grid size-6 cursor-pointer place-items-center rounded-full border border-line bg-surface text-muted opacity-100 shadow-card hover:text-ink lg:opacity-0 lg:group-hover/paste:opacity-100 lg:focus-visible:opacity-100">
          <CloseIcon className="i size-3" />
        </button>
      )}
      {open && <PasteDialog text={text} onSave={onEdit} onClose={() => setOpen(false)} />}
    </div>
  );
}
