/**
 * ARTICxAI chat proxy (Cloud Functions 2nd gen, Toronto).
 *
 * Browser -> this function (verifies Firebase ID token, checks daily quota,
 * adds the system prompt) -> your OpenAI-compatible model server -> streams back.
 * The model server URL and key live in Secret Manager, never in the browser.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString, defineInt } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

// Secrets (set with: firebase functions:secrets:set NAME)
const MODEL_API_URL = defineSecret("MODEL_API_URL"); // e.g. https://model.example.ca/v1
const MODEL_API_KEY = defineSecret("MODEL_API_KEY"); // bearer token your model server expects

// Plain config (functions/.env)
const MODEL_NAME = defineString("MODEL_NAME");
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", { default: "" });
const DAILY_MESSAGE_LIMIT = defineInt("DAILY_MESSAGE_LIMIT", { default: 200 });

const MAX_MESSAGES = 30;
const MAX_CHARS_PER_MESSAGE = 8000;
const MAX_TOTAL_CHARS = 48000;

const SYSTEM_PROMPT = [
  "You are ARTICxAI, an AI assistant made in Canada by AILIX.",
  "You do not have internet access, live data, or the ability to search the web.",
  "Your knowledge comes from training data that stops at a cutoff date and may be outdated.",
  "If asked about news, current events, today's date, prices, scores, weather, elections, or anything that may have changed recently, say plainly that you can't check live information and suggest a reliable current source. Never present recent events as confirmed fact.",
  "Never invent URLs, citations, quotes, statistics, or sources. If you don't know a source, say so. Only mention well-known homepages (e.g. canada.ca) when you are certain they exist.",
  "If asked what model you are built on, say you are built on an open-source base model adapted by AILIX.",
  "Be helpful, clear and concise. Use Canadian spelling.",
].join(" ");

function projectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try { return JSON.parse(process.env.FIREBASE_CONFIG).projectId; } catch { return ""; }
}

function allowedOrigins() {
  const p = projectId();
  return new Set([
    `https://${p}.web.app`,
    `https://${p}.firebaseapp.com`,
    "http://localhost:5002",
    "http://127.0.0.1:5002",
    ...ALLOWED_ORIGINS.value().split(",").map((s) => s.trim()).filter(Boolean),
  ]);
}

function cleanMessages(input) {
  if (!Array.isArray(input) || input.length === 0) return { error: "No messages were sent." };
  const msgs = input.slice(-MAX_MESSAGES);
  let total = 0;
  const out = [];
  for (const m of msgs) {
    // Only user/assistant turns are accepted; client "system" messages are dropped.
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.slice(0, MAX_CHARS_PER_MESSAGE);
    total += content.length;
    out.push({ role: m.role, content });
  }
  if (!out.length || out[out.length - 1].role !== "user") return { error: "The last message must be from the user." };
  if (total > MAX_TOTAL_CHARS) return { error: "This conversation is too long. Start a new chat to continue." };
  return { messages: out };
}

async function takeQuota(uid) {
  const day = new Date().toISOString().slice(0, 10); // UTC day
  const ref = getFirestore().doc(`usage/${uid}_${day}`);
  const limit = DAILY_MESSAGE_LIMIT.value();
  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? snap.get("count") : 0;
    if (count >= limit) return false;
    tx.set(ref, { uid, day, count: count + 1, updatedAt: new Date() }, { merge: true });
    return true;
  });
}

exports.chat = onRequest(
  {
    region: "northamerica-northeast2",
    secrets: [MODEL_API_URL, MODEL_API_KEY],
    timeoutSeconds: 300,
    memory: "256MiB",
    concurrency: 40,
    maxInstances: 10,
    invoker: "public", // the function does its own auth via Firebase ID tokens
  },
  async (req, res) => {
    const origin = req.get("origin") || "";
    const okOrigin = allowedOrigins().has(origin);
    if (okOrigin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Max-Age", "3600");
    }
    if (req.method === "OPTIONS") return res.status(okOrigin ? 204 : 403).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
    if (!okOrigin) return res.status(403).json({ error: "Origin not allowed." });

    // 1. Who is this?
    const match = (req.get("authorization") || "").match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Sign in to chat." });
    let uid;
    try {
      uid = (await getAuth().verifyIdToken(match[1])).uid;
    } catch {
      return res.status(401).json({ error: "Your session expired. Sign in again." });
    }

    // 2. Is the request reasonable?
    const { messages, error } = cleanMessages(req.body && req.body.messages);
    if (error) return res.status(400).json({ error });

    // 3. Within today's limit?
    try {
      if (!(await takeQuota(uid))) {
        return res.status(429).json({ error: "You've reached today's message limit. Try again tomorrow." });
      }
    } catch (e) {
      logger.error("Quota check failed", e);
      return res.status(500).json({ error: "Couldn't check your usage. Try again." });
    }

    // 4. Forward to the model server and stream the reply back.
    const controller = new AbortController();
    res.on("close", () => { if (!res.writableEnded) controller.abort(); });

    try {
      const base = MODEL_API_URL.value().replace(/\/+$/, "");
      const key = MODEL_API_KEY.value();
      const upstream = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(key && key !== "none" ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({
          model: MODEL_NAME.value(),
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        }),
        signal: controller.signal,
      });

      if (!upstream.ok || !upstream.body) {
        logger.error("Model server error", { status: upstream.status, body: (await upstream.text()).slice(0, 500) });
        return res.status(502).json({ error: "The model server isn't responding right now." });
      }

      res.status(200);
      res.set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" });
      res.flushHeaders();
      for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch (e) {
      if (e.name === "AbortError") return; // user pressed Stop or closed the tab
      logger.error("Proxy failure", e);
      if (!res.headersSent) res.status(502).json({ error: "The model server isn't responding right now." });
      else res.end();
    }
  }
);
