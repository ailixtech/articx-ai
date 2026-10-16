/**
 * GET /api/starters?lang=en|fr&prov=ON — the 5 suggestion chips under the chat box.
 *   1 weather chip for the user's main city (live weather works well)
 *   2 trending chips: this week's top news in their province (Tavily, cached once a day per province+language)
 *   2 popular chips: what Maple users ask about most this week (functions/topics.js counts), worded for the province
 * Province comes from the browser's time zone (no location permission, no IP lookup). Unknown → Canada-wide.
 * Every chip is { label, prompt }: label is what's shown, prompt is what gets sent (worded so live search runs).
 * Never fails: on any error the client keeps its fixed chips.
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore } = require("firebase-admin/firestore");
const { TAVILY_API_KEY, tavilySearch } = require("./search");
const { weekOf } = require("./topics");

const PROV = { // en name · French "in …" form · French name · main city
  ON: ["Ontario", "en Ontario", "Ontario", "Toronto"], QC: ["Quebec", "au Québec", "Québec", "Montréal"],
  BC: ["British Columbia", "en Colombie-Britannique", "Colombie-Britannique", "Vancouver"], AB: ["Alberta", "en Alberta", "Alberta", "Calgary"],
  MB: ["Manitoba", "au Manitoba", "Manitoba", "Winnipeg"], SK: ["Saskatchewan", "en Saskatchewan", "Saskatchewan", "Regina"],
  NS: ["Nova Scotia", "en Nouvelle-Écosse", "Nouvelle-Écosse", "Halifax"], NB: ["New Brunswick", "au Nouveau-Brunswick", "Nouveau-Brunswick", "Moncton"],
  NL: ["Newfoundland and Labrador", "à Terre-Neuve-et-Labrador", "Terre-Neuve-et-Labrador", "St. John's"], PE: ["PEI", "à l'Île-du-Prince-Édouard", "Île-du-Prince-Édouard", "Charlottetown"],
  YT: ["Yukon", "au Yukon", "Yukon", "Whitehorse"], NT: ["the Northwest Territories", "aux Territoires du Nord-Ouest", "Territoires du Nord-Ouest", "Yellowknife"],
  NU: ["Nunavut", "au Nunavut", "Nunavut", "Iqaluit"], CA: ["Canada", "au Canada", "Canada", "Toronto"],
};
// Province-aware wording for each topic id in functions/topics.js. {p} = province, {c} = city.
const TOPIC_CHIPS = {
  en: {
    taxes: "How do I file my taxes in {p}?", money: "Compare a TFSA and an RRSP",
    housing: "What are my rights as a tenant in {p}?", work: "What's the minimum wage in {p} right now?",
    newcomers: "First steps for a newcomer in {p}", health: "How do I find a family doctor in {p}?",
    travel: "Fun things to do in {c} this weekend", learning: "Explain how interest rates work",
  },
  fr: {
    taxes: "Comment faire mes impôts {p}?", money: "Comparer un CELI et un REER",
    housing: "Quels sont mes droits de locataire {p}?", work: "Quel est le salaire minimum {p} actuellement?",
    newcomers: "Premières démarches pour un nouvel arrivant {p}", health: "Comment trouver un médecin de famille {p}?",
    travel: "Quoi faire à {c} cette fin de semaine?", learning: "Explique-moi les taux d'intérêt",
  },
};
// When there isn't enough usage data yet: what Canadians tend to need at this time of year.
function seasonal(month) {
  if (month <= 3) return ["taxes", "money", "health", "housing"];       // Jan–Apr: tax season, RRSP deadline
  if (month <= 7) return ["travel", "work", "housing", "newcomers"];    // May–Aug: summer, jobs, moving
  if (month <= 9) return ["housing", "work", "newcomers", "money"];     // Sep–Oct: back to school, leases
  return ["health", "money", "housing", "travel"];                      // Nov–Dec: winter, holidays
}
const fill = (s, P, lang) => s.replace("{p}", lang === "fr" ? P[1] : P[0]).replace("{c}", P[3]);
// News titles → short, calm chips. Skip violent/sad stories on the homepage.
const SKIP = /\b(killed|dead|death|dies|died|murder|shooting|shot|stabb|homicide|assault|sexual|crash|fatal|obituar|tué|mort|meurtre|fusillade|décès)\b/i;
function cleanTitle(title) {
  let t = String(title || "").replace(/\s+/g, " ").trim();
  t = t.replace(/\s+[|–—-]\s+[^|–—-]{2,32}$/, "");            // " - CBC News", " | CTV News"
  t = t.replace(/^["'“”]+|["'“”]+$/g, "").replace(/^(live|watch|video|opinion|analysis)\s*[:|]\s*/i, "");
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, "") + "…";
  return t;
}

async function trending(prov, lang, today) {
  const db = getFirestore();
  const ref = db.doc(`stats/starters_${today}_${prov}_${lang}`);
  const snap = await ref.get();
  if (snap.exists) return snap.get("news") || [];
  if (!TAVILY_API_KEY.value()) return [];
  const P = PROV[prov];
  const q = lang === "fr" ? `actualités ${P[2]} aujourd'hui` : `top news ${P[0]} today`;
  const found = await tavilySearch(q, "news");
  const seen = new Set();
  const news = [];
  for (const s of found.sources) {
    const label = cleanTitle(s.title);
    const key = label.toLowerCase().slice(0, 25);
    if (label.length < 15 || SKIP.test(s.title) || seen.has(key)) continue;
    seen.add(key);
    const plain = label.replace(/…$/, "");
    news.push({ kind: "trending", label, prompt: lang === "fr" ? `Quoi de neuf sur : ${plain}?` : `What's the latest news on ${plain}?` });
    if (news.length === 3) break;
  }
  await ref.set({ news, createdAt: new Date() });
  return news;
}

async function popular(prov, lang, now) {
  const P = PROV[prov];
  let ids = [];
  try {
    const db = getFirestore();
    const [a, b] = await db.getAll(db.doc(`stats/topics_${weekOf(now)}`), db.doc(`stats/topics_${weekOf(new Date(now - 7 * 864e5))}`));
    const total = (a.get("total") || 0) + 0.5 * (b.get("total") || 0);
    if (total >= 30) {
      ids = Object.keys(TOPIC_CHIPS.en).map((id) => [id, (a.get(id) || 0) + 0.5 * (b.get(id) || 0)])
        .filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).map(([id]) => id);
    }
  } catch (e) { logger.warn("Starter topics failed", e); }
  const month = Number(now.toLocaleString("en-CA", { timeZone: "America/Toronto", month: "numeric" })) - 1;
  ids = [...new Set([...ids, ...seasonal(month)])].filter((id) => id !== "travel" || prov !== "CA");
  return ids.slice(0, 3).map((id) => {
    const text = fill(TOPIC_CHIPS[lang][id], P, lang);
    return { kind: "popular", label: text, prompt: text };
  });
}

const starters = onRequest(
  { region: "northamerica-northeast2", memory: "256MiB", maxInstances: 5, invoker: "public", secrets: [TAVILY_API_KEY] },
  async (req, res) => {
    if (req.method !== "GET") return res.status(405).json({ error: "Use GET." });
    const lang = req.query.lang === "fr" ? "fr" : "en";
    const prov = PROV[String(req.query.prov || "").toUpperCase()] ? String(req.query.prov).toUpperCase() : "CA";
    const now = new Date();
    const today = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
    const P = PROV[prov];
    const weather = prov === "CA"
      ? { kind: "weather", label: lang === "fr" ? "Où neige-t-il au Canada?" : "Where is it snowing in Canada?",
          prompt: lang === "fr" ? "Où neige-t-il au Canada en ce moment?" : "Where is it snowing in Canada right now?" }
      : { kind: "weather",
          label: lang === "fr" ? `Météo à ${P[3]} cette fin de semaine` : `Weather in ${P[3]} this weekend`,
          prompt: lang === "fr" ? `Quelle météo à ${P[3]} cette fin de semaine?` : `What's the weather in ${P[3]} this weekend?` };
    let news = [];
    try { news = await trending(prov, lang, today); } catch (e) { logger.warn("Starter news failed", { prov, lang, err: e.message }); }
    const pop = await popular(prov, lang, now);
    // weather, 2 trending, then popular to fill up to 5 (more popular ones if news is missing)
    // Drop a popular chip that repeats a trending one (e.g. both about the minimum wage).
    const words = (t) => new Set(t.toLowerCase().match(/\p{L}{5,}/gu) || []);
    const newsWords = news.slice(0, 2).map((n) => words(n.label));
    const fresh = pop.filter((c) => !newsWords.some((w) => [...words(c.label)].filter((x) => w.has(x)).length >= 2));
    const chips = [weather, ...news.slice(0, 2), ...fresh, ...pop.filter((c) => !fresh.includes(c))].slice(0, 5);
    res.set("Cache-Control", "public, max-age=900, s-maxage=1800");
    return res.json({ prov, lang, date: today, chips });
  }
);

module.exports = { starters, cleanTitle, PROV };
