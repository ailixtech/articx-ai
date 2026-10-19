/**
 * Waitlist sign-ups from /waitlist (POST /api/waitlist, a Hosting rewrite). The company site on articx.com
 * (hosted at WHC) calls it cross-origin through https://articx-ai.web.app/api/waitlist (functions/cors.js).
 * GET /api/waitlist returns { count } for the page's counter (stats/waitlist), cached for 30 seconds.
 *
 * One document per email address: waitlist/{sha256(lowercased email)} with { firstName, email,
 * organization, province, language, consent, consentAt, consentVersion, source, status, createdAt }.
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
const { cors } = require("./cors");
const { EMAIL_RE, PROVINCES, clientIp, sha, str, underLimit } = require("./shared");

const MAX_PER_IP_HOUR = 10;
// PROVINCES (shared.js) must match apps/articx/src/pages/Waitlist.jsx.
// Bump when the consent sentence in apps/articx/src/i18n/waitlist.js (form.consent) changes.
const CONSENT_VERSION = "2026-10-04";
const SOURCE = "waitlist-v2";

exports.waitlist = onRequest(
  { region: "northamerica-northeast2", memory: "256MiB", maxInstances: 3, invoker: "public" },
  async (req, res) => {
    if (cors(req, res)) return;
    if (req.method === "GET") {
      const snap = await getFirestore().doc("stats/waitlist").get().catch(() => null);
      res.set("Cache-Control", "public, max-age=30, s-maxage=30");
      return res.json({ count: Number(snap?.get("count")) || 0 });
    }
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "method" });

    const b = req.body && typeof req.body === "object" ? req.body : {};
    // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
    if (str(b.website, 200)) return res.json({ ok: true });

    const firstName = str(b.firstName, 60);
    const email = str(b.email, 254).toLowerCase();
    const organization = str(b.organization, 120); // optional
    const province = PROVINCES.includes(b.province) ? b.province : "";
    if (!firstName) return res.status(400).json({ error: "firstName" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
    if (!province) return res.status(400).json({ error: "province" });
    if (b.consent !== true) return res.status(400).json({ error: "consent" });

    try {
      if (!(await underLimit("waitlist", clientIp(req), MAX_PER_IP_HOUR))) return res.status(429).json({ error: "throttled" });
      const db = getFirestore();
      const ref = db.doc(`waitlist/${sha(email)}`);
      await db.runTransaction(async (tx) => {
        if ((await tx.get(ref)).exists) return;
        tx.create(ref, {
          firstName,
          email,
          organization,
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
