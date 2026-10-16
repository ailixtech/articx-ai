# scripts/gen-emails-qwen.py — email/letter training chats for Maple, written by Qwen 2.5 7B Instruct
# (Apache 2.0: its outputs may be used to train Maple). Only the scenario TITLES come from
# data/email-scenarios.json; every message in the chats is written here by Qwen.
#
#   python scripts/gen-emails-qwen.py            # generate (resumable: skips scenarios already done)
#   python scripts/gen-emails-qwen.py --csv      # write data/emails-qwen/review.csv for you to review
#
# Each chat: user asks for an email -> Maple writes it -> user asks for a change (more polite,
# shorter, more formal, friendlier) -> Maple really rewrites it. Every 5th one is in French.
# Review: open review.csv, put y in the "keep" column for good ones (fix text if needed), save as CSV.
# Then: node scripts/build-maple-quick.js --standard   (adds the kept ones)
import csv, json, os, random, sys, time
from mlx_lm import load, generate
try:
    from mlx_lm.sample_utils import make_sampler
except ImportError:
    make_sampler = None

MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit"
SCEN = "data/email-scenarios.json"
OUT = "data/emails-qwen/generated.jsonl"
CSV = "data/emails-qwen/review.csv"
random.seed(20261014)

if "--csv" in sys.argv:
    rows = [json.loads(l) for l in open(OUT)]
    old = {}
    if os.path.exists(CSV):  # keep earlier review decisions and edits
        for r in csv.DictReader(open(CSV, encoding="utf-8")): old[r["id"]] = r
    with open(CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["keep", "check", "id", "lang", "category", "scenario", "user1", "reply1", "user2", "reply2"])
        w.writeheader()
        for r in rows:
            w.writerow(old.get(r["id"]) or {"keep": "", "check": "", **{k: r[k] for k in ["id", "lang", "category", "scenario", "user1", "reply1", "user2", "reply2"]}})
    print(f"Wrote {CSV} ({len(rows)} chats). Put y in 'keep' for the good ones.")
    sys.exit()

model, tok = load(MODEL)

def ask(messages, max_tokens, temp):
    prompt = tok.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    kw = {"sampler": make_sampler(temp=temp, top_p=0.9)} if make_sampler else {"temp": temp}
    return generate(model, tok, prompt=prompt, max_tokens=max_tokens, **kw).strip().strip('"').strip()

WRITER = {
    "en": ("You are Maple, a helpful assistant for people in Canada. Write the email or letter the user asked for, "
           "written as the user, polite and warm, with Canadian spelling. Format: a 'Subject:' line, a blank line, "
           "a greeting, 2 to 4 short paragraphs, a closing, and [Your name]. Use [square brackets] for any detail you "
           "don't know. Don't invent facts the user didn't give. After the email, add one short line offering to "
           "adjust the tone or length."),
    "fr": ("Tu es Maple, un assistant pour les gens au Canada. Rédige le courriel ou la lettre demandé, au nom de "
           "l'utilisateur, poli et chaleureux, en français du Canada. Format : une ligne « Objet : », une ligne vide, "
           "une salutation, 2 à 4 courts paragraphes, une formule de politesse et [Ton nom]. Mets entre [crochets] les "
           "détails inconnus. N'invente rien. Après le courriel, ajoute une courte phrase offrant d'ajuster le ton ou la longueur."),
}
CHANGES = {"en": ["more polite", "shorter", "more formal", "friendlier and less stiff"],
           "fr": ["plus poli", "plus court", "plus formel", "plus chaleureux"]}

done = set()
if os.path.exists(OUT):
    done = {json.loads(l)["id"] for l in open(OUT)}
scen = json.load(open(SCEN))
todo = [s for s in scen if s["id"] not in done]
print(f"{len(done)} done, {len(todo)} to go")
start = time.time()
with open(OUT, "a", encoding="utf-8") as out:
    for n, s in enumerate(todo, 1):
        lang = "fr" if int(s["id"].split("_")[-1]) % 5 == 0 else "en"
        where = "in French (Quebec or elsewhere in Canada)" if lang == "fr" else "in English"
        user1 = ask([{"role": "user", "content":
            f"Write ONE short message {where} (1 or 2 sentences, casual, like a real person typing on their phone; "
            f"about 1 in 3 people make a small typo) that someone in Canada might send to an AI assistant asking it "
            f"to write an email or letter for this situation: {s['scenario']} (area: {s['category']}; they want it {s['tone']}). "
            f"Include one or two concrete details, like a name, a day, a place or an item. Output only the message."}], 80, 0.9)
        reply1 = ask([{"role": "system", "content": WRITER[lang]}, {"role": "user", "content": user1}], 450, 0.7)
        change = random.choice(CHANGES[lang])
        user2 = ask([{"role": "user", "content":
            f"Write ONE very short casual follow-up message {where} (under 12 words) where a person asks an AI assistant "
            f"to make the email it just wrote {change}. Output only the message."}], 30, 0.9)
        reply2 = ask([{"role": "system", "content": WRITER[lang] + (
            " The user wants a change: rewrite the WHOLE email as asked. It must clearly differ from your previous version."
            if lang == "en" else " L'utilisateur veut un changement : réécris TOUT le courriel comme demandé. Il doit être clairement différent de la version précédente.")},
            {"role": "user", "content": user1}, {"role": "assistant", "content": reply1}, {"role": "user", "content": user2}], 450, 0.7)
        out.write(json.dumps({**s, "lang": lang, "change": change, "user1": user1, "reply1": reply1, "user2": user2, "reply2": reply2,
                              "model": MODEL}, ensure_ascii=False) + "\n")
        out.flush()
        eta = (time.time() - start) / n * (len(todo) - n) / 60
        print(f"[{n}/{len(todo)}] {s['id']} {lang} · {s['scenario'][:40]} · ~{eta:.0f} min left", flush=True)
print("Done. Next: python scripts/gen-emails-qwen.py --csv")
