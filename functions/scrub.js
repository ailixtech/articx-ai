/**
 * functions/scrub.js — removes personal details from text before it is kept for training.
 * Catches the things that follow a pattern: emails, phone numbers, SINs, card numbers, postal codes,
 * street addresses, long ID numbers, links with personal tokens. It can't catch everything (for
 * example a name in the middle of a sentence), which is why a person reviews every chat before training.
 */
const RULES = [
  // "my name is X", "je m'appelle X"
  [/\b(my name is|i am called|call me|je m'appelle|mon nom est)\s+[\p{Lu}][\p{L}'-]+(\s+[\p{Lu}][\p{L}'-]+)?/giu, "$1 [name]"],
  [/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, "[email]"],
  [/\bhttps?:\/\/\S+/gi, "[link]"],
  // Card numbers: 13–19 digits with optional spaces/dashes (checked before phone numbers).
  [/\b(?:\d[ -]?){13,19}\b/g, (m) => (luhn(m.replace(/\D/g, "")) ? "[card number]" : m)],
  // SIN: 9 digits as 123-456-789, 123 456 789 or 123456789.
  [/\b\d{3}[- ]?\d{3}[- ]?\d{3}\b/g, "[SIN]"],
  // Phone numbers (North America + international).
  [/(?:\+?\d{1,3}[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]"],
  // Canadian postal codes: A1A 1A1.
  [/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/gi, "[postal code]"],
  // US ZIP + street addresses: "123 Main Street", "45 rue Sainte-Catherine".
  [/\b\d{1,6}\s+(?:[\p{L}'.-]+\s){0,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|crescent|cres|court|ct|way|place|pl|terrace|circle|highway|hwy|trail|parkway|pkwy)\b\.?/giu, "[address]"],
  [/\b\d{1,6},?\s+(?:rue|avenue|av\.|boulevard|boul\.|chemin|ch\.|rang|route)\s+[\p{L}'.-]+(?:\s[\p{L}'.-]+){0,3}/giu, "[address]"],
  [/\b(?:apt|apartment|unit|suite|app|appartement)\.?(?:\s*#\s*|\s+)(?=\w{0,5}\d)\w{1,6}\b/gi, "[unit]"],
  // 8-digit IDs written 1234-5678 (UCI, file numbers), but not year ranges like 2025-2026.
  [/\b(?!19\d\d|20\d\d)\d{4}[- ]\d{4}\b/g, "[ID number]"],
  // Long numbers that look like IDs (UCI, health card, account, passport): 7+ digits or letters+digits.
  [/\b(?=[A-Z]{0,3}\d)[A-Z0-9]{2,4}[- ]?\d{3,4}[- ]?\d{3,4}(?:[- ]?[A-Z0-9]{2,4})?\b/g, "[ID number]"],
  [/\b\d{7,}\b/g, "[number]"],
];
function luhn(d) {
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
function scrub(text) {
  let t = String(text || "");
  for (const [re, to] of RULES) t = t.replace(re, to);
  return t;
}
module.exports = { scrub };
