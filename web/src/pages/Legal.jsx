import { Link } from "react-router";
import { SiteFooter, SiteHeader, usePageTitle } from "../components/SiteLayout";
import { useLang } from "../i18n";
import legalEn from "../i18n/legal.en";
import legalFr from "../i18n/legal.fr";

const LEGAL = { en: legalEn, fr: legalFr };

// Body blocks: a string is a paragraph, { h } a heading, { list } a bullet list, an array a paragraph with { link, text } parts.
function Block({ b }) {
  if (typeof b === "string") return <p>{b}</p>;
  if (b.h) return <h2>{b.h}</h2>;
  if (b.list) return <ul className="list-disc pl-6 my-3 [&_li]:my-1">{b.list.map((item, i) => <li key={i}>{item}</li>)}</ul>;
  return <p>{b.map((part, i) => (typeof part === "string" ? part : <Link key={i} to={part.link}>{part.text}</Link>))}</p>;
}

function LegalPage({ doc }) {
  const { lang } = useLang();
  usePageTitle(`${doc.title} — ArticxAI`);
  return (
    <>
      <SiteHeader />
      <main className="pt-8 pb-16">
        <div className="mx-auto w-[min(72ch,100%-2.5rem)] [&_h2]:mt-9 [&_h2]:mb-2 [&_h2]:text-[1.2rem] [&_h2]:font-bold">
          <h1 className="mt-5 mb-2 text-[clamp(2rem,5vw,2.8rem)] font-extrabold leading-[1.08] tracking-[-.035em]">{doc.title}</h1>
          <p className="m-0 mb-6 text-muted">{(LEGAL[lang] || legalEn).updated}</p>
          {doc.body.map((b, i) => <Block key={i} b={b} />)}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function Privacy() {
  const { lang } = useLang();
  return <LegalPage doc={(LEGAL[lang] || legalEn).privacy} />;
}

export function Terms() {
  const { lang } = useLang();
  return <LegalPage doc={(LEGAL[lang] || legalEn).terms} />;
}

export function NotFound() {
  const { s } = useLang();
  const t = s.legal.notFound;
  usePageTitle(t.pageTitle);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-24 text-center">
        <h1 className="mb-3 text-[clamp(2rem,5vw,2.8rem)] font-extrabold tracking-[-.035em]">{t.title}</h1>
        <p className="mb-8 text-muted">{t.text}</p>
        <Link to="/">{t.home}</Link>
      </main>
      <SiteFooter />
    </>
  );
}
