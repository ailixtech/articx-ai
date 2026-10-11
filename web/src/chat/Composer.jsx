import { useEffect } from "react";
import { ArrowUpIcon, StopIcon } from "../components/Icons";
import ModelPicker from "./ModelPicker";
import PastedCard from "./PastedCard";
import { CONFIG } from "../config";
import { isLongPaste, joinPasted } from "../lib/pasted";
import { useLang } from "../i18n";

const touch = () => matchMedia("(pointer: coarse)").matches;

export default function Composer({ value, onChange, pastes, onPastes, onSubmit, onStop, streaming, empty, isGuest, guestLeft, inputRef, model, onModel, onSignUp }) {
  const { s } = useLang();
  const t = s.chat;
  // Grow with the text, up to 220px.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value, inputRef]);

  // Long pastes become cards (see lib/pasted.js); what's sent is the cards plus the typed text.
  const message = joinPasted(pastes, value);
  const size = message.length;
  const max = CONFIG.maxMessageChars;
  const tooLong = size > max;
  const canSend = (value.trim() || pastes.length > 0) && !streaming && !tooLong;
  const send = () => { if (canSend) onSubmit(message); };
  const onPaste = (e) => {
    const text = e.clipboardData?.getData("text/plain") || "";
    if (!isLongPaste(text)) return;
    e.preventDefault();
    onPastes([...pastes, text]);
  };
  const sendBtn = "grid size-[38px] place-items-center rounded-xl border-0 bg-lake text-lake-ink cursor-pointer disabled:cursor-default disabled:opacity-30";

  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }}
      className="mx-auto w-[min(800px,100%-1.5rem)] pt-[.4rem]">
      <div className="rounded-[22px] border border-line bg-surface pt-[.85rem] pr-[.7rem] pb-[.55rem] pl-[1.1rem] shadow-card focus-within:border-lake">
        {pastes.length > 0 && (
          <div className="-ml-[.35rem] mb-[.6rem] flex gap-[.6rem] overflow-x-auto pt-2 pr-2 pb-1 pl-[.35rem]">
            {pastes.map((p, i) => (
              <PastedCard key={i} text={p}
                onEdit={(next) => onPastes(next.trim() ? pastes.map((x, j) => (j === i ? next : x)) : pastes.filter((_, j) => j !== i))}
                onRemove={() => onPastes(pastes.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}
        <label htmlFor="input" className="sr-only">{t.inputLabel}</label>
        <textarea id="input" ref={inputRef} rows={1} placeholder={t.placeholder} autoComplete="off" enterKeyHint="send"
          value={value} onChange={(e) => onChange(e.target.value)} onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !touch()) { e.preventDefault(); send(); }
            if (e.key === "Backspace" && !value && pastes.length && e.currentTarget.selectionStart === 0) onPastes(pastes.slice(0, -1));
          }}
          className={`block max-h-[220px] w-full resize-none border-0 bg-transparent py-[.1rem] font-body leading-[1.55] text-ink outline-none placeholder:text-muted ${empty ? "min-h-12 text-[1.05rem]" : "text-base"}`} />
        <div className="mt-[.4rem] flex items-center justify-between">
          <ModelPicker model={model} onChange={onModel} isGuest={isGuest} onSignUp={onSignUp} />
          {size > max * 0.9 && (
            <span role={tooLong ? "alert" : undefined} className={`ml-auto mr-2 text-[.78rem] tabular-nums ${tooLong ? "font-semibold text-red" : "text-muted"}`}>
              {tooLong ? t.paste.tooLong(size - max) : t.paste.count(size, max)}
            </span>
          )}
          {streaming
            ? <button type="button" className={sendBtn} aria-label={t.stop} onClick={onStop}><StopIcon /></button>
            : <button type="submit" className={sendBtn} aria-label={t.send} disabled={!canSend}><ArrowUpIcon /></button>}
        </div>
      </div>
      {empty && (
        <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label={t.ideas}>
          {t.starters.map((x) => (
            <button key={x} type="button" onClick={() => onSubmit(x)}
              className="cursor-pointer rounded-full border border-line bg-transparent px-[.95rem] py-2 text-[.88rem] font-medium text-muted hover:border-lake hover:bg-surface hover:text-ink">
              {x}
            </button>
          ))}
        </div>
      )}
      {isGuest && guestLeft > 0 && (
        <p className="mt-[.55rem] mb-0 text-center text-[.8rem] font-medium text-lake-deep">
          {t.guestLeft(guestLeft)}
        </p>
      )}
    </form>
  );
}
