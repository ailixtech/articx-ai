// functions/safety.js — spots medical and mental-health emergencies in a message (typos included),
// so the chat function can force an emergency-first answer instead of relying on the model.

const norm = (s) => ` ${s.toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ")} `;

const SEVERE = "(sudden|suddenly|sudenly|severe|sever|sevier|servere|worst|extreme|maximum|max|unbearable|terrible|excruciating|crushing|really bad|very bad|so bad|intense|explod)";
const MEDICAL = [
  new RegExp(`${SEVERE}.{0,30}(head|hed|heead|headache|headach|chest|stomach|belly|abdom)`),
  new RegExp(`(head|hed|heead|headache|headach|chest).{0,25}${SEVERE}`),
  /chest (pain|pressure|tight)|pain in my chest|heart attack|cardiac/,
  /(can t|cant|cannot|can not|trouble|hard to|difficulty|struggling to) (breathe|breath|breathing)|short(ness)? of breath|not breathing|choking/,
  /stroke|face (is )?droop|slurred speech|can t (speak|talk|move my)|one side (of my body )?(is )?(weak|numb)|sudden (numbness|weakness|confusion|vision loss)/,
  /unconscious|passed out|fainted|won t wake|not waking up|unresponsive|seizure|convuls/,
  /(severe|heavy|lot of|won t stop|wont stop) bleeding|bleeding (a lot|heavily|won t stop)/,
  /overdose|overdosed|took too many (pills|tablets)|swallowed (poison|bleach|chemicals)|poisoned/,
  /(throat|tongue|lips?) (is |are )?(swelling|swollen|closing)|anaphyla|epipen/,
  /worst headache (of my life|ever)|thunderclap/,
];
const CRISIS = [
  /suicid|kill myself|end my life|want to die|don t want to (live|be alive)|better off dead|hurt myself|self harm|harm myself|cut myself/,
  /me suicider|me tuer|en finir avec la vie|envie de mourir/,
];
const MEDICAL_FR = [
  /(soudain|soudaine|intense|sévère|insupportable|violent|violente|pire).{0,30}(tête|poitrine|ventre)/,
  /(tête|poitrine|ventre).{0,25}(soudain|soudaine|intense|sévère|insupportable|violent|violente)/,
  /douleur (à|a) la poitrine|crise cardiaque|avc|du mal à respirer|peux pas respirer|perdu connaissance|inconscient|convulsion|surdose/,
];

// Road accidents: safety first (is anyone hurt? get out of traffic), before any paperwork advice.
const ACCIDENT = [
  /\b(i m|im|i am|i was|i ve been|i just|we re|we were|just|got) (in |had |been in )?(an? |a car |a bad |a minor |a small )?(car )?(accident|crash|collision)/,
  /\b(car|road|highway|hwy|traffic|bike|motorcycle) (accident|crash|collision)|\b(crashed|rear ended|hit by a car|got hit|was hit)\b|\bi (hit|crashed into) /,
  /\baccident (on|at|in) (the )?(highway|hwy|road|route|\d)/,
  /accident de (voiture|la route|auto)|j ai eu un accident|je viens d avoir un accident|collision/,
];

// Requests to make dangerous things (typos included): force a kind refusal plus safe alternatives.
const DANGER_THING = "(danger|dangu|dangr|deadly|lethal|toxic|toxin|poison|explosive|explosiv|bomb|nerve agent|nerve gas|chemical weapon|bio ?weapon|mustard gas|chlorine gas|ricin|sarin|anthrax|napalm|thermite|meth|fentanyl|pipe bomb|molotov|ghost gun|malware|ransomware|keylogger)";
const MAKE = "(create|creat|make|mak|build|produce|synthes|cook|brew|mix|manufactur|recipe|formula|ingredients for|how to make|how do i make|how can i make|steps to make|fabriquer|créer|creer|faire)";
const HARMFUL = [
  new RegExp(`${MAKE}.{0,40}${DANGER_THING}`),
  new RegExp(`${DANGER_THING}\\w*.{0,25}(recipe|formula|ingredients|instructions|step by step|at home)`),
  /(poison|kill|hurt) (someone|somebody|my|a person|people|him|her)/,
];

function emergencyKind(text) {
  const t = norm(text);
  if (CRISIS.some((r) => r.test(t))) return "crisis";
  if (MEDICAL.some((r) => r.test(t)) || MEDICAL_FR.some((r) => r.test(t))) return "medical";
  if (ACCIDENT.some((r) => r.test(t))) return "accident";
  if (HARMFUL.some((r) => r.test(t))) return "harmful";
  return null;
}

const EMERGENCY_PROMPT = {
  harmful: [
    "SAFETY: the user is asking how to make or use something dangerous (dangerous chemicals, poison, explosives, weapons, illegal drugs or malware), possibly with typos.",
    "Do NOT give any instructions, ingredients, quantities, recipes, code, or a web page about making it, and do not reinterpret it as a different task (for example building a website).",
    "In one or two kind, non-preachy sentences, say you can't help with making that because it could seriously hurt people.",
    "Then offer 2 or 3 safe alternatives: general chemical safety and why some household products must never be mixed (without amounts or steps), how to store or dispose of chemicals safely, or a safe science experiment.",
    "If someone may already be exposed or in danger, say to call 911 or the provincial poison centre. Reply in the user's language.",
  ].join(" "),
  medical: [
    "EMERGENCY: the user may be describing a medical emergency (for example a sudden or severe headache, chest pain, trouble breathing, stroke signs, fainting, a seizure, heavy bleeding, an overdose or a severe allergic reaction).",
    "Your FIRST line must be, in bold: tell them to call 911 now (or go to the nearest emergency department), and to not drive themselves.",
    "Then in one short sentence say why it's urgent (for example, a sudden severe headache can be a sign of bleeding in the brain or a stroke and needs to be checked right away).",
    "Then give 2 or 3 short things to do while waiting: stay with someone or unlock the door, don't eat or take more medication unless 911 tells you to, and note when it started.",
    "Do not suggest home remedies or painkillers as the main answer. Do not ask questions before telling them to call 911. Keep it short and calm. In Canada, 811 is a nurse advice line for non-emergencies in most provinces; mention it only as a last line for if it turns out to be mild.",
    "Reply in the user's language (French: « Appelle le 911 maintenant »).",
  ].join(" "),
  crisis: [
    "CRISIS: the user may be thinking about suicide or self-harm.",
    "Respond with warmth first, in plain words, without lecturing. Tell them they're not alone and that you're glad they said something.",
    "Clearly give: call or text 9-8-8 (Suicide Crisis Helpline, 24/7, free, in English or French), and if they are in immediate danger or have already hurt themselves, call 911 now.",
    "Gently ask if they are safe right now, and invite them to keep talking. Keep it short and human. Reply in the user's language.",
  ].join(" "),
  accident: [
    "ACCIDENT: the user says they are in or just had a road accident.",
    "Start with their safety, in bold: if anyone is hurt, there's a fire or fuel leak, or vehicles are blocking traffic, call 911 now. Then ask in a few words if they are okay.",
    "Then give short steps: turn on hazard lights and get to a safe spot away from traffic if they can; don't leave the scene; exchange names, licence, plate and insurance details; take photos; don't admit fault; report it to police (in many provinces, collisions above a damage amount must be reported, often at a collision reporting centre) and to their insurer.",
    "Do not state facts about the specific road or highway they named (whether it exists, where it is, its speed limit) unless that information is given to you. Keep it calm and short. Reply in the user's language.",
  ].join(" "),
};

module.exports = { emergencyKind, EMERGENCY_PROMPT };
