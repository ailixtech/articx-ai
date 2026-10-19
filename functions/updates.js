/**
 * Product news sign-ups from "Stay connected" (POST https://articx-ai.web.app/api/updates, a Hosting rewrite).
 *
 * One document per email address: updates/{sha256(lowercased email)} with { firstName, email,
 * language, consent, consentAt, consentVersion, source, status, createdAt }. A second sign-up with
 * the same email changes nothing, and the reply is the same either way, so the form can't be used to
 * test addresses. Kept until the person unsubscribes. Browsers can't read or write it (firestore.rules).
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { EMAIL_RE, HTTP_OPTIONS, sha, clientIp, str, underLimit } = require("./shared");
const { cors } = require("./cors");

const MAX_PER_IP_HOUR = 10;
// Bump when the consent sentence in apps/articx/src/components/UpdatesForm.jsx changes.
const CONSENT_VERSION = "2026-10-14";
const SOURCE = "updates-v1";

exports.updates = onRequest(HTTP_OPTIONS, async (req, res) => {
  if (cors(req, res, "POST, OPTIONS")) return;
  res.set("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const b = req.body && typeof req.body === "object" ? req.body : {};
  // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
  if (str(b.website, 200)) return res.json({ ok: true });

  const firstName = str(b.firstName, 60);
  const email = str(b.email, 254).toLowerCase();
  if (!firstName) return res.status(400).json({ error: "firstName" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
  if (b.consent !== true) return res.status(400).json({ error: "consent" });

  try {
    if (!(await underLimit("updates", clientIp(req), MAX_PER_IP_HOUR))) return res.status(429).json({ error: "throttled" });
    const db = getFirestore();
    const ref = db.doc(`updates/${sha(email)}`);
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return;
      tx.create(ref, {
        firstName,
        email,
        language: b.language === "fr" ? "fr" : "en",
        consent: true,
        consentAt: FieldValue.serverTimestamp(),
        consentVersion: CONSENT_VERSION,
        source: SOURCE,
        status: "subscribed",
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error("Updates sign-up failed", { error: e.message });
    return res.status(500).json({ error: "server" });
  }
});
