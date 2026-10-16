#!/bin/bash
# Maple 0.5 Quick v5 — CLEAN data only. Unattended:  bash scripts/train-clean-quick-v5.sh
# 1) Qwen 14B re-answers the clean chats in Quick style  2) build  3) train  4) test checkpoints.
set -e
cd "$(dirname "$0")/.."
source ~/mlx-env/bin/activate
LOG=docs/sessions/maple-quick-v5-run.log
exec > >(tee -a "$LOG") 2>&1
echo "=== $(date) Maple 0.5 Quick v5 clean run"
ollama stop qwen2.5:7b 2>/dev/null || true
pkill -f "mlx_lm.server" 2>/dev/null || true
pkill -f "scripts/model-router.js" 2>/dev/null || true
caffeinate -dis -w $$ &
echo "1/4 Qwen 14B writes Quick replies..."
python scripts/gen-chats-quick-qwen.py
echo "2/4 Building..."
python scripts/build-maple-clean.py --quick --auto-emails
N=$(wc -l < data/maple-0.5-quick-clean/train.jsonl)
ITERS=$(( (N * 2 / 250 + 1) * 250 ))
echo "   train examples: $N -> $ITERS steps"
echo "3/4 Training adapters/maple-0.5-quick-v5..."
mlx_lm.lora --model mlx-community/Qwen2.5-7B-Instruct-4bit --train \
  --data data/maple-0.5-quick-clean --adapter-path adapters/maple-0.5-quick-v5 \
  --iters $ITERS --batch-size 1 --num-layers 16 --learning-rate 5e-5 \
  --max-seq-length 2048 --grad-checkpoint --mask-prompt \
  --steps-per-eval 250 --save-every 250
echo "4/4 Testing checkpoints..."
T=docs/sessions/maple-quick-v5-tests.txt; : > "$T"
for c in $(printf "%07d\n" 750 $((ITERS/2/250*250)) $ITERS | sort -u); do
  [ -f "adapters/maple-0.5-quick-v5/${c}_adapters.safetensors" ] || continue
  echo "########## $c" | tee -a "$T"; python scripts/test-quick.py adapters/maple-0.5-quick-v5 $c 2>/dev/null | tee -a "$T"
done
echo "=== $(date) Done. Results: $T"
