// Settings > Billing sub-pages: payment methods (saved by Stripe), adding one, and invoices.
// Card details go straight from Stripe's own fields to Stripe; our functions (functions/billing.js)
// only ever see Stripe ids. Stripe.js is loaded on demand, the first time "Add" is opened.
import { useCallback, useEffect, useRef, useState } from "react";
import { CardIcon, CheckIcon, LockIcon } from "../components/Icons";
import { btn } from "../components/ui";
import { call } from "./account";

const Chevron = ({ dir = "right", className = "" }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`i size-[18px] ${className}`}>
    <path d={dir === "right" ? "m9 6 6 6-6 6" : "m15 6-6 6 6 6"} />
  </svg>
);
const spinner = <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
const heading = "m-0 font-head text-[1.05rem] font-bold";

// Loads the billing summary once; pages call reload() after a change.
export function useBilling(fb) {
  const [state, setState] = useState({ status: "loading" });
  const reload = useCallback(() => {
    setState((x) => ({ ...x, status: x.data ? "refreshing" : "loading" }));
    return call(fb, "billingSummary", {})
      .then((data) => setState({ status: "ready", data }))
      .catch((e) => { console.error("Billing summary failed:", e); setState({ status: "error" }); });
  }, [fb]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

const brandName = (b, m) => b.brands[m.brand] || (m.brand ? m.brand.charAt(0).toUpperCase() + m.brand.slice(1) : "");
export const methodLabel = (b, m) => (m.last4 ? b.cardLabel(brandName(b, m), m.last4) : brandName(b, m));

// A row on the main Billing page that opens a sub-page.
export function NavRow({ label, hint, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 border-b border-line bg-transparent py-[.9rem] text-left last:border-b-0 hover:bg-bg-2/60">
      <span className="min-w-0">
        <span className="block font-head text-[.92rem] font-semibold text-ink">{label}</span>
        {hint && <span className="block text-[.82rem] text-muted">{hint}</span>}
      </span>
      <Chevron className="flex-none text-muted" />
    </button>
  );
}

function SubPage({ b, title, lead, onBack, children }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <>
      <button ref={ref} type="button" onClick={onBack}
        className="-ml-2 mb-3 inline-flex cursor-pointer items-center gap-1 rounded-[8px] border-0 bg-transparent px-2 py-1 font-head text-[.86rem] font-medium text-muted hover:bg-bg-2 hover:text-ink">
        <Chevron dir="left" className="size-4" />{b.back}
      </button>
      <h3 className={heading}>{title}</h3>
      {lead && <p className="m-0 mt-1 mb-4 text-[.86rem] text-muted">{lead}</p>}
      {children}
    </>
  );
}

function Status({ b, billing }) {
  if (billing.status === "loading") return <p role="status" className="flex items-center gap-2 text-[.88rem] text-muted">{spinner}{b.loading}</p>;
  if (billing.status === "error") {
    return (
      <div className="rounded-xl border border-line bg-bg-2 p-4 text-[.88rem]">
        <p className="m-0 mb-3">{b.failed}</p>
        <button type="button" className={btn("ghost", "sm")} onClick={billing.reload}>{b.retry}</button>
      </div>
    );
  }
  if (!billing.data?.ready) return <p className="rounded-xl border border-line bg-bg-2 p-4 text-[.88rem]">{b.notReady}</p>;
  return null;
}

export function MethodsPage({ b, fb, billing, onBack, onAdd }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const methods = billing.data?.methods || [];
  const act = async (name, m) => {
    if (name === "billingRemoveMethod" && !confirm(b.removeConfirm(methodLabel(b, m)))) return;
    setBusy(m.id); setError(null);
    try { await call(fb, name, { paymentMethodId: m.id }); await billing.reload(); }
    catch (e) { console.error(e); setError(b.actionFailed); }
    finally { setBusy(null); }
  };
  return (
    <SubPage b={b} title={b.methodsTitle} lead={b.methodsLead} onBack={onBack}>
      <Status b={b} billing={billing} />
      {billing.data?.ready && (
        <>
          <ul className="m-0 grid list-none gap-2 p-0">
            {methods.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
                <span className="grid h-8 w-11 flex-none place-items-center rounded-[6px] border border-line bg-bg-2"><CardIcon className="i size-[18px] text-muted" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-head text-[.92rem] font-semibold">
                    {methodLabel(b, m)}
                    {m.isDefault && <span className="rounded-full bg-lake-soft px-2 py-px text-[.7rem] font-semibold text-lake-deep">{b.isDefault}</span>}
                  </span>
                  {m.expMonth && <span className="block text-[.8rem] text-muted">{b.expires(m.expMonth, m.expYear)}</span>}
                </span>
                <span className="flex gap-1">
                  {busy === m.id ? spinner : <>
                    {!m.isDefault && <button type="button" className={btn("quiet", "sm")} disabled={!!busy} onClick={() => act("billingSetDefault", m)}>{b.makeDefault}</button>}
                    <button type="button" className={`${btn("quiet", "sm")} text-red!`} disabled={!!busy} onClick={() => act("billingRemoveMethod", m)}>{b.remove}</button>
                  </>}
                </span>
              </li>
            ))}
          </ul>
          {!methods.length && <p className="m-0 rounded-xl border border-dashed border-line px-4 py-5 text-center text-[.88rem] text-muted">{b.noMethods}</p>}
          {error && <p role="alert" className="m-0 mt-2 text-[.85rem] text-red">{error}</p>}
          <button type="button" className={`${btn("primary", "sm")} mt-4`} onClick={onAdd}>{b.add}</button>
        </>
      )}
    </SubPage>
  );
}

const isDark = () => {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function AddMethodPage({ b, fb, lang, billing, onBack, onSaved }) {
  const mountRef = useRef(null);
  const stripeRef = useRef(null);
  const first = !(billing.data?.methods || []).length;
  const [phase, setPhase] = useState("loading"); // loading | ready | saving | failed
  const [error, setError] = useState(null);
  const [makeDefault, setMakeDefault] = useState(true);

  useEffect(() => {
    let live = true, element = null;
    (async () => {
      try {
        const { clientSecret, publishableKey } = await call(fb, "billingSetupIntent", {});
        const { loadStripe } = await import("@stripe/stripe-js/pure");
        const stripe = await loadStripe(publishableKey);
        if (!live || !stripe) return;
        const css = getComputedStyle(document.documentElement);
        const v = (n) => css.getPropertyValue(n).trim();
        const elements = stripe.elements({
          clientSecret,
          locale: lang === "fr" ? "fr-CA" : "en-CA",
          appearance: {
            theme: isDark() ? "night" : "stripe",
            variables: {
              colorPrimary: v("--lake"), colorBackground: v("--surface"), colorText: v("--ink"),
              colorTextSecondary: v("--muted"), colorDanger: v("--red"), borderRadius: "10px",
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            },
          },
        });
        element = elements.create("payment", { layout: "tabs" });
        element.on("ready", () => { if (live) setPhase("ready"); });
        element.mount(mountRef.current);
        stripeRef.current = { stripe, elements };
      } catch (e) {
        console.error("Payment form failed:", e);
        if (live) { setPhase("failed"); setError(e?.details?.reason === "payments_not_ready" ? b.notReady : b.failed); }
      }
    })();
    return () => { live = false; element?.destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const s = stripeRef.current;
    if (!s || phase !== "ready") return;
    setPhase("saving"); setError(null);
    try {
      const { error: err, setupIntent } = await s.stripe.confirmSetup({ elements: s.elements, redirect: "if_required" });
      if (err) { setError(err.message || b.actionFailed); setPhase("ready"); return; }
      const pm = setupIntent?.payment_method;
      const id = typeof pm === "string" ? pm : pm?.id;
      if (id && (first || makeDefault)) await call(fb, "billingSetDefault", { paymentMethodId: id });
      onSaved();
    } catch (ex) {
      console.error(ex);
      setError(b.actionFailed);
      setPhase("ready");
    }
  };

  return (
    <SubPage b={b} title={b.addTitle} lead={b.addLead} onBack={onBack}>
      <form onSubmit={save}>
        {phase === "loading" && <p role="status" className="flex items-center gap-2 text-[.88rem] text-muted">{spinner}{b.loading}</p>}
        <div ref={mountRef} className={phase === "loading" || phase === "failed" ? "h-0 overflow-hidden" : "min-h-[200px]"} />
        {!first && phase !== "failed" && phase !== "loading" && (
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[.88rem]">
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="size-4 accent-[var(--lake)]" />
            {b.addDefault}
          </label>
        )}
        {error && <p role="alert" className="m-0 mt-3 text-[.86rem] text-red">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {phase !== "failed" && (
            <button type="submit" className={btn("primary", "sm")} disabled={phase !== "ready"}>
              {phase === "saving" ? <>{spinner}{b.saving}</> : b.save}
            </button>
          )}
          <button type="button" className={btn("ghost", "sm")} onClick={onBack}>{b.cancel}</button>
          <span className="ml-auto inline-flex items-center gap-1 text-[.78rem] text-muted"><LockIcon className="i size-[14px]" />{b.secure}</span>
        </div>
      </form>
    </SubPage>
  );
}

export function InvoicesPage({ b, lang, billing, onBack }) {
  const invoices = billing.data?.invoices || [];
  const money = (inv) => new Intl.NumberFormat(`${lang}-CA`, { style: "currency", currency: inv.currency.toUpperCase() }).format(inv.total / 100);
  const date = (ms) => new Date(ms).toLocaleDateString(`${lang}-CA`, { year: "numeric", month: "short", day: "numeric" });
  const tone = { paid: "bg-lake-soft text-lake-deep", open: "bg-[#d4a017]/15 text-[#a77d0b]", void: "bg-bg-2 text-muted", uncollectible: "bg-red/10 text-red" };
  const link = "font-head text-[.84rem] font-semibold text-ink underline decoration-line underline-offset-2 hover:decoration-ink";
  return (
    <SubPage b={b} title={b.invoicesTitle} lead={b.invoicesLead} onBack={onBack}>
      <Status b={b} billing={billing} />
      {billing.data?.ready && (invoices.length ? (
        <ul className="m-0 list-none divide-y divide-line rounded-xl border border-line p-0">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[.9rem] font-semibold">{date(inv.created)}</span>
                <span className="block truncate text-[.8rem] text-muted">{[inv.number, inv.description].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="font-head text-[.92rem] font-semibold tabular-nums">{money(inv)}</span>
              <span className={`rounded-full px-2 py-px font-head text-[.72rem] font-semibold ${tone[inv.status] || tone.void}`}>
                {inv.status === "paid" && <CheckIcon className="i -mt-px mr-1 inline size-3" />}{b.status[inv.status] || inv.status}
              </span>
              <span className="flex gap-3">
                {inv.url && <a className={link} href={inv.url} target="_blank" rel="noopener noreferrer">{b.view}</a>}
                {inv.pdf && <a className={link} href={inv.pdf} target="_blank" rel="noopener noreferrer">{b.pdf}</a>}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="m-0 rounded-xl border border-dashed border-line px-4 py-5 text-center text-[.88rem] text-muted">{b.noInvoices}</p>)}
    </SubPage>
  );
}
