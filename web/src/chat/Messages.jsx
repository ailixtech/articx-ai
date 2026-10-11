import { useState } from "react";
import { Markdown } from "../lib/markdown";
import { splitPasted } from "../lib/pasted";
import PastedCard from "./PastedCard";
import { ChatIcon, CheckIcon, CopyIcon, DatabaseIcon, InfoIcon, LockIcon, ShareIcon, ThumbDownIcon, ThumbUpIcon } from "../components/Icons";
import { btn, iconBtn } from "../components/ui";
import { CONFIG } from "../config";
import { useLang } from "../i18n";

const LIVE_TOPIC = /\b(aujourd'hui|ce soir|hier|cette (semaine|fin de semaine)|en ce moment|dernières? nouvelles|actualités?|récemment|élections?|sondages?|bourse|cours de|prix de|taux de change|taux d'intérêt|météo|prévisions?|qui a gagné|today|tonight|yesterday|this (week|weekend|month|morning|year)|right now|latest|breaking|news|headlines?|recent(ly)?|just (happened|announced|released)|elections?|polls?|stock|share price|price of|exchange rate|interest rate|scores?|standings|weather|forecast|who won|who is the (current|new)|20(2[5-9]|3\d))\b/i;
const row = "mx-auto mb-[1.6rem] max-w-[760px]";

export function UserBubble({ content }) {
  const { pastes, text } = splitPasted(content);
  return (
    <div className={`${row} flex flex-col items-end gap-2`}>
      {pastes.length > 0 && (
        <div className="flex max-w-[80%] flex-wrap justify-end gap-2">
          {pastes.map((p, i) => <PastedCard key={i} text={p} />)}
        </div>
      )}
      {text && <div className="max-w-[80%] whitespace-pre-wrap rounded-[20px_20px_6px_20px] bg-lake-soft px-[1.05rem] py-[.7rem] text-ink [overflow-wrap:anywhere]">{text}</div>}
    </div>
  );
}

const action = (on) => `${iconBtn} size-8! ${on ? "text-lake-deep!" : ""}`;

// Copy, thumbs up / down and share under each finished reply.
// Without onRate (e.g. on a shared chat) only Copy is shown.
function ReplyActions({ text, rating, onRate, onDislike, onToast }) {
  const { s } = useLang();
  const t = s.chat.actions;
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Maple", text }); } catch { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(text); onToast?.(t.shareCopied); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="mt-[.35rem] -ml-2 flex gap-[2px]">
      <button type="button" className={action(false)} title={done ? t.copied : t.copy} aria-label={done ? t.copied : t.copy} onClick={copy}>
        {done ? <CheckIcon className="i size-4" /> : <CopyIcon className="i size-4" />}
      </button>
      {onRate && <>
        <button type="button" className={action(rating === "up")} title={t.good} aria-label={t.good} aria-pressed={rating === "up"} onClick={() => onRate(rating === "up" ? null : "up")}>
          <ThumbUpIcon className="i size-4" style={rating === "up" ? { fill: "currentColor" } : undefined} />
        </button>
        <button type="button" className={action(rating === "down")} title={t.bad} aria-label={t.bad} aria-pressed={rating === "down"} onClick={() => (rating === "down" ? onRate(null) : onDislike())}>
          <ThumbDownIcon className="i size-4" style={rating === "down" ? { fill: "currentColor" } : undefined} />
        </button>
        <button type="button" className={action(false)} title={t.share} aria-label={t.share} onClick={share}>
          <ShareIcon className="i size-4" />
        </button>
      </>}
    </div>
  );
}

export function AssistantMessage({ content, streaming, rating, onRate, onDislike, onToast }) {
  const { s } = useLang();
  return (
    <div className={row}>
      <div className="min-w-0">
        {streaming && !content ? (
          <p role="status" className="m-0 flex h-[30px] items-center font-head text-[.95rem] font-medium">
            <span className="thinking-text">{s.chat.thinking}</span>
            <span className="thinking-dots" aria-hidden="true"><span /><span /><span /></span>
          </p>
        ) : (
          <div className={`prose-reply ${streaming ? "typing" : ""}`}><Markdown text={content} /></div>
        )}
        {!streaming && content && <ReplyActions text={content} rating={rating} onRate={onRate} onDislike={onDislike} onToast={onToast} />}
      </div>
    </div>
  );
}

export function MessageList({ messages, notice, listRef, gate, ratings = {}, onRate, onDislike, onToast }) {
  const { s } = useLang();
  const items = [];
  messages.forEach((m, i) => {
    if (m.role === "user") items.push(<UserBubble key={i} content={m.content} />);
    else {
      items.push(
        <AssistantMessage key={i} content={m.content} streaming={m.streaming} rating={ratings[i]} onToast={onToast}
          onRate={onRate && ((r) => onRate(i, r))} onDislike={onDislike && (() => onDislike(i))} />
      );
      if (m.sources?.length && !m.streaming) items.push(<Sources key={`s${i}`} list={m.sources} label={s.chat.sources} />);
      if (!m.streaming && m.content && !m.searched && !m.sources?.length && i > 0 && messages[i - 1].role === "user" && LIVE_TOPIC.test(messages[i - 1].content)) {
        items.push(
          <p key={`n${i}`} className="mx-auto -mt-[.8rem] mb-[1.6rem] max-w-[760px] rounded-r-[10px] border-l-[3px] border-red bg-bg-2 px-[.9rem] py-[.65rem] text-[.87rem] text-muted">
            {s.chat.liveNote}
          </p>
        );
      }
    }
  });
  return (
    <div ref={listRef} aria-live="polite" className="flex-1 overflow-y-auto overscroll-contain px-[.85rem] pt-4 pb-2 lg:px-4 lg:pt-6 lg:pb-4">
      {items}
      {notice && <p role="alert" className="mx-auto mb-[1.6rem] max-w-[760px] rounded-[10px] border border-red px-[.9rem] py-[.65rem] text-[.87rem] text-ink">{notice}</p>}
      {gate}
    </div>
  );
}

// Links from the web search (sent by the chat function, not written by the model).
function Sources({ list, label }) {
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  return (
    <div className="mx-auto -mt-[.8rem] mb-[1.6rem] max-w-[760px]">
      <p className="m-0 mb-[.35rem] text-[.8rem] font-semibold text-muted">{label}</p>
      <ol className="m-0 flex list-none flex-col gap-[.3rem] p-0">
        {list.map((src, n) => (
          <li key={n} className="flex min-w-0 gap-2 text-[.87rem]">
            <span className="flex-none text-muted">[{n + 1}]</span>
            <a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 truncate text-lake-deep underline-offset-2 hover:underline">
              {src.title} <span className="text-muted">· {host(src.url)}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Shown under the last reply once a guest has used all their free messages.
export function LimitNotice({ onSignUp }) {
  const { s } = useLang();
  return (
    <div role="status" className="mx-auto mb-[1.6rem] flex max-w-[760px] flex-col items-start gap-3 rounded-[14px] border border-line bg-surface px-5 py-4 shadow-card motion-safe:animate-rise sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 text-[.93rem] text-ink">
        {s.chat.limit.text}
      </p>
      <button type="button" className={`${btn("primary", "sm")} flex-none`} onClick={onSignUp}>{s.chat.limit.button}</button>
    </div>
  );
}

const PERK_ICONS = [ChatIcon, DatabaseIcon, LockIcon, InfoIcon];

// Shown to guests in place of an answer once their free messages are used up.
export function GateCard({ pending, hadChat, onEdit, onAuth }) {
  const { s } = useLang();
  const g = s.chat.gate;
  return (
    <>
      <UserBubble content={pending} />
      <div className="mx-auto -mt-[1.2rem] mb-5 max-w-[760px] text-right">
        <button type="button" onClick={onEdit} className="cursor-pointer border-0 bg-transparent text-[.84rem] text-muted hover:text-ink hover:underline">{g.edit}</button>
      </div>
      <section aria-label={g.titleMore}
        className="mx-auto grid max-w-[760px] grid-cols-1 gap-[1.4rem] rounded-[22px] border border-line bg-surface p-[clamp(1.4rem,3vw,2rem)] shadow-card motion-safe:animate-rise lg:grid-cols-[1.2fr_1fr] lg:gap-8">
        <div>
          <h2 className="m-0 mb-[.4rem] text-[1.3rem] font-[750] tracking-[-.02em]">{hadChat ? g.titleMore : g.titleNew}</h2>
          <p className="m-0 mb-[1.3rem] text-[.95rem] text-muted">
            {hadChat ? g.subMore(CONFIG.guestMessageLimit) : g.subNew}
          </p>
          <div className="flex flex-col gap-[.55rem]">
            <button type="button" className={`${btn("primary")} w-full`} onClick={() => onAuth("signup")}>{g.create}</button>
          </div>
          <p className="mt-4 mb-0 text-[.9rem] text-muted">{g.haveAccount}{" "}
            <button type="button" onClick={() => onAuth("signin")} className="cursor-pointer border-0 bg-transparent p-0 text-[.9rem] text-lake-deep underline underline-offset-[3px]">{g.signIn}</button>
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col justify-center gap-[.95rem] border-t border-line p-0 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          {g.perks.map((text, i) => [PERK_ICONS[i], text]).map(([Icon, text]) => <li key={text} className="flex items-center gap-[.7rem] text-[.93rem]"><Icon className="i text-lake-deep" />{text}</li>)}
        </ul>
      </section>
    </>
  );
}
