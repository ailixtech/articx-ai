# scripts/gen-chats-qwen.py — clean Maple 0.5 training chats, written by Qwen 2.5 14B Instruct (Apache 2.0).
# Input: data/chat-topics.txt (topic LABELS only). Qwen writes every user message and every answer,
# answering with Maple's real production system prompt (functions/prompts.js + safety.js), so facts about
# Articx and the safety rules come from your own prompt. ~30% get a follow-up turn.
#   python scripts/gen-chats-qwen.py          (resumable; output data/chats-qwen/generated.jsonl)
import json, os, random, re, subprocess, sys, time
from mlx_lm import load, generate
try:
    from mlx_lm.sample_utils import make_sampler
except ImportError:
    make_sampler = None

TEACHER = "mlx-community/Qwen2.5-14B-Instruct-4bit"
OUT = "data/chats-qwen/generated.jsonl"
PER_TOPIC = int(os.environ.get("PER_TOPIC", "3"))
os.makedirs("data/chats-qwen", exist_ok=True)
random.seed(20261014)

node = lambda js: json.loads(subprocess.check_output(["node", "-e", f"console.log(JSON.stringify({js}))"]))
PROD = node("require('./functions/prompts').SYSTEM_PROMPT + ' ' + require('./functions/prompts').STYLES['maple-0.5']")
EMERGENCY = node("require('./functions/safety').EMERGENCY_PROMPT")

topics = []
for line in open("data/chat-topics.txt", encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#"):
        cat, lang, topic = [x.strip() for x in line.split("|", 2)]
        topics.append((cat, lang, topic))
jobs = [(f"{i:03d}-{k}", *t) for i, t in enumerate(topics) for k in range(PER_TOPIC)]
done = {json.loads(l)["id"] for l in open(OUT)} if os.path.exists(OUT) else set()
jobs = [j for j in jobs if j[0] not in done]
print(f"{len(done)} done, {len(jobs)} to go")

model, tok = load(TEACHER)
def ask(messages, max_tokens, temp):
    prompt = tok.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    kw = {"sampler": make_sampler(temp=temp, top_p=0.9)} if make_sampler else {"temp": temp}
    return generate(model, tok, prompt=prompt, max_tokens=max_tokens, **kw).strip().strip('"').strip()

STYLES = ["short and casual, like typing on a phone", "a full sentence with a bit of context about their situation",
          "casual with a small typo", "polite and specific", "worried or in a hurry"]
start = time.time()
with open(OUT, "a", encoding="utf-8") as out:
    for n, (jid, cat, lang, topic) in enumerate(jobs, 1):
        where = "in French (Canadian French)" if lang == "fr" else "in English"
        style = random.choice(STYLES)
        user1 = ask([{"role": "user", "content":
            f"Write ONE message {where} that a real person in Canada might send to an AI assistant about: {topic}. "
            f"Style: {style}. Make it specific to them (a detail about their situation). 1 to 3 sentences. "
            f"Do not mention any AI's name. Output only the message."}], 90, 0.95)
        system = PROD
        kind = cat.split("-", 1)[1] if cat.startswith("emergency-") else None
        if kind in EMERGENCY: system = f"{PROD}\n\n{EMERGENCY[kind]}"
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": user1}]
        reply1 = ask(msgs, 600, 0.6)
        row = {"id": jid, "category": cat, "lang": lang, "topic": topic, "system_kind": kind or "plain",
               "user1": user1, "reply1": reply1, "user2": "", "reply2": "", "teacher": TEACHER}
        if not kind and random.random() < 0.3:
            user2 = ask([{"role": "user", "content":
                f"Here is a chat.\nPERSON: {user1}\nASSISTANT: {reply1[:1500]}\n\nWrite the person's natural next message {where} "
                f"(a follow-up question, asking for more detail on one point, asking to make it shorter, or giving one more detail "
                f"about their situation). Under 25 words. Output only the message."}], 50, 0.9)
            reply2 = ask(msgs + [{"role": "assistant", "content": reply1}, {"role": "user", "content": user2}], 500, 0.6)
            row.update(user2=user2, reply2=reply2)
        out.write(json.dumps(row, ensure_ascii=False) + "\n"); out.flush()
        eta = (time.time() - start) / n * (len(jobs) - n) / 60
        print(f"[{n}/{len(jobs)}] {jid} {cat} {lang} · ~{eta:.0f} min left", flush=True)
print("Done.")
