/**
 * Helpers shared by the company-site form functions (careers, platform, updates, contact).
 * articx.com is hosted at WHC, so these are called cross-origin through https://articx-ai.web.app/api/* (cors.js).
 */
const { getFirestore } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THROTTLE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MONTHS_24_MS = 730 * 24 * 60 * 60 * 1000;
// Keep in step with PROVINCES in articx/src/components/CareersForm.jsx.
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT", "outside"];
const REGION = "northamerica-northeast2";
const HTTP_OPTIONS = { region: REGION, memory: "256MiB", maxInstances: 3, invoker: "public" };

const sha = (s) => createHash("sha256").update(s).digest("hex");
const clientIp = (req) => (req.get("x-forwarded-for") || "").split(",")[0].trim() || req.ip || "unknown";
const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

// One counter per IP (hashed, never stored in clear) per form per hour; false once over `max`.
// expireAt drives the Firestore TTL policy on throttle (30 days, as the privacy policy says).
async function underLimit(kind, ip, max) {
  const db = getFirestore();
  const ref = db.doc(`throttle/${kind}_${sha(ip).slice(0, 32)}_${new Date().toISOString().slice(0, 13)}`);
  return db.runTransaction(async (tx) => {
    const n = (await tx.get(ref)).get("count") || 0;
    if (n >= max) return false;
    tx.set(ref, { count: n + 1, updatedAt: new Date(), expireAt: new Date(Date.now() + THROTTLE_TTL_MS) }, { merge: true });
    return true;
  });
}

module.exports = { EMAIL_RE, MONTHS_24_MS, PROVINCES, HTTP_OPTIONS, sha, clientIp, str, underLimit };
