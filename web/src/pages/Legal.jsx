import { Link } from "react-router";
import { SiteFooter, SiteHeader, usePageTitle } from "../components/SiteLayout";
import { useLang } from "../i18n";

// Body blocks: a string is a paragraph, { h } a heading, an array a paragraph with { link, text } parts.
function Block({ b }) {
  if (typeof b === "string") return <p>{b}</p>;
  if (b.h) return <h2>{b.h}</h2>;
  return <p>{b.map((part, i) => (typeof part === "string" ? part : <Link key={i} to={part.link}>{part.text}</Link>))}</p>;
}

function LegalPage({ doc }) {
  const { s } = useLang();
  usePageTitle(`${doc.title} — ARTICxAI`);
  return (
    <>
      <SiteHeader />
      <main className="pt-8 pb-16">
        <div className="mx-auto w-[min(72ch,100%-2.5rem)] [&_h2]:mt-9 [&_h2]:mb-2 [&_h2]:text-[1.2rem] [&_h2]:font-bold">
          <div className="my-4 rounded-xl border-2 border-red px-[1.1rem] py-[.9rem] text-[.95rem]">
            <strong>{s.legal.draft[0]}</strong> {s.legal.draft[1]}
          </div>
          <h1 className="mt-5 mb-2 text-[clamp(2rem,5vw,2.8rem)] font-extrabold leading-[1.08] tracking-[-.035em]">{doc.title}</h1>
          <p className="m-0 mb-6 text-muted">{s.legal.updated}</p>
          {doc.body.map((b, i) => <Block key={i} b={b} />)}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function Privacy() {
  const { s } = useLang();
  return <LegalPage doc={s.legal.privacy} />;
}

export function Terms() {
  const { s } = useLang();
  return <LegalPage doc={s.legal.terms} />;
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
