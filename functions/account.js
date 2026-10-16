/**
 * Deleting an account (Settings > Account > Delete account).
 *
 * deleteAccount({ mode: "temporary" | "permanent", proof })
 *   proof: an ID token from signing in with the current password (same check as changePassword).
 *   temporary: the account is deactivated and signed out everywhere. Signing in again within
 *              30 days restores it (verifyCode clears the flag); after that purgeDeactivated deletes it.
 *   permanent: the account and everything tied to it are deleted right away.
 *
 * Feedback already sent is kept without the account id; anonymous topic totals were never tied to it.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldPath, FieldValue, Timestamp } = require("firebase-admin/firestore");

const REGION = "northamerica-northeast2";
const OPTS = { region: REGION, maxInstances: 10, invoker: "public" };
const RESTORE_DAYS = 30;

const db = () => getFirestore();
const fail = (code, reason, message) => new HttpsError(code, message, { reason });

async function deleteQuery(q) {
  for (;;) {
    const snap = await q.limit(400).get();
    if (snap.empty) return;
    const batch = db().batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Everything stored for an account, then the sign-in itself.
async function purgeAccount(uid) {
  const fs = db();
  await fs.recursiveDelete(fs.doc(`users/${uid}`)); // profile, chats, messages, sessions, avatar
  await require("./training").deleteFor(uid); // Help improve Maple copies, if any
  await deleteQuery(fs.collection("shares").where("uid", "==", uid));
  const byPrefix = (col) => fs.collection(col).orderBy(FieldPath.documentId()).startAt(`${uid}_`).endAt(`${uid}_`);
  await deleteQuery(byPrefix("usage"));
  await deleteQuery(byPrefix("interest"));
  await deleteQuery(fs.collection("usage").where("uid", "==", uid)); // guest counter for this uid, if any
  const billing = await fs.doc(`billing/${uid}`).get();
  if (billing.exists) {
    // The Stripe customer itself is removed from the Stripe dashboard once payments are live.
    logger.warn("Deleted account had a Stripe customer", { customerId: billing.get("customerId") });
    await billing.ref.delete();
  }
  const feedback = await fs.collection("feedback").where("uid", "==", uid).get();
  for (let i = 0; i < feedback.docs.length; i += 400) {
    const batch = fs.batch();
    feedback.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { uid: "deleted" }));
    await batch.commit();
  }
  await getAuth().deleteUser(uid).catch((e) => { if (e.code !== "auth/user-not-found") throw e; });
}

exports.deleteAccount = onCall(OPTS, async (req) => {
  const a = req.auth;
  if (!a || a.token.firebase?.sign_in_provider === "anonymous" || a.token.otp !== true) {
    throw fail("unauthenticated", "sign_in_first", "Sign in first.");
  }
  const mode = req.data?.mode;
  if (mode !== "temporary" && mode !== "permanent") throw fail("invalid-argument", "bad_mode", "Choose an option.");
  let proof;
  try { proof = await getAuth().verifyIdToken(String(req.data?.proof || "")); } catch { proof = null; }
  const fresh = proof && Date.now() / 1000 - proof.auth_time < 300;
  if (!proof || proof.uid !== a.uid || proof.firebase?.sign_in_provider !== "password" || !fresh) {
    throw fail("permission-denied", "wrong_password", "Your password is incorrect.");
  }

  if (mode === "permanent") {
    await purgeAccount(a.uid);
    logger.info("Account deleted", { uid: a.uid });
    return { ok: true };
  }
  const purgeAfter = Timestamp.fromMillis(Date.now() + RESTORE_DAYS * 864e5);
  await db().doc(`users/${a.uid}`).set({ deactivatedAt: FieldValue.serverTimestamp(), purgeAfter }, { merge: true });
  await getAuth().revokeRefreshTokens(a.uid);
  await db().recursiveDelete(db().collection(`users/${a.uid}/sessions`));
  logger.info("Account deactivated", { uid: a.uid });
  return { ok: true, purgeAfter: purgeAfter.toMillis() };
});

// Daily: permanently delete accounts deactivated more than 30 days ago and never restored.
exports.purgeDeactivated = onSchedule({ region: REGION, schedule: "every day 03:30", timeZone: "America/Toronto" }, async () => {
  const due = await db().collection("users").where("purgeAfter", "<=", Timestamp.now()).limit(200).get();
  for (const d of due.docs) {
    try { await purgeAccount(d.id); logger.info("Deactivated account purged", { uid: d.id }); }
    catch (e) { logger.error("Purge failed", { uid: d.id, error: e.message }); }
  }
});
