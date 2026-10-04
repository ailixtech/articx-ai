import { useId, useRef, useState } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader, usePageTitle } from "../components/SiteLayout";
import { btn, wrap } from "../components/ui";
import { useLang } from "../i18n";
import { ChatIcon, CheckIcon, CopyIcon, Leaf, LockIcon, MailIcon, SparkIcon } from "../components/Icons";

const eyebrow = "m-0 mb-4 font-head text-[.78rem] font-semibold tracking-[.12em] text-lake uppercase";
const h2 = "m-0 max-w-[22ch] text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.06] tracking-[-.035em]";
const section = "border-t border-line py-[clamp(4.5rem,10vw,7.5rem)]";
const label = "mb-1.5 block font-head text-[.85rem] font-semibold";
const field = "h-12 w-full rounded-xl border border-line bg-bg px-4 font-body text-[1rem] text-ink transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-muted focus:border-lake focus:ring-4 focus:ring-lake/15 focus-visible:outline-none";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same order as the province list in functions/waitlist.js.
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT", "outside"];
const PERK_ICONS = [SparkIcon, ChatIcon, MailIcon];

// ---------- Page ----------
export default function Waitlist() {
  const { s } = useLang();
  const w = s.waitlist;
  usePageTitle(w.pageTitle);
  const emailRef = useRef(null);
  const toForm = () => {
    document.getElementById("join")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    emailRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <SiteHeader />
      <main className="-mt-16">
        <section className="relative overflow-hidden pt-[calc(4rem+clamp(3rem,8vw,5.5rem))] pb-[clamp(4rem,9vw,6.5rem)]">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div aria-hidden="true" className="pointer-events-none absolute top-24 -right-40 size-[560px] rounded-full bg-lake/15 blur-[120px]" />
          <div className={`${wrap} relative grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16`}>
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1.5 pr-4 pl-3 font-head text-[.82rem] font-medium text-muted backdrop-blur">
                <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-lake/60 motion-reduce:hidden" /><span className="relative size-2 rounded-full bg-lake" /></span>
                {w.badge}
              </span>
              <h1 className="mt-7 mb-6 max-w-[15ch] text-[clamp(2.6rem,6vw,4.5rem)] font-bold leading-[1] tracking-[-.045em]">{w.title}</h1>
              <p className="m-0 max-w-[52ch] text-[clamp(1.05rem,1.6vw,1.18rem)] leading-[1.7] text-muted">{w.lead}</p>
              <ul className="mt-8 mb-0 list-none space-y-3 p-0">
                {w.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-[.98rem]">
                    <span className="grid size-6 flex-none place-items-center rounded-full bg-lake-soft text-lake"><CheckIcon className="i size-3.5" /></span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div id="join" className="animate-rise scroll-mt-24 [animation-delay:.2s]">
              <JoinCard w={w} provinces={w.provinces} emailRef={emailRef} />
            </div>
          </div>
        </section>

        <section className={`${section} bg-surface`}>
          <div className={wrap}>
            <p className={eyebrow}>{w.perks.eyebrow}</p>
            <h2 className={h2}>{w.perks.title}</h2>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {w.perks.items.map(([title, text], i) => ({ Icon: PERK_ICONS[i], title, text })).map(({ Icon, title, text }) => (
                <article key={title} className="rounded-2xl border border-line bg-bg p-7">
                  <span className="grid size-11 place-items-center rounded-xl bg-lake-soft text-lake"><Icon /></span>
                  <h3 className="mt-6 mb-2 text-[1.15rem] font-semibold tracking-[-.015em]">{title}</h3>
                  <p className="m-0 text-[.95rem] leading-relaxed text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={section}>
          <div className={wrap}>
            <p className={eyebrow}>{w.steps.eyebrow}</p>
            <h2 className={h2}>{w.steps.title}</h2>
            <ol className="relative mt-14 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8">
              <span aria-hidden="true" className="absolute top-5 right-[16%] left-[16%] hidden h-px bg-line md:block" />
              {w.steps.items.map(([title, text], i) => (
                <li key={title} className="relative md:text-center">
                  <span className="relative grid size-10 place-items-center rounded-full border border-line bg-surface font-mono text-[.9rem] font-semibold text-lake md:mx-auto">{i + 1}</span>
                  <h3 className="mt-5 mb-2 text-[1.1rem] font-semibold">{title}</h3>
                  <p className="m-0 text-[.95rem] leading-relaxed text-muted md:mx-auto md:max-w-[30ch]">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${section} bg-surface`}>
          <div className={`${wrap} grid gap-12 lg:grid-cols-[.8fr_1.2fr]`}>
            <div>
              <p className={eyebrow}>{w.faq.eyebrow}</p>
              <h2 className={h2}>{w.faq.title}</h2>
            </div>
            <div className="faq divide-y divide-line border-y border-line">
              {w.faq.items.map(([q, a]) => (
                <details key={q}>
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 font-head text-[1.02rem] font-semibold">
                    {q}
                    <span className="plus grid size-7 flex-none place-items-center rounded-full border border-line text-muted" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-0 mb-5 max-w-[62ch] pr-10 text-[.97rem] leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-ink py-[clamp(4rem,9vw,6rem)] text-surface">
          <div className={`${wrap} flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center`}>
            <div>
              <p className="m-0 mb-4 inline-flex items-center gap-2 font-head text-[.78rem] font-semibold tracking-[.12em] uppercase opacity-70"><Leaf size={13} />{w.badge}</p>
              <h2 className="m-0 max-w-[22ch] text-[clamp(1.9rem,4vw,2.9rem)] font-bold leading-[1.06] tracking-[-.035em]">{w.title}</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={toForm} className={`${btn("ghost", "lg")} border-transparent`}>{w.form.submit}</button>
              <Link to="/chat" className={`${btn("quiet", "lg")} text-surface ring-1 ring-surface/25 hover:bg-surface/10`}>{w.done.tryNow}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// ---------- Form ----------
function JoinCard({ w, provinces, emailRef }) {
  const { lang } = useLang();
  const f = w.form;
  const id = useId();
  const [form, setForm] = useState({ email: "", firstName: "", province: "", interests: [], consent: false, website: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [error, setError] = useState(null); // key of f.errors
  const set = (k, v) => { setForm((x) => ({ ...x, [k]: v })); setError(null); };
  const toggle = (i) => set("interests", form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);

  async function submit(e) {
    e.preventDefault();
    const email = form.email.trim();
    if (!EMAIL_RE.test(email)) { setError("email"); emailRef.current?.focus(); return; }
    if (!form.consent) { setError("consent"); return; }
    setStatus("sending");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email, lang }),
      });
      if (r.ok) { setStatus("done"); return; }
      const d = await r.json().catch(() => ({}));
      setError(f.errors[d.error] ? d.error : "server");
    } catch {
      setError("network");
    }
    setStatus("idle");
  }

  const card = "rounded-[22px] border border-line bg-surface p-[clamp(1.5rem,4vw,2.25rem)] shadow-[0_30px_80px_-30px_rgba(16,32,41,.35)]";

  if (status === "done") {
    return (
      <div className={card} role="status">
        <span className="grid size-14 place-items-center rounded-2xl bg-lake-soft text-lake"><CheckIcon className="i size-7" /></span>
        <h2 className="mt-6 mb-2 text-[1.75rem] font-bold tracking-[-.03em]">{w.done.title}</h2>
        <p className="m-0 text-[1rem] leading-relaxed text-muted">{w.done.text(form.email.trim())}</p>
        <div className="mt-7 border-t border-line pt-6">
          <p className="m-0 mb-3 text-[.92rem] text-muted">{w.done.share}</p>
          <CopyLink w={w} />
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link to="/chat" className={btn("primary", "md")}>{w.done.tryNow}</Link>
          <button type="button" className={btn("quiet", "md")} onClick={() => { setForm((x) => ({ ...x, email: "", consent: false })); setStatus("idle"); }}>
            {w.done.again}
          </button>
        </div>
      </div>
    );
  }

  const sending = status === "sending";
  return (
    <form className={card} onSubmit={submit} noValidate aria-describedby={error ? `${id}-err` : undefined}>
      <h2 className="m-0 text-[1.5rem] font-bold tracking-[-.025em]">{f.title}</h2>
      <p className="mt-1 mb-6 text-[.95rem] text-muted">{f.subtitle}</p>

      <div className="space-y-4">
        <div>
          <label htmlFor={`${id}-email`} className={label}>{f.email}</label>
          <input ref={emailRef} id={`${id}-email`} type="email" inputMode="email" autoComplete="email" required
            placeholder={f.emailPlaceholder} value={form.email} onChange={(e) => set("email", e.target.value)}
            aria-invalid={error === "email" || undefined} className={`${field} ${error === "email" ? "border-red" : ""}`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-name`} className={label}>{f.firstName} <span className="font-normal text-muted">({f.optional})</span></label>
            <input id={`${id}-name`} autoComplete="given-name" maxLength={60} value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor={`${id}-prov`} className={label}>{f.province} <span className="font-normal text-muted">({f.optional})</span></label>
            <div className="relative">
              <select id={`${id}-prov`} value={form.province} onChange={(e) => set("province", e.target.value)}
                className={`${field} cursor-pointer appearance-none pr-10 ${form.province ? "" : "text-muted"}`}>
                <option value="">{f.provincePlaceholder}</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{provinces[p]}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="i pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className={label}>{f.interestsLabel} <span className="font-normal text-muted">({f.optional})</span></legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(f.interests).map(([key, text]) => {
              const on = form.interests.includes(key);
              return (
                <label key={key} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 font-head text-[.85rem] font-medium transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${on ? "border-lake bg-lake-soft text-lake" : "border-line text-ink hover:border-muted"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(key)} />
                  {on && <CheckIcon className="i size-3.5" />}
                  {text}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Honeypot for bots: hidden from people and screen readers. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} /></label>
        </div>

        <label className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 text-[.88rem] leading-snug transition-colors ${error === "consent" ? "border-red" : "border-line hover:border-muted"}`}>
          <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={error === "consent" || undefined} className="mt-0.5 size-[18px] flex-none cursor-pointer accent-[var(--lake)]" />
          <span>{f.consent}</span>
        </label>
      </div>

      <p id={`${id}-err`} role="alert" className="m-0 mt-4 text-[.9rem] font-medium text-red empty:hidden">{error ? f.errors[error] : ""}</p>

      <button type="submit" disabled={sending} className={`${btn("primary", "lg")} mt-5 w-full disabled:cursor-wait disabled:opacity-70`}>
        {sending ? f.sending : f.submit}
        {!sending && <span aria-hidden="true">→</span>}
      </button>
      <p className="mt-4 mb-0 flex items-start gap-2 text-[.82rem] leading-relaxed text-muted">
        <LockIcon className="i mt-0.5 size-3.5" />
        <span>{f.privacy[0]}<Link to="/privacy">{f.privacy[1]}</Link>{f.privacy[2]}</span>
      </p>
    </form>
  );
}

function CopyLink({ w }) {
  const url = `${location.origin}/waitlist`;
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }, () => {});
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-bg p-1.5 pl-4">
      <span className="min-w-0 flex-1 truncate font-mono text-[.85rem] text-muted">{url.replace(/^https?:\/\//, "")}</span>
      <button type="button" onClick={copy} className={btn("ghost", "sm")} aria-live="polite">
        {copied ? <CheckIcon className="i size-4 text-lake" /> : <CopyIcon className="i size-4" />}
        {copied ? w.done.copied : w.done.copy}
      </button>
    </div>
  );
}
