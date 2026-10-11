// functions/search.js — Tavily web search for Maple (Articx AI)
// Weather comes from Open-Meteo (free, no key); everything else from Tavily.
// index.js calls getSearchContext() after the quota check.

const { defineSecret } = require("firebase-functions/params");

const TAVILY_API_KEY = defineSecret("TAVILY_API_KEY");

// 1. Decide if a question needs fresh info from the web
const SEARCH_WORDS = [
  // things that change often
  "today", "tonight", "yesterday", "tomorrow", "latest", "current", "currently", "right now",
  "news", "recent", "recently", "this week", "this month", "this year", "last night",
  "price", "prices", "cost", "costs", "rate", "rates", "interest rate", "exchange rate",
  "stock", "stocks", "weather", "forecast", "score", "scores", "who won", "standings",
  "election", "poll", "update", "updates", "release date", "released", "open now", "hours",
  "search", "look up", "google", "online",
  // people in roles
  "premier", "prime minister", "president", "mayor", "councillor", "councilor", "ceo", "minister",
  "leader", "who is the",
  // government & rules
  "immigration", "visa", "permit", "pr card", "permanent resident", "citizenship",
  "express entry", "ircc", "crs", "crs score", "noc", "teer", "lmia", "pgwp", "work permit", "study permit",
  "processing time", "processing times", "fee", "fees", "points", "tax", "taxes", "benefit", "benefits", "ei", "cpp", "oas", "health card",
  "driver's licence", "drivers license", "law", "rule", "rules", "deadline",
  // French
  "aujourd'hui", "hier", "demain", "actuel", "actuellement", "dernières", "nouvelles",
  "prix", "météo", "permis", "impôt", "impôts", "élection", "premier ministre",
];
const IMMIGRATION_WORDS = [
  "immigration", "visa", "permit", "pr card", "permanent resident",
  "citizenship", "express entry", "ircc", "refugee", "permis",
  "crs", "noc", "teer", "lmia", "pgwp", "work permit", "study permit",
];

// Whole-word match, so "rate" doesn't fire on "generate" or "ei" on "their".
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SEARCH_RE = new RegExp(`(^|[^\\p{L}])(${SEARCH_WORDS.map(esc).join("|")})(?=$|[^\\p{L}])`, "iu");

function needsSearch(question) {
  const q = question.toLowerCase();
  return SEARCH_RE.test(q) || /\b20\d\d\b/.test(q);
}

// What kind of question is it? Decides where to look and whether to show links.
const WEATHER_RE = /(?<![\p{L}'])(weather|wether|wheather|weathr|waether|forecast|forcast|forecst|temperature|temprature|tempature|rain|raining|rainy|raning|snow|snowing|snowng|snowy|sno|humid|humidity|météo|meteo|mété|prévisions?|previsions?|température|temperature|pluie|neige)(?![\p{L}])/iu;
const NEWS_RE = /(?<![\p{L}'])(news|headlines?|breaking|latest on|what happened|nouvelles|actualités?)(?![\p{L}])/iu;
// "Where is it snowing?", "which provinces got snow?" → look for reports, not one city's forecast.
const WHERE_RE = /(?<![\p{L}])(where|which (city|cities|province|provinces|places?|areas?|regions?)|anywhere|first snow|où|quelles? (villes?|provinces?|régions?))(?![\p{L}])/iu;
const CANADA_RE = /(?<![\p{L}])(canada|across the country|au canada|partout)(?![\p{L}])/iu;
function kindOf(question) {
  const q = question.toLowerCase();
  if (WEATHER_RE.test(q) && (WHERE_RE.test(q) || CANADA_RE.test(q))) return "scan";
  if (WEATHER_RE.test(q)) return "weather";
  if (IMMIGRATION_WORDS.some((w) => q.includes(w)) || OFFICIAL_RE.test(q)) return "official";
  if (NEWS_RE.test(q)) return "news";
  return "general";
}
// Topics where an official link really helps the user (rules, forms, deadlines).
const OFFICIAL_RE = /(?<![\p{L}'])(tax|taxes|impôts?|benefits?|ei|cpp|oas|ccb|gst|hst|health card|ohip|driver'?s? licen[cs]e|permis de conduire|law|laws|legal|loi|deadline|application|apply|form|passport|passeport|sin)(?![\p{L}])/iu;

// 2a. Weather: live data from Open-Meteo (free, no key), so Maple can say the actual numbers.
const WMO = {
  0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "freezing fog",
  51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 56: "freezing drizzle", 57: "freezing drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain", 66: "freezing rain", 67: "freezing rain",
  71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
  80: "light showers", 81: "showers", 82: "heavy showers", 85: "snow showers", 86: "heavy snow showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail",
};
const WHEN_WORDS = /\b(today|todya|tody|tonight|tomorrow|tomorow|tommorow|tmrw|tmr|now|rn|right now|this (week|weekend|morning|afternoon|evening)|currently|aujourd'hui|demain|ce soir|maintenant|cette semaine|en ce moment)\b.*$/iu;

function placeFrom(question) {
  const q = question.replace(/[?!]/g, " ").replace(/\.(\s|$)/g, " ").replace(/\s+/g, " ").trim();
  let m = q.match(/(?:^|\s)(?:in|at|for|near|à|a|au|aux|en|pour)\s+([\p{L}][\p{L} .,'&-]{1,60})/iu)
    || q.match(/^([\p{L}][\p{L} .'-]{1,40}?)\s+(?:weather|forecast|météo)\b/iu);
  if (!m) return null;
  const place = m[1].replace(WHEN_WORDS, "").replace(/\b(weather|wether|whether|wheather|forecast|forcast|météo|meteo|like|today|todya)\b/giu, "").trim();
  return place.length >= 2 ? place : null;
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return res.json();
}

// Turns Open-Meteo's current + daily data into the text Maple reads.
// (Also used by scripts/build-maple-quick.js, so training matches production.)
function formatWeather(label, c, d) {
  const days = d.time.map((t, i) =>
    `- ${i === 0 ? "Today" : i === 1 ? "Tomorrow" : t} (${t}): ${WMO[d.weather_code[i]] || "mixed"}, high ${Math.round(d.temperature_2m_max[i])}°C, low ${Math.round(d.temperature_2m_min[i])}°C, ` +
    `chance of precipitation ${d.precipitation_probability_max[i] ?? "?"}%, precipitation ${d.precipitation_sum[i]} mm, UV index ${d.uv_index_max[i]}`
  ).join("\n");
  return `Live weather for ${label} (local time ${c.time}):\n` +
    `- Now: ${WMO[c.weather_code] || "mixed"}, ${Math.round(c.temperature_2m)}°C (feels like ${Math.round(c.apparent_temperature)}°C), ` +
    `humidity ${c.relative_humidity_2m}%, wind ${Math.round(c.wind_speed_10m)} km/h (gusts ${Math.round(c.wind_gusts_10m)} km/h), precipitation ${c.precipitation} mm\n` +
    days;
}

// "Toronto and Quebec" / "Montréal et Laval" / "Ottawa, Calgary" → up to 3 places.
function placesFrom(question) {
  const one = placeFrom(question);
  if (!one) return [];
  return one.split(/\s*(?:,|\band\b|\bet\b|&|\bor\b|\bou\b)\s*/iu).map((p) => p.trim()).filter((p) => p.length >= 2).slice(0, 3);
}

async function weatherSearch(question) {
  const names = placesFrom(question);
  const found = (await Promise.all((names.length ? names : ["Toronto"]).map((n) => weatherFor(n).catch(() => null)))).filter(Boolean);
  if (!found.length) return null;
  return {
    data: found.map((f) => f.data).join("\n\n"),
    sources: found.flatMap((f) => f.sources),
    guessedPlace: !names.length,
  };
}

// Misspelled Canadian city → closest known name ("Torono" → "Toronto"), at most 2 letters off.
const KNOWN_CITIES = ["Toronto", "Montreal", "Montréal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec", "Québec",
  "Hamilton", "Kitchener", "London", "Halifax", "Victoria", "Saskatoon", "Regina", "Mississauga", "Brampton", "Surrey", "Laval",
  "Gatineau", "Markham", "Vaughan", "Oshawa", "Windsor", "Sherbrooke", "Saguenay", "Kelowna", "Barrie", "Guelph", "Kingston",
  "Moncton", "Fredericton", "Charlottetown", "St. John's", "Whitehorse", "Yellowknife", "Iqaluit", "Thunder Bay", "Sudbury",
  "Lethbridge", "Red Deer", "Nanaimo", "Kamloops", "Banff", "Jasper", "Niagara Falls", "Waterloo", "Burlington", "Oakville"];
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function closestCity(name) {
  const n = name.toLowerCase();
  let best = null, bestD = 3;
  for (const c of KNOWN_CITIES) { const dist = editDistance(n, c.toLowerCase()); if (dist < bestD) { best = c; bestD = dist; } }
  return best && best.toLowerCase() !== n && (n.length >= 5 || bestD === 1) ? best : null;
}

async function weatherFor(name) {
  const geo = async (q, extra) => (await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(q)}${extra}`)).results?.[0];
  const fixed = closestCity(name);
  const place = (await geo(name, "&countryCode=CA")) || (fixed && (await geo(fixed, "&countryCode=CA"))) || (await geo(name, ""));
  if (!place) return null;
  const w = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max" +
    "&timezone=auto&forecast_days=3"
  );
  const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  const data = formatWeather(label, w.current, w.daily);
  return {
    data,
    sources: [{ title: `Forecast for ${place.name}`, url: `https://weather.gc.ca/en/location/index.html?coords=${place.latitude.toFixed(3)},${place.longitude.toFixed(3)}` }],
  };
}

// 2a'. "Where is it snowing in Canada?": current conditions in major cities, one Open-Meteo request.
const SCAN_CITIES = [
  ["Victoria, BC", 48.43, -123.37], ["Vancouver, BC", 49.28, -123.12], ["Kelowna, BC", 49.89, -119.5], ["Prince George, BC", 53.92, -122.75],
  ["Whitehorse, YT", 60.72, -135.06], ["Yellowknife, NT", 62.45, -114.37], ["Iqaluit, NU", 63.75, -68.52],
  ["Calgary, AB", 51.05, -114.07], ["Banff, AB", 51.18, -115.57], ["Edmonton, AB", 53.55, -113.49], ["Fort McMurray, AB", 56.73, -111.38],
  ["Saskatoon, SK", 52.13, -106.67], ["Regina, SK", 50.45, -104.61], ["Winnipeg, MB", 49.9, -97.14],
  ["Thunder Bay, ON", 48.38, -89.25], ["Sudbury, ON", 46.49, -80.99], ["Toronto, ON", 43.65, -79.38], ["Ottawa, ON", 45.42, -75.7],
  ["Montreal, QC", 45.5, -73.57], ["Québec City, QC", 46.81, -71.21], ["Saguenay, QC", 48.43, -71.07],
  ["Fredericton, NB", 45.96, -66.64], ["Moncton, NB", 46.09, -64.78], ["Halifax, NS", 44.65, -63.57],
  ["Charlottetown, PE", 46.24, -63.13], ["St. John's, NL", 47.56, -52.71],
];
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

async function scanCanada() {
  const lat = SCAN_CITIES.map((c) => c[1]).join(","), lon = SCAN_CITIES.map((c) => c[2]).join(",");
  const rows = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,weather_code,precipitation,snowfall&timezone=auto"
  );
  const list = Array.isArray(rows) ? rows : [rows];
  const lines = list.map((r, i) => {
    const c = r.current, name = SCAN_CITIES[i][0];
    return { name, code: c.weather_code, text: `${name}: ${WMO[c.weather_code] || "mixed"}, ${Math.round(c.temperature_2m)}°C` };
  });
  const snow = lines.filter((l) => SNOW_CODES.has(l.code));
  const rain = lines.filter((l) => RAIN_CODES.has(l.code));
  const data =
    `Current conditions across Canada (${list.length} major cities, checked just now):\n` +
    `- Snowing now: ${snow.length ? snow.map((l) => l.text).join("; ") : "none of these cities"}\n` +
    `- Rain or drizzle now: ${rain.length ? rain.map((l) => l.text).join("; ") : "none of these cities"}\n` +
    `- All cities:\n${lines.map((l) => `  ${l.text}`).join("\n")}\n` +
    "Note: only these cities were checked; smaller towns and mountain areas may differ.";
  return { data, sources: [] };
}

// 2b. Everything else: Tavily, with its own short summary of the results.
async function tavilySearch(question, kind) {
  const body = {
    query: question.slice(0, 400), // Tavily rejects very long queries
    search_depth: "basic",
    max_results: 5,
    include_answer: "advanced",
  };
  if (kind === "news") { body.topic = "news"; body.time_range = "week"; }
  if (kind === "official" && IMMIGRATION_WORDS.some((w) => question.toLowerCase().includes(w))) {
    body.include_domains = ["canada.ca"];
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_API_KEY.value()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Tavily error ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  const sources = (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: (r.content || "").slice(0, 1200),
  }));
  const text =
    (data.answer ? `Search summary: ${data.answer}\n\n` : "") +
    sources.map((s, i) => `Result ${i + 1}: ${s.title} (${s.url})\n${s.snippet}`).join("\n\n");
  return { data: text, sources, hasAnswer: !!data.answer };
}

// Links worth showing under the answer: official sites first, at most 2.
function pickLinks(sources, kind) {
  if (kind !== "official" && kind !== "news") return [];
  const official = /(\.gc\.ca|canada\.ca|\.gov\.[a-z]{2}\.ca|ontario\.ca|quebec\.ca|gov\.bc\.ca|alberta\.ca|\.gouv\.qc\.ca)$/i;
  const host = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
  const ranked = kind === "official"
    ? [...sources.filter((s) => official.test(host(s.url))), ...sources.filter((s) => !official.test(host(s.url)))]
    : sources;
  return ranked.slice(0, 2).map(({ title, url }) => ({ title, url }));
}

// 3. The prompt Maple gets with the results
function buildSearchPrompt(kind, data, links, guessedPlace, now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Toronto", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const rules = [
    `Today is ${today}.`,
    "Below is LIVE information fetched just now for the user's question. Read it and ANSWER THE QUESTION DIRECTLY with the actual facts (numbers, names, dates).",
    "Do not tell the user to visit or check websites to find the answer. Do not list links or URLs in your reply; the app adds any useful links itself.",
    "Do not mention 'search results', 'sources' or result numbers. Just answer naturally, as if you know it.",
    "Use only the information below for current facts. If it doesn't answer the question, say briefly what you found and that you couldn't confirm the rest. Never invent names, numbers, dates or rules.",
    "Keep it short and friendly. Reply in the user's language, with Canadian spelling.",
  ];
  if (kind === "weather") {
    rules.push("If there is weather for more than one place, answer for each place in its own short line.");
    rules.push("For weather: give the current temperature and conditions first, then today's high/low and chance of rain or snow, plus one short practical tip (e.g. bring an umbrella or a jacket). Use °C.");
    if (guessedPlace) rules.push("The user didn't name a city, so this is the weather for Toronto; say so in a few words and invite them to name their city.");
  }
  if (kind === "scan") rules.push("The user asked where in Canada it's snowing, raining, etc. Name the cities from the list where that's happening right now, with conditions and temperature. If none of the checked cities match, say so and mention the closest (e.g. coldest) ones. Mention briefly that this covers major cities only.");
  if (kind === "official") rules.push("This is an immigration, legal, tax, health or government topic: after the answer, add one short line telling the user to confirm on the official site linked below or with a licensed professional.");
  if (links.length && kind === "news") rules.push("Summarize the main points in a few sentences.");
  return `${rules.join("\n")}\n\nLIVE INFORMATION:\n${data}`;
}

// Safe wrapper: if search fails, Maple still answers normally.
// Returns { prompt, links, kind } or null. links = what the app shows under the answer (often none).
// Questions about us are answered from COMPANY_FACTS (functions/prompts.js), never from the web.
const ABOUT_US_RE = /(?<![\p{L}])(articx|articxai|ar?ticx|maple|ailix|janas|visvanathan)(?![\p{L}])/iu;

async function getSearchContext(question) {
  if (ABOUT_US_RE.test(question) && !WEATHER_RE.test(question)) return null;
  if (!needsSearch(question) && !WEATHER_RE.test(question)) return null;
  let kind = kindOf(question);
  try {
    let found = null;
    if (kind === "weather") {
      try { found = await weatherSearch(question); } catch (err) { console.error("Weather lookup failed:", err.message); }
    }
    if (kind === "scan") {
      try { found = await scanCanada(); } catch (err) { console.error("Canada weather scan failed:", err.message); }
      if (!found) kind = "news";
    }
    // Weather asked without a city we could find, e.g. "snowing in canada": search reports instead.
    if (!found && kind === "weather" && placesFrom(question).length) kind = "news";
    if (!found) {
      if (!TAVILY_API_KEY.value()) {
        console.error("Search skipped: TAVILY_API_KEY secret is empty or not set");
        return null;
      }
      found = await tavilySearch(question, kind);
      if (!found.sources.length && !found.hasAnswer) return null;
    }
    const links = kind === "weather" || kind === "scan" ? [] : pickLinks(found.sources, kind);
    if (kind === "news" && WEATHER_RE.test(question)) links.length = 0; // weather reports: just answer
    return { kind, links, sources: found.sources, prompt: buildSearchPrompt(kind, found.data, links, found.guessedPlace) };
  } catch (err) {
    console.error("Search failed:", err.message); // never log the API key
    return null;
  }
}

module.exports = { TAVILY_API_KEY, getSearchContext, buildSearchPrompt, formatWeather, WMO };
