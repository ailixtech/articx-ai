/**
 * functions/cors.js — lets the company site on articx.com (hosted at WHC, not Firebase) call the
 * waitlist, topics and starters functions through https://articx-ai.web.app/api/*.
 * Pages on Firebase Hosting call them on the same origin and don't need this.
 */
const SITE_ORIGINS = new Set([
  "https://articx.com", "https://www.articx.com",
  "https://articxai.com", "https://www.articxai.com",
]);
// Sets CORS headers for allowed origins. Returns true when the request was a preflight (already answered).
function cors(req, res, methods = "GET, POST, OPTIONS") {
  const origin = req.get("origin") || "";
  if (SITE_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", methods);
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
  }
  if (req.method === "OPTIONS") { res.status(SITE_ORIGINS.has(origin) ? 204 : 403).end(); return true; }
  return false;
}
module.exports = { cors, SITE_ORIGINS };
