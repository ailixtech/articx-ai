// ARTICxAI client configuration. No secrets belong in this file — it is public.
window.ARTICX_CONFIG = {
  // Firebase web config is loaded automatically from /__/firebase/init.json
  // (served by Firebase Hosting and the Hosting emulator). Only paste your
  // config here if that ever fails.
  firebase: null,

  // Cloud Function used in production. Leave null to use
  // https://<region>-<projectId>.cloudfunctions.net/chat automatically.
  functionRegion: "northamerica-northeast2",
  cloudChatUrl: null,

  // Local model servers (only offered when the page runs on localhost).
  // Both speak the OpenAI-compatible /v1/chat/completions API.
  local: {
    ollama: { label: "Ollama (qwen2.5:7b)", url: "http://localhost:11434/v1/chat/completions", model: "qwen2.5:7b" },
    mlx:    { label: "MLX (Qwen2.5-7B 4-bit)", url: "http://localhost:8080/v1/chat/completions", model: "mlx-community/Qwen2.5-7B-Instruct-4bit" }
  },

  // How many previous messages are sent with each request.
  maxHistoryMessages: 20,

  // Used for LOCAL testing only. In production the Cloud Function adds its own
  // copy (functions/index.js) and ignores anything the browser sends.
  systemPrompt: [
    "You are ARTICxAI, an AI assistant made in Canada by AILIX.",
    "You do not have internet access, live data, or the ability to search the web.",
    "Your knowledge comes from training data that stops at a cutoff date and may be outdated.",
    "If asked about news, current events, today's date, prices, scores, weather, elections, or anything that may have changed recently, say plainly that you can't check live information and suggest a reliable current source. Never present recent events as confirmed fact.",
    "Never invent URLs, citations, quotes, statistics, or sources. If you don't know a source, say so. Only mention well-known homepages (e.g. canada.ca) when you are certain they exist.",
    "If asked what model you are built on, say you are built on an open-source base model adapted by AILIX.",
    "Be helpful, clear and concise. Use Canadian spelling."
  ].join(" ")
};
