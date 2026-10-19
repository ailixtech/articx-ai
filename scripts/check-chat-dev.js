#!/usr/bin/env node
// scripts/check-chat-dev.js — ask the dev chat every question in data/eval/company-qa.json and grade it.
// Builds each request exactly like the chat function (functions/index.js): system prompt + model style,
// language note, emergency instruction, live web search (when TAVILY_API_KEY is set; weather works without it),
// then sends it to the Maple servers started by scripts/start-maple-models.sh (router on :8090).
// Only sign-in and message limits are skipped.
//   bash scripts/start-maple-models.sh          (other window)
//   node scripts/check-chat-dev.js              (both models)
//   node scripts/check-chat-dev.js maple-0.5-quick --only app,ai
//   TAVILY_API_KEY=tvly-... node scripts/check-chat-dev.js     (with web search, like the real app)
// Report: docs/sessions/chat-dev-check-<model>-<date>.md
const fs = require("node:fs"), path = require("node:path");
const ROOT = path.join(__dirname, "..");
process.chdir(path.join(ROOT, "functions")); // functions/node_modules
const { SYSTEM_PROMPT, SEARCH_SYSTEM_PROMPT, STYLES } = require(path.join(ROOT, "functions/prompts"));
const { emergencyKind, EMERGENCY_PROMPT } = require(path.join(ROOT, "functions/safety"));
const { detectLanguage, promptFor } = require(path.join(ROOT, "functions/language"));
const { getSearchContext } = require(path.join(ROOT, "functions/search"));

const URL = process.env.MODEL_URL || "http://localhost:8090/v1/chat/completions";
const MAX = { "maple-0.5": 2048, "maple-0.5-quick": 600 };
const args = process.argv.slice(2);
let only = null;
const oi = args.indexOf("--only");
if (oi >= 0) { only = args[oi + 1].split(","); args.splice(oi, 2); }
const models = args.length ? args : ["maple-0.5", "maple-0.5-quick"];
let QA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/eval/company-qa.json"), "utf8")).tests;
if (only) QA = QA.filter((t) => only.includes(t.cat));

const norm = (s) => s.toLowerCase().replace(/’/g, "'").normalize("NFKD").replace(/[̀-ͯ]/g, "");
function grade(t, answer, searched) {
  const a = norm(answer), why = [];
  // With live results the "can't confirm" wording isn't expected, so only check what it must NOT say.
  if (!searched) for (const g of t.must) if (!g.some((w) => a.includes(norm(w)))) why.push("missing: " + g.join(" / "));
  for (const w of t.must_not) if (a.includes(norm(w))) why.push("said: " + w);
  return why;
}

async function ask(model, q) {
  const emergency = emergencyKind(q);
  const search = emergency ? null : await getSearchContext(q, "");
  const lang = detectLanguage(q);
  const core = search ? SEARCH_SYSTEM_PROMPT : SYSTEM_PROMPT;
  let sys = `${core} ${STYLES[model]}`;
  if (lang) sys += `\n\n${promptFor(lang)}`;
  sys = emergency ? `${sys}\n\n${EMERGENCY_PROMPT[emergency]}` : search ? `${sys}\n\n${search.prompt}` : sys;
  const r = await fetch(URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: false, temperature: 0.7, max_tokens: MAX[model], messages: [{ role: "system", content: sys }, { role: "user", content: q }] }),
  });
  if (!r.ok) throw new Error(`model server ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return { text: (j.choices?.[0]?.message?.content || "").trim(), searched: !!search, kind: search?.kind };
}

(async () => {
  try { await fetch(URL.replace(/chat\/completions$/, "models")); }
  catch { console.error(`Can't reach ${URL}. Start the models first: bash scripts/start-maple-models.sh`); process.exit(1); }
  const day = new Date().toISOString().slice(0, 10);
  for (const model of models) {
    const rows = [];
    for (const t of QA) {
      let res;
      try { res = await ask(model, t.q); } catch (e) { res = { text: `ERROR ${e.message}`, searched: false }; }
      const why = res.text.startsWith("ERROR") ? [res.text] : grade(t, res.text, res.searched);
      console.log(`${why.length ? "FAIL" : "PASS"}  ${t.id.padEnd(10)} ${res.searched ? "[web] " : ""}${t.q}${why.length ? "   <- " + why.join("; ") : ""}`);
      rows.push({ t, ...res, why });
    }
    const by = {};
    for (const r of rows) { by[r.t.cat] ??= [0, 0]; by[r.t.cat][0] += !r.why.length; by[r.t.cat][1]++; }
    const passed = rows.filter((r) => !r.why.length).length;
    console.log("\n" + Object.entries(by).map(([c, [a, b]]) => `${c} ${a}/${b}`).join("  "));
    console.log(`\n${model} (dev chat): ${passed}/${rows.length} passed`);
    const out = path.join(ROOT, `docs/sessions/chat-dev-check-${model}-${day}.md`);
    let md = `# Dev chat check: ${model}, ${day}\n\n**${passed}/${rows.length} passed.** Same pipeline as functions/index.js chat (prompt, language, emergency, web search${process.env.TAVILY_API_KEY ? "" : " — Tavily off, weather only"}).\n\n| Area | Passed |\n|---|---|\n`;
    md += Object.entries(by).map(([c, [a, b]]) => `| ${c} | ${a}/${b} |`).join("\n") + "\n\n";
    for (const r of rows) {
      md += `## ${r.why.length ? "❌" : "✅"} ${r.t.id}: ${r.t.q}${r.searched ? ` (web: ${r.kind})` : ""}\n`;
      if (r.why.length) md += `**Problem:** ${r.why.join("; ")}\n\n`;
      md += `**Maple said:**\n> ${r.text.replace(/\n/g, "\n> ")}\n\n**Expected:** ${r.t.expected}\n\n`;
    }
    fs.writeFileSync(out, md);
    console.log("Report:", path.relative(ROOT, out), "\n");
  }
})();
