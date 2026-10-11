/**
 * Waitlist sign-ups from /waitlist (POST /api/waitlist, a Hosting rewrite, so same origin).
 *
 * One document per email address: waitlist/{sha256(lowercased email)} with { firstName, email,
 * province, language, consent, consentAt, consentVersion, source, status, createdAt }.
 * Browsers can't read or write the collection (firestore.rules); only this function and
 * the admin panel can. A second sign-up with the same email changes nothing, and the
 * reply is the same either way, so the form can't be used to test addresses.
 *
 * countWaitlist keeps stats/waitlist.count (the only publicly readable doc) in step.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_IP_HOUR = 10;
// Keep in step with PROVINCES in web/src/pages/Waitlist.jsx and waitlist.provinces in web/src/i18n.
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT", "outside"];
// Bump when the consent sentence in web/src/i18n (waitlist.form.consent) changes.
const CONSENT_VERSION = "2026-10-04";
const SOURCE = "waitlist-v2";

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

    const firstName = str(b.firstName, 60);
    const email = str(b.email, 254).toLowerCase();
    const province = PROVINCES.includes(b.province) ? b.province : "";
    if (!firstName) return res.status(400).json({ error: "firstName" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
    if (!province) return res.status(400).json({ error: "province" });
    if (b.consent !== true) return res.status(400).json({ error: "consent" });

    try {
      if (!(await underLimit(clientIp(req)))) return res.status(429).json({ error: "throttled" });
      const db = getFirestore();
      const ref = db.doc(`waitlist/${sha(email)}`);
      await db.runTransaction(async (tx) => {
        if ((await tx.get(ref)).exists) return;
        tx.create(ref, {
          firstName,
          email,
          province,
          language: b.language === "fr" ? "fr" : "en",
          consent: true,
          consentAt: FieldValue.serverTimestamp(),
          consentVersion: CONSENT_VERSION,
          source: SOURCE,
          status: "waiting",
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      return res.json({ ok: true });
    } catch (e) {
      logger.error("Waitlist sign-up failed", { error: e.message });
      return res.status(500).json({ error: "server" });
    }
  }
);

// Adds each new sign-up to stats/waitlist.count. The first run (no stats doc yet) starts
// the count from the collection's size, so sign-ups made before this trigger are included.
exports.countWaitlist = onDocumentCreated(
  { document: "waitlist/{id}", region: "northamerica-northeast2", maxInstances: 3 },
  async () => {
    const db = getFirestore();
    const ref = db.doc("stats/waitlist");
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const count = snap.exists
        ? FieldValue.increment(1)
        : (await tx.get(db.collection("waitlist").count())).data().count;
      tx.set(ref, { count, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
  }
);
