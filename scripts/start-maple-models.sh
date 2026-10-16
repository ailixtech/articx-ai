#!/bin/bash
# Serve the fine-tuned Maple 0.5 and Maple 0.5 Quick on this Mac -> one Cloudflare tunnel -> Firebase.
#   bash ~/ailix/apps/articx-ai/scripts/start-maple-models.sh
# Leave this window open while people test. Ctrl+C stops everything.
# (The old Ollama setup is still in scripts/start-dev-model.sh, as a fallback.)
set -e
cd "$(dirname "$0")/.."
source ~/mlx-env/bin/activate
for m in models/maple-0.5 models/maple-0.5-quick; do [ -d "$m" ] || { echo "Missing $m (run mlx_lm.fuse first)."; exit 1; }; done

PIDS=()
cleanup() { echo; echo "Stopping..."; kill "${PIDS[@]}" 2>/dev/null; }
trap cleanup EXIT

echo "0/5 Freeing memory (stopping Ollama and old servers)..."
ollama stop qwen2.5:7b 2>/dev/null || true
pkill -f "mlx_lm.server" 2>/dev/null || true
pkill -f "scripts/model-router.js" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://localhost:8090" 2>/dev/null || true
sleep 1

echo "1/5 Starting both models (about a minute)..."
mlx_lm.server --model ./models/maple-0.5-quick --port 8080 >/tmp/maple-quick.log 2>&1 & PIDS+=($!)
mlx_lm.server --model ./models/maple-0.5 --port 8081 >/tmp/maple-standard.log 2>&1 & PIDS+=($!)
for port in 8080 8081; do
  for i in $(seq 1 90); do curl -s -m 2 "http://localhost:$port/v1/models" >/dev/null && break; sleep 1; done
  curl -s -m 2 "http://localhost:$port/v1/models" >/dev/null || { echo "Model on port $port did not start. See /tmp/maple-*.log"; exit 1; }
done
node scripts/model-router.js >/tmp/maple-router.log 2>&1 & PIDS+=($!)
sleep 1
echo "   Quick: 8080 · Standard: 8081 · Router: 8090"

echo "2/5 Starting tunnel..."
LOG=/tmp/articx-tunnel.log; : > "$LOG"
cloudflared tunnel --url http://localhost:8090 --http-host-header localhost:8090 >"$LOG" 2>&1 & TUNNEL_PID=$!; PIDS+=($TUNNEL_PID)
URL=""
for i in $(seq 1 30); do URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1); [ -n "$URL" ] && break; sleep 1; done
[ -n "$URL" ] || { echo "Tunnel did not start. See $LOG"; exit 1; }
echo "   Tunnel: $URL"

echo "3/5 Testing the tunnel (new links can take up to a minute)..."
HOST=${URL#https://}; CODE=000
for i in $(seq 1 30); do
  IP=$(dig +short @1.1.1.1 "$HOST" A 2>/dev/null | grep -E '^[0-9.]+$' | head -1)
  [ -n "$IP" ] && CODE=$(curl -s -m 8 -o /dev/null -w "%{http_code}" --resolve "$HOST:443:$IP" "$URL/v1/models" || true)
  [ "$CODE" = "200" ] && break; sleep 3
done
if [ "$CODE" = "200" ]; then echo "   OK"; else echo "   Could not confirm yet ($CODE). Continuing; Firebase usually sees it fine."; fi

echo "4/5 Saving the link in Firebase (MODEL_API_URL)..."
printf '%s/v1' "$URL" > /tmp/articx-url.txt
firebase use dev >/dev/null
firebase functions:secrets:set MODEL_API_URL --data-file /tmp/articx-url.txt --force

echo "5/5 Waiting for the chat function to pick up the new link..."
sleep 20
echo ""
echo "Done. Maple 0.5 + Maple 0.5 Quick are live on https://articx-ai-dev.web.app"
echo "Keep this window open and the Mac awake. Ctrl+C to stop."
caffeinate -di -w "$TUNNEL_PID"
