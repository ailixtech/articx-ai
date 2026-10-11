import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { CONFIG, IS_LOCAL } from "../config";
import { CardIcon, CheckIcon, CloseIcon, GaugeIcon, GearIcon, ShieldIcon, UserIcon } from "../components/Icons";
import Avatar, { resizeImage } from "../components/Avatar";
import ThemeSwitch from "../components/ThemeSwitch";
import { btn, iconBtn } from "../components/ui";
import { useLang } from "../i18n";

const LANGS = [["en", "English"], ["fr", "Français"]];
const SECTIONS = [["general", GearIcon], ["account", UserIcon], ["privacy", ShieldIcon], ["usage", GaugeIcon], ["billing", CardIcon]];

function Row({ label, hint, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-[.9rem] last:border-b-0">
      <div className="min-w-0">
        <div className="font-head text-[.92rem] font-semibold">{label}</div>
        {hint && <div className="text-[.82rem] text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

const seg = (on) => `cursor-pointer rounded-full border-0 px-3 h-[30px] font-head text-[.82rem] font-medium ${on ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "bg-transparent text-muted hover:text-ink"}`;
const heading = "m-0 mb-1 font-head text-[1.05rem] font-bold";

// When each limit resets: the chat function counts in UTC (next midnight, next Monday, the 1st).
function nextReset(period, now = new Date()) {
  const [y, m, d] = [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
  if (period === "day") return new Date(Date.UTC(y, m, d + 1));
  if (period === "week") return new Date(Date.UTC(y, m, d + 7 - ((now.getUTCDay() + 6) % 7)));
  return new Date(Date.UTC(y, m + 1, 1));
}
function resetLabel(period, lang) {
  const when = nextReset(period);
  const opts = period === "day" ? { hour: "numeric", minute: "2-digit" }
    : period === "week" ? { weekday: "long", hour: "numeric", minute: "2-digit" }
    : { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" };
  return when.toLocaleString(`${lang}-CA`, opts);
}
const percent = (u) => (u.limit > 0 ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0);
const money = (n, lang) => n.toLocaleString(`${lang}-CA`, { style: "currency", currency: "CAD" });

function General({ t, themePref, onTheme, model, onModel, backend, onBackend, s }) {
  const { lang, setLang } = useLang();
  return (
    <>
      <h3 className={heading}>{t.sections.general}</h3>
      <Row label={t.theme}>
        <ThemeSwitch pref={themePref} onChange={onTheme} labelled />
      </Row>
      <Row label={t.language}>
        <div role="radiogroup" aria-label={t.language} className="inline-flex gap-[2px] rounded-full border border-line bg-bg-2 p-[3px]">
          {LANGS.map(([id, name]) => (
            <button key={id} type="button" role="radio" aria-checked={lang === id} lang={id} className={seg(lang === id)} onClick={() => setLang(id)}>{name}</button>
          ))}
        </div>
      </Row>
      <Row label={t.model} hint={t.modelHint}>
        <div role="radiogroup" aria-label={t.model} className="inline-flex gap-[2px] rounded-full border border-line bg-bg-2 p-[3px]">
          {CONFIG.models.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={model === m.id} className={seg(model === m.id)} onClick={() => onModel(m.id)}>{m.name}</button>
          ))}
        </div>
      </Row>
      {IS_LOCAL && (
        <Row label={s.chat.menu.modelServer} hint="Development only">
          <select value={backend} onChange={(e) => onBackend(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1 text-[.85rem] text-ink">
            {Object.entries(CONFIG.local).map(([k, b]) => <option key={k} value={k}>{b.label}</option>)}
            <option value="cloud">Cloud</option>
          </select>
        </Row>
      )}
    </>
  );
}

// Upload or remove the profile picture (users/{uid}/meta/avatar). The page's live listener shows the change.
function PhotoRow({ t, fb, user, photo }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const avatarDoc = () => doc(fb.db, "users", user.uid, "meta", "avatar");
  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const data = await resizeImage(file).catch(() => { throw new Error("not_image"); });
      await setDoc(avatarDoc(), { photo: data, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Photo upload failed:", e);
      setError(e.message === "not_image" ? t.photoInvalid : t.photoFailed);
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const remove = async () => {
    setBusy(true); setError(null);
    try { await deleteDoc(avatarDoc()); } catch (e) { console.error(e); setError(t.photoFailed); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-line py-[.9rem]">
      <Avatar photo={photo} name={user.displayName} email={user.email} className="size-14 text-[1.15rem]" />
      <div className="min-w-0 flex-1">
        <div className="font-head text-[.92rem] font-semibold">{t.photo}</div>
        <div className="text-[.82rem] text-muted">{t.photoHint}</div>
        {error && <div role="alert" className="mt-1 text-[.82rem] text-red">{error}</div>}
      </div>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" tabIndex={-1} aria-hidden="true"
          onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" className={btn("ghost", "sm")} disabled={busy} onClick={() => fileRef.current?.click()}>{photo ? t.photoChange : t.photoUpload}</button>
        {photo && <button type="button" className={`${btn("quiet", "sm")} text-red!`} disabled={busy} onClick={remove}>{t.photoRemove}</button>}
      </div>
    </div>
  );
}

function Account({ t, user, s, fb, photo, onSignOut }) {
  const mail = `mailto:${s.chat.menu.supportEmail}?subject=${encodeURIComponent(t.deleteSubject)}`;
  return (
    <>
      <h3 className={heading}>{t.sections.account}</h3>
      <PhotoRow t={t} fb={fb} user={user} photo={photo} />
      <Row label={t.name}><span className="truncate text-[.9rem]">{user.displayName || s.chat.menu.yourAccount}</span></Row>
      <Row label={t.email}><span className="min-w-0 truncate text-[.9rem]">{user.email}</span></Row>
      <Row label={t.signOut} hint={t.signOutHint}>
        <button type="button" className={btn("ghost", "sm")} onClick={onSignOut}>{t.signOut}</button>
      </Row>
      <Row label={t.deleteAccount} hint={t.deleteHint}>
        <a className={`${btn("ghost", "sm")} !text-red`} href={mail}>{t.deleteButton}</a>
      </Row>
    </>
  );
}

function Privacy({ t }) {
  return (
    <>
      <h3 className={heading}>{t.sections.privacy}</h3>
      <p className="m-0 mb-3 text-[.88rem] text-muted">{t.privacyLead}</p>
      <div className="grid gap-2">
        {t.storage.map(([what, where, text]) => (
          <div key={what} className="rounded-xl border border-line bg-bg-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-head text-[.9rem] font-semibold">{what}</span>
              <span className="rounded-full border border-line bg-surface px-[.6rem] py-[.15rem] font-head text-[.75rem] font-semibold">{where}</span>
            </div>
            <div className="mt-1 text-[.82rem] text-muted">{text}</div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Row label={t.deleteChats} hint={t.deleteChatsHint} />
        <Row label={t.training} hint={t.trainingHint} />
        <Row label={t.topics} hint={t.topicsHint} />
      </div>
      <Link to="/privacy" target="_blank" rel="noopener" className="mt-1 inline-block font-head text-[.88rem] font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink">{t.policy}</Link>
    </>
  );
}

function Meter({ t, lang, period, u }) {
  const pct = percent(u);
  const tone = pct >= 90 ? "bg-red" : pct >= 70 ? "bg-[#d4a017]" : "bg-lake";
  return (
    <div className="grid grid-cols-1 items-center gap-x-6 gap-y-2 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,190px)_1fr_auto]">
      <div>
        <div className="font-head text-[.92rem] font-semibold">{t.periods[period]}</div>
        <div className="text-[.82rem] text-muted">{t.resets(resetLabel(period, lang))}</div>
      </div>
      <div role="progressbar" aria-label={t.periods[period]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        className="h-[6px] overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full transition-[width] duration-300 ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-right text-[.85rem] text-muted max-sm:text-left">
        <div className="text-ink">{t.used(pct)}</div>
        <div>{t.messages(u.used, u.limit)}</div>
      </div>
    </div>
  );
}

// Paid plans and the message pack. Nothing can be bought yet: "Notify me" saves
// interest/{uid}_{item} so we can email people when payments go live.
function PlanOptions({ t, lang, fb, user }) {
  const m = t.more;
  const items = [...CONFIG.plans.map((p) => p.id), CONFIG.addon.id];
  const [state, setState] = useState({}); // item -> "on" | "busy" | "error"
  useEffect(() => {
    if (!fb || !user) return;
    let live = true;
    Promise.all(items.map((id) => getDoc(doc(fb.db, "interest", `${user.uid}_${id}`)).then((d) => [id, d.exists()]).catch(() => [id, false])))
      .then((list) => { if (live) setState(Object.fromEntries(list.filter(([, on]) => on).map(([id]) => [id, "on"]))); });
    return () => { live = false; };
  }, [fb, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const notify = async (id) => {
    setState((x) => ({ ...x, [id]: "busy" }));
    try {
      await setDoc(doc(fb.db, "interest", `${user.uid}_${id}`), { uid: user.uid, item: id, createdAt: serverTimestamp() });
      setState((x) => ({ ...x, [id]: "on" }));
    } catch (e) {
      console.error(e);
      setState((x) => ({ ...x, [id]: "error" }));
    }
  };
  const button = (id) => (
    <div className="mt-auto pt-3">
      <button type="button" disabled={state[id] === "on" || state[id] === "busy"} onClick={() => notify(id)}
        className={`${btn(state[id] === "on" ? "ghost" : "primary", "sm")} w-full disabled:cursor-default`}>
        {state[id] === "on" ? <><CheckIcon className="i size-4" />{m.notified}</> : m.notify}
      </button>
      {state[id] === "error" && <p role="alert" className="m-0 mt-1 text-[.78rem] text-red">{m.failed}</p>}
    </div>
  );
  const card = "flex flex-col rounded-xl border border-line p-4";
  return (
    <div className="mt-6">
      <h4 className="m-0 font-head text-[1rem] font-bold">{m.title}</h4>
      <p className="m-0 mt-1 mb-3 text-[.86rem] text-muted">{m.lead}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${card} border-lake bg-lake/5`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-head text-[.95rem] font-bold">{m.names.free}</span>
            <span className="rounded-full bg-lake px-2 py-[.1rem] font-head text-[.7rem] font-semibold text-lake-ink">{m.current}</span>
          </div>
          <div className="mt-1 font-head"><span className="text-[1.25rem] font-bold">{money(0, lang)}</span> <span className="text-[.8rem] text-muted">{m.perMonth}</span></div>
          <p className="m-0 mt-2 text-[.8rem] text-muted">{m.limits(CONFIG.limits)}</p>
        </div>
        {CONFIG.plans.map((p) => (
          <div key={p.id} className={card}>
            <span className="font-head text-[.95rem] font-bold">{m.names[p.id]}</span>
            <div className="mt-1 font-head"><span className="text-[1.25rem] font-bold">{money(p.price, lang)}</span> <span className="text-[.8rem] text-muted">{m.perMonth}</span></div>
            <p className="m-0 mt-2 text-[.8rem] text-muted">{m.limits(p.limits)}</p>
            <p className="m-0 mt-1 text-[.82rem]">{m.perks[p.id]}</p>
            {button(p.id)}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-head text-[.95rem] font-bold">{m.names.pack}</span>
            <span className="font-head text-[.95rem] font-bold">{money(CONFIG.addon.price, lang)}</span>
            <span className="text-[.8rem] text-muted">{m.oneTime}</span>
          </div>
          <p className="m-0 mt-1 text-[.82rem] text-muted">{m.pack(CONFIG.addon.messages)}</p>
        </div>
        <div className="sm:w-[150px] [&>div]:pt-0">{button(CONFIG.addon.id)}</div>
      </div>
      <p className="m-0 mt-3 text-[.78rem] text-muted">{m.note}</p>
    </div>
  );
}

function Usage({ t, usage, lang, fb, user }) {
  const u = {
    day: usage ? { used: usage.used, limit: usage.limit } : { used: 0, limit: CONFIG.limits.day },
    week: usage?.week || { used: 0, limit: CONFIG.limits.week },
    month: usage?.month || { used: 0, limit: CONFIG.limits.month },
  };
  // The headline follows whichever limit is closest to running out.
  const top = ["day", "week", "month"].reduce((a, b) => (percent(u[b]) > percent(u[a]) ? b : a));
  return (
    <>
      <h3 className={heading}>{t.sections.usage}</h3>
      <p className="m-0 mt-3 mb-1 border-b border-line pb-4 font-head text-[1.35rem] font-bold tracking-[-.01em]">{t.usageHead(percent(u[top]), t.periodOf[top])}</p>
      {["day", "week", "month"].map((p) => <Meter key={p} t={t} lang={lang} period={p} u={u[p]} />)}
      <p className="m-0 mt-3 text-[.82rem] text-muted">{t.usageNote}</p>
      <PlanOptions t={t} lang={lang} fb={fb} user={user} />
    </>
  );
}

function Billing({ t, lang, fb, user }) {
  return (
    <>
      <h3 className={heading}>{t.sections.billing}</h3>
      <div className="mt-3 rounded-xl border border-line bg-bg-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[.8rem] text-muted">{t.plan}</div>
            <div className="font-head text-[1.2rem] font-bold">{t.free}</div>
          </div>
          <div className="font-head"><span className="text-[1.2rem] font-bold">{money(0, lang)}</span> <span className="text-[.82rem] text-muted">{t.perMonth}</span></div>
        </div>
        <ul className="m-0 mt-3 grid list-none gap-[.35rem] p-0 sm:grid-cols-2">
          {t.includes(CONFIG.limits).map((x) => (
            <li key={x} className="flex items-center gap-2 text-[.86rem]"><CheckIcon className="i size-4 flex-none text-lake-deep" />{x}</li>
          ))}
        </ul>
      </div>
      <div className="mt-2">
        <Row label={t.payment} hint={t.noPayment} />
        <Row label={t.invoices} hint={t.noInvoices} />
      </div>
      <PlanOptions t={t} lang={lang} fb={fb} user={user} />
    </>
  );
}

export default function Settings({ fb, user, photo, usage, themePref, onTheme, model, onModel, backend, onBackend, onSignOut, onClose, initialSection = "general" }) {
  const { lang, s } = useLang();
  const t = s.chat.settings;
  const [section, setSection] = useState(initialSection);
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    ref.current?.querySelector("[aria-current=page]")?.focus();
    const onKey = (e) => { if (e.key === "Escape") close.current(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); before?.focus?.(); };
  }, []);

  const props = { t, s, fb, user, photo, usage, lang, themePref, onTheme, model, onModel, backend, onBackend, onSignOut };
  const Body = { general: General, account: Account, privacy: Privacy, usage: Usage, billing: Billing }[section];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,20,27,.45)] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="settings-title"
        className="relative flex h-[min(620px,calc(100dvh-2rem))] w-[min(860px,100%)] flex-col overflow-hidden rounded-[18px] border border-line bg-surface shadow-card sm:flex-row">
        <nav aria-labelledby="settings-title" className="flex-none border-b border-line bg-bg-2 px-3 pt-3 pb-2 sm:w-[210px] sm:border-r sm:border-b-0 sm:py-4">
          <h2 id="settings-title" className="m-0 mb-2 px-2 font-head text-[.8rem] font-semibold text-muted max-sm:pr-12 max-sm:text-[1.05rem] max-sm:text-ink">{t.title}</h2>
          <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 sm:flex-col">
            {SECTIONS.map(([id, Icon]) => (
              <li key={id} className="flex-none">
                <button type="button" aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}
                  className={`flex w-full cursor-pointer items-center gap-[.6rem] whitespace-nowrap rounded-[9px] border-0 px-[.7rem] py-[.5rem] text-left font-head text-[.9rem] ${section === id ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]" : "bg-transparent text-muted hover:bg-surface/60 hover:text-ink"}`}>
                  <Icon className="i size-[18px]" />{t.sections[id]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className={`${iconBtn} absolute top-2 right-2 z-10`} aria-label={t.close} title={t.close} onClick={onClose}><CloseIcon /></button>
        <section className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 sm:px-7 sm:pt-6">
          <Body {...props} />
        </section>
      </div>
    </div>
  );
}
