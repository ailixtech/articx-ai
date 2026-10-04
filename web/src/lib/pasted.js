// Long pastes travel inside the message text as <pasted_text> blocks, ahead of what was typed.
// The model reads them as-is; the app shows each block as a "Pasted" card.
const BLOCK = /<pasted_text>\n?([\s\S]*?)\n?<\/pasted_text>\s*/g;

// A paste this long (or with this many lines) becomes a card instead of going into the text box.
export const isLongPaste = (text) => text.length >= 1200 || text.split("\n").length > 15;

export function joinPasted(pastes, text) {
  const blocks = pastes.map((p) => `<pasted_text>\n${p}\n</pasted_text>`);
  return [...blocks, text.trim()].filter(Boolean).join("\n\n");
}

export function splitPasted(content) {
  const pastes = [];
  const text = content.replace(BLOCK, (_, p) => { pastes.push(p); return ""; }).trim();
  return { pastes, text };
}

// A short plain label for a message (chat titles): typed text first, else the paste's first line.
export function plainText(content) {
  const { pastes, text } = splitPasted(content);
  return text || (pastes[0] || "").trim().split("\n")[0];
}
