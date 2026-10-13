# Maple 0.5 Quick — v3 → v4 (Oct 11–12, 2026)

## Results
| Version | Data | Steps | Shipped? | Notes |
|---|---|---|---|---|
| v3 | 3,717 ex | 6,500 | No | Founder ✅ (with system prompt), PR card ❌ (no 730), ngl ✅ |
| v4 | 7,811 ex | 14,000 | **Yes: checkpoint 0012000** | Founder, PR card, 911, dépanneur, "did you found articx" ✅ · ngl ⚠️ "no lie" |

v4 val loss was noisy (0.118 at 12k, 0.204 at 14k) because valid shares paraphrases with train. Trust test-quick.py, not val loss.

## What changed in the data (v4)
- `scripts/train-keyfacts.js` (new): critical facts × many phrasings; `use:` reuses answers from train-immigration.js so each fact has one wording.
- "Did you found Articx?" → "No, I'm Maple, an AI…" (stops answering as the founder).
- Section N in build-maple-quick.js: casual variants of every knowledge question (keyfacts ×4, immigration ×2, others ×1). Typos 120 → 600.
- Fixes: PR renewal answer leads with 730 days + 5-year validity; dice/coin answer split; « dep » quote removed; "rl-1 vs t4" FR duplicate removed.
- Backup of v3 data: `data/maple-quick-v3-backup`.

## Lessons
- The model reads facts from the system prompt. Always test WITH the production system prompt (test-quick.py does this).
- Emergency test must include EMERGENCY_PROMPT (safety.js adds it live) — test-quick.py does this.
- Words used as filler in training (ngl, fr, rn…) lose their meaning unless taught explicitly. Fixed for v5 (slang key facts).
- 3 facts × 3 phrasings is not enough to memorize; ~25+ exposures works.

## Shipped (dev)
- `adapters/maple-0.5-quick-v4-best` = 0012000 → fused to `models/maple-0.5-quick`
- `mlx_lm.server --model ./models/maple-0.5-quick --port 8080` + cloudflared tunnel → MODEL_API_URL_QUICK in functions/.env.articx-ai-dev
- Maple 0.5 (standard) still on base Qwen 2.5 7B via Ollama (not fine-tuned yet).

## Next
- [ ] v5: `node scripts/build-maple-quick.js` (includes slang key facts), train `maple-0.5-quick-v5`, 14,000 steps, overnight. Stop the MLX server + Ollama first (memory).
- [ ] v5: split train/valid by fact, so val loss is meaningful.
- [ ] PR "4 years abroad" answers: add examples that state the conclusion, not just the rule.
- [ ] Maple 0.5 standard fine-tune (longer "detailed" answers), after Quick is stable.
- [ ] Back up: `hf upload articx/maple-0.5-quick adapters/maple-0.5-quick-v4-best v4 --repo-type model --private`
- [ ] Commit scripts + notes to GitHub.
