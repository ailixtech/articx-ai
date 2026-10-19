/**
 * AI Platform early access requests from the products pages (POST https://articx-ai.web.app/api/platform, a Hosting rewrite).
 *
 * One document per request: platform/{auto id} with { name, email, company, role, teamSize, useCase,
 * language, consent, consentAt, consentVersion, source, status, createdAt, expireAt }.
 * expireAt drives the Firestore TTL policy on platform (24 months, as the privacy policy says).
 * Browsers can't read or write the collection (firestore.rules).
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { EMAIL_RE, MONTHS_24_MS, HTTP_OPTIONS, clientIp, str, underLimit } = require("./shared");
const { cors } = require("./cors");

const MAX_PER_IP_HOUR = 5;
// Keep in step with TEAM_SIZES and the message limits in apps/articx/src/components/PlatformForm.jsx.
const TEAM_SIZES = ["1", "2-10", "11-50", "51-200", "200+"];
const MIN_MESSAGE = 20;
const MAX_MESSAGE = 5000;
// Bump when the consent sentence in PlatformForm.jsx changes.
const CONSENT_VERSION = "2026-10-14";
const SOURCE = "platform-v1";

exports.platform = onRequest(HTTP_OPTIONS, async (req, res) => {
  if (cors(req, res, "POST, OPTIONS")) return;
  res.set("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const b = req.body && typeof req.body === "object" ? req.body : {};
  // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
  if (str(b.website, 200)) return res.json({ ok: true });

  const name = str(b.name, 100);
  const email = str(b.email, 254).toLowerCase();
  const company = str(b.company, 120);
  const role = str(b.role, 100);
  const teamSize = TEAM_SIZES.includes(b.teamSize) ? b.teamSize : "";
  const useCase = str(b.useCase, MAX_MESSAGE);
  if (!name) return res.status(400).json({ error: "name" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
  if (!company) return res.status(400).json({ error: "company" });
  if (!teamSize) return res.status(400).json({ error: "teamSize" });
  if (useCase.length < MIN_MESSAGE) return res.status(400).json({ error: "useCase" });
  if (b.consent !== true) return res.status(400).json({ error: "consent" });

  try {
    if (!(await underLimit("platform", clientIp(req), MAX_PER_IP_HOUR))) return res.status(429).json({ error: "throttled" });
    await getFirestore().collection("platform").add({
      name,
      email,
      company,
      role,
      teamSize,
      useCase,
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
    logger.error("Platform access request failed", { error: e.message });
    return res.status(500).json({ error: "server" });
  }
});
