import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { deleteApp, initializeApp } from "firebase/app";
import { inMemoryPersistence, initializeAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { CONFIG, IS_LOCAL } from "../config";
import { CardIcon, CheckIcon, CloseIcon, GaugeIcon, GearIcon, HelpIcon, MailIcon, ShieldIcon, UserIcon } from "../components/Icons";
import Avatar, { resizeImage } from "../components/Avatar";
import ThemeSwitch from "../components/ThemeSwitch";
import { btn, iconBtn } from "../components/ui";
import { useLang } from "../i18n";
import { usePref } from "../lib/prefs";
import { AddMethodPage, InvoicesPage, MethodsPage, NavRow, methodLabel, useBilling } from "./BillingPages";
import { call, describeAuthError, profileDoc, swapToken } from "./account";

const LANGS = [["en", "English"], ["fr", "Français"]];
const SECTIONS = [["general", GearIcon], ["account", UserIcon], ["privacy", ShieldIcon], ["usage", GaugeIcon], ["billing", CardIcon]];
const HELP = ["help", HelpIcon]; // pinned to the bottom of the menu

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

function Toggle({ label, on, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[24px] w-[42px] flex-none cursor-pointer rounded-full border-0 transition-colors ${on ? "bg-lake" : "bg-line"}`}>
      <span className={`absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white shadow transition-transform ${on ? "translate-x-[18px]" : ""}`} />
    </button>
  );
}

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
  const [textSize, setTextSize] = usePref("textSize");
  const [enterSends, setEnterSends] = usePref("enterSends");
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
      <Row label={t.textSize} hint={t.textSizeHint}>
        <div role="radiogroup" aria-label={t.textSize} className="inline-flex gap-[2px] rounded-full border border-line bg-bg-2 p-[3px]">
          {Object.entries(t.sizes).map(([id, name]) => (
            <button key={id} type="button" role="radio" aria-checked={textSize === id} className={seg(textSize === id)} onClick={() => setTextSize(id)}>{name}</button>
          ))}
        </div>
      </Row>
      <Row label={t.enterSends} hint={enterSends === "1" ? t.enterOn : t.enterOff}>
        <Toggle label={t.enterSends} on={enterSends === "1"} onChange={(on) => setEnterSends(on ? "1" : "0")} />
      </Row>
      <div className="border-b border-line py-[.9rem] last:border-b-0">
        <div className="font-head text-[.92rem] font-semibold">{t.shortcuts}</div>
        <dl className="m-0 mt-2 grid gap-[.4rem]">
          {t.keys.map(([what, keys]) => (
            <div key={what} className="flex items-center justify-between gap-4 text-[.86rem]">
              <dt className="text-muted">{what}</dt>
              <dd className="m-0 flex gap-1">{keys.split(" ").map((k) => <kbd key={k} className="min-w-[1.6rem] rounded-[6px] border border-line bg-bg-2 px-[.4rem] py-[.1rem] text-center font-body text-[.78rem] text-ink">{k}</kbd>)}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 text-[.78rem] text-muted">{t.keysNote}</div>
      </div>
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

const field = "w-full min-w-0 rounded-[10px] border border-line bg-surface px-3 py-[.5rem] text-[.9rem] text-ink outline-none focus:border-lake";
const note = (ok) => `mt-2 text-[.82rem] ${ok ? "text-muted" : "text-red"}`;

// "What should Maple call you?" Saved as users/{uid}.callName as the person types (no Save button);
// the chat function adds it to Maple's instructions.
function CallNameRow({ t, fb, user }) {
  const [value, setValue] = useState(null); // null while loading
  const [state, setState] = useState(null); // "saving" | "saved" | "failed"
  const saved = useRef("");
  useEffect(() => {
    getDoc(profileDoc(fb, user.uid)).then(
      (snap) => { saved.current = snap.get("callName") || ""; setValue(saved.current); },
      (e) => { console.error("Profile read failed:", e); setValue(""); });
  }, [fb, user.uid]);
  useEffect(() => {
    if (value === null) return;
    const clean = value.trim().replace(/\s+/g, " ").slice(0, 40);
    if (clean === saved.current) return;
    const timer = setTimeout(async () => {
      setState("saving");
      try { await updateDoc(profileDoc(fb, user.uid), { callName: clean }); saved.current = clean; setState("saved"); }
      catch (err) { console.error("Name save failed:", err); setState("failed"); }
    }, 600);
    return () => clearTimeout(timer);
  }, [value, fb, user.uid]);
  return (
    <Row label={<label htmlFor="call-name">{t.callName}</label>} hint={t.callNameHint}>
      <div className="flex w-full flex-col items-stretch gap-1 sm:w-[240px]">
        <input id="call-name" className={field} value={value ?? ""} maxLength={40} autoComplete="nickname"
          placeholder={user.displayName || ""} disabled={value === null} onChange={(e) => { setValue(e.target.value); setState(null); }} />
        <span aria-live="polite" className={`min-h-[1em] text-right text-[.75rem] ${state === "failed" ? "text-red" : "text-muted"}`}>
          {state === "saved" ? t.saved : state === "failed" ? t.saveFailed : ""}
        </span>
      </div>
    </Row>
  );
}

// Signs in with the password in a throwaway app instance and returns that ID token, so the server can
// check the password without this session losing its email-code check. Wrong password -> reason "wrong_password".
async function passwordProof(fb, email, password) {
  const app = initializeApp(fb.config, `password-check-${Date.now()}`);
  try {
    const auth = initializeAuth(app, { persistence: inMemoryPersistence });
    return await (await signInWithEmailAndPassword(auth, email, password)).user.getIdToken();
  } catch (err) {
    if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/missing-password") {
      throw Object.assign(new Error("wrong_password"), { details: { reason: "wrong_password" } });
    }
    throw err;
  } finally {
    deleteApp(app).catch(() => {});
  }
}

// Change password: the server checks the current one (passwordProof) and signs out other devices.
function PasswordRow({ t, s, fb, user }) {
  const p = t.pw;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { text, ok }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const close = () => { setOpen(false); setForm({ current: "", next: "", again: "" }); };

  async function submit(e) {
    e.preventDefault();
    if (form.next.length < 8) return setMsg({ text: p.short });
    if (form.next !== form.again) return setMsg({ text: p.mismatch });
    setBusy(true); setMsg(null);
    try {
      const proof = await passwordProof(fb, user.email, form.current);
      await swapToken(fb, "changePassword", { proof, password: form.next });
      close();
      setMsg({ text: p.done, ok: true });
    } catch (err) {
      if (err?.details?.reason === "wrong_password") setMsg({ text: p.wrong });
      else setMsg({ text: describeAuthError(err, s).text || t.saveFailed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-line py-[.9rem]">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="font-head text-[.92rem] font-semibold">{t.password}</div>
          <div className="text-[.82rem] text-muted">{t.passwordHint}</div>
        </div>
        {!open && <button type="button" className={btn("ghost", "sm")} onClick={() => { setOpen(true); setMsg(null); }}>{t.passwordChange}</button>}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 grid max-w-[320px] gap-2">
          <input type="email" autoComplete="username" value={user.email} readOnly hidden />
          <input type="password" className={field} placeholder={p.current} aria-label={p.current} autoComplete="current-password" value={form.current} onChange={set("current")} required autoFocus />
          <input type="password" className={field} placeholder={p.next} aria-label={p.next} autoComplete="new-password" value={form.next} onChange={set("next")} required minLength={8} maxLength={128} />
          <input type="password" className={field} placeholder={p.again} aria-label={p.again} autoComplete="new-password" value={form.again} onChange={set("again")} required maxLength={128} />
          <div className="mt-1 flex gap-2">
            <button type="submit" className={btn("primary", "sm")} disabled={busy}>{busy ? p.saving : p.save}</button>
            <button type="button" className={btn("quiet", "sm")} disabled={busy} onClick={() => { close(); setMsg(null); }}>{p.cancel}</button>
          </div>
        </form>
      )}
      {msg && <div role={msg.ok ? "status" : "alert"} className={note(msg.ok)}>{msg.text}</div>}
    </div>
  );
}

// Every sign-in on this account (users/{uid}/sessions), newest activity first, this browser on top.
function Sessions({ t, fb, user, sid, lang }) {
  const x = t.sessions;
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => onSnapshot(query(collection(fb.db, "users", user.uid, "sessions"), orderBy("updatedAt", "desc")),
    (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))),
    (e) => { console.error("Sessions failed to load:", e); setRows([]); }), [fb, user.uid]);
  const when = (ts) => ts?.toDate?.().toLocaleString(`${lang}-CA`, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) || "—";
  const list = rows ? [...rows.filter((r) => r.id === sid), ...rows.filter((r) => r.id !== sid)] : [];
  const others = list.some((r) => r.id !== sid);

  async function signOutOthers() {
    if (!confirm(x.confirm)) return;
    setBusy(true); setMsg(null);
    try { await swapToken(fb, "signOutOthers"); setMsg({ text: x.done, ok: true }); }
    catch (e) { console.error(e); setMsg({ text: x.failed }); }
    finally { setBusy(false); }
  }

  const th = "px-3 py-2 text-left font-head text-[.78rem] font-semibold text-muted";
  const td = "px-3 py-[.6rem] align-top";
  return (
    <div className="pt-6">
      <h4 className="m-0 font-head text-[.98rem] font-bold">{x.title}</h4>
      <p className="mt-1 mb-3 text-[.82rem] text-muted">{x.lead}</p>
      <div className="overflow-x-auto rounded-[12px] border border-line">
        <table className="w-full min-w-[520px] border-collapse text-[.85rem]">
          <thead className="bg-bg-2">
            <tr><th scope="col" className={th}>{x.device}</th><th scope="col" className={th}>{x.location}</th><th scope="col" className={th}>{x.created}</th><th scope="col" className={th}>{x.updated}</th></tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={4} className={`${td} text-muted`}>{x.loading}</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={4} className={`${td} text-muted`}>{x.none}</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className={td}>
                  <span className="font-medium">{r.device || "—"}</span>
                  {r.id === sid && <span className="ml-2 inline-block rounded-full bg-lake-soft px-2 py-[1px] text-[.72rem] font-semibold text-lake-deep">{x.current}</span>}
                </td>
                <td className={td}>{r.location || "—"}</td>
                <td className={`${td} whitespace-nowrap`}>{when(r.createdAt)}</td>
                <td className={`${td} whitespace-nowrap`}>{when(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {others && <button type="button" className={`${btn("ghost", "sm")} mt-3`} disabled={busy} onClick={signOutOthers}>{x.others}</button>}
      {msg && <div role={msg.ok ? "status" : "alert"} className={note(msg.ok)}>{msg.text}</div>}
    </div>
  );
}

const mailto = (s, subject) => `mailto:${s.chat.menu.supportEmail}?subject=${encodeURIComponent(subject)}`;

// Delete account: deactivate for 30 days (sign in to restore) or delete permanently. Both need the password.
// The "Before you go" box offers a way to report a problem first.
function DeleteDialog({ t, s, fb, user, onClose, onHelp }) {
  const d = t.del;
  const [mode, setMode] = useState("temporary");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [busy, onClose]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const proof = await passwordProof(fb, user.email, password);
      await call(fb, "deleteAccount", { mode, proof });
      await signOut(fb.auth).catch(() => {});
    } catch (err) {
      setError(err?.details?.reason === "wrong_password" ? d.wrong : describeAuthError(err, s).text || d.failed);
      setBusy(false);
    }
  }
  const option = (id, title, hint) => (
    <label className={`flex cursor-pointer gap-3 rounded-[12px] border px-4 py-3 ${mode === id ? (id === "permanent" ? "border-red" : "border-lake") : "border-line"}`}>
      <input type="radio" name="delete-mode" value={id} checked={mode === id} onChange={() => setMode(id)} className="mt-[.2rem] accent-[var(--lake)]" />
      <span>
        <span className={`block font-head text-[.92rem] font-semibold ${id === "permanent" ? "text-red" : ""}`}>{title}</span>
        <span className="block text-[.82rem] text-muted">{hint}</span>
      </span>
    </label>
  );
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(8,20,27,.45)] p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="delete-title" onSubmit={submit}
        className="max-h-[calc(100dvh-2rem)] w-[min(500px,100%)] overflow-y-auto rounded-[18px] border border-line bg-surface p-6 shadow-card">
        <h2 id="delete-title" className="m-0 font-head text-[1.15rem] font-bold">{d.title}</h2>
        <p className="mt-1 mb-4 text-[.88rem] text-muted">{d.lead}</p>
        <div className="grid gap-2">
          {option("temporary", d.temporary, d.temporaryHint)}
          {option("permanent", d.permanent, d.permanentHint)}
        </div>
        <label htmlFor="delete-password" className="mt-4 mb-1 block text-[.85rem] font-medium">{d.password}</label>
        <input type="email" autoComplete="username" value={user.email} readOnly hidden />
        <input id="delete-password" type="password" className={field} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div role="alert" className={note(false)}>{error}</div>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={btn("ghost", "sm")} disabled={busy} onClick={onClose} autoFocus>{d.cancel}</button>
          <button type="submit" className={`${btn("primary", "sm")} ${mode === "permanent" ? "!bg-red !border-red" : ""}`} disabled={busy || !password}>
            {busy ? d.working : mode === "permanent" ? d.continuePerm : d.continueTemp}
          </button>
        </div>
        <div className="mt-5 rounded-[12px] bg-bg-2 px-4 py-3">
          <div className="font-head text-[.88rem] font-semibold">{d.stayTitle}</div>
          <p className="mt-1 mb-2 text-[.82rem] text-muted">{d.stayText}</p>
          <div className="flex flex-wrap gap-2">
            <a className={btn("ghost", "sm")} href={mailto(s, d.reportSubject)}><MailIcon className="i size-4" />{d.report}</a>
            <button type="button" className={btn("quiet", "sm")} onClick={onHelp}><HelpIcon className="i size-4" />{d.help}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Help({ t, s }) {
  const h = t.help;
  return (
    <>
      <h3 className={heading}>{h.title}</h3>
      <p className="mt-0 mb-3 text-[.86rem] text-muted">{h.lead}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        <a className={btn("primary", "sm")} href={`mailto:${s.chat.menu.supportEmail}`}><MailIcon className="i size-4" />{h.contact}</a>
        <a className={btn("ghost", "sm")} href={mailto(s, h.reportSubject)}>{h.report}</a>
      </div>
      <div className="rounded-[12px] border border-line">
        {h.faq.map(([q, a]) => (
          <details key={q} className="group border-b border-line last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-head text-[.9rem] font-semibold [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden="true" className="flex-none text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="m-0 px-4 pb-3 text-[.86rem] leading-[1.55] text-muted">{a}</p>
          </details>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[.84rem]">
        <Link to="/terms" target="_blank" rel="noopener" className="text-lake-deep">{h.terms}</Link>
        <Link to="/privacy" target="_blank" rel="noopener" className="text-lake-deep">{h.privacy}</Link>
      </div>
    </>
  );
}

function Account({ t, user, s, fb, photo, sid, lang, onSignOut, go }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <h3 className={heading}>{t.sections.account}</h3>
      <PhotoRow t={t} fb={fb} user={user} photo={photo} />
      <Row label={t.name}><span className="truncate text-[.9rem]">{user.displayName || s.chat.menu.yourAccount}</span></Row>
      <CallNameRow t={t} fb={fb} user={user} />
      <Row label={t.email}><span className="min-w-0 truncate text-[.9rem]">{user.email}</span></Row>
      <PasswordRow t={t} s={s} fb={fb} user={user} />
      <Row label={t.signOut} hint={t.signOutHint}>
        <button type="button" className={btn("ghost", "sm")} onClick={onSignOut}>{t.signOut}</button>
      </Row>
      <Row label={t.deleteAccount} hint={t.deleteHint}>
        <button type="button" className={`${btn("ghost", "sm")} !text-red`} onClick={() => setDeleting(true)}>{t.deleteNow}</button>
      </Row>
      <Sessions t={t} fb={fb} user={user} sid={sid} lang={lang} />
      {deleting && <DeleteDialog t={t} s={s} fb={fb} user={user} onClose={() => setDeleting(false)} onHelp={() => { setDeleting(false); go("help"); }} />}
    </>
  );
}

// Settings > Privacy > "Help improve Maple". Off by default. Saved as users/{uid}.improveMaple (+ the time);
// turning it off deletes the copies already saved (functions/training.js).
function ImproveRow({ t, fb, user }) {
  const [on, setOn] = useState(null); // null while loading
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!fb || !user || user.isAnonymous) return;
    getDoc(profileDoc(fb, user.uid)).then((snap) => setOn(snap.get("improveMaple") === true), () => setOn(false));
  }, [fb, user]);
  if (!fb || !user || user.isAnonymous) return <Row label={t.training} hint={t.trainingHint} />;
  async function change(next) {
    const prev = on;
    setOn(next); setState("saving");
    try { await updateDoc(profileDoc(fb, user.uid), { improveMaple: next, improveMapleAt: serverTimestamp() }); setState(next ? "on" : "off"); }
    catch (e) { console.error("Improve setting failed:", e); setOn(prev); setState("failed"); }
  }
  return (
    <Row label={t.improve} hint={<>
      {t.improveHint}
      <span aria-live="polite" className={`mt-1 block ${state === "failed" ? "text-red" : ""}`}>
        {state === "on" ? t.improveOn : state === "off" ? t.improveOff : state === "failed" ? t.saveFailed : ""}
      </span>
    </>}>
      <Toggle label={t.improve} on={on === true} onChange={(v) => on !== null && change(v)} />
    </Row>
  );
}

function Privacy({ t, fb, user }) {
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
        <ImproveRow t={t} fb={fb} user={user} />
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
  const [page, setPage] = useState(null); // null | "methods" | "add" | "invoices"
  const [toast, setToast] = useState(null);
  const billing = useBilling(fb);
  const b = { ...t.bill, noInvoices: t.noInvoices };
  const back = (to = null) => () => setPage(to);
  if (page === "methods") return <MethodsPage b={b} fb={fb} billing={billing} onBack={back()} onAdd={back("add")} />;
  if (page === "add") {
    return <AddMethodPage b={b} fb={fb} lang={lang} billing={billing} onBack={back("methods")}
      onSaved={() => { billing.reload(); setPage("methods"); setToast(b.saved); setTimeout(() => setToast(null), 2600); }} />;
  }
  if (page === "invoices") return <InvoicesPage b={b} lang={lang} billing={billing} onBack={back()} />;

  const data = billing.data;
  const def = data?.methods?.find((m) => m.isDefault) || data?.methods?.[0];
  const loadingHint = billing.status === "loading" ? b.loading : null;
  return (
    <>
      {toast && <p role="status" className="m-0 mb-3 rounded-[10px] bg-lake-soft px-3 py-2 text-[.86rem] text-ink">{toast}</p>}
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
        <NavRow label={t.payment} hint={loadingHint || (def ? methodLabel(b, def) : t.noPayment)} onClick={back("methods")} />
        <NavRow label={t.invoices} hint={loadingHint || (data?.invoices?.length ? b.invoiceCount(data.invoices.length) : t.noInvoices)} onClick={back("invoices")} />
      </div>
      <PlanOptions t={t} lang={lang} fb={fb} user={user} />
    </>
  );
}

export default function Settings({ fb, user, sid, photo, usage, themePref, onTheme, model, onModel, backend, onBackend, onSignOut, onClose, initialSection = "general" }) {
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

  const props = { go: setSection, t, s, fb, user, sid, photo, usage, lang, themePref, onTheme, model, onModel, backend, onBackend, onSignOut };
  const Body = { general: General, account: Account, privacy: Privacy, usage: Usage, billing: Billing, help: Help }[section];

  const navItem = (id, Icon) => (
    <button type="button" aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}
      className={`flex w-full cursor-pointer items-center gap-[.6rem] whitespace-nowrap rounded-[9px] border-0 px-[.7rem] py-[.5rem] text-left font-head text-[.9rem] ${section === id ? "bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]" : "bg-transparent text-muted hover:bg-surface/60 hover:text-ink"}`}>
      <Icon className="i size-[18px]" />{t.sections[id]}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(8,20,27,.45)] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="settings-title"
        className="relative flex h-[min(680px,calc(100dvh-2rem))] w-[min(980px,100%)] flex-col overflow-hidden rounded-[18px] border border-line bg-surface shadow-card sm:flex-row">
        <nav aria-labelledby="settings-title" className="flex flex-none flex-col border-b border-line bg-bg-2 px-3 pt-3 pb-2 sm:w-[220px] sm:border-r sm:border-b-0 sm:py-4">
          <h2 id="settings-title" className="m-0 mb-2 px-2 font-head text-[.8rem] font-semibold text-muted max-sm:pr-12 max-sm:text-[1.05rem] max-sm:text-ink">{t.title}</h2>
          <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 sm:flex-col">
            {[...SECTIONS, HELP].map(([id, Icon]) => (
              <li key={id} className={`flex-none ${id === "help" ? "sm:hidden" : ""}`}>{navItem(id, Icon)}</li>
            ))}
          </ul>
          <div className="mt-auto hidden border-t border-line pt-3 sm:block">
            <div className="mb-2 grid gap-[.35rem] px-[.7rem] text-[.8rem]">
              <a className="text-muted no-underline hover:text-ink" href={`mailto:${s.chat.menu.supportEmail}`}>{t.help.contact}</a>
              <Link className="text-muted no-underline hover:text-ink" to="/terms" target="_blank" rel="noopener">{t.help.terms}</Link>
              <Link className="text-muted no-underline hover:text-ink" to="/privacy" target="_blank" rel="noopener">{t.help.privacy}</Link>
            </div>
            {navItem(...HELP)}
          </div>
        </nav>
        <button type="button" className={`${iconBtn} absolute top-2 right-2 z-10`} aria-label={t.close} title={t.close} onClick={onClose}><CloseIcon /></button>
        <section className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 sm:px-7 sm:pt-6">
          <Body {...props} />
        </section>
      </div>
    </div>
  );
}
