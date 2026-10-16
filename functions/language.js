/**
 * functions/language.js — spots messages written in a language other than English or French.
 * Maple is built first for English and French; for other languages the app shows a short, honest note
 * ("I'm still learning Tamil…") once per chat, and the model gets instructions to keep it simple.
 * Detection is plain code (alphabets + common words), not the model, so it's fast and predictable.
 * Weekly anonymous counts (stats/languages_<week> = { ta: 12, pa: 7, … }, never the text) tell us which
 * languages to add training data for next.
 *
 * NOTE TEXTS: first drafts. Each should be checked by a native speaker before production.
 */
const logger = require("firebase-functions/logger");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// [code, English name, alphabet regex]
const SCRIPTS = [
  ["ta", "Tamil", /[஀-௿]/g], ["pa", "Punjabi", /[਀-੿]/g], ["gu", "Gujarati", /[઀-૿]/g],
  ["bn", "Bengali", /[ঀ-৿]/g], ["te", "Telugu", /[ఀ-౿]/g], ["kn", "Kannada", /[ಀ-೿]/g],
  ["ml", "Malayalam", /[ഀ-ൿ]/g], ["si", "Sinhala", /[඀-෿]/g], ["hi", "Hindi", /[ऀ-ॿ]/g],
  ["ar", "Arabic", /[؀-ۿݐ-ݿ]/g], ["he", "Hebrew", /[֐-׿]/g], ["th", "Thai", /[฀-๿]/g],
  ["ko", "Korean", /[가-힯ᄀ-ᇿ]/g], ["ja", "Japanese", /[぀-ヿ]/g], ["zh", "Chinese", /[一-鿿]/g],
  ["ru", "Russian", /[Ѐ-ӿ]/g], ["el", "Greek", /[Ͱ-Ͽ]/g], ["am", "Amharic", /[ሀ-፿]/g],
  ["hy", "Armenian", /[԰-֏]/g],
];
// Latin-alphabet languages: distinctive common words (lowercase, accents kept).
const WORDS = {
  es: ["el", "los", "las", "por", "para", "cómo", "como", "qué", "está", "tengo", "quiero", "hola", "gracias", "puedo", "necesito", "pero", "muy", "dónde", "cuánto", "hay", "también", "yo", "usted", "ayuda", "trabajo", "ahora"],
  pt: ["não", "você", "obrigado", "obrigada", "olá", "tenho", "quero", "preciso", "onde", "também", "muito", "eu", "isso", "são", "uma", "meu", "minha", "ajuda", "agora", "trabalho", "fazer"],
  tl: ["ako", "ikaw", "ang", "ng", "mga", "po", "salamat", "paano", "ano", "saan", "magkano", "kumusta", "hindi", "gusto", "kailangan", "naman", "lang", "ba", "ko", "mo", "sa", "trabaho"],
  it: ["ciao", "grazie", "sono", "dove", "voglio", "posso", "perché", "anche", "molto", "della", "questo", "lavoro", "aiuto", "adesso", "buongiorno", "il", "che", "non"],
  de: ["ich", "nicht", "und", "ist", "wie", "danke", "bitte", "hallo", "was", "wo", "kann", "möchte", "brauche", "der", "die", "das", "mein", "arbeit", "jetzt", "hilfe"],
  pl: ["jest", "nie", "się", "jak", "dzień", "dobry", "dziękuję", "proszę", "mam", "chcę", "gdzie", "praca", "teraz", "pomoc", "czy", "też", "bardzo"],
};
const LATIN_NAMES = { es: "Spanish", pt: "Portuguese", tl: "Tagalog", it: "Italian", de: "German", pl: "Polish", vi: "Vietnamese" };
// Typed in English letters ("Tanglish", "Hinglish"…): answer in simple English.
const ROMANIZED = {
  ta: ["enna", "epdi", "eppadi", "naan", "unga", "ungal", "inniki", "innaiku", "indru", "romba", "illa", "irukku", "iruku", "vanakkam", "sollu", "pannu", "panna", "enakku", "venum", "vendum", "seri", "nalla", "machan", "yenna", "ennoda", "theriyuma", "theriyala", "evlo", "enga", "vanga"],
  pa: ["tusi", "tuhanu", "mainu", "kiddan", "kidda", "kithe", "hega", "hegi", "sat", "akal", "paaji", "veere", "changa", "nahi", "ki", "haal"],
  hi: ["kya", "hai", "kaise", "kaisa", "mujhe", "mera", "meri", "nahi", "nahin", "hain", "aap", "tum", "kaha", "kahan", "kyun", "kitna", "chahiye", "karna", "bhai", "yaar", "acha", "accha", "theek", "batao", "kar", "raha", "rahi"],
};
const ENGLISH = ["the", "is", "are", "what", "how", "my", "i", "you", "to", "and", "for", "in", "of", "can", "do", "with", "a", "it", "this", "me", "on", "where", "when", "there"];
const FRENCH = ["le", "les", "des", "est", "je", "tu", "vous", "et", "pour", "dans", "une", "un", "comment", "quoi", "pas", "avec", "mon", "ma", "c'est", "qui", "sur", "au"];

function detectLanguage(text) {
  const t = String(text || "").replace(/<\/?pasted_text>/g, " ").slice(0, 2000);
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (!letters) return null;
  for (const [code, name, re] of SCRIPTS) {
    const n = (t.match(re) || []).length;
    if (n / letters >= 0.15) {   // low on purpose: mixed messages like "நீண்டு enabathu enna?" still count
      if (code === "ar") {   // Arabic alphabet: Urdu or Persian?
        if (/[ٹڈڑںےۓ]/.test(t)) return { code: "ur", name: "Urdu", mode: "native" };
        if (/[پچژگ]/.test(t)) return { code: "fa", name: "Persian", mode: "native" };
      }
      if (code === "ru" && /[іїєґІЇЄҐ]/.test(t)) return { code: "uk", name: "Ukrainian", mode: "native" };
      if (code === "zh" && /[぀-ヿ]/.test(t)) return { code: "ja", name: "Japanese", mode: "native" };
      return { code, name, mode: "native" };
    }
  }
  if ((t.match(/[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ]/giu) || []).length >= 2) return { code: "vi", name: "Vietnamese", mode: "native" };
  const words = t.toLowerCase().match(/[\p{L}']+/gu) || [];
  const hits = (list) => words.filter((w) => list.includes(w)).length;
  const base = Math.max(hits(ENGLISH), hits(FRENCH));
  let best = null;
  for (const [code, list] of Object.entries(ROMANIZED)) {
    const n = hits(list);
    if (n >= 2 && n > base && (!best || n > best.n)) best = { code, n, mode: "romanized" };
  }
  for (const [code, list] of Object.entries(WORDS)) {
    const n = hits(list);
    if (n >= 2 && n > base && (!best || n > best.n)) best = { code, n, mode: "native" };
  }
  if (!best) return null;
  const name = best.mode === "romanized" ? { ta: "Tamil", pa: "Punjabi", hi: "Hindi" }[best.code] : LATIN_NAMES[best.code];
  return { code: best.code, name, mode: best.mode };
}

// The note, in the user's language (first drafts: have each checked by a native speaker) + English.
const NATIVE = {
  ta: "நான் இன்னும் தமிழ் மொழியைக் கற்றுக்கொண்டிருக்கிறேன். எனவே, எனது வார்த்தைகளிலோ, அர்த்தங்களிலோ அல்லது பதில்களிலோ ஏதேனும் வேறுபாடுகள் இருந்தால், தயவுசெய்து மன்னிக்கவும். என்னால் முடிந்தவற்றை உங்களுடன் பகிர்ந்துகொள்வதில் நான் மிகவும் ஆர்வமாக இருக்கிறேன்.", // ✅ checked by Janas (native)
  hi: "मैं अभी हिंदी सीख रहा हूँ। कुछ शब्द स्वाभाविक न लगें, तो माफ़ कीजिए! कुछ समझ न आए तो मुझसे अंग्रेज़ी में समझाने को कहें।",
  pa: "ਮੈਂ ਅਜੇ ਪੰਜਾਬੀ ਸਿੱਖ ਰਿਹਾ ਹਾਂ। ਕੁਝ ਸ਼ਬਦ ਠੀਕ ਨਾ ਲੱਗਣ ਤਾਂ ਮਾਫ਼ ਕਰਨਾ! ਸਮਝ ਨਾ ਆਵੇ ਤਾਂ ਮੈਨੂੰ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਸਮਝਾਉਣ ਲਈ ਕਹੋ।",
  ur: "میں ابھی اردو سیکھ رہا ہوں۔ اگر کچھ الفاظ فطری نہ لگیں تو معذرت! سمجھ نہ آئے تو مجھ سے انگریزی میں سمجھانے کو کہیں۔",
  ar: "ما زلت أتعلم العربية. قد لا تبدو بعض الكلمات طبيعية، فأعتذر عن أي خطأ! إذا لم يكن شيء واضحًا، اطلب مني الشرح بالإنجليزية.",
  fa: "من هنوز در حال یادگیری فارسی هستم. ممکن است بعضی کلمات طبیعی نباشند، بابت اشتباهات عذر می‌خواهم! اگر چیزی واضح نبود، از من بخواهید به انگلیسی توضیح بدهم.",
  zh: "我还在学习中文，有些用词可能不太自然，请见谅！如果有不清楚的地方，可以请我用英文解释。",
  ko: "저는 아직 한국어를 배우는 중이에요. 표현이 어색할 수 있으니 양해 부탁드려요! 이해가 안 되면 영어로 설명해 달라고 해 주세요.",
  ja: "日本語はまだ勉強中です。不自然な表現があったらごめんなさい！わかりにくい場合は、英語での説明をお願いしてください。",
  es: "Todavía estoy aprendiendo español. Algunas palabras pueden no sonar naturales, ¡disculpa los errores! Si algo no está claro, pídeme que te lo explique en inglés.",
  pt: "Ainda estou aprendendo português. Algumas palavras podem não soar naturais, desculpe pelos erros! Se algo não ficar claro, peça para eu explicar em inglês.",
  tl: "Nag-aaral pa ako ng Tagalog. Baka may mga salitang hindi natural, pasensya na po sa mga mali! Kung may hindi malinaw, pakisabi na ipaliwanag ko sa Ingles.",
  it: "Sto ancora imparando l'italiano. Alcune parole potrebbero non suonare naturali, scusa per gli errori! Se qualcosa non è chiaro, chiedimi di spiegarlo in inglese.",
  de: "Ich lerne noch Deutsch. Manche Wörter klingen vielleicht nicht natürlich, entschuldige die Fehler! Wenn etwas unklar ist, bitte mich, es auf Englisch zu erklären.",
  ru: "Я ещё изучаю русский язык. Некоторые слова могут звучать неестественно — извините за ошибки! Если что-то непонятно, попросите меня объяснить по-английски.",
  uk: "Я ще вивчаю українську мову. Деякі слова можуть звучати неприродно — вибачте за помилки! Якщо щось незрозуміло, попросіть мене пояснити англійською.",
  vi: "Mình vẫn đang học tiếng Việt. Một số từ có thể chưa tự nhiên, xin lỗi vì những sai sót! Nếu có gì chưa rõ, hãy nhờ mình giải thích bằng tiếng Anh.",
  pl: "Wciąż uczę się polskiego. Niektóre słowa mogą brzmieć nienaturalnie — przepraszam za błędy! Jeśli coś jest niejasne, poproś mnie o wyjaśnienie po angielsku.",
};
function noticeFor(lang) {
  if (lang.mode === "romanized") {
    return { code: lang.code, mode: lang.mode, text: "",
      en: `Looks like ${lang.name} typed in English letters! I'm still learning ${lang.name}, so I'll answer in simple English. Sorry for any mix-ups.` };
  }
  return { code: lang.code, mode: lang.mode, text: NATIVE[lang.code] || "",
    en: `I'm still learning ${lang.name}. So please forgive me if there are any differences or mistakes in my words, meanings or answers. I'm very happy to share whatever I can with you. (If something is unclear, ask me to explain in English.)` };
}
// Extra instruction for the model.
function promptFor(lang) {
  return lang.mode === "romanized"
    ? `LANGUAGE: the user wrote ${lang.name} using English letters. Reply in simple, clear English (a friendly ${lang.name} greeting word is fine). Do not mention that you are learning; the app already shows that note.`
    : `LANGUAGE: the user wrote in ${lang.name}. Reply in ${lang.name}, using short, simple sentences. If you are not sure of a word (especially official terms), add the English term in brackets. Keep names of Canadian programs and offices in English (for example "PR card", "IRCC", "CRA"). Do not mention that you are learning; the app already shows that note.`;
}

// Anonymous weekly count of languages used (no text, no account).
async function countLanguage(lang, week) {
  try {
    await getFirestore().doc(`stats/languages_${week}`).set({ [lang ? lang.code + (lang.mode === "romanized" ? "_rom" : "") : "en_fr"]: FieldValue.increment(1) }, { merge: true });
  } catch (e) { logger.warn("Language count failed", e); }
}

module.exports = { detectLanguage, noticeFor, promptFor, countLanguage };
