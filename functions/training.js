/**
 * functions/training.js — "Help improve Maple" (Settings > Privacy). OFF by default.
 * Only when a signed-in person has turned it on, the chat function keeps a copy of each exchange here,
 * with personal details removed (scrub.js) and no account id (only a one-way hash, so the copies can be
 * deleted if they turn it off or delete their account). Never kept: guests, emergency/crisis messages,
 * answers built from live web search. A person reviews every chat before it is used for training.
 *   training/{auto} = { week, uidHash, model, lang, turns: [{role, content}], reply, createdAt }
 */
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash, timingSafeEqual } = require("node:crypto");
const { scrub } = require("./scrub");

const TRAINING_EXPORT_KEY = defineSecret("TRAINING_EXPORT_KEY");
const REGION = "northamerica-northeast2";
const uidHash = (uid) => createHash("sha256").update(`maple-train:${uid}`).digest("hex").slice(0, 32);
const clip = (s, n) => String(s || "").slice(0, n);

async function saveExchange({ uid, week, model, lang, messages, reply }) {
  try {
    const turns = messages.slice(-6).map((m) => ({ role: m.role, content: scrub(clip(m.content, 4000)) }));
    await getFirestore().collection("training").add({
      week, uidHash: uidHash(uid), model, lang: lang || "en/fr", turns, reply: scrub(clip(reply, 8000)), createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) { logger.warn("Training copy failed", e); }
}

async function deleteFor(uid) {
  const db = getFirestore();
  for (;;) {
    const snap = await db.collection("training").where("uidHash", "==", uidHash(uid)).limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Turned off → their saved copies are deleted right away.
const trainingOptOut = onDocumentUpdated({ document: "users/{uid}", region: REGION }, async (event) => {
  const before = event.data.before.get("improveMaple") === true;
  const after = event.data.after.get("improveMaple") === true;
  if (before && !after) {
    await deleteFor(event.params.uid);
    logger.info("Training copies deleted after opt-out");
  }
});

// GET /exportTraining?week=YYYY-MM-DD with header x-export-key → JSON lines of that week's copies.
// Used by scripts/export-training-week.sh on the Mac, for review before any training.
const exportTraining = onRequest({ region: REGION, secrets: [TRAINING_EXPORT_KEY], maxInstances: 1, invoker: "public" }, async (req, res) => {
  const key = Buffer.from(String(req.get("x-export-key") || ""));
  const want = Buffer.from(TRAINING_EXPORT_KEY.value() || "");
  if (!want.length || key.length !== want.length || !timingSafeEqual(key, want)) return res.status(403).send("Forbidden");
  const week = String(req.query.week || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return res.status(400).send("week=YYYY-MM-DD");
  const snap = await getFirestore().collection("training").where("week", "==", week).get();
  res.set("Content-Type", "application/x-ndjson; charset=utf-8");
  res.send(snap.docs.map((d) => JSON.stringify({ id: d.id, ...d.data(), uidHash: undefined, createdAt: d.get("createdAt")?.toDate?.() })).join("\n") + "\n");
});

module.exports = { saveExchange, deleteFor, uidHash, trainingOptOut, exportTraining };
