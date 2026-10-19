/**
 * Messages from the contact page (POST https://articx-ai.web.app/api/contact, a Hosting rewrite): general, partnership and press.
 *
 * One document per message: contact/{auto id} with { topic, name, email, organization, message,
 * language, consent, consentAt, consentVersion, source, status, createdAt, expireAt }.
 * expireAt drives the Firestore TTL policy on contact (24 months, as the privacy policy says).
 * Browsers can't read or write the collection (firestore.rules).
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { EMAIL_RE, MONTHS_24_MS, HTTP_OPTIONS, clientIp, str, underLimit } = require("./shared");
const { cors } = require("./cors");

const MAX_PER_IP_HOUR = 5;
// Keep in step with TOPICS and the message limits in apps/articx/src/components/ContactForm.jsx.
const TOPICS = ["general", "partnership", "press"];
const MIN_MESSAGE = 20;
const MAX_MESSAGE = 5000;
// Bump when the consent sentence in ContactForm.jsx changes.
const CONSENT_VERSION = "2026-10-14";
const SOURCE = "contact-v1";

exports.contact = onRequest(HTTP_OPTIONS, async (req, res) => {
  if (cors(req, res, "POST, OPTIONS")) return;
  res.set("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const b = req.body && typeof req.body === "object" ? req.body : {};
  // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
  if (str(b.website, 200)) return res.json({ ok: true });

  const topic = TOPICS.includes(b.topic) ? b.topic : "general";
  const name = str(b.name, 100);
  const email = str(b.email, 254).toLowerCase();
  const organization = str(b.organization, 120);
  const message = str(b.message, MAX_MESSAGE);
  if (!name) return res.status(400).json({ error: "name" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
  if (topic !== "general" && !organization) return res.status(400).json({ error: "organization" });
  if (message.length < MIN_MESSAGE) return res.status(400).json({ error: "message" });
  if (b.consent !== true) return res.status(400).json({ error: "consent" });

  try {
    if (!(await underLimit("contact", clientIp(req), MAX_PER_IP_HOUR))) return res.status(429).json({ error: "throttled" });
    await getFirestore().collection("contact").add({
      topic,
      name,
      email,
      organization,
      message,
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
    logger.error("Contact message failed", { error: e.message });
    return res.status(500).json({ error: "server" });
  }
});
