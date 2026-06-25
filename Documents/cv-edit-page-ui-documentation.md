# CV Edit Page — UI & Functional Documentation

> **Purpose:** This document describes how the CareerPulse CV editor works today — visually, structurally, and functionally. It is written for LLM agents that will redesign or improve the UX while preserving existing behavior and design-system conventions.
>
> **Scope:** Core CV editor (`/cv/edit`) and Job-tailored CV editor (`/cv/edit/[id]?tailored=true`, legacy redirect from `/cv/job-specific/[id]/edit`).

---

## 1. Executive Summary

Both editors share **one unified shell** introduced in a 2026 refactor:

| Aspect | Pattern |
|--------|---------|
| Layout | 3-column grid on `xl` screens: **Sidebar → Form canvas → Live preview** |
| Navigation | Left sidebar (not horizontal tabs) drives which form section is visible |
| ATS | Moved out of the main flow into a **right slide-over drawer** |
| Focus modes | Top bar toggles: **Default (3-col) / Editor-only / Preview-only** |
| Styling | CSS design tokens (`var(--color-*)`), `glass-panel` surfaces, `font-display` headings |
| Form | Single shared `CVFormFields` component (~1,766 lines) for all sections |
| Preview | Debounced HTML iframe with zoom + multi-page controls |

**Core CV** = personal master resume. **Job-tailored CV** = same form + job context chrome (keywords popover, track job, diff viewer, core CV sync, optimise-draft flow).

---

## 2. Routes & Entry Points

### 2.1 Active routes

| URL | Component | Mode |
|-----|-----------|------|
| `/cv/edit` | `UnifiedCVEditor` → `CVEditor` | Core CV (new/guest/draft) |
| `/cv/edit/[id]` | `UnifiedCVEditor` → `CVEditor` | Core CV (saved) |
| `/cv/edit/[id]?tailored=true` | `UnifiedCVEditor` → `JobTailoredCVEditor` | Job CV |
| `/cv/edit/draft?tailored=true` | `JobTailoredCVEditor` | Optimise handoff (unsaved draft) |
| `/cv/job-specific/[id]/edit` | Redirect → `/cv/edit/[id]?tailored=true` | Legacy bookmark support |
| `/cv/builder` | Redirect → `/cv/edit?guest=true` | Guest builder alias |

### 2.2 Mode detection (`UnifiedCVEditor.tsx`)

```ts
tailored = forceTailored
  || searchParams.get('tailored') === 'true'
  || searchParams.has('job');
```

### 2.3 Auth & chrome

| Context | Layout chrome |
|---------|---------------|
| Guest on `/cv/edit` (no UUID) | `GuestCvChrome` — marketing header, mesh background, sign-up CTA |
| Authenticated or `/cv/edit/[uuid]` | Dashboard `AuthGuard` layout (app sidebar) |
| Guest banner inside editor | Amber-bordered strip: "Sign up free to save" |

**Key files:**
- `app/(dashboard)/cv/edit/page.tsx`
- `app/(dashboard)/cv/edit/[id]/page.tsx`
- `app/(dashboard)/cv/job-specific/[id]/edit/page.tsx` (redirect only)
- `components/cv/UnifiedCVEditor.tsx`
- `components/cv/CVEditor.tsx` (core)
- `components/cv/JobTailoredCVEditor.tsx` (job)

---

## 3. Visual Page Architecture

### 3.1 Desktop layout (focus mode = `default`, xl breakpoint)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CVEditorTopBar (sticky, z-40, glass/blur, min-h 56px)                       │
│  [← Back] Title + badge │ [center slot - job only] │ ATS │ Keywords │ Focus  │
│                         │                          │ Undo/Redo │ Export │ Save │
├──────────────┬───────────────────────────────────────┬─────────────────────────┤
│  Sidebar     │  CV_EDITOR_CANVAS (center column)     │  PreviewPanel           │
│  ~24% width  │  ~flex-1                              │  ~45% width             │
│  glass-panel │  rounded-2xl, shadow-card             │  glass-panel            │
│  sticky      │  contains CVEditorPanel → CVFormFields  │  sticky, primary accent │
│  top: 72px   │                                       │  left border (3px)      │
│              │                                       │  zoom 70–140%           │
│  Design      │  [one section at a time]              │  A4 iframe preview      │
│  Content     │                                       │  page prev/next         │
│  Optional    │                                       │                         │
└──────────────┴───────────────────────────────────────┴─────────────────────────┘
```

**Grid CSS (both editors):**
```txt
xl:grid-cols-[minmax(220px,0.24fr)_minmax(0,1fr)_minmax(390px,0.45fr)]
```

**Page wrapper:**
```txt
cv-editor-text-tune mx-auto max-w-[1800px] pb-8
```
(Job editor adds `pb-24 md:pb-8` for mobile bottom bar clearance.)

### 3.2 Focus modes

| Mode | Icon | Grid | Sidebar | Form | Preview |
|------|------|------|---------|------|---------|
| `default` | LayoutGrid | 3 columns | ✓ | ✓ | ✓ |
| `editor` | Maximize2 | 1 column | ✗ | ✓ full width | ✗ |
| `preview` | Eye | 1 column | ✗ | ✗ | ✓ full width |

Toggle lives in a segmented control group in the top bar (3 icon buttons in a bordered pill).

### 3.3 Mobile / tablet behavior

| Element | Behavior |
|---------|----------|
| Grid | Stacks to single column below `xl` |
| Sidebar | Full width, not sticky on small screens |
| Top bar actions | Labels hidden on small screens (`hidden sm:inline`, `hidden lg:inline`) |
| Job editor | Fixed bottom bar (`md:hidden`): Track Job + Save |
| Keyword popover | Fixed `top: calc(64px + safe-area)`, `width: min(100vw - 2rem, 420px)` |
| ATS drawer | Full-height slide-over, `max-w-[380px]` |

---

## 4. Design System (UI Tokens & Conventions)

### 4.1 Color & surface rules

**Never hardcode theme colors in layout shells.** Use CSS variables from `app/globals.css`:

| Token | Usage |
|-------|-------|
| `--color-text-primary` | Headings, body |
| `--color-text-secondary` | Subtitles, nav inactive |
| `--color-muted` | Hints, placeholders, meta |
| `--color-surface` | Cards, panels |
| `--color-border` | Borders, dividers |
| `--color-primary-100`–`500` | Active nav, focus, accents |
| `--color-accent-mint` | ATS score ≥80, AI sparkle, keyword highlights |
| `--color-accent-gold` | ATS 50–79, keyword chips, upgrade warnings |
| `--color-accent-coral` | Delete button (job editor) |
| `--color-control-bg` | Icon buttons, zoom controls |
| `--color-preview-well` | Preview iframe well background |
| `--shadow-card` | Editor canvas, preview panel |

**Exceptions (intentional hardcoded):**
- Accent color swatches in Design tab: `SWATCHES` array (`#6C63FF`, `#00D4A8`, etc.)
- Amber "Draft" / "Unsaved draft" badges
- Diff viewer red/green change highlights
- ATS score pill below 50: `red-400/600` tones

### 4.2 Typography

| Class | Use |
|-------|-----|
| `font-display` | Page title, section headings, diff section titles (Clash Display) |
| `text-xs font-semibold uppercase tracking-wider` | Group labels (sidebar, design subsections) |
| `text-[10px] font-bold uppercase tracking-widest` | Sidebar collapsible group headers |
| `font-mono text-xs` | ATS scores, zoom %, page numbers |
| `text-sm` | Default form labels and body |

### 4.3 Shared editor style constants (`lib/cv-editor-styles.ts`)

| Export | Visual |
|--------|--------|
| `CV_EDITOR_CANVAS` | `rounded-2xl border bg-surface p-4 sm:p-6 shadow-card backdrop-blur` — main form wrapper |
| `CV_FORM_CARD` | `rounded-card border bg-surface/90 p-4 sm:p-5 shadow-sm` — inner section cards |
| `CV_INPUT` / `CV_TEXTAREA` | Rounded inputs with primary focus ring |
| `CV_SECTION_H2` | `font-display text-lg font-semibold` |
| `CV_NESTED_CARD` | Nested list item cards (experience entries, etc.) |

### 4.4 Surface patterns

| Pattern | Class | Where |
|---------|-------|-------|
| Glass panel | `.glass-panel` | Sidebar, PreviewPanel, collapsed preview bar |
| Text contrast boost | `.cv-editor-text-tune` on root | Darkens secondary/muted text inside editor only |
| Active sidebar row | `cv-sidebar-row-active` + primary ring/bg | Selected section |
| Segmented control | Bordered container + active `bg-hover-surface-strong shadow-sm` | Focus mode, zoom area |

### 4.5 UI primitives used

From `components/ui/`:
- `Button` — variants: `primary`, `secondary`, `ghost`; sizes `sm`; `loading` prop
- `Input`, `Textarea`, `Select`
- `Tabs` — used for CV/Cover Letter switcher (job) and legacy horizontal tabs (hidden in shell)
- `Modal` — Track job, CV diff
- `Progress` — ATS drawer
- `Badge` — Job analysis work type

Icons: **Lucide React** throughout.

Motion: **Framer Motion** for `ATSDrawer` and `KeywordPopover`.

---

## 5. Component-by-Component UI Spec

### 5.1 `CVEditorTopBar` (`components/cv/premium/CVEditorTopBar.tsx`)

**Role:** Sticky global command bar for both editors.

**Structure:**
1. **Left:** 36×36 back button (bordered square) + title (`font-display text-base sm:text-lg`) + optional subtitle + badge
2. **Center (job only):** Core CV `Select` + "Update core CV" button
3. **Right (wraps on narrow screens):**
   - ATS score pill (rounded-full, color-coded by score)
   - Keywords button (job only, `Tags` icon)
   - Focus mode segmented control (3 icons)
   - `trailingControls` slot (job: Track, Diff, Delete)
   - Undo / Redo (icon-only on mobile)
   - Export PDF (secondary)
   - Save (primary)
   - Status line (`text-[11px]`)

**ATS pill colors:**
- ≥80: mint border/bg/text
- 50–79: gold
- <50: red

**Optional `bottomRow`:** Bordered sub-row — CV / Cover Letter tabs when `generationType === 'both'`.

### 5.2 `Sidebar` (`components/cv/premium/Sidebar.tsx`)

**Role:** Section navigation + per-section PDF visibility toggles.

**Visual:**
- `glass-panel rounded-2xl p-3`
- Sticky on xl: `top-[72px]`, `max-h-[calc(100vh-5.5rem)]`, scrollable

**Groups (collapsible):**

| Group | Items |
|-------|-------|
| Design & layout | Design settings (`Palette` icon) |
| Content | Photo, Header, Address, Summary, Experience, Education, Skills |
| Optional sections | Projects, Publications, Research, Languages, Certifications, References, Awards, Volunteer, Interests, Custom |

**Nav row anatomy:**
```
[ Icon + Label (flex-1, border-l-2 when active) ] [ Visibility switch ]
```

**Active state:** `bg-primary-100/80 ring-1 ring-primary-200`, left border `primary-400`, text `primary-400`.

**Visibility switch:** 36×20px pill toggle; disabled (opacity 45%) until section has content; label dims to 55% opacity when hidden.

**Footer hint:** `text-[10px] text-muted` — "Toggle off to hide from PDF and preview. Your data stays in the editor."

### 5.3 `CVEditorPanel` + `CVFormFields`

**Panel role:** Thin adapter — maps `CVData` ↔ form slices, optionally shows inline ATS/keyword banners (hidden in current shell).

**Shell configuration (both editors):**
```ts
hideAtsBanner: true
hideFormTabBar: true      // sidebar replaces horizontal tabs
hideVisibilityPanel: true // sidebar handles visibility
hideKeywordsBanner: true // job: keywords in popover instead
```

**Form shows ONE tab/section at a time** based on `activeTab` from parent.

#### Section list (18 tabs)

| Tab ID | Label | UI pattern |
|--------|-------|------------|
| `design` | Layout & Design | Hero card + template grid + accent swatches + font select |
| `photo` | Photo | `CVPhotoField` upload |
| `header` | Header | 2-col grid of `Input` fields + additional links list |
| `address` | Address | `Textarea` + AI polish |
| `summary` | Summary | `Textarea` max 2000 + AI polish + keyword highlight preview |
| `experience` | Experience | Repeatable `FORM_CARD` per role |
| `education` | Education | Repeatable cards, degree `Select` |
| `skills` | Skills | `SkillsEditor` — categories, tags, optional 1–5 ratings |
| `projects` | Projects | Repeatable cards |
| `publications` | Publications | `PublicationsSection` |
| `research` | Research | `ResearchSection` |
| `languages` | Languages | Repeatable cards + proficiency `Select` |
| `certifications` | Certifications | Repeatable cards |
| `references` | References | Max 2 entries |
| `awards` | Awards | Repeatable cards |
| `volunteer` | Volunteering | `VolunteerSection` |
| `interests` | Interests | Free text |
| `custom` | Custom sections | `CustomSectionsForm` |

#### Recurring form UI patterns

**1. Section-level ATS hint** (when `atsBySection` populated):
- Purple tinted card above section content
- Score badge + up to 3 bullet suggestions

**2. List sections (experience, education, etc.):**
```
┌─ FORM_CARD ─────────────────────────────────────┐
│ Position N          [↑ ↓ reorder arrows]        │
│ ─────────────────────────────────────────────   │
│ [2-col responsive grid of Inputs]               │
│ [checkbox: Currently working here]              │
│ [Textarea: description]                         │
│ [bullets list with add/remove/reorder]          │
│ [CvAtsPolishButton — bottom right]              │
│ [Remove position]                               │
└─────────────────────────────────────────────────┘
[+ Add experience]  (secondary Button, full width feel)
```

**3. AI polish button (`CvAtsPolishButton`):**
- Secondary button, purple-tinted background
- `Sparkles` icon in mint
- Label: "Rewrite With AI"
- Opens `CVRewriteWithAIModal`

**4. Keyword highlighting (job mode):**
- `HighlightedText` wraps matches in `<mark>` with `bg-accent-mint/15`
- Summary shows gold-bordered "Preview with highlights" box

**5. Design tab template picker:**
- `grid-cols-2 sm:grid-cols-3`
- Cards: `aspect-[3/4]`, thumbnail with hover scale
- Selected: `border-primary-400 shadow-lg`
- Locked templates: `opacity-60` + "Upgrade" badge
- Gradient overlay at bottom with template name

**6. Reorder controls (`ListReorderArrows`):**
- Up/down arrows in card header for list items

### 5.4 `PreviewPanel` (`components/cv/premium/PreviewPanel.tsx`)

**Role:** Live HTML preview of CV as user types.

**Visual identity:**
- `glass-panel`, `rounded-2xl`
- **Left accent stripe:** `border-l-[3px] border-l-primary-400`
- Height: `h-[calc(100vh-4.5rem)]` when expanded
- Sticky: `xl:top-[72px]`

**Header row:**
- "Live preview" label
- Collapse button (chevron up)
- Zoom controls: `-` / `NN%` / `+` (70–140%, step 10)

**Preview well:**
- `bg-preview-well rounded-xl border shadow-inner p-3`
- Loading overlay: spinner + "Updating preview…"
- `DocumentPrintPreviewFrame` iframe

**Footer:**
- Previous / Next page buttons
- `Page N / M` counter
- Helper text for long CVs

**Collapsed state:** 48px-tall bar with "Expand" button.

### 5.5 `ATSDrawer` (`components/cv/premium/ATSDrawer.tsx`)

**Role:** Right slide-over ATS report (replaces old inline ATS banner).

**Behavior:**
- Fixed right panel, spring animation (`x: 100% → 0`)
- Backdrop: `bg-black/40 backdrop-blur-[2px]`
- Width: `max-w-[380px]`, full height
- Escape to close, body scroll locked

**Content:**
- Header: "ATS insights"
- Circular/large score display
- Summary text
- `Progress` bar
- Global suggestions list
- Collapsible per-section breakdown

**Trigger:** ATS pill in top bar.

### 5.6 Job-only UI additions

#### `KeywordPopover` (`components/cv/premium/KeywordPopover.tsx`)

- Fixed dropdown from top-right (not full drawer)
- Contains `JobKeywordsBanner` (keyword presence in CV)
- Expandable job description section
- Closes on outside click or Escape

#### Job analysis accordion (optimise draft only)

- Collapsed: `📍 Region · WorkType · Match: NN%`
- Expanded: job title, requirements list, "good fit" (green), "gaps" (amber + warning icon)

#### Cover letter tab

When `generationType === 'both'`:
- Top bar `bottomRow` has CV / Cover Letter tabs
- Cover letter view: single `CV_EDITOR_CANVAS` with large `Textarea` (`min-h-[420px]`)
- Hides 3-column grid and keyword/ATS controls

#### Track Job modal

- `max-w-3xl`
- Grid of status cards (`grid-cols-1 sm:grid-cols-3`)
- Each card: emoji + label, colored border when selected (`JOB_STATUS_CONFIG`)
- Cancel + Save footer

#### CV Diff modal

- `max-w-4xl`, scrollable
- Per-section: uppercase `font-display` heading
- Changes: left border color — red (removed), green (added), transparent (unchanged)
- Labels: "Prev" / "New" / "·"

#### Mobile bottom bar (job only)

```txt
fixed bottom-0 inset-x-0 z-30 border-t bg-surface/95 backdrop-blur
[Track Job pill]                    [Save primary button]
```

---

## 6. Core CV vs Job-Tailored CV — UI Comparison

| UI element | Core CV (`CVEditor`) | Job CV (`JobTailoredCVEditor`) |
|------------|---------------------|--------------------------------|
| Top bar title | "Core CV" | "Job-tailored CV" |
| Subtitle | User's name or "Add your name in Header" | `{company} · {jobTitle}` |
| Badge | "Draft" when dirty | "Unsaved draft" (optimise draft, not persisted) |
| Back link | `/cv` (or `/` for guest) | `/cv/job-specific` or `/cv/optimise` (draft) |
| Center slot | — | Core CV picker + "Update core CV" |
| Keywords button | Hidden | Visible with count |
| Track / Diff / Delete | Hidden | Visible (Delete hidden in draft mode) |
| ATS scoring | CV content only | CV content + job keywords |
| Keyword highlights in form | No | Yes (`highlightedKeywords`) |
| AI context | Generic | Job title, company, JD, keywords injected |
| Guest banner | Yes (guest mode) | No (job routes require auth) |
| Job analysis panel | No | Yes (optimise draft) |
| Cover letter tab | No | Yes when `generationType === 'both'` |
| Mobile bottom bar | No | Yes |
| Saving overlay | No full-page overlay | White/75 overlay + spinner on save |
| Premium template warning | `FeatureGate` under preview | Gold-bordered text under preview |

**Shared:** Sidebar, form fields, preview panel, focus modes, undo/redo, ATS drawer, design tokens, grid proportions.

---

## 7. Functional Behavior (for UX context)

### 7.1 State management

| Concern | Core CV | Job CV |
|---------|---------|--------|
| Primary hook | `useCVEditor` | Local `useState` + `useJobSpecificCV` |
| Guest draft | `useGuestCvStore` + `sessionStorage` | N/A |
| Optimise draft | — | `useOptimiseEditDraftStore` |
| Templates | React Query `['cv-templates']` | Same |
| Undo/redo | 50-step burst history (550ms debounce) | Same pattern |
| Dirty tracking | Serialized snapshot compare | Same |
| Preview | Debounced POST `/api/cv/preview-html` (~500ms) | Same |

### 7.2 Key user flows

**Core — new CV:**
Dashboard → `/cv/edit?new=1` → edit → Save → `POST /api/cvs` → redirect `/cv/edit/[id]`

**Core — guest:**
`/cv/builder` → edit in memory → sign up → auto-sync

**Job — saved:**
`/cv/job-specific/[id]/edit` → redirect → load → edit → `PATCH /api/cvs/[id]`

**Job — optimise draft:**
Optimise result → Zustand draft → `/cv/edit/draft?tailored=true` → first Save creates job + CV

### 7.3 Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+Z | Undo |
| ⌘/Ctrl+Shift+Z | Redo |
| Escape | Close ATS drawer / keyword popover |

### 7.4 Auth gates

- Save, Export PDF, AI rewrite require auth (guest sees `NeedLoginModal`)
- Export also gated by subscription tier for premium templates

---

## 8. Responsive Breakpoint Map

| Breakpoint | Layout changes |
|------------|----------------|
| `< md` | Job mobile bottom bar visible; many top bar labels hidden |
| `< xl` | 3-column grid collapses to vertical stack: Sidebar → Form → Preview |
| `xl+` | Full 3-column shell, sticky sidebar + preview |
| `sm+` | Some top bar text labels appear |
| `lg+` | Undo/Redo text labels; Delete button on job editor |

---

## 9. Component File Map (for LLM navigation)

```
app/(dashboard)/cv/edit/
├── page.tsx                          # Core entry (no id)
└── [id]/page.tsx                     # Core or job (via ?tailored=true)

components/cv/
├── UnifiedCVEditor.tsx               # Mode router
├── CVEditor.tsx                      # Core shell orchestrator
├── JobTailoredCVEditor.tsx           # Job shell orchestrator
├── CVEditorPanel.tsx                 # Form adapter
├── CVFormFields.tsx                  # All section UIs (main file to edit form UX)
├── CVPhotoField.tsx
├── SkillsEditor.tsx
├── ExtendedCvSections.tsx
├── CvAtsPolishButton.tsx
├── CVRewriteWithAIModal.tsx
├── ListReorderArrows.tsx
├── TemplateThumbnail.tsx
├── GuestCvChrome.tsx
└── premium/
    ├── CVEditorTopBar.tsx            # Top command bar
    ├── Sidebar.tsx                   # Left navigation
    ├── PreviewPanel.tsx              # Right preview
    ├── ATSDrawer.tsx
    ├── KeywordPopover.tsx
    └── JobKeywordsBanner.tsx

lib/
├── cv-editor-styles.ts               # Shared Tailwind class strings
├── cv-form-slices.ts                 # Data ↔ form mapping
├── cv-ats.ts                         # ATS scoring
└── cv-diff.ts                        # Job diff computation

app/globals.css                       # Design tokens + .cv-editor-text-tune + .glass-panel
```

---

## 10. Current UX Characteristics (baseline for redesign)

### Strengths to preserve
- Clear separation: navigate (left) → edit (center) → preview (right)
- Focus modes reduce clutter for power users
- ATS moved to drawer keeps form area clean
- Live preview with zoom is high value
- Job keywords accessible without blocking form
- Design tokens enable dark mode consistency

### Known friction / improvement opportunities
*(For LLM redesign agents — not bugs, observed patterns)*

1. **Information density:** `CVFormFields.tsx` is very long; list sections (experience, education) use similar but slightly inconsistent card layouts.
2. **Mobile:** Core editor has no fixed Save bar; job editor does — inconsistent mobile affordances.
3. **Section discovery:** 18 sections in sidebar can feel long; optional sections group helps but no search/filter.
4. **Design tab in sidebar vs content:** "Design settings" is separate from content nav — good, but switching between design and content requires sidebar scroll on short viewports.
5. **Horizontal tabs still exist** in code (`hideTabBar`) but are hidden — any redesign should not reintroduce duplicate navigation.
6. **AI actions:** "Rewrite With AI" per field — no global AI panel; scattered buttons at section bottoms.
7. **Status feedback:** Save state is small text in top bar; job save uses full overlay spinner (heavy).
8. **Preview column:** ~45% width on xl may dominate on smaller laptops; collapse helps but is not default.
9. **Guest vs auth:** Two different chrome experiences (marketing header vs dashboard) — intentional but visually disjointed.
10. **Accessibility:** Visibility switches are custom (not native checkbox); focus rings exist on some controls only.

---

## 11. LLM Redesign Guidelines

When updating this page, follow these constraints:

1. **Use CSS variables** — `var(--color-*)`, not raw hex, except accent swatches and semantic diff colors.
2. **Reuse `lib/cv-editor-styles.ts`** constants for form surfaces.
3. **Keep single form component** — extend `CVFormFields` or extract sub-components; do not duplicate section forms for job mode.
4. **Sidebar remains source of truth** for `activeTab` / `editorTab` — do not add a second tab bar unless replacing sidebar entirely.
5. **Preserve focus modes** or replace with an equally clear equivalent.
6. **Job-specific UI** belongs in `JobTailoredCVEditor` top bar / modals — not inside individual form fields.
7. **Preview debouncing** and undo burst logic are behavioral — changing them affects performance and UX feel.
8. **File size:** keep new components under ~300 lines; split `CVFormFields` by section if refactoring.
9. **Breakpoints:** test at `< xl` (stacked) and `xl+` (3-column).
10. **Both editors must stay visually consistent** — same grid, tokens, and component library.

---

## 12. Quick Reference — CSS Classes Cheat Sheet

```txt
Page root:        cv-editor-text-tune mx-auto max-w-[1800px]
Form wrapper:     CV_EDITOR_CANVAS (from lib/cv-editor-styles)
Section card:     CV_FORM_CARD
Glass surfaces:   glass-panel
Sticky top bar:   sticky top-0 z-40 backdrop-blur-xl border-b
3-col grid:       xl:grid-cols-[minmax(220px,0.24fr)_minmax(0,1fr)_minmax(390px,0.45fr)]
Sidebar sticky:   xl:sticky xl:top-[72px] xl:max-h-[calc(100vh-5.5rem)]
Preview sticky:   xl:top-[72px] h-[calc(100vh-4.5rem)]
Active nav:       border-l-2 border-primary-400 text-primary-400 bg-primary-100/80
Primary CTA:      Button variant="primary" size="sm" h-9
Secondary CTA:    Button variant="secondary" size="sm" h-9
```

---

*Last documented: June 2026 — reflects post-refactor unified 3-column shell.*
