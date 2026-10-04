/**
 * Weekly topic counts for the homepage's use-case cards.
 *
 * The chat function tags each message with one fixed topic (by keyword, English and French)
 * and adds 1 to that week's total. No text, account or IP is stored: only
 * stats/topics_<week> = { money: 12, housing: 9, ..., total: 40 }.
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Order breaks ties. "learning" is a catch-all and only wins when nothing else matches.
// Keep the ids in step with home.useCases.items in web/src/i18n.
const TOPICS = {
  taxes: /\b(tax(es)?|cra|t4|t4a|gst|hst|pst|qst|notice of assessment|tax return|deduction|tax credit|impots?|arc|revenu quebec|tps|tvq|tvh|declaration de revenus|avis de cotisation|credit d'impot)\b/g,
  money: /\b(tfsa|rrsp|fhsa|resp|rrif|celi|celiapp|reer|reee|budget|savings?|save money|invest(ing|ment)?|etf|stocks?|debt|credit card|loan|credit score|pension|cpp|oas|epargnes?|placements?|dettes?|prets?|carte de credit|retraite|rrq)\b/g,
  housing: /\b(rent(ing|al)?|landlord|tenants?|lease|mortgage|condo|apartment|eviction|roommate|home ?buyer|down payment|ltb|loyer|proprietaire|locataires?|bail|hypotheque|logement|appartement|tal|expulsion|mise de fonds)\b/g,
  work: /\b(resume|cv|cover letter|interview|job|jobs|salary|employer|boss|coworker|raise|promotion|layoff|ei|employment insurance|linkedin|emploi|entrevue|salaire|employeur|lettre de presentation|assurance-emploi|mise a pied)\b/g,
  newcomers: /\b(express entry|crs|ircc|pr card|permanent resident(ce)?|citizenship|immigra(tion|nt|te)|study permit|work permit|pgwp|sin|newcomers?|refugee|entree express|residence permanente|citoyennete|permis d'etudes|permis de travail|nas|nouvel(les?)? arrivants?|refugie)\b/g,
  health: /\b(doctor|family doctor|walk-in|clinic|ohip|ramq|msp|health card|prescription|pharmac(y|ist)|dentist|dental|symptoms?|hospital|mental health|medecin|clinique|carte sante|ordonnance|pharmacie|dentiste|dentaire|hopital|sante mentale)\b/g,
  travel: /\b(trip|travel(l?ing)?|itinerary|flights?|vacation|road trip|hotel|passport|nexus|visit(ing)?|weekend|getaway|day trip|things to do|(one|two|three|four|five|a few|\d+) days in|voyager?|fin de semaine|escapade|jours a|itineraire|vols?|vacances|hotel|passeport|visiter)\b/g,
  learning: /\b(explain|how does|what is|homework|math|essay|study|learn|course|teach|explique|devoirs?|apprendre|cours|comment fonctionne|qu'est-ce que)\b/g,
};
const IDS = Object.keys(TOPICS);
const MIN_TOTAL = 30; // below this the ranking is noise; the homepage keeps its default order

function classify(text) {
  const t = String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 4000);
  let best = null;
  let bestScore = 0;
  for (const id of IDS) {
    if (id === "learning" && best) break;
    const score = (t.match(TOPICS[id]) || []).length;
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

// Monday (UTC) of the week containing d, as YYYY-MM-DD.
function weekOf(d) {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
  return m.toISOString().slice(0, 10);
}

// Adds the message's topic to this week's counts. Never throws: counting must not break chat.
async function countTopic(text) {
  const id = classify(text);
  if (!id) return;
  try {
    await getFirestore().doc(`stats/topics_${weekOf(new Date())}`)
      .set({ [id]: FieldValue.increment(1), total: FieldValue.increment(1) }, { merge: true });
  } catch (e) {
    logger.warn("Topic count failed", e);
  }
}

// GET /api/topics (Hosting rewrite): topic ids, most asked first. This week counts fully,
// last week at half weight, so the list doesn't empty out every Monday.
const topics = onRequest(
  { region: "northamerica-northeast2", memory: "256MiB", maxInstances: 3, invoker: "public" },
  async (req, res) => {
    if (req.method !== "GET") return res.status(405).json({ error: "Use GET." });
    const now = new Date();
    const last = new Date(now.getTime() - 7 * 864e5);
    try {
      const db = getFirestore();
      const [a, b] = await db.getAll(db.doc(`stats/topics_${weekOf(now)}`), db.doc(`stats/topics_${weekOf(last)}`));
      const score = (id) => (a.get(id) || 0) + 0.5 * (b.get(id) || 0);
      const total = (a.get("total") || 0) + 0.5 * (b.get("total") || 0);
      const ranked = total >= MIN_TOTAL ? IDS.filter((id) => score(id) > 0).sort((x, y) => score(y) - score(x)) : [];
      res.set("Cache-Control", "public, max-age=600, s-maxage=1800");
      return res.json({ live: ranked.length > 0, ranked, week: weekOf(now) });
    } catch (e) {
      logger.error("Topic ranking failed", e);
      res.set("Cache-Control", "no-store");
      return res.json({ live: false, ranked: [] });
    }
  }
);

module.exports = { classify, countTopic, weekOf, topics };
