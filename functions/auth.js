/**
 * ARTICxAI account security: 6-digit email codes and the profile step.
 *
 * Sign-up and sign-in: the browser signs in with email + password, then calls
 * sendCode. verifyCode checks the code and returns a custom token carrying
 * { otp: true }; signing in with it gives a session that the chat function and
 * Firestore rules accept.
 *
 * Forgot password: resetStart emails a code, resetFinish checks it, sets the new
 * password and returns the same kind of token, so the person lands signed in.
 *
 * Email goes out over SMTP (functions/.env + the SMTP_PASS secret). In the
 * emulator with no SMTP_HOST, codes are written to the function logs instead.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash, randomInt, timingSafeEqual } = require("node:crypto");
const { SMTP_PASS, MAIL_FROM, mailReady, transport } = require("./mail");


const OPTS = { region: "northamerica-northeast2", secrets: [SMTP_PASS], maxInstances: 10, invoker: "public" };
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 45 * 1000;
const MAX_SENDS_PER_HOUR = 6;
const MAX_ATTEMPTS = 5;
const MIN_AGE = 13;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const db = () => getFirestore();
// Errors carry a short reason the app translates (web/src/i18n, auth.errors.reasons).
const fail = (code, reason, message) => new HttpsError(code, message, { reason });

// Code emails in English and French; the app sends the visitor's language.
const EMAILS = {
  en: {
    signup: ["Confirm your email for ARTICxAI", "Welcome to ARTICxAI. Use this code to confirm your email address."],
    login: ["Your ARTICxAI sign-in code", "Use this code to finish signing in to ARTICxAI."],
    reset: ["Reset your ARTICxAI password", "Use this code to choose a new password for your ARTICxAI account."],
    codeLabel: "Your code:",
    expiry: "It expires in 10 minutes. If you didn't ask for this, you can ignore this email.",
    footer: "ARTICxAI, made in Canada by AILIX",
  },
  fr: {
    signup: ["Confirmez votre adresse courriel pour ARTICxAI", "Bienvenue sur ARTICxAI. Utilisez ce code pour confirmer votre adresse courriel."],
    login: ["Votre code de connexion ARTICxAI", "Utilisez ce code pour terminer votre connexion à ARTICxAI."],
    reset: ["Réinitialisez votre mot de passe ARTICxAI", "Utilisez ce code pour choisir un nouveau mot de passe pour votre compte ARTICxAI."],
    codeLabel: "Votre code :",
    expiry: "Il expire dans 10 minutes. Si vous n'avez pas fait cette demande, vous pouvez ignorer ce courriel.",
    footer: "ARTICxAI, conçu au Canada par AILIX",
  },
};
const emailText = (lang, kind) => {
  const t = EMAILS[lang === "fr" ? "fr" : "en"];
  return { subject: t[kind][0], intro: t[kind][1], codeLabel: t.codeLabel, expiry: t.expiry, footer: t.footer, lang: lang === "fr" ? "fr" : "en" };
};
const sha = (s) => createHash("sha256").update(s).digest("hex");
const codeHash = (salt, code) => sha(`${salt}:${code}`);
const resetDoc = (email) => `otp/reset_${sha(email).slice(0, 40)}`;
const isVerified = (token) => token.otp === true;

function signedIn(req) {
  if (!req.auth || req.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw fail("unauthenticated", "sign_in_first", "Sign in first.");
  }
  return req.auth;
}
function cleanEmail(v) {
  const email = String(v || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) throw fail("invalid-argument", "invalid_email", "Enter a valid email address.");
  return email;
}
function cleanCode(v) {
  const code = String(v || "").replace(/\D/g, "");
  if (code.length !== 6) throw fail("invalid-argument", "code_format", "Enter the 6-digit code.");
  return code;
}
function clientIp(req) {
  const r = req.rawRequest;
  return String(r.headers["x-forwarded-for"] || "").split(",")[0].trim() || r.ip || "unknown";
}

// ---------- Email ----------
async function sendMail(to, mail, code) {
  const { subject, intro } = mail;
  if (!mailReady()) {
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      logger.info(`[emulator] ${subject} for ${to}: ${code}`);
      return;
    }
    throw fail("failed-precondition", "email_not_setup", "Email sending isn't set up yet. Try again later.");
  }
  const text = `${intro}\n\n${mail.codeLabel} ${code}\n\n${mail.expiry}\n\n${mail.footer}`;
  const html = `<div lang="${mail.lang === "fr" ? "fr-CA" : "en-CA"}" style="font-family:Inter,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#102029">
  <p style="font-size:18px;font-weight:700;margin:0 0 16px">ARTICxAI</p>
  <p style="margin:0 0 20px;line-height:1.5">${intro}</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 20px">${code}</p>
  <p style="margin:0;color:#56687A;font-size:13px;line-height:1.5">${mail.expiry}</p>
</div>`;
  await transport().sendMail({ from: MAIL_FROM.value(), to, subject, text, html });
}

// ---------- Codes ----------
// Stores a fresh code (hashed) and emails it. Returns { sent, retryAfter }.
async function issueCode(path, fields, to, mail) {
  const ref = db().doc(path);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  const result = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    if (d.sentAt && now - d.sentAt < RESEND_AFTER_MS) return { wait: Math.ceil((RESEND_AFTER_MS - (now - d.sentAt)) / 1000) };
    const freshWindow = !d.windowStart || now - d.windowStart > 3600e3;
    const sends = freshWindow ? 0 : d.sends || 0;
    if (sends >= MAX_SENDS_PER_HOUR) return { limited: true };
    tx.set(ref, {
      ...fields, hash: codeHash(ref.id, code), sentAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0,
      windowStart: freshWindow ? now : d.windowStart, sends: sends + 1,
    });
    return {};
  });
  if (result.wait) return { sent: false, retryAfter: result.wait };
  if (result.limited) throw fail("resource-exhausted", "too_many_codes", "Too many codes requested. Try again in an hour.");
  try {
    await sendMail(to, mail, code);
  } catch (e) {
    await ref.update({ sentAt: 0, hash: FieldValue.delete() }); // let them try again straight away
    if (e instanceof HttpsError) throw e;
    logger.error("Email send failed", e);
    throw fail("unavailable", "email_failed", "We couldn't send the email. Try again in a minute.");
  }
  return { sent: true, retryAfter: RESEND_AFTER_MS / 1000 };
}

const CODE_ERRORS = {
  missing: "That code isn't valid. Send a new one.",
  expired: "That code has expired. Send a new one.",
  locked: "Too many wrong tries. Send a new code.",
  wrong: "That code isn't right. Check your email and try again.",
};
// Checks a code once. Returns the stored fields on success; throws otherwise.
async function useCode(path, code) {
  const ref = db().doc(path);
  const r = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (!d || !d.hash) return "missing";
    if (Date.now() > d.expiresAt) return "expired";
    if (d.attempts >= MAX_ATTEMPTS) return "locked";
    if (!timingSafeEqual(Buffer.from(codeHash(ref.id, code)), Buffer.from(d.hash))) {
      tx.update(ref, { attempts: d.attempts + 1 });
      return d.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "wrong";
    }
    tx.update(ref, { hash: FieldValue.delete(), expiresAt: 0 });
    return { data: d };
  });
  if (typeof r === "string") throw fail("invalid-argument", `code_${r}`, CODE_ERRORS[r]);
  return r.data;
}

// Simple per-key counter for unauthenticated endpoints.
async function throttle(key, limit) {
  const hour = new Date().toISOString().slice(0, 13);
  const ref = db().doc(`throttle/${sha(key).slice(0, 32)}_${hour}`);
  const ok = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const n = snap.exists ? snap.get("count") : 0;
    if (n >= limit) return false;
    tx.set(ref, { count: n + 1, updatedAt: new Date() });
    return true;
  });
  if (!ok) throw fail("resource-exhausted", "throttled", "Too many attempts. Wait a while, then try again.");
}

// ---------- Sign-up / sign-in ----------
exports.sendCode = onCall(OPTS, async (req) => {
  const a = signedIn(req);
  if (isVerified(a.token)) return { sent: false, verified: true };
  const user = await getAuth().getUser(a.uid);
  if (!user.email) throw fail("failed-precondition", "no_email", "This account has no email address.");
  return user.emailVerified
    ? issueCode(`otp/${a.uid}`, { uid: a.uid }, user.email, emailText(req.data?.lang, "login"))
    : issueCode(`otp/${a.uid}`, { uid: a.uid }, user.email, emailText(req.data?.lang, "signup"));
});

exports.verifyCode = onCall(OPTS, async (req) => {
  const a = signedIn(req);
  await useCode(`otp/${a.uid}`, cleanCode(req.data?.code));
  const user = await getAuth().getUser(a.uid);
  if (!user.emailVerified) await getAuth().updateUser(a.uid, { emailVerified: true });
  return { token: await getAuth().createCustomToken(a.uid, { otp: true }) };
});

// ---------- Profile ----------
function ageFrom(birthDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d) return null; // e.g. 2010-02-31
  const now = new Date();
  if (born > now) return null;
  const birthdayPassed = now.getUTCMonth() + 1 > mo || (now.getUTCMonth() + 1 === mo && now.getUTCDate() >= d);
  return now.getUTCFullYear() - y - (birthdayPassed ? 0 : 1);
}

exports.completeProfile = onCall(OPTS, async (req) => {
  const a = signedIn(req);
  if (!isVerified(a.token)) throw fail("permission-denied", "verify_first", "Confirm your email first.");
  const firstName = String(req.data?.firstName || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const birthDate = String(req.data?.birthDate || "");
  const country = String(req.data?.country || "").toUpperCase();
  if (!firstName) throw fail("invalid-argument", "first_name", "Enter your first name.");
  const age = ageFrom(birthDate);
  if (age === null || age > 120) throw fail("invalid-argument", "birth_date", "Enter a valid date of birth.");
  if (!/^[A-Z]{2}$/.test(country)) throw fail("invalid-argument", "country", "Choose your country.");

  const ref = db().doc(`users/${a.uid}`);
  const existing = await ref.get();
  if (existing.get("ineligible")) throw fail("permission-denied", "not_eligible", "not_eligible");
  if (existing.get("birthDate")) return { ok: true }; // already set; date of birth can't be changed
  if (age < MIN_AGE) {
    await ref.set({ ineligible: true, createdAt: FieldValue.serverTimestamp() });
    throw fail("permission-denied", "not_eligible", "not_eligible");
  }
  await ref.set({ firstName, birthDate, country, createdAt: FieldValue.serverTimestamp() });
  const user = await getAuth().getUser(a.uid);
  if (!user.displayName) await getAuth().updateUser(a.uid, { displayName: firstName });
  return { ok: true };
});

// ---------- Forgot password ----------
exports.resetStart = onCall(OPTS, async (req) => {
  const email = cleanEmail(req.data?.email);
  await throttle(`reset-ip:${clientIp(req)}`, 20);
  let user;
  try { user = await getAuth().getUserByEmail(email); } catch { return { sent: true }; } // don't reveal who has an account
  try {
    await issueCode(resetDoc(email), { uid: user.uid }, email, emailText(req.data?.lang, "reset"));
  } catch (e) {
    if (e.code !== "resource-exhausted") throw e;
  }
  return { sent: true };
});

exports.resetFinish = onCall(OPTS, async (req) => {
  const email = cleanEmail(req.data?.email);
  const code = cleanCode(req.data?.code);
  const password = String(req.data?.password || "");
  if (password.length < 8 || password.length > 128) throw fail("invalid-argument", "weak_password", "Use a password with at least 8 characters.");
  await throttle(`reset-try:${clientIp(req)}`, 40);
  const { uid } = await useCode(resetDoc(email), code);
  await getAuth().updateUser(uid, { password, emailVerified: true });
  await getAuth().revokeRefreshTokens(uid); // sign out everywhere else
  return { token: await getAuth().createCustomToken(uid, { otp: true }) };
});
