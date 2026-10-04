// Full-page account screens. Steps:
//   signin, signup -> code (emailed 6-digit code) -> profile (first name, date of birth, country) -> chat
//   reset -> reset-code (code + new password) -> signed in
//   blocked: shown when the server says the account isn't eligible (age is never mentioned)
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { createUserWithEmailAndPassword, signInWithCustomToken, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { call, describeAuthError } from "./account";
import { CloseIcon } from "../components/Icons";
import { Brand, iconBtn } from "../components/ui";
import { LangToggle, useLang } from "../i18n";

// Steps that belong to a half-finished sign-in: leaving them signs the session out.
const SESSION_STEPS = new Set(["code", "profile", "blocked"]);

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const COUNTRIES = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BR IO VG BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF KP MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS KR SS ES LK BL SH KN LC MF PM VC SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM VI UY UZ VU VA VE VN WF EH YE ZM ZW".split(" ");
function countryOptions(locale) {
  let names = null;
  try { names = new Intl.DisplayNames([locale], { type: "region" }); } catch { /* old browser */ }
  return COUNTRIES.map((c) => [c, names?.of(c) || c]).sort((a, b) => a[1].localeCompare(b[1], locale));
}
function guessCountry() {
  const g = (navigator.language || "").split("-")[1]?.toUpperCase();
  return COUNTRIES.includes(g) ? g : "CA";
}

// ---------- Small pieces ----------
function Field({ label, children, className = "" }) {
  return (
    <label className={`relative block h-[58px] rounded-full border border-line bg-surface text-left transition-[border-color,box-shadow] focus-within:border-lake focus-within:shadow-[0_0_0_3px_var(--lake-soft)] ${className}`}>
      <span className="pointer-events-none absolute top-[9px] left-[1.35rem] font-head text-[.74rem] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "h-full w-full appearance-none rounded-full border-0 bg-transparent pt-[22px] pr-[1.35rem] pb-[6px] pl-[1.35rem] text-base text-ink outline-none";

function PasswordField({ label, value, onChange, autoComplete, f }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label}>
      <input className={`${inputCls} pr-20`} type={show ? "text" : "password"} value={value} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)} maxLength={128} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? f.hidePassword : f.showPassword}
        className="absolute top-1/2 right-[.55rem] -translate-y-1/2 cursor-pointer rounded-full border-0 bg-transparent px-[.8rem] py-[.45rem] text-[.85rem] font-semibold text-muted hover:bg-bg-2 hover:text-ink">
        {show ? f.hide : f.show}
      </button>
    </Field>
  );
}

const pill = "inline-flex w-full min-h-[54px] items-center justify-center gap-[.6rem] rounded-full border px-[1.4rem] py-[.8rem] font-head text-base font-semibold cursor-pointer transition-[filter,border-color,opacity]";
const linkBtn = "cursor-pointer border-0 bg-transparent p-0 font-body text-[.92rem] text-ink underline underline-offset-[3px] disabled:cursor-default disabled:text-muted disabled:no-underline";
const hint = "-mt-1 mb-3 pl-[1.35rem] text-left text-[.84rem] text-muted";
const legal = "my-2 mb-4 text-[.86rem] leading-[1.55] text-muted [&_a]:text-ink";

// ---------- Screen ----------
export default function AuthScreen({ fb, account, view, setView, pending }) {
  const step = account.step || view.step; // steps the account still needs win over user-chosen ones
  const { s: L, lang } = useLang();
  const A = L.auth, f = A.fields;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState(null); // { text, ok }
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const countries = useMemo(() => countryOptions(L.locale), [L.locale]);
  const formRef = useRef(null);

  const show = (next, text = null) => { setView({ step: next }); setMessage(text ? { text } : null); };
  const fail = (e) => {
    console.error(e);
    const d = describeAuthError(e, L);
    if (!d) return;
    if (d.blocked) show("blocked");
    else setMessage({ text: d.text });
  };

  // Entering a step: clear old input/messages, take over any error handed in by the page.
  useEffect(() => {
    if (!step) return;
    setMessage(view.error ? { text: view.error } : null);
    if (step === "code" || step === "reset-code") setCode("");
    if (step === "profile") {
      setFirstName((v) => v || (fb.auth.currentUser?.displayName || "").trim().split(/\s+/)[0] || "");
      setCountry((v) => v || guessCountry());
    }
    const t = setTimeout(() => {
      const first = [...(formRef.current?.querySelectorAll("input, select") || [])].find((el) => !el.value);
      if (!matchMedia("(pointer: coarse)").matches) first?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // The code step sends a code as soon as it opens (the server skips it if one was just sent).
  const uid = fb?.auth.currentUser?.uid;
  useEffect(() => {
    if (step === "code" && uid) requestCode(false);
  }, [step, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resend countdown
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldownUntil]);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const startCooldown = (s) => { setNow(Date.now()); setCooldownUntil(Date.now() + s * 1000); };

  // Escape leaves the screen
  useEffect(() => {
    if (!step) return;
    const onKey = (e) => { if (e.key === "Escape") leave(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!step) return null;
  const st = A.steps[step];

  async function leave() {
    if (SESSION_STEPS.has(step)) await signOut(fb.auth);
    setView({ step: null });
  }
  async function requestCode(announce) {
    try {
      const r = await call(fb, "sendCode", { lang });
      if (r.verified) return account.refresh();
      startCooldown(r.retryAfter || 45);
      if (announce) setMessage({ text: A.messages.newCode, ok: true });
    } catch (e) { fail(e); }
  }
  async function resend() {
    if (step === "code") return requestCode(true);
    try {
      await call(fb, "resetStart", { email: resetEmail, lang });
      startCooldown(45);
      setMessage({ text: A.messages.newResetCode, ok: true });
    } catch (e) { fail(e); }
  }
  async function run(fn) {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); }
  }
  const say = (text) => setMessage({ text });

  function submit(e) {
    e?.preventDefault();
    const em = email.trim();
    if (step === "signin") return run(async () => {
      if (!isEmail(em)) return say(A.errors.invalidEmail);
      if (!password) return say(A.errors.missingPassword);
      await signInWithEmailAndPassword(fb.auth, em, password); // the account moves on to the code step
    });
    if (step === "signup") return run(async () => {
      if (!isEmail(em)) return say(A.errors.invalidEmail);
      if (password.length < 8) return say(A.errors.weakPassword);
      await createUserWithEmailAndPassword(fb.auth, em, password);
    });
    if (step === "code") return run(async () => {
      if (code.length !== 6) return say(A.messages.enterCode);
      const { token } = await call(fb, "verifyCode", { code });
      await signInWithCustomToken(fb.auth, token);
      await account.refresh();
    });
    if (step === "profile") return run(async () => {
      const name = firstName.trim().replace(/\s+/g, " ");
      if (!name) return say(A.messages.enterFirstName);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return say(A.messages.enterDob);
      if (!country) return say(A.messages.chooseCountry);
      await call(fb, "completeProfile", { firstName: name, birthDate: dob, country });
      account.markProfileOk(fb.auth.currentUser.uid);
      await fb.auth.currentUser.reload().catch(() => {}); // pick up the display name
      await account.refresh();
    });
    if (step === "reset") return run(async () => {
      if (!isEmail(em)) return say(A.errors.invalidEmail);
      await call(fb, "resetStart", { email: em, lang });
      setResetEmail(em);
      startCooldown(45);
      show("reset-code");
    });
    if (step === "reset-code") return run(async () => {
      if (code.length !== 6) return say(A.messages.enterCode);
      if (newPassword.length < 8) return say(A.errors.weakPassword);
      const { token } = await call(fb, "resetFinish", { email: resetEmail, code, password: newPassword });
      await signInWithCustomToken(fb.auth, token);
      await account.refresh();
    });
    if (step === "blocked") return run(leave);
  }

  let sub = typeof st.sub === "function" ? "" : st.sub || "";
  if (step === "code") sub = st.sub(fb.auth.currentUser?.email || A.yourEmail);
  if (step === "reset-code") sub = st.sub(resetEmail);
  if ((step === "signin" || step === "signup") && pending) sub = A.pendingSub;
  const legalLine = (parts) => (
    <>{parts[0]}<Link to="/terms" target="_blank" rel="noopener">{parts[1]}</Link>{parts[2]}<Link to="/privacy" target="_blank" rel="noopener">{parts[3]}</Link>{parts[4]}</>
  );
  const go = (next) => (e) => { e.preventDefault(); show(next); };
  const onCode = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && step === "code" && !busy) setTimeout(() => formRef.current?.requestSubmit(), 0);
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section aria-labelledby="auth-title" className="fixed inset-0 z-60 flex flex-col overflow-y-auto bg-surface text-ink">
      <header className="flex items-center justify-between px-4 py-[14px]">
        <Brand />
        <div className="flex items-center gap-2">
          <LangToggle />
          <button type="button" className={iconBtn} aria-label={A.close} onClick={leave}><CloseIcon /></button>
        </div>
      </header>
      <div className="flex flex-1 justify-center px-4 pt-[clamp(1.5rem,9vh,6rem)] pb-12">
        <form ref={formRef} onSubmit={submit} noValidate className="flex w-[min(400px,100%)] flex-col text-center">
          <h1 id="auth-title" className="m-0 mb-[.6rem] text-[clamp(1.75rem,5vw,2.15rem)] font-[650] leading-[1.15] tracking-[-.03em]">{st.title}</h1>
          {sub && <p className="m-0 mb-7 text-[.98rem] leading-[1.55] text-muted">{sub}</p>}

          {(step === "signin" || step === "signup" || step === "reset") && (
            <div className="mb-3 flex flex-col gap-3">
              <Field label={f.email}>
                <input className={inputCls} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false}
                  maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              {step !== "reset" && (
                <PasswordField label={f.password} f={f} value={password} onChange={setPassword}
                  autoComplete={step === "signup" ? "new-password" : "current-password"} />
              )}
            </div>
          )}
          {step === "signup" && <p className={hint}>{A.minChars}</p>}

          {(step === "code" || step === "reset-code") && (
            <div className="mb-3 flex flex-col gap-3">
              <Field label={f.code}>
                <input className={`${inputCls} text-[1.25rem]! tracking-[.5em] tabular-nums`} type="text" inputMode="numeric"
                  autoComplete="one-time-code" maxLength={6} pattern="[0-9]*" value={code} onChange={(e) => onCode(e.target.value)} />
              </Field>
              {step === "reset-code" && (
                <PasswordField label={f.newPassword} f={f} value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
              )}
            </div>
          )}
          {step === "reset-code" && <p className={hint}>{A.minChars}</p>}

          {step === "profile" && (
            <>
              <div className="mb-3 flex flex-col gap-3">
                <Field label={f.firstName}>
                  <input className={inputCls} type="text" autoComplete="given-name" maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
                <Field label={f.dob}>
                  <input className={inputCls} type="date" autoComplete="bday" min="1900-01-01" max={today} value={dob} onChange={(e) => setDob(e.target.value)} />
                </Field>
                <Field label={f.country} className="after:pointer-events-none after:absolute after:top-1/2 after:right-[1.35rem] after:-mt-1.5 after:size-2 after:rotate-45 after:border-r-2 after:border-b-2 after:border-muted after:content-['']">
                  <select className={`${inputCls} cursor-pointer pr-11`} autoComplete="country" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="" disabled>{f.chooseCountry}</option>
                    {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                  </select>
                </Field>
              </div>
              <p className={legal}>{legalLine(A.legalProfile)}</p>
            </>
          )}

          {message && <p role="alert" className={`mt-1 mb-[.9rem] text-[.9rem] ${message.ok ? "text-lake" : "text-red"}`}>{message.text}</p>}
          <button type="submit" disabled={busy}
            className={`${pill} relative mt-2 border-transparent bg-ink text-surface hover:brightness-125 disabled:cursor-progress disabled:opacity-60`}>
            <span className={busy ? "invisible" : ""}>{st.button}</span>
            {busy && <span aria-hidden="true" className="absolute size-5 animate-spin rounded-full border-2 border-surface border-r-transparent" />}
            {busy && <span className="sr-only">{A.working}</span>}
          </button>

          <div className="mt-[1.1rem] flex flex-col gap-[.35rem] text-[.92rem] text-muted [&_a]:text-ink">
            {step === "signin" && <>
              <p className="m-0">{A.links.noAccount} <a href="#" onClick={go("signup")}>{A.links.signUp}</a></p>
              <p className="m-0"><a href="#" onClick={go("reset")}>{A.links.forgot}</a></p>
            </>}
            {step === "signup" && <p className="m-0">{A.links.haveAccount} <a href="#" onClick={go("signin")}>{A.links.logIn}</a></p>}
            {(step === "code" || step === "reset-code") && (
              <p className="m-0"><button type="button" className={linkBtn} disabled={cooldown > 0} onClick={resend}>
                {cooldown > 0 ? A.links.resendIn(cooldown) : A.links.resend}
              </button></p>
            )}
            {step === "code" && (
              <p className="m-0"><button type="button" className={linkBtn} onClick={async () => { await signOut(fb.auth); show("signin"); }}>{A.links.differentEmail}</button></p>
            )}
            {(step === "reset" || step === "reset-code") && <p className="m-0"><a href="#" onClick={go("signin")}>{A.links.back}</a></p>}
          </div>

          {step === "signup" && <p className={`${legal} mt-6`}>{legalLine(A.legalSignup)}</p>}
        </form>
      </div>
    </section>
  );
}
