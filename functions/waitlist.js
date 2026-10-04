/**
 * Waitlist sign-ups from /waitlist (POST /api/waitlist, a Hosting rewrite, so same origin).
 *
 * One document per email address: waitlist/{sha256(email)} with { email, firstName,
 * province, interests, lang, consent, createdAt, updatedAt }. Browsers can't read or
 * write the collection (firestore.rules); only this function and the admin panel can.
 * Signing up again with the same email updates the details and keeps createdAt,
 * and the reply is the same either way, so the form can't be used to test addresses.
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_IP_HOUR = 10;
// Keep in step with waitlist.provinces and waitlist.form.interests in web/src/i18n.
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT", "outside"];
const INTERESTS = ["plans", "mobile", "models", "teams"];
// Bump when the consent sentence in web/src/i18n (waitlist.form.consent) changes.
const CONSENT_VERSION = "2026-10-03";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const clientIp = (req) => (req.get("x-forwarded-for") || "").split(",")[0].trim() || req.ip || "unknown";
const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

// One counter per IP (hashed, never stored in clear) per hour; false once over the limit.
async function underLimit(ip) {
  const db = getFirestore();
  const ref = db.doc(`throttle/waitlist_${sha(ip).slice(0, 32)}_${new Date().toISOString().slice(0, 13)}`);
  return db.runTransaction(async (tx) => {
    const n = (await tx.get(ref)).get("count") || 0;
    if (n >= MAX_PER_IP_HOUR) return false;
    tx.set(ref, { count: n + 1, updatedAt: new Date() }, { merge: true });
    return true;
  });
}

exports.waitlist = onRequest(
  { region: "northamerica-northeast2", memory: "256MiB", maxInstances: 3, invoker: "public" },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "method" });

    const b = req.body && typeof req.body === "object" ? req.body : {};
    // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
    if (str(b.website, 200)) return res.json({ ok: true });

    const email = str(b.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
    if (b.consent !== true) return res.status(400).json({ error: "consent" });

    const province = PROVINCES.includes(b.province) ? b.province : "";
    const interests = Array.isArray(b.interests) ? INTERESTS.filter((i) => b.interests.includes(i)) : [];

    try {
      if (!(await underLimit(clientIp(req)))) return res.status(429).json({ error: "throttled" });
      const db = getFirestore();
      const ref = db.doc(`waitlist/${sha(email)}`);
      await db.runTransaction(async (tx) => {
        const exists = (await tx.get(ref)).exists;
        tx.set(ref, {
          email,
          firstName: str(b.firstName, 60),
          province,
          interests,
          lang: b.lang === "fr" ? "fr" : "en",
          consent: { email: true, version: CONSENT_VERSION, at: FieldValue.serverTimestamp() },
          updatedAt: FieldValue.serverTimestamp(),
          ...(exists ? {} : { createdAt: FieldValue.serverTimestamp(), status: "waiting" }),
        }, { merge: true });
      });
      return res.json({ ok: true });
    } catch (e) {
      logger.error("Waitlist sign-up failed", { error: e.message });
      return res.status(500).json({ error: "server" });
    }
  }
);
