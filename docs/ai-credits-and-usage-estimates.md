# AI credits, token usage, and cost estimates

This document describes how CareerPulse converts LLM usage into **credits**, estimates **read/write tokens** per operation, and models **API cost and risk**. Values are engineering estimates derived from prompt shapes, `max_tokens` caps, and product limits in the codebase—not production histograms. After launch, use `ai_usage_events` for real min/avg/max.

**Related code**

| Area | Path |
|------|------|
| Credit formula | `lib/credits/calculator.ts` |
| Pre-call reservation | `lib/credits/reservation.ts`, `lib/credits/ai-billing.ts` |
| Anthropic calls + billing | `lib/ai/anthropic-gateway.ts` |
| API usage parsing (strict) | `lib/ai/anthropic-usage.ts` |
| Token fallback estimate | `lib/ai/token-estimate.ts` (reservation input only; not post-call billing) |
| Anthropic USD (list price) | `lib/ai/anthropic-pricing.ts` |
| Cover letter / CV extract | `lib/claude.ts` |
| Job match analysis | `lib/jobs/analyze-job.ts` |
| CV optimise | `app/api/cv/optimise/route.ts` |
| AI tools | `app/api/ai/route.ts` |
| Interview AI | `lib/interview/ai/operations.ts`, `lib/interview/ai/runner.ts` |

---

## 1. Credit calculation logic

### 1.1 Default rule (database seed)

Active row in `credit_rule_versions` (when none exists, code uses the same defaults):

| Field | Value | Meaning |
|-------|------:|---------|
| `input_token_unit` | 1000 | Input tokens per billing step |
| `input_token_credits` | 1 | Credits charged per input step |
| `output_token_unit` | 1000 | Output tokens per billing step |
| `output_token_credits` | 5 | Credits charged per output step |

**Formula** (from `calculateCreditsFromTokens`):

```text
inputCredits  = (inputTokens  / input_token_unit)  × input_token_credits
outputCredits = (outputTokens / output_token_unit) × output_token_credits
totalCredits  = roundCredits(inputCredits + outputCredits)   // 4 decimal places
```

**Examples**

| Input tokens | Output tokens | Credits |
|-------------:|--------------:|--------:|
| 0 | 0 | 0 |
| 500 | 500 | 0.5 + 2.5 = **3.0** |
| 1,500 | 0 | **1.5** |
| 0 | 2,500 | **12.5** |
| 3,000 | 6,000 | 3 + 30 = **33** |
| 50,000 | 8,192 | 50 + 40.96 = **90.96** |

**Quick mental model (default rule):**  
**1 credit ≈ $0.001 Anthropic API cost on Claude Haiku 4.5** (see §4).

### 1.2 Billing tokens (source of truth)

**After each successful Anthropic `messages.create` call**, credits and `ai_usage_events` use **only** API usage:

```text
inputTokens  = message.usage.input_tokens
outputTokens = message.usage.output_tokens
token_source = 'api'
```

If `usage.input_tokens` or `usage.output_tokens` is missing, the gateway throws `missing_api_usage` (no char-based billing fallback).

Implementation: [`lib/ai/anthropic-usage.ts`](lib/ai/anthropic-usage.ts) (`requireAnthropicUsageTokens`), [`lib/ai/anthropic-gateway.ts`](lib/ai/anthropic-gateway.ts).

Cache fields (`cache_creation_input_tokens`, `cache_read_input_tokens`) are stored for USD cost only; the **credit formula** still uses `input_tokens` + `output_tokens` only.

Character length is still stored as `input_chars` / `output_chars` for analytics, not for charging when `token_source = api`.

### 1.3 Pre-call credit reservation (`withCreditBilling`)

Before the API call, the app holds credits using a **worst-case estimate** (input still from prompt length; output assumes full `max_tokens`):

```text
inputTokensEstimate  = ceil(inputText.length / charsPerToken)
reservationCredits     = calculateCreditsFromTokens(
                           inputTokensEstimate,
                           maxOutputTokens,
                           rule
                         )
```

- Default `charsPerToken` = **5** (`AI_CHARS_PER_TOKEN` env overrides).
- Implementation: [`lib/credits/reservation.ts`](lib/credits/reservation.ts).

If `balance < reservationCredits` → `INSUFFICIENT_CREDITS` **before** the API call.

After the call, credits settle to **actual API tokens** (often less than the hold; unused hold is released).

**Admin check:** `GET /api/admin/ai-usage` returns `token_stats.by_source` and `estimated_last_24h`. Any `estimated` rows in the last 24h warrant investigation.

### 1.4 Special cases

| Case | Behavior |
|------|----------|
| `cv_rewrite_suggestions` | Two API calls possible (retry); single `chargeAiUsageFromTokens` with **summed** tokens |
| `runInterviewAi` | Up to **2** attempts on invalid JSON (doubles worst-case cost) |
| Quiz answer grading | **No LLM** (`evaluateQuizAnswerLocal`) |
| `generateCoverLetterStream` | Direct SDK stream; **not** wired through `claudeComplete` billing today |
| Health check | `max_tokens: 16`, typically not user-billed |

### 1.5 Recording usage

Each billed call can persist `ai_usage_events` with `category`, `operation`, `input_tokens`, `output_tokens`, `credits_consumed`, `token_source` (`api` | `estimated`), and optional USD via `computeAnthropicUsdCost`.

---

## 2. Models and API pricing (reference)

| Env / default | Typical use |
|---------------|-------------|
| `ANTHROPIC_MODEL` (default `claude-sonnet-4-20250514`) | Most `claudeComplete` calls |
| `CV_ANALYZER_API_MODEL` (default `claude-haiku-4-5-20251001`) | Job analysis, interview analyzer ops |

**List prices used in `lib/ai/anthropic-pricing.ts` (USD per million tokens)**

| Model family | Input | Output |
|--------------|------:|-------:|
| Haiku | $1.00 | $5.00 |
| Sonnet | $3.00 | $15.00 |

```text
apiUsd = (inputTokens / 1e6) × inputRate + (outputTokens / 1e6) × outputRate
```

OpenAI and other providers: use the **same token counts**; multiply by that provider’s $/MTok.

---

## 3. Hard limits affecting read size

| Limit | Value | Applies to |
|------:|------:|------------|
| `MAX_CV_TEXT_CHARS` | 60,000 | CV extract, cover letter extract (`lib/claude.ts`) |
| Job description (optimise UI) | 3,000 shown in UI | Not enforced server-side on all routes |
| Job description (optimise API) | min 100 chars | `POST /api/cv/optimise` |
| Job description (job analyze) | min 50 chars | `POST /api/jobs/analyze` |
| Interview JD stored | 4,000 chars | `job_summary` slice |
| Prep answer output | ≤ 1,500 chars | Prompt + validators |
| Reshape draft | ≤ 4,000 chars | `PREP_RESHAPE_DRAFT_MAX_CHARS` |
| CV summary field (UI) | 2,000 chars | Editor |
| Interview context | Compact summaries | Session Q/A truncated in `lib/interview/context.ts` |

Full CV JSON is sent **untruncated** for job analysis and CV optimise (main cost drivers).

---

## 4. Operations catalog

**Columns**

- **Read / Write tokens:** min / avg / max (estimated from prompts + caps).
- **Credits:** computed with default rule on those token ranges.
- **API USD (Haiku):** using Haiku list prices; Sonnet ≈ **3×** input and **3×** output vs Haiku for same tokens.
- **max_out:** `max_tokens` passed to Anthropic (output cap).
- **Reservation:** approximate credits needed to **pass** pre-check (40% of max output + estimated input at chars÷5).

Operations are billed as `category:operation` unless noted.

### 4.1 CV creation (`cv_creation`)

| Operation | Route / function | max_out | Read tokens (min / avg / max) | Write tokens (min / avg / max) | Credits (min / avg / max) | USD Haiku avg | Reservation (typ.) |
|-----------|------------------|--------:|------------------------------:|-------------------------------:|--------------------------:|--------------:|-------------------:|
| `extract` | `/api/extract`, `extractCVFromText` | 8192 | 800 / 3,500 / 16,000+ | 1,000 / 2,500 / **8192** | 5 / **16** / **90** | ~$0.016 | ~**35–45** |

Notes: Max read when document → 60k chars (+ ~900 token schema). Max write hits JSON CV profile at 8192 tokens.

### 4.2 Cover letter (`cover_letter`)

| Operation | max_out | Read (min / avg / max) | Write (min / avg / max) | Credits (min / avg / max) | USD Haiku avg | Reservation |
|-----------|--------:|-----------------------:|------------------------:|--------------------------:|--------------:|------------:|
| `extract` | 4096 | 400 / 1,200 / 16,000+ | 200 / 700 / 4096 | 2 / **5** / 25 | ~$0.005 | ~15 |
| `generate` | 1000 | 400 / 1,500 / 6,000 | 300 / 500 / **1000** | 2 / **4** / 8 | ~$0.004 | ~**8** |
| `enhance` | 1000 | 300 / 900 / 2,500 | 300 / 500 / 1000 | 2 / **3.5** / 7 | ~$0.003 | ~7 |
| `score_ats` | 500 | 400 / 1,300 / 5,000 | 80 / 200 / 500 | 1 / **2** | ~$0.002 | ~5 |

Cover letter generate targets ~200–500 words (~1.2k–3.5k chars output).

### 4.3 Job analysis (`job_analysis`)

| Operation | max_out | Read (min / avg / max) | Write (min / avg / max) | Credits (min / avg / max) | USD Haiku avg | Reservation |
|-----------|--------:|-----------------------:|------------------------:|--------------------------:|--------------:|------------:|
| `analyze` | 4096 | 1,000 / 3,500 / 13,000 | 200 / 500 / 4096 | 2 / **6** | 25 | ~$0.006 | ~12 |

Model: `INTERVIEW_ANALYZER_MODEL` (Haiku by default). Full `CVData` JSON + job description in user prompt.

### 4.4 Job-specific CV (`job_specific_cv`)

| Operation | max_out | Read (min / avg / max) | Write (min / avg / max) | Credits (min / avg / max) | USD Haiku avg | Reservation |
|-----------|--------:|-----------------------:|------------------------:|--------------------------:|--------------:|------------:|
| `optimise` | 8192 | 1,500 / 4,000 / 13,000 | 1,500 / 4,000 / **8192** | 8 / **24** / **90** | ~$0.024 | ~**40–50** |

Often the largest single call in the apply flow.

### 4.5 AI suggestions (`ai_suggestions`)

| Operation | Tool / note | max_out | Read (min / avg / max) | Write (min / avg / max) | Credits (min / avg / max) | USD Haiku avg |
|-----------|-------------|--------:|-----------------------:|------------------------:|--------------------------:|--------------:|
| `completion` | `jd_analyze` | 800 | 100 / 500 / 2,000 | 100 / 300 / 800 | 0.5 / **2** / 5 | ~$0.002 |
| `completion` | `linkedin_summary` | 600 | 50 / 300 / 700 | 100 / 300 / 600 | 0.5 / **2** | 4 | ~$0.002 |
| `completion` | `cold_email` | 1200 | 50 / 400 / 1,000 | 200 / 400 / 1200 | 1 / **2.5** / 8 | ~$0.002 |
| `completion` | `bullet_improve` | 400 | 40 / 120 / 300 | 50 / 120 / 400 | 0.2 / **0.8** / 3 | ~$0.001 |
| `completion` | `interview_questions` | 1200 | 100 / 500 / 2,000 | 200 / 450 / 1200 | 1 / **2.5** / 8 | ~$0.002 |
| `cv_rewrite` | 3 suggestions; retry ×2 | 1200 | 150 / 400 / 2,000 | 100 / 300 / 1200 | 1 / **2** / 8 (×2 if retry) | ~$0.002 |

### 4.6 Interview prep (`interview_prep`)

Default `max_out` = **4096** when not listed. Model: Haiku for analyzer-style ops; Sonnet possible if env points main model at interview runner.

| Operation | max_out | Read (min / avg / max) | Write (min / avg / max) | Credits (min / avg / max) | USD Haiku avg | Live path? |
|-----------|--------:|-----------------------:|------------------------:|--------------------------:|--------------:|:-----------|
| `planning` | 4096 | 300 / 650 / 1,500 | 80 / 200 / 800 | 1 / **2** | 8 | Fast job start |
| `clarify` | 4096 | 500 / 900 / 2,000 | 100 / 250 / 600 | 1 / **2.5** | 6 | Full analyze only |
| `analysis_job` | 4096 | 400 / 800 / 2,000 | 150 / 400 / 1,500 | 1 / **3** | 10 | Full analyze |
| `analysis_candidate` | 4096 | 200 / 500 / 1,200 | 150 / 350 / 1,200 | 1 / **2.5** | 8 | Full analyze |
| `competencies` | 8192 | 800 / 1,500 / 3,000 | 400 / 900 / 8192 | 3 / **6** | 45 | Full analyze |
| `gaps` | 4096 | 600 / 1,200 / 2,500 | 200 / 500 / 1,500 | 2 / **4** | 12 | Full analyze |
| `blueprint` | 8192 | 1,500 / 2,500 / 5,000 | 500 / 1,200 / 8192 | 4 / **8** | 50 | Full analyze |
| `prep_questions` | 8192 | 500 / 1,200 / 3,000 | 1,000 / 2,000 / **8192** | 5 / **11** | 45 | Batch of **5** |
| `prep_questions` (topic) | 8192 | same order of magnitude | same | 5 / **11** | 45 | Topic batch ×5 |
| `quiz` | 4096 | 400 / 800 / 1,500 | 500 / 1,000 / 4096 | 2 / **6** | 22 | Default **5** questions |
| `quiz_eval` | 1024 | 200 / 400 / 800 | 100 / 250 / 1024 | 1 / **2** | 6 | **Not used** (local eval) |
| `mock_question` | 1024 | 300 / 650 / 1,300 | 80 / 200 / 800 | 1 / **2** | 5 | Session start |
| `mock_eval` | 1536 | — | — | — | — | **Not used** (turn replaces) |
| `mock_turn` | 1200 | 500 / 1,000 / 3,000 | 150 / 300 / 1200 | 1.5 / **2.5** | 8 | **Per answer** |
| `follow_up` | 512 | — | — | — | — | **Not used** in orchestrator |
| `report` | 1536–4096 | 400 / 1,000 / 2,500 | 300 / 700 / 1536 | 2 / **4.5** | 10 | End of mock session |
| `prep_question_example` | 1024 | 400 / 800 / 1,500 | 200 / 300 / 800 | 1 / **2** | 5 | On demand |
| `prep_question_explain` | 1024 | 400 / 1,000 / 5,000+ | 100 / 250 / 1024 | 1 / **2** | 6 | Chat history unbounded ↑ risk |
| `prep_question_reshape` | 2048 | 500 / 1,300 / 2,500 | 200 / 350 / 1200 | 1.5 / **3** | 8 | User draft ≤4k chars |
| `analysis_topic` | 8192 | 500 / 1,200 / 2,500 | 400 / 1,000 / 8192 | 2 / **7** | 45 | **Defined, not wired** in topic fast start |

**Full analyze pipeline (API `/api/interview/analyze`):** up to **6–7** LLM calls (clarify may short-circuit) ≈ **25–45 credits** avg, **100+** worst case with retries.

**Typical job interview session (fast start):** planning (~2) + prep batches (~11 each) + quiz (~6) + mock (1 + 8×turn ~2.5) + report (~4.5) ≈ **55–80 credits** avg.

---

## 5. Character ↔ token reference

| Content type | Chars per token (rule of thumb) |
|--------------|--------------------------------|
| App estimate | **÷5** |
| English prose | **÷4** |
| JSON / prompts | **÷3.5–4** |

**Output cap in characters (approx.):** `max_tokens × 3.5` for JSON-heavy output.

---

## 6. Product-level credit bundles (commercial reference)

Planned / discussed pricing (not all enforced in code yet):

| Tier | Credits | Notes |
|------|--------:|-------|
| Free welcome | 50 | One-time |
| Pro monthly | 700 / month | Subscription drip |
| Credit packs | 300 ($5) / 650 ($10) | One-time purchase |

**Example consumption (avg credits)**

| User action | Credits (approx.) |
|-------------|------------------:|
| CV parse | 16 |
| Job analyze | 6 |
| Tailored CV optimise | 24 |
| Cover letter generate | 4 |
| ATS score | 2 |
| Full apply (analyze + optimise + letter + ATS) | **36–45** |
| CV rewrite (one field) | 2 |
| Interview prep batch (5 Q&A) | 11 |
| Mock interview (8 answers + report) | **25–30** |
| Heavy month (8 applies + 2 interview loops) | **~400–500** |

700 Pro credits/month ≈ **15–18 tailored CVs** or **~12 full apply packs** or **8 applies + 2 interview loops** (avg).

---

## 7. Risk estimation

### 7.1 Cost per credit (vendor)

| Model | ~USD per credit (avg token mix) | ~USD if all output-weighted at cap |
|-------|--------------------------------:|-----------------------------------:|
| Haiku | **$0.001** | up to **$0.0015** |
| Sonnet | **$0.003** | up to **$0.0045** |

Credits are **not** 1:1 with USD revenue; they are 1:1 with **token economics** under the default rule.

### 7.2 Worst-case single call

Hitting output cap with default rule:

| max_tokens | Max output credits | + 15k input credits | Total credits | Haiku USD |
|-----------:|-------------------:|--------------------:|--------------:|----------:|
| 500 | 2.5 | +15 | 17.5 | ~$0.017 |
| 1000 | 5 | +15 | 20 | ~$0.020 |
| 4096 | 20.48 | +15 | 35.5 | ~$0.035 |
| **8192** | **40.96** | +15 | **~56** | **~$0.056** |

Operations with **8192** cap: `cv_creation:extract`, `job_specific_cv:optimise`, `interview_prep:competencies`, `interview_prep:blueprint`, `interview_prep:prep_questions`.

### 7.3 Systemic risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Free signup credit farming | N × $0.05 API | One-time grant; email verification; 45-day expiry |
| Reservation vs actual mismatch | Users blocked early | Lower max_tokens; tune 40% factor; show estimated cost |
| Interview JSON retry (×2) | 2× call cost | Already capped at 2 attempts |
| CV rewrite retry (×2) | 2× `cv_rewrite` | Same |
| 60k CV extract + 8192 out | ~$0.05–0.08/call | Truncate CV JSON for non-extract flows; cap document size |
| Explain prep chat (long history) | Read tokens grow | Cap history turns server-side |
| Model switch to Sonnet | **~3× API** | Keep Haiku for high-volume paths |
| Uncapped mock answers | Large read on `mock_turn` | Cap answer length |
| Full analyze pipeline unused but callable | 100+ credits per run | Gate to Pro; rate limits |

### 7.4 Scale scenarios (assume 100% credit utilization)

Assume **Haiku**, **$0.001/credit** API.

| Scenario | Credits consumed / month | API cost / month |
|----------|-------------------------:|-----------------:|
| 10k free users × 50 welcome (one-time) | 500k (once) | **$500** once |
| 1k Pro × 700 | 700k | **$700** |
| 10k Pro × 700 | 7M | **$7,000** |
| 10k Pro × 700 on **Sonnet** | 7M | **~$21,000** |

Revenue at $7.99 Pro (≈$7.09 net after ~11% Paddle): 10k Pro → **~$71k/mo net** vs **$7k** Haiku API → **~90% gross margin** on AI before infra/support.

Add **+30%** buffer on API for retries, spikes, and extract/optimise tails when budgeting.

### 7.5 Reservation vs actual (UX / support risk)

Pre-check reserves **full `max_output_tokens`** plus char-estimated input. For `max_tokens = 8192` and 20k-char prompt (≈4k input tokens), reservation ≈ **4 + 40.96 ≈ 45 credits** before the call. Actual API usage is usually much lower; settlement releases the difference.

Users with balance below the reservation cannot start the call even if the eventual charge would be smaller.

---

## 8. Formulas cheat sheet

```text
// Credits (default rule)
credits = round4( (input/1000)*1 + (output/1000)*5 )

// Token estimate from text
tokens ≈ ceil(chars / 5)          // app default
tokens ≈ ceil(chars / 4)          // planning / English

// Anthropic USD (Haiku)
usd = input/1e6*1 + output/1e6*5

// Anthropic USD (Sonnet)
usd = input/1e6*3 + output/1e6*15

// Pre-call reservation output assumption
reservedOut = min(maxOut, max(256, round(maxOut * 0.4)))
```

---

## 9. Maintaining this document

1. When adding an AI call, document `category`, `operation`, `max_tokens`, and typical payload size.
2. After production traffic, run SQL on `ai_usage_events` grouped by `category`, `operation` for empirical min/avg/max (p50/p95).
3. When changing `credit_rule_versions`, update §1.1 and recompute tables.
4. When changing commercial grants (50 / 700 / packs), update §6 only—token math stays the same.

---

*Generated for CareerPulse production planning. Token ranges are estimates; treat p95 from `ai_usage_events` as source of truth post-launch.*
