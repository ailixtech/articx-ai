/**
 * Feedback from the articx.com popup (POST https://articx-ai.web.app/api/feedback, a Hosting rewrite):
 * bug reports, ideas and other comments. Name and email are optional.
 *
 * One document per message: siteFeedback/{auto id} with { kind, message, name, email, page, language,
 * consent, consentAt, consentVersion, source, status, createdAt, expireAt }.
 * expireAt drives the Firestore TTL policy on siteFeedback (24 months, as the privacy policy says).
 * Browsers can't read or write the collection (firestore.rules).
 *
 * Not to be confused with feedback.js: thumbs-down reports from the chat app, in the feedback collection.
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { EMAIL_RE, MONTHS_24_MS, HTTP_OPTIONS, clientIp, str, underLimit } = require("./shared");
const { cors } = require("./cors");

const MAX_PER_IP_HOUR = 10;
// Keep in step with KINDS and the message limits in apps/articx/src/components/FeedbackForm.jsx.
const KINDS = ["bug", "idea", "product", "website", "accessibility", "content", "other"];
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 5000;
// Bump when the consent sentence in FeedbackForm.jsx changes.
const CONSENT_VERSION = "2026-10-17";
const SOURCE = "site-feedback-v1";

exports.siteFeedback = onRequest(HTTP_OPTIONS, async (req, res) => {
  if (cors(req, res, "POST, OPTIONS")) return;
  res.set("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const b = req.body && typeof req.body === "object" ? req.body : {};
  // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
  if (str(b.website, 200)) return res.json({ ok: true });

  const kind = b.kind;
  const message = str(b.message, MAX_MESSAGE);
  const name = str(b.name, 100);
  const email = str(b.email, 254).toLowerCase();
  const page = str(b.page, 200);
  if (!KINDS.includes(kind)) return res.status(400).json({ error: "kind" });
  if (message.length < MIN_MESSAGE) return res.status(400).json({ error: "message" });
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
  if (b.consent !== true) return res.status(400).json({ error: "consent" });

  try {
    if (!(await underLimit("sitefeedback", clientIp(req), MAX_PER_IP_HOUR))) return res.status(429).json({ error: "throttled" });
    await getFirestore().collection("siteFeedback").add({
      kind,
      message,
      name,
      email,
      page,
      language: b.language === "fr" ? "fr" : "en",
      consent: true,
      consentAt: FieldValue.serverTimestamp(),
      consentVersion: CONSENT_VERSION,
      source: SOURCE,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + MONTHS_24_MS),
    });
    return res.json({ ok: true });
  } catch (e) {
    logger.error("Site feedback failed", { error: e.message });
    return res.status(500).json({ error: "server" });
  }
});
