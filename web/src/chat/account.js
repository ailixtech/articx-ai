// Account plumbing shared by the chat page and the sign-in screens.
import { signInWithCustomToken } from "firebase/auth";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export const profileDoc = (fb, uid) => doc(fb.db, "users", uid);
export const call = (fb, name, data) => httpsCallable(fb.fns, name)(data).then((r) => r.data);

// Active sessions (users/{uid}/sessions/{sid}). The id rides in the token's claims.
// The server shows the time zone's city as the location ("America/Toronto" -> "Toronto").
export const timeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; } };
export const sessionDoc = (fb, uid, sid) => doc(fb.db, "users", uid, "sessions", sid);
export const currentSid = async (fb) => (await fb.auth.currentUser?.getIdTokenResult())?.claims.sid || null;
// Calls a function that returns a fresh custom token (signOutOthers, changePassword, claimSession) and switches to it.
export async function swapToken(fb, name, data = {}) {
  const r = await call(fb, name, { ...data, tz: timeZone() });
  if (r.token) await signInWithCustomToken(fb.auth, r.token);
  return r;
}
// Removes this browser's row before signing out. Best effort: signing out must not wait on it.
export async function endSession(fb) {
  const u = fb.auth.currentUser;
  const sid = await currentSid(fb).catch(() => null);
  if (u && sid) await deleteDoc(sessionDoc(fb, u.uid, sid)).catch(() => {});
}

// Which step a signed-in (non-guest) account still needs, or null when it can chat.
// Codes and the age check are enforced server-side (functions/auth.js, firestore.rules).
export async function accountStep(fb, u, profileOkUid) {
  const { claims } = await u.getIdTokenResult();
  if (claims.otp !== true) return "code";
  if (profileOkUid === u.uid) return null;
  try {
    const snap = await getDoc(profileDoc(fb, u.uid));
    if (snap.get("ineligible")) return "blocked";
    return snap.get("birthDate") ? null : "profile";
  } catch (e) {
    console.error("Profile check failed:", e);
    return "profile"; // completeProfile is safe to repeat
  }
}

// Firebase error codes -> keys in the language files (auth.errors).
const AUTH_CODES = {
  "auth/invalid-credential": "invalidCredential",
  "auth/wrong-password": "invalidCredential",
  "auth/user-not-found": "invalidCredential",
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/invalid-email": "invalidEmail",
  "auth/missing-password": "missingPassword",
  "auth/too-many-requests": "tooMany",
  "auth/network-request-failed": "network",
  // Setup problems on our side: visitors get a plain message; the code is logged to the console for us.
  "auth/unauthorized-domain": "unavailable",
  "auth/operation-not-allowed": "unavailable",
  "auth/configuration-not-found": "unavailable",
  "auth/invalid-api-key": "unavailable",
  "auth/admin-restricted-operation": "noSignups",
  "auth/custom-token-mismatch": "tokenMismatch",
};
export const authText = (code, s) => s.auth.errors[AUTH_CODES[code]];

// Turns any sign-in / callable error into { text } or { blocked }, in the current language.
export function describeAuthError(e, s) {
  const errors = s.auth.errors;
  if (e?.message === "not_eligible" || e?.details?.reason === "not_eligible") return { blocked: true };
  const reason = e?.details?.reason;
  if (reason && errors.reasons[reason]) return { text: errors.reasons[reason] };
  let text = authText(e?.code, s);
  if (!text && String(e?.code).startsWith("functions/")) {
    text = e.code === "functions/internal" || e.code === "functions/not-found" || e.code === "functions/unavailable"
      ? errors.serviceDown
      : e.message;
  }
  return { text: text || errors.fallback(e?.code || e?.message) };
}
