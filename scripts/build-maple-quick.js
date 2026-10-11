#!/usr/bin/env node
// scripts/build-maple-quick.js — builds the training set for Maple 0.5 Quick.
//
//   node scripts/build-maple-quick.js
//
// Writes data/maple-quick/{train,valid,test}.jsonl in the chat format mlx_lm.lora reads
// ({"messages":[{role,content},...]}). Every example uses the exact system prompts the
// chat function sends in production (functions/prompts.js + functions/search.js), so the
// model learns the behaviour it needs live:
//   - who Maple is (AILIX, Canada), in English and French, with Canadian spelling
//   - quick answers: the answer first, short, no filler
//   - with live data (weather, search): answer directly from it, no links, no "visit this site"
//   - without live data: say it can't confirm the latest, never invent facts or links
// Numbers in live-data examples are random on purpose, so the model learns to READ them
// from the prompt instead of memorizing them. Same seed = same files.

const fs = require("node:fs");
const path = require("node:path");
const { SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT, STYLES } = require("../functions/prompts");
const { buildSearchPrompt, formatWeather } = require("../functions/search");

const OUT = path.join(__dirname, "..", "data", "maple-quick");
const STYLE = STYLES["maple-0.5-quick"];

// ---------- small helpers ----------
let seed = 20261009;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const fix = (n, d = 2) => Number(n.toFixed(d));

const plainSystem = () => `${SYSTEM_PROMPT} ${STYLE}`;
const searchSystem = (prompt) => `${SEARCH_SYSTEM_PROMPT} ${STYLE}\n\n${prompt}`;

const examples = [];
const add = (system, turns, tag) => examples.push({ tag, messages: [{ role: "system", content: system }, ...turns] });
const qa = (q, a, tag = "general") => add(plainSystem(), [{ role: "user", content: q }, { role: "assistant", content: a }], tag);
// Several phrasings of the same question share one answer.
const qaMany = (qs, a, tag) => qs.forEach((q) => qa(q, a, tag));

// A random date in the past year, so "Today is ..." in the prompt varies.
const randomNow = () => new Date(Date.UTC(2026, int(0, 11), int(1, 28), int(11, 23), int(0, 59)));

// ============================================================
// A. Identity (EN + FR)
// ============================================================
qaMany(["Who are you?", "who r u", "What are you?", "Introduce yourself."],
  "I'm Maple, the AI assistant from ARTICxAI, made in Canada by AILIX. Ask me anything: questions, writing, planning or quick facts.", "identity");
qaMany(["Who made you?", "Which company built you?", "Who created Maple?"],
  "I was made by AILIX, a Canadian company. I'm the assistant inside ARTICxAI.", "identity");
qaMany(["What model are you built on?", "Are you ChatGPT?", "Are you GPT-4 or Claude?", "Which LLM is this?"],
  "I'm Maple, built on an open-source base model that AILIX has adapted for ARTICxAI. I'm not ChatGPT or Claude.", "identity");
qaMany(["What's your name?", "What should I call you?"], "I'm Maple. Nice to meet you!", "identity");
qaMany(["What is ARTICxAI?", "What's articx?"],
  "ARTICxAI is a Canadian AI chat platform by AILIX. I'm Maple, its assistant, and your conversations are stored in Canada.", "identity");
qaMany(["Where is my data stored?", "Is my chat data kept in Canada?"],
  "ARTICxAI stores your conversations in Canada, in Toronto. For full details, see the privacy policy linked at the bottom of the site.", "identity");
qaMany(["What is Maple 0.5 Quick?", "What's the quick model for?"],
  "Maple 0.5 Quick is the fast version of me: short, direct answers for everyday questions. Switch to Maple 0.5 when you want more detail.", "identity");
qaMany(["Can you search the internet?", "Do you have web access?"],
  "Yes, for questions that need fresh information, like weather, news, prices or government rules, ARTICxAI looks it up live and I answer from that. For everything else I answer from what I know.", "identity");
qaMany(["Qui es-tu?", "Tu es qui?", "Présente-toi."],
  "Je suis Maple, l'assistant IA d'ARTICxAI, conçu au Canada par AILIX. Pose-moi tes questions : rédaction, planification, faits rapides et plus encore.", "identity");
qaMany(["Qui t'a créé?", "Quelle entreprise t'a conçu?"],
  "J'ai été conçu par AILIX, une entreprise canadienne. Je suis l'assistant d'ARTICxAI.", "identity");
qaMany(["Sur quel modèle es-tu basé?", "Es-tu ChatGPT?"],
  "Je suis Maple, basé sur un modèle open source adapté par AILIX pour ARTICxAI. Je ne suis pas ChatGPT.", "identity");
qa("Où sont stockées mes données?", "ARTICxAI conserve tes conversations au Canada, à Toronto. Pour tous les détails, consulte la politique de confidentialité en bas du site.", "identity");
qa("hi", "Hi! What can I help you with?", "identity");
qa("hello maple", "Hello! What can I do for you today?", "identity");
qa("Bonjour", "Bonjour! Comment puis-je t'aider?", "identity");
qa("thanks!", "You're welcome! Anything else?", "identity");
qa("Merci beaucoup", "Avec plaisir! Autre chose?", "identity");

// ============================================================
// B. Stable general knowledge, short and direct (EN + FR)
// ============================================================
const facts = [
  ["What is the capital of Canada?", "Ottawa, Ontario."],
  ["How many provinces and territories does Canada have?", "10 provinces and 3 territories."],
  ["What are Canada's official languages?", "English and French."],
  ["When is Canada Day?", "July 1. It marks Confederation in 1867."],
  ["When did Canada become a country?", "On July 1, 1867, at Confederation."],
  ["What's the highest mountain in Canada?", "Mount Logan in Yukon, at about 5,959 m."],
  ["What's the longest river in Canada?", "The Mackenzie River, about 4,241 km long."],
  ["Is Canada the biggest country in the world?", "No. Canada is the second largest by area, after Russia, at about 9.98 million km²."],
  ["What's the largest city in Canada?", "Toronto, Ontario."],
  ["What is the capital of British Columbia?", "Victoria."],
  ["What is the capital of Alberta?", "Edmonton."],
  ["What is the capital of Saskatchewan?", "Regina."],
  ["What is the capital of Manitoba?", "Winnipeg."],
  ["What is the capital of Ontario?", "Toronto."],
  ["What is the capital of Quebec?", "Quebec City."],
  ["What is the capital of New Brunswick?", "Fredericton."],
  ["What is the capital of Nova Scotia?", "Halifax."],
  ["What is the capital of PEI?", "Charlottetown."],
  ["What is the capital of Newfoundland and Labrador?", "St. John's."],
  ["What is the capital of Yukon?", "Whitehorse."],
  ["What is the capital of the Northwest Territories?", "Yellowknife."],
  ["What is the capital of Nunavut?", "Iqaluit."],
  ["Which province is the biggest by area?", "Quebec is the largest province. Nunavut is larger overall, but it's a territory."],
  ["What's on the Canadian flag?", "A red 11-point maple leaf on a white square, with a red band on each side. It was adopted in 1965."],
  ["What is Canada's national animal?", "The beaver."],
  ["What's Canada's national sport?", "Lacrosse is the national summer sport and hockey is the national winter sport."],
  ["What currency does Canada use?", "The Canadian dollar (CAD). The $1 coin is the loonie and the $2 coin is the toonie."],
  ["At what temperature does water boil?", "100°C at sea level. It boils a bit lower at high altitude."],
  ["At what temperature does water freeze?", "0°C (32°F)."],
  ["How fast is the speed of light?", "About 299,792 km per second in a vacuum."],
  ["How many continents are there?", "Seven: Africa, Antarctica, Asia, Australia (Oceania), Europe, North America and South America."],
  ["What's the largest planet?", "Jupiter."],
  ["How many planets are in our solar system?", "Eight: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune."],
  ["What is photosynthesis?", "It's how plants use sunlight, water and carbon dioxide to make sugar for energy, releasing oxygen as a by-product."],
  ["What is DNA?", "DNA is the molecule that carries genetic instructions for how living things grow, work and reproduce."],
  ["What's the chemical symbol for gold?", "Au."],
  ["What's H2O?", "Water: two hydrogen atoms bonded to one oxygen atom."],
  ["How many bones are in the adult human body?", "206."],
  ["How many days are in a leap year?", "366."],
  ["How many minutes are in a day?", "1,440."],
  ["What's the difference between weather and climate?", "Weather is what's happening outside now or this week. Climate is the average pattern over many years."],
  ["What does CPU stand for?", "Central processing unit, the main chip that runs a computer's instructions."],
  ["What's the difference between RAM and storage?", "RAM is short-term working memory that clears when you power off. Storage (SSD or hard drive) keeps your files long term."],
  ["What is an API?", "An API is a set of rules that lets one program ask another for data or actions, like an app asking a weather service for the forecast."],
  ["What is machine learning?", "It's a way of building software that learns patterns from examples instead of following only hand-written rules."],
  ["What is a VPN?", "A VPN encrypts your internet traffic and routes it through another server, hiding it from your local network and changing your apparent location."],
  ["What does HTTPS mean?", "It's HTTP with encryption (TLS), so data between your browser and the website can't easily be read or changed in transit."],
  ["Explain recursion in one line.", "Recursion is when a function solves a problem by calling itself on a smaller version of the same problem until it reaches a simple base case."],
  ["What's the difference between a virus and bacteria?", "Bacteria are living single-celled organisms that antibiotics can treat. Viruses are much smaller, need a host cell to multiply, and antibiotics don't work on them."],
  ["Who wrote Anne of Green Gables?", "Lucy Maud Montgomery, published in 1908."],
  ["Who invented basketball?", "James Naismith, a Canadian, in 1891."],
  ["Who invented insulin?", "Frederick Banting and Charles Best discovered it in Toronto in 1921, with J.J.R. Macleod and James Collip."],
  ["What is poutine?", "A Quebec dish of fries topped with cheese curds and hot gravy."],
  ["What's a double-double?", "A coffee with two creams and two sugars, a classic Canadian order."],
  ["How do I boil an egg?", "Put eggs in boiling water: about 6–7 minutes for jammy, 9–10 for hard-boiled. Then cool them in cold water so they peel easily."],
  ["How long should I cook rice?", "For white rice, simmer covered about 15–18 minutes with roughly 1.5–2 cups of water per cup of rice, then rest it 5 minutes."],
  ["How can I fall asleep faster?", "Keep a regular bedtime, avoid screens and caffeine late, keep the room cool and dark, and try slow breathing for a few minutes."],
  ["How do I take a screenshot on a Mac?", "Press Cmd+Shift+3 for the full screen, Cmd+Shift+4 to select an area, or Cmd+Shift+5 for more options."],
  ["How do I take a screenshot on Windows?", "Press Windows+Shift+S to select an area, or PrtScn to capture the full screen."],
  ["How do I reverse a string in Python?", "Use slicing: `text[::-1]`."],
  ["How do I sum an array in JavaScript?", "`const total = arr.reduce((sum, n) => sum + n, 0);`"],
  ["How do I check my Python version?", "Run `python3 --version` in the terminal."],
  ["How do I undo the last git commit but keep my changes?", "Run `git reset --soft HEAD~1`. Your changes stay staged."],
  ["Write a one-line professional email to say I'll be late.", "Hi [Name], I'm running about 15 minutes late and will be there as soon as I can. Sorry for the delay."],
  ["Give me a short thank-you note for a coworker.", "Thanks so much for your help this week. It made a real difference, and I really appreciate it!"],
  ["Is it colour or color in Canada?", "Colour. Canadian spelling keeps the \"ou\" (colour, favourite, neighbour) but uses \"-ize\" in words like organize."],
  ["Is it centre or center in Canada?", "Centre. Canadian spelling uses \"-re\" in words like centre, metre and theatre."],
  ["Quelle est la capitale du Canada?", "Ottawa, en Ontario."],
  ["Combien de provinces compte le Canada?", "Dix provinces et trois territoires."],
  ["Quelle est la capitale du Québec?", "La ville de Québec."],
  ["Quelles sont les langues officielles du Canada?", "Le français et l'anglais."],
  ["Qu'est-ce que la poutine?", "Un plat québécois : des frites garnies de fromage en grains et nappées de sauce brune chaude."],
  ["À quelle température l'eau bout-elle?", "À 100 °C au niveau de la mer."],
  ["Qu'est-ce que la photosynthèse?", "C'est le processus par lequel les plantes utilisent la lumière, l'eau et le dioxyde de carbone pour fabriquer du sucre, en libérant de l'oxygène."],
  ["Comment faire une capture d'écran sur Mac?", "Cmd+Maj+3 pour tout l'écran, Cmd+Maj+4 pour une zone, ou Cmd+Maj+5 pour plus d'options."],
  ["Qui a inventé le basketball?", "James Naismith, un Canadien, en 1891."],
  ["Combien y a-t-il de planètes dans le système solaire?", "Huit : Mercure, Vénus, la Terre, Mars, Jupiter, Saturne, Uranus et Neptune."],
  ["Écris un court message pour dire que je serai en retard.", "Bonjour [Nom], j'aurai environ 15 minutes de retard. Désolé, j'arrive dès que possible."],
];
facts.forEach(([q, a]) => qa(q, a, "general"));

// ============================================================
// C. Arithmetic and conversions (computed, so always correct)
// ============================================================
for (let i = 0; i < 14; i++) {
  const bill = fix(int(1800, 15000) / 100), pct = pick([15, 18, 20]);
  const tip = fix(bill * pct / 100);
  qa(pick([`What's a ${pct}% tip on $${bill.toFixed(2)}?`, `${pct} percent tip on a $${bill.toFixed(2)} bill?`, `Tip ${pct}% on $${bill.toFixed(2)}`]),
    `A ${pct}% tip is $${tip.toFixed(2)}, so the total is $${(bill + tip).toFixed(2)}.`, "math");
}
for (let i = 0; i < 12; i++) {
  const c = int(-30, 40), f = fix(c * 9 / 5 + 32, 1);
  if (i % 3 === 2) qa(`Convertis ${c} °C en Fahrenheit.`, `${c} °C = ${f.toString().replace(".", ",")} °F.`, "math");
  else qa(pick([`What's ${c}°C in Fahrenheit?`, `Convert ${c} C to F`, `${c} degrees Celsius in Fahrenheit?`]), `${c}°C is ${f}°F.`, "math");
}
for (let i = 0; i < 10; i++) {
  const f = int(-10, 100), c = fix((f - 32) * 5 / 9, 1);
  qa(pick([`What's ${f}°F in Celsius?`, `Convert ${f} F to C`]), `${f}°F is ${c}°C.`, "math");
}
for (let i = 0; i < 10; i++) {
  const mi = int(1, 400), km = fix(mi * 1.609344, 1);
  qa(pick([`How many km is ${mi} miles?`, `${mi} miles in kilometres?`]), `${mi} miles is about ${km} km.`, "math");
}
for (let i = 0; i < 8; i++) {
  const lb = int(1, 300), kg = fix(lb * 0.45359237, 1);
  qa(pick([`How many kg is ${lb} pounds?`, `${lb} lbs to kg`]), `${lb} lb is about ${kg} kg.`, "math");
}
for (let i = 0; i < 12; i++) {
  const a = int(12, 999), b = int(2, 99), op = pick(["+", "-", "×", "÷"]);
  let r;
  if (op === "+") r = a + b; else if (op === "-") r = a - b; else if (op === "×") r = a * b; else r = fix(a / b, 2);
  qa(pick([`What is ${a} ${op} ${b}?`, `${a} ${op} ${b}`, `Calculate ${a} ${op} ${b}`]), `${a} ${op} ${b} = ${r}.`, "math");
}
for (let i = 0; i < 8; i++) {
  const price = int(20, 900), off = pick([10, 15, 20, 25, 30, 40, 50]);
  const sale = fix(price * (1 - off / 100));
  qa(`Something costs $${price} and it's ${off}% off. What's the sale price?`, `It's $${sale.toFixed(2)} (you save $${(price - sale).toFixed(2)}), before tax.`, "math");
}

// ============================================================
// D. No live data attached: be honest, never guess current facts
// ============================================================
const noLive = [
  ["What's the score of the Jets game right now?", "I can't confirm live scores right now. Check the NHL app, the team's official site or a sports channel for the latest."],
  ["Who won the election yesterday?", "I can't confirm recent election results right now, so I don't want to guess. Elections Canada (elections.ca) or a major news outlet will have the official results."],
  ["What's the price of Bitcoin today?", "I can't check live prices right now, and crypto prices change by the minute. A crypto exchange or a finance site will show the current price."],
  ["What's today's date?", "I can't confirm today's date from here. Your device's clock will show it."],
  ["Any big news today?", "I can't pull up today's news right now, so I won't guess. CBC News, Radio-Canada or your favourite news outlet will have the latest headlines."],
  ["What's the USD to CAD exchange rate right now?", "I can't confirm the live exchange rate right now. The Bank of Canada publishes daily rates, and your bank's app shows the rate you'd actually get."],
  ["Is the 401 closed right now?", "I can't check live traffic right now. Ontario 511 or a maps app will show current closures."],
  ["What's the gas price in Calgary today?", "I can't check live gas prices right now. A gas price app or site will show today's prices near you."],
  ["Did the Raptors win last night?", "I can't confirm last night's result right now. The NBA app or a sports news site will have the final score."],
  ["Who is the current mayor of Toronto?", "I can't confirm who holds that office right now, and it may have changed since my training. The City of Toronto's website (toronto.ca) lists the current mayor."],
  ["Is it going to snow this weekend?", "I can't get a live forecast right now. Environment Canada's weather site or a weather app will have the latest forecast for your area."],
  ["What's the latest iPhone?", "I can't confirm the newest model right now, since new phones come out every year. Apple's website lists the current lineup."],
  ["Quel temps fait-il à Montréal aujourd'hui?", "Je ne peux pas consulter la météo en direct pour le moment. Le site d'Environnement Canada ou une application météo te donnera les prévisions à jour."],
  ["Quelles sont les nouvelles aujourd'hui?", "Je ne peux pas consulter l'actualité du jour pour le moment, alors je préfère ne pas deviner. Radio-Canada ou ton média habituel aura les dernières nouvelles."],
  ["Qui a gagné le match des Canadiens hier soir?", "Je ne peux pas confirmer le résultat d'hier soir pour le moment. L'application de la LNH ou un site de sports aura le pointage final."],
];
noLive.forEach(([q, a]) => qa(q, a, "nolive"));

// ============================================================
// E. Never invent links or citations
// ============================================================
const noLinks = [
  ["Give me a link to a study proving coffee is healthy.", "I can't give you a specific study link I'm sure exists, and I don't want to make one up. Searching PubMed for \"coffee consumption health outcomes\" will turn up real research, including large reviews."],
  ["Send me the URL for the Ontario government page on rent increases.", "I'm not certain of the exact page address, so I won't guess a URL. Go to ontario.ca and search \"rent increase guideline\" to find the official page."],
  ["Can you cite three sources for that?", "I can't verify specific sources from here, so I won't list ones that might not exist. If you want, I can suggest search terms or the kinds of sources to look for."],
  ["What's the direct link to apply for a SIN?", "I don't want to give you a link I can't verify. Go to canada.ca and search \"Social Insurance Number\" to find the official application page."],
  ["Quote Einstein on imagination with the exact source.", "A widely shared version is \"Imagination is more important than knowledge,\" usually traced to a 1929 interview, but I can't verify the exact source wording from here, so please check it before you quote it."],
  ["Donne-moi le lien exact du formulaire de l'ARC.", "Je ne veux pas inventer une adresse que je ne peux pas vérifier. Va sur canada.ca et cherche le nom du formulaire pour trouver la page officielle."],
];
noLinks.forEach(([q, a]) => qa(q, a, "nolinks"));

// ============================================================
// F. Live weather (same text format as production) → direct answers
// ============================================================
const CITIES = [
  ["Toronto", "Ontario"], ["Ottawa", "Ontario"], ["Hamilton", "Ontario"], ["London", "Ontario"], ["Mississauga", "Ontario"],
  ["Montreal", "Quebec"], ["Québec", "Quebec"], ["Laval", "Quebec"], ["Gatineau", "Quebec"], ["Sherbrooke", "Quebec"],
  ["Vancouver", "British Columbia"], ["Victoria", "British Columbia"], ["Kelowna", "British Columbia"],
  ["Calgary", "Alberta"], ["Edmonton", "Alberta"], ["Saskatoon", "Saskatchewan"], ["Regina", "Saskatchewan"],
  ["Winnipeg", "Manitoba"], ["Halifax", "Nova Scotia"], ["Moncton", "New Brunswick"], ["Fredericton", "New Brunswick"],
  ["Charlottetown", "Prince Edward Island"], ["St. John's", "Newfoundland and Labrador"], ["Whitehorse", "Yukon"],
  ["Yellowknife", "Northwest Territories"], ["Iqaluit", "Nunavut"],
];
const FR_WEATHER = {
  "clear sky": "ciel dégagé", "mainly clear": "plutôt dégagé", "partly cloudy": "partiellement nuageux", overcast: "couvert",
  fog: "brouillard", "light drizzle": "légère bruine", drizzle: "bruine", "light rain": "pluie légère", rain: "pluie",
  "heavy rain": "forte pluie", "freezing rain": "pluie verglaçante", "light snow": "neige légère", snow: "neige",
  "heavy snow": "forte neige", "light showers": "quelques averses", showers: "averses", "snow showers": "averses de neige",
  thunderstorm: "orages",
};
const CODE_OF = {
  "clear sky": 0, "mainly clear": 1, "partly cloudy": 2, overcast: 3, fog: 45, "light drizzle": 51, drizzle: 53,
  "light rain": 61, rain: 63, "heavy rain": 65, "freezing rain": 66, "light snow": 71, snow: 73, "heavy snow": 75,
  "light showers": 80, showers: 81, "snow showers": 85, thunderstorm: 95,
};
const WET = new Set(["light drizzle", "drizzle", "light rain", "rain", "heavy rain", "freezing rain", "light snow", "snow", "heavy snow", "light showers", "showers", "snow showers", "thunderstorm"]);

function weatherDay(season) {
  const ranges = { winter: [-28, 3], spring: [0, 18], summer: [16, 34], fall: [-2, 16] };
  const [a, b] = ranges[season];
  const hi = int(a + 4, b), lo = hi - int(4, 11);
  const cold = hi <= 1;
  const dryOpts = ["clear sky", "mainly clear", "partly cloudy", "overcast"];
  const wetOpts = cold ? ["light snow", "snow", "heavy snow", "snow showers"]
    : hi <= 4 ? ["freezing rain", "light rain", "light snow", "drizzle"]
    : hi >= 22 ? ["light showers", "showers", "thunderstorm", "rain"] : ["light rain", "rain", "drizzle", "showers", "heavy rain"];
  const wet = rand() < 0.4;
  const cond = wet ? pick(wetOpts) : pick(dryOpts);
  const prob = wet ? int(55, 100) : int(0, 30);
  const sum = wet ? fix(int(5, 250) / 10, 1) : (prob > 20 ? 0.1 : 0);
  const uv = season === "summer" ? int(4, 9) : season === "winter" ? int(0, 2) : int(1, 5);
  return { cond, hi, lo, prob, sum, uv };
}

function makeWeather(city, prov, now) {
  const m = now.getUTCMonth();
  const season = [11, 0, 1].includes(m) ? "winter" : [2, 3, 4].includes(m) ? "spring" : [5, 6, 7].includes(m) ? "summer" : "fall";
  const days = [weatherDay(season), weatherDay(season), weatherDay(season)];
  const t0 = days[0];
  const temp = int(t0.lo, t0.hi);
  const wind = int(3, 45);
  const feels = temp <= 10 ? temp - Math.round(wind / 6) : temp >= 26 ? temp + int(0, 4) : temp;
  const nowCond = rand() < 0.75 ? t0.cond : pick(["partly cloudy", "overcast", "mainly clear"]);
  const nowWet = WET.has(nowCond);
  const iso = (d) => d.toISOString().slice(0, 10);
  const dates = [0, 1, 2].map((k) => iso(new Date(now.getTime() + k * 864e5)));
  const current = {
    time: `${dates[0]}T${String(int(7, 22)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
    temperature_2m: temp, apparent_temperature: feels, relative_humidity_2m: int(30, 95),
    precipitation: nowWet ? fix(int(1, 40) / 10, 1) : 0, weather_code: CODE_OF[nowCond],
    wind_speed_10m: wind, wind_gusts_10m: wind + int(5, 25),
  };
  const daily = {
    time: dates, weather_code: days.map((d) => CODE_OF[d.cond]),
    temperature_2m_max: days.map((d) => d.hi), temperature_2m_min: days.map((d) => d.lo),
    precipitation_probability_max: days.map((d) => d.prob), precipitation_sum: days.map((d) => d.sum),
    uv_index_max: days.map((d) => d.uv),
  };
  return { text: formatWeather(`${city}, ${prov}, Canada`, current, daily), current, days, nowCond, wind };
}

function tipEn(day, wind) {
  if (/snow/.test(day.cond) && day.prob >= 50) return "Dress warmly and give yourself extra time on the roads.";
  if (day.cond === "freezing rain") return "Watch for icy sidewalks and roads.";
  if (day.prob >= 50) return "Bring an umbrella or a rain jacket.";
  if (day.hi <= -15) return "It's bitterly cold, so cover up exposed skin.";
  if (day.hi <= 0) return "Bundle up: hat, gloves and a warm coat.";
  if (day.hi <= 10) return "A warm jacket is a good idea.";
  if (day.uv >= 6) return "Wear sunscreen if you're out for long.";
  if (day.hi >= 29) return "Stay hydrated and find some shade.";
  if (wind >= 35) return "It's windy, so hold on to your hat.";
  return "A nice day to get outside.";
}
function tipFr(day, wind) {
  if (/snow/.test(day.cond) && day.prob >= 50) return "Habille-toi chaudement et prévois plus de temps sur la route.";
  if (day.cond === "freezing rain") return "Attention aux trottoirs et aux routes glacés.";
  if (day.prob >= 50) return "Apporte un parapluie ou un imperméable.";
  if (day.hi <= -15) return "C'est un froid mordant : couvre bien ta peau.";
  if (day.hi <= 0) return "Tuque, mitaines et manteau chaud de rigueur.";
  if (day.hi <= 10) return "Un manteau chaud est une bonne idée.";
  if (day.uv >= 6) return "Mets de la crème solaire si tu restes dehors longtemps.";
  if (day.hi >= 29) return "Hydrate-toi bien et cherche l'ombre.";
  if (wind >= 35) return "Ça vente fort aujourd'hui.";
  return "Une belle journée pour sortir.";
}
const SKY_EN = { "clear sky": "clear skies", "mainly clear": "mostly clear skies", "partly cloudy": "partly cloudy skies", overcast: "overcast skies" };
const nowEn = (cond) => SKY_EN[cond] || cond;
const precipEn = (d) => (/snow/.test(d.cond) || d.hi <= 0 ? "snow" : d.hi <= 3 ? "rain or snow" : "rain");
const precipFr = (d) => (/snow/.test(d.cond) || d.hi <= 0 ? "neige" : d.hi <= 3 ? "pluie ou neige" : "pluie");
const fr = (n) => String(n).replace(".", ",");

const WEATHER_Q_EN = {
  now: ["What's the weather in {c} today?", "weather {c}", "How's the weather in {c}?", "What's it like outside in {c} right now?", "{c} weather today", "Do I need a jacket in {c} today?", "Is it going to rain in {c} today?"],
  tomorrow: ["What's the weather in {c} tomorrow?", "{c} forecast for tomorrow", "Will it rain tomorrow in {c}?", "What should I wear tomorrow in {c}?"],
  guess: ["What's the weather today?", "Is it going to rain today?", "How cold is it right now?", "weather?"],
};
const WEATHER_Q_FR = {
  now: ["Quel temps fait-il à {c} aujourd'hui?", "Météo à {c}?", "Il fait combien à {c} en ce moment?", "Va-t-il pleuvoir à {c} aujourd'hui?"],
  tomorrow: ["Quelle est la météo à {c} demain?", "Prévisions pour demain à {c}?"],
};

for (let i = 0; i < 90; i++) {
  const french = i % 5 === 4;
  const mode = french ? pick(["now", "now", "tomorrow"]) : pick(["now", "now", "now", "tomorrow", "guess"]);
  const [city, prov] = mode === "guess" ? ["Toronto", "Ontario"] : french && rand() < 0.6 ? pick(CITIES.filter((c) => c[1] === "Quebec" || c[1] === "New Brunswick" || c[0] === "Ottawa")) : pick(CITIES);
  const now = randomNow();
  const w = makeWeather(city, prov, now);
  const q = pick((french ? WEATHER_Q_FR : WEATHER_Q_EN)[mode]).replace("{c}", city);
  const today = w.days[0], tmr = w.days[1], c = w.current;
  let a;
  if (french) {
    a = mode === "tomorrow"
      ? `Demain à ${city} : ${FR_WEATHER[tmr.cond]}, maximum de ${tmr.hi} °C et minimum de ${tmr.lo} °C, avec ${tmr.prob} % de risque de ${precipFr(tmr)}. ${tipFr(tmr, w.wind)}`
      : `En ce moment à ${city}, il fait ${c.temperature_2m} °C avec ${FR_WEATHER[w.nowCond]} (ressenti ${c.apparent_temperature} °C). Aujourd'hui : maximum de ${today.hi} °C, minimum de ${today.lo} °C et ${today.prob} % de risque de ${precipFr(today)}. ${tipFr(today, w.wind)}`;
  } else if (mode === "tomorrow") {
    a = `Tomorrow in ${city}: ${tmr.cond}, with a high of ${tmr.hi}°C and a low of ${tmr.lo}°C. The chance of ${precipEn(tmr)} is ${tmr.prob}%. ${tipEn(tmr, w.wind)}`;
  } else {
    const lead = mode === "guess" ? "You didn't mention a city, so here's Toronto: it's" : `Right now in ${city} it's`;
    a = `${lead} ${c.temperature_2m}°C with ${nowEn(w.nowCond)} (feels like ${c.apparent_temperature}°C). Today's high is ${today.hi}°C and the low is ${today.lo}°C, with a ${today.prob}% chance of ${precipEn(today)}.`.replace(/ a (8\d|8|11|18)% /, " an $1% ") + ` ${tipEn(today, w.wind)}`;
    if (mode === "guess") a += " Tell me your city and I'll check there.";
  }
  const prompt = buildSearchPrompt("weather", w.text, [], mode === "guess", now);
  add(searchSystem(prompt), [{ role: "user", content: q }, { role: "assistant", content: a }], "weather");
}

// ============================================================
// G. Other live results (Tavily format) → direct answers, no URLs
// ============================================================
const tavily = (summary, results) =>
  (summary ? `Search summary: ${summary}\n\n` : "") +
  results.map((r, i) => `Result ${i + 1}: ${r[0]} (${r[1]})\n${r[2]}`).join("\n\n");
const live = (kind, q, data, a, links = []) =>
  add(searchSystem(buildSearchPrompt(kind, data, links, false, randomNow())), [{ role: "user", content: q }, { role: "assistant", content: a }], `live-${kind}`);

// Exchange rates
for (let i = 0; i < 16; i++) {
  const rate = fix(1.3 + rand() * 0.14, 4), amt = pick([20, 50, 100, 250, 500, 1000]);
  const data = tavily(`1 US dollar equals about ${rate} Canadian dollars at today's mid-market rate.`,
    [["USD to CAD exchange rate today", "https://ratesdaily.ca/usd-cad", `USD/CAD ${rate}. The Canadian dollar traded in a narrow range today. 1 CAD = ${fix(1 / rate, 4)} USD.`],
     ["Currency converter", "https://fxconvert.ca", `Mid-market rate: 1 USD = ${rate} CAD. Banks typically add a margin of 2–3%.`]]);
  if (i % 4 === 3) live("general", `Combien valent ${amt} dollars américains en dollars canadiens?`, data,
    `${amt} $ US valent environ ${fr(fix(amt * rate))} $ CA, au taux moyen du marché de ${fr(rate)}. Ta banque ajoutera probablement une petite marge.`);
  else live("general", pick([`How much is ${amt} USD in CAD today?`, `Convert ${amt} US dollars to Canadian`, `What's the US dollar worth in Canadian today?`]), data,
    `${amt === 1 ? "" : `${amt} USD is about ${fix(amt * rate).toFixed(2)} CAD. `}The mid-market rate today is 1 USD = ${rate} CAD. Your bank or card will usually give you a slightly worse rate.`);
}

// Sports scores
const TEAMS = [["Maple Leafs", "Toronto"], ["Canadiens", "Montreal"], ["Oilers", "Edmonton"], ["Flames", "Calgary"], ["Canucks", "Vancouver"], ["Jets", "Winnipeg"], ["Senators", "Ottawa"]];
const OPP = ["Bruins", "Rangers", "Lightning", "Panthers", "Red Wings", "Blackhawks", "Avalanche", "Golden Knights", "Kraken", "Stars"];
for (let i = 0; i < 18; i++) {
  const [team, city] = pick(TEAMS), opp = pick(OPP);
  let us = int(0, 6), them = int(0, 6); if (us === them) us++;
  const ot = rand() < 0.2 && Math.abs(us - them) === 1;
  const scorer = pick(["their captain", "a rookie forward", "their top centre", "a defenceman"]);
  const won = us > them;
  const data = tavily(`The ${city} ${team} ${won ? "beat" : "lost to"} the ${opp} ${Math.max(us, them)}-${Math.min(us, them)}${ot ? " in overtime" : ""} last night.`,
    [[`${team} vs ${opp} recap`, "https://sportsdesk.ca/nhl/recap", `Final: ${team} ${us}, ${opp} ${them}${ot ? " (OT)" : ""}. The winning goal came from ${won ? scorer : "the " + opp}.`]]);
  if (i % 5 === 4) live("general", `Les ${team} ont-ils gagné hier soir?`, data,
    `${won ? "Oui" : "Non"}, les ${team} ont ${won ? "battu" : "perdu contre"} les ${opp} ${Math.max(us, them)} à ${Math.min(us, them)}${ot ? " en prolongation" : ""}.`);
  else live("general", pick([`Did the ${team} win last night?`, `${team} score last night?`, `How did the ${team} do last night?`]), data,
    `${won ? "Yes" : "No"}, the ${team} ${won ? "beat" : "lost to"} the ${opp} ${Math.max(us, them)}-${Math.min(us, them)}${ot ? " in overtime" : ""}.${won && scorer ? ` The winner came from ${scorer}.` : ""}`);
}

// Gas prices
for (let i = 0; i < 12; i++) {
  const [city] = pick(CITIES);
  const cents = fix(132 + rand() * 50, 1); // 132.0–182.0 ¢/L
  const change = pick([-3.2, -1.5, -0.8, 0, 0.7, 1.9, 2.4]);
  const data = tavily(`The average price of regular gas in ${city} is about ${cents} cents per litre today.`,
    [["Gas prices today", "https://gaswatch.ca", `${city} average (regular): ${cents}¢/L, ${change === 0 ? "unchanged" : `${change > 0 ? "up" : "down"} ${Math.abs(change)}¢`} from yesterday. Lowest stations about ${fix(cents - int(3, 9), 1)}¢/L.`]]);
  live("general", pick([`What's the gas price in ${city} today?`, `How much is gas in ${city} right now?`]), data,
    `Regular gas in ${city} averages about ${cents}¢ per litre today${change === 0 ? ", unchanged from yesterday" : `, ${change > 0 ? "up" : "down"} ${Math.abs(change)}¢ from yesterday`}. The cheapest stations are a few cents lower.`);
}

// Interest rate (number varies, so it's read, not memorized)
for (let i = 0; i < 8; i++) {
  const r = pick([2.25, 2.5, 2.75, 3.0, 3.25, 3.5]), move = pick(["held", "cut", "raised"]);
  const data = tavily(`The Bank of Canada ${move} its policy interest rate${move === "held" ? " at" : " to"} ${r.toFixed(2)}% at its latest announcement.`,
    [["Bank of Canada rate announcement", "https://economy-news.ca/boc", `The central bank ${move} the overnight rate${move === "held" ? " at" : " to"} ${r.toFixed(2)}%, citing inflation and growth.`]]);
  live("general", pick(["What's the Bank of Canada interest rate now?", "Did the Bank of Canada change rates?", "current BoC rate?"]), data,
    `The Bank of Canada's policy rate is ${r.toFixed(2)}%. At its latest announcement it ${move} the rate${move === "held" ? " steady" : ""}, pointing to inflation and economic growth.`);
}

// Local news (fictional, varied details)
for (let i = 0; i < 10; i++) {
  const [city] = pick(CITIES), n = int(2, 40);
  const topic = pick([
    [`${city} council approved ${n} km of new bike lanes`, `Construction starts in the spring, and council approved the plan by a vote of ${int(10, 18)} to ${int(2, 7)}.`],
    [`${city} transit fares will rise by ${n} cents next month`, `The increase applies to adult single fares; monthly passes rise by $${int(2, 6)}.`],
    [`A water main break closed several streets in downtown ${city}`, `Crews expect repairs to take about ${int(1, 3)} days, and nearby residents may see low water pressure.`],
  ]);
  const data = tavily(`${topic[0]}. ${topic[1]}`, [[`${city} news`, "https://localnews.ca/article", `${topic[0]}. ${topic[1]}`]]);
  live("news", pick([`Any news in ${city} today?`, `What's happening in ${city}?`, `latest news ${city}`]), data,
    `The main local story: ${topic[0].charAt(0).toLowerCase() + topic[0].slice(1)}. ${topic[1]}`,
    [{ title: `${city} news`, url: "https://localnews.ca/article" }]);
}

// Results that DON'T answer the question → say so briefly, don't invent
const misses = [
  ["What time does the Riverside library branch close tonight?", tavily("", [["Riverside Library — about", "https://library.example.ca/riverside", "The Riverside branch offers study rooms, a makerspace and children's programs. Renovated in 2019."]]),
   "I couldn't find tonight's closing time for the Riverside branch. The library's website or a quick call to the branch will have today's hours."],
  ["How much is the new transit pass in Kelowna?", tavily("", [["Kelowna transit", "https://transit.example.ca", "Kelowna Regional Transit operates more than 20 routes across the region."]]),
   "I couldn't confirm the new pass price for Kelowna. The local transit website will list current fares."],
  ["Did the Saskatoon store on 8th Street close?", tavily("", [["8th Street businesses", "https://localnews.ca/8th", "8th Street East is one of Saskatoon's busiest commercial strips."]]),
   "I couldn't find anything confirming that the store closed. Calling the store or checking its website is the quickest way to know."],
  ["Quel est l'horaire de la piscine municipale de Sherbrooke aujourd'hui?", tavily("", [["Piscines de Sherbrooke", "https://ville.example.ca/piscines", "La Ville compte plusieurs piscines intérieures et extérieures."]]),
   "Je n'ai pas trouvé l'horaire d'aujourd'hui pour la piscine. Le site de la Ville de Sherbrooke ou un appel rapide te le confirmera."],
];
misses.forEach(([q, d, a]) => live("general", q, d, a));

// Official topics: answer + "confirm" line; the app shows up to 2 official links under it
const official = [
  [["How do I renew my PR card?", "PR card renewal steps?", "My PR card expires soon, what do I do?"],
    tavily("You can apply to renew your PR card online through IRCC. Apply if your card expires within 9 months or has already expired. You must meet the residency obligation: at least 730 days (2 years) in Canada in the last 5 years.",
      [["Renew or replace your PR card", "https://www.canada.ca/en/immigration-refugees-citizenship/services/new-immigrants/pr-card/apply-renew-replace.html", "Apply online if your PR card expires in less than 9 months or has expired. You'll need a photo and to show you meet the residency obligation."]]),
    "You can renew your PR card online through IRCC. Apply if it expires within 9 months or has already expired. You'll need a photo and to show you've lived in Canada at least 730 days (2 years) in the last 5 years. Confirm the details on the official page below before you apply."],
  [["How do I get a SIN?", "How to apply for a social insurance number?"],
    tavily("You can apply for a Social Insurance Number online, by mail, or in person at a Service Canada Centre. There's no fee. You need a primary identity document such as a birth certificate, a PR document or a work permit.",
      [["Social Insurance Number — apply", "https://www.canada.ca/en/employment-social-development/services/sin/apply.html", "Apply online, by mail or in person. You need a primary document proving identity and status in Canada. There is no fee."]]),
    "You can apply for a SIN online, by mail, or in person at a Service Canada Centre, and it's free. Bring a primary ID document that shows your status, like a birth certificate, PR document or work permit. Check the official page below for the full document list."],
  [["When is the tax filing deadline?", "When do I have to file my taxes in Canada?"],
    tavily("Most individuals must file their income tax return and pay any balance owing by April 30. If you or your spouse are self-employed, the filing deadline is June 15, but any balance owing is still due April 30.",
      [["Important dates for individuals", "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/important-dates-individuals.html", "April 30: filing and payment deadline for most individuals. June 15: filing deadline for self-employed individuals; payment is still due April 30."]]),
    "Most people must file and pay any balance owing by April 30. If you or your spouse are self-employed, you can file until June 15, but any amount owing is still due April 30. Confirm on the CRA page below or with a tax professional."],
  [["How do I apply for EI?", "I lost my job, how do I get employment insurance?"],
    tavily("Apply for EI regular benefits online as soon as you stop working, even if you don't have your Record of Employment yet. Waiting more than 4 weeks after your last day of work can cost you benefits. Most people need between 420 and 700 insured hours, depending on the unemployment rate in their region.",
      [["EI regular benefits — apply", "https://www.canada.ca/en/services/benefits/ei/ei-regular-benefit/apply.html", "Apply as soon as you stop working. Don't wait for your Record of Employment. Delaying more than 4 weeks may mean losing benefits."]]),
    "Apply for EI online as soon as you stop working, even before you get your Record of Employment. Waiting more than 4 weeks can cost you benefits. Most people need 420 to 700 insured hours, depending on their region. Check the official page below to confirm you're eligible."],
  [["Comment renouveler ma carte de RP?", "Ma carte de résident permanent expire bientôt, que faire?"],
    tavily("Vous pouvez demander le renouvellement de votre carte de RP en ligne auprès d'IRCC si elle expire dans moins de 9 mois ou est expirée. Vous devez respecter l'obligation de résidence : au moins 730 jours au Canada au cours des 5 dernières années.",
      [["Renouveler ou remplacer la carte de RP", "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/nouveaux-immigrants/carte-rp/demande-renouveler-remplacer.html", "Faites votre demande en ligne si la carte expire dans moins de 9 mois. Une photo et une preuve de résidence sont requises."]]),
    "Tu peux demander le renouvellement en ligne auprès d'IRCC si ta carte expire dans moins de 9 mois ou est déjà expirée. Il te faut une photo et tu dois avoir vécu au moins 730 jours au Canada au cours des 5 dernières années. Vérifie les détails sur la page officielle ci-dessous avant de faire ta demande."],
  [["Quelle est la date limite pour les impôts?", "Quand dois-je produire ma déclaration de revenus?"],
    tavily("La plupart des particuliers doivent produire leur déclaration et payer tout solde dû au plus tard le 30 avril. Les travailleurs autonomes ont jusqu'au 15 juin pour produire, mais le solde est dû le 30 avril.",
      [["Dates importantes pour les particuliers", "https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/dates-importantes-particuliers.html", "30 avril : date limite de production et de paiement. 15 juin : production pour les travailleurs autonomes."]]),
    "Pour la plupart des gens, c'est le 30 avril, pour produire la déclaration et payer le solde dû. Si toi ou ton conjoint êtes travailleurs autonomes, tu as jusqu'au 15 juin pour produire, mais le paiement reste dû le 30 avril. Confirme sur la page de l'ARC ci-dessous ou avec un professionnel."],
];
official.forEach(([qs, data, a]) => {
  const links = [...data.matchAll(/\((https:\/\/www\.canada\.ca[^)]+)\)/g)].map((m) => ({ title: "Official page", url: m[1] }));
  qs.forEach((q) => live("official", q, data, a, links));
});

// ============================================================
// H. Short multi-turn conversations
// ============================================================
const convo = (turns, tag = "multi") => {
  const msgs = [];
  for (let i = 0; i < turns.length; i += 2) msgs.push({ role: "user", content: turns[i] }, { role: "assistant", content: turns[i + 1] });
  add(plainSystem(), msgs, tag);
};
convo(["What's the capital of Alberta?", "Edmonton.", "And the biggest city there?", "Calgary is the largest city in Alberta."]);
convo(["Convert 10 km to miles", "10 km is about 6.2 miles.", "and 21.1 km?", "21.1 km is about 13.1 miles, a half marathon."]);
convo(["Give me a name idea for a coffee shop in Halifax", "Harbour Grind.", "Something more cozy?", "Foggy Morning Café."]);
convo(["Can you make that shorter?", "Sure. Paste the text you'd like me to shorten."]);
convo(["Write a tweet about our launch", "We just launched! 🍁 Meet ARTICxAI, the AI assistant built in Canada, for Canada. Try it today.", "Make it French", "C'est parti! 🍁 Voici ARTICxAI, l'assistant IA conçu au Canada, pour le Canada. Essaie-le dès aujourd'hui."]);
convo(["Explain inflation simply", "Inflation is when prices rise over time, so each dollar buys a bit less than before.", "Why does it happen?", "Usually because demand grows faster than supply, or because costs like energy and wages go up and businesses pass them on."]);
convo(["c'est quoi un REER?", "Un REER (régime enregistré d'épargne-retraite) est un compte d'épargne pour la retraite. Les cotisations réduisent ton revenu imposable, et l'impôt est payé au retrait.", "Et un CELI?", "Un CELI (compte d'épargne libre d'impôt) ne donne pas de déduction à la cotisation, mais les gains et les retraits sont libres d'impôt."]);
convo(["What's a TFSA?", "A Tax-Free Savings Account: you contribute after-tax money, and growth and withdrawals are tax-free.", "How is it different from an RRSP?", "RRSP contributions lower your taxable income now, but withdrawals are taxed later. A TFSA gives no deduction now, but withdrawals are tax-free."]);

// ============================================================
// Write train / valid / test
// ============================================================
for (let i = examples.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [examples[i], examples[j]] = [examples[j], examples[i]]; }
const nValid = Math.round(examples.length * 0.08), nTest = Math.round(examples.length * 0.04);
const splits = { valid: examples.slice(0, nValid), test: examples.slice(nValid, nValid + nTest), train: examples.slice(nValid + nTest) };

fs.mkdirSync(OUT, { recursive: true });
for (const [name, rows] of Object.entries(splits)) {
  fs.writeFileSync(path.join(OUT, `${name}.jsonl`), rows.map((r) => JSON.stringify({ messages: r.messages })).join("\n") + "\n");
}
const byTag = examples.reduce((m, e) => ((m[e.tag] = (m[e.tag] || 0) + 1), m), {});
console.log(`Wrote ${examples.length} examples to ${path.relative(process.cwd(), OUT)}/`);
console.log(`  train ${splits.train.length}, valid ${splits.valid.length}, test ${splits.test.length}`);
console.log("  by type:", byTag);
