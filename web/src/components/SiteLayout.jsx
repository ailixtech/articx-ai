import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Brand, btn, wrap } from "./ui";
import { Leaf } from "./Icons";
import { LangToggle, useLang } from "../i18n";

export function SiteHeader({ children }) {
  const { s } = useLang();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`sticky top-0 z-10 border-b pt-[env(safe-area-inset-top)] backdrop-blur-md backdrop-saturate-150 transition-colors ${scrolled ? "border-line bg-bg/85" : "border-transparent bg-transparent"}`}>
      <div className={`${wrap} flex h-16 items-center justify-between gap-4`}>
        <Brand />
        <nav className="flex items-center gap-1" aria-label={s.nav.main}>
          {children ?? <Link className={btn("primary", "sm")} to="/chat">{s.nav.tryMaple}</Link>}
          <LangToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { s } = useLang();
  const a = "text-muted no-underline hover:text-ink";
  return (
    <footer className="border-t border-line bg-surface pt-14 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-[.9rem]">
      <div className={`${wrap} grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]`}>
        <div>
          <Brand />
          <p className="mt-3 mb-0 max-w-[32ch] text-muted">{s.footer.tagline}</p>
        </div>
        {s.footer.columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="m-0 mb-3 font-head text-[.78rem] font-semibold tracking-[.08em] text-ink uppercase">{c.title}</h2>
            <ul className="m-0 list-none space-y-2 p-0">
              {c.links.map(([label, to]) => (
                <li key={label}>{to.startsWith("mailto:") || to.includes("#") ? <a className={a} href={to}>{label}</a> : <Link className={a} to={to}>{label}</Link>}</li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className={`${wrap} mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[.82rem] text-muted`}>
        <span>{s.footer.rights(new Date().getFullYear())}</span>
        <span className="inline-flex items-center gap-2"><Leaf size={13} />{s.footer.built}</span>
      </div>
    </footer>
  );
}

export function usePageTitle(title) {
  useEffect(() => { document.title = title; }, [title]);
}
