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

function emergencyKind(text) {
  const t = norm(text);
  if (CRISIS.some((r) => r.test(t))) return "crisis";
  if (MEDICAL.some((r) => r.test(t)) || MEDICAL_FR.some((r) => r.test(t))) return "medical";
  return null;
}

const EMERGENCY_PROMPT = {
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
};

module.exports = { emergencyKind, EMERGENCY_PROMPT };
