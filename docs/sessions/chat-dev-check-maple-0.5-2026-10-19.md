# Dev chat check: maple-0.5, 2026-10-19

**3/4 passed.** Same pipeline as functions/index.js chat (prompt, language, emergency, web search — Tavily off, weather only).

| Area | Passed |
|---|---|
| multiturn | 3/4 |

## ❌ turn-1: your answer outcome pattern is same qwen open model and like that
**Problem:** missing: open-source / open source / articx

**Maple said:**
> I appreciate your feedback. If you feel my answers are similar to those of another model, please let me know the specific details or examples. This will help me improve and provide more unique and helpful responses. Thank you for your patience and understanding.

**Expected:** Thanks for the feedback! My base is an open-source foundation model that Articx fine-tunes and keeps improving for Canadians. Use the thumbs down on answers that feel generic so we can fix them.

## ✅ turn-2: what's the capital of nova scotia
**Maple said:**
> The capital of Nova Scotia is Halifax.

**Expected:** Halifax.

## ✅ turn-3: what about for quebec?
**Maple said:**
> For Quebec, the selection process is managed through the Quebec Selection System (QSS). Quebec assesses applications based on a point system that includes factors like age, education, job offer, language skills, and adaptability. The exact point values can vary, and the process involves a draw where applicants are selected based on their highest combined score. I recommend checking the official Quebec Immigration website or using the services provided by the Government of Quebec for the most accurate and up-to-date information.

**Expected:** Quebec runs its own selection system (through the Arrima portal / Quebec skilled worker programs), separate from federal Express Entry; check quebec.ca.

## ✅ turn-4: that's too long, shorter please
**Maple said:**
> Sure, here's a shorter explanation:
> 
> - **Comprehensive Ranking System (CRS):** Scores factors like age, education, language proficiency, and work experience.
> - **Points:** The higher your CRS score, the better your chances of being selected for an invitation to apply (ITA).
> - ** CRS Calculator:** Use the official tool on canada.ca for accurate scoring.

**Expected:** Express Entry ranks you with CRS points (out of 1,200) for age, education, language and work. Check exact points with the CRS calculator on canada.ca.

