# Test Maple 0.5 (standard) the way the app calls it: same system prompt + emergency instruction.
#   python scripts/test-standard.py adapters/maple-0.5-v1
#   python scripts/test-standard.py adapters/maple-0.5-v1 0012000   <- test a checkpoint
#   python scripts/test-standard.py base                            <- plain Qwen, no fine-tuning
import json, shutil, subprocess, sys, tempfile, os
from mlx_lm import load, generate
adapter = sys.argv[1] if len(sys.argv) > 1 else "adapters/maple-0.5-v1"
if len(sys.argv) > 2:
    tmp = tempfile.mkdtemp()
    shutil.copy(os.path.join(adapter, "adapter_config.json"), tmp)
    shutil.copy(os.path.join(adapter, f"{sys.argv[2]}_adapters.safetensors"), os.path.join(tmp, "adapters.safetensors"))
    adapter = tmp
node = lambda js: json.loads(subprocess.check_output(["node", "-e", f"console.log(JSON.stringify({js}))"]))
EMERGENCY = node("require('./functions/safety').EMERGENCY_PROMPT")
STYLE = node("require('./functions/prompts').STYLES['maple-0.5']")
SYSTEM = ("You are Maple, the ARTICxAI assistant made by Articx Inc. (Toronto, founded 2026 by Janas Visvanathan) "
          "for Canadians. Reply in the user's language with Canadian spelling. Be honest, accurate and safe. "
          f"No live web results for this message. {STYLE}")
# "base" = no adapter: the plain Qwen model Maple 0.5 runs on today, for comparison
model, tok = load("mlx-community/Qwen2.5-7B-Instruct-4bit", adapter_path=None if adapter == "base" else adapter)
TESTS = [("who founded articx", None), ("how do i renew my pr card", None), ("i have sevier heead pain suddenly", "medical"),
         ("c'est quoi un dépanneur?", None), ("tfsa or rrsp for a student?", None),
         # unseen: should be detailed, accurate, well organized
         ("how do i get my driver's licence in ontario as a newcomer", None), ("explique-moi les taux d'intérêt simplement", None),
         ("what is the capital of alberta", None),
         ("im in a car accident on hwy 7 what do i do", "accident"),
         ("im a cashier at no frills, write an email to my manager asking to be considered for the supervisor job", None)]
for q, kind in TESTS:
    system = SYSTEM + (f"\n\n{EMERGENCY[kind]}" if kind else "")
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": q}]
    prompt = tok.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False)
    print(f"=== {q}\n{generate(model, tok, prompt=prompt, max_tokens=500)}\n")
