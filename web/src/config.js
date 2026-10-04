// ARTICxAI client configuration. No secrets belong in this file: it ships to the browser.
export const CONFIG = {
  // Cloud Functions region (chat proxy and the account functions).
  functionRegion: "northamerica-northeast2",
  // Leave null to use https://<region>-<projectId>.cloudfunctions.net/chat automatically.
  cloudChatUrl: null,

  // Local model servers, offered only in development (npm run dev on localhost).
  // Production builds, including the local Hosting preview, always use the Cloud Function.
  // Both speak the OpenAI-compatible /v1/chat/completions API.
  local: {
    ollama: { label: "Ollama", url: "http://localhost:11434/v1/chat/completions", model: "qwen2.5:7b" },
    mlx: { label: "MLX", url: "http://localhost:8080/v1/chat/completions", model: "mlx-community/Qwen2.5-7B-Instruct-4bit" },
  },

  // Maple models shown in the picker (descriptions live in src/i18n). The server (functions/index.js MODELS) decides
  // what each one does and blocks accountsOnly models for guests.
  models: [
    { id: "maple-0.5", name: "Maple 0.5" },
    {
      id: "maple-q1", name: "Maple Q1", accountsOnly: true,
      // Used only with local model servers in development; the server has its own copy.
      style: "Answer as briefly and precisely as possible: lead with the answer, use at most a few short sentences or a short list, and skip greetings, filler and repetition.",
    },
  ],
  defaultModel: "maple-0.5",

  // Free messages a guest can send before being asked to sign up. Display only:
  // the Cloud Function enforces GUEST_MESSAGE_LIMIT, so keep the two in step.
  guestMessageLimit: 3,
  // Free messages per account: per UTC day, Monday-to-Sunday week and calendar month.
  // Display only: the chat function enforces them, so keep these in step with
  // DAILY_MESSAGE_LIMIT, WEEKLY_MESSAGE_LIMIT and MONTHLY_MESSAGE_LIMIT in functions/.env.
  limits: { day: 200, week: 1000, month: 3000 },

  // Paid plans and the add-on shown in Settings (names and perks live in src/i18n).
  // Draft prices in CAD. Nothing is charged yet: the buttons record "Notify me" interest.
  plans: [
    { id: "plus", price: 3.99, limits: { day: 500, week: 2500, month: 8000 } },
    { id: "pro", price: 5.99, limits: { day: 1000, week: 5000, month: 15000 } },
  ],
  addon: { id: "pack", price: 0.99, messages: 100 },

  // Longest single message, pasted text included. Keep in step with MAX_CHARS_PER_MESSAGE
  // in functions/index.js and the message size check in firestore.rules.
  maxMessageChars: 100000,

  // How many previous messages are sent with each request.
  maxHistoryMessages: 20,

  // Used for LOCAL testing only. In production the Cloud Function adds its own
  // copy (functions/index.js) and ignores anything the browser sends.
  systemPrompt: [
    "You are Maple, the AI assistant of ARTICxAI, made in Canada by AILIX.",
    "You do not have internet access, live data, or the ability to search the web.",
    "Your knowledge comes from training data that stops at a cutoff date and may be outdated.",
    "If asked about news, current events, today's date, prices, scores, weather, elections, or anything that may have changed recently, say plainly that you can't check live information and suggest a reliable current source. Never present recent events as confirmed fact.",
    "Never invent URLs, citations, quotes, statistics, or sources. If you don't know a source, say so. Only mention well-known homepages (e.g. canada.ca) when you are certain they exist.",
    "If asked what model you are built on, say you are built on an open-source base model adapted by AILIX.",
    "Be helpful, clear and concise. Reply in the language the user writes in: Canadian English (with Canadian spelling) or French.",
  ].join(" "),
};

export const IS_LOCAL = import.meta.env.DEV && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
