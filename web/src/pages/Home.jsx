import { useEffect, useState } from "react";
import { Link } from "react-router";
import { SiteFooter, SiteHeader, usePageTitle } from "../components/SiteLayout";
import { btn, wrap } from "../components/ui";
import { useLang } from "../i18n";
import {
  ArrowUpIcon, CheckIcon, ChipIcon, DatabaseIcon, InfoIcon, Leaf, LockIcon, PenIcon, SidebarIcon, TrashIcon, UserIcon,
} from "../components/Icons";

const navLink = "hidden rounded-lg px-3 py-2 font-head text-[.9rem] font-medium text-muted no-underline hover:text-ink lg:inline";
const eyebrow = "m-0 mb-4 font-head text-[.78rem] font-semibold tracking-[.12em] text-lake-deep uppercase";
const h2 = "m-0 max-w-[22ch] text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.06] tracking-[-.035em]";
const lead = "mt-4 mb-0 max-w-[58ch] text-[1.06rem] leading-[1.7] text-muted";
const section = "border-t border-line py-[clamp(4.5rem,10vw,7.5rem)]";

// Icons for the text in i18n (same order).
const FACT_ICONS = [DatabaseIcon, LockIcon, InfoIcon, TrashIcon];
const RESIDENCY_ICONS = [DatabaseIcon, ChipIcon, UserIcon];
const LANGS = ["CA", "FR"];

// ---------- Page ----------
export default function Home() {
  const { s } = useLang();
  const h = s.home;
  usePageTitle(h.pageTitle);
  return (
    <>
      <SiteHeader>
        <a className={navLink} href="#use-cases">{s.nav.useCases}</a>
        <a className={navLink} href="#models">{s.nav.models}</a>
        <a className={navLink} href="#privacy">{s.nav.privacy}</a>
        <a className={navLink} href="#faq">{s.nav.faq}</a>
        <span className="mx-2 hidden h-5 w-px bg-line lg:block" aria-hidden="true" />
        <Link className={`${btn("quiet", "sm")} max-sm:hidden`} to="/chat#signin">{s.nav.login}</Link>
        <Link className={btn("primary", "sm")} to="/chat">{s.nav.tryMaple}</Link>
      </SiteHeader>

      <main className="-mt-16">
        <Hero h={h} />
        <Facts h={h} />

        <UseCases h={h} />

        <section id="models" className={`${section} bg-surface`}>
          <div className={wrap}>
            <p className={eyebrow}>{h.models.eyebrow}</p>
            <h2 className={h2}>{h.models.title}</h2>
            <p className={lead}>{h.models.lead}</p>
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {h.models.items.map((m) => (
                <article key={m.name} className="flex flex-col rounded-2xl border border-line bg-bg p-8">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="m-0 inline-flex items-center gap-2.5 text-[1.5rem] font-bold tracking-[-.025em]"><Leaf size={20} />{m.name}</h3>
                    <span className="rounded-full border border-line bg-surface px-3 py-1 font-head text-[.75rem] font-semibold text-muted">{m.badge}</span>
                  </div>
                  <p className="mt-4 mb-6 text-[1rem] leading-relaxed text-muted">{m.text}</p>
                  <ul className="m-0 mb-6 list-none space-y-2.5 p-0">
                    {m.points.map((p) => <li key={p} className="flex items-center gap-2.5 text-[.95rem]"><CheckIcon className="i size-4 text-lake-deep" />{p}</li>)}
                  </ul>
                  <div className="mb-8 flex items-center gap-2">
                    <span className="mr-1 font-head text-[.78rem] font-semibold tracking-[.08em] text-muted uppercase">{h.models.languages}</span>
                    {LANGS.map((code) => [code, h.models.langNames[code]]).map(([code, label]) => (
                      <span key={code} title={label} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-0.5 font-mono text-[.78rem] font-semibold text-ink">
                        {code}<span className="sr-only"> ({label})</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-auto mb-0 border-t border-line pt-5 font-head text-[.85rem] font-medium text-muted">{m.who}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className={section}>
          <div className={`${wrap} grid gap-14 lg:grid-cols-[.85fr_1.15fr]`}>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className={eyebrow}>{h.residency.eyebrow}</p>
              <h2 className={h2}>{h.residency.title}</h2>
              <p className={lead}>{h.residency.lead}</p>
              <Link to="/privacy" className="mt-6 inline-flex items-center gap-1.5 font-head text-[.92rem] font-semibold no-underline">{h.residency.link} <span aria-hidden="true">→</span></Link>
            </div>
            <ol className="m-0 list-none space-y-4 p-0">
              {h.residency.items.map(([title, where, text], i) => ({ icon: RESIDENCY_ICONS[i], title, where, text, out: i === 2 })).map(({ icon: Icon, title, where, text, out }) => (
                <li key={title} className="grid grid-cols-[auto_1fr] gap-5 rounded-2xl border border-line bg-surface p-6">
                  <span className={`grid size-11 place-items-center rounded-xl ${out ? "bg-bg-2 text-muted" : "bg-lake-soft text-lake-deep"}`}><Icon /></span>
                  <div>
                    <h3 className="m-0 flex flex-wrap items-center gap-2.5 text-[1.05rem] font-semibold">
                      {title}
                      <span className={`rounded-full px-2.5 py-0.5 font-head text-[.75rem] font-semibold ${out ? "bg-bg-2 text-muted" : "bg-lake-soft text-lake-deep"}`}>{where}</span>
                    </h3>
                    <p className="mt-1.5 mb-0 text-[.95rem] leading-relaxed text-muted">{text}</p>
                  </div>
                </li>
              ))}
              <li className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="m-0 text-[1.05rem] font-semibold">{h.residency.securityTitle}</h3>
                <ul className="mt-4 mb-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                  {h.residency.security.map((x) => (
                    <li key={x} className="flex items-center gap-2.5 text-[.93rem] text-muted"><CheckIcon className="i size-4 text-lake-deep" />{x}</li>
                  ))}
                </ul>
              </li>
            </ol>
          </div>
        </section>

        <section className={`${section} bg-surface`}>
          <div className={wrap}>
            <p className={eyebrow}>{h.principles.eyebrow}</p>
            <h2 className={h2}>{h.principles.title}</h2>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
              {h.principles.items.map(([title, text], i) => ({ n: `0${i + 1}`, title, text })).map((p) => (
                <div key={p.n} className="bg-surface p-8">
                  <span className="font-mono text-[.85rem] text-lake-deep">{p.n}</span>
                  <h3 className="mt-6 mb-2 text-[1.15rem] font-semibold tracking-[-.015em]">{p.title}</h3>
                  <p className="m-0 text-[.95rem] leading-relaxed text-muted">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className={section}>
          <div className={`${wrap} grid gap-12 lg:grid-cols-[.8fr_1.2fr]`}>
            <div>
              <p className={eyebrow}>{h.faq.eyebrow}</p>
              <h2 className={h2}>{h.faq.title}</h2>
              <p className={lead}>{h.faq.lead} <a href="mailto:articxai@gmail.com">{h.faq.contact}</a>.</p>
            </div>
            <div className="faq divide-y divide-line border-y border-line">
              {h.faq.items.map(([q, a]) => (
                <details key={q} className="group">
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

        <section id="about" className="border-t border-line bg-ink py-[clamp(4.5rem,10vw,7rem)] text-surface">
          <div className={`${wrap} grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]`}>
            <div>
              <p className="m-0 mb-4 inline-flex items-center gap-2 font-head text-[.78rem] font-semibold tracking-[.12em] uppercase opacity-70"><Leaf size={13} />{h.about.eyebrow}</p>
              <h2 className="m-0 max-w-[20ch] text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.05] tracking-[-.035em]">{h.about.title}</h2>
              <p className="mt-5 mb-0 max-w-[52ch] text-[1.05rem] leading-[1.7] opacity-75">{h.about.text}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link to="/chat" className={`${btn("ghost", "lg")} border-transparent`}>{h.about.cta1}</Link>
              <Link to="/chat#signup" className={`${btn("quiet", "lg")} text-surface ring-1 ring-surface/25 hover:bg-surface/10`}>{h.about.cta2}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Hero({ h }) {
  return (
    <section className="relative overflow-hidden pt-[calc(4rem+clamp(3.5rem,9vw,6.5rem))]">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className={`${wrap} relative text-center`}>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1.5 pr-4 pl-3 font-head text-[.82rem] font-medium text-muted backdrop-blur">
          <Leaf size={13} /><span className="whitespace-nowrap">{h.badge[0]}</span>
          <span className="hidden text-line sm:inline">|</span><span className="hidden whitespace-nowrap sm:inline">{h.badge[1]}</span>
        </span>
        <h1 className="mx-auto mt-7 mb-6 max-w-[16ch] text-[clamp(2.75rem,7vw,5.25rem)] font-bold leading-[.98] tracking-[-.05em]">
          {h.title}
        </h1>
        <p className="mx-auto mb-10 max-w-[56ch] text-[clamp(1.05rem,1.7vw,1.22rem)] leading-[1.65] text-muted">
          {h.lead}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link className={btn("primary", "lg")} to="/chat">{h.ctaPrimary}</Link>
          <a className={btn("ghost", "lg")} href="#privacy">{h.ctaSecondary}</a>
        </div>
        <p className="mt-5 text-[.85rem] text-muted">{h.fine}</p>
        <Preview p={h.preview} />
      </div>
    </section>
  );
}

function Facts({ h }) {
  return (
    <section aria-label={h.factsLabel} className="border-t border-line bg-surface">
      <div className={`${wrap} grid divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4`}>
        {h.facts.map(([title, text], i) => ({ icon: FACT_ICONS[i], title, text })).map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 border-b border-line py-8 sm:px-6 sm:first:pl-0 lg:border-b-0">
            <Icon className="i mt-0.5 text-lake-deep" />
            <div>
              <h3 className="m-0 font-head text-[.95rem] font-semibold">{title}</h3>
              <p className="mt-1 mb-0 text-[.88rem] leading-relaxed text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Preview({ p }) {
  return (
    <div aria-label={p.label} className="relative mx-auto mt-[clamp(3.5rem,8vw,5rem)] w-[min(1040px,100%)] overflow-hidden rounded-t-[20px] border border-b-0 border-line bg-surface text-left shadow-[0_30px_80px_-30px_rgba(16,32,41,.35)]">
      <div aria-hidden="true" className="flex items-center gap-2 border-b border-line px-4 py-3">
        {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-line" />)}
        <span className="mx-auto flex w-[min(340px,60%)] items-center justify-center gap-1.5 rounded-lg bg-bg px-3 py-1 font-head text-[.78rem] text-muted"><LockIcon className="i size-3" />articxai.com/chat</span>
        <span className="w-[42px]" />
      </div>
      <div className="grid lg:min-h-[400px] lg:grid-cols-[60px_1fr]">
        <div aria-hidden="true" className="hidden flex-col items-center gap-4 border-r border-line py-4 text-muted lg:flex">
          <SidebarIcon /><PenIcon />
        </div>
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-[clamp(1rem,4vw,3rem)] pt-8 pb-5">
          <div className="max-w-[80%] self-end rounded-[18px_18px_6px_18px] bg-lake-soft px-4 py-3 text-[.95rem] text-ink">
            {p.user}
          </div>
          <div className="grid grid-cols-[30px_1fr] gap-3 text-[.95rem]">
            <img src="/favicon.svg" alt="" className="size-[30px] rounded-lg" />
            <div className="leading-relaxed [&_p]:m-0 [&_p]:mb-3">
              <p>{p.intro}</p>
              <p className="border-l-[3px] border-lake py-1 pl-4 text-muted">{p.letter}</p>
              <p>{p.after}</p>
            </div>
          </div>
          <div aria-hidden="true" className="mt-auto rounded-[18px] border border-line p-3 pl-4 text-[.92rem] text-muted">
            <span>{p.placeholder}</span>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-head text-[.75rem] font-semibold text-ink"><Leaf size={12} />Maple 0.5</span>
              <span className="grid size-[34px] place-items-center rounded-[10px] bg-lake text-lake-ink"><ArrowUpIcon /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Use cases ----------
// Without enough data (or offline), show a seasonal default: tax questions lead from January to April.
const SHOWN = 6;
function defaultOrder(month = new Date().getMonth()) {
  return month <= 3
    ? ["taxes", "money", "housing", "work", "newcomers", "health"]
    : ["money", "housing", "work", "newcomers", "health", "travel"];
}

// Topics ranked by this week's anonymous counts (functions/topics.js), or [] when there's too little data.
function useRankedTopics() {
  const [ranked, setRanked] = useState([]);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/topics", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.live && Array.isArray(d.ranked)) setRanked(d.ranked); })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  return ranked;
}

function UseCases({ h }) {
  const u = h.useCases;
  const ranked = useRankedTopics().filter((id) => u.items[id]);
  const live = ranked.length > 0;
  const ids = [...new Set([...ranked, ...defaultOrder(), ...Object.keys(u.items)])].slice(0, SHOWN);
  return (
    <section id="use-cases" className={section}>
      <div className={wrap}>
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <p className={eyebrow}>{u.eyebrow}</p>
            <h2 className={h2}>{u.title}</h2>
          </div>
          <p className={`${lead} lg:justify-self-end`}>{live ? u.liveLead : u.lead}</p>
        </div>
        <ul className="mt-14 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {ids.map((id) => {
            const [tag, prompt, text] = u.items[id];
            const popular = live && ranked.indexOf(id) > -1 && ranked.indexOf(id) < 3;
            return (
              <li key={id}>
                <Link to="/chat" className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 text-ink no-underline transition-[border-color,box-shadow] hover:border-lake/50 hover:shadow-card">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-head text-[.75rem] font-semibold tracking-[.1em] text-muted uppercase">{tag}</span>
                    {popular && <span className="rounded-full bg-lake/10 px-[.6rem] py-[.15rem] font-head text-[.72rem] font-semibold text-lake-deep">{u.popular}</span>}
                  </span>
                  <span className="mt-4 mb-5 font-head text-[1.05rem] leading-snug font-semibold tracking-[-.01em]">“{prompt}”</span>
                  <span className="mt-auto text-[.92rem] leading-relaxed text-muted">{text}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-head text-[.85rem] font-semibold text-lake-deep">
                    {u.ask} <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {live && <p className="mt-6 mb-0 flex items-center gap-2 text-[.85rem] text-muted"><LockIcon className="i size-4 flex-none" />{u.note}</p>}
      </div>
    </section>
  );
}
