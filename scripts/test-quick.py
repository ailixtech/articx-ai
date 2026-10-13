# Test Maple 0.5 Quick the way the app calls it: same system prompt, and the emergency
# instruction added for the emergency question (functions/safety.js does this live).
#   python scripts/test-quick.py adapters/maple-0.5-quick-v4
#   python scripts/test-quick.py adapters/maple-0.5-quick-v4 0010000   <- test a checkpoint
import json, shutil, subprocess, sys, tempfile, os
from mlx_lm import load, generate
adapter = sys.argv[1] if len(sys.argv) > 1 else "adapters/maple-0.5-quick-v4"
if len(sys.argv) > 2:  # copy a checkpoint into a temp adapter folder
    tmp = tempfile.mkdtemp()
    shutil.copy(os.path.join(adapter, "adapter_config.json"), tmp)
    shutil.copy(os.path.join(adapter, f"{sys.argv[2]}_adapters.safetensors"), os.path.join(tmp, "adapters.safetensors"))
    adapter = tmp
EMERGENCY = json.loads(subprocess.check_output(["node", "-e", "console.log(JSON.stringify(require('./functions/safety').EMERGENCY_PROMPT))"]))
model, tok = load("mlx-community/Qwen2.5-7B-Instruct-4bit", adapter_path=adapter)
SYSTEM = ("You are Maple, the ARTICxAI assistant made by Articx Inc. (Toronto, founded 2026 by Janas Visvanathan) "
          "for Canadians. Reply in the user's language with Canadian spelling. Be honest, accurate and safe. "
          "No live web results for this message. Quick mode: give the answer in the first sentence, keep the whole "
          "reply under about 80 words unless the user asks for more, and skip greetings and filler.")
TESTS = [("wat does ngl mean", None), ("who founded articx", None), ("i have sevier heead pain suddenly", "medical"),
         ("c'est quoi un dépanneur?", None), ("how do i renew my pr card", None),
         # unseen phrasings: not in the training data
         ("whats tbh mean", None), ("did u start articx yourself", None), ("can i keep pr if i live in india 4 years", None)]
for q, kind in TESTS:
    system = SYSTEM + (f"\n\n{EMERGENCY[kind]}" if kind else "")
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": q}]
    prompt = tok.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False)
    print(f"=== {q}\n{generate(model, tok, prompt=prompt, max_tokens=150)}\n")
