# scripts/gen-chats-quick-qwen.py — clean Maple 0.5 QUICK replies, written by Qwen 2.5 14B Instruct (Apache 2.0).
# Reuses the user messages from data/chats-qwen/generated.jsonl (also Qwen-written) and has Qwen answer them
# again with the production system prompt + the QUICK style (short, answer first). Resumable.
#   python scripts/gen-chats-quick-qwen.py   -> data/chats-qwen-quick/generated.jsonl
import json, os, subprocess, time
from mlx_lm import load, generate
try:
    from mlx_lm.sample_utils import make_sampler
except ImportError:
    make_sampler = None
TEACHER = "mlx-community/Qwen2.5-14B-Instruct-4bit"
SRC, OUT = "data/chats-qwen/generated.jsonl", "data/chats-qwen-quick/generated.jsonl"
os.makedirs(os.path.dirname(OUT), exist_ok=True)
node = lambda js: json.loads(subprocess.check_output(["node", "-e", f"console.log(JSON.stringify({js}))"]))
PROD = node("require('./functions/prompts').SYSTEM_PROMPT + ' ' + require('./functions/prompts').STYLES['maple-0.5-quick']")
EMERGENCY = node("require('./functions/safety').EMERGENCY_PROMPT")
rows = [json.loads(l) for l in open(SRC, encoding="utf-8")]
done = {json.loads(l)["id"] for l in open(OUT)} if os.path.exists(OUT) else set()
todo = [r for r in rows if r["id"] not in done]
print(f"{len(done)} done, {len(todo)} to go")
model, tok = load(TEACHER)
def ask(messages, max_tokens):
    prompt = tok.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    kw = {"sampler": make_sampler(temp=0.5, top_p=0.9)} if make_sampler else {"temp": 0.5}
    return generate(model, tok, prompt=prompt, max_tokens=max_tokens, **kw).strip()
start = time.time()
with open(OUT, "a", encoding="utf-8") as out:
    for n, r in enumerate(todo, 1):
        system = PROD + (f"\n\n{EMERGENCY[r['system_kind']]}" if r["system_kind"] in EMERGENCY else "")
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": r["user1"]}]
        reply1 = ask(msgs, 300)
        reply2 = ask(msgs + [{"role": "assistant", "content": reply1}, {"role": "user", "content": r["user2"]}], 300) if r.get("user2") else ""
        out.write(json.dumps({**r, "reply1": reply1, "reply2": reply2, "teacher": TEACHER, "style": "quick"}, ensure_ascii=False) + "\n"); out.flush()
        print(f"[{n}/{len(todo)}] {r['id']} {r['category']} · ~{(time.time()-start)/n*(len(todo)-n)/60:.0f} min left", flush=True)
print("Done.")
