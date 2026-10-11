// Streams a reply from the chat Cloud Function (or a local model server in dev).
// Both speak OpenAI-compatible server-sent events.
import { CONFIG } from "../config";

export class ModelError extends Error {
  constructor(kind, status = 0, detail = "", code = "") {
    super(detail || kind);
    this.kind = kind; this.status = status; this.detail = detail; this.code = code;
  }
}

export async function streamCompletion({ history, model, backend, cloudUrl, getToken, onToken, onSources, signal }) {
  let url, body;
  const headers = { "Content-Type": "application/json" };
  if (backend === "cloud") {
    url = cloudUrl;
    headers.Authorization = `Bearer ${await getToken()}`;
    body = { messages: history, model };
  } else {
    const b = CONFIG.local[backend];
    url = b.url;
    const style = CONFIG.models.find((m) => m.id === model)?.style;
    const system = style ? `${CONFIG.systemPrompt} ${style}` : CONFIG.systemPrompt;
    body = { model: b.model, stream: true, temperature: 0.7, messages: [{ role: "system", content: system }, ...history] };
  }
  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal, credentials: "omit" });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ModelError("network");
  }
  if (!res.ok) {
    let detail = "", code = "";
    try { const j = await res.json(); detail = j?.error?.message || j?.error || ""; code = typeof j?.code === "string" ? j.code : ""; } catch { /* not JSON */ }
    throw new ModelError("http", res.status, typeof detail === "string" ? detail : "", code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let json;
      try { json = JSON.parse(data); } catch { continue; }
      if (json.error) throw new ModelError("stream", 0, json.error.message || String(json.error));
      if (Array.isArray(json.sources)) { onSources?.(json.sources, !!json.searched); continue; }
      const tok = json.choices?.[0]?.delta?.content;
      if (typeof tok === "string" && tok) onToken(tok);
    }
  }
}

// Visitor-facing text for a failed reply, in the current language (s = language strings).
export function friendlyError(e, backend, s) {
  const t = s.chat.errors;
  if (!(e instanceof ModelError)) return t.generic;
  if (e.kind === "auth") return e.detail || t.guestUnavailable;
  if (e.kind === "network") {
    // Development only (npm run dev with a local model server).
    if (backend === "ollama") return "Couldn't reach Ollama at localhost:11434. Make sure the Ollama app is running and OLLAMA_ORIGINS allows this page.";
    if (backend === "mlx") return "Couldn't reach the MLX server at localhost:8080. Start it with: mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080";
    return t.network;
  }
  if (e.kind === "stream") return t.down;
  if (e.status === 401) return t.session;
  if (e.status === 403) return t.setup;
  if (e.status === 429) return e.code === "week_limit" ? t.weekly : e.code === "month_limit" ? t.monthly : t.daily;
  if (e.status === 400 || e.status === 413) return t.tooLong;
  if (e.status >= 500) return t.down;
  return t.other(e.status || e.kind);
}
