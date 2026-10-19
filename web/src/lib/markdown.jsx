// Safe Markdown: the model's text becomes React elements, never HTML strings,
// so nothing it writes can run as code. Links to trusted official sites (TRUSTED) are clickable;
// all others are shown as plain "unverified" text, because the model can invent URLs.
import { useState } from "react";
import { useLang } from "../i18n";

export function Markdown({ text }) {
  const { s } = useLang();
  const t = s.chat;
  return text.split("```").map((part, i) => {
    if (i % 2 === 0) return <Blocks key={i} text={part} t={t} />;
    const nl = part.indexOf("\n");
    return <CodeBlock key={i} code={nl === -1 ? "" : part.slice(nl + 1).replace(/\n$/, "")} t={t} />;
  });
}

function CodeBlock({ code, t }) {
  const [state, setState] = useState("copy");
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setState("copied"); }
    catch { setState("copyFailed"); }
    setTimeout(() => setState("copy"), 1500);
  };
  const label = t[state];
  return (
    <pre>
      <code>{code}</code>
      <button type="button" onClick={copy}
        className="absolute top-[.45rem] right-[.45rem] cursor-pointer rounded-lg border border-line bg-surface px-[.6rem] py-1 text-xs text-muted">
        {label}
      </button>
    </pre>
  );
}

function Blocks({ text, t }) {
  const out = [];
  let para = [], list = null;
  const flushPara = () => {
    if (!para.length) return;
    out.push(<p key={out.length}>{para.flatMap((l, i) => (i ? [<br key={`b${i}`} />, inline(l, i, t)] : [inline(l, i, t)]))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((x, i) => <li key={i}>{inline(x, i, t)}</li>);
    out.push(list.type === "ol"
      ? <ol key={out.length} start={list.start !== 1 ? list.start : undefined}>{items}</ol>
      : <ul key={out.length}>{items}</ul>);
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); if (list?.type === "ul") flushList(); continue; }
    if ((m = line.match(/^\s*#{1,6}\s+(.*)$/))) { flushPara(); flushList(); out.push(<h3 key={out.length}>{inline(m[1], 0, t)}</h3>); continue; }
    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      flushPara();
      if (list?.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]); continue;
    }
    if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      flushPara();
      if (list?.type !== "ol") { flushList(); list = { type: "ol", start: +m[1], items: [] }; }
      list.items.push(m[2]); continue;
    }
    flushList(); para.push(line);
  }
  flushPara(); flushList();
  return out;
}

// Official sites the model may link to directly. Anything else stays "unverified" text,
// because a made-up or look-alike domain could mislead or phish. Links are always opened over https.
const TRUSTED = [
  "canada.ca", "gc.ca", "elections.ca", "ontario.ca", "quebec.ca", "gouv.qc.ca", "gov.bc.ca", "alberta.ca", "gov.mb.ca",
  "saskatchewan.ca", "novascotia.ca", "gov.ns.ca", "gnb.ca", "gov.nl.ca", "princeedwardisland.ca", "gov.pe.ca", "yukon.ca",
  "gov.nt.ca", "gov.nu.ca", "toronto.ca", "montreal.ca", "ottawa.ca", "vancouver.ca", "calgary.ca", "edmonton.ca", "winnipeg.ca",
  "988.ca", "cybertip.ca", "redcross.ca", "articx.com", "wikipedia.org",
];
function trustedUrl(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname.toLowerCase();
    if (u.username || u.password || u.port) return null;
    if (!TRUSTED.some((d) => host === d || host.endsWith(`.${d}`))) return null;
    u.protocol = "https:";
    return u.href;
  } catch { return null; }
}

const LINK = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<>()]*[^\s<>().,;:!?'"])/g;

// `code`, links, then **bold** / *italic* inside the remaining text.
function inline(s, k, t) {
  return s.split(/(`[^`]+`)/g).map((part, i) => {
    const key = `${k}-${i}`;
    if (/^`[^`]+`$/.test(part)) return <code key={key}>{part.slice(1, -1)}</code>;
    const nodes = [];
    let last = 0;
    for (const m of part.matchAll(LINK)) {
      if (m.index > last) nodes.push(...emphasis(part.slice(last, m.index), `${key}-t${m.index}`));
      const url = m[2] || m[3];
      const safe = trustedUrl(url);
      const span = safe
        ? <a key={`${key}-u${m.index}`} href={safe} target="_blank" rel="noopener noreferrer nofollow">{url.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</a>
        : <span key={`${key}-u${m.index}`} className="unverified-link" title={t.unverifiedTitle} data-note={t.unverifiedNote}>{url}</span>;
      nodes.push(...(m[1] ? [...emphasis(m[1], `${key}-l${m.index}`), " (", span, ")"] : [span]));
      last = m.index + m[0].length;
    }
    if (last < part.length) nodes.push(...emphasis(part.slice(last), `${key}-e`));
    return nodes;
  });
}
function emphasis(s, k) {
  return s.split(/(\*\*.+?\*\*)/g).flatMap((part, i) => {
    if (/^\*\*.+\*\*$/.test(part)) return [<strong key={`${k}b${i}`}>{part.slice(2, -2)}</strong>];
    const out = [];
    let last = 0;
    for (const m of part.matchAll(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g)) {
      const start = m.index + m[1].length;
      if (start > last) out.push(part.slice(last, start));
      out.push(<em key={`${k}i${i}-${start}`}>{m[2]}</em>);
      last = m.index + m[0].length;
    }
    if (last < part.length) out.push(part.slice(last));
    return out;
  });
}
