#!/bin/bash
# Weekly "Help improve Maple" export → review CSV. Run on Sunday (or any day):
#   bash scripts/export-training-week.sh            # last week (Monday of the previous week)
#   bash scripts/export-training-week.sh 2026-10-12 # a specific week (its Monday, UTC)
# One-time setup (creates the export key and stores it as a Firebase secret):
#   openssl rand -hex 24 > ~/.maple-export-key && chmod 600 ~/.maple-export-key
#   firebase functions:secrets:set TRAINING_EXPORT_KEY --data-file ~/.maple-export-key
#   firebase deploy --only functions:exportTraining
# Then: open data/user-chats/review-<week>.csv, put y in "keep" for good ones (fix replies if you can:
# a corrected reply is the most valuable training example), save as CSV, and run the build scripts.
set -e
cd "$(dirname "$0")/.."
PROJECT=${PROJECT:-articx-ai-dev}
WEEK=${1:-$(python3 -c "import datetime as d;t=d.datetime.utcnow().date();m=t-d.timedelta(days=t.weekday()+7);print(m)")}
KEY=$(cat ~/.maple-export-key 2>/dev/null) || { echo "No ~/.maple-export-key — see setup at the top of this script."; exit 1; }
mkdir -p data/user-chats
OUT=data/user-chats/week-$WEEK.jsonl
curl -sf -H "x-export-key: $KEY" "https://northamerica-northeast2-$PROJECT.cloudfunctions.net/exportTraining?week=$WEEK" -o "$OUT" \
  || { echo "Export failed (deployed? key set?)"; exit 1; }
python3 - "$OUT" "data/user-chats/review-$WEEK.csv" <<'PY'
import csv, json, os, re, sys
src, dst = sys.argv[1], sys.argv[2]
rows = [json.loads(l) for l in open(src, encoding="utf-8") if l.strip()]
old = {r["id"]: r for r in csv.DictReader(open(dst, encoding="utf-8-sig"))} if os.path.exists(dst) else {}
def check(r):
    out = []
    if len(r.get("reply", "")) < 40: out.append("very short reply")
    if r.get("lang") not in ("en/fr", None): out.append(f"language: {r['lang']}")
    if len(re.findall(r"\[(email|phone|SIN|card number|address|postal code|ID number|name|unit|number)\]", json.dumps(r))) >= 3: out.append("lots of removed personal details")
    if re.search(r"(?i)as an ai|i cannot browse|i don't have access", r.get("reply", "")): out.append("weak/refusal wording")
    return "; ".join(out) or "OK (still read it)"
with open(dst, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["keep", "check", "id", "week", "model", "lang", "context", "user", "reply"])
    w.writeheader()
    for r in rows:
        turns = r.get("turns", [])
        user = turns[-1]["content"] if turns and turns[-1]["role"] == "user" else ""
        ctx = "\n".join(f"{t['role'].upper()}: {t['content']}" for t in turns[:-1])
        w.writerow(old.get(r["id"]) or {"keep": "", "check": check(r), "id": r["id"], "week": r.get("week"), "model": r.get("model"),
                                         "lang": r.get("lang"), "context": ctx, "user": user, "reply": r.get("reply", "")})
print(f"{len(rows)} chats → {dst}")
PY
