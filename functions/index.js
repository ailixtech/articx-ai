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
const { createHash } = require("node:crypto");
const { TAVILY_API_KEY, getSearchContext } = require("./search");

initializeApp();

// Email codes, profile and password reset (callable functions).
Object.assign(exports, require("./auth"));
// Public share links for chats.
Object.assign(exports, require("./share"));
// Emails thumbs-down reports to the team.
Object.assign(exports, require("./feedback"));
// Waitlist sign-ups from /waitlist.
Object.assign(exports, require("./waitlist"));

// Weekly topic counts for the homepage (no message text is stored).
const { countTopic, topics, weekOf } = require("./topics");
exports.topics = topics;

// Secrets (set with: firebase functions:secrets:set NAME)
const MODEL_API_URL = defineSecret("MODEL_API_URL"); // e.g. https://model.example.ca/v1
const MODEL_API_KEY = defineSecret("MODEL_API_KEY"); // bearer token your model server expects

// Plain config (functions/.env)
const MODEL_NAME = defineString("MODEL_NAME");
// Name of the fine-tuned Maple 0.5 Quick model on your model server (empty = use MODEL_NAME).
const MODEL_NAME_QUICK = defineString("MODEL_NAME_QUICK", { default: "" });
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", { default: "" });
const DAILY_MESSAGE_LIMIT = defineInt("DAILY_MESSAGE_LIMIT", { default: 200 });
// Weekly (Monday to Sunday, UTC) and monthly caps on top of the daily one.
// Keep all three in step with plans in web/src/config.js.
const WEEKLY_MESSAGE_LIMIT = defineInt("WEEKLY_MESSAGE_LIMIT", { default: 1000 });
const MONTHLY_MESSAGE_LIMIT = defineInt("MONTHLY_MESSAGE_LIMIT", { default: 3000 });
// Guests (Firebase anonymous auth) get a few free messages before they must sign up.
// Keep GUEST_MESSAGE_LIMIT in step with guestMessageLimit in web/js/config.js.
const GUEST_MESSAGE_LIMIT = defineInt("GUEST_MESSAGE_LIMIT", { default: 3 });
// Caps guest messages per IP per day, so clearing browser data doesn't reset the allowance.
const GUEST_IP_DAILY_LIMIT = defineInt("GUEST_IP_DAILY_LIMIT", { default: 15 });

const MAX_MESSAGES = 30;
// Longest single message, pasted text included (keep in step with maxMessageChars in web/src/config.js).
const MAX_CHARS_PER_MESSAGE = 100000;
// How much conversation is sent to the model per request. Older turns are dropped to fit;
// set it to what your model server's context window can hold (roughly 4 characters per token).
const MAX_CONTEXT_CHARS = defineInt("MAX_CONTEXT_CHARS", { default: 120000 });

const { SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT, STYLES } = require("./prompts");

// Maple models offered in the app. Both run on MODEL_NAME; Maple Q1 asks for short,
// precise answers and has a smaller reply budget. Guests can only use the default.
// Keep ids in step with MODELS in web/src/config.js.
const DEFAULT_MODEL = "maple-0.5";
const MODELS = {
  "maple-0.5": { maxTokens: 2048, style: STYLES["maple-0.5"] },
  "maple-q1": { maxTokens: 700, style: STYLES["maple-q1"], accountsOnly: true },
  // Fine-tuned quick model (scripts/build-maple-quick.js). Served under MODEL_NAME_QUICK;
  // until that's set it falls back to MODEL_NAME with the quick style.
  "maple-0.5-quick": { maxTokens: 600, style: STYLES["maple-0.5-quick"], quick: true },
};

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
  const msgs = [];
  for (const m of input.slice(-MAX_MESSAGES)) {
    // Only user/assistant turns are accepted; client "system" messages are dropped.
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    msgs.push({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) });
  }
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return { error: "The last message must be from the user." };
  // Keep the newest turns that fit the context budget (always the latest message), starting on a user turn.
  const budget = MAX_CONTEXT_CHARS.value();
  let total = 0;
  let start = msgs.length;
  while (start > 0 && (start === msgs.length || total + msgs[start - 1].content.length <= budget)) {
    total += msgs[--start].content.length;
  }
  while (start < msgs.length - 1 && msgs[start].role !== "user") start++;
  return { messages: msgs.slice(start) };
}

// Atomically adds one to every counter, or to none if any is already at its limit.
// Returns -1 on success, otherwise the index of the first counter that is full.
async function takeQuota(counters) {
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all(counters.map((c) => tx.get(db.doc(c.path))));
    const counts = snaps.map((s) => (s.exists ? s.get("count") : 0));
    const full = counters.findIndex((c, i) => counts[i] >= c.limit);
    if (full !== -1) return full;
    counters.forEach((c, i) => tx.set(db.doc(c.path), { ...c.fields, count: counts[i] + 1, updatedAt: new Date() }, { merge: true }));
    return -1;
  });
}

// An account's day, week and month counters (usage/{uid}_{day}, _w{monday}, _m{YYYY-MM}), all UTC.
// The app reads the same documents for Settings > Usage.
const LIMIT_ERRORS = [
  ["day_limit", "You've reached today's message limit. Try again tomorrow."],
  ["week_limit", "You've reached this week's message limit. It resets on Monday."],
  ["month_limit", "You've reached this month's message limit. It resets on the 1st."],
];
function accountCounters(uid, now) {
  const day = now.toISOString().slice(0, 10);
  const week = weekOf(now);
  const month = day.slice(0, 7);
  return [
    { path: `usage/${uid}_${day}`, limit: DAILY_MESSAGE_LIMIT.value(), fields: { uid, day, limit: DAILY_MESSAGE_LIMIT.value() } },
    { path: `usage/${uid}_w${week}`, limit: WEEKLY_MESSAGE_LIMIT.value(), fields: { uid, week, limit: WEEKLY_MESSAGE_LIMIT.value() } },
    { path: `usage/${uid}_m${month}`, limit: MONTHLY_MESSAGE_LIMIT.value(), fields: { uid, month, limit: MONTHLY_MESSAGE_LIMIT.value() } },
  ];
}

function clientIp(req) {
  return (req.get("x-forwarded-for") || "").split(",")[0].trim() || req.ip || "unknown";
}

exports.chat = onRequest(
  {
    region: "northamerica-northeast2",
    secrets: [MODEL_API_URL, MODEL_API_KEY, TAVILY_API_KEY],
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
    let uid, guest, verified;
    try {
      const token = await getAuth().verifyIdToken(match[1]);
      uid = token.uid;
      guest = token.firebase?.sign_in_provider === "anonymous";
      // Accounts must have entered the emailed code this session.
      verified = token.otp === true;
    } catch {
      return res.status(401).json({ error: "Your session expired. Sign in again." });
    }
    if (!guest && !verified) return res.status(401).json({ error: "Enter the code we emailed you to finish signing in." });
    if (!guest) {
      const profile = await getFirestore().doc(`users/${uid}`).get();
      if (!profile.get("birthDate") || profile.get("ineligible")) {
        return res.status(403).json({ error: "Finish setting up your account to chat." });
      }
    }

    // 2. Is the request reasonable?
    const { messages, error } = cleanMessages(req.body && req.body.messages);
    const requested = MODELS[req.body && req.body.model] ? req.body.model : DEFAULT_MODEL;
    const model = MODELS[requested].accountsOnly && guest ? MODELS[DEFAULT_MODEL] : MODELS[requested];
    if (error) return res.status(400).json({ error });

    // 3. Within the limit? Guests get a fixed number of free messages; accounts get a daily allowance.
    const day = new Date().toISOString().slice(0, 10); // UTC day
    try {
      if (guest) {
        const ipHash = createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 32);
        const full = await takeQuota([
          { path: `usage/guest_${uid}`, limit: GUEST_MESSAGE_LIMIT.value(), fields: { uid, guest: true } },
          { path: `usage/ip_${ipHash}_${day}`, limit: GUEST_IP_DAILY_LIMIT.value(), fields: { day, guest: true } },
        ]);
        if (full !== -1) {
          return res.status(403).json({ error: "You've used your free messages. Sign up to keep chatting.", code: "guest_limit" });
        }
      } else {
        const full = await takeQuota(accountCounters(uid, new Date()));
        if (full !== -1) {
          const [code, error] = LIMIT_ERRORS[full];
          return res.status(429).json({ error, code });
        }
      }
    } catch (e) {
      logger.error("Quota check failed", e);
      return res.status(500).json({ error: "Couldn't check your usage. Try again." });
    }

    // Count this message's topic (not its text) for the homepage. Runs alongside the reply.
const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) countTopic(lastUser.content);


    // Fresh info from the web when needed. Runs after the quota check,
    // so users over their limit never trigger a paid search.
    const search = lastUser ? await getSearchContext(lastUser.content) : null;
    if (search) logger.info("Web search used", { kind: search.kind, results: search.sources.length, links: search.links.length });

    // 4. Forward to the model server and stream the reply back.
    const controller = new AbortController();
    res.on("close", () => { if (!res.writableEnded) controller.abort(); });

    const core = search ? SEARCH_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const basePrompt = model.style ? `${core} ${model.style}` : core;
    const systemPrompt = search ? `${basePrompt}\n\n${search.prompt}` : basePrompt;

    try {
      const base = MODEL_API_URL.value().replace(/\/+$/, "");
      const key = MODEL_API_KEY.value();
      const upstream = await fetch(`${base}/chat/completions`, {
        method: "POST",
        
        headers: { "Content-Type": "application/json", ...(key && key !== "none" ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({
          model: (model.quick && MODEL_NAME_QUICK.value()) || MODEL_NAME.value(),
          stream: true,
          temperature: 0.7,
          max_tokens: model.maxTokens,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
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
      // Pass the stream through line by line, counting the text (to log empty replies),
      // and hold back [DONE] so search links can be sent first as {"sources": [...]}.
      // The app shows those as real links, separate from the model's text.
      const decoder = new TextDecoder();
      let buf = "", chars = 0, finish = null, firstBytes = "";
      const forward = (line) => {
        const t = line.trim();
        if (t === "data: [DONE]") return;
        if (t && !t.startsWith("data:") && !t.startsWith(":") && !t.startsWith("event:") && !t.startsWith("id:")) return;
        if (t.startsWith("data:")) {
          try {
            const j = JSON.parse(t.slice(5));
            chars += (j.choices?.[0]?.delta?.content || "").length;
            finish = j.choices?.[0]?.finish_reason || finish;
          } catch { /* not JSON */ }
        }
        res.write(line);
      };
      for await (const chunk of upstream.body) {
        const text = decoder.decode(chunk, { stream: true });
        if (firstBytes.length < 400) firstBytes += text.slice(0, 400 - firstBytes.length);
        buf += text;
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          forward(buf.slice(0, idx + 1));
          buf = buf.slice(idx + 1);
        }
      }
      if (buf.trim()) forward(buf + "\n");
      if (chars === 0) {
        logger.warn("Model sent no text", { search: !!search, finish, promptChars: systemPrompt.length, firstBytes });
        // e.g. "Error initializing the stream: HTTP 409" sent as plain text with status 200:
        // turn it into a real error so the app tells the user instead of showing nothing.
        res.write(`data: ${JSON.stringify({ error: { message: "The model server isn't responding right now." } })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      else if (search) logger.info("Search reply sent", { chars, finish });
      // Links only when they really help (official rules, news); none for weather or simple facts.
      if (search) {
        const sources = search.links.map((src) => ({ title: String(src.title || src.url).slice(0, 200), url: src.url }));
        res.write(`data: ${JSON.stringify({ sources, searched: true })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      if (e.name === "AbortError") return; // user pressed Stop or closed the tab
      logger.error("Proxy failure", e);
      if (!res.headersSent) res.status(502).json({ error: "The model server isn't responding right now." });
      else res.end();
    }
  }
);
