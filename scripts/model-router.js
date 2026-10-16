#!/usr/bin/env node
// scripts/model-router.js — one OpenAI-style endpoint for both fine-tuned Maple models.
// The chat function sends {"model": "maple-0.5"} or {"model": "maple-0.5-quick"}; this forwards the
// request to the matching mlx_lm.server and swaps in the local model path that server expects.
// Streaming responses are piped straight through. Started by scripts/start-maple-models.sh.
const http = require("node:http");
const PORT = Number(process.env.ROUTER_PORT || 8090);
const MODELS = {
  "maple-0.5": { port: 8081, path: "./models/maple-0.5" },
  "maple-0.5-quick": { port: 8080, path: "./models/maple-0.5-quick" },
};
const DEFAULT = "maple-0.5";

http.createServer((req, res) => {
  if (req.method === "GET" && req.url.replace(/\/+$/, "").endsWith("/models")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ object: "list", data: Object.keys(MODELS).map((id) => ({ id, object: "model" })) }));
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    let body = Buffer.concat(chunks), name = DEFAULT;
    try {
      const json = JSON.parse(body.toString() || "{}");
      if (MODELS[json.model]) name = json.model;
      json.model = MODELS[name].path;
      body = Buffer.from(JSON.stringify(json));
    } catch { /* not JSON: forward as is to the default model */ }
    const target = MODELS[name];
    const headers = { ...req.headers, host: `localhost:${target.port}`, "content-length": body.length };
    const up = http.request({ host: "127.0.0.1", port: target.port, method: req.method, path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on("error", (e) => {
      console.error(`[router] ${name} (port ${target.port}) unreachable: ${e.message}`);
      if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `${name} server is not running` }));
    });
    up.end(body);
    console.log(`[router] ${new Date().toISOString()} ${req.method} ${req.url} -> ${name}`);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`[router] listening on http://127.0.0.1:${PORT}`));
