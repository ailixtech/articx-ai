# scripts/build-maple-clean.py — clean Maple 0.5 dataset: ONLY Qwen-written chats (+ emails).
#   python scripts/build-maple-clean.py [--auto-emails]
# Sources: data/chats-qwen/generated.jsonl (auto-filtered), data/emails-qwen/review.csv (keep=y; with
# --auto-emails also English rows whose check is OK, until you finish reviewing).
# No Claude-written data. Each answer appears once. Writes data/maple-0.5-clean/{train,valid}.jsonl
#   --quick : Quick model instead (data/chats-qwen-quick -> data/maple-0.5-quick-clean, quick style)
import csv, json, os, random, re, subprocess, sys
random.seed(7)
QUICK = "--quick" in sys.argv
OUT = "data/maple-0.5-quick-clean" if QUICK else "data/maple-0.5-clean"; os.makedirs(OUT, exist_ok=True)
CHATS = "data/chats-qwen-quick/generated.jsonl" if QUICK else "data/chats-qwen/generated.jsonl"
STYLE = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./functions/prompts').STYLES['" + ("maple-0.5-quick" if QUICK else "maple-0.5") + "']))"]))
EMERGENCY = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./functions/safety').EMERGENCY_PROMPT))"]))
# Short training system prompt (same as the test script); the full production prompt still applies live.
SYSTEM = ("You are Maple, the ARTICxAI assistant made by Articx Inc. (Toronto, founded 2026 by Janas Visvanathan) "
          f"for Canadians. Reply in the user's language with Canadian spelling. Be honest, accurate and safe. No live web results for this message. {STYLE}")

def bad(text, reply=True):
    return bool(re.search(r"[\u4e00-\u9fff]", text) or re.search(r"(?i)\b(qwen|alibaba|tongyi|openai|chatgpt is my|as an ai language model)\b", text)
                or len(text.strip()) < (20 if reply else 2))

examples, dropped = [], {"chats": 0, "emails": 0}
for l in open(CHATS, encoding="utf-8"):
    r = json.loads(l)
    system = SYSTEM + (f"\n\n{EMERGENCY[r['system_kind']]}" if r["system_kind"] in EMERGENCY else "")
    if bad(r["user1"], False) or bad(r["reply1"]): dropped["chats"] += 1; continue
    base = [{"role": "system", "content": system}, {"role": "user", "content": r["user1"]}, {"role": "assistant", "content": r["reply1"]}]
    examples.append({"src": "chat", "messages": base})
    if r.get("user2") and r.get("reply2") and not bad(r["user2"], False) and not bad(r["reply2"]):
        examples.append({"src": "chat-followup", "messages": base + [{"role": "user", "content": r["user2"]}, {"role": "assistant", "content": r["reply2"]}]})

auto = "--auto-emails" in sys.argv
n_email = 0
if os.path.exists("data/emails-qwen/review.csv"):
    for r in csv.DictReader(open("data/emails-qwen/review.csv", encoding="utf-8-sig")):
        keep = r.get("keep", "").strip().lower() in ("y", "yes", "1", "x", "✓")
        if not keep and not (auto and r.get("lang") == "en" and r.get("check", "").startswith("OK")): continue
        if not r.get("user1") or bad(r["reply1"]): dropped["emails"] += 1; continue
        base = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": r["user1"]}, {"role": "assistant", "content": r["reply1"]}]
        examples.append({"src": "email", "messages": base}); n_email += 1
        if r.get("user2") and r.get("reply2"):
            examples.append({"src": "email-rewrite", "messages": base + [{"role": "user", "content": r["user2"]}, {"role": "assistant", "content": r["reply2"]}]})

random.shuffle(examples)
nv = max(20, round(len(examples) * 0.08))
splits = {"valid": examples[:nv], "train": examples[nv:]}
for k, rows in splits.items():
    with open(f"{OUT}/{k}.jsonl", "w", encoding="utf-8") as f:
        for r in rows: f.write(json.dumps({"messages": r["messages"]}, ensure_ascii=False) + "\n")
from collections import Counter
print(f"Wrote {OUT}: train {len(splits['train'])}, valid {len(splits['valid'])} · by source {dict(Counter(e['src'] for e in examples))} · emails used {n_email} · dropped {dropped}")
