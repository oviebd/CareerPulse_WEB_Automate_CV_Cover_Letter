# Database Schema Documentation
**Platform:** AI CV & Cover Letter SaaS  
**Database:** PostgreSQL via Supabase  
**Version:** 1.0 — Source of Truth  

---

## Overview

This document describes every table in the database, what it stores, who uses it, and how tables relate to each other. Use this as the single reference when generating migrations, ORM models, or API code.

---

## Table Index

| # | Table | Schema | Purpose | Row estimate (1K users) |
|---|---|---|---|---|
| 1 | `auth.users` | auth (Supabase managed) | Authentication identities | 1,000 |
| 2 | `profiles` | public | User account + subscription state | 1,000 |
| 3 | `cv_profiles` | public | Structured CV data per user | 1,000 |
| 4 | `cover_letters` | public | Generated cover letters + ATS scores | 15,000–30,000 |
| 5 | `job_applications` | public | Job tracker Kanban entries | 10,000–20,000 |
| 6 | `payments` | public | Payment + subscription billing records | 2,000–5,000 |
| 7 | `cv_templates` | public | Seed data — available CV/CL templates | ~15 rows (static) |

---

## Relationship Map

```
auth.users (Supabase Auth)
    │
    │ 1:1 (id → id)
    ▼
profiles  ──────────────────────────────────────────────────┐
    │                                                        │
    │ 1:1 (user_id)          1:many (user_id)               │ 1:many (user_id)
    ▼                        ▼                              ▼
cv_profiles             cover_letters                  job_applications
    │                        │                              │
    │ preferred_by            │ optional FK                  │ optional FK
    ▼                        └──────────────────────────────┘
cv_templates                     (a cover letter can be linked to one application)
                                 (an application can have many cover letters)

profiles
    │
    │ 1:many (user_id)
    ▼
payments
```

### Relationship Types

| From | To | Type | FK Column | Notes |
|---|---|---|---|---|
| `auth.users` | `profiles` | One-to-one | `profiles.id` = `auth.users.id` | Supabase auto-creates auth.users |
| `profiles` | `cv_profiles` | One-to-one | `cv_profiles.user_id` | One master CV profile per user |
| `profiles` | `cover_letters` | One-to-many | `cover_letters.user_id` | User owns all their letters |
| `profiles` | `job_applications` | One-to-many | `job_applications.user_id` | User owns all their tracker entries |
| `profiles` | `payments` | One-to-many | `payments.user_id` | Billing history |
| `job_applications` | `cover_letters` | One-to-many (optional) | `cover_letters.job_application_id` | A letter can be linked to one application; an application can reference many letters |
| `cv_templates` | `cv_profiles` | Reference (no FK) | `cv_profiles.preferred_cv_template_id` | Soft reference — template ID stored as string, no hard FK needed |

---

## Table 1: `auth.users`

**Schema:** `auth` (managed entirely by Supabase — do not modify)  
**Purpose:** Stores authentication credentials. Created automatically when a user signs up via Google OAuth, email/password, or magic link.  
**Who reads it:** Supabase Auth middleware. Our app reads `auth.uid()` from the session token — we never query this table directly.  
**Who writes it:** Supabase Auth service only.

### Key Columns Used by Our App

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. This same UUID is used as `profiles.id` to link the two tables |
| `email` | TEXT | User's email address |
| `created_at` | TIMESTAMPTZ | Account creation time |

### Notes

- Never write SQL that inserts into `auth.users` directly
- When a user deletes their account, deleting from `profiles` cascades to all our tables. The `auth.users` row must be deleted separately via Supabase Admin API
- `auth.uid()` is a Supabase function that returns the currently authenticated user's UUID — used in all RLS policies

---

## Table 2: `profiles`

**Schema:** `public`  
**Purpose:** The central user record. Extends `auth.users` with application-level data: display name, avatar, and critically — subscription tier and status. Every other table in the system foreign-keys to this table via `user_id`.  
**Who reads it:** Every API route — subscription middleware checks `subscription_tier` on every gated request.  
**Who writes it:** Auth callback (creates row on first login), payment webhook (updates subscription fields after successful payment), account settings page.

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UUID | No | — | Primary key. Must equal `auth.users.id` |
| `email` | TEXT | No | — | Copied from auth — used for transactional emails |
| `full_name` | TEXT | Yes | null | Display name — can differ from CV name |
| `avatar_url` | TEXT | Yes | null | Profile photo URL (from Google OAuth or upload) |
| `subscription_tier` | TEXT | No | `'free'` | Current plan. Enum: `free`, `pro`, `premium`, `career` |
| `subscription_status` | TEXT | No | `'inactive'` | Enum: `active`, `inactive`, `cancelled`, `past_due` |
| `subscription_expires_at` | TIMESTAMPTZ | Yes | null | When the current billing period ends |
| `trial_ends_at` | TIMESTAMPTZ | Yes | null | Set when user starts a trial. Null if never trialled |
| `is_onboarded` | BOOLEAN | No | false | False until user completes the onboarding flow |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Last update — maintained by trigger |

### Constraints

```sql
CHECK (subscription_tier IN ('free', 'pro', 'premium', 'career'))
CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due'))
UNIQUE (email)
```

### RLS Policy

```sql
-- Users can read and update only their own profile
CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);
```

### Trigger Required

```sql
-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Auto-create on signup

```sql
-- Supabase Auth hook: create profile row when auth.users row is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Table 3: `cv_profiles`

**Schema:** `public`  
**Purpose:** The user's master career data store. All structured CV fields extracted by Claude AI (or entered manually) live here. This is the single source of truth that feeds every cover letter, every PDF export, and every template render. One row per user — not one per CV version.  
**Who reads it:** Cover letter generator (needs experience + skills), PDF export (renders the full CV), CV editor page (displays all fields).  
**Who writes it:** AI extraction API (`/api/extract`), CV editor (manual edits, auto-saved).

### Columns — Scalar Fields

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `profiles.id` ON DELETE CASCADE |
| `full_name` | TEXT | Yes | e.g. "Alex Rahman" |
| `professional_title` | TEXT | Yes | e.g. "Senior Product Manager" |
| `email` | TEXT | Yes | Professional email on the CV |
| `phone` | TEXT | Yes | Phone with country code |
| `location` | TEXT | Yes | e.g. "London, UK" |
| `linkedin_url` | TEXT | Yes | Full LinkedIn profile URL |
| `portfolio_url` | TEXT | Yes | Portfolio website URL |
| `website_url` | TEXT | Yes | Personal website URL |
| `summary` | TEXT | Yes | Professional summary paragraph |
| `is_complete` | BOOLEAN | No | True when profile meets completion threshold |
| `completion_percentage` | INTEGER | No | 0–100, computed by app logic |
| `original_cv_file_url` | TEXT | Yes | Supabase Storage URL of the uploaded CV file |
| `preferred_cv_template_id` | TEXT | Yes | References `cv_templates.id` (soft ref) |
| `preferred_cl_template_id` | TEXT | Yes | References cover letter template ID (soft ref) |
| `created_at` | TIMESTAMPTZ | No | |
| `updated_at` | TIMESTAMPTZ | No | |

### Columns — JSONB Arrays

Each JSONB column stores an array of structured objects. Schemas are defined below.

---

#### `experience` — JSONB Array

Stores work history. Each element:

```jsonc
{
  "id": "exp_1",                    // string — unique within array
  "company": "Grameenphone",        // string, required
  "title": "Senior Designer",       // string, required
  "location": "Dhaka, BD",          // string | null
  "start_date": "2021-01",          // "YYYY-MM" | null
  "end_date": "2024-03",            // "YYYY-MM" | null
  "is_current": false,              // boolean — true = currently working here
  "bullets": [                      // string[] — responsibility/achievement bullets
    "Led redesign of mobile app, increasing DAU by 40%",
    "Managed a team of 4 designers"
  ],
  "description": null               // string | null — free text below bullets
}
```

---

#### `education` — JSONB Array

```jsonc
{
  "id": "edu_1",
  "institution": "BUET",
  "degree": "Bachelor's",           // "Bachelor's"|"Master's"|"PhD"|"Diploma"|"Certificate"|"Other"
  "field_of_study": "Computer Science",
  "start_date": "2016-01",
  "end_date": "2020-12",
  "gpa": "3.8",                     // string | null (keep as string to preserve formatting)
  "description": null               // string | null
}
```

---

#### `skills` — JSONB Array

Grouped by category:

```jsonc
{
  "id": "skill_1",
  "category": "technical",         // "technical" | "soft" | "tools" | "languages"
  "items": ["Flutter", "Dart", "Firebase", "Next.js"]
}
```

One object per category. App enforces max 4 category objects.

---

#### `projects` — JSONB Array

```jsonc
{
  "id": "proj_1",
  "name": "CareerAI Platform",
  "description": "AI-powered CV and cover letter SaaS",
  "tech_stack": ["Next.js", "Supabase", "Claude API"],
  "url": "https://myproject.com",   // string | null
  "start_date": "2024-06",
  "end_date": null                  // null = ongoing
}
```

---

#### `certifications` — JSONB Array

```jsonc
{
  "id": "cert_1",
  "name": "AWS Solutions Architect",
  "issuer": "Amazon Web Services",
  "issue_date": "2023-05",
  "expiry_date": "2026-05",         // string | null
  "url": "https://credly.com/..."   // string | null — credential link
}
```

---

#### `languages` — JSONB Array

```jsonc
{
  "id": "lang_1",
  "language": "Bengali",
  "proficiency": "native"           // "native"|"fluent"|"advanced"|"intermediate"|"basic"
}
```

---

#### `awards` — JSONB Array

```jsonc
{
  "id": "award_1",
  "title": "Best Innovation Award",
  "issuer": "TechCrunch Disrupt",
  "date": "2023-10",
  "description": "Awarded for..."   // string | null
}
```

---

### Constraints

```sql
UNIQUE (user_id)   -- one CV profile per user
```

### RLS Policy

```sql
CREATE POLICY "Users own their cv_profile"
  ON cv_profiles FOR ALL
  USING (auth.uid() = user_id);
```

### Indexes

```sql
CREATE INDEX idx_cv_profiles_user_id ON cv_profiles(user_id);
```

---

## Table 4: `cover_letters`

**Schema:** `public`  
**Purpose:** Stores every cover letter ever generated for a user — the input context (job description, tone, length), the AI-generated output text, ATS analysis results, and export metadata. This is the cover letter history the user browses and re-exports.  
**Who reads it:** Cover letter history page, cover letter detail/edit page, job tracker (to show linked letter), PDF export API.  
**Who writes it:** Cover letter generation API (`/api/generate`), ATS scoring API, user edits on the detail page, PDF export API (writes `pdf_url` after export).

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | No | — | FK → `profiles.id` ON DELETE CASCADE |
| `job_application_id` | UUID | Yes | null | FK → `job_applications.id` ON DELETE SET NULL |
| `job_title` | TEXT | Yes | null | Target job title (extracted or entered) |
| `company_name` | TEXT | Yes | null | Target company name |
| `job_description` | TEXT | No | — | Full job description text — required for generation |
| `tone` | TEXT | No | `'professional'` | Enum: `professional`, `confident`, `creative`, `concise`, `formal` |
| `length` | TEXT | No | `'medium'` | Enum: `short` (~200w), `medium` (~350w), `long` (~500w) |
| `specific_emphasis` | TEXT | Yes | null | User's extra instruction — e.g. "highlight Python skills" |
| `content` | TEXT | No | — | The full generated cover letter text |
| `ats_score` | INTEGER | Yes | null | ATS compatibility score 0–100 |
| `ats_keywords_found` | JSONB | Yes | null | Array of matched keyword strings |
| `ats_keywords_missing` | JSONB | Yes | null | Array of suggested missing keyword strings |
| `ats_summary` | TEXT | Yes | null | One-sentence ATS analysis from Claude |
| `template_id` | TEXT | Yes | null | Which cover letter template was used for export |
| `pdf_url` | TEXT | Yes | null | Supabase Storage URL of the exported PDF |
| `docx_url` | TEXT | Yes | null | Supabase Storage URL of the exported DOCX |
| `share_token` | TEXT | Yes | null | Unique token for public share link (Premium feature) |
| `is_favourited` | BOOLEAN | No | false | User-starred for quick access |
| `generation_model` | TEXT | Yes | null | Claude model used — for cost tracking |
| `input_tokens` | INTEGER | Yes | null | Claude API input tokens used — for cost tracking |
| `output_tokens` | INTEGER | Yes | null | Claude API output tokens used — for cost tracking |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | |

### Constraints

```sql
CHECK (tone IN ('professional', 'confident', 'creative', 'concise', 'formal'))
CHECK (length IN ('short', 'medium', 'long'))
CHECK (ats_score >= 0 AND ats_score <= 100)
UNIQUE (share_token)   -- prevents collisions on share links
```

### RLS Policy

```sql
CREATE POLICY "Users own their cover_letters"
  ON cover_letters FOR ALL
  USING (auth.uid() = user_id);

-- Public share link — unauthenticated read via share_token
CREATE POLICY "Public read via share token"
  ON cover_letters FOR SELECT
  USING (share_token IS NOT NULL);
```

### Indexes

```sql
CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX idx_cover_letters_job_application_id ON cover_letters(job_application_id);
CREATE INDEX idx_cover_letters_created_at ON cover_letters(user_id, created_at DESC);
CREATE INDEX idx_cover_letters_share_token ON cover_letters(share_token) WHERE share_token IS NOT NULL;
```

### Monthly Generation Count Query

Used by the API to enforce tier limits before calling Claude:

```sql
SELECT COUNT(*) FROM cover_letters
WHERE user_id = $1
  AND created_at >= date_trunc('month', NOW())
  AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month';
```

---

## Table 5: `job_applications`

**Schema:** `public`  
**Purpose:** The job application tracker. Each row is one job the user has saved, applied to, or is tracking through a hiring process. Rendered as a Kanban board in the UI with columns for each status. Available to Pro tier and above.  
**Who reads it:** Job tracker page (Kanban board), tracker stats (counts per status), cover letter detail (linked application dropdown).  
**Who writes it:** Tracker page (add/edit/move cards), cover letter page ("Add to tracker" button).

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | No | — | FK → `profiles.id` ON DELETE CASCADE |
| `company_name` | TEXT | No | — | Company name — required |
| `job_title` | TEXT | No | — | Role title — required |
| `job_url` | TEXT | Yes | null | URL of the original job posting |
| `job_description` | TEXT | Yes | null | Full JD text (used for interview prep AI) |
| `location` | TEXT | Yes | null | Job location |
| `salary_min` | INTEGER | Yes | null | Minimum salary (in cents/pence to avoid float issues) |
| `salary_max` | INTEGER | Yes | null | Maximum salary |
| `salary_currency` | TEXT | Yes | `'USD'` | Currency code |
| `work_type` | TEXT | Yes | null | Enum: `remote`, `hybrid`, `onsite` |
| `status` | TEXT | No | `'saved'` | Current Kanban column — see enum below |
| `saved_at` | TIMESTAMPTZ | Yes | `NOW()` | When added to tracker |
| `applied_at` | TIMESTAMPTZ | Yes | null | When application was submitted |
| `interview_at` | TIMESTAMPTZ | Yes | null | Next/most recent interview datetime |
| `offer_at` | TIMESTAMPTZ | Yes | null | When offer was received |
| `deadline` | TIMESTAMPTZ | Yes | null | Application deadline |
| `notes` | TEXT | Yes | null | Free-text notes |
| `contact_name` | TEXT | Yes | null | Recruiter or hiring manager name |
| `contact_email` | TEXT | Yes | null | Contact email |
| `priority` | TEXT | No | `'medium'` | Enum: `low`, `medium`, `high` |
| `is_starred` | BOOLEAN | No | false | Quick-access star toggle |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | |

### Status Enum — Kanban Columns (in order)

| Value | Display Label | Meaning |
|---|---|---|
| `saved` | Saved | Bookmarked, not yet applied |
| `applied` | Applied | Application submitted |
| `phone_screen` | Phone Screen | Initial recruiter call |
| `interview` | Interview | Interviews in progress |
| `technical` | Technical | Take-home or technical test |
| `final_round` | Final Round | Final stage interviews |
| `offer` | Offer | Offer received |
| `rejected` | Rejected | Application unsuccessful |
| `withdrawn` | Withdrawn | User withdrew |

### Constraints

```sql
CHECK (status IN ('saved','applied','phone_screen','interview','technical','final_round','offer','rejected','withdrawn'))
CHECK (work_type IN ('remote','hybrid','onsite'))
CHECK (priority IN ('low','medium','high'))
```

### RLS Policy

```sql
CREATE POLICY "Users own their job_applications"
  ON job_applications FOR ALL
  USING (auth.uid() = user_id);
```

### Indexes

```sql
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(user_id, status);
CREATE INDEX idx_job_applications_starred ON job_applications(user_id, is_starred) WHERE is_starred = true;
```

### Stats Query (used for dashboard)

```sql
SELECT status, COUNT(*) as count
FROM job_applications
WHERE user_id = $1
GROUP BY status;
```

---

## Table 6: `payments`

**Schema:** `public`  
**Purpose:** Full audit trail of every payment transaction processed via SSLCommerz. One row per payment attempt (including failed ones). The subscription fields on `profiles` are derived from this table — when a payment succeeds, the payment webhook updates `profiles.subscription_tier` and `subscription_expires_at`.  
**Who reads it:** Billing settings page (payment history), payment webhook handler (to verify duplicate IPN calls), admin monitoring.  
**Who writes it:** Payment initiation API (creates pending row), payment success/fail/cancel callbacks (updates status), IPN webhook (backup update).

### Columns

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | No | — | FK → `profiles.id` ON DELETE CASCADE |
| `tran_id` | TEXT | No | — | Our generated transaction ID sent to SSLCommerz. Format: `{user_id_short}-{plan}-{timestamp}` |
| `val_id` | TEXT | Yes | null | SSLCommerz validation ID — only populated after successful payment |
| `amount` | DECIMAL(10,2) | No | — | Amount charged in the given currency |
| `currency` | TEXT | No | `'USD'` | Currency code |
| `status` | TEXT | No | `'pending'` | Enum: `pending`, `success`, `failed`, `cancelled`, `refunded` |
| `plan` | TEXT | No | — | What was purchased — see enum below |
| `billing_period_start` | TIMESTAMPTZ | Yes | null | Start of the subscription period this payment covers |
| `billing_period_end` | TIMESTAMPTZ | Yes | null | End of the subscription period |
| `gateway_response` | JSONB | Yes | null | Full raw JSON response from SSLCommerz — stored for debugging and dispute resolution |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When payment was initiated |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | Last status change |

### Plan Enum

| Value | Price | Period |
|---|---|---|
| `pro_monthly` | $9.99 | 30 days |
| `pro_yearly` | $89.99 | 365 days |
| `premium_monthly` | $19.99 | 30 days |
| `premium_yearly` | $179.99 | 365 days |
| `career_monthly` | $29.99 | 30 days |
| `career_yearly` | $269.99 | 365 days |

### Constraints

```sql
UNIQUE (tran_id)
CHECK (status IN ('pending','success','failed','cancelled','refunded'))
CHECK (plan IN ('pro_monthly','pro_yearly','premium_monthly','premium_yearly','career_monthly','career_yearly'))
CHECK (amount > 0)
```

### RLS Policy

```sql
-- Users can read their own payments (read-only)
CREATE POLICY "Users read own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Payments are written only by service role (API routes using service key)
-- No INSERT/UPDATE policy for authenticated role
```

### Indexes

```sql
CREATE INDEX idx_payments_user_id ON payments(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_payments_tran_id ON payments(tran_id);
CREATE INDEX idx_payments_status ON payments(status) WHERE status = 'pending';
```

### Subscription Update Logic (runs in payment success API route)

```sql
-- After validating with SSLCommerz:
-- 1. Update payments record
UPDATE payments SET
  status = 'success',
  val_id = $val_id,
  billing_period_start = NOW(),
  billing_period_end = NOW() + INTERVAL '30 days',  -- or 365 for yearly
  gateway_response = $response,
  updated_at = NOW()
WHERE tran_id = $tran_id;

-- 2. Update user's subscription
UPDATE profiles SET
  subscription_tier = 'pro',        -- or premium / career
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE id = $user_id;
```

---

## Table 7: `cv_templates`

**Schema:** `public`  
**Purpose:** Seed/reference data. Stores metadata about every available CV and cover letter template — name, category, which tiers can access it, and preview image URL. Queried by the template gallery screen. This table is populated once at setup and rarely changed.  
**Who reads it:** Template gallery page, PDF export API (to validate template_id), CV editor (to show current template name).  
**Who writes it:** Database seed script only. Not user-writable.

### Columns

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | TEXT | No | Primary key — slug. e.g. `classic`, `sidebar`, `cl-modern` |
| `type` | TEXT | No | Enum: `cv` or `cover_letter` |
| `name` | TEXT | No | Display name. e.g. "Classic", "Bold Header" |
| `description` | TEXT | Yes | Short description for gallery tooltip |
| `preview_image_url` | TEXT | Yes | URL to template thumbnail image |
| `category` | TEXT | Yes | e.g. `professional`, `creative`, `minimal`, `executive` |
| `is_premium` | BOOLEAN | No | Shorthand — true if `available_tiers` excludes `free` |
| `available_tiers` | TEXT[] | No | Array of tiers that can use this template |
| `sort_order` | INTEGER | No | Display order in gallery (ascending) |

### Constraints

```sql
CHECK (type IN ('cv', 'cover_letter'))
```

### RLS Policy

```sql
-- Templates are public read — no auth required
CREATE POLICY "Templates are publicly readable"
  ON cv_templates FOR SELECT
  USING (true);
```

### Seed Data

```sql
INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order) VALUES
-- CV Templates
('classic',      'cv', 'Classic',      'Clean single-column layout',           'professional', false, ARRAY['free','pro','premium','career'], 1),
('minimal',      'cv', 'Minimal',      'Ultra-sparse, lots of whitespace',      'minimal',      false, ARRAY['free','pro','premium','career'], 2),
('sidebar',      'cv', 'Sidebar',      'Left sidebar + main content column',    'professional', true,  ARRAY['pro','premium','career'],        3),
('bold-header',  'cv', 'Bold Header',  'Full-width color header band',          'creative',     true,  ARRAY['pro','premium','career'],        4),
('two-column',   'cv', 'Two Column',   'Equal-width symmetric layout',          'professional', true,  ARRAY['pro','premium','career'],        5),
('executive',    'cv', 'Executive',    'Dense, formal, text-heavy',             'executive',    true,  ARRAY['premium','career'],              6),
-- Cover Letter Templates
('cl-classic',   'cover_letter', 'Classic',          'Traditional letter format',         'professional', false, ARRAY['free','pro','premium','career'], 1),
('cl-modern',    'cover_letter', 'Modern Block',     'Clean modern, no indents',          'minimal',      false, ARRAY['free','pro','premium','career'], 2),
('cl-minimal',   'cover_letter', 'Minimal',          'Ultra-sparse cover letter',         'minimal',      true,  ARRAY['pro','premium','career'],        3),
('cl-formal',    'cover_letter', 'Formal Letterhead','Company letterhead style',          'executive',    true,  ARRAY['pro','premium','career'],        4),
('cl-creative',  'cover_letter', 'Creative Header',  'Bold name header, visual accent',   'creative',     true,  ARRAY['premium','career'],              5);
```

---

## Complete SQL — Run Order for Supabase

Run these in order in the Supabase SQL editor:

```sql
-- 1. Profiles table (must exist before any other table)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'premium', 'career')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  subscription_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CV Templates (static data, no FK dependencies)
CREATE TABLE cv_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('cv', 'cover_letter')),
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  category TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  available_tiers TEXT[] NOT NULL DEFAULT ARRAY['free','pro','premium','career'],
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. CV Profiles
CREATE TABLE cv_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  professional_title TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  website_url TEXT,
  summary TEXT,
  experience JSONB NOT NULL DEFAULT '[]',
  education JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  projects JSONB NOT NULL DEFAULT '[]',
  certifications JSONB NOT NULL DEFAULT '[]',
  languages JSONB NOT NULL DEFAULT '[]',
  awards JSONB NOT NULL DEFAULT '[]',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  original_cv_file_url TEXT,
  preferred_cv_template_id TEXT,
  preferred_cl_template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. Job Applications (before cover_letters — cover_letters FK references this)
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  work_type TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite')),
  status TEXT NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved','applied','phone_screen','interview','technical','final_round','offer','rejected','withdrawn')),
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  interview_at TIMESTAMPTZ,
  offer_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Cover Letters
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  job_title TEXT,
  company_name TEXT,
  job_description TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'professional'
    CHECK (tone IN ('professional', 'confident', 'creative', 'concise', 'formal')),
  length TEXT NOT NULL DEFAULT 'medium'
    CHECK (length IN ('short', 'medium', 'long')),
  specific_emphasis TEXT,
  content TEXT NOT NULL,
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  ats_keywords_found JSONB,
  ats_keywords_missing JSONB,
  ats_summary TEXT,
  template_id TEXT,
  pdf_url TEXT,
  docx_url TEXT,
  share_token TEXT UNIQUE,
  is_favourited BOOLEAN NOT NULL DEFAULT false,
  generation_model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tran_id TEXT UNIQUE NOT NULL,
  val_id TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
  plan TEXT NOT NULL
    CHECK (plan IN ('pro_monthly','pro_yearly','premium_monthly','premium_yearly','career_monthly','career_yearly')),
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Enable RLS on all user tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_templates ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their cv_profile" ON cv_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their cover_letters" ON cover_letters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public cover letter via share token" ON cover_letters FOR SELECT USING (share_token IS NOT NULL);
CREATE POLICY "Users own their job_applications" ON job_applications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Templates are publicly readable" ON cv_templates FOR SELECT USING (true);

-- 9. Indexes
CREATE INDEX idx_cv_profiles_user_id ON cv_profiles(user_id);
CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX idx_cover_letters_created_at ON cover_letters(user_id, created_at DESC);
CREATE INDEX idx_cover_letters_job_app ON cover_letters(job_application_id);
CREATE INDEX idx_cover_letters_share_token ON cover_letters(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(user_id, status);
CREATE INDEX idx_payments_user_id ON payments(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_payments_tran_id ON payments(tran_id);

-- 10. updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cv_profiles_updated_at BEFORE UPDATE ON cv_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cover_letters_updated_at BEFORE UPDATE ON cover_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 11. Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 12. Seed cv_templates
INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order) VALUES
('classic',     'cv',           'Classic',          'Clean single-column layout',         'professional', false, ARRAY['free','pro','premium','career'], 1),
('minimal',     'cv',           'Minimal',           'Ultra-sparse, lots of whitespace',   'minimal',      false, ARRAY['free','pro','premium','career'], 2),
('sidebar',     'cv',           'Sidebar',           'Left sidebar + main column',         'professional', true,  ARRAY['pro','premium','career'],        3),
('bold-header', 'cv',           'Bold Header',       'Full-width color header band',       'creative',     true,  ARRAY['pro','premium','career'],        4),
('two-column',  'cv',           'Two Column',        'Equal-width symmetric layout',       'professional', true,  ARRAY['pro','premium','career'],        5),
('executive',   'cv',           'Executive',         'Dense, formal, text-heavy',          'executive',    true,  ARRAY['premium','career'],              6),
('cl-classic',  'cover_letter', 'Classic',           'Traditional letter format',          'professional', false, ARRAY['free','pro','premium','career'], 1),
('cl-modern',   'cover_letter', 'Modern Block',      'Clean modern, no indents',           'minimal',      false, ARRAY['free','pro','premium','career'], 2),
('cl-minimal',  'cover_letter', 'Minimal',           'Ultra-sparse cover letter',          'minimal',      true,  ARRAY['pro','premium','career'],        3),
('cl-formal',   'cover_letter', 'Formal Letterhead', 'Company letterhead style',           'executive',    true,  ARRAY['pro','premium','career'],        4),
('cl-creative', 'cover_letter', 'Creative Header',   'Bold name header, visual accent',    'creative',     true,  ARRAY['premium','career'],              5);
```

---

## Storage Buckets (Supabase Storage)

Two storage buckets are required. Create these in the Supabase dashboard under Storage.

### Bucket 1: `cv-uploads`

- **Purpose:** Stores original CV files uploaded by users (PDF/DOCX)
- **Access:** Private — access via signed URLs only (expire after 1 hour)
- **File path convention:** `{user_id}/{timestamp}-original.{ext}`
- **Max file size:** 10MB
- **Allowed MIME types:** `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Bucket 2: `pdf-exports`

- **Purpose:** Stores generated PDF and DOCX exports (CV and cover letters)
- **Access:** Private — access via signed URLs only
- **File path convention:** `{user_id}/{type}-{template_id}-{timestamp}.pdf`
- **Types:** `cv`, `cover-letter`
- **Retention:** Keep last 10 exports per user (older ones can be cleaned up)

### Storage RLS Policies

```sql
-- cv-uploads: users can only access their own folder
CREATE POLICY "Users access own cv-uploads"
  ON storage.objects FOR ALL
  USING (bucket_id = 'cv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- pdf-exports: users can only access their own folder
CREATE POLICY "Users access own pdf-exports"
  ON storage.objects FOR ALL
  USING (bucket_id = 'pdf-exports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Notes for LLM Code Generation

When generating code from this schema, note the following:

1. **Never use `auth.users` directly.** Always use `profiles` for application queries. The link is `profiles.id = auth.users.id`.

2. **JSONB arrays need careful handling.** When updating a single experience entry inside the `experience` JSONB array, you must fetch the array, update the element in application code, then write the full array back. Postgres supports `jsonb_set()` for targeted updates but it's complex — for simplicity, fetch-modify-save in the API route.

3. **Service role key required for payments.** The `payments` table has no INSERT policy for authenticated users — writes come from the API server using `SUPABASE_SERVICE_ROLE_KEY`, not the user's session token.

4. **Cover letter generation limit.** Before calling the Claude API, always run the monthly count query against `cover_letters` and compare to the user's tier limit from `profiles.subscription_tier`.

5. **RLS is the security layer.** Do not rely on application-level checks alone. RLS ensures a compromised API route cannot leak another user's data.

6. **`updated_at` is maintained by trigger.** Do not set `updated_at` manually in your SQL UPDATE statements — the trigger handles it.

7. **Template IDs are strings, not UUIDs.** `cv_profiles.preferred_cv_template_id` is a soft reference (no FK constraint) to `cv_templates.id`. Validate the template ID in application code before using it.

---

*End of database schema documentation — v1.0*
