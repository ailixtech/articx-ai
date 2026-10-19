/**
 * Career applications from the careers page popup (POST https://articx-ai.web.app/api/careers, a Hosting rewrite, so same origin).
 *
 * One document per application: careers/{auto id} with { name, email, area, province, message, link
 * (optional, "" when not given), resume (optional: { path, name, type, size }), language, consent,
 * consentAt, consentVersion, source, status, createdAt, expireAt }.
 * Résumés (PDF or Word, up to 5 MB) are saved to Cloud Storage at resumes/{application id}/ and are
 * deleted with the application (deleteCareerResume). Firebase Storage must be enabled for uploads;
 * until then an application with a résumé is refused with { error: "resume" } rather than losing it.
 * expireAt drives the Firestore TTL policy on careers (24 months, as promised in the privacy policy).
 * To keep an application longer after contacting the person, move its expireAt forward in the console.
 * Browsers can't read or write the collection (firestore.rules); only this function and the
 * Firebase console can. Review new applications in the console (careers, newest first).
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { EMAIL_RE, MONTHS_24_MS, PROVINCES, HTTP_OPTIONS, clientIp, str, underLimit } = require("./shared");
const { cors } = require("./cors");

const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;
const MAX_PER_IP_HOUR = 5;
// Keep in step with AREAS and the message limits in apps/articx/src/components/CareersForm.jsx.
const AREAS = [
  "research", "engineering", "ml-infra", "design", "product", "language", "growth",
  "partnerships", "community", "operations", "security", "internship", "other",
];
// Résumé types, each with the bytes its files start with, so a renamed file can't pass as a PDF.
const RESUME_TYPES = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "application/msword": [0xd0, 0xcf, 0x11, 0xe0], // legacy .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [0x50, 0x4b], // .docx (zip)
};
const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const MIN_MESSAGE = 30;
const MAX_MESSAGE = 5000;
// Bump when the consent sentence in CareersForm.jsx changes.
const CONSENT_VERSION = "2026-10-09";
const SOURCE = "careers-v1";

exports.careers = onRequest(
  HTTP_OPTIONS,
  async (req, res) => {
    if (cors(req, res, "POST, OPTIONS")) return;
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "method" });

    const b = req.body && typeof req.body === "object" ? req.body : {};
    // Honeypot: people never see this field, simple bots fill it in. Pretend it worked.
    if (str(b.website, 200)) return res.json({ ok: true });

    const name = str(b.name, 100);
    const email = str(b.email, 254).toLowerCase();
    const area = AREAS.includes(b.area) ? b.area : "";
    const province = PROVINCES.includes(b.province) ? b.province : "";
    const link = str(b.link, 300); // optional
    const message = str(b.message, MAX_MESSAGE);
    if (!name) return res.status(400).json({ error: "name" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "email" });
    if (!area) return res.status(400).json({ error: "area" });
    if (!province) return res.status(400).json({ error: "province" });
    if (message.length < MIN_MESSAGE) return res.status(400).json({ error: "message" });
    if (link && !URL_RE.test(link)) return res.status(400).json({ error: "link" });

    // Optional résumé: { name, type, data (base64) }.
    let resume = null;
    if (b.resume && typeof b.resume === "object") {
      const magic = RESUME_TYPES[b.resume.type];
      const bytes = typeof b.resume.data === "string" ? Buffer.from(b.resume.data, "base64") : Buffer.alloc(0);
      if (!magic || !magic.every((v, i) => bytes[i] === v)) return res.status(400).json({ error: "resume" });
      if (bytes.length > RESUME_MAX_BYTES) return res.status(400).json({ error: "resume" });
      const fileName = str(b.resume.name, 120).replace(/[^\w.\- ]+/g, "_") || "resume";
      resume = { bytes, type: b.resume.type, name: fileName };
    }
    if (b.consent !== true) return res.status(400).json({ error: "consent" });

    try {
      if (!(await underLimit("careers", clientIp(req), MAX_PER_IP_HOUR))) return res.status(429).json({ error: "throttled" });
      const ref = getFirestore().collection("careers").doc();
      let resumeInfo = null;
      if (resume) {
        const path = `resumes/${ref.id}/${resume.name}`;
        try {
          await getStorage().bucket().file(path).save(resume.bytes, {
            resumable: false,
            contentType: resume.type,
            metadata: { contentDisposition: `attachment; filename="${resume.name}"` },
          });
        } catch (e) {
          logger.error("Résumé upload failed (is Firebase Storage enabled?)", { error: e.message });
          return res.status(503).json({ error: "resume" });
        }
        resumeInfo = { path, name: resume.name, type: resume.type, size: resume.bytes.length };
      }
      await ref.set({
        name,
        email,
        area,
        province,
        message,
        link,
        resume: resumeInfo,
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
      logger.error("Career application failed", { error: e.message });
      return res.status(500).json({ error: "server" });
    }
  }
);

// Deletes an application's résumé when the application is deleted, by hand or by the 24-month TTL.
exports.deleteCareerResume = onDocumentDeleted(
  { document: "careers/{id}", region: "northamerica-northeast2", maxInstances: 3 },
  async (event) => {
    const path = event.data?.get("resume")?.path;
    if (!path) return;
    await getStorage()
      .bucket()
      .file(path)
      .delete({ ignoreNotFound: true })
      .catch((e) => logger.error("Résumé delete failed", { path, error: e.message }));
  },
);
