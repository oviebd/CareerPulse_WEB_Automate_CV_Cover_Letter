# CareerPulse — UI/UX Restructure & Re-Theme Plan

> Prepared as an expert UI/UX design + front-end architecture plan for an AI-powered CV / cover-letter / application-tracking platform (Next.js 15 App Router · Tailwind 3 · Postgres + NextAuth · Zustand · Framer Motion · Claude).
> Based on a full-codebase audit (6 subsystems, ~40 routes, 98 components, 73 design tokens) plus the in-repo product spec, feature summary, and CV-edit UI docs.

---

## 0. TL;DR

CareerPulse is **functionally rich but architecturally fragmented**. The bones are good — a disciplined semantic-token layer, a mature 3-pane CV editor with true-WYSIWYG preview, a solid dnd-kit Kanban, a clean Documents hub. But it carries **half-finished IA migrations, duplicate implementations of the same feature, a few trust-breaking defects, and a purple theme that is expensive to change because the brand hue is hard-coded into ~30 literal color values instead of being derived from one source.**

The restructure is therefore **three coordinated tracks**:

1. **Foundation & Theme** — re-architect color tokens so the brand is *3 numbers*, not 30 literals; fix the systemic accessibility failures; ship a new color/theme (4 directions proposed below).
2. **System & IA** — add a headless component foundation, consolidate duplicate editors/boards/cover-letter stacks, and finalize a coherent information architecture.
3. **Flows & Conversion** — make the core "build → tailor → track → export" journey one legible path, and fix the marketing/auth/onboarding conversion + trust gaps.

**The single most important insight for your re-theme request:** because components already consume semantic `--color-*` tokens (only ~17 genuine hardcoded-color leaks in the whole app), **changing the color is cheap *once the token definition layer is fixed*.** That fix is Phase 0 and it unlocks everything.

---

## 1. Product North Star (what every screen must serve)

**Job to be done:** *"Help me apply to more jobs, faster, without sacrificing quality."*

**The defensible moat** is the **structured, write-once-render-many CV model**: career data is entered/extracted once as typed JSONB sections, then rendered into ~19 templates, tailored to any job description by Claude, and paired with a matching cover letter + ATS score. This data model is the **immovable spine** — the restructure must preserve it absolutely.

**Personas (in priority order):**
| Persona | Need | Design implication |
|---|---|---|
| **Active Job Seeker** (primary payer) | Speed, volume, repeatable tailoring | Fast, dense, keyboard-friendly; the tailor loop must be 1 route |
| **Career Switcher** | Reframing, guidance | Coaching cues (bullet strength, ATS gaps) |
| **Fresh Graduate** (price-sensitive) | Confidence, low cost, "am I done?" | Progressive disclosure, completion nudges, generous free value |
| **Passive Job Seeker** | Convenience | Upload-extract cold-start, low friction |

**Acquisition mechanic:** guest-first (build a full CV with no account, merge into a saved row on sign-up). Preserve and *foreground* this funnel.

**Monetization:** 4 tiers (Free / Pro $9.99 / Premium $19.99 / Career $29.99), gated on AI-generation volume, ATS, tracker, and AI extras. The ATS score is the strongest paid-value proof — make it the deliberate conversion moment.

---

## 2. Current-State Assessment

### 2.1 Strengths to preserve (do **not** rebuild these)
- **Semantic consumption layer** — components read `--color-*`, `--shadow-*`, `--radius-*`; brand hue is centralized. *This is why the re-theme is cheap.*
- **No-FOUC theming** — blocking inline script sets `data-theme` before paint; Zustand persists; accessible `ThemeToggle`.
- **Themed shadow system** + `.glass-panel`, `.focus-ring`, `.skeleton-shimmer` (with dark variants).
- **Core CV editor** — 3-pane (navigate → edit → live A4 iframe preview), focus modes, undo/redo (50-step, burst-debounced), per-section PDF-visibility toggles, real inline AI polish, client-side ATS + keyword chips.
- **`KanbanBoard`** (dnd-kit, optimistic mutations, keyboard sensors), **`JobDetailDrawer`** (debounced autosave, delete guard), **cover-letter `[id]` editor** (live PDF-accurate preview), **Documents hub** (tabbed, deep-linkable).
- **Leaf form primitives** (`Input`/`Textarea`/`Select`/`Button`) — `forwardRef`, native attr extension, consistent label/error/helper contract.
- **Guest-first funnel + AI CV extraction + privacy-first job storage** (full JD never persisted).

### 2.2 Critical / high-severity problems (ranked)

| # | Problem | Where | Impact |
|---|---|---|---|
| C1 | **Fake autosave** — status flips "Saving…/Saved" on a 500 ms timer with **no network write**; only a manual button persists. | `CVEditor.tsx:336`, `JobTailoredCVEditor.tsx:453` | Users lose work believing it's saved. Top trust-killer. |
| C2 | **Stranded AI tools** — the application-detail page hosting follow-up-email + interview-prep AI is **unreachable** (only linked from an orphaned component). | `applications/[id]`, `ContextualAITools.tsx` | A whole paid feature has zero entry point. |
| C3 | **3 duplicate CV editors** (`CVEditor`, `JobTailoredCVEditor` ~1,428 lines, `templates/[id]/preview` ~816 lines) with **3 different save models**. | `components/cv/*` | ~2,200 lines of divergent logic; users can't tell which editor they're in or whether Save overwrites their core CV. |
| C4 | **Onboarding modal can never be dismissed** — `step` stuck at 0, `finish()` never called, so `is_onboarded` never persists → re-appears every visit. | `OnboardingGate.tsx` | Every new user hits a recurring unskippable interstitial. |
| H1 | **`--color-muted` (#94A3B8) fails WCAG AA at 2.45:1** — the single most-used text token (**357 usages**). | `globals.css:19` | Systemic legibility failure on nearly every screen. |
| H2 | **Re-theme friction** — brand purple baked as **30 literal rgba/hex values** (ramp, alpha tints, focus ring, glow shadows) in both theme blocks; zero derivation. | `globals.css:44–100, 139–183` | A rebrand means rewriting the whole ramp twice, error-prone. |
| H3 | **3 parallel Kanban/tracker impls** (2 orphaned) + **2 status taxonomies**; **2 disjoint cover-letter stacks** (different template UX, preview, export API). | `components/jobs/*` vs `applications/*` vs `tracker/*`; cover-letter flows | High regression risk; inconsistent experience per entry point. |
| H4 | **"New Application" CTA doesn't create an application** — it generates a CV+cover letter and lands on the optimise result page. Terminology fragmented (Applications vs Jobs vs Tracker for one entity). | `applications/new` → `AddJobWizard` | Broken mental model at the primary action. |
| H5 | **No headless a11y foundation** — every overlay (dialog/drawer/menu/popover) is hand-rolled with divergent focus/keyboard behavior; the "official" `Modal` has **no focus trap** (WCAG 2.4.3/2.1.2 fail). | `components/ui/modal.tsx` + 6 one-offs | Broken keyboard/SR behavior across every overlay. |
| H6 | **No Terms/Privacy pages, no marketing footer, `/pricing` linked from nowhere.** | `app/(marketing)/*` | Legal/trust/compliance gap for a product taking real payments + GDPR export; major conversion leak. |
| H7 | **Delete Account non-functional + leaks dev copy** ("delete the user manually"); the button only fires a toast. | `settings/account/page.tsx` | Reads as broken; blocks a basic data-rights action. |
| H8 | **Landing hero uses a generic stock desk photo** mislabeled "Live preview in the editor"; the real product proof (template iframes) sits below the fold. | `(marketing)/page.tsx` | Weak first impression at peak attention. |

### 2.3 Notable medium issues
- Dark-mode **status/accent colors have no dark variants** (inherit light saturations); **dark primary button** white-on-`#A855F7` = 3.96:1 (fail).
- **Broken token** `--color-primary-300` referenced 8× but never defined.
- **Tailwind theme under-used** — only ~5 of 73 tokens mapped → **1,578 verbose `[var(--…)]` arbitrary classes**, no IntelliSense/opacity modifiers/typo-safety.
- **Two "primaries" / two "reds"** — hardcoded `#6C63FF` CV accent + chart gradient; `#ef4444` in `ATSCircularScore` ≠ `--color-danger`.
- **ATS score is ephemeral** — computed only in-editor, never persisted or shown on resume cards.
- **Live preview is `xl`-only** — mobile/tablet edit blind to the rendered document.
- **~18-section editor sidebar** with no search/progressive disclosure; inconsistent list-card patterns.
- **Large dead-code surface** — `premium/Editor.tsx` (fake AI), `cv/dashboard/*`, several unused ATS widgets, orphaned `HomeSidebar` + `TrackerStatusChart`, stale `loading.tsx` on redirect-only routes.
- **Stale product-spec** — `product-specification.md` (v1.0) describes a *different* data model (single-CV, JD stored NOT NULL, different status enum) than what ships. **The implementation is canonical.**
- **RLS not enabled on `cvs`/`jobs`** — isolation relies on app-level `user_id` filters (security/trust risk; flag for backend, out of UI scope but noted).

---

## 3. Theme & Color System Restructure  *(your "change the color/theme" ask)*

### 3.1 The foundation: make the brand *3 numbers*, not 30 literals

This is **Phase 0** and is identical regardless of which color you choose.

**Today:**
```css
--color-primary-50:  rgba(124, 58, 237, 0.08);   /* purple baked in */
--color-primary-100: rgba(124, 58, 237, 0.12);
--color-border-hover: rgba(124, 58, 237, 0.35);
--color-focus-ring:  rgba(124, 58, 237, 0.22);
/* …30 such literals across both theme blocks… */
```

**Target — channel-based brand, everything derived:**
```css
:root {
  /* The ONLY brand values you edit to re-theme: */
  --brand-h: 222; --brand-s: 89%; --brand-l: 53%;         /* e.g. Azure */
  --brand: hsl(var(--brand-h) var(--brand-s) var(--brand-l));

  /* Ramp + alphas DERIVE from the channels — no hue literals: */
  --color-primary:      var(--brand);
  --color-primary-subtle: hsl(var(--brand-h) var(--brand-s) 96%);
  --color-primary-50:   color-mix(in srgb, var(--brand) 8%, transparent);
  --color-primary-100:  color-mix(in srgb, var(--brand) 12%, transparent);
  --color-border-hover: color-mix(in srgb, var(--brand) 35%, transparent);
  --color-focus-ring:   color-mix(in srgb, var(--brand) 40%, transparent);
  /* …ramp 300/400/…/900 via lightness steps… */
}
```
Result: a rebrand = change `--brand-h/s/l`. The 9-step ramp, alpha tints, focus ring, and glow shadows all follow automatically.

**Also in Phase 0 (color-agnostic):**
- **Fix `--color-muted` globally**: `#94A3B8 → #64748B` (light, 4.8:1 ✓) and bump dark `#71717A → #9A9AA8` (~6.6:1). Then retire the `.cv-editor-text-tune` band-aid.
- **Define `--color-primary-300`** + add a CI grep guard: any `var(--…)` referenced in code but undefined in `globals.css` fails the build.
- **Add `[data-theme="dark"]` variants** for `success/warning/danger/info` + decorative accents, calibrated for deep backgrounds.
- **Split two color families:** *semantic status* (green/amber/red/blue — conventional, contrast-safe, never decorative) vs *decorative accent* (the "AI magic" hue for tailor/ATS moments, gradients, illustration — never used for status).
- **Unify strays:** replace `#6C63FF` CV-accent default + swatches + chart gradient → `--color-primary`; `ATSCircularScore` `#ef4444` → `--color-danger`; make `TrackerStatusChart` read tokens.
- **Promote tokens to first-class Tailwind colors** (`text-muted`, `bg-surface-2`, `border-default`, `primary-100…900`) and codemod the 1,578 `[var(--…)]` classes → semantic utilities (restores IntelliSense, opacity modifiers, typo-safety).

### 3.2 Brand direction options (choose one — see §12 decision)

All four are engineered for **WCAG AA** on text-bearing surfaces and for a **designed dark mode** (not an inherited filter). Neutrals, semantic status, typography, and shape are shared; only the **brand hue + canvas temperature + optional display font** differ.

---

#### Direction A — **"Ink & Azure"** · Modern Trust / Professional  ⭐ *Recommended default*
*Personality: credible, precise, calm-confident (LinkedIn-meets-Stripe-meets-Notion). The safe, broadly-appealing, conversion-optimized read for job seekers who want to look hireable.*

| Role | Light | Dark |
|---|---|---|
| Brand `--brand` | **Azure `#2563EB`** (id color) | `#3B82F6` (vivid) |
| Action (white text) | `#1D4ED8` (6.3:1 ✓) | `#2563EB` fill |
| Accent (AI/ATS) | Cyan `#06B6D4` | `#22D3EE` |
| Canvas / surface | `#F8FAFC` / `#FFFFFF` | `#0B1120` / `#131C2E` |
| Border | `#E2E8F0` | `rgba(255,255,255,.09)` |
| Text 1/2/muted | `#0F172A` / `#475569` / `#64748B` | `#F1F5F9` / `#B4C0D0` / `#94A3B8` |
| Status | green `#10B981` · amber `#F59E0B` · red `#EF4444` · info `#3B82F6` | dark-tuned variants |

**Best for:** the Active Job Seeker + trust. **Pros:** universally reads "professional/hireable," lowest brand risk, blue = competence. **Risks:** blue is common in SaaS — distinctiveness comes from the cyan AI-accent + editorial type, not the hue.

---

#### Direction B — **"Graphite & Emerald"** · Calm Focused / Premium Minimal
*Personality: quiet, confident, effortless (Linear / Vercel / Notion restraint). Ink-graphite primary actions with a single precise emerald accent. Green doubles as the "growth / you got hired" cue.*

| Role | Light | Dark |
|---|---|---|
| Primary action | **Graphite `#18181B`** (near-black buttons, ~17:1) | `#FAFAFA` (light buttons on dark) |
| Brand accent (links/ATS/progress) | Emerald `#047857` text / `#059669` fill | `#34D399` |
| Canvas / surface | `#FAFAF9` / `#FFFFFF` | `#0A0A0B` / `#161618` |
| Border | `#E7E5E4` | `rgba(255,255,255,.10)` |
| Text 1/2/muted | `#1C1917` / `#57534E` / `#78716C` | `#FAFAF9` / `#B8B5B2` / `#8B8785` |
| Status | emerald/amber/red/blue | dark-tuned |

**Best for:** long editing sessions + premium feel. **Pros:** lowest visual fatigue, very modern, emerald = career growth, black buttons feel high-end. **Risks:** near-monochrome can feel austere; needs strong typography + spacing to sing.

---

#### Direction C — **"Warm Editorial"** · Bold Human / Confident
*Personality: warm, distinctive, empowering, editorial — makes job-hunting feel less clinical. Cream canvas, a confident garnet/berry brand, gold accent, a display serif for headlines.*

| Role | Light | Dark |
|---|---|---|
| Brand (white text) | **Garnet `#BE123C`** (6.5:1 ✓) | `#FB7185` vivid / `#E11D48` fill |
| Accent | Warm gold `#D97706` | `#FBBF24` |
| Canvas / surface | Cream `#FBF8F4` / `#FFFFFF` | Warm ink `#1A1613` / `#24201C` |
| Border | `#ECE6DE` | `rgba(255,255,255,.10)` |
| Text 1/2/muted | `#1C1917` / `#57534E` / `#78716C` | `#F5F1EC` / `#C4BDB4` / `#9A9186` |
| Display font | **Fraunces / Instrument Serif** (headlines only) | same |
| Status | green/amber/red/blue (kept cool for legibility) | dark-tuned |

**Best for:** brand differentiation + the Career Switcher/Grad. **Pros:** memorable, human, stands out from the beige-resume + generic-indigo crowd. **Risks:** warm/serif reads less "corporate"; highest brand risk; must keep CV previews cool/neutral so warmth doesn't bleed into documents.

---

#### Direction D — **"Signal Ink"** · Evolve-the-Violet (lowest cost)
*Keep the existing `#7C3AED` violet brand + glass/dark-glow system, but fix it at the token layer: raise to AA everywhere, calibrate dark mode, add a teal "AI accent" for tailor/ATS moments, demote the playful mint/coral/gold to decoration only.*

| Role | Light | Dark |
|---|---|---|
| Brand (white text) | Violet `#7C3AED` (5.7:1 ✓) | `#9333EA` fill (5.4:1 ✓) / `#A855F7` vivid |
| Accent | Teal `#14B8A6` | `#2DD4BF` |
| Neutrals | slate (as today, muted fixed) | neutral-violet ink `#14141F` surface |

**Best for:** shipping fast with brand continuity. **Pros:** cheapest (definition-layer only), preserves equity, still distinctive. **Risks:** you said you want to *change* the color — this keeps it (offered as the low-risk fallback).

### 3.3 Typography, shape, density (shared)
- **Type:** keep 14 px product base (re-typesetting 1,500+ classes isn't worth it), **raise `xs` 11 → 12 px** (accessibility floor), add `3xl/4xl/5xl` display steps for marketing (removes arbitrary `text-[…px]` on heroes). Reserve the **display font** (Clash, or a serif in Direction C) for marketing hero + page titles; **Inter** for product UI; **JetBrains Mono** for the ATS score + keyword chips (makes "the number" feel precise).
- **Shape:** keep the `--radius-*` scale but *reference the tokens* in `tailwind.config.ts` (today `card:12px`/`btn:8px`/`badge:20px` are hardcoded dupes). Standardize elevation to the 4-step shadow scale — kill the ad-hoc `shadow-xl` vs `shadow-2xl` drift.
- **Density:** default to the current compact SaaS density for the Active Job Seeker; add breathing room in marketing + onboarding + the empty-state moments where the Grad/Switcher needs guidance. (Final density leans on the §12 "audience voice" decision.)
- **Motion:** keep Framer transitions but **decouple `framer-motion` from the base `Card`** (move to an optional `MotionCard`/`interactive` prop) so cards don't force client boundaries + lib lock-in everywhere.

---

## 4. Information Architecture Restructure

**Principle: one noun per concept.** Retire "Tracker" and "Jobs" as user-facing words — everything you apply to is an **Application**; everything you author is a **Document**.

### 4.1 Authenticated shell (sidebar)
```
✚ Create                 (pinned ACTION, not a route — opens the unified start flow)
   ├─ Start from a job    → paste/link JD → tailored CV + cover letter
   ├─ Start a blank CV
   └─ Upload existing CV  → AI extract
Applications   /applications      (rename of /dashboard; the Kanban IS the pipeline; keep active-count badge)
   └─ [id]     /applications/[id] ← HOST ContextualAITools (follow-up email, interview prep)
                                    reachable from JobCard "View details" AND JobDetailDrawer "Open full view"  (fixes C2)
Documents      /documents         (tabs: Resumes | Cover Letters, ?tab= deep-link — keep)
Templates      /templates         (promote out of /cv/* burial; tier-gated gallery → feeds Create)
Settings       /settings          (in-page tabs: Account | Billing | Preferences)
                                    fold /settings/billing in; remove standalone Billing item;
                                    dedupe ProfileMenu → Plan · Settings · Log out
```

### 4.2 Canonical editor + tailor (collapse the fragmentation)
- `/cv/[id]/edit` — **one** editor, `mode = core | tailored | template-focused`, **one** save model.
- `/cv/tailor` — **one** resumable flow: select CV → paste/link JD → generate → review with ATS → export/track. Persist the draft (localStorage/server) so refresh doesn't destroy generated output; render the **user's actual template + accent**, not hardcoded `classic`/`#6C63FF`.
- **301 the aliases once:** `/cv`, `/cv/builder`, `/cv/edit`, `/cv/edit/[id]`, `/cv/create-for-job` → canonical; `/cv/optimise`, `/cv/optimise/result`, `/cv/job-specific/*`, `?tailored=true` → `/cv/tailor`; `/tracker`, `/applications` (old list), `/ai-tools` → new homes; `/cover-letters/*` → `/documents?tab=cover-letters` + one editor.
- **Delete dead code:** `ApplicationBoard`/`ApplicationCard`, `TrackerBoard`, the 3rd editor in `templates/[id]/preview`, `cv/dashboard/*`, fake-AI `premium/Editor.tsx`, orphaned `loading.tsx` on redirect-only routes; decide `HomeSidebar` + `TrackerStatusChart` (wire them onto the home, or delete).

### 4.3 Marketing
- **Header:** Features · Templates · **Pricing** · Blog/Resources · [Log in / Sign up | Dashboard]  ← *link Pricing (currently orphaned).*
- **New global footer:** Product (Features, Templates, Pricing) · Company (Blog, About) · **Legal (Privacy, Terms)**.
- **Publish Terms + Privacy** (currently missing entirely — blocking for a paid + GDPR-export product).

---

## 5. Component System Plan

### 5.1 Keep (redesign-ready)
Semantic `--color-*` layer · `cn()` (clsx + tailwind-merge) · themed shadow/glass/focus/skeleton utilities · no-FOUC theme script · leaf form primitives' API shape · Toast provider · `KanbanBoard` · `JobDetailDrawer` · cover-letter `[id]` editor · Documents hub · 3-pane editor + WYSIWYG iframe preview · `DocumentPrintPreviewFrame` (A4 scaler).

### 5.2 Add the foundation (the single biggest unlock)
- **Headless a11y library** (Radix UI *or* react-aria) — base for Dialog, Popover, DropdownMenu, Tabs, Tooltip, Checkbox/Radio/Switch, Select. Your tokens stay as the styling skin.
- **`class-variance-authority`** + a **`components/ui/index.ts`** barrel + shared size/variant/radius/elevation recipes mapped to tokens.
- A **component catalog** (Storybook or a `/design` route) so the redesign is reviewable.

### 5.3 Rebuild
- **`Button`** → polymorphic (`asChild`/render-as-`Link`), CVA variants `primary/secondary/outline/ghost/danger/subtle/link`, sizes `xs/sm/md/lg/icon` (drop the baked-in `min-w-[88px]`), `iconLeft/Right`, `fullWidth`, `aria-busy`. Codemod the **29 button-styled `<Link>`s + 41 raw `<button>`s**.
- **`Modal` → `Dialog`** (on the headless base): focus trap + initial focus + focus restore (fixes H5), `useId`, size variants, `Title/Description/Body/Footer` slots, portal. Add `ConfirmDialog`/`AlertDialog`. Migrate `NeedLoginModal`, `AddJobWizard`, `CvTitleModal`, `CVRewriteWithAIModal`, `AddJobModal`, `LinkAssetModal`.
- **`Tabs`, `Tooltip`, `Toast`** → real ARIA roles/roving focus/`aria-live`; per-instance `layoutId`; focus+hover triggers + collision positioning. Add ARIA to `Progress`/`Skeleton`.

### 5.4 Add (missing categories forcing ad-hoc re-invention)
`DropdownMenu` · `Popover` · `Drawer/Sheet` · `EmptyState` · `Avatar(+Group)` · `Alert/Callout` · `Banner` (generalize `SubscriptionBanner`) · `Spinner` · `IconButton` · `Chip/Tag` · `SegmentedControl` · `DataTable` (replace raw billing `<table>`) · `Breadcrumb`/`Pagination` · **form-field system** (`FormField` wrapper + `Label`/`Checkbox`/`Radio`/`RadioGroup`/`Switch`) · consistent `ATSBadge` (compose `Badge`) · **Command palette** (later — powers `Create`).

---

## 6. Core CV Editor & Tailor Restructure (the spine)

1. **Honest persistence (C1):** replace timer-fake autosave with real debounced autosave *or* an explicit `Unsaved changes` state bound to `isDirty` + obvious Save.
2. **One editor (C3):** collapse the 3 surfaces into one `mode`-parameterized editor with one save model (removes ~2,200 lines). Guard destructive "update core CV" behind one reusable confirm dialog.
3. **One tailor flow (H4 / product-critical):** `/cv/tailor`, resumable, real template/accent, honest theme-aware progress (steps + rough time + cancel) instead of the full-screen dark overlay.
4. **Progressive-disclosure sidebar:** always-visible core (header · summary · experience · education · skills), everything else grouped/collapsible + **search**; consistent list-card patterns across all sections; harvest the (currently dead) `ExperienceCard` bullet-strength coaching + drag-reorder into the live editor.
5. **ATS made real:** persist a score per CV/version; show `ATSBadge` on resume cards (as already done for cover letters) + version deltas; **reveal score/keyword gap on Free** as the conversion teaser.
6. **Preview everywhere:** enable the live preview at `md`/tablet via a toggle/bottom-sheet (not `xl`-only); promote undo/redo + preview/focus toggles out of the overflow menu; add route-level `loading.tsx` + `error.tsx` on `cv/edit`, `cv/edit/[id]`, `cv/upload`, `templates/[id]/preview`.

---

## 7. Secondary Flows Consolidation

- **Applications (H2/H3):** pick `KanbanBoard` as the one board; reconnect `/applications/[id]` + `ContextualAITools` (C2); delete `ApplicationBoard`/`ApplicationCard`/`TrackerBoard`; finish the `@deprecated` seam in `lib/job-status-ui.ts` → **one status taxonomy**.
- **Terminology (H4):** one noun ("Application") across nav/board/wizard/modal/empty states; make "New Application" either create a tracked application first (then offer "generate documents"), or relabel to match its real generate-documents destination.
- **Cover letters (H3):** route `/cover-letters/new/jd` through the **same** optimise-draft → `/cover-letters/[id]` editor used by Enhance + the wizard, so every letter gets live PDF preview, tier-gated template `Select`, and the `exportCoverLetter` pipeline. Retire `GenerateCoverLetterForm`'s bespoke save/export + free-text "Template ID" field + fake `Progress(30)`. Separate a letter's "context" (company/title used for rendering) from the linked job entity (today, editing a letter silently renames the tracked application).
- **Loading states:** delete/realign stale skeletons (`cover-letters/loading`, `tracker/loading`, `ai-tools/loading`), add dark variants, give `/applications` a board-shaped skeleton.

---

## 8. Marketing / Auth / Onboarding / Settings

- **Onboarding (C4):** collapse to a single dismissible step (or wire steps 1–2); every exit path — including a visible Skip/close — calls `finish()` so `is_onboarded` persists.
- **Trust/conversion (H6/H8):** publish Terms + Privacy + footer; link Pricing; rebuild the hero with the **real** editor/template iframe (reuse `LandingTemplateGrid`) + 2–3 template previews + a pricing/social-proof strip above the fold.
- **Auth:** lead Google + email/password; demote magic link to an "Email me a link instead" toggle reusing one field; add "Forgot password?"; give `/login` + `/register` slim auth chrome (logo + theme toggle) instead of the full `MarketingSiteHeader`.
- **Settings (H7):** real Settings hub with tabs Account | Billing | Preferences; fold Billing in; strip dev-facing copy; make Delete Account actually work (or honestly describe the request path) + real email/password change entry points.
- **Pricing:** single feature-comparison table + monthly/yearly toggle; accurate CTA copy (implement a real trial or drop "Start Pro trial"); clarify the payment provider for international users.
- **Papercuts:** persist `sidebarCollapsed`; mobile top-bar page title + consider a bottom tab bar; delete orphaned `SignOutButton` + unused nav `children` branch.

---

## 9. Top 15 UX Fixes (ranked, highest leverage first)

1. **Kill fake autosave** → honest save state. *(C1, trust)*
2. **Fix `--color-muted` globally** #94A3B8 → #64748B. *(H1, 357 usages, AA)*
3. **Reconnect the stranded application-detail + AI tools.** *(C2)*
4. **Fix onboarding so it can be dismissed.** *(C4)*
5. **Publish Terms + Privacy + footer; link `/pricing`.** *(H6)*
6. **Unify the 3 CV editors → 1 parameterized editor.** *(C3)*
7. **Unify "tailor for job" → one resumable `/cv/tailor`; persist the draft.** *(product-critical)*
8. **Tailored-result preview uses the user's real template + accent.** *(H8-adjacent, WYSIWYG honesty)*
9. **Headless foundation + `Modal → Dialog` with focus trap.** *(H5)*
10. **Rebuild the landing hero with real product UI + social proof.** *(H8)*
11. **Fix dark-mode primary-button contrast + add dark status/accent variants.** *(medium a11y)*
12. **Resolve Applications-vs-Jobs-vs-Tracker terminology → one noun.** *(H4)*
13. **ATS as the conversion moment** — badge on resume cards + version deltas + Free teaser.
14. **Simplify login + slim auth chrome; fix the Account page dev-copy + delete.** *(H7)*
15. **Progressive-disclosure editor sidebar + route loading/error states.**

---

## 10. Phased Roadmap (~10 weeks; phases overlap)

**Phase 0 — Foundation & Trust (Wk 1–2).** *Lowest visual risk, highest payoff, unblocks the re-theme.*
Channel-based brand tokens + fill `--color-primary-300` + CI grep guard · fix `--color-muted` + dark status/accent variants + dark primary fill · kill fake autosave · begin token→Tailwind codemod.

**Phase 1 — Component foundation (Wk 2–4).** *Everything rides on this.*
Add Radix/react-aria + CVA + `ui/index.ts` · rebuild `Button` (polymorphic) + `Modal → Dialog` (focus trap) · add `DropdownMenu`/`Popover`/`Drawer`/`EmptyState`/`Avatar`/`Alert`/`Spinner`/`IconButton`/`Chip`/`DataTable` · migrate hand-rolled overlays.

**Phase 2 — Shell & IA (Wk 3–5, overlaps P1).**
Finalize two-tier nav (Create/Applications/Documents/Templates/Settings) · reconnect application-detail + AI tools · delete orphaned boards/editors/dead code · one status taxonomy · fix onboarding · Settings tabs + strip dev copy · 301 aliases.

**Phase 3 — Core CV editor + tailor (Wk 5–8).** *The spine.*
Collapse 3 editors → 1 · unify `/cv/tailor` (resumable, real template/accent) · progressive-disclosure sidebar · consistent `ATSBadge` + version deltas · route loading/error states.

**Phase 4 — Secondary flows (Wk 7–9).**
Unify the 2 cover-letter stacks → one path + editor · rationalize creation entry points · separate letter-context from the linked job.

**Phase 5 — Marketing & conversion (Wk 8–10).**
Terms/Privacy + footer · link Pricing · hero rebuild with real product UI + social proof · ATS-as-teaser + upgrade prompts at limit points · login simplification + slim auth chrome + Account fixes.

**Apply the new brand color** at the end of Phase 0 (it's a 3-number change once tokens are channel-based) — or ship the whole re-theme as a visible "before/after" milestone at the end of Phase 2 once the component foundation lands.

---

## 11. Risk & Sequencing Notes
- **Do Phase 0 first, always** — it's low-visual-risk and everything else (especially the re-theme) depends on it.
- **Don't rebrand on top of the current 30-literal token system** — you'll bake a *second* color in just as hard. Fix the architecture, then flip the hue.
- **Treat the JSONB CV data model + privacy-first job storage as immovable.** The stale `product-specification.md` describes a different model — **the implementation is canonical**; reconcile the doc before anyone builds from it.
- **Codemod the `[var(--…)]` classes incrementally** behind the Tailwind token exposure — it's mechanical and safe, but large (1,578 sites); script it.

---

## 12. Decisions

**LOCKED (2026-08-31):**
1. ✅ **Brand color = Direction A "Ink & Azure"** — azure `#2563EB` + cyan `#06B6D4` AI accent. (§3.2A is now canonical; B/C/D retained as reference only.)
2. ✅ **Scope = Full restructure** — the complete ~10-week program (§10).
3. ✅ **Audience-first = Active Job Seeker** — dense, fast, keyboard-friendly; keep the compact 14 px SaaS density. Reserve breathing room for onboarding/empty-states/AI moments only.

**Still open (product calls — recommendations given, not blocking foundation work):**
4. **Tracker gating** — keep the tracker Pro+-locked (current), or give Free users a **limited pipeline** as the habit-forming upgrade hook? (Today the Free dashboard even renders a tracker chart users can't use.) *Recommend: limited free pipeline as the hook.*
5. **"New Application" semantics** — should the primary CTA **create a tracked application first** (then optionally generate docs), or is it fundamentally "generate tailored CV + cover letter" (rename to match)? *Recommend: create the application first, then offer "generate documents."*

---

*Appendix: full per-subsystem audit findings (design tokens, component library, core CV, secondary flows, app shell, product vision) are available on request — this plan is the synthesis.*
