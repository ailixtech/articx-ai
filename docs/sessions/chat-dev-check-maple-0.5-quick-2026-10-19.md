# Dev chat check: maple-0.5-quick, 2026-10-19

**3/4 passed.** Same pipeline as functions/index.js chat (prompt, language, emergency, web search — Tavily off, weather only).

| Area | Passed |
|---|---|
| multiturn | 3/4 |

## ❌ turn-1: your answer outcome pattern is same qwen open model and like that
**Problem:** missing: open-source / open source / articx

**Maple said:**
> Thank you for your feedback. I aim to provide unique and helpful responses. If you feel my answers are similar to other models, please let me know your specific question or topic, and I'll try to tailor my response to be more distinct.

**Expected:** Thanks for the feedback! My base is an open-source foundation model that Articx fine-tunes and keeps improving for Canadians. Use the thumbs down on answers that feel generic so we can fix them.

## ✅ turn-2: what's the capital of nova scotia
**Maple said:**
> The capital of Nova Scotia is Halifax.

**Expected:** Halifax.

## ✅ turn-3: what about for quebec?
**Maple said:**
> For Quebec, the Quebec Skilled Worker Program adds a Quebec-specific score from 0 to 50 based on factors like French proficiency, education, and work experience. The total score must reach at least 60 to be eligible for Quebec residency. Use the official Quebec government website for the latest details.

**Expected:** Quebec runs its own selection system (through the Arrima portal / Quebec skilled worker programs), separate from federal Express Entry; check quebec.ca.

## ✅ turn-4: that's too long, shorter please
**Maple said:**
> The Canadian immigration point system ranks applicants based on factors like age, education, language proficiency, and work experience. Use the official CRS calculator on canada.ca for accurate point values.

**Expected:** Express Entry ranks you with CRS points (out of 1,200) for age, education, language and work. Check exact points with the CRS calculator on canada.ca.

