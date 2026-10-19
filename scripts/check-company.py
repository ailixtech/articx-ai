# Company answer check: asks Maple every question in data/eval/company-qa.json with the REAL production
# system prompt (functions/prompts.js SYSTEM_PROMPT + the model's style) and grades each answer.
#   python scripts/check-company.py adapters/maple-0.5-v3-best
#   python scripts/check-company.py adapters/maple-0.5-quick-v5-best          <- "quick" in the name = Quick style
#   python scripts/check-company.py adapters/maple-0.5-quick-v5 0000750       <- test a checkpoint
#   python scripts/check-company.py base                                      <- plain Qwen, for comparison
#   python scripts/check-company.py --selftest                                <- grade the reference answers (no model)
# Report: docs/sessions/company-check-<adapter>-<date>.md (every answer, PASS/FAIL and why).
import json, os, shutil, subprocess, sys, tempfile, unicodedata, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QA = json.load(open(os.path.join(ROOT, "data/eval/company-qa.json")))["tests"]

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower().replace("’", "'"))
    return "".join(c for c in s if not unicodedata.combining(c))

def grade(t, answer):
    a = norm(answer)
    why = []
    for group in t["must"]:
        if not any(norm(w) in a for w in group):
            why.append("missing: " + " / ".join(group))
    for w in t["must_not"]:
        if norm(w) in a:
            why.append("said: " + w)
    return not why, why

def selftest():
    bad = [(t["id"], grade(t, t["expected"])[1]) for t in QA if not grade(t, t["expected"])[0]]
    for i, w in bad: print("FAIL", i, w)
    print(f"{len(QA) - len(bad)}/{len(QA)} reference answers pass")
    sys.exit(1 if bad else 0)

def main():
    if "--selftest" in sys.argv: selftest()
    from mlx_lm import load, generate
    adapter = sys.argv[1] if len(sys.argv) > 1 else "adapters/maple-0.5-v3-best"
    label = os.path.basename(adapter.rstrip("/"))
    path = adapter
    if len(sys.argv) > 2:
        path = tempfile.mkdtemp()
        shutil.copy(os.path.join(adapter, "adapter_config.json"), path)
        shutil.copy(os.path.join(adapter, f"{sys.argv[2]}_adapters.safetensors"), os.path.join(path, "adapters.safetensors"))
        label += "-" + sys.argv[2]
    model_id = "maple-0.5-quick" if "quick" in label else "maple-0.5"
    node = lambda js: json.loads(subprocess.check_output(["node", "-e", f"console.log(JSON.stringify({js}))"], cwd=ROOT))
    system = node("require('./functions/prompts').SYSTEM_PROMPT") + "\n\n" + node(f"require('./functions/prompts').STYLES['{model_id}']")
    model, tok = load("mlx-community/Qwen2.5-7B-Instruct-4bit", adapter_path=None if adapter == "base" else path)
    rows, passed = [], 0
    for t in QA:
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": t["q"]}]
        prompt = tok.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False)
        ans = generate(model, tok, prompt=prompt, max_tokens=250 if model_id == "maple-0.5-quick" else 450).strip()
        ok, why = grade(t, ans)
        passed += ok
        print(f"{'PASS' if ok else 'FAIL'}  {t['id']:<10} {t['q']}" + ("" if ok else f"   <- {'; '.join(why)}"))
        rows.append((t, ans, ok, why))
    score = f"{passed}/{len(QA)}"
    print(f"\n{label}: {score} passed")
    day = datetime.date.today().isoformat()
    out = os.path.join(ROOT, f"docs/sessions/company-check-{label}-{day}.md")
    with open(out, "w") as f:
        f.write(f"# Company check: {label} ({model_id}), {day}\n\n**{score} passed.** Prompt: functions/prompts.js SYSTEM_PROMPT + {model_id} style.\n\n")
        cats = {}
        for t, _, ok, _ in rows: cats.setdefault(t["cat"], [0, 0]); cats[t["cat"]][0] += ok; cats[t["cat"]][1] += 1
        f.write("| Area | Passed |\n|---|---|\n" + "".join(f"| {c} | {p}/{n} |\n" for c, (p, n) in cats.items()) + "\n")
        for t, ans, ok, why in rows:
            f.write(f"## {'✅' if ok else '❌'} {t['id']}: {t['q']}\n")
            if why: f.write(f"**Problem:** {'; '.join(why)}\n\n")
            f.write(f"**Maple said:**\n> " + ans.replace("\n", "\n> ") + f"\n\n**Expected:** {t['expected']}\n\n")
    print("Report:", os.path.relpath(out, ROOT))

if __name__ == "__main__":
    main()
