#!/bin/bash
# Start Maple dev serving: Ollama on this Mac -> Cloudflare tunnel -> Firebase chat function.
# Run from anywhere:  bash ~/ailix/apps/articx-ai/scripts/start-dev-model.sh
# Leave this window open while people test. Ctrl+C stops everything.
set -e
cd "$(dirname "$0")/.."

echo "1/5 Checking Ollama..."
if ! curl -s -m 3 http://localhost:11434/api/tags >/dev/null; then
  open -a Ollama 2>/dev/null || (ollama serve >/tmp/ollama.log 2>&1 &)
  for i in $(seq 1 20); do curl -s -m 2 http://localhost:11434/api/tags >/dev/null && break; sleep 1; done
fi
curl -s -m 3 http://localhost:11434/api/tags >/dev/null || { echo "Ollama is not running. Open the Ollama app and try again."; exit 1; }
ollama list | grep -q "qwen2.5:7b" || ollama pull qwen2.5:7b

echo "2/5 Starting tunnel..."
pkill -f "cloudflared tunnel --url http://localhost:11434" 2>/dev/null || true
LOG=/tmp/articx-tunnel.log; : > "$LOG"
cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434 >"$LOG" 2>&1 &
TUNNEL_PID=$!
URL=""
for i in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1)
  [ -n "$URL" ] && break; sleep 1
done
[ -n "$URL" ] || { echo "Tunnel did not start. See $LOG"; kill $TUNNEL_PID; exit 1; }
echo "   Tunnel: $URL"

echo "3/5 Testing the tunnel (new links can take up to a minute)..."
HOST=${URL#https://}
CODE=000
for i in $(seq 1 30); do
  IP=$(dig +short @1.1.1.1 "$HOST" A 2>/dev/null | grep -E '^[0-9.]+$' | head -1)
  if [ -n "$IP" ]; then
    CODE=$(curl -s -m 8 -o /dev/null -w "%{http_code}" --resolve "$HOST:443:$IP" "$URL/api/tags" || true)
  fi
  [ "$CODE" = "200" ] && break
  [ "$CODE" = "403" ] && { echo "   Ollama refused the request (403). Check $LOG"; kill $TUNNEL_PID; exit 1; }
  sleep 3
done
if [ "$CODE" = "200" ]; then echo "   OK"; else echo "   Could not confirm yet ($CODE). Continuing; Firebase usually sees it fine."; fi

echo "4/5 Saving the link in Firebase (MODEL_API_URL)..."
printf '%s/v1' "$URL" > /tmp/articx-url.txt
firebase use dev >/dev/null
# Setting the secret also redeploys every function that uses it (chat), so no full deploy is needed.
firebase functions:secrets:set MODEL_API_URL --data-file /tmp/articx-url.txt --force

echo "5/5 Waiting for the chat function to pick up the new link..."
sleep 20
echo ""
echo "Done. Maple is live on https://articx-ai-dev.web.app"
echo "Keep this window open and the Mac awake. Ctrl+C to stop."
trap "kill $TUNNEL_PID 2>/dev/null" EXIT
caffeinate -di -w $TUNNEL_PID
