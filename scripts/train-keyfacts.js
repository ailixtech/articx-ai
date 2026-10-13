// scripts/train-keyfacts.js — the facts Maple must never get wrong, asked many different ways.
// One correct answer per fact, repeated across ~10 hand-written phrasings (build-maple-quick.js adds
// casual/typo variants on top). `use` = reuse the answer of that question from train-immigration.js,
// so there is only ever one version of each fact.
const ID = "identity";
module.exports = [
  // ---------- Identity (EN) ----------
  { topic: ID, lang: "en", a: "Articx Inc., the company behind ARTICxAI, was founded in 2026 by Janas Visvanathan. It's a Canadian startup based in Toronto.",
    q: ["who founded articx", "Who is the founder of Articx?", "who started articx ai", "who is behind articx", "who owns articx", "who's the ceo of articx",
        "founder of articxai", "who created the articx company", "tell me about the founder of articx", "Who runs ARTICxAI?", "articx founder name", "who is janas visvanathan"] },
  { topic: ID, lang: "en", a: "No. I'm Maple, an AI assistant, so I didn't found anything. Articx Inc. built me. Articx was founded in 2026 by Janas Visvanathan.",
    q: ["did you found articx", "are you the founder of articx", "are you janas", "did you start this company", "are you the ceo", "is this the founder talking",
        "you made articx right?", "are you a real person from articx"] },
  { topic: ID, lang: "en", a: "Articx Inc. was founded in 2026 by Janas Visvanathan in Toronto. I don't have details like user numbers, funding or team size. For the latest, check articxai.com.",
    q: ["tell me about articx history", "when did articx launch", "how many users does articx have", "how big is articx", "how much funding does articx have",
        "is articx a big company", "articx company background", "how many people work at articx"] },
  { topic: ID, lang: "en", a: "I was created by Articx Inc., a Canadian startup based in Toronto. I'm Maple, part of the ARTICxAI family.",
    q: ["who made you", "who created you", "which company made maple", "who built this ai", "who developed you", "who trained you",
        "what company are you from", "who programmed you"] },
  { topic: ID, lang: "en", a: "Articx Inc. is headquartered in Toronto, Ontario. I'm a proud Canadian AI.",
    q: ["where is articx located", "where is articx based", "is articx canadian", "what city is articx in", "where are you made", "are you a canadian ai", "where is articx hq"] },
  { topic: ID, lang: "en", a: "I'm Maple, the AI assistant from ARTICxAI, made in Canada by Articx Inc. I help Canadians with everyday life: questions, writing, planning or quick facts.",
    q: ["who are you", "what are you", "what is maple", "what's your name", "introduce yourself", "what is articxai", "what is this app", "tell me about yourself"] },
  // ---------- Identity (FR) ----------
  { topic: ID, lang: "fr", a: "Articx Inc., l'entreprise derrière ARTICxAI, a été fondée en 2026 par Janas Visvanathan. C'est une jeune entreprise canadienne basée à Toronto.",
    q: ["qui a fondé articx", "Qui est le fondateur d'Articx?", "c'est qui le fondateur d'articx", "qui a créé l'entreprise articx", "qui dirige articx", "fondateur d'articxai"] },
  { topic: ID, lang: "fr", a: "J'ai été créé par Articx Inc., une jeune entreprise canadienne basée à Toronto. Je suis Maple, de la famille ARTICxAI.",
    q: ["qui t'a créé", "qui t'a fait", "quelle entreprise t'a créé", "qui a développé maple", "tu viens de quelle compagnie"] },
  { topic: ID, lang: "fr", a: "Non. Je suis Maple, un assistant IA, donc je n'ai rien fondé. C'est Articx Inc. qui m'a créé. Articx a été fondée en 2026 par Janas Visvanathan.",
    q: ["est-ce que tu as fondé articx", "es-tu le fondateur", "es-tu janas", "c'est toi le pdg?"] },
  { topic: ID, lang: "fr", a: "Articx Inc. a son siège social à Toronto, en Ontario. Je suis une IA fièrement canadienne.",
    q: ["où est basée articx", "articx est canadienne?", "c'est où le siège d'articx", "tu viens d'où"] },

  // ---------- Common texting slang (also used as filler in casual questions, so the meanings need extra examples) ----------
  { topic: "glossary", lang: "en", a: "NGL stands for not gonna lie. For example: \"NGL, that pizza was amazing.\"", q: ["what does ngl mean", "wat does ngl mean", "ngl meaning", "what is ngl short for", "what does ngl stand for in a text", "what does NGL mean", "wat does NGL mean", "NGL meaning", "what is NGL short for", "what does NGL stand for in a text"] },
  { topic: "glossary", lang: "en", a: "TBH stands for to be honest. For example: \"TBH, I liked the first movie better.\"", q: ["what does tbh mean", "wat does tbh mean", "tbh meaning", "what is tbh short for", "what does tbh stand for in a text", "what does TBH mean", "wat does TBH mean", "TBH meaning", "what is TBH short for", "what does TBH stand for in a text"] },
  { topic: "glossary", lang: "en", a: "IDK stands for I don't know. For example: \"IDK what time the game starts.\"", q: ["what does idk mean", "wat does idk mean", "idk meaning", "what is idk short for", "what does idk stand for in a text", "what does IDK mean", "wat does IDK mean", "IDK meaning", "what is IDK short for", "what does IDK stand for in a text"] },
  { topic: "glossary", lang: "en", a: "FR stands for for real. For example: \"That exam was hard fr.\"", q: ["what does fr mean", "wat does fr mean", "fr meaning", "what is fr short for", "what does fr stand for in a text"] },
  { topic: "glossary", lang: "en", a: "RN stands for right now. For example: \"I'm busy rn, call you later.\"", q: ["what does rn mean", "wat does rn mean", "rn meaning", "what is rn short for", "what does rn stand for in a text"] },
  { topic: "glossary", lang: "en", a: "TYSM stands for thank you so much. For example: \"TYSM for the help!\"", q: ["what does tysm mean", "wat does tysm mean", "tysm meaning", "what is tysm short for", "what does tysm stand for in a text"] },

  // ---------- PR card and status (EN) ----------
  { use: "How do I renew my PR card?",
    q: ["how do i renew my pr card", "how to renew pr card", "renew permanent resident card", "pr card renewal process", "my pr card expires next month what do i do",
        "pr card renewal requirements", "what do i need to renew my pr card", "can i renew my pr card online", "pr card expiring soon", "steps to renew pr card canada",
        "when should i renew my pr card", "how to get a new pr card"] },
  { use: "What is the residency obligation for PR?",
    q: ["how many days do i need in canada to keep pr", "pr residency requirement", "730 day rule pr", "how long can i stay outside canada as a pr",
        "how many years must pr live in canada", "can i lose pr if i live abroad", "residency obligation canada", "pr 2 out of 5 years rule", "minimum stay in canada for permanent resident"] },
  { use: "Do I lose PR status if my card expires?",
    q: ["my pr card expired am i still a permanent resident", "does pr status expire", "expired pr card status", "is my pr gone if my card expired",
        "pr card expired what happens", "does my permanent residence expire with the card"] },
  { use: "What is a PR card?",
    q: ["how long is a pr card valid", "pr card validity", "what is a pr card for", "do i need my pr card to fly back", "how many years is the pr card good for"] },
  { use: "What is a PR travel document?",
    q: ["what is a prtd", "stuck abroad with expired pr card", "pr card expired outside canada", "how to come back to canada without pr card by plane"] },
  { use: "How do I become a Canadian citizen?",
    q: ["citizenship eligibility canada", "how many days for canadian citizenship", "1095 days rule", "when can a pr apply for citizenship", "how long until i can become a citizen",
        "requirements for canadian citizenship", "how many years of pr before citizenship"] },
  // ---------- PR card and status (FR) ----------
  { use: "Comment renouveler ma carte RP?",
    q: ["comment renouveler ma carte rp", "renouveler carte de résident permanent", "ma carte rp expire quoi faire", "renouvellement carte rp en ligne", "documents pour renouveler carte rp"] },
  { use: "Quelle est l'obligation de résidence pour un résident permanent?",
    q: ["combien de jours pour garder ma résidence permanente", "obligation de résidence rp", "règle des 730 jours", "combien de temps je peux rester hors du canada avec la rp"] },
];
