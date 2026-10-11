import "@fontsource/open-sans/800.css"; // logo and headline; 400–700 load in main.jsx
import { useEffect, useId, useRef, useState } from "react";
import { usePageTitle } from "../components/SiteLayout";
import { CheckIcon, LEAF_PATH, LEAF_VIEWBOX, LockIcon } from "../components/Icons";
import { useLang } from "../i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same list as PROVINCES in functions/waitlist.js.
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT", "outside"];
const FIELDS = ["firstName", "email", "province", "consent"];
const NIGHT = "#030609";
const COUNT_REFRESH_MS = 30_000;

const label = "mb-1.5 block font-body text-[.86rem] font-medium text-[#C3D2DC]";
const field = "h-12 w-full rounded-xl border bg-white/[.04] px-4 font-body text-[1rem] text-white transition-[border-color,box-shadow] placeholder:text-white/35 hover:border-white/30 focus:border-[#009DC4] focus:ring-4 focus:ring-[#009DC4]/20 focus-visible:outline-none";
const fieldBorder = (bad) => (bad ? "border-[#FF8F9E]" : "border-white/15");
const errorText = "m-0 mt-1.5 font-body text-[.84rem] leading-snug text-[#FF9AA8]";

// ---------- Page ----------
export default function Waitlist() {
  const { s, lang } = useLang();
  const w = s.waitlist;
  usePageTitle(w.pageTitle);
  useNightChrome();
  const [count, refreshCount] = useWaitlistCount();
  const [noticeOpen, setNoticeOpen] = useState(false);

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#030609] bg-[linear-gradient(180deg,#030609_0%,#050C14_28%,#0A1E30_62%,#0C2438_100%)] font-body text-[#E6EEF3] [--focus:#4CC6E4]">
      <div className="aurora -z-10" aria-hidden="true" />

      <header className="flex items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
        <div className="inline-flex items-center gap-2.5" aria-label="ARTICX" role="img">
          <img src="/favicon.svg" alt="" className="size-9 rounded-[10px] ring-1 ring-white/10 sm:size-10" />
          <span aria-hidden="true" className="font-body text-[1.3rem] font-extrabold tracking-[.04em] text-white sm:text-[1.45rem]">ARTICX</span>
        </div>
        <LangSwitch label={w.langLabel} />
      </header>

      <main className="mx-auto flex w-[min(900px,100%-2rem)] flex-1 flex-col items-center pt-[clamp(1.75rem,5vh,2.5rem)] pb-10 sm:pt-[clamp(2.5rem,10vh,6rem)] text-center sm:pb-14">
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.05] px-4 py-1.5 font-body text-[.84rem] font-medium text-[#C3D2DC]">
          <span className="size-1.5 rounded-full bg-[#3DDC97]" aria-hidden="true" />
          {w.pill}
        </p>

        <h1 className="mt-5 mb-4 max-w-[24ch] sm:mt-6 sm:mb-5 font-body text-[clamp(2rem,5.6vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-.025em] text-white text-balance">
          <Highlight text={w.title} word={w.titleRed} className="text-[#F0303F]" />
        </h1>
        <p className="m-0 max-w-[68ch] text-[clamp(.98rem,1.8vw,1.13rem)] leading-[1.65] text-pretty text-[#B5C5D0]">
          {w.intro[0]}<br className="max-sm:hidden" /> {w.intro[1]}
        </p>

        {/* Frosted glass: blue maple leaves sit behind the panel, crisp where they peek out, blurred through it */}
        <div className="relative isolate mt-8 w-full sm:mt-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <GlassLeaf className="absolute -top-7 sm:-top-[clamp(3.5rem,7vw,5.5rem)] -left-[clamp(1.5rem,6vw,5rem)] size-[clamp(8rem,22vw,13rem)] -rotate-12 opacity-85" from="#A8E6F5" to="#009DC4" />
            <GlassLeaf className="absolute top-[30%] -right-[clamp(1.25rem,4.5vw,3.5rem)] size-[clamp(4.5rem,10vw,7rem)] rotate-[18deg] opacity-80" from="#A8E6F5" to="#33B6D6" />
            <GlassLeaf className="absolute -right-[clamp(.5rem,2vw,1.5rem)] -bottom-[clamp(1.5rem,4vw,3rem)] size-[clamp(5rem,12vw,8rem)] -rotate-[20deg] opacity-75" from="#7FD6EC" to="#00789A" />
          </div>
          <div className="rounded-3xl bg-[#0B1A26]/35 p-[clamp(1.25rem,3.5vw,2rem)] text-left shadow-[0_40px_100px_-40px_rgba(0,0,0,.8)] backdrop-blur-2xl backdrop-saturate-150 sm:rounded-[28px]">
            <JoinForm w={w} lang={lang} onJoined={refreshCount} />
          </div>
        </div>

        {count > 0 && (
          <p className="mt-7 mb-0 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#08121B]/70 px-4 py-1.5 text-[.88rem] font-medium text-white backdrop-blur" aria-live="polite">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inset-0 rounded-full bg-[#3DDC97]/70 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-[#3DDC97]" />
            </span>
            {w.count(count, new Intl.NumberFormat(s.locale).format(count))}
          </p>
        )}
        <p className="mt-5 mb-0 max-w-[36ch] text-center text-[.84rem] leading-relaxed text-balance text-[#C3D2DC] sm:max-w-none sm:whitespace-nowrap">
          <LockIcon className="i mr-1.5 inline size-3.5 -translate-y-px align-middle" />
          {w.privacy}{" "}
          <button type="button" onClick={() => setNoticeOpen(true)} aria-haspopup="dialog"
            className="cursor-pointer border-0 bg-transparent p-0 font-body text-[inherit] text-white underline decoration-white/40 underline-offset-[3px] hover:decoration-white max-sm:mt-1 max-sm:block max-sm:w-full">
            {w.notice.link}
          </button>
        </p>
      </main>

      <footer className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[.8rem] text-[#9FB2C0]">
        <p className="m-0">{w.copyright}</p>
      </footer>

      <PrivacyNotice n={w.notice} open={noticeOpen} onClose={() => setNoticeOpen(false)} />
    </div>
  );
}

// ---------- Form ----------
function JoinForm({ w, lang, onJoined }) {
  const f = w.form;
  const id = useId();
  const refs = { firstName: useRef(null), email: useRef(null), province: useRef(null), consent: useRef(null) };
  const doneRef = useRef(null);
  const [form, setForm] = useState({ firstName: "", email: "", province: "", consent: false, website: "" });
  const [errors, setErrors] = useState({}); // field -> key of f.errors
  const [formError, setFormError] = useState(null); // throttled | server | network
  const [status, setStatus] = useState("idle"); // idle | sending | done

  const set = (k, v) => {
    setForm((x) => ({ ...x, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
    setFormError(null);
  };
  const showErrors = (errs) => {
    setErrors(errs);
    refs[FIELDS.find((k) => errs[k])]?.current?.focus();
  };

  useEffect(() => { if (status === "done") doneRef.current?.focus(); }, [status]);

  async function submit(e) {
    e.preventDefault();
    if (status === "sending") return;
    const data = { ...form, firstName: form.firstName.trim(), email: form.email.trim() };
    const errs = {};
    if (!data.firstName) errs.firstName = "firstName";
    if (!EMAIL_RE.test(data.email)) errs.email = "email";
    if (!PROVINCES.includes(data.province)) errs.province = "province";
    if (!data.consent) errs.consent = "consent";
    if (Object.keys(errs).length) return showErrors(errs);

    setStatus("sending");
    setFormError(null);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, language: lang }),
      });
      if (r.ok) {
        setForm(data);
        setStatus("done");
        onJoined();
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (FIELDS.includes(d.error)) showErrors({ [d.error]: d.error });
      else setFormError(f.errors[d.error] ? d.error : "server");
    } catch {
      setFormError("network");
    }
    setStatus("idle");
  }

  if (status === "done") {
    return (
      <div className="py-3 text-center sm:py-4" role="status">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#009DC4]/15 text-[#009DC4] ring-1 ring-[#009DC4]/40">
          <CheckIcon className="i size-7" />
        </span>
        <h2 ref={doneRef} tabIndex={-1} className="mt-5 mb-3 font-body text-[clamp(1.4rem,3.4vw,1.9rem)] font-bold leading-tight tracking-[-.015em] text-white focus:outline-none">
          {w.done.title(form.firstName)}
        </h2>
        <p className="m-0 text-[1rem] text-[#B5C5D0]">
          {w.done.text} <strong className="font-semibold break-all text-white">{form.email}</strong>
        </p>
        <p className="mt-2 mb-0 text-[.88rem] text-[#8FA4B3]">{w.done.note}</p>
        <button type="button" onClick={() => { setForm({ firstName: "", email: "", province: "", consent: false, website: "" }); setStatus("idle"); }}
          className="mt-6 cursor-pointer rounded-full border border-white/15 bg-transparent px-5 py-2.5 font-body text-[.9rem] font-medium text-[#C3D2DC] hover:border-white/35 hover:text-white">
          {w.done.again}
        </button>
      </div>
    );
  }

  const sending = status === "sending";
  const err = (k) => errors[k] && <p id={`${id}-${k}-err`} className={errorText}>{f.errors[errors[k]]}</p>;
  const describedBy = (k) => (errors[k] ? `${id}-${k}-err` : undefined);

  return (
    <form onSubmit={submit} noValidate aria-label={f.label}>
      <div className="grid gap-4 md:grid-cols-[1fr_1.35fr_1.25fr]">
        <div>
          <label htmlFor={`${id}-firstName`} className={label}>{f.firstName}</label>
          <input ref={refs.firstName} id={`${id}-firstName`} name="given-name" autoComplete="given-name" autoCapitalize="words" maxLength={60} required
            placeholder={f.firstNamePlaceholder} value={form.firstName} onChange={(e) => set("firstName", e.target.value)}
            aria-invalid={!!errors.firstName || undefined} aria-describedby={describedBy("firstName")}
            className={`${field} ${fieldBorder(errors.firstName)}`} />
          {err("firstName")}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>{f.email}</label>
          <input ref={refs.email} id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required
            placeholder={f.emailPlaceholder} value={form.email} onChange={(e) => set("email", e.target.value)}
            aria-invalid={!!errors.email || undefined} aria-describedby={describedBy("email")}
            className={`${field} ${fieldBorder(errors.email)}`} />
          {err("email")}
        </div>
        <div>
          <label htmlFor={`${id}-province`} className={label}>{f.province}</label>
          <div className="relative">
            <select ref={refs.province} id={`${id}-province`} name="province" autoComplete="address-level1" required
              value={form.province} onChange={(e) => set("province", e.target.value)}
              aria-invalid={!!errors.province || undefined} aria-describedby={describedBy("province")}
              className={`${field} ${fieldBorder(errors.province)} cursor-pointer appearance-none pr-10 ${form.province ? "" : "text-white/45"}`}>
              <option value="" disabled className="bg-[#0B1A26] text-white/60">{f.provincePlaceholder}</option>
              {PROVINCES.map((p) => <option key={p} value={p} className="bg-[#0B1A26] text-white">{w.provinces[p]}</option>)}
            </select>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="i pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-white/60"><path d="m6 9 6 6 6-6" /></svg>
          </div>
          {err("province")}
        </div>
      </div>

      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} /></label>
      </div>

      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="min-w-0 md:flex-1">
          <label className="flex cursor-pointer items-start gap-3 md:items-center text-[.9rem] leading-snug text-[#D3DEE5]">
            <input ref={refs.consent} type="checkbox" name="consent" checked={form.consent} onChange={(e) => set("consent", e.target.checked)}
              aria-invalid={!!errors.consent || undefined} aria-describedby={describedBy("consent")}
              className={`size-5 flex-none cursor-pointer rounded accent-[#009DC4] ${errors.consent ? "outline-2 outline-offset-2 outline-[#FF8F9E]" : ""}`} />
            <span>{f.consent}</span>
          </label>
          {errors.consent && <p id={`${id}-consent-err`} className={`${errorText} pl-8`}>{f.errors.consent}</p>}
        </div>
        <button type="submit" disabled={sending}
          className="inline-flex h-[54px] w-full flex-none cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[#009DC4] px-8 font-body text-[1rem] font-bold text-white transition-[background,transform] hover:bg-[#0089AB] active:scale-[.98] disabled:cursor-wait disabled:opacity-75 md:w-auto">
          {sending ? f.sending : f.submit}
          {!sending && <span aria-hidden="true">→</span>}
        </button>
      </div>

      <p role="alert" className="m-0 mt-4 font-body text-[.9rem] font-medium text-[#FF9AA8] empty:hidden">{formError ? f.errors[formError] : ""}</p>
    </form>
  );
}

// ---------- Pieces ----------
// The text with one word picked out (the red "Canadian" in the headline).
function Highlight({ text, word, className }) {
  const i = word ? text.indexOf(word) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<span className={className}>{word}</span>{text.slice(i + word.length)}</>;
}

// What happens to waitlist sign-ups, in a popup so people never leave the form.
// Native <dialog>: Escape closes it and focus stays inside while it's open.
function PrivacyNotice({ n, open, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && d.open) d.close();
    return () => { document.documentElement.style.overflow = ""; };
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="notice-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="m-auto max-h-[min(86dvh,720px)] w-[min(560px,calc(100%-2rem))] overflow-hidden rounded-[22px] border border-white/12 bg-[#0B1A26] p-0 text-[#D3DEE5] shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] backdrop:bg-[#04090E]/75 backdrop:backdrop-blur-sm max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none">
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <h2 id="notice-title" className="m-0 font-body text-[1.15rem] font-bold text-white">{n.title}</h2>
          <button type="button" onClick={onClose} aria-label={n.close}
            className="grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white/[.06] text-white/80 hover:bg-white/[.12] hover:text-white">
            <svg viewBox="0 0 24 24" className="i size-4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 pt-4 pb-6 text-[.93rem] leading-relaxed">
          <p className="m-0 text-[#B5C5D0]">{n.intro}</p>
          {n.sections.map(([h, text]) => (
            <section key={h} className="mt-5">
              <h3 className="m-0 mb-1 font-body text-[.95rem] font-bold text-white">{h}</h3>
              <p className="m-0">{text}</p>
            </section>
          ))}
          <p className="mt-6 mb-0 text-[.82rem] text-[#8FA4B3]">{n.updated}</p>
        </div>
        <div className="border-t border-white/10 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose}
            className="h-11 w-full cursor-pointer rounded-full border-0 bg-[#009DC4] font-body text-[.95rem] font-bold text-white hover:bg-[#0089AB]">
            {n.done}
          </button>
        </div>
      </div>
    </dialog>
  );
}

// A filled maple leaf in a soft blue gradient, for the shapes behind the glass form panel.
function GlassLeaf({ className, from, to }) {
  const id = `leaf${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox={LEAF_VIEWBOX} className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d={LEAF_PATH} />
    </svg>
  );
}

function LangSwitch({ label: groupLabel }) {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={groupLabel} className="inline-flex rounded-full border border-white/15 bg-white/[.05] p-1 backdrop-blur">
      {["en", "fr"].map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}
          aria-label={l === "en" ? "English" : "Français"}
          className={`h-8 min-w-11 cursor-pointer rounded-full border-0 px-3 font-body text-[.78rem] font-bold tracking-[.06em] transition-colors ${lang === l ? "bg-[#009DC4] text-white" : "bg-transparent text-white/70 hover:text-white"}`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// The page is always night-dark, whatever the site theme: match the page behind it
// (overscroll, iOS safe areas) and the browser bar while it's open.
function useNightChrome() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = [document.body.style.backgroundColor, meta?.content];
    document.body.style.backgroundColor = NIGHT;
    if (meta) meta.content = NIGHT;
    return () => {
      document.body.style.backgroundColor = prev[0];
      if (meta) meta.content = prev[1];
    };
  }, []);
}

// stats/waitlist.count (kept by the countWaitlist function), read through the Firestore REST
// API so this page doesn't load the Firebase SDK. Refreshes while the tab is visible.
// null until it loads, or if it can't be read; the page then just hides the counter.
function useWaitlistCount() {
  const [count, setCount] = useState(null);
  const load = useRef(null);
  useEffect(() => {
    let alive = true;
    const url = fetch("/__/firebase/init.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c) => `https://firestore.googleapis.com/v1/projects/${c.projectId}/databases/(default)/documents/stats/waitlist?key=${c.apiKey}`);
    load.current = () => url
      .then((u) => fetch(u, { cache: "no-store" }))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = Number(d?.fields?.count?.integerValue);
        if (alive && Number.isFinite(n)) setCount(n);
      })
      .catch(() => {});
    load.current();
    const t = setInterval(() => { if (document.visibilityState === "visible") load.current(); }, COUNT_REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);
  // After a sign-up the trigger needs a moment to update the count.
  const refresh = () => { setTimeout(() => load.current?.(), 2500); setTimeout(() => load.current?.(), 7000); };
  return [count, refresh];
}
