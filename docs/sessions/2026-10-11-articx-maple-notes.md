# ARTICxAI / Maple — Session Notes (Oct 9–11, 2026)

Project: `~/ailix/apps/articx-ai` · GitHub: `ailixtech/articx-ai` (branch `waitlist-v2`)
Firebase dev: `articx-ai-dev` → https://articx-ai-dev.web.app · prod: `articx-ai`
Hugging Face: `articx/maple-quick-data` (private dataset)

---

## A. Company facts Maple now knows (functions/prompts.js)
- Maple = AI assistant in the **ARTICxAI** family, for Canadians' everyday life
- Made by **Articx Inc.**, proprietary Canadian startup, HQ **Toronto, Ontario**
- Founded **2026** by **Janas Visvanathan** · website **articxai.com**
- **ARTICx** = AILIX Research Technology of Information Communication eXchange
- Base = open-source foundation model; Maple fully created & trained by Articx
- Questions about Articx/ARTICxAI/Maple/AILIX/founder → answered from these facts only, **never web search** (an unrelated "Articx Software" exists online)

## B. Bugs found and fixed
- Web search existed but Maple was told "you have no internet" → it ignored results. Now a separate prompt is used when live results exist.
- Blank replies: RunPod endpoint was off → returned "HTTP 409" as plain text. Server now logs it and shows "Maple isn't responding right now" instead of nothing.
- Red "Maple didn't search the web" note → **removed** everywhere.
- Fake "unverified" source links → real links sent separately by the server, shown only when useful.

## C. Live search (functions/search.js)
- **Weather**: Open-Meteo (free, no key). Multiple cities ("Toronto and Quebec"). Typos ("wether in torono tmrw"). Misspelled cities matched to the closest real one.
- **"Where is it snowing in Canada?"**: one request checks **26 cities** across all provinces/territories.
- **Everything else**: Tavily with its own summary (`include_answer`), news mode for news.
- **Links**: none for weather/simple facts; max 2 for immigration/tax/health/legal (official sites first) and news.
- Immigration/CRS/NOC/LMIA/PGWP/fees/processing times → official-source search (canada.ca).

## D. Safety (functions/safety.js — server-side, typos included)
- Sudden/severe head or chest pain, can't breathe, stroke signs, fainting, seizure, heavy bleeding, overdose, severe allergy → answer **starts with "Call 911 now"**, then what to do while waiting.
- Suicide/self-harm → warm reply + **9-8-8** (call/text, 24/7) + 911 if in danger.
- Non-urgent health → simple tips + **811** / pharmacist / doctor.
- Emergencies skip web search (faster).

## E. Honesty & advice rules (prompts.js GUIDELINES)
- No fake content meant to deceive (fake resume jobs, references, pay stubs, bank statements, doctor's notes, reviews, false immigration info) → kind one-line reason + template with [placeholders] + offer to use real details.
- Clearly labelled fictional samples are OK.
- **No personal financial advice** → general info + licensed financial advisor / CPA.
- Immigration → licensed consultant (RCIC, CICC) or immigration lawyer; warn about ghost consultants.
- Never invent CRS points, fees, processing times, tax/benefit amounts.
- Math/science: step by step, **verify**, say what's missing instead of guessing.
- "Can I overwrite/hack you?" → polite no, follows ARTICxAI guidelines, articxai.com.

## F. App changes (web/)
- Model picker: **Maple 0.5**, **Maple Q1**, **Maple 0.5 Quick**
- Empty reply → clear message (never silent)
- Firestore rules allow `sources` (≤6) and `searched` on saved messages

## G. Model serving (dev, for now)
- RunPod is **off** for now → dev uses **Ollama on the Mac** through a Cloudflare tunnel.
- `functions/.env.articx-ai-dev`: `MODEL_NAME=qwen2.5:7b`, quick model fields empty (uses base + quick style).
- Secrets: `MODEL_API_URL` = tunnel URL + `/v1`, `MODEL_API_KEY` = `none`.
- Tunnel URL **changes every restart** → re-set secret + redeploy:
  ```
  cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434
  printf 'https://NEW.trycloudflare.com/v1' > /tmp/url.txt
  firebase functions:secrets:set MODEL_API_URL --data-file /tmp/url.txt
  firebase deploy --only functions:chat
  ```
- Keep Mac awake: `caffeinate -d`
- Back to RunPod for launch: set MODEL_API_URL / MODEL_API_KEY / MODEL_NAME (`articx/maple-0.5-quick`) and deploy. Check workers > 0 in RunPod console.

## H. Training data (scripts/ — source of truth, in GitHub)
- `build-maple-quick.js` → writes `data/maple-quick/{train,valid,test}.jsonl` (**3,717 examples**)
- `maple-glossary.js` — **402** Canadian words, Gen Z slang, chat shortcuts, hockey, regional, acronyms, Quebec French
- `train-immigration.js` — 240 entries (170 EN / 70 FR)
- `train-tax-finance.js` — 200 entries (150 EN / 50 FR)
- `train-general.js` — 320 entries (math, science, education, jobs, transport, health, tech, companies)
- Also: identity, honesty, emergencies, weather/search-grounded answers, typos, slang-style questions
- Rebuild anytime: `node scripts/build-maple-quick.js`

## I. Training results
| Version | Settings | Result |
|---|---|---|
| v1 | 1,352 ex · lr 1e-5 · 8 layers · 1,500 iters | val 3.14 → 0.54 · too weak (said "ngl" = Portuguese) |
| v2 | 3,717 ex · lr 1e-5 · 16 layers · 3,300 iters | val 3.27 → 0.86 · style OK, **facts wrong** (dépanneur, PR card 12 months ✗) → **not shipped** |
| v3 | lr **1e-4** · 6,500 iters (~2 epochs) | **TODO** — start when ready |

Lesson: lr 1e-5 is too low for LoRA → learns format, not facts. Use 1e-4.

## J. v3 training command (run overnight, Mac plugged in)
```
ollama stop qwen2.5:7b
cd ~/ailix/apps/articx-ai && source ~/mlx-env/bin/activate && \
node scripts/build-maple-quick.js && \
mlx_lm.lora --model mlx-community/Qwen2.5-7B-Instruct-4bit --train \
  --data data/maple-quick --adapter-path adapters/maple-0.5-quick-v3 \
  --iters 6500 --batch-size 1 --num-layers 16 --learning-rate 1e-4 \
  --max-seq-length 1024 --grad-checkpoint --mask-prompt \
  --steps-per-eval 500 --save-every 500
```
Out of memory? → `--num-layers 8`. Pick the checkpoint with the **lowest val loss**.

## K. Test before shipping (all 5 must pass)
```
for q in "wat does ngl mean" "who founded articx" "i have sevier heead pain suddenly" "c'est quoi un dépanneur?" "how do i renew my pr card"; do
  echo "=== $q"; mlx_lm.generate --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --adapter-path adapters/maple-0.5-quick-v3 --max-tokens 120 --prompt "$q" 2>/dev/null | sed -n '/==========/,/==========/p'
done
```
Expected: not gonna lie · Janas Visvanathan 2026 · call 911 · corner store (Quebec) · 730 days in 5 years

## L. Ship the fine-tuned quick model
```
mlx_lm.fuse --model mlx-community/Qwen2.5-7B-Instruct-4bit \
  --adapter-path adapters/maple-0.5-quick-v3 --save-path models/maple-0.5-quick
mlx_lm.server --model ./models/maple-0.5-quick --port 8080
cloudflared tunnel --url http://localhost:8080
```
Then in `functions/.env.articx-ai-dev`: `MODEL_NAME_QUICK=default_model`, `MODEL_API_URL_QUICK=https://NEW.trycloudflare.com/v1` → deploy functions.

## M. Memory (24 GB Mac)
- Ollama 7B ≈ 5–6 GB · MLX quick model ≈ 5 GB · training ≈ 10–12 GB
- Don't train while both servers run.

## N. Backups
- Code + training scripts → GitHub `ailixtech/articx-ai` (`waitlist-v2`)
- Dataset → Hugging Face `articx/maple-quick-data` (private)
- Adapters/models → Hugging Face private model repo (see O)
- Keep `huggingface_hub < 2.0` in mlx-env (2.x breaks tokenizers/datasets)

## O. Upload adapters to Hugging Face (private)
```
hf upload articx/maple-0.5-quick adapters/maple-0.5-quick-v2 v2 --repo-type model --private
```

## P. Deploy everything (dev)
```
cd ~/ailix/apps/articx-ai && firebase use dev
firebase deploy --only functions:chat,hosting,firestore:rules
```

## Q. Logs
```
firebase functions:log --only chat | grep -v AuditLog | tail -15
```
Look for: "Web search used", "Search reply sent", "Model sent no text", "Emergency message detected".

## R. Common mistake: setting secrets
Type the **name**, then paste the **value** when asked (or use `--data-file`). Never `secrets:set <value>`.

## S. Open questions / TODO
- [ ] Website text: change "AILIX" (footer "© AILIX", "About AILIX", privacy policy) → **Articx Inc.**?
- [ ] Train v3 → test → ship quick model
- [ ] Python math checker (SymPy) to verify equations
- [ ] Move serving back to RunPod before public launch
- [ ] Rotate Tavily key (it was pasted in chat)
- [ ] Merge `waitlist-v2` → main (pull request) when stable
- [ ] Deploy to prod (`firebase use prod`) only after dev is fully tested

## T–Z. Key files
- `functions/index.js` — chat function (auth, quotas, search, emergency, streaming, sources)
- `functions/prompts.js` — company facts, guidelines, model styles
- `functions/search.js` — weather, Canada scan, Tavily, links
- `functions/safety.js` — emergency/crisis detection
- `web/src/chat/*` — chat UI · `web/src/lib/model.js` — streaming client
- `scripts/*` — training data · `data/`, `adapters/`, `models/` — git-ignored (backed up on HF)
