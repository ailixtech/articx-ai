#!/bin/bash
# Maple 0.5 v3 — CLEAN data only (Qwen-written chats + Qwen emails). Runs unattended overnight:
#   bash scripts/train-clean-v3.sh
# 1) Qwen 2.5 14B writes ~435 chats (resumable)  2) build dataset  3) train  4) test checkpoints.
set -e
cd "$(dirname "$0")/.."
source ~/mlx-env/bin/activate
LOG=docs/sessions/maple-0.5-v3-run.log
exec > >(tee -a "$LOG") 2>&1
echo "=== $(date) Maple 0.5 v3 clean run"

echo "0/4 Freeing memory..."
ollama stop qwen2.5:7b 2>/dev/null || true
pkill -f "mlx_lm.server" 2>/dev/null || true
pkill -f "scripts/model-router.js" 2>/dev/null || true
caffeinate -dis -w $$ &

echo "1/4 Qwen 14B writes the chats (first run downloads ~8 GB)..."
python scripts/gen-chats-qwen.py

echo "2/4 Building the clean dataset..."
python scripts/build-maple-clean.py --auto-emails
N=$(wc -l < data/maple-0.5-clean/train.jsonl)
ITERS=$(( (N * 2 / 250 + 1) * 250 ))   # about 2 passes, rounded to the save interval
echo "   train examples: $N -> $ITERS steps"

echo "3/4 Training adapters/maple-0.5-v3..."
mlx_lm.lora --model mlx-community/Qwen2.5-7B-Instruct-4bit --train \
  --data data/maple-0.5-clean --adapter-path adapters/maple-0.5-v3 \
  --iters $ITERS --batch-size 1 --num-layers 16 --learning-rate 5e-5 \
  --max-seq-length 2048 --grad-checkpoint --mask-prompt \
  --steps-per-eval 250 --save-every 250

echo "4/4 Testing checkpoints..."
T=docs/sessions/maple-0.5-v3-tests.txt; : > "$T"
for c in $(printf "%07d\n" $((ITERS/3/250*250)) $((ITERS*2/3/250*250)) $ITERS | sort -u); do
  [ -f "adapters/maple-0.5-v3/${c}_adapters.safetensors" ] || continue
  echo "########## $c" | tee -a "$T"; python scripts/test-standard.py adapters/maple-0.5-v3 $c 2>/dev/null | tee -a "$T"
done
echo "=== $(date) Done. Results: $T"
