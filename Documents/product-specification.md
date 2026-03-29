# Product Specification — AI CV & Cover Letter Platform
**Version:** 1.0  
**Status:** Source of Truth  
**Last Updated:** March 2026  
**Author:** Product & Architecture Team  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users & Market](#2-target-users--market)
3. [Technical Architecture](#3-technical-architecture)
4. [Data Models & Database Schema](#4-data-models--database-schema)
5. [Authentication & User Management](#5-authentication--user-management)
6. [Feature Specifications](#6-feature-specifications)
   - 6.1 CV Upload & AI Extraction
   - 6.2 CV Profile Editor
   - 6.3 CV Template System
   - 6.4 Cover Letter Generator
   - 6.5 Cover Letter Template System
   - 6.6 Job Application Tracker
   - 6.7 AI Extras
   - 6.8 Dashboard
7. [Subscription & Pricing](#7-subscription--pricing)
8. [Payment Integration — SSLCommerz](#8-payment-integration--sslcommerz)
9. [UI & UX Specifications](#9-ui--ux-specifications)
10. [Page & Screen Flows](#10-page--screen-flows)
11. [API Specification](#11-api-specification)
12. [PDF Generation System](#12-pdf-generation-system)
13. [Claude AI Integration](#13-claude-ai-integration)
14. [Security & Compliance](#14-security--compliance)
15. [Performance Requirements](#15-performance-requirements)
16. [Future — Flutter Mobile App](#16-future--flutter-mobile-app)
17. [Glossary](#17-glossary)

---

## 1. Product Overview

### 1.1 What This Product Is

A subscription-based, AI-powered career documents platform that helps global job seekers create professional CVs and tailored cover letters in minutes. The platform combines Claude AI for intelligent content generation with a structured data model so users write their information once and reuse it everywhere.

### 1.2 Core Value Proposition

- **For job seekers:** Stop rewriting your CV and cover letter for every application. Upload once, generate instantly, apply faster.
- **Key differentiator:** AI that actually reads the job description and tailors the letter to it — not generic templates.
- **Second differentiator:** CV data is stored as structured fields (not a flat file), enabling true multi-template rendering from a single source of truth.

### 1.3 Problem Being Solved

1. Writing a tailored cover letter for each job takes 30–60 minutes. Most people don't bother, and it hurts their chances.
2. Reformatting a CV for different industries or roles is tedious and error-prone.
3. ATS (Applicant Tracking System) keyword matching is opaque — candidates don't know why they're rejected.
4. Job seekers lose track of where they've applied.

### 1.4 Product Principles

- **Speed first:** Every core action (upload CV, generate cover letter, export PDF) must complete in under 30 seconds.
- **Data ownership:** Users own their data. Export is always available, including on the free tier.
- **Mobile-ready from day one:** Web is first, but all design decisions must be compatible with the future Flutter app.
- **Graceful AI failures:** If AI extraction misses a field, the user can fix it manually. The system never silently fails.

---

## 2. Target Users & Market

### 2.1 Primary Personas

**Persona A — The Active Job Seeker**
- Age: 22–35
- Applying to 5–20 jobs per week
- Pain: Rewriting cover letters is exhausting and time-consuming
- Goal: Apply to more jobs faster without sacrificing quality
- Willingness to pay: High — immediately sees ROI

**Persona B — The Career Switcher**
- Age: 28–45
- Changing industries or roles
- Pain: Existing CV doesn't translate well to new field
- Goal: Reframe experience to match new industry language
- Willingness to pay: High — career transition is high-stakes

**Persona C — The Fresh Graduate**
- Age: 21–25
- Limited work experience, applying to entry-level roles
- Pain: Doesn't know how to write a professional CV or cover letter
- Goal: Look professional and stand out
- Willingness to pay: Low-medium — price-sensitive but will pay for results

**Persona D — The Passive Job Seeker**
- Age: 30–50
- Employed, open to the right opportunity
- Pain: CV is outdated, cover letters feel generic
- Goal: Keep career documents ready and polished
- Willingness to pay: Medium — convenience-driven

### 2.2 Market

- **Geography:** Global, English-speaking (US, UK, Canada, Australia, Europe, India, Southeast Asia)
- **Primary currency:** USD
- **Market size:** 750M+ global knowledge workers who apply to at least one job per year
- **Addressable niche:** ~50M active job seekers online at any given time

### 2.3 Competitive Landscape

| Competitor | Weakness we exploit |
|---|---|
| Resume.io | No AI cover letter, no job tracking |
| Zety | Template-heavy, not AI-native |
| Kickresume | Weak AI, no CV extraction |
| ChatGPT direct | No templates, no structured storage, no PDF |
| LinkedIn Easy Apply | No cover letter customization |

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend (Web) | Next.js 14 (App Router) | SEO-friendly, server components, API routes |
| Styling | Tailwind CSS | Utility-first, consistent design system |
| State Management | Zustand + React Query | Lightweight, server-state friendly |
| Backend API | Next.js API Routes (Node.js) | Co-located with frontend, Cursor-friendly |
| Database | Supabase (PostgreSQL) | Standard SQL, portable, free tier |
| Authentication | Supabase Auth | Google OAuth, email/password, magic link |
| File Storage | Supabase Storage | CV uploads, generated PDFs |
| AI | Anthropic Claude Sonnet API | Best writing quality, structured JSON output |
| PDF Generation | Puppeteer + Chromium (self-hosted) | Full Chromium on own server, no restrictions |
| Hosting | Own server — Ubuntu + Nginx + PM2 | Full control, native Puppeteer, cost-efficient |
| SSL | Let's Encrypt via Certbot | Free, auto-renewing |
| Payments | SSLCommerz (USD international) | Supports global cards, local BD gateway |
| Email | Resend or SendGrid | Transactional emails (welcome, receipt, reset) |
| Mobile (future) | Flutter | iOS + Android from single codebase |

### 3.2 Server Architecture

```
Internet (HTTPS)
      ↓
  Nginx (reverse proxy, SSL termination, static asset caching)
      ↓
  PM2 (process manager — keeps Next.js alive, auto-restarts)
      ↓
  Next.js App (port 3000)
      ├── /app        → React pages (SSR + CSR)
      ├── /api        → API route handlers
      │     ├── /api/auth        → Supabase auth callbacks
      │     ├── /api/cv          → CV CRUD operations
      │     ├── /api/extract     → Claude CV extraction
      │     ├── /api/generate    → Claude cover letter generation
      │     ├── /api/export      → Puppeteer PDF generation
      │     ├── /api/payment     → SSLCommerz webhook + initiation
      │     └── /api/subscription → Subscription state management
      └── /public     → Static assets
            ↓
      Supabase (cloud)
      ├── PostgreSQL database
      ├── Auth service
      └── Storage buckets
            ↓
      External APIs
      ├── Anthropic Claude API
      └── SSLCommerz Payment API
```

### 3.3 Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude AI
ANTHROPIC_API_KEY=

# SSLCommerz
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_IS_LIVE=false

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
JWT_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@yourdomain.com
```

### 3.4 Next.js Project Folder Structure

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← sidebar + header shell
│   │   ├── dashboard/page.tsx
│   │   ├── cv/
│   │   │   ├── page.tsx            ← CV profile overview
│   │   │   ├── upload/page.tsx
│   │   │   ├── edit/page.tsx
│   │   │   └── templates/page.tsx
│   │   ├── cover-letters/
│   │   │   ├── page.tsx            ← cover letter history
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── tracker/page.tsx
│   │   ├── ai-tools/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── billing/page.tsx
│   │       └── account/page.tsx
│   ├── (marketing)/
│   │   ├── page.tsx                ← landing page
│   │   ├── pricing/page.tsx
│   │   └── blog/page.tsx
│   └── layout.tsx
├── api/
│   ├── auth/[...supabase]/route.ts
│   ├── cv/route.ts
│   ├── extract/route.ts
│   ├── generate/route.ts
│   ├── export/route.ts
│   ├── payment/
│   │   ├── initiate/route.ts
│   │   ├── success/route.ts
│   │   ├── fail/route.ts
│   │   └── cancel/route.ts
│   └── subscription/route.ts
├── components/
│   ├── ui/                         ← base components (button, input, card, modal)
│   ├── cv/                         ← CV-specific components
│   ├── cover-letter/               ← cover letter components
│   ├── templates/                  ← template preview components
│   ├── tracker/                    ← job tracker components
│   └── shared/                     ← layout, nav, sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── claude.ts                   ← Claude API wrapper
│   ├── pdf.ts                      ← Puppeteer PDF generation
│   ├── sslcommerz.ts               ← payment integration
│   └── utils.ts
├── hooks/
│   ├── useCV.ts
│   ├── useCoverLetters.ts
│   ├── useSubscription.ts
│   └── useTracker.ts
├── types/
│   └── index.ts                    ← all TypeScript types
├── templates/
│   ├── cv/                         ← HTML templates for PDF rendering
│   │   ├── classic.html
│   │   ├── sidebar.html
│   │   ├── minimal.html
│   │   ├── bold-header.html
│   │   ├── two-column.html
│   │   └── executive.html
│   └── cover-letter/
│       ├── classic.html
│       ├── modern.html
│       ├── minimal.html
│       └── formal.html
└── middleware.ts                   ← auth guard, subscription check
```

---

## 4. Data Models & Database Schema

### 4.1 Users Table (managed by Supabase Auth)

Supabase Auth creates `auth.users` automatically. We extend it with a public `profiles` table.

```sql
-- profiles (extends auth.users)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 CV Profiles Table

```sql
-- cv_profiles (one per user — their master career data)
CREATE TABLE cv_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Header fields
  full_name TEXT,
  professional_title TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  website_url TEXT,
  summary TEXT,

  -- Structured sections (stored as JSONB arrays)
  experience JSONB DEFAULT '[]',
  -- Experience entry shape:
  -- { id, company, title, location, start_date, end_date,
  --   is_current, bullets: [string], description }

  education JSONB DEFAULT '[]',
  -- Education entry shape:
  -- { id, institution, degree, field_of_study,
  --   start_date, end_date, gpa, description }

  skills JSONB DEFAULT '[]',
  -- Skills entry shape:
  -- { id, category, items: [string] }
  -- categories: 'technical', 'soft', 'languages', 'tools'

  projects JSONB DEFAULT '[]',
  -- Project entry shape:
  -- { id, name, description, tech_stack: [string],
  --   url, start_date, end_date }

  certifications JSONB DEFAULT '[]',
  -- Cert entry shape:
  -- { id, name, issuer, issue_date, expiry_date, url }

  languages JSONB DEFAULT '[]',
  -- Language entry shape:
  -- { id, language, proficiency }
  -- proficiency: 'native', 'fluent', 'intermediate', 'basic'

  awards JSONB DEFAULT '[]',
  -- Award entry shape:
  -- { id, title, issuer, date, description }

  -- Metadata
  is_complete BOOLEAN DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 0,
  original_cv_file_url TEXT,     -- Supabase Storage URL of uploaded file
  preferred_cv_template_id TEXT,
  preferred_cl_template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);
```

### 4.3 Cover Letters Table

```sql
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Input context
  job_title TEXT,
  company_name TEXT,
  job_description TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'professional'
    CHECK (tone IN ('professional', 'confident', 'creative', 'concise', 'formal')),
  length TEXT NOT NULL DEFAULT 'medium'
    CHECK (length IN ('short', 'medium', 'long')),
    -- short: ~200 words, medium: ~350 words, long: ~500 words

  -- Output
  content TEXT NOT NULL,          -- the generated cover letter text
  ats_score INTEGER,              -- 0-100
  ats_keywords_found JSONB,       -- array of matched keywords
  ats_keywords_missing JSONB,     -- array of suggested missing keywords
  template_id TEXT,               -- which cover letter template used

  -- File
  pdf_url TEXT,                   -- Supabase Storage URL if exported
  is_favourited BOOLEAN DEFAULT FALSE,

  -- Linked job application
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.4 Job Applications Table (Tracker)

```sql
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Job details
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  work_type TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite')),

  -- Status tracking (Kanban board)
  status TEXT NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved', 'applied', 'phone_screen', 'interview',
                      'technical', 'final_round', 'offer', 'rejected', 'withdrawn')),

  -- Key dates
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  interview_at TIMESTAMPTZ,
  offer_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,

  -- Notes & details
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  is_starred BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.5 Subscriptions / Payments Table

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- SSLCommerz transaction details
  tran_id TEXT UNIQUE NOT NULL,        -- our generated transaction ID
  val_id TEXT,                          -- SSLCommerz validation ID (after success)
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),

  -- What was purchased
  plan TEXT NOT NULL
    CHECK (plan IN ('pro_monthly', 'pro_yearly', 'premium_monthly',
                    'premium_yearly', 'career_monthly', 'career_yearly')),
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,

  -- SSLCommerz response payload (store full response for debugging)
  gateway_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.6 CV Templates Table (static seed data)

```sql
CREATE TABLE cv_templates (
  id TEXT PRIMARY KEY,               -- e.g. 'classic', 'sidebar', 'minimal'
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  category TEXT,                     -- 'professional', 'creative', 'minimal', 'executive'
  is_premium BOOLEAN DEFAULT FALSE,  -- false = available on free tier
  available_tiers TEXT[] DEFAULT ARRAY['free', 'pro', 'premium', 'career'],
  sort_order INTEGER DEFAULT 0
);
```

### 4.7 Row Level Security (RLS) Policies

All user data tables must have RLS enabled. Core pattern:

```sql
-- Enable RLS on all user tables
ALTER TABLE cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users own their cv_profile"
  ON cv_profiles FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own their cover_letters"
  ON cover_letters FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own their job_applications"
  ON job_applications FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 5. Authentication & User Management

### 5.1 Auth Methods Supported

| Method | Priority | Notes |
|---|---|---|
| Google OAuth | Primary | One-click, highest conversion |
| Email + Password | Secondary | Standard fallback |
| Magic Link (email) | Optional | Passwordless option |

### 5.2 Auth Flow

1. User lands on `/login` or `/register`
2. Clicks "Continue with Google" → OAuth redirect → Supabase callback → profile created if first time
3. Or enters email/password → Supabase validates → session cookie set
4. On success → redirect to `/dashboard`
5. If new user → redirect to `/cv/upload` (onboarding flow)

### 5.3 Session Management

- Supabase JWT tokens with auto-refresh
- Sessions persist for 7 days (refresh token)
- `middleware.ts` checks session on every protected route
- Unauthenticated users are redirected to `/login` with return URL preserved

### 5.4 New User Onboarding

On first login, `profiles.is_onboarded = false` triggers onboarding flow:

```
Step 1: Welcome screen (skip option available)
Step 2: Upload your existing CV (or "Start from scratch")
Step 3: Review extracted fields (if uploaded)
Step 4: Choose preferred CV template
Step 5: Dashboard (onboarding complete)
```

---

## 6. Feature Specifications

---

### 6.1 CV Upload & AI Extraction

**Purpose:** Allow users to upload an existing CV and have Claude AI extract all structured fields automatically, then let users review and correct.

#### Supported File Formats
- PDF (primary — most common)
- DOCX (Microsoft Word)
- Maximum file size: 10MB

#### Upload Flow

1. User navigates to `/cv/upload`
2. Drag-and-drop or file picker interface
3. File uploaded to Supabase Storage at path: `cv-uploads/{user_id}/{timestamp}-original.pdf`
4. `POST /api/extract` is called with the file URL
5. Server fetches file, converts to text (using `pdf-parse` for PDF, `mammoth` for DOCX)
6. Text sent to Claude API with extraction prompt (see Section 13)
7. Claude returns structured JSON
8. JSON saved to `cv_profiles` table
9. User redirected to `/cv/edit` for review

#### Extraction States (shown to user)
- `uploading` — file being sent to storage
- `reading` — extracting text from document
- `analysing` — AI reading and structuring your data
- `complete` — redirect to review screen
- `failed` — show error with manual entry option

#### Fallback if Extraction Fails
- User is shown a blank CV editor with all fields empty
- Toast message: "We couldn't read your CV automatically. Please fill in your details below."

#### Re-upload
- User can re-upload at any time from `/cv/upload`
- New extraction overwrites the current profile after user confirmation
- Modal: "This will replace your current CV data. Are you sure?"

---

### 6.2 CV Profile Editor

**Purpose:** Let users view, edit, and manage all structured fields from their CV profile. This is the core data store used by all other features.

#### Editor Layout

Left sidebar navigation with section links:
- Header & Contact
- Professional Summary
- Work Experience
- Education
- Skills
- Projects
- Certifications
- Languages
- Awards

Main area shows the selected section's fields.

#### Header & Contact Section Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Full name | Text | Yes | |
| Professional title | Text | No | e.g. "Senior Product Manager" |
| Email | Email | Yes | Pre-filled from auth |
| Phone | Tel | No | With country code selector |
| Location | Text | No | e.g. "London, UK" |
| LinkedIn URL | URL | No | Validated as linkedin.com URL |
| Portfolio URL | URL | No | |
| Website URL | URL | No | |

#### Professional Summary

- Large textarea, 500 character limit
- "AI Improve" button — sends current summary to Claude for enhancement
- Word count shown

#### Work Experience

Each entry is an expandable card. Fields per entry:

| Field | Type | Notes |
|---|---|---|
| Job title | Text | |
| Company name | Text | |
| Location | Text | |
| Start date | Month/Year picker | |
| End date | Month/Year picker | Disabled if "Currently working here" checked |
| Currently working here | Checkbox | Sets end_date to null |
| Bullet points | Dynamic list | Min 1, max 8 per role. Each bullet: text area |
| Description | Textarea | Optional free text below bullets |

- "Add Experience" button adds a new blank entry
- Entries can be reordered via drag-and-drop
- "AI Improve Bullets" button — sends bullets to Claude for enhancement (paid feature: Pro+)

#### Education

Fields per entry: Institution, Degree (dropdown: Bachelor's, Master's, PhD, Diploma, Certificate, Other), Field of Study, Start Date, End Date, GPA (optional), Description (optional).

#### Skills

Displayed as tag/chip groups by category. Categories: Technical Skills, Soft Skills, Tools & Software, Languages (programming). Each chip is editable. Add chip button per category. "AI suggest skills" button based on job title (Pro+ feature).

#### Projects

Fields per entry: Project name, Description (textarea), Tech Stack (multi-tag input), URL (optional), Start/End date (optional).

#### Certifications

Fields per entry: Certification name, Issuing organization, Issue date, Expiry date (optional), Credential URL.

#### Languages (spoken)

Fields per entry: Language name, Proficiency level (Native, Fluent, Advanced, Intermediate, Basic).

#### Profile Completion Indicator

A progress bar at the top showing completion percentage. Calculated as:
- Header (name + email + title): 20%
- Summary: 10%
- At least one experience entry: 25%
- At least one education entry: 15%
- At least 5 skills: 10%
- At least one project or certification: 10%
- LinkedIn or portfolio URL: 10%

#### Auto-save

All changes auto-save to Supabase with a 1.5-second debounce. A subtle "Saving..." / "Saved" indicator shown in the header.

---

### 6.3 CV Template System

**Purpose:** Render the user's CV profile data into a beautifully formatted PDF using a chosen template.

#### Available Templates (Phase 1)

| ID | Name | Layout | Best For | Tier |
|---|---|---|---|---|
| `classic` | Classic | Single column, clean | Finance, Law, Academia | Free |
| `minimal` | Minimal | Ultra-clean, lots of whitespace | Startups, Tech | Free |
| `sidebar` | Sidebar | Left sidebar + main content | Design, Tech | Pro |
| `bold-header` | Bold Header | Full-width color header | Marketing, Creative | Pro |
| `two-column` | Two Column | Equal-width columns | Engineering | Pro |
| `executive` | Executive | Dense, formal, text-heavy | Senior roles, C-suite | Premium |

#### Template Gallery Screen (`/cv/templates`)

- Grid of template preview cards
- Each card shows: thumbnail preview, template name, tier badge (Free/Pro)
- Click → live preview with user's own data
- "Use this template" button → updates `preferred_cv_template_id` in profile

#### Live Preview

- Preview panel shows a rendered HTML version of the CV using the user's real data
- Rendered in an `<iframe>` at A4 dimensions (794px × 1123px at 96dpi)
- Updates in real-time as user changes data in the editor (debounced 1 second)
- Page break indicators shown visually

#### Template Architecture

Each template is an HTML file in `/templates/cv/` with:
- Handlebars-style `{{variable}}` placeholders
- Responsive A4 sizing using CSS (210mm × 297mm)
- Print-optimized CSS (`@media print`)
- No external dependencies (fonts embedded via base64 or Google Fonts loaded at render time)
- CSS variable based color theming (primary color can be customized by user in Pro+)

#### Color Customization (Pro+ feature)

Users can change the accent color of their chosen template. 5 preset color palettes offered. Changes apply to both CV and matched cover letter template.

#### "Upload Your Own Format" (Premium feature)

- User uploads their own CV PDF as a layout reference
- System uses `pdf-lib` to extract the structural layout
- System's extracted data fields are populated into matching sections
- Best-effort preservation of: column structure, section ordering, font choices
- Explicit disclaimer shown: "We'll match your layout as closely as possible. Complex designs may vary."
- Rendered as a new PDF for user review before accepting

---

### 6.4 Cover Letter Generator

**Purpose:** Generate a tailored, high-quality cover letter using the user's CV profile data and the target job description.

#### Generation Flow

1. User navigates to `/cover-letters/new`
2. Fills in form:
   - **Job description** (textarea, required — paste full JD)
   - **Company name** (text, optional — auto-extracted from JD if not provided)
   - **Job title** (text, optional — auto-extracted from JD if not provided)
   - **Tone** (single select: Professional / Confident / Creative / Concise / Formal)
   - **Length** (radio: Short ~200w / Medium ~350w / Long ~500w)
   - **Specific emphasis** (optional textarea — e.g. "Emphasize my Python skills and remote work experience")
3. Click "Generate Cover Letter"
4. Loading state with animated skeleton (~8–15 seconds)
5. Cover letter displayed in review screen

#### Generation Prerequisites Check

Before calling Claude API, check:
- User has a complete enough CV profile (name + at least 1 experience entry). If not → prompt to complete CV first.
- User has not exceeded their monthly generation limit (see subscription tier limits).

#### Review Screen

After generation, user sees:

**Left panel:**
- Full cover letter text, editable (rich text not required — plain text textarea is fine)
- Word count
- "Regenerate" button — re-runs generation with same inputs
- "Regenerate paragraph" — select a paragraph, click to regenerate just that part (Pro+)

**Right panel:**
- ATS Score badge (0–100, color-coded: 0-49 red, 50-74 amber, 75-100 green)
- Keywords found (green chips)
- Keywords missing / suggested (amber chips with "Add to letter" button)
- Job match score summary
- Template selector (choose cover letter format for export)

#### Export Options

- Copy to clipboard (plain text)
- Download as PDF (via Puppeteer — uses selected template)
- Download as DOCX (using `docx` npm package)
- Share link (Premium — generates a publicly-accessible read-only URL)

#### Cover Letter History (`/cover-letters`)

- List/grid of all previously generated cover letters
- Each card shows: company name, job title, ATS score, date, template used
- Click to view/edit/re-export
- Filter by: date, ATS score, company, starred
- Star/favourite individual letters
- Delete (with confirmation)

#### Tier Limits

| Tier | Generations per month |
|---|---|
| Free | 3 |
| Pro | 30 |
| Premium | 100 |
| Career | Unlimited |

When limit is reached: banner shown with upgrade CTA. Limit resets on billing anniversary date, not calendar month.

---

### 6.5 Cover Letter Template System

#### Available Templates

| ID | Name | Style | Tier |
|---|---|---|---|
| `cl-classic` | Classic | Traditional letter format | Free |
| `cl-modern` | Modern Block | Clean modern layout, no indents | Free |
| `cl-minimal` | Minimal | Ultra-sparse, lots of whitespace | Pro |
| `cl-formal` | Formal Letterhead | Company letterhead style | Pro |
| `cl-creative` | Creative Header | Bold name header, visual accent | Premium |

#### Template Pairing

Each CV template has a recommended matching cover letter template. Recommendation shown in UI but user can mix freely.

| CV Template | Recommended CL Template |
|---|---|
| Classic | cl-classic |
| Minimal | cl-minimal |
| Sidebar | cl-modern |
| Bold Header | cl-creative |
| Executive | cl-formal |

#### Template Variables Available

```
{{applicant_name}}
{{applicant_email}}
{{applicant_phone}}
{{applicant_location}}
{{applicant_linkedin}}
{{company_name}}
{{job_title}}
{{date}}
{{cover_letter_body}}
```

---

### 6.6 Job Application Tracker

**Purpose:** Give users a Kanban-style board to track all job applications in one place, linked to their generated cover letters.

**Available from:** Pro tier and above.

#### Kanban Board Columns (in order)

1. **Saved** — Job bookmarked, not yet applied
2. **Applied** — Application submitted
3. **Phone Screen** — Initial recruiter call scheduled/done
4. **Interview** — Interview scheduled/done
5. **Technical** — Technical assessment / take-home
6. **Final Round** — Final interviews
7. **Offer** — Offer received
8. **Rejected** — Application rejected
9. **Withdrawn** — User withdrew application

#### Job Application Card (shown on board)

Each card displays:
- Company name (bold)
- Job title
- Location + work type badge (Remote/Hybrid/Onsite)
- Applied date
- Priority indicator (colored dot: red/amber/gray)
- Linked cover letter icon (if a cover letter is linked)
- Star/favourite toggle

Click card → opens detail drawer/modal with all fields editable.

#### Adding a New Application

Two ways to add:
1. Manual entry form (company, title, URL, JD paste, status)
2. From cover letter history — "Add to tracker" button on any cover letter

#### Application Detail View (drawer/modal)

- All fields editable inline
- Notes section (free text, rich text optional)
- Linked cover letter (dropdown to select from user's cover letters)
- Linked documents (upload offer letter, job description PDF, etc.)
- Activity timeline — auto-logged: "Status changed from Applied to Interview — Jan 15"
- Interview notes sub-section
- Contact person details (name, email)
- Salary information

#### Tracker Dashboard Stats (top of tracker page)

- Total active applications
- Applications this week
- Interview rate (interviews / applied × 100%)
- Offer rate (offers / applied × 100%)

#### Interview Prep (AI feature — Premium+)

On any application in "Interview" or later status:
- "Generate interview prep" button
- Claude generates: likely interview questions based on JD, suggested STAR-format answers based on user's experience, company research summary if company name provided

---

### 6.7 AI Extras

**Purpose:** Additional AI-powered tools that extend the platform beyond CV and cover letters.

#### 6.7.1 LinkedIn Summary Rewriter (Pro+)

- User pastes their current LinkedIn summary
- Optionally specifies target role
- Claude rewrites it to be more compelling, keyword-optimized
- Output shown with before/after comparison
- Copy button for output

#### 6.7.2 Cold Email Generator (Pro+)

- User provides: target person's name + title, their company, purpose of outreach
- Claude drafts a short, professional networking cold email
- 3 tone variants generated: Direct / Warm / Mutual connection
- User selects and copies preferred version

#### 6.7.3 Job Description Analyser (Free — limited)

- Paste a job description
- Claude extracts and summarizes:
  - Required skills
  - Nice-to-have skills
  - Culture signals
  - Red flags (unrealistic requirements, vague comp, etc.)
  - Estimated seniority level
  - Whether it's a good match for the user's profile (if CV complete)

#### 6.7.4 CV Bullet Point Improver (Pro+)

- User pastes one or more bullet points from their experience
- Specifies target role context (optional)
- Claude rewrites them to be more impactful (action verb, quantified, outcome-focused)
- Before/after shown
- User accepts/rejects each improved bullet

#### 6.7.5 Interview Question Generator (Premium+)

- User provides job description
- Claude generates:
  - 5 behavioral questions (STAR format)
  - 5 technical/role-specific questions
  - 3 questions to ask the interviewer
  - Tips for this specific role type
- Available from tracker (linked to application) or standalone

---

### 6.8 Dashboard

**URL:** `/dashboard`

The main landing page after login. Designed to show progress and quick-access to core actions.

#### Dashboard Sections

**Welcome banner** (personalized)
- "Good morning, Alex. You have 3 active applications."
- Quick action buttons: "Generate cover letter", "Update CV", "Add application"

**CV Profile card**
- Completion percentage bar
- Last updated date
- "View & edit" button
- Thumbnail of current preferred template

**Recent cover letters** (last 3)
- Card for each: company, job title, ATS score, date
- "View all" link

**Application tracker summary**
- Count badges per status column
- "Open tracker" button
- Visual mini-chart of applications by status

**Usage this month** (subscription indicator)
- Cover letter generations used / limit
- Resets in X days
- Upgrade CTA if near limit

**Suggested next actions** (contextual)
- If CV incomplete: "Complete your CV profile to get better results"
- If no cover letters: "Generate your first cover letter"
- If no tracker entries: "Start tracking your applications"

---

## 7. Subscription & Pricing

### 7.1 Tier Definitions

#### Free Tier
**Price:** $0/month  
**Purpose:** Lead generation, product-market fit validation  

Included:
- 3 cover letter generations per month
- 1 CV profile
- 2 CV templates (Classic, Minimal)
- 1 cover letter template
- PDF export (with watermark — "Created with [App Name]")
- DOCX export (no watermark)
- Job Description Analyser (3 uses/month)
- CV upload + AI extraction (1 upload)

Not included:
- ATS score and keyword analysis
- Job application tracker
- Template color customization
- AI Extras (LinkedIn, cold email, bullet improver)
- PDF export without watermark
- Cover letter history beyond last 5
- Re-upload CV (locked after first upload)

---

#### Pro Tier
**Price:** $9.99/month or $89.99/year (~25% discount)  
**Target:** Active job seekers applying regularly  

Everything in Free, plus:
- 30 cover letter generations per month
- All 6 CV templates
- All cover letter templates (except Creative)
- PDF export — no watermark
- ATS score + keyword analysis
- Job application tracker (full Kanban board)
- Cover letter history — unlimited
- CV re-upload — unlimited
- LinkedIn Summary Rewriter
- Cold Email Generator
- CV Bullet Improver
- Template color customization (5 palettes)
- Job Description Analyser — unlimited

---

#### Premium Tier
**Price:** $19.99/month or $179.99/year (~25% discount)  
**Target:** Power users, career switchers  

Everything in Pro, plus:
- 100 cover letter generations per month
- All templates including Creative
- Upload your own CV format (custom layout)
- Regenerate single paragraph (not full letter)
- Interview prep AI
- Interview Question Generator
- Share cover letter via public link
- Priority support

---

#### Career Tier
**Price:** $29.99/month or $269.99/year  
**Target:** Executives, high-volume job seekers, career coaches  

Everything in Premium, plus:
- **Unlimited** cover letter generations
- Multiple CV profiles (up to 5) — for different roles/industries
- AI Interview Question Generator — unlimited
- Early access to new features
- Priority email support with 24-hour response

---

### 7.2 Trial Policy

- 7-day free trial available on Pro and Premium (not Career)
- Credit card required to start trial
- Charged automatically at trial end unless cancelled
- One trial per user account (tracked by email)

### 7.3 Upgrade/Downgrade Logic

- Upgrade is immediate — new tier active instantly
- Downgrade applies at end of current billing period
- On downgrade, data is preserved (cover letters, tracker entries kept) but access to locked features is hidden
- If usage exceeds new tier limits at downgrade time, user is shown a warning but data is not deleted

### 7.4 Subscription State Machine

```
[none] → [trial] → [active]
                  ↓
              [cancelled] → [expired] → [none/free]
                  ↓
             [past_due] → [active] (after payment succeeds)
                       → [cancelled] (after 7-day grace period)
```

---

## 8. Payment Integration — SSLCommerz

### 8.1 Why SSLCommerz

SSLCommerz supports international card payments (Visa, Mastercard, Amex) in USD, making it viable for the global market while being operable from Bangladesh. Supports recurring billing via their subscription APIs.

### 8.2 Payment Flow

```
User clicks "Subscribe to Pro"
      ↓
POST /api/payment/initiate
  - Creates a `payments` record with status='pending'
  - Generates unique tran_id
  - Calls SSLCommerz API with amount, currency, return URLs
  - Returns SSLCommerz payment gateway URL
      ↓
User redirected to SSLCommerz hosted payment page
  - User enters card details on SSLCommerz's secure page
      ↓
SSLCommerz redirects to our server:
  - Success → POST /api/payment/success
  - Failure → GET /api/payment/fail
  - Cancel  → GET /api/payment/cancel
      ↓
/api/payment/success:
  - Validates the transaction with SSLCommerz validation API
  - Updates payments record: status='success', val_id stored
  - Updates profiles: subscription_tier, subscription_status='active',
    subscription_expires_at = now() + 30 days (or 365 days for yearly)
  - Sends welcome/receipt email
  - Redirects user to /dashboard?payment=success
```

### 8.3 SSLCommerz Integration Code Structure

```typescript
// lib/sslcommerz.ts

export interface SSLCommerzInitParams {
  total_amount: number;
  currency: 'USD';
  tran_id: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
  product_name: string;
  product_category: 'subscription';
  shipping_method: 'NO';
}

export async function initiatePayment(params: SSLCommerzInitParams): Promise<string> {
  // Returns the gateway URL to redirect user to
}

export async function validatePayment(val_id: string): Promise<boolean> {
  // Calls SSLCommerz validation endpoint
  // Returns true if transaction is genuinely successful
}
```

### 8.4 Webhook / IPN (Instant Payment Notification)

SSLCommerz sends an IPN POST to a configured endpoint for async notifications. Implement at `/api/payment/ipn`:
- Validate the IPN signature
- Update payment and subscription records
- This is a backup to the redirect-based flow

### 8.5 Pricing in SSLCommerz

| Plan | Monthly USD | Yearly USD |
|---|---|---|
| Pro Monthly | $9.99 | — |
| Pro Yearly | — | $89.99 |
| Premium Monthly | $19.99 | — |
| Premium Yearly | — | $179.99 |
| Career Monthly | $29.99 | — |
| Career Yearly | — | $269.99 |

### 8.6 Billing Page (`/settings/billing`)

Shows:
- Current plan + status badge
- Next billing date
- Amount
- Payment history table (date, plan, amount, status, invoice download)
- "Upgrade plan" button
- "Cancel subscription" button (with confirmation modal)
- "Change payment method" link

---

## 9. UI & UX Specifications

### 9.1 Design System

**Typography**
- Font family: Inter (Google Fonts)
- Headings: 600 weight
- Body: 400 weight
- Font sizes: 12px, 14px, 16px, 18px, 24px, 32px, 48px

**Color Palette**

```
Primary:         #6C63FF  (purple-violet — AI, action)
Primary dark:    #5A52D5
Primary light:   #EEF0FF

Neutral-900:     #111318
Neutral-700:     #374151
Neutral-500:     #6B7280
Neutral-300:     #D1D5DB
Neutral-100:     #F3F4F6
White:           #FFFFFF

Success:         #10B981
Warning:         #F59E0B
Danger:          #EF4444
Info:            #3B82F6

Background:      #FAFAFA
Surface:         #FFFFFF
Border:          #E5E7EB
```

**Border Radius**
- Buttons, inputs: 8px
- Cards: 12px
- Modals: 16px
- Badges/chips: 9999px (pill)

**Spacing System:** 4px base unit (4, 8, 12, 16, 24, 32, 48, 64px)

**Shadows**
- Card: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`
- Modal: `0 20px 60px rgba(0,0,0,0.15)`
- Dropdown: `0 4px 16px rgba(0,0,0,0.10)`

### 9.2 Component Library

All components built in-house with Tailwind CSS. Key components:

- `Button` (variants: primary, secondary, ghost, danger; sizes: sm, md, lg)
- `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `DatePicker`
- `Card` (with header, body, footer slots)
- `Modal` / `Dialog` (with overlay)
- `Drawer` (right-side sliding panel — used for application detail)
- `Badge` / `Chip` (with remove option)
- `Toast` / `Notification` (top-right position, 4 types)
- `Progress` (bar and circular)
- `Skeleton` (loading state for all major components)
- `Tabs`
- `Dropdown` menu
- `Kanban Board` (drag-and-drop columns)
- `FileUpload` (drag-and-drop zone)
- `Avatar` (initials fallback)
- `ATS Score Ring` (circular progress with score number)
- `PlanBadge` (tier indicator: Free/Pro/Premium/Career)
- `UpgradeCTA` (inline upgrade prompt for locked features)

### 9.3 Responsive Breakpoints

| Breakpoint | Width | Usage |
|---|---|---|
| Mobile | < 640px | Not primary for web v1, but must not break |
| Tablet | 640–1024px | Sidebar collapses to icon-only |
| Desktop | > 1024px | Full sidebar, two-panel layouts |
| Wide | > 1440px | Max content width 1400px, centered |

### 9.4 Loading & Error States

Every async operation must show:
- **Loading:** skeleton screen or spinner, never blank
- **Empty:** illustrated empty state with action CTA
- **Error:** clear error message + retry button
- **Success:** toast notification

### 9.5 Accessibility

- All interactive elements keyboard-navigable
- ARIA labels on icon-only buttons
- Color contrast minimum AA (4.5:1 ratio)
- Focus indicators visible on all focusable elements
- Alt text on all images

---

## 10. Page & Screen Flows

### 10.1 Marketing Pages (public, no auth required)

**Landing Page (`/`)**
- Hero: headline, subheading, CTA ("Get started free")
- Social proof: user count or testimonials
- Feature highlights: CV Builder, Cover Letter AI, ATS Score, Job Tracker
- Template preview gallery (static images)
- Pricing table (linking to `/pricing`)
- FAQ accordion
- Footer

**Pricing Page (`/pricing`)**
- 4-column pricing table (Free / Pro / Premium / Career)
- Monthly/Yearly toggle (yearly shows savings)
- Feature comparison table below pricing cards
- "Start free trial" CTA on paid tiers

### 10.2 Auth Pages

**Login (`/login`)**
- "Continue with Google" button (primary)
- Or divider
- Email + Password form
- "Forgot password" link
- "Don't have an account? Sign up" link

**Register (`/register`)**
- "Continue with Google" button (primary)
- Or divider
- Email + Password + Confirm Password form
- Terms of service checkbox
- "Already have an account? Log in" link

### 10.3 Protected App Pages

All pages below require authentication. Wrapped in the dashboard layout (sidebar + topbar).

**Sidebar Navigation Items:**
- Dashboard (home icon)
- My CV (document icon)
- Cover Letters (file-text icon)
- Job Tracker (briefcase icon) — Pro badge if not subscribed
- AI Tools (sparkle icon)
- Settings (gear icon)
- Upgrade (zap icon) — shown only on Free/Pro tiers

**Topbar:**
- App logo (left)
- Page title (center)
- Notifications bell (right)
- User avatar + dropdown (right) → Profile, Settings, Billing, Sign out

---

### 10.4 Full CV Module Flow

```
/cv (overview)
  ├── Profile incomplete → banner: "Complete your CV"
  ├── "Upload CV" button → /cv/upload
  ├── "Edit CV" button → /cv/edit
  └── "Choose template" button → /cv/templates

/cv/upload
  ├── Drag-drop zone
  ├── "Start from scratch" link → /cv/edit (blank)
  ├── Upload → loading states → /cv/edit (pre-filled)

/cv/edit
  ├── Left nav: section links
  ├── Main: section editor
  ├── Right: live mini-preview (toggleable)
  ├── "Preview full CV" button → opens full preview modal
  └── "Export PDF" button → calls /api/export → download

/cv/templates
  ├── Template grid
  ├── Click template → live preview with user data
  ├── "Use template" → saves preference → back to /cv/edit
```

### 10.5 Full Cover Letter Module Flow

```
/cover-letters (list/history)
  ├── Empty state → "Generate your first cover letter"
  ├── "New cover letter" button → /cover-letters/new
  └── Click existing → /cover-letters/[id]

/cover-letters/new
  ├── Check: CV complete enough? No → prompt to complete CV
  ├── Check: Generation limit reached? Yes → upgrade modal
  ├── Form: Job description, company, title, tone, length, emphasis
  └── "Generate" → loading → /cover-letters/[id] (new)

/cover-letters/[id]
  ├── Left: editable cover letter text
  ├── Right: ATS panel + template selector
  ├── "Regenerate" button
  ├── "Export PDF" button
  ├── "Export DOCX" button
  ├── "Add to tracker" button
  └── "Share link" button (Premium+)
```

---

## 11. API Specification

All API routes are Next.js Route Handlers. All require authentication via Supabase session cookie, except payment callbacks.

### 11.1 CV Extraction

**POST `/api/extract`**

Request:
```json
{
  "file_url": "https://supabase.../cv-uploads/user-id/file.pdf",
  "file_type": "pdf"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "full_name": "Alex Rahman",
    "professional_title": "Senior Product Manager",
    "email": "alex@email.com",
    "phone": "+880 1700 000000",
    "location": "Dhaka, Bangladesh",
    "linkedin_url": "https://linkedin.com/in/alexrahman",
    "summary": "...",
    "experience": [...],
    "education": [...],
    "skills": [...],
    "projects": [...],
    "certifications": [...],
    "languages": [...]
  }
}
```

Error response:
```json
{
  "success": false,
  "error": "Could not extract text from file",
  "fallback": "manual"
}
```

### 11.2 Cover Letter Generation

**POST `/api/generate`**

Request:
```json
{
  "job_description": "We are looking for a...",
  "company_name": "Figma",
  "job_title": "Senior Product Designer",
  "tone": "professional",
  "length": "medium",
  "emphasis": "Highlight my design system experience"
}
```

Response:
```json
{
  "success": true,
  "cover_letter_id": "uuid",
  "content": "Dear Hiring Manager...",
  "ats_score": 82,
  "keywords_found": ["design systems", "Figma", "cross-functional"],
  "keywords_missing": ["accessibility", "user research"]
}
```

Rate limit: enforced server-side against user's tier limit. Returns 429 with `{ "error": "Monthly limit reached", "limit": 3, "used": 3, "upgrade_url": "/pricing" }` when exceeded.

### 11.3 PDF Export

**POST `/api/export`**

Request:
```json
{
  "type": "cv",
  "template_id": "classic",
  "cover_letter_id": null
}
```

Or for cover letter:
```json
{
  "type": "cover_letter",
  "cover_letter_id": "uuid",
  "template_id": "cl-modern"
}
```

Response: Binary PDF stream with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="cv-alex-rahman-classic.pdf"
```

### 11.4 Subscription Check Middleware

Every API route that has tier-gating must call `checkSubscription(userId, requiredTier)`:

```typescript
// lib/subscription.ts
export async function checkSubscription(
  userId: string,
  requiredTier: 'free' | 'pro' | 'premium' | 'career'
): Promise<{ allowed: boolean; currentTier: string }> {
  // Fetch from profiles table
  // Compare tier hierarchy
  // Return allowed boolean
}
```

Tier hierarchy: `free (0) < pro (1) < premium (2) < career (3)`

---

## 12. PDF Generation System

### 12.1 How It Works

PDF generation uses Puppeteer running on the same server as the Next.js app.

Flow:
1. `/api/export` receives request with template ID and data source (cv_profile or cover_letter)
2. Fetch user's data from Supabase
3. Load HTML template file from `/templates/{type}/{template_id}.html`
4. Replace all `{{variable}}` placeholders with real data using a templating function
5. Launch Puppeteer (reuse browser instance — do not launch per request)
6. Open a new page, set HTML content
7. Wait for fonts to load (`page.waitForNetworkIdle()`)
8. Generate PDF with A4 settings
9. Close page (not browser)
10. Upload PDF to Supabase Storage at `pdf-exports/{user_id}/{type}-{timestamp}.pdf`
11. Update database record with PDF URL
12. Stream PDF back to client as download

### 12.2 Puppeteer Singleton Pattern

```typescript
// lib/pdf.ts — browser singleton

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return browser;
}

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  });
  await page.close();
  return Buffer.from(pdf);
}
```

### 12.3 PDF Template Specifications

Each template HTML file must:
- Be self-contained (no external CSS files — inline all styles)
- Embed fonts via `@import` from Google Fonts (loaded at render time by Puppeteer)
- Use `@page { size: A4; margin: 0; }` in CSS
- Have `page-break-inside: avoid` on experience entries and other multi-line blocks
- Include `{{WATERMARK}}` placeholder (replaced with watermark div for Free tier, empty string for paid tiers)
- Be tested to render correctly at 794px × 1123px (A4 at 96dpi)

### 12.4 Free Tier Watermark

For Free tier PDF exports only:
```html
<div style="position: fixed; bottom: 10mm; right: 10mm;
            font-size: 9px; color: #9CA3AF; opacity: 0.7;">
  Created with [App Name] — yourapp.com
</div>
```

---

## 13. Claude AI Integration

### 13.1 Model Configuration

```typescript
const CLAUDE_MODEL = 'claude-sonnet-4-6'; // Always use this model
const MAX_TOKENS = 2048; // Sufficient for all generation tasks
```

### 13.2 CV Extraction Prompt

**System prompt:**
```
You are an expert CV parser. Extract all information from the provided CV text and return it as a valid JSON object. Be thorough and accurate. If a field is not present in the CV, use null for that field. Do not invent or guess information not explicitly stated.

Return ONLY the JSON object, no preamble, no explanation, no markdown code blocks.

The JSON must follow this exact schema:
{
  "full_name": string | null,
  "professional_title": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "linkedin_url": string | null,
  "portfolio_url": string | null,
  "website_url": string | null,
  "summary": string | null,
  "experience": [
    {
      "id": "exp_1",
      "company": string,
      "title": string,
      "location": string | null,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null,
      "is_current": boolean,
      "bullets": [string],
      "description": string | null
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "institution": string,
      "degree": string | null,
      "field_of_study": string | null,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null,
      "gpa": string | null,
      "description": string | null
    }
  ],
  "skills": [
    {
      "id": "skill_1",
      "category": "technical" | "soft" | "tools" | "languages",
      "items": [string]
    }
  ],
  "projects": [
    {
      "id": "proj_1",
      "name": string,
      "description": string | null,
      "tech_stack": [string],
      "url": string | null,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null
    }
  ],
  "certifications": [
    {
      "id": "cert_1",
      "name": string,
      "issuer": string | null,
      "issue_date": "YYYY-MM" | null,
      "expiry_date": "YYYY-MM" | null,
      "url": string | null
    }
  ],
  "languages": [
    {
      "id": "lang_1",
      "language": string,
      "proficiency": "native" | "fluent" | "advanced" | "intermediate" | "basic"
    }
  ]
}
```

**User message:**
```
Here is the CV text to parse:

[EXTRACTED_CV_TEXT]
```

### 13.3 Cover Letter Generation Prompt

**System prompt:**
```
You are an expert career coach and professional writer with 15 years of experience helping candidates land their dream jobs. You write cover letters that are tailored, compelling, and human — never generic or robotic.

You will be given a job description and a candidate's profile. Write a cover letter that:
1. Specifically addresses the job's key requirements using the candidate's actual experience
2. Uses concrete achievements and numbers from their CV where available
3. Shows genuine enthusiasm for the role and company without being sycophantic
4. Has a strong opening that isn't "I am writing to apply for..."
5. Matches the requested tone exactly
6. Stays within the requested length
7. Ends with a confident, professional closing

Do not use clichés like "I am a team player", "I think outside the box", or "I am passionate about".
Do not fabricate experience or achievements not in the candidate's profile.
Write the letter body only — no date, no address headers, no "Sincerely". Just the content paragraphs.
```

**User message:**
```
CANDIDATE PROFILE:
Name: {{full_name}}
Current/Recent Title: {{professional_title}}
Summary: {{summary}}

Work Experience:
{{experience_text}}

Key Skills: {{skills_text}}

Notable Projects: {{projects_text}}

---

JOB DESCRIPTION:
{{job_description}}

---

INSTRUCTIONS:
- Company: {{company_name}}
- Job Title: {{job_title}}
- Tone: {{tone}} (professional = formal but warm; confident = assertive, direct; creative = engaging, shows personality; concise = brief and punchy; formal = traditional business letter)
- Length: {{length}} (short = ~200 words; medium = ~350 words; long = ~500 words)
- Special emphasis: {{emphasis}}

Write the cover letter body now.
```

### 13.4 ATS Scoring Prompt

Run immediately after cover letter generation as a separate API call.

**System prompt:**
```
You are an ATS (Applicant Tracking System) expert. Analyze a cover letter against a job description and return a JSON object with the ATS compatibility score and keyword analysis. Return ONLY valid JSON, no other text.
```

**User message:**
```
JOB DESCRIPTION:
{{job_description}}

COVER LETTER:
{{cover_letter_content}}

Return this JSON:
{
  "score": number (0-100),
  "keywords_found": [string],
  "keywords_missing": [string],
  "summary": string (one sentence explanation of the score)
}
```

### 13.5 API Error Handling

All Claude API calls must handle:
- `rate_limit_error` → retry after 60 seconds, max 3 retries
- `overloaded_error` → retry after 30 seconds, max 2 retries
- `invalid_request_error` → log error, return user-friendly message
- Timeout (> 30 seconds) → return partial result if available, else error
- Network error → return error with "Please try again"

### 13.6 Cost Control

- Log every API call: model, input_tokens, output_tokens, user_id, feature_used, timestamp
- This enables per-user cost tracking and abuse detection
- If a user's API cost exceeds 5× their subscription revenue in a month, flag for review
- Free tier users: hard cap at 3 generations/month enforced at API route level (before calling Claude)

---

## 14. Security & Compliance

### 14.1 Authentication Security

- Supabase Auth handles password hashing (bcrypt)
- No passwords ever stored in our database
- JWT tokens expire after 1 hour (auto-refreshed by Supabase client)
- OAuth state parameter validated to prevent CSRF

### 14.2 API Security

- All API routes validate Supabase session server-side
- Row Level Security on all Supabase tables (users can only access their own data)
- API route for payment callbacks validates SSLCommerz signature before processing
- Rate limiting on generation endpoints: 10 requests/minute per user (via simple Redis counter or in-memory with PM2 cluster limits)
- `SUPABASE_SERVICE_ROLE_KEY` only used in server-side code, never exposed to client

### 14.3 File Upload Security

- Accepted MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- File size limit enforced: 10MB
- Files stored in private Supabase Storage bucket (not publicly accessible)
- Signed URLs generated for each file access (expire after 1 hour)
- File content scanned for basic safety (no executable code — PDF/DOCX only)

### 14.4 Payment Security

- SSLCommerz payment page is entirely hosted by SSLCommerz (PCI-compliant)
- We never handle raw card numbers
- All payment amounts validated server-side against our price list (prevent tampering)
- Payment validation API called server-to-server to confirm transaction

### 14.5 Data Privacy

- User data stored in Supabase (region: nearest to target market)
- CV data is used only to generate documents for that user — never used for AI training or shared
- Privacy policy must clearly state: data usage, retention, and deletion rights
- Account deletion: removes all user data including CV, cover letters, tracker entries, and uploaded files within 24 hours
- GDPR-compatible data export: user can download all their data as JSON from settings

---

## 15. Performance Requirements

### 15.1 Response Time Targets

| Operation | Target | Max acceptable |
|---|---|---|
| Page load (cached) | < 1 second | 2 seconds |
| Page load (first visit) | < 2 seconds | 4 seconds |
| CV upload + extraction start | < 3 seconds | 5 seconds |
| AI extraction complete | < 20 seconds | 30 seconds |
| Cover letter generation | < 15 seconds | 25 seconds |
| PDF export | < 10 seconds | 20 seconds |
| ATS score calculation | < 8 seconds | 15 seconds |
| Database reads | < 200ms | 500ms |

### 15.2 Optimization Strategies

- **Puppeteer:** singleton browser instance (not launched per-request)
- **Claude API:** streaming responses for cover letter generation (show text as it streams)
- **Database:** connection pooling via Supabase's built-in pooler
- **Images:** Next.js `<Image>` component with lazy loading
- **Static pages:** ISR (Incremental Static Regeneration) for marketing pages
- **API responses:** cache subscription tier in Zustand store (re-fetch on billing page only)

### 15.3 Streaming Cover Letter Generation

Use Claude API streaming to show the cover letter appearing word-by-word as it generates:

```typescript
// In /api/generate/route.ts
const stream = await claude.messages.stream({
  model: CLAUDE_MODEL,
  max_tokens: MAX_TOKENS,
  messages: [...]
});

return new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

Client-side renders each streamed chunk into the textarea in real-time.

---

## 16. Future — Flutter Mobile App

This section documents decisions made today that must remain compatible with the Flutter app.

### 16.1 Same Backend

The Flutter app will use the exact same Supabase database and the same Next.js API routes (via HTTPS). No mobile-specific backend needed.

### 16.2 Authentication

Flutter will use `supabase_flutter` package. Same Google OAuth, email/password, magic link — same Supabase project.

### 16.3 PDF Generation

Flutter will call `/api/export` just like the web app. The PDF is generated server-side and returned as a binary download.

### 16.4 Subscription

Flutter will use RevenueCat for in-app purchases (Google Play + App Store). RevenueCat webhooks will update the same `profiles.subscription_tier` field in Supabase. Both web (SSLCommerz) and mobile (RevenueCat) subscriptions write to the same column — the app checks tier, not payment source.

**Important:** Subscriptions purchased on web are NOT automatically available for in-app purchase and vice versa. The user must subscribe on each platform separately (this is an App Store policy requirement). However, the account and data are shared.

### 16.5 Feature Parity Target

Flutter v1 should include: CV editor (no upload, manual entry only — file upload added in v1.1), cover letter generation, cover letter history, job tracker, basic AI extras. CV upload and PDF generation via API.

---

## 17. Glossary

| Term | Definition |
|---|---|
| ATS | Applicant Tracking System — software employers use to filter CVs before human review |
| CV | Curriculum Vitae — the document listing a candidate's full work history and qualifications |
| Cover Letter | A one-page letter accompanying a CV, tailored to a specific job application |
| Tier | Subscription level (Free, Pro, Premium, Career) |
| Generation | One instance of Claude producing a cover letter output |
| Extraction | Claude parsing an uploaded CV into structured JSON fields |
| Template | An HTML layout used to render CV or cover letter data as a formatted PDF |
| MAU | Monthly Active User — a user who logs in at least once in a calendar month |
| ATS Score | Our proprietary 0–100 score indicating how well a cover letter matches a job description's keywords |
| SSLCommerz | The payment gateway used for processing subscription payments |
| RLS | Row Level Security — Supabase/Postgres feature ensuring users only access their own data |
| PM2 | Process manager for Node.js — keeps the Next.js server running on the hosting server |
| Puppeteer | Node.js library that controls a headless Chrome browser for PDF generation |
| Supabase | Backend-as-a-service providing PostgreSQL database, authentication, and file storage |
| JD | Job Description — the text posted by an employer listing role requirements |
| STAR | Situation, Task, Action, Result — a framework for writing experience bullet points |

---

*End of specification document — v1.0*  
*This document is the source of truth. All implementation decisions should reference and update this document.*
