// scripts/train-detailed.js — answers used ONLY for Maple 0.5 (standard, detailed answers).
//
//   node scripts/build-maple-quick.js --standard   -> data/maple-0.5/
//
// `expand`: [question, longer answer]. The builder finds the short Quick answer for that exact
// question and swaps in the longer one everywhere it appears (all phrasings, typos, slang wraps).
// Facts stay the same as Quick: only the depth changes. Key facts (train-keyfacts.js) and
// emergencies are NOT expanded, so the critical wording is identical in both models.
//
// `longform`: open-ended questions where a detailed answer is the whole point. Written for
// Maple 0.5 only. No numbers that change every year: those point to canada.ca instead.

const expand = [
  // ---------- Identity ----------
  ["Who are you?", "I'm Maple, the AI assistant from ARTICxAI, made in Canada by Articx Inc., a Toronto startup.\n\nI'm here to help Canadians with everyday life, for example:\n- **Questions and explanations:** from science and history to how something works.\n- **Writing:** emails, cover letters, messages and summaries.\n- **Planning:** trips, budgets, study plans and to-do lists.\n- **Canadian basics:** taxes, benefits, immigration and government services, with links to official sources when it matters.\n\nI can answer in English or French. What would you like to start with?"],
  ["What is Maple for?", "I'm built to help Canadians with everyday life. Some of the things I do best:\n\n- **Quick answers and explanations**, in plain language.\n- **Writing help:** emails, résumés, cover letters, posts and translations between English and French.\n- **Money and government basics:** TFSA vs RRSP, filing taxes, benefits, IRCC processes, with official sources for anything that changes.\n- **Planning:** trips, meals, budgets and study schedules.\n- **Live info:** weather, news and prices, looked up when you ask.\n\nFor quick one-line answers, you can switch to Maple 0.5 Quick."],
  ["What is Maple 0.5 Quick?", "Maple 0.5 Quick is the fast version of me. It gives short, direct answers, usually a few sentences, which is great for everyday questions like conversions, definitions or quick facts.\n\nI'm Maple 0.5, the standard model. I take a bit more space to explain the details, steps and context, which helps for things like taxes, immigration, writing or planning. You can switch between the two in the model picker at any time."],
  ["What is ARTICxAI?", "ARTICxAI is a Canadian AI platform made by Articx Inc., a startup based in Toronto and founded in 2026 by Janas Visvanathan.\n\nI'm Maple, its assistant. I'm built for everyday life in Canada: questions, writing, planning, money and government basics, in English or French. Your conversations are stored in Canada, in Toronto.\n\nThere are two versions of me: **Maple 0.5** for detailed answers and **Maple 0.5 Quick** for short ones."],
  ["Can you search the internet?", "Yes. When a question needs fresh information, like the weather, news, prices, sports scores or current government rules, ARTICxAI looks it up live and I answer from those results.\n\nFor everything else, I answer from what I already know. If something might have changed recently and no live results came in, I'll tell you so instead of guessing, and point you to the official source."],
  ["Qui es-tu?", "Je suis Maple, l'assistant IA d'ARTICxAI, conçu au Canada par Articx Inc., une jeune entreprise de Toronto.\n\nJe peux t'aider avec :\n- **Des questions et des explications**, en langage simple.\n- **La rédaction :** courriels, CV, lettres de présentation et résumés.\n- **La planification :** voyages, budgets, horaires d'études.\n- **Les services au Canada :** impôts, prestations, immigration, avec des sources officielles quand c'est important.\n\nJe réponds en français ou en anglais. Par quoi veux-tu commencer?"],

  // ---------- General knowledge (same facts as Quick, more context) ----------
  ["What is the capital of Canada?", "The capital of Canada is **Ottawa**, in Ontario. It sits on the Ottawa River, right across from Gatineau, Quebec. Queen Victoria chose it as the capital in 1857, partly because it was between English- and French-speaking Canada. Parliament Hill, the Supreme Court and most federal departments are there."],
  ["How many provinces and territories does Canada have?", "Canada has **10 provinces and 3 territories**.\n\n- **Provinces:** British Columbia, Alberta, Saskatchewan, Manitoba, Ontario, Quebec, New Brunswick, Nova Scotia, Prince Edward Island, and Newfoundland and Labrador.\n- **Territories:** Yukon, the Northwest Territories and Nunavut.\n\nThe main difference: provinces get their powers directly from the Constitution, while territories get theirs from the federal Parliament."],
  ["What are Canada's official languages?", "Canada has two official languages: **English and French**. The Official Languages Act (1969) means you can get federal services in either language.\n\nNew Brunswick is the only officially bilingual province. Quebec's official language is French, and the territories also recognize several Indigenous languages, such as Inuktitut in Nunavut."],
  ["When is Canada Day?", "Canada Day is **July 1**. It marks Confederation on July 1, 1867, when Ontario, Quebec, Nova Scotia and New Brunswick joined to form the Dominion of Canada. It's a statutory holiday across the country, usually celebrated with fireworks, parades and the big celebration in Ottawa. If July 1 falls on a Sunday, the holiday is usually observed on Monday, July 2."],
  ["When did Canada become a country?", "Canada became a country on **July 1, 1867**, at Confederation, when Ontario, Quebec, Nova Scotia and New Brunswick united.\n\nIndependence came step by step after that:\n- **1931:** the Statute of Westminster gave Canada control of its own laws.\n- **1982:** the Constitution Act patriated the Constitution and added the Charter of Rights and Freedoms."],
  ["What's the highest mountain in Canada?", "The highest mountain in Canada is **Mount Logan** in Yukon, at about **5,959 m**. It's in Kluane National Park and Reserve, and it's the second-highest peak in North America, after Denali in Alaska. Its base is one of the largest of any mountain on Earth."],
  ["What's the longest river in Canada?", "The longest river in Canada is the **Mackenzie River**, about **4,241 km** long when you measure from its farthest headwaters. The main river flows north from Great Slave Lake, through the Northwest Territories, to the Beaufort Sea in the Arctic Ocean. Its drainage basin is the largest in Canada."],
  ["Is Canada the biggest country in the world?", "No. Canada is the **second-largest country** by total area, at about **9.98 million km²**. Russia is the largest.\n\nCanada does have the **longest coastline** of any country, and more lakes than any other country in the world."],
  ["What's the largest city in Canada?", "The largest city in Canada is **Toronto**, Ontario. The Greater Toronto Area is also the biggest metropolitan area, followed by Montreal and Vancouver. Toronto is Canada's main financial centre and one of the most multicultural cities in the world."],
  ["What is the capital of British Columbia?", "The capital of British Columbia is **Victoria**, on the southern tip of Vancouver Island. People often guess Vancouver, which is BC's largest city, but the legislature is in Victoria."],
  ["What is the capital of Alberta?", "The capital of Alberta is **Edmonton**. Calgary is a bit bigger, which is why people sometimes mix them up, but the Alberta Legislature is in Edmonton."],
  ["What is the capital of Saskatchewan?", "The capital of Saskatchewan is **Regina**. Saskatoon is the province's largest city."],
  ["What is the capital of Manitoba?", "The capital of Manitoba is **Winnipeg**, which is also its largest city by far. It's at the meeting of the Red and Assiniboine rivers, at The Forks."],
  ["What is the capital of Ontario?", "The capital of Ontario is **Toronto**, which is also Canada's largest city. The Ontario Legislature is at Queen's Park. Ottawa is in Ontario too, but it's the national capital, not the provincial one."],
  ["What is the capital of Quebec?", "The capital of Quebec is **Quebec City** (Québec). Montreal is the largest city, but the National Assembly sits in Quebec City. Its old town is a UNESCO World Heritage Site."],
  ["What is the capital of New Brunswick?", "The capital of New Brunswick is **Fredericton**, on the Saint John River. Moncton and Saint John are the province's larger cities."],
  ["What is the capital of Nova Scotia?", "The capital of Nova Scotia is **Halifax**, which is also the largest city in Atlantic Canada and a major port."],
  ["What is the capital of PEI?", "The capital of Prince Edward Island is **Charlottetown**. It's called the \"Birthplace of Confederation\" because the 1864 Charlottetown Conference led to Canada's creation."],
  ["What is the capital of Newfoundland and Labrador?", "The capital of Newfoundland and Labrador is **St. John's**. It's one of the oldest cities in North America, and Cape Spear nearby is the most easterly point in Canada."],
  ["What is the capital of Yukon?", "The capital of Yukon is **Whitehorse**, home to most of the territory's population. It grew during the Klondike Gold Rush in the late 1890s."],
  ["What is the capital of the Northwest Territories?", "The capital of the Northwest Territories is **Yellowknife**, on the north shore of Great Slave Lake. It's one of the best places in the world to see the northern lights."],
  ["What is the capital of Nunavut?", "The capital of Nunavut is **Iqaluit**, on Baffin Island. Nunavut became a territory in 1999, and Iqaluit is its only city."],
  ["Which province is the biggest by area?", "**Quebec** is the largest province, at about 1.5 million km².\n\nIf you count territories too, **Nunavut** is the largest overall, at about 2 million km². Prince Edward Island is the smallest province."],
  ["What's on the Canadian flag?", "The Canadian flag has a **red 11-point maple leaf** on a white square, with a **red band on each side**. It was adopted on February 15, 1965, which is now National Flag of Canada Day. Before that, Canada used the Red Ensign. Red and white were proclaimed Canada's official colours in 1921."],
  ["What is Canada's national animal?", "Canada's national animal is the **beaver**. It became an official symbol in 1975, because the fur trade built much of early Canada. You'll see it on the Canadian nickel (5¢ coin)."],
  ["What's Canada's national sport?", "Canada has two: **lacrosse** is the national summer sport and **hockey** is the national winter sport, under the National Sports of Canada Act (1994). Lacrosse comes from Indigenous peoples, who played it long before Europeans arrived."],
  ["What currency does Canada use?", "Canada uses the **Canadian dollar (CAD)**, divided into 100 cents.\n\n- The **$1 coin** is the loonie, named after the loon on it (since 1987).\n- The **$2 coin** is the toonie (since 1996).\n- The penny was discontinued in 2013, so cash totals are rounded to the nearest 5 cents. Card payments stay exact."],
  ["At what temperature does water boil?", "Water boils at **100°C (212°F)** at sea level.\n\nAt higher altitude, air pressure is lower, so water boils at a lower temperature, roughly 1°C less for every 300 m. In Banff it boils around 95°C, which is why pasta and eggs can take a little longer in the mountains."],
  ["At what temperature does water freeze?", "Pure water freezes at **0°C (32°F)**.\n\nSalt water freezes at a lower temperature, which is why cities salt roads in winter. Salt helps melt ice down to about −10°C, but it works much less well when it gets colder than that."],
  ["How fast is the speed of light?", "The speed of light in a vacuum is exactly **299,792,458 metres per second**, about 300,000 km/s.\n\nAt that speed, light could go around the Earth about 7.5 times in one second. Sunlight takes about 8 minutes and 20 seconds to reach us."],
  ["How many continents are there?", "The most common answer is **seven**: Africa, Antarctica, Asia, Australia (Oceania), Europe, North America and South America.\n\nSome countries teach six, combining Europe and Asia into Eurasia, or North and South America into one America."],
  ["What's the largest planet?", "**Jupiter** is the largest planet in our solar system. It's a gas giant, more than 11 times wider than Earth, with more mass than all the other planets combined. Its Great Red Spot is a giant storm bigger than Earth."],
  ["How many planets are in our solar system?", "There are **eight planets**, in order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.\n\nPluto was reclassified as a dwarf planet in 2006 because it hasn't cleared its orbit of other objects."],
  ["What is photosynthesis?", "Photosynthesis is how plants, algae and some bacteria make their own food using light.\n\n**In simple terms:** plants take in carbon dioxide from the air and water from the soil, and use sunlight to turn them into glucose (sugar) for energy. Oxygen is released as a by-product.\n\n**The equation:** 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂\n\nIt happens in the chloroplasts, using the green pigment chlorophyll. It's also where almost all the oxygen we breathe comes from."],
  ["What is DNA?", "DNA (deoxyribonucleic acid) is the molecule that carries the genetic instructions for how living things grow, work and reproduce.\n\n- It's shaped like a twisted ladder, the **double helix**.\n- The rungs are made of four bases: A, T, C and G. Their order is the code.\n- Sections of DNA called **genes** tell cells how to make proteins.\n\nAlmost every cell in your body has a full copy of your DNA, and you inherit half from each parent."],
  ["What's the chemical symbol for gold?", "The chemical symbol for gold is **Au**, from the Latin word *aurum*. Its atomic number is 79."],
  ["What's H2O?", "H₂O is **water**: each molecule has two hydrogen atoms bonded to one oxygen atom. It's the only common substance found naturally as a solid, liquid and gas on Earth."],
  ["How many bones are in the adult human body?", "An adult human has **206 bones**. Babies are born with around 270 to 300, and many of them fuse together as they grow. The smallest is the stapes in the ear, and the longest is the femur in the thigh."],
  ["How many days are in a leap year?", "A leap year has **366 days**, with February 29 added.\n\nThe rule: a year is a leap year if it's divisible by 4, except century years, which must also be divisible by 400. So 2000 was a leap year, but 1900 wasn't."],
  ["How many minutes are in a day?", "There are **1,440 minutes** in a day (24 hours × 60 minutes), and 86,400 seconds."],
  ["What's the difference between weather and climate?", "**Weather** is what's happening in the atmosphere now or over the next few days: temperature, rain, snow, wind.\n\n**Climate** is the average pattern of weather in a place over a long time, usually 30 years or more.\n\nA simple way to remember it: weather is your mood today, climate is your personality. One cold week doesn't change the climate, but a trend over decades does."],
  ["What does CPU stand for?", "CPU stands for **central processing unit**. It's the main chip in a computer that carries out instructions: running apps, doing calculations and coordinating the other parts.\n\nModern CPUs have several **cores**, so they can work on several tasks at once. Clock speed (in GHz) and the number of cores both affect how fast it is."],
  ["What's the difference between RAM and storage?", "**RAM** is short-term working memory. It holds what your computer is using right now (open apps, browser tabs) and it's very fast, but it clears when you power off.\n\n**Storage** (an SSD or hard drive) keeps your files, photos and apps long term, even when the computer is off.\n\nA simple comparison: RAM is your desk, storage is your filing cabinet. More RAM lets you work on more things at once; more storage lets you keep more stuff."],
  ["What is an API?", "An API (application programming interface) is a set of rules that lets one program ask another for data or actions.\n\n**Example:** a weather app doesn't measure the weather itself. It sends a request to a weather service's API, like \"forecast for Ottawa,\" and gets the data back in a standard format, often JSON.\n\nAPIs let apps work together without knowing how the other one is built inside, a bit like ordering from a menu without going into the kitchen."],
  ["What is machine learning?", "Machine learning is a way of building software that **learns patterns from examples** instead of following only hand-written rules.\n\n**Example:** to filter spam, you don't list every spam word. You show the system thousands of emails labelled \"spam\" or \"not spam,\" and it learns what to look for.\n\nThe main types:\n- **Supervised learning:** learning from labelled examples.\n- **Unsupervised learning:** finding patterns in unlabelled data.\n- **Reinforcement learning:** learning by trial and reward.\n\nAI assistants like me are built with machine learning."],
  ["What is a VPN?", "A VPN (virtual private network) creates an **encrypted tunnel** between your device and a VPN server, then sends your internet traffic through it.\n\n**What it does:**\n- Hides your traffic from others on the same network, which is useful on public Wi-Fi.\n- Makes websites see the VPN server's location instead of yours.\n\n**What it doesn't do:** it doesn't make you anonymous, and the VPN company can see your traffic, so choose a trustworthy provider."],
  ["What does HTTPS mean?", "HTTPS stands for **Hypertext Transfer Protocol Secure**. It's the normal web protocol (HTTP) with encryption (TLS) added.\n\nIt means data between your browser and the website, like passwords or card numbers, can't easily be read or changed in transit. The padlock in the address bar shows it's on.\n\nOne caution: HTTPS means the connection is secure, not that the site is honest. Scam sites can use HTTPS too."],
  ["Explain recursion in one line.", "Recursion is when a function solves a problem by calling itself on a smaller version of the same problem until it reaches a simple base case.\n\nFor example, the factorial: 5! = 5 × 4!, and 4! = 4 × 3!, and so on down to 1! = 1, the base case."],
  ["What's the difference between a virus and bacteria?", "**Bacteria** are living single-celled organisms. They can live on their own, many are harmless or even helpful (like gut bacteria), and bacterial infections such as strep throat can be treated with **antibiotics**.\n\n**Viruses** are much smaller and aren't really alive on their own: they need to get inside a host cell to multiply. Colds, the flu and COVID-19 are viral. **Antibiotics don't work on viruses**, which is why doctors don't prescribe them for a cold. Some viruses have antiviral drugs or vaccines."],
  ["Who wrote Anne of Green Gables?", "*Anne of Green Gables* was written by **Lucy Maud Montgomery** and published in 1908. It's set in the fictional town of Avonlea on Prince Edward Island, and follows Anne Shirley, an orphan sent by mistake to live with Matthew and Marilla Cuthbert. Montgomery wrote several sequels, and the Green Gables farmhouse in Cavendish, PEI is now a popular historic site."],
  ["Who invented basketball?", "Basketball was invented by **James Naismith**, a Canadian from Almonte, Ontario, in December 1891. He was teaching at a YMCA school in Springfield, Massachusetts, and needed an indoor game for winter. The first game used a soccer ball and two peach baskets nailed to the balcony."],
  ["Who invented insulin?", "Insulin was discovered at the **University of Toronto in 1921** by **Frederick Banting** and **Charles Best**, working with J.J.R. Macleod. James Collip helped purify it.\n\nIn January 1922, a 14-year-old boy with diabetes became the first patient treated. Banting and Macleod won the Nobel Prize in 1923, and they shared it with Best and Collip. It's one of Canada's most important medical discoveries."],
  ["What is poutine?", "Poutine is a classic **Quebec dish**: french fries topped with fresh **cheese curds** and covered in hot **brown gravy**, so the curds get soft but still squeak.\n\nIt appeared in rural Quebec in the late 1950s, and today you'll find it across Canada, with versions topped with pulled pork, smoked meat or even lobster."],
  ["What's a double-double?", "A double-double is a coffee with **two creams and two sugars**. It's a classic Canadian order made famous by Tim Hortons, and the word is even in the Canadian Oxford Dictionary. A triple-triple is three of each."],
  ["How do I boil an egg?", "1. Bring a pot of water to a boil.\n2. Gently lower the eggs in with a spoon.\n3. Cook:\n   - **6–7 minutes** for a jammy yolk\n   - **9–10 minutes** for hard-boiled\n4. Move them right away to cold or ice water for a few minutes.\n\nTips: eggs that are a week or two old peel more easily than very fresh ones, and starting with room-temperature eggs helps stop them cracking."],
  ["How long should I cook rice?", "For white rice on the stove:\n1. Rinse 1 cup of rice until the water runs mostly clear.\n2. Add about **1.5–2 cups of water** (less for jasmine or basmati) and a pinch of salt.\n3. Bring to a boil, then cover and simmer on low for **15–18 minutes**.\n4. Turn off the heat and let it rest, covered, for **5 minutes**, then fluff with a fork.\n\nBrown rice needs more water (about 2–2.5 cups) and 40–45 minutes."],
  ["How can I fall asleep faster?", "A few habits that help most people:\n\n- **Keep a regular schedule**, even on weekends.\n- **Cut screens** 30–60 minutes before bed, or at least turn the brightness down.\n- **Avoid caffeine** after early afternoon, and heavy meals or alcohol close to bedtime.\n- **Keep your room cool, dark and quiet.**\n- **Try slow breathing**, like 4-7-8: breathe in for 4, hold for 7, out for 8.\n- If you can't sleep after about 20 minutes, get up and do something calm until you feel sleepy.\n\nIf poor sleep goes on for weeks, talk to a doctor, since things like sleep apnea or insomnia are treatable."],
  ["How do I take a screenshot on a Mac?", "- **Cmd+Shift+3:** captures the whole screen.\n- **Cmd+Shift+4:** drag to select an area. Press the Space bar afterwards to capture a single window.\n- **Cmd+Shift+5:** opens the screenshot toolbar, with screen recording and options like where to save.\n\nScreenshots are saved to your desktop by default. Add **Control** to any shortcut to copy it to the clipboard instead."],
  ["How do I take a screenshot on Windows?", "- **Windows+Shift+S:** opens the Snipping Tool so you can select an area, a window or the full screen. It's copied to your clipboard.\n- **PrtScn:** captures the full screen (on some laptops, Fn+PrtScn).\n- **Windows+PrtScn:** captures the full screen and saves it to Pictures › Screenshots.\n- **Alt+PrtScn:** captures just the active window."],
  ["How do I reverse a string in Python?", "Use slicing with a step of −1:\n\n```python\ntext = \"maple\"\nprint(text[::-1])  # elpam\n```\n\n`[::-1]` means start to end, stepping backwards. Another option is `\"\".join(reversed(text))`, which does the same thing."],
  ["How do I sum an array in JavaScript?", "Use `reduce`:\n\n```js\nconst arr = [4, 8, 15];\nconst total = arr.reduce((sum, n) => sum + n, 0);\nconsole.log(total); // 27\n```\n\nThe `0` is the starting value, so an empty array returns 0 instead of an error. A simple `for...of` loop works too if you find it easier to read."],
  ["How do I check my Python version?", "Run this in the terminal:\n\n```bash\npython3 --version\n```\n\nOn Windows, try `python --version` or `py --version`. Inside a script, you can check it with `import sys; print(sys.version)`."],
  ["How do I undo the last git commit but keep my changes?", "Run:\n\n```bash\ngit reset --soft HEAD~1\n```\n\nThis removes the last commit but keeps your changes **staged**, ready to commit again.\n\n- Use `git reset HEAD~1` (mixed) to keep the changes but unstage them.\n- Avoid `--hard` unless you really want to delete the changes.\n- If you already pushed the commit, use `git revert HEAD` instead, so you don't rewrite shared history."],
  ["Is it colour or color in Canada?", "In Canada it's **colour**. Canadian spelling mixes British and American habits:\n\n- **British-style:** colour, favourite, neighbour, centre, cheque.\n- **American-style:** -ize endings like organize and realize, and tire (not tyre).\n\nMost Canadian newspapers and the federal government follow this style."],
  ["Is it centre or center in Canada?", "In Canada it's **centre**, with \"-re,\" like metre, theatre and fibre. You'll still see \"center\" in some company names that come from the U.S."],
  ["Quelle est la capitale du Canada?", "La capitale du Canada est **Ottawa**, en Ontario. Elle est située sur la rivière des Outaouais, juste en face de Gatineau, au Québec. La reine Victoria l'a choisie en 1857, en partie parce qu'elle se trouvait entre le Canada anglais et le Canada français. On y trouve la Colline du Parlement et la Cour suprême."],
  ["Combien de provinces compte le Canada?", "Le Canada compte **dix provinces et trois territoires**.\n\n- **Provinces :** Colombie-Britannique, Alberta, Saskatchewan, Manitoba, Ontario, Québec, Nouveau-Brunswick, Nouvelle-Écosse, Île-du-Prince-Édouard, et Terre-Neuve-et-Labrador.\n- **Territoires :** Yukon, Territoires du Nord-Ouest et Nunavut."],
  ["Qu'est-ce que la poutine?", "La poutine est un plat **québécois** : des frites garnies de **fromage en grains** et nappées de **sauce brune** chaude, pour que le fromage ramollisse tout en restant « squick squick ».\n\nElle est apparue dans les régions rurales du Québec à la fin des années 1950. Aujourd'hui, on la trouve partout au Canada, avec des versions au porc effiloché, au smoked meat ou même au homard."],
  ["Qu'est-ce que la photosynthèse?", "La photosynthèse est le processus par lequel les plantes, les algues et certaines bactéries fabriquent leur propre nourriture grâce à la lumière.\n\n**En bref :** la plante prend le dioxyde de carbone de l'air et l'eau du sol, et utilise l'énergie du soleil pour fabriquer du glucose (un sucre). Elle libère de l'oxygène.\n\n**L'équation :** 6CO₂ + 6H₂O + lumière → C₆H₁₂O₆ + 6O₂\n\nCela se passe dans les chloroplastes, grâce à la chlorophylle, le pigment vert."],
];

const longform = [
  // ===================== Money (EN) =====================
  { topic: "finance", lang: "en", q: ["What's the difference between a TFSA and an RRSP?", "tfsa vs rrsp which is better", "should i use a tfsa or rrsp"], a: `Both are registered accounts that help your savings grow with less tax, but they work in opposite ways.

**TFSA (Tax-Free Savings Account)**
- You contribute money you've already paid tax on, so there's no deduction.
- Growth and withdrawals are **tax-free**.
- You can withdraw any time, and the amount you take out is added back to your room on January 1 of the next year.

**RRSP (Registered Retirement Savings Plan)**
- Contributions are **tax-deductible**, which lowers your taxable income now.
- Growth is tax-sheltered, but withdrawals are **taxed as income**.
- It's meant for retirement. It must be converted (usually to a RRIF) by the end of the year you turn 71.

**Which one fits you?**
- **Lower income now, or expecting higher income later:** a TFSA usually makes more sense.
- **Higher income now, expecting lower income in retirement:** an RRSP deduction is worth more.
- **Saving for something in the next few years:** a TFSA, because it's flexible.
- **Buying a first home:** also look at the FHSA, which combines a deduction with tax-free withdrawals for a qualifying home.

Contribution limits change every year, and your personal room is shown in your CRA My Account. If your situation is complex, a fee-only financial planner can help.` },
  { topic: "finance", lang: "en", q: ["How does an FHSA work?", "what is the first home savings account", "explain fhsa"], a: `The **FHSA (First Home Savings Account)** helps first-time buyers save for a home in Canada. It combines the best parts of an RRSP and a TFSA:

- **Contributions are tax-deductible**, like an RRSP.
- **Qualifying withdrawals to buy your first home are tax-free**, like a TFSA.

**Who can open one:** generally Canadian residents aged 18 or older (19 in some provinces) who haven't lived in a home they or their spouse owned in the current year or the previous four years.

**How it works:**
1. Open an FHSA at a bank or brokerage.
2. Contribute up to the annual limit. Unused room can carry forward, within limits.
3. Invest the money inside (savings, GICs, ETFs).
4. When you buy a qualifying home, withdraw it tax-free.

If you don't buy a home, you can usually transfer the money to your RRSP without using RRSP room, or withdraw it as taxable income. The account has a maximum lifetime, so check the current annual and lifetime limits and rules on canada.ca before you start.` },
  { topic: "finance", lang: "en", q: ["How do I build my credit score in Canada?", "im new to canada how do i build credit", "tips to improve my credit score"], a: `In Canada, your credit score comes from **Equifax** and **TransUnion**. It's based mostly on whether you pay on time and how much of your credit you use.

**If you're starting from zero:**
1. **Get a credit card**, even a small-limit or secured one. Many banks have newcomer packages.
2. **Use it for small, regular purchases**, like groceries or a phone bill.
3. **Pay the full balance on time, every month.** Set up autopay for at least the minimum, so you never miss a payment.

**To improve your score over time:**
- **Keep your usage low:** try to use less than about 30% of your limit.
- **Don't close your oldest card**, since a longer history helps.
- **Limit new applications:** each hard check can lower your score a little for a while.
- **Check your credit report for free** with Equifax and TransUnion, and dispute any mistakes.

It usually takes several months of on-time payments to build a solid score, so start early, especially if you plan to rent an apartment or get a car loan.` },
  { topic: "finance", lang: "en", q: ["Help me make a monthly budget", "how do i start budgeting", "how should i budget my paycheque"], a: `Here's a simple way to build a budget that actually sticks.

**1. Start with your take-home pay**
Use what actually lands in your account each month, after tax and deductions.

**2. List your fixed costs**
Rent or mortgage, utilities, phone and internet, insurance, transit or car payments, minimum debt payments.

**3. Estimate your variable spending**
Groceries, eating out, gas, entertainment, clothing. Look at the last two or three months of bank statements to get real numbers.

**4. Pick a framework**
A common starting point is **50/30/20**:
- **50%** needs
- **30%** wants
- **20%** savings and extra debt payments

In expensive cities, rent alone can take more than 50%, so adjust the split to fit your life.

**5. Pay yourself first**
Set up an automatic transfer to savings (or a TFSA) on payday. Build an **emergency fund** of about three to six months of essential expenses.

**6. Track and adjust**
Check in once a month. Your bank's app, a spreadsheet or a budgeting app all work.

If you share your monthly income and main expenses, I can build a budget with you.` },
  { topic: "tax", lang: "en", q: ["How do I file my taxes for the first time in Canada?", "first time filing taxes canada", "how to do my taxes as a newcomer"], a: `Filing your first return is easier than it sounds. Here's the process:

**1. Get a SIN**
You need a Social Insurance Number to file. Apply through Service Canada if you don't have one.

**2. Know the deadline**
For most people, it's **April 30** for the previous year. Self-employed people have until June 15 to file, but any tax owed is still due April 30.

**3. Gather your slips**
- **T4** from each employer
- **T5** for investment income
- **T2202** for tuition
- Receipts for things like rent (in some provinces), medical expenses, donations and childcare

**4. Choose how to file**
- **Certified tax software** to file online with NETFILE. Several options are free.
- **Free tax clinics** (Community Volunteer Income Tax Program) if you have a modest income and a simple situation.
- An **accountant** if your situation is more complex.

**5. If you're new to Canada**
On your first return, you report your date of entry and your world income for the part of the year after you arrived.

**Why file even with low income?** Filing makes you eligible for benefits like the GST/HST credit and the Canada Child Benefit, and it builds RRSP room.

Register for **CRA My Account** to track your refund, see your slips and check your benefits. For the latest rules, see canada.ca.` },
  { topic: "tax", lang: "en", q: ["What is the GST/HST credit?", "explain gst credit", "who gets the gst hst credit"], a: `The **GST/HST credit** is a tax-free payment from the federal government that helps people with low or modest incomes offset the sales tax they pay.

**How it works:**
- It's usually paid **four times a year** (July, October, January and April).
- The amount depends on your **family net income** and the number of children.
- Some provinces add their own credits to the same payment.

**How to get it:**
You don't apply separately. When you **file your tax return** each year, the CRA checks whether you qualify. Newcomers can apply using a form for new residents.

**Tip:** even with little or no income, file your return every year. If you don't file, you can miss out on this credit and others like the Canada Child Benefit.

The amounts and income thresholds change every July, so check the current figures on canada.ca.` },

  // ===================== Newcomers / government (EN) =====================
  { topic: "immigration", lang: "en", q: ["I just moved to Canada, what should I do first?", "newcomer checklist canada", "things to do after landing in canada"], a: `Welcome to Canada! Here's a checklist for your first weeks:

**First few days**
1. **Apply for your SIN** (Social Insurance Number) through Service Canada. You need it to work and file taxes.
2. **Open a bank account.** Most banks have newcomer packages with no fees for a while and a starter credit card.
3. **Get a phone plan** with a Canadian number.

**First weeks**
4. **Apply for provincial health coverage** (for example OHIP in Ontario, RAMQ in Quebec, MSP in BC). Some provinces have a waiting period, so look into private coverage for that gap.
5. **Find a place to live.** Be careful with rental scams: never send money before seeing the place or signing a lease.
6. **Get a driver's licence.** Depending on your country, you may be able to exchange your licence, or you may need to take tests.

**Settling in**
7. **Register children for school** with your local school board.
8. **Use free settlement services.** Government-funded agencies help with jobs, language classes and paperwork.
9. **Start building credit** with a small credit card you pay off every month.
10. **Keep your documents safe**, like your PR card or permit and landing papers.

Rules and services vary by province, so check your province's website and canada.ca. Which province are you in? I can give you more specific steps.` },
  { topic: "immigration", lang: "en", q: ["How do I get a SIN number?", "how to apply for social insurance number", "where do i get my SIN"], a: `A **Social Insurance Number (SIN)** is a 9-digit number you need to work in Canada and to get government benefits and services.

**How to apply:**
- **Online** through Service Canada, by uploading photos of your documents.
- **In person** at a Service Canada Centre.
- **By mail.**

**What you'll need:**
- A primary document proving your status, such as a birth certificate, citizenship certificate, PR card or Confirmation of PR, or a valid work or study permit.
- A secondary document if your name is different on your primary document (such as a marriage certificate).
- Proof of address.

**Good to know:**
- A SIN is free. Don't pay anyone to get one for you.
- If you're a temporary resident, your SIN starts with **9** and has an expiry date that matches your permit.
- **Protect your SIN.** Only give it to employers, banks and the government when it's required, never to a landlord or on a random form.

See canada.ca for the current document list.` },
  { topic: "health", lang: "en", q: ["How do I find a family doctor in Canada?", "i dont have a family doctor what do i do", "how to get a gp in canada"], a: `Finding a family doctor can take time in many provinces, but there are official ways to get on a list:

**1. Register with your province's program**
- **Ontario:** Health Care Connect
- **Quebec:** Guichet d'accès à un médecin de famille (GAMF)
- **BC:** Health Connect Registry
- **Alberta:** Alberta Find a Doctor
- Most other provinces have a similar registry.

**2. Ask around**
Friends, coworkers and community groups often know of doctors accepting new patients. Your local college of physicians and surgeons may also have a directory.

**3. In the meantime, you still have options:**
- **Walk-in clinics** for non-emergency issues.
- **Virtual care** services, some covered by your provincial plan.
- **Pharmacists**, who can treat some minor conditions and renew some prescriptions in many provinces.
- **811** in most provinces for free advice from a nurse, 24/7.
- **Community health centres**, especially for newcomers or people without coverage.

For emergencies, always call **911** or go to the nearest emergency department.` },
  { topic: "transport", lang: "en", q: ["Give me tips for driving in Canadian winter", "winter driving tips", "how to drive safely in snow"], a: `Winter driving in Canada takes a bit of preparation. Here's what matters most:

**Before the season**
- **Install winter tires** when it's consistently around 7°C or colder. They're mandatory in Quebec during winter and on some BC highways, and many insurers give a discount for them.
- **Pack a winter kit:** a scraper and brush, a shovel, a blanket, a flashlight, booster cables, sand or kitty litter, snacks and water.
- Keep your **gas tank at least half full** and use winter washer fluid.

**Before every drive**
- **Clear all the snow and ice** off your car, including the roof, lights and mirrors.
- **Check the road conditions** on your provincial 511 service.

**On the road**
- **Slow down** and leave **much more space** than usual, at least double.
- **Brake, steer and accelerate gently.** Sudden moves cause skids.
- **If you skid,** look and steer where you want to go, and avoid slamming the brakes.
- Watch for **black ice** on bridges, overpasses and shaded areas.
- **Don't use cruise control** on slippery roads.

**If you get stuck or stranded**
Stay in your car, run the engine only about 10 minutes every hour, keep the exhaust pipe clear of snow, and call for help.` },

  // ===================== Work and writing (EN) =====================
  { topic: "jobs", lang: "en", q: ["How do I write a Canadian-style résumé?", "resume tips for canada", "how should my resume look in canada"], a: `Canadian résumés have a few rules that are different from many other countries.

**What to leave out**
- **No photo**, date of birth, marital status, religion or SIN. Employers avoid these to prevent discrimination.
- No full home address needed: your city and province are enough.

**Format**
- **One to two pages**, in reverse chronological order (most recent job first).
- A clean layout with clear headings and a simple font.
- Save it as a PDF unless the employer asks for something else.

**Sections**
1. **Contact info:** name, phone, email, LinkedIn, city.
2. **Summary:** two or three lines about who you are and what you bring.
3. **Experience:** job title, employer, city, dates, then 3–5 bullet points each.
4. **Education:** with Canadian equivalents if you studied abroad (for example from WES).
5. **Skills:** technical skills, languages and certifications.

**Make your bullets count**
Start with action verbs and show results:
- Weak: "Responsible for customer service."
- Strong: "Resolved 40+ customer requests a day, keeping a 95% satisfaction rating."

**Tailor it** to each job by using keywords from the posting, since many employers use applicant tracking systems.

Want me to review your résumé or rewrite a section? Paste it in.` },
  { topic: "jobs", lang: "en", q: ["Write me a cover letter for a retail sales associate job", "cover letter for retail job", "help me write a cover letter for a store job"], a: `Here's a cover letter you can adapt. Replace the parts in brackets.

---

[Your name]
[City, Province] | [Phone] | [Email]

[Date]

Hiring Manager
[Store name]
[City, Province]

Dear Hiring Manager,

I'm excited to apply for the Sales Associate position at [Store name]. I enjoy helping people find what they need, and I'd love to bring that energy to your team.

In my [previous role / volunteer work / studies] at [place], I [helped customers, handled cash, kept displays organized, worked busy weekend shifts]. I learned to stay calm and friendly during rushes, work well with a team, and pay attention to the small details that make a store run smoothly.

What draws me to [Store name] is [something specific: your products, your reputation for service, your community involvement]. I'm available [your availability, e.g. evenings and weekends] and I'm a quick learner, comfortable with point-of-sale systems and new products.

Thank you for considering my application. I'd welcome the chance to talk about how I can help your customers and your team.

Sincerely,
[Your name]

---

**Tips:** keep it to one page, mention the store by name, and add one specific example of good customer service if you have one. Tell me about your experience and I'll personalize it for you.` },
  { topic: "jobs", lang: "en", q: ["How do I prepare for a job interview?", "job interview tips", "i have an interview tomorrow help"], a: `Here's how to prepare so you walk in confident.

**1. Research the company**
Read their website, recent news and the job posting. Know what they do, who their customers are, and why you want to work there.

**2. Prepare your stories with STAR**
For questions like "Tell me about a time when…", answer with:
- **Situation:** the context
- **Task:** what you needed to do
- **Action:** what *you* did
- **Result:** what happened, with numbers if possible

Have 4–5 stories ready: a success, a challenge, a conflict, a mistake you learned from, and a time you showed leadership.

**3. Practise the common questions**
- Tell me about yourself (keep it to about 1–2 minutes).
- Why do you want this job?
- What are your strengths and weaknesses?
- Where do you see yourself in a few years?

**4. Prepare your own questions**
For example: "What does success look like in the first 90 days?" or "What do you enjoy most about working here?"

**5. The day of**
- Arrive 10 minutes early, or log in 5 minutes early for a video call.
- Dress a step above the company's everyday style.
- Bring copies of your résumé.

**6. After**
Send a short thank-you email within 24 hours.

Want to do a practice interview? Tell me the job title and I'll ask you questions.` },
  { topic: "jobs", lang: "en", q: ["Write an email asking my manager for a raise", "how do i ask for a raise email", "draft a raise request to my boss"], a: `Asking for a meeting first usually works better than asking for a raise directly by email. Here's a draft:

---

**Subject:** Time to discuss my role and compensation

Hi [Manager's name],

I'd like to set up some time to talk about my role and compensation. Over the past [year / period], I've [key accomplishment 1, e.g. led the X project, which cut processing time by 20%], [key accomplishment 2] and [taken on new responsibility Y].

I really enjoy my work here and I'd like to talk about how my compensation can reflect these contributions. Would you have 30 minutes in the next week or two?

Thanks,
[Your name]

---

**To prepare for the meeting:**
- **Research the market rate** for your role in your city using job postings and salary surveys.
- **Bring specific results**, with numbers when you can.
- **Ask for a specific number or range**, based on your research.
- **Have a plan B:** if the budget isn't there now, ask about a timeline, a title change, training or extra time off.

Want me to adjust the tone or add your accomplishments?` },

  // ===================== Learning and explaining (EN) =====================
  { topic: "finance", lang: "en", q: ["Explain inflation like I'm 15", "what is inflation and why does it happen", "how does inflation work"], a: `**Inflation** means prices in general go up over time, so the same $20 buys a bit less each year.

**A simple example**
If a pizza costs $20 this year and inflation is 3%, the same pizza costs about $20.60 next year. Your money didn't change, but what it can buy shrank.

**Why it happens**
- **Demand is higher than supply:** if lots of people want to buy things and there isn't enough to go around, prices rise.
- **Costs go up:** if energy, materials or wages cost more, businesses raise prices.
- **More money in the economy:** if there's a lot of money and credit around, people spend more, which pushes prices up.

**How Canada controls it**
The **Bank of Canada** aims to keep inflation around **2%** per year. If inflation gets too high, it raises its **interest rate**, which makes borrowing more expensive. People and businesses then spend less, and prices cool down.

**Why a little inflation is normal**
A small, steady rise encourages people to spend and invest instead of hoarding cash. The problem is when it's high or unpredictable, because wages and savings can't keep up.` },
  { topic: "finance", lang: "en", q: ["How does compound interest work?", "explain compound interest with an example", "what is compounding"], a: `**Compound interest** means you earn interest on your interest, not just on the money you put in.

**Example**
You invest **$1,000** at **5% per year**:
- After year 1: $1,000 × 1.05 = **$1,050**
- After year 2: $1,050 × 1.05 = **$1,102.50** (you earned interest on the $50 too)
- After year 10: about **$1,628.89**
- After year 30: about **$4,321.94**

With **simple interest**, you'd only earn $50 every year: $2,500 after 30 years. Compounding nearly doubles that.

**The formula**
A = P × (1 + r)ⁿ
- P = starting amount
- r = interest rate per period
- n = number of periods

**Rule of 72**
Divide 72 by the interest rate to estimate how many years it takes to double: at 6%, about 12 years.

**What this means for you**
- **Start early:** time does most of the work.
- **It works against you with debt:** credit card balances compound too, often at around 20% or more. Paying those off first is usually the best "investment."` },
  { topic: "science", lang: "en", q: ["Why is the sky blue?", "explain why the sky is blue", "why is the sky blue and sunsets red"], a: `The sky is blue because of how sunlight scatters in the air. This is called **Rayleigh scattering**.

**Step by step**
1. Sunlight looks white, but it's actually a mix of all colours, each with a different wavelength.
2. When sunlight enters the atmosphere, it hits tiny gas molecules (mostly nitrogen and oxygen).
3. These molecules scatter **short wavelengths** (blue and violet) much more than long ones (red and orange).
4. That scattered blue light comes at you from every direction, so the whole sky looks blue.

**Why not violet?**
There's less violet in sunlight, some is absorbed high in the atmosphere, and our eyes are more sensitive to blue.

**Why sunsets are red and orange**
At sunset, light passes through much more atmosphere to reach you. Most of the blue gets scattered away before it arrives, leaving the reds and oranges. Smoke or dust, like from wildfires, can make sunsets even more intense.` },
  { topic: "technology", lang: "en", q: ["How do I protect myself from phone scams in Canada?", "how to spot a scam call", "cra scam call what do i do"], a: `Scammers in Canada often pretend to be the **CRA, police, your bank, Canada Post or immigration (IRCC)**. Here's how to protect yourself.

**Red flags**
- **Urgency or threats:** "You'll be arrested today," "Your SIN is suspended."
- **Unusual payment requests:** gift cards, cryptocurrency, wire transfers or e-Transfers to a stranger.
- **Asking for personal info:** your SIN, passwords, banking details or one-time codes.
- **"Don't tell anyone"** or "stay on the line."

**Good to know**
- The **CRA never** asks for payment by gift card or crypto, and never threatens arrest.
- "Your SIN is suspended" is always a scam: SINs aren't suspended.
- Your bank will **never** ask for your full password or a one-time code.

**What to do**
1. **Hang up.** Don't press any numbers.
2. **Call back using an official number** from the organization's website or the back of your card, not the number they gave you.
3. **Never send money** under pressure.

**If you were scammed**
- Call your bank right away.
- Report it to the **Canadian Anti-Fraud Centre** and to your local police.
- Change your passwords and turn on two-factor authentication.` },
  { topic: "education", lang: "en", q: ["Make me a study plan for my final exams", "how should i study for finals", "study schedule for exams in 3 weeks"], a: `Here's a study plan you can adapt for about three weeks before your exams.

**Step 1: Map it out (day 1)**
- List every exam with its date and how much it counts.
- For each course, list the topics and rate them: 🟢 know well, 🟡 so-so, 🔴 weak.

**Step 2: Plan your weeks**
- **Week 1: Learn and review.** Go through all your notes, starting with 🔴 topics. Make summary sheets.
- **Week 2: Practise.** Do past exams and practice problems. Mark what you get wrong and review those topics.
- **Week 3: Test yourself.** Full timed practice exams, review your summary sheets, and do light review the night before.

**Step 3: A typical study day**
- **3–4 focused blocks** of 50 minutes, with 10-minute breaks (or 25/5 with the Pomodoro method).
- Mix subjects across the day instead of studying one for eight hours.
- Hardest subject when you're most alert.

**Techniques that actually work**
- **Active recall:** close your notes and write what you remember, or use flashcards.
- **Spaced repetition:** review topics again after 1 day, 3 days and a week.
- **Teach it:** explain a concept out loud as if to a friend.

**Look after yourself**
Sleep 7–9 hours, eat properly and move a bit every day. Sleep is when your brain stores what you learned.

Tell me your exam dates and subjects, and I'll make you a day-by-day schedule.` },

  // ===================== Everyday life (EN) =====================
  { topic: "general", lang: "en", q: ["Plan a 3-day trip to Banff", "banff itinerary 3 days", "what should i do in banff for a weekend"], a: `Here's a relaxed 3-day plan for Banff National Park. You'll need a **Parks Canada pass** for each day in the park.

**Day 1: Banff town**
- **Morning:** Ride the **Banff Gondola** up Sulphur Mountain for views of the Bow Valley.
- **Afternoon:** Walk **Banff Avenue**, then see **Bow Falls** and the **Fairmont Banff Springs**.
- **Evening:** Soak in the **Banff Upper Hot Springs**.

**Day 2: Lake Louise and Moraine Lake**
- **Early morning:** Head to **Lake Louise**. Private vehicle access to Moraine Lake is restricted, so book the **Parks Canada shuttle** or a commercial shuttle ahead of time.
- **Midday:** Hike to the **Lake Agnes Tea House** (about 7 km return), or paddle on the lake.
- **Afternoon:** **Moraine Lake** and the short Rockpile Trail for the famous view.

**Day 3: Icefields Parkway or Johnston Canyon**
- **Option A:** Drive part of the **Icefields Parkway** to **Peyto Lake** and **Bow Lake**.
- **Option B:** Walk **Johnston Canyon** to the Lower and Upper Falls (about 5 km return), then stop in Canmore on the way out.

**Tips**
- Book accommodation early, especially in summer.
- Start early to avoid crowds and find parking.
- Carry **bear spray**, know how to use it, and keep your distance from wildlife.
- Weather changes fast in the mountains, so pack layers even in July.

Want me to adapt it for winter, a budget, or travelling with kids?` },
  { topic: "general", lang: "en", q: ["How do I make butter tarts?", "butter tart recipe", "give me a recipe for canadian butter tarts"], a: `Butter tarts are a classic Canadian dessert. This makes 12.

**Ingredients**
- 12 unbaked tart shells (store-bought or homemade)
- ½ cup (113 g) butter, melted
- 1 cup packed brown sugar
- ⅓ cup corn syrup or maple syrup
- 2 eggs
- 1 tsp vanilla
- 1 tbsp white vinegar or lemon juice (balances the sweetness)
- Pinch of salt
- ½ cup raisins or pecans (optional)

**Steps**
1. **Preheat** the oven to **375°F (190°C)**. Put the tart shells on a baking sheet.
2. **Mix the filling:** whisk the melted butter and brown sugar, then add the syrup, eggs, vanilla, vinegar and salt. Whisk until smooth, but don't overbeat.
3. **Add raisins or pecans** to the shells if using.
4. **Fill each shell** about two-thirds full.
5. **Bake 15–18 minutes**, until the filling is bubbly and the pastry is golden. For a runnier centre, bake on the shorter side.
6. **Cool** for at least 20 minutes so the filling sets.

**The great debate:** runny or firm, raisins or no raisins. There's no wrong answer! 🍁` },
  { topic: "general", lang: "en", q: ["What are my rights as a tenant?", "can my landlord kick me out", "tenant rights canada"], a: `Tenant rights in Canada are set by each **province or territory**, so the details depend on where you live. Here's what's generally true across the country:

**Common protections**
- **Written notice is required** before most changes, like rent increases or ending a tenancy, with specific notice periods.
- **Rent increases** are limited in some provinces (for example, there are annual guidelines in Ontario, BC and Quebec for many units), and usually allowed only once every 12 months.
- **Eviction needs a legal reason** and, in most provinces, an order from the provincial tenancy board. A landlord can't just change the locks or throw your things out.
- **Repairs:** landlords must keep the unit safe and in good repair, including heat in winter.
- **Entry:** landlords usually need to give notice (often 24 hours) before entering, except in emergencies.
- **Discrimination** based on things like race, religion, disability or family status is illegal under human rights law.

**Where to get help**
- **Ontario:** Landlord and Tenant Board
- **Quebec:** Tribunal administratif du logement
- **BC:** Residential Tenancy Branch
- **Alberta:** Residential Tenancy Dispute Resolution Service
- Other provinces have similar offices.

Keep everything in writing and take photos of the unit when you move in. Tell me your province and what's going on, and I can give you more specific information. For serious disputes, a legal clinic can give free advice.` },
  { topic: "health", lang: "en", q: ["How can I stay healthy during winter?", "tips for winter blues", "how to deal with seasonal depression"], a: `Canadian winters are long and dark, so it's normal to feel lower energy. Here's what helps:

**Get light**
- Go outside during daylight, even 20–30 minutes at lunch.
- A **light therapy lamp** (10,000 lux, used in the morning) helps many people with the winter blues. Ask your doctor first if you have eye conditions or bipolar disorder.

**Keep moving**
- Walk, skate, ski, or do a home workout. Regular exercise improves mood and sleep.

**Eat and sleep well**
- Keep a regular sleep schedule.
- Ask your doctor or pharmacist about **vitamin D**, since Canadians get less sun in winter.

**Stay connected**
- Plan regular time with friends or family, even a phone call or a winter walk.

**Protect yourself from the cold**
- Dress in layers, cover your skin in extreme cold, and watch for signs of frostbite (white or numb skin).
- Get your **flu shot**, and wash your hands often.

**When to get help**
If you feel down most days for two weeks or more, lose interest in things you enjoy, or have trouble functioning, talk to a doctor. **Seasonal affective disorder (SAD)** is common and treatable. If you ever have thoughts of suicide, call or text **9-8-8**, any time.` },

  // ===================== Tech (EN) =====================
  { topic: "technology", lang: "en", q: ["Explain the difference between Python lists and tuples", "list vs tuple python", "when should i use a tuple instead of a list"], a: `Both lists and tuples store ordered collections of items, but they have one key difference: **lists can change, tuples can't**.

**List** — mutable, written with square brackets:
\`\`\`python
fruits = ["apple", "banana"]
fruits.append("cherry")   # works
fruits[0] = "mango"       # works
\`\`\`

**Tuple** — immutable, written with parentheses:
\`\`\`python
point = (3, 4)
point[0] = 5   # TypeError: tuples can't be changed
\`\`\`

**When to use each**
- **List:** a collection that grows, shrinks or changes, like a shopping cart or search results.
- **Tuple:** a fixed group of related values, like coordinates (x, y), an RGB colour, or a database row.

**Other differences**
- Tuples can be **dictionary keys** (if their contents are hashable). Lists can't.
- Tuples are slightly **faster and use less memory**.
- Tuples signal intent: other programmers know the data shouldn't change.

**Handy trick:** tuples make it easy to return several values from a function:
\`\`\`python
def min_max(nums):
    return min(nums), max(nums)

low, high = min_max([4, 9, 1])  # low=1, high=9
\`\`\`` },
  { topic: "technology", lang: "en", q: ["How do I make my passwords secure?", "password security tips", "how to keep my accounts safe from hackers"], a: `Here's how to keep your accounts safe, in order of impact:

**1. Use a password manager**
Apps like Bitwarden, 1Password or your phone's built-in manager create and remember a strong, **unique password for every account**. Then you only need to remember one strong master password.

**2. Never reuse passwords**
When one site gets breached, attackers try the same email and password everywhere else. Unique passwords stop that.

**3. Turn on two-factor authentication (2FA)**
Start with your email, bank and social media. An **authenticator app** or **passkey** is more secure than SMS codes, but SMS is still much better than nothing.

**4. Make strong passwords**
If you have to create one yourself, use a **long passphrase** of four or more random words, like *maple-river-lantern-toast*. Length matters more than symbols.

**5. Watch for phishing**
Don't log in through links in unexpected emails or texts. Go to the site directly instead.

**6. Check for breaches**
Sites like Have I Been Pwned tell you whether your email showed up in a known breach. If it did, change that password.

**7. Use passkeys when offered**
Many sites now support passkeys, which use your fingerprint or face instead of a password and can't be phished.` },

  // ===================== French =====================
  { topic: "finance", lang: "fr", q: ["Quelle est la différence entre un CELI et un REER?", "celi ou reer lequel choisir", "celi vs reer"], a: `Les deux sont des comptes enregistrés qui t'aident à épargner en payant moins d'impôt, mais ils fonctionnent à l'inverse l'un de l'autre.

**CELI (compte d'épargne libre d'impôt)**
- Tu cotises avec de l'argent déjà imposé, donc pas de déduction.
- La croissance et les retraits sont **libres d'impôt**.
- Tu peux retirer en tout temps, et le montant retiré s'ajoute à tes droits de cotisation le 1er janvier suivant.

**REER (régime enregistré d'épargne-retraite)**
- Les cotisations sont **déductibles d'impôt**, ce qui réduit ton revenu imposable maintenant.
- La croissance est à l'abri de l'impôt, mais les retraits sont **imposés comme un revenu**.
- Il est conçu pour la retraite et doit être converti (souvent en FERR) au plus tard à la fin de l'année de tes 71 ans.

**Lequel choisir?**
- **Revenu plus faible aujourd'hui :** le CELI est souvent plus avantageux.
- **Revenu élevé aujourd'hui et plus faible à la retraite :** le REER rapporte plus.
- **Projet à court terme :** le CELI, pour sa flexibilité.
- **Premier achat d'une maison :** regarde aussi le CELIAPP.

Les plafonds changent chaque année. Tes droits personnels sont dans Mon dossier de l'ARC. Pour une situation complexe, un planificateur financier peut t'aider.` },
  { topic: "immigration", lang: "fr", q: ["Je viens d'arriver au Canada, je fais quoi en premier?", "liste pour nouveaux arrivants au canada", "quoi faire après mon arrivée au canada"], a: `Bienvenue au Canada! Voici une liste pour tes premières semaines :

**Les premiers jours**
1. **Demande ton NAS** (numéro d'assurance sociale) auprès de Service Canada. Il te faut pour travailler et produire ta déclaration de revenus.
2. **Ouvre un compte bancaire.** La plupart des banques ont des forfaits pour nouveaux arrivants.
3. **Prends un forfait de téléphone** avec un numéro canadien.

**Les premières semaines**
4. **Inscris-toi à l'assurance maladie de ta province** (RAMQ au Québec, OHIP en Ontario, etc.). Certaines provinces ont un délai de carence : pense à une assurance privée pour cette période.
5. **Trouve un logement.** Attention aux fraudes : n'envoie jamais d'argent avant d'avoir visité et signé un bail.
6. **Ton permis de conduire :** selon ton pays, tu pourras peut-être l'échanger, sinon il faudra passer des examens.

**Pour bien t'installer**
7. **Inscris tes enfants à l'école** auprès du centre de services scolaire ou du conseil scolaire.
8. **Utilise les services d'établissement gratuits** pour l'emploi, la francisation ou les cours d'anglais, et les démarches.
9. **Commence à bâtir ton crédit** avec une petite carte de crédit payée en entier chaque mois.

Les règles varient selon la province. Tu habites où? Je peux te donner des étapes plus précises.` },
  { topic: "jobs", lang: "fr", q: ["Comment faire un CV à la canadienne?", "conseils cv canada", "à quoi doit ressembler mon cv au québec"], a: `Le CV canadien a quelques règles différentes de celles de bien des pays.

**À ne pas mettre**
- **Pas de photo**, de date de naissance, d'état civil, de religion ni de NAS.
- Pas besoin de l'adresse complète : la ville et la province suffisent.

**Format**
- **Une à deux pages**, en ordre chronologique inversé (l'emploi le plus récent en premier).
- Une mise en page sobre avec des titres clairs.
- En PDF, sauf si l'employeur demande autre chose.

**Sections**
1. **Coordonnées :** nom, téléphone, courriel, LinkedIn, ville.
2. **Profil :** deux ou trois lignes sur qui tu es et ce que tu apportes.
3. **Expérience :** poste, employeur, ville, dates, puis 3 à 5 puces.
4. **Formation :** avec l'équivalence canadienne si tu as étudié à l'étranger.
5. **Compétences :** techniques, langues, certifications.

**Des puces qui ont de l'impact**
Commence par un verbe d'action et montre des résultats :
- Faible : « Responsable du service à la clientèle. »
- Fort : « Traité plus de 40 demandes de clients par jour, avec un taux de satisfaction de 95 %. »

Adapte ton CV à chaque offre avec les mots-clés de l'annonce. Colle ton CV ici si tu veux que je le révise.` },
  { topic: "tax", lang: "fr", q: ["Comment faire ma déclaration de revenus pour la première fois?", "première déclaration d'impôt canada", "comment faire mes impôts au québec"], a: `Ta première déclaration est plus simple qu'elle en a l'air. Voici les étapes :

**1. Obtiens ton NAS**
Il te faut un numéro d'assurance sociale pour produire ta déclaration.

**2. La date limite**
Pour la plupart des gens, c'est le **30 avril** pour l'année précédente. Les travailleurs autonomes ont jusqu'au 15 juin pour produire, mais le solde dû reste payable le 30 avril.

**3. Rassemble tes feuillets**
- **T4** de chaque employeur (et **Relevé 1** au Québec)
- **T5** pour les revenus de placement
- **T2202** pour les frais de scolarité
- Tes reçus : frais médicaux, dons, frais de garde

**4. Au Québec : deux déclarations**
Tu produis une déclaration **fédérale** (ARC) et une déclaration **provinciale** (Revenu Québec). Ailleurs au Canada, une seule déclaration couvre les deux.

**5. Comment la produire**
- Un **logiciel homologué** pour la transmettre en ligne. Plusieurs sont gratuits.
- Les **comptoirs d'impôts gratuits** si ton revenu est modeste et ta situation simple.
- Un **comptable** si c'est plus complexe.

**Pourquoi produire même avec un petit revenu?** Ça te donne droit au crédit pour la TPS/TVH, à l'Allocation canadienne pour enfants et à d'autres prestations.

Pour les règles à jour, consulte canada.ca et revenuquebec.ca.` },
  { topic: "transport", lang: "fr", q: ["Des conseils pour conduire l'hiver?", "conduite hivernale conseils", "comment conduire sur la neige"], a: `Conduire l'hiver au Canada demande un peu de préparation. Voici l'essentiel :

**Avant la saison**
- **Pose tes pneus d'hiver** quand il fait environ 7 °C ou moins. Au Québec, ils sont **obligatoires du 1er décembre au 15 mars**.
- **Prépare une trousse d'hiver :** grattoir et balai, pelle, couverture, lampe de poche, câbles de démarrage, sable, collations et eau.
- Garde ton **réservoir au moins à moitié plein** et utilise du lave-glace d'hiver.

**Avant chaque départ**
- **Déneige complètement** ta voiture, y compris le toit, les phares et les rétroviseurs.
- Vérifie l'état des routes sur **Québec 511** ou le service 511 de ta province.

**Sur la route**
- **Ralentis** et garde **au moins le double** de la distance habituelle.
- **Freine, tourne et accélère en douceur.**
- **En cas de dérapage,** regarde et dirige le volant là où tu veux aller, sans freiner brusquement.
- Méfie-toi de la **glace noire** sur les ponts et dans les zones ombragées.
- **N'utilise pas le régulateur de vitesse** sur une chaussée glissante.

**Si tu restes pris**
Reste dans ta voiture, fais tourner le moteur environ 10 minutes par heure, garde le tuyau d'échappement dégagé et appelle de l'aide.` },
  { topic: "general", lang: "fr", q: ["Écris un courriel pour demander une augmentation", "courriel pour demander une augmentation de salaire", "comment demander une augmentation à mon patron"], a: `Demander une rencontre fonctionne souvent mieux que demander l'augmentation directement par courriel. Voici un modèle :

---

**Objet :** Rencontre au sujet de mon rôle et de ma rémunération

Bonjour [Nom],

J'aimerais prendre un moment avec toi pour parler de mon rôle et de ma rémunération. Au cours de la dernière année, j'ai [réalisation 1, p. ex. mené le projet X, qui a réduit les délais de 20 %], [réalisation 2] et [nouvelle responsabilité].

J'aime beaucoup mon travail ici et j'aimerais discuter de la façon dont ma rémunération pourrait refléter ces contributions. Aurais-tu 30 minutes dans les deux prochaines semaines?

Merci,
[Ton nom]

---

**Pour préparer la rencontre :**
- **Renseigne-toi sur le salaire du marché** pour ton poste et ta ville.
- **Apporte des résultats précis**, chiffrés si possible.
- **Demande un montant ou une fourchette précise.**
- **Prévois un plan B :** si le budget n'est pas là, demande un échéancier, de la formation ou des vacances supplémentaires.

Veux-tu que j'adapte le ton (vouvoiement, par exemple) ou que j'ajoute tes réalisations?` },
  { topic: "science", lang: "fr", q: ["Pourquoi le ciel est bleu?", "explique pourquoi le ciel est bleu", "pourquoi les couchers de soleil sont rouges"], a: `Le ciel est bleu à cause de la façon dont la lumière du soleil est diffusée dans l'air. C'est la **diffusion de Rayleigh**.

**Étape par étape**
1. La lumière du soleil semble blanche, mais c'est un mélange de toutes les couleurs, chacune avec sa longueur d'onde.
2. En entrant dans l'atmosphère, elle frappe de minuscules molécules de gaz (surtout l'azote et l'oxygène).
3. Ces molécules diffusent beaucoup plus les **courtes longueurs d'onde** (bleu et violet) que les longues (rouge et orange).
4. Cette lumière bleue diffusée nous arrive de partout, alors tout le ciel paraît bleu.

**Pourquoi pas violet?**
La lumière du soleil contient moins de violet, une partie est absorbée en haute altitude, et nos yeux sont plus sensibles au bleu.

**Pourquoi les couchers de soleil sont rouges**
Au coucher du soleil, la lumière traverse beaucoup plus d'atmosphère. La majeure partie du bleu est diffusée en chemin, et il reste surtout le rouge et l'orange.` },
];

module.exports = { expand, longform };
