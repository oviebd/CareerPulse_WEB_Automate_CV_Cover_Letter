# CV Template Technical Documentation

> Reference for adding new CV templates to CareerPulse. Covers the full rendering pipeline, data model, CSS conventions, and step-by-step checklists for both standard and premium templates.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Template Registry](#3-template-registry-srcconfigtemplateconfigts)
4. [Rendering Engine](#4-rendering-engine)
5. [CV Data Model](#5-cv-data-model-window__cv_data__)
6. [CSS System](#6-css-system)
7. [Section Renderer Functions](#7-section-renderer-functions-sectionjs)
8. [Standard vs Premium Templates](#8-standard-vs-premium-templates)
9. [Adding a New Standard Template](#9-adding-a-new-standard-template)
10. [Adding a New Premium Template](#10-adding-a-new-premium-template)
11. [Key File Reference](#11-key-file-reference)

---

## 1. Architecture Overview

There are two rendering paths — both use the **same HTML generation function** (`renderUnifiedHtml`):

### Live Preview (iframe)

```
User edits CV / selects template
        ↓
CVEditor.tsx → refreshPreview()
        ↓
POST /api/cv/preview-html  { template_id, accent_color, cv }
        ↓
Server: renderUnifiedHtml(cvData)
  → reads src/templates/{id}/index.html
  → inlines base.css + style.css
  → injects window.__CV_DATA__ JSON
  → injects window.__TEMPLATE_CONFIG__ JSON
  → injects sections.js IIFE
        ↓
Response: complete standalone HTML string
        ↓
CVEditor creates Blob URL → sets iframe.src
        ↓
Browser executes sections.js inside iframe
        ↓
sections.js fills #cv-root with template HTML
```

### PDF Export (Puppeteer)

```
POST /api/export  { type: 'cv', template_id, ... }
        ↓
generateCVPdf(cvData)
        ↓
renderUnifiedHtml(cvData)  ← same function as above
        ↓
Puppeteer: page.setContent(html) → page.pdf()
        ↓
Returns PDF buffer → client downloads as cv-{name}-{id}.pdf
```

### PNG Preview (Puppeteer)

Used for share cards and thumbnails:
```
POST /api/cv/preview-png
        ↓
generateCVPreview(cvData)
        ↓
renderUnifiedHtml(cvData) → Puppeteer screenshot (794×1123 viewport)
        ↓
Returns base64 PNG string
```

---

## 2. Directory Structure

```
src/templates/
├── shared/
│   ├── base.css        ← Foundation styles shared by ALL templates
│   └── sections.js     ← Universal renderer IIFE (1415 lines)
├── classic/
│   ├── index.html      ← Template HTML skeleton (identical across all templates)
│   └── style.css       ← Template-specific overrides
├── modern/
│   ├── index.html
│   └── style.css
├── academic/
├── technical/
├── minimal/
├── creative/
├── entry-level/
├── healthcare/
├── amber-strike/       ← Premium
├── midnight-pro/       ← Premium
├── golden-hour/        ← Premium
├── ocean-slate/        ← Premium
└── violet-edge/        ← Premium

src/config/
└── templateConfig.ts   ← Template registry (TemplateConfig interface + TEMPLATE_CONFIGS)

src/services/
└── pdfRenderer.ts      ← renderUnifiedHtml() + Puppeteer wrappers
```

Every template contains **exactly two files**: `index.html` and `style.css`.

---

## 3. Template Registry (`src/config/templateConfig.ts`)

### `TemplateConfig` Interface

```typescript
export interface TemplateConfig {
  id: TemplateId;
  label: string;
  description: string;
  targetUsers: string;
  templateAccent?: string;        // Premium only: baked-in brand color for swatch
  layout: 'single-column' | 'two-column';
  sidebarSections?: string[];     // Two-column only: which sections go in the sidebar
  sectionOrder: string[];         // Canonical order of ALL sections for this template
  educationFirst: boolean;        // Put education above experience
  showSkillBars: boolean;         // Render visual rating bars in skills section
  showsSkillRatingInCv: boolean;  // Show skill level label (Beginner → Professional)
  showPhoto: boolean;             // Support profile photo
  hideIfEmpty: string[];          // Auto-hide these sections when they have no content
  requiredSections: string[];     // Minimum sections (informational, used by completion check)
}
```

### Field Effects on Rendering

| Field | Effect in sections.js |
|---|---|
| `layout` | Routes to single-column loop vs `<div class="cv-two-col">` wrapper |
| `sidebarSections` | Sections in this array render inside `<aside class="cv-sidebar">` |
| `sectionOrder` | Merged with user's saved order via `mergeSectionOrderWithCatalog()` |
| `showSkillBars` | Passed as `cfg` to `sectionSkillsMain()` → renders `skill-bar` HTML |
| `showsSkillRatingInCv` | Passed as `cfg` → appends skill level label after each skill name |
| `showPhoto` | Controls whether photo/initials avatar renders in `sectionPersonal()` |
| `hideIfEmpty` | `hideKey(key, cfg, d)` returns true → section is skipped |
| `educationFirst` | No direct rendering effect; used by editor UI to reorder sections on template switch |

### All Valid Section Keys (`CV_TEMPLATE_SECTION_KEYS_ALL`)

```
personal, summary, experience, projects, education, skills,
publications, research, certifications, awards, volunteer,
languages, interests, references, custom
```

Every template's `sectionOrder` must include all 15 keys exactly once.

### Template Catalog

| ID | Label | Layout | Photo | Skill Bars | Tier |
|---|---|---|---|---|---|
| `classic` | Classic | single-column | No | No | Free |
| `minimal` | Minimal | single-column | No | No | Free |
| `entry-level` | Entry Level | single-column | No | Yes | Free |
| `healthcare` | Healthcare | single-column | No | No | Free |
| `modern` | Modern | two-column | Yes | Yes | Pro |
| `academic` | Academic | single-column | No | No | Pro |
| `technical` | Technical | two-column | No | Yes | Pro |
| `creative` | Creative | two-column | Yes | Yes | Pro |
| `amber-strike` | Amber Strike | two-column | Yes | Yes | Premium |
| `midnight-pro` | Midnight Pro | two-column | Yes | No | Premium |
| `golden-hour` | Golden Hour | two-column | Yes | Yes | Premium |
| `ocean-slate` | Ocean Slate | two-column | Yes | No | Premium |
| `violet-edge` | Violet Edge | two-column | Yes | No | Premium |

### Adding a New ID

Add to **both** arrays at the bottom of `templateConfig.ts`:

```typescript
export const ALL_TEMPLATE_IDS: TemplateId[] = [
  // ...existing...
  'my-new-template',
];

export const VISIBLE_TEMPLATE_IDS: TemplateId[] = [
  // ...existing...
  'my-new-template',
];
```

And add `'my-new-template'` to the `TemplateId` union type in `src/types/cv.types.ts`.

---

## 4. Rendering Engine

### `renderUnifiedHtml(cvData: CVData): string` (`src/services/pdfRenderer.ts:75`)

This is the single function that produces the complete HTML document. It is called for both preview and PDF export.

```typescript
export function renderUnifiedHtml(cvData: CVData): string {
  // 1. Apply section visibility toggles (zero out hidden sections)
  const data = applyCvSectionVisibility(cvData, cvData.sectionVisibility);

  // 2. Normalize template ID (handles legacy aliases)
  const tid = normalizeTemplateId(data.meta.templateId) as TemplateId;

  // 3. Read template files from disk
  let html = readUtf8(`src/templates/${tid}/index.html`);
  const styleCss = readUtf8(`src/templates/${tid}/style.css`);
  const baseCss  = readUtf8('src/templates/shared/base.css');
  const sectionsJs = readUtf8('src/templates/shared/sections.js');

  // 4. Resolve template config
  const cfg = TEMPLATE_CONFIGS[tid];

  // 5. Build and inject Google Fonts link
  const fontHref = `https://fonts.googleapis.com/css2?family=${fontParam}:wght@300;400;500;600;700&display=swap`;
  html = html.replace(/<link id="gf" href="[^"]*"/, `<link id="gf" href="${fontHref}"`);

  // 6. Inline all CSS (page rule + base.css + template style.css)
  const pageRule = `@page { size: ${pageSize}; margin: 14mm 16mm; }`;
  const inlineCss = `<style>\n${pageRule}\n${baseCss}\n${styleCss}\n</style>`;
  html = html.replace('</head>', `${inlineCss}\n</head>`);

  // 7. Inject CV data and renderer script before </body>
  const boot = `
<script>window.__CV_DATA__=${safeScriptJson(data)};</script>
<script>window.__TEMPLATE_CONFIG__=${safeScriptJson(cfg)};</script>
<script>\n${sectionsJs}\n</script>
`;
  html = html.replace('</body>', `${boot}\n</body>`);
  return html;
}
```

### `index.html` Template Skeleton (identical for all templates)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link id="gf" href="" rel="stylesheet" />  <!-- href replaced at render time -->
</head>
<body>
  <div id="cv-root"></div>  <!-- sections.js fills this -->
</body>
</html>
```

The renderer targets two injection points:
- `</head>` → receives the `<style>` block
- `</body>` → receives the three `<script>` tags

### `sections.js` Execution (`src/templates/shared/sections.js:1361`)

The entire file is an IIFE that calls `render()` immediately:

```javascript
(function () {
  // ... helper functions ...
  // ... section renderer functions ...

  function render() {
    var d   = window.__CV_DATA__;
    var cfg = window.__TEMPLATE_CONFIG__;
    var tpl = cfg.id;
    var root = document.getElementById('cv-root');
    if (!root || !d) return;

    // Apply body classes and CSS accent variable
    document.body.className = 'cv-page tpl-' + tpl;
    if (d.meta && d.meta.colorScheme && !isPremiumTpl(tpl)) {
      document.documentElement.style.setProperty('--cv-accent', d.meta.colorScheme);
    }

    // Merge user's saved section order with template's catalog order
    var order = mergeSectionOrderWithCatalog(d.meta.sectionOrder, cfg.sectionOrder);

    var html = '';

    // Route to correct layout builder
    if (isPremiumTpl(tpl)) {
      html += buildPremiumHtml(tpl, d, cfg, order);
    } else if (cfg.layout === 'two-column') {
      html += '<div class="cv-two-col">';
      html += '<aside class="cv-sidebar">';
      (cfg.sidebarSections || []).forEach(function (sk) {
        html += sidebarSlot(sk, d, cfg);
      });
      html += '</aside><main class="cv-main">';
      order.forEach(function (key) {
        if ((cfg.sidebarSections || []).indexOf(key) !== -1) return; // skip sidebar sections
        html += renderMainSection(key, d, cfg, tpl);
      });
      html += '</main></div>';
    } else {
      // Single-column: render all sections in order
      order.forEach(function (key) {
        html += renderMainSection(key, d, cfg, tpl);
      });
    }

    if (d.watermark) {
      html += '<div class="watermark">Created with CareerPulse</div>';
    }

    root.innerHTML = html;
  }

  render();
})();
```

Body class pattern: `cv-page tpl-{templateId}` (e.g., `cv-page tpl-classic`). CSS rules use `.tpl-classic` as the template scope.

---

## 5. CV Data Model (`window.__CV_DATA__`)

Full TypeScript interface from `src/types/cv.types.ts`:

```typescript
interface CVData {
  meta: {
    templateId: TemplateId;    // e.g. 'classic'
    colorScheme: string;       // hex accent color e.g. '#6C63FF'
    fontFamily: string;        // e.g. 'Inter'
    layout: 'single-column' | 'two-column';
    pageSize: 'A4' | 'Letter';
    showPhoto: boolean;
    sectionOrder: string[];    // user's saved section order
  };
  personal: {
    fullName: string;
    title: string;             // professional title / headline
    email: string;
    phone: string;
    location: string;
    photo?: string;            // base64 data URL or remote URL
    links: {
      linkedin?: string;
      github?: string;
      portfolio?: string;
      orcid?: string;
      googleScholar?: string;
      researchGate?: string;
      behance?: string;
      dribbble?: string;
      website?: string;
    };
  };
  postalAddress?: string;      // legacy mailing address field
  sectionVisibility?: Record<string, boolean | undefined>; // user toggle state
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: SkillCategory[];
  projects: Project[];
  publications: Publication[];
  research: Research[];
  certifications: Certification[];
  awards: Award[];
  volunteer: Volunteer[];
  languages: Language[];
  interests: string[];
  references: Reference[];
  custom: CustomSection[];
  watermark?: boolean;         // true on free tier
}
```

### Sub-types

```typescript
WorkExperience {
  id: string;
  company: string;
  role: string;
  type: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  location: string;
  remote: boolean;
  startDate: string;    // 'YYYY-MM'
  endDate: string;      // 'YYYY-MM'
  current: boolean;
  bullets: string[];
  technologies?: string[];
  highlights?: string;
}

Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa?: string;
  thesis?: string;
  advisor?: string;
  coursework?: string[];
  honors?: string[];
}

SkillCategory {
  id: string;
  category: string;           // e.g. 'Frontend', 'Languages'
  items: SkillItem[];
  displayOrder: number;
}

SkillItem {
  id: string;
  name: string;
  rating: 1 | 2 | 3 | 4 | 5; // 1=Beginner → 5=Professional
}

Project {
  id: string;
  name: string;
  role: string;
  description: string;
  bullets: string[];
  technologies: string[];
  links: { label: string; url: string }[];
  startDate?: string;
  endDate?: string;
  featured: boolean;
}

Publication {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  doi?: string;
  url?: string;
  type: 'journal' | 'conference' | 'book-chapter' | 'preprint' | 'thesis';
  status: 'published' | 'in-press' | 'under-review';
}

Research {
  id: string;
  title: string;
  institution: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  funding?: string;
}

Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
  expiry?: string;
}

Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

Volunteer {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

Language {
  name: string;
  proficiency: 'basic' | 'conversational' | 'professional' | 'native';
}

Reference {
  name: string;
  role: string;
  company: string;
  email?: string;
  phone?: string;
  relationship: string;
}

CustomSection {
  id: string;
  title: string;
  items: {
    heading: string;
    subheading?: string;
    date?: string;
    description?: string;
    bullets?: string[];
  }[];
}
```

### Skill Rating Scale

| Rating | Label | Bar Fill |
|---|---|---|
| 1 | Beginner | 20% |
| 2 | Basic | 40% |
| 3 | Intermediate | 60% |
| 4 | Advanced | 80% |
| 5 | Professional | 100% |

---

## 6. CSS System

### Layer Order (applied in this order inside the final `<style>` block)

1. `@page { size: A4/Letter; margin: 14mm 16mm; }` — page setup
2. `src/templates/shared/base.css` — shared foundation
3. `src/templates/{id}/style.css` — template-specific overrides

### `base.css` — What It Provides

| Class / Rule | Description |
|---|---|
| `.cv-page` | Root font size (10pt), line-height (1.45), color |
| `.cv-section` | Bottom margin (12pt) between sections |
| `.cv-section-title` | Uppercase heading (11pt, 600 weight, bottom border) |
| `.cv-card` | `page-break-inside: avoid` wrapper for each entry |
| `.cv-tech-chip` | Technology tag pill (light gray background) |
| `.cv-tech-row` | Flex container for tech chips |
| `.cv-photo--initial` | Fallback avatar when no photo (uses `--cv-accent`) |
| `.watermark` | Fixed bottom-right watermark for free tier |
| `.skill-group--compact` | Single-line skill category (used by single-column templates) |
| `.skill-group--compact .skill-cat` | Category label (9pt, 600 weight) |
| `.skill-group--compact .skill-inline` | Comma-separated skill names inline |
| `.cv-two-col` | Grid container for two-column layouts |
| `.cv-sidebar` | Sidebar column (`align-self: stretch`) |
| `.cv-main` | Main column (`min-width: 0`) |
| `.skill-level-{1-5}` | Color intensity per rating (dark to light) |
| `@media screen` | Adds padding/max-width for browser preview |
| `@media print` | Resets min-height, allows sections to span pages |

### CSS Variables (Standard Templates)

```css
--cv-accent   /* set to d.meta.colorScheme by sections.js; default #6366f1 */
--cv-font     /* set by template style.css if it wants to lock a font */
```

Standard templates use `var(--cv-accent, #fallback)` for any accent color. The user's chosen accent is injected at runtime via `document.documentElement.style.setProperty('--cv-accent', ...)`.

### CSS Variables (Premium Templates)

Premium templates define a full color palette and lock it (the user's accent is **not** applied):

```css
/* Example: Violet Edge */
.tpl-violet-edge {
  --accent-dark:   #3d1a8e;
  --accent-mid:    #7c3aed;
  --accent-light:  #a78bfa;
  --sidebar-text:  #c4b5fd;
  --body-text:     #374151;
  --heading-text:  #3d1a8e;
}
```

### CSS Naming Conventions

| Type | Class prefix | Example |
|---|---|---|
| Standard templates | `.cv-*` | `.cv-section-title`, `.cv-card` |
| Template scope | `.tpl-{id}` | `.tpl-classic`, `.tpl-modern` |
| Premium custom elements | `.tpl-{id} .{id-prefix}-*` | `.tpl-violet-edge .violet-banner` |

Standard templates override `.cv-*` classes inside their `style.css`. Premium templates add new namespaced classes to avoid conflicts.

### Print-First Design

All sizing uses `pt` units (print points). The `@page` rule controls print margins. Puppeteer uses `preferCSSPageSize: true` to respect this rule when generating PDFs.

```css
/* From base.css */
@media print {
  .cv-section { page-break-inside: auto; }      /* sections can span pages */
  .cv-card,
  .exp-block,
  .edu-block,
  .proj-block,
  .pub-row { page-break-inside: avoid; }         /* entries stay on one page */
}
```

---

## 7. Section Renderer Functions (`sections.js`)

### Helper Utilities

```javascript
esc(s)                   // HTML-escape a string (prevents XSS)
formatYm('2024-01')      // → 'Jan 2024'
range(start, end, cur)   // → 'Jan 2020 – Present' or 'Jan 2020 – Dec 2021'
clampRating(r)           // normalize rating to 1–5
skillRatingFromItem(it)  // reads it.rating (number) or it.level (legacy string) → 1–5
skillBarFromItem(it)     // → '<span class="skill-bar"><span class="skill-bar-fill" style="width:60%">'
splitFullName(name)      // → { first: 'Jane', last: 'Doe' }
```

### Visibility Helpers

```javascript
isEmpty(key, d)          // true if section has no content
hideKey(key, cfg, d)     // true if key is in cfg.hideIfEmpty AND isEmpty
sectionHiddenByUser(key, d)  // true if d.sectionVisibility[key] === false
shouldSkip(key, d, cfg)  // combines all three — use this before rendering any section
```

### Section Render Functions

| Section key | Function(s) | Key `d` fields accessed |
|---|---|---|
| `personal` | `sectionPersonal(d, cfg)` | `d.personal.{fullName, title, email, phone, location, photo, links}` |
| `summary` | `sectionSummary(d, cfg)` | `d.summary` |
| `experience` | `sectionExperience(d, cfg, tpl)` | `d.experience[].{company, role, type, location, remote, startDate, endDate, current, bullets, technologies}` |
| `education` | `sectionEducation(d, cfg)` | `d.education[].{institution, degree, field, startDate, endDate, current, gpa, thesis}` |
| `skills` | `sectionSkillsMain(d, cfg)` | `d.skills[].{category, items[].{name, rating}}`, `cfg.showSkillBars`, `cfg.showsSkillRatingInCv` |
| `projects` | `sectionProjects(d, cfg)` | `d.projects[].{name, role, description, bullets, technologies, links, startDate, endDate}` |
| `publications` | `sectionPublications(d, cfg, tpl)` | `d.publications[].{title, authors, journal, year, doi, url, type, status}` |
| `research` | `sectionResearch(d, cfg)` | `d.research[].{title, institution, role, startDate, endDate, description}` |
| `certifications` | `sectionCertifications(d, cfg, tpl)` | `d.certifications[].{name, issuer, date, expiry, url}` |
| `awards` | `sectionAwards(d, cfg)` | `d.awards[].{title, issuer, date, description}` |
| `volunteer` | `sectionVolunteer(d, cfg)` | `d.volunteer[].{organization, role, startDate, endDate, description}` |
| `languages` | `sectionLanguagesMain(d, cfg)` | `d.languages[].{name, proficiency}` |
| `interests` | inline in `renderMainSection` | `d.interests[]` |
| `references` | `sectionReferences(d, cfg)` | `d.references[].{name, role, company, email, phone}` |
| `custom` | `sectionCustom(d, cfg)` | `d.custom[].{title, items[].{heading, subheading, date, description, bullets}}` |

All functions call `shouldSkip(key, d, cfg)` first and return `''` if the section should be hidden.

---

## 8. Standard vs Premium Templates

### Standard Templates

- Use the shared section renderer functions from `sections.js`
- Only need a `style.css` that overrides `.cv-*` base classes
- The user's accent color (`--cv-accent`) is applied automatically
- Two-column layouts use the standard `cv-two-col` / `cv-sidebar` / `cv-main` shell

### Premium Templates

Premium templates are identified by the `PREMIUM_IDS` set in `sections.js`:

```javascript
var PREMIUM_IDS = {
  'amber-strike': true,
  'midnight-pro': true,
  'golden-hour': true,
  'ocean-slate': true,
  'violet-edge': true,
};
```

When `isPremiumTpl(tpl)` is true, `render()` calls `buildPremiumHtml(tpl, d, cfg, order)` instead of the standard layout builders.

`buildPremiumHtml` routes to a dedicated builder function per template:

```javascript
function buildPremiumHtml(tpl, d, cfg, order) {
  switch (tpl) {
    case 'amber-strike': return amber(d, cfg, order);
    case 'midnight-pro': return midnight(d, cfg, order);
    case 'golden-hour':  return golden(d, cfg, order);
    case 'ocean-slate':  return oceanslate(d, cfg, order);
    case 'violet-edge':  return violetedge(d, cfg, order);
    default: return '';
  }
}
```

Each builder function constructs custom HTML using namespaced classes. The user's accent color is **not** applied (premium templates lock their own color palette via CSS variables in `style.css`).

Premium builder functions handle their own section placement logic — sidebar vs main column is hardcoded inside the builder rather than driven by `sidebarSections` config.

---

## 9. Adding a New Standard Template

### Checklist

**Step 1 — Create the template directory and files**

```
src/templates/my-template/
├── index.html    ← copy from any existing template (identical boilerplate)
└── style.css     ← your template-specific styles
```

`index.html` is always this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link id="gf" href="" rel="stylesheet" />
</head>
<body>
  <div id="cv-root"></div>
</body>
</html>
```

**Step 2 — Write `style.css`**

For a **single-column** template, override `.cv-*` classes:

```css
/* my-template — brief description */
.cv-page {
  font-family: var(--cv-font, 'Georgia', serif);
}
.cv-section-title {
  color: var(--cv-accent, #1a1a2e);
  border-bottom-color: var(--cv-accent, #1a1a2e);
}
.cv-header h1 {
  font-size: 24pt;
  font-weight: 700;
}
/* ... other overrides ... */
```

For a **two-column** template, also define the grid:

```css
/* my-template — two-column */
.tpl-my-template .cv-two-col {
  grid-template-columns: 30% 1fr;
  gap: 20pt;
}
.tpl-my-template .cv-sidebar {
  background: #f8fafc;
  padding: 12pt;
}
.tpl-my-template .cv-section-title {
  color: var(--cv-accent, #6c63ff);
}
```

The grid layout for `.cv-two-col` is declared in `base.css` as `display: grid` with no column sizes — each template defines `grid-template-columns` in its own CSS.

**Step 3 — Add `TemplateId` to the union type**

`src/types/cv.types.ts`:

```typescript
export type TemplateId =
  | 'classic'
  | /* ...existing... */
  | 'my-template';   // ← add here
```

**Step 4 — Add `TemplateConfig` to the registry**

`src/config/templateConfig.ts`:

```typescript
export const TEMPLATE_CONFIGS: Record<TemplateId, TemplateConfig> = {
  // ...existing templates...
  'my-template': {
    id: 'my-template',
    label: 'My Template',
    description: 'One-line marketing description',
    targetUsers: 'Target audience description',
    layout: 'single-column',          // or 'two-column'
    // sidebarSections: ['skills'],   // only for two-column
    sectionOrder: [
      'personal', 'summary', 'experience', 'projects', 'education',
      'skills', 'certifications', 'awards', 'volunteer', 'publications',
      'research', 'languages', 'interests', 'references', 'custom',
    ],
    educationFirst: false,
    showSkillBars: false,
    showsSkillRatingInCv: false,
    showPhoto: false,
    hideIfEmpty: ['publications', 'research', 'projects'],
    requiredSections: ['personal', 'summary', 'experience', 'education', 'skills'],
  },
};
```

**Rules for `sectionOrder`:**
- Must contain all 15 keys from `CV_TEMPLATE_SECTION_KEYS_ALL` exactly once
- For two-column templates, sidebar sections are typically appended at the end (they render in the sidebar regardless of position in the array)

**Step 5 — Register in `ALL_TEMPLATE_IDS` and `VISIBLE_TEMPLATE_IDS`**

```typescript
export const ALL_TEMPLATE_IDS: TemplateId[] = [
  // ...existing...
  'my-template',
];

export const VISIBLE_TEMPLATE_IDS: TemplateId[] = [
  // ...existing...
  'my-template',
];
```

**Step 6 — Test the template**

Open in browser:
```
GET /api/cv/preview-html?template_id=my-template&sample=1
```

This uses sample data so no user account is needed. The endpoint falls back to `TEMPLATE_CONFIGS` if the template isn't in the Supabase `cv_templates` table.

To add it to the database, insert a row in the `cv_templates` table (or leave it out and the fallback will serve it from config).

---

## 10. Adding a New Premium Template

Premium templates require additional steps because they use a custom HTML builder instead of the generic layout code.

**Steps 1–5 are the same as a standard template**, plus:

**Step 6 — Add to `PREMIUM_IDS` in `sections.js`**

`src/templates/shared/sections.js`:

```javascript
var PREMIUM_IDS = {
  'amber-strike': true,
  'midnight-pro': true,
  'golden-hour': true,
  'ocean-slate': true,
  'violet-edge': true,
  'my-premium': true,   // ← add here
};
```

**Step 7 — Write the custom builder function in `sections.js`**

Add a new function before `buildPremiumHtml`:

```javascript
function mypremium(d, cfg, order) {
  // Build and return complete HTML string for the cv-root content
  var p = d.personal || {};
  var nm = splitFullName(p.fullName);
  var html = '';

  // Header / banner
  html += '<div class="mp-banner">';
  html += '<div class="mp-name">' + esc(nm.first) + ' <strong>' + esc(nm.last) + '</strong></div>';
  html += '<div class="mp-title">' + esc(p.title) + '</div>';
  html += '</div>';

  // Main content
  html += '<div class="mp-body">';
  // Render sections via shared helpers or custom HTML
  order.forEach(function (key) {
    if (shouldSkip(key, d, cfg)) return;
    switch (key) {
      case 'experience':
        html += '<section class="cv-section">';
        html += '<div class="cv-section-title">Experience</div>';
        (d.experience || []).forEach(function (ex) {
          html += '<div class="mp-exp cv-card">';
          html += '<div class="mp-role">' + esc(ex.role) + '</div>';
          html += '<div class="mp-company">' + esc(ex.company) + ' · ' + range(ex.startDate, ex.endDate, ex.current) + '</div>';
          (ex.bullets || []).forEach(function (b) {
            html += '<li>' + esc(b) + '</li>';
          });
          html += '</div>';
        });
        html += '</section>';
        break;
      // ... handle other keys or fall through to renderMainSection
      default:
        html += renderMainSection(key, d, cfg, 'my-premium');
    }
  });
  html += '</div>';

  return html;
}
```

You can mix custom HTML for featured sections and fall back to `renderMainSection(key, d, cfg, tpl)` for standard sections.

**Step 8 — Register the builder in `buildPremiumHtml`**

```javascript
function buildPremiumHtml(tpl, d, cfg, order) {
  switch (tpl) {
    case 'amber-strike': return amber(d, cfg, order);
    case 'midnight-pro': return midnight(d, cfg, order);
    case 'golden-hour':  return golden(d, cfg, order);
    case 'ocean-slate':  return oceanslate(d, cfg, order);
    case 'violet-edge':  return violetedge(d, cfg, order);
    case 'my-premium':   return mypremium(d, cfg, order);   // ← add here
    default: return '';
  }
}
```

**Step 9 — Write premium CSS with locked color palette**

`src/templates/my-premium/style.css`:

```css
/* Premium: color palette locked — do not use --cv-accent */
.tpl-my-premium {
  --brand-dark:  #1a1a2e;
  --brand-mid:   #4a4a8a;
  --brand-light: #a0a0d0;
  --sidebar-bg:  #1a1a2e;
  --sidebar-text: #e0e0f0;
  --body-text:   #2d2d2d;
}

.tpl-my-premium.cv-page {
  font-family: 'Poppins', system-ui, sans-serif;
  color: var(--body-text);
}

.tpl-my-premium .mp-banner {
  background: var(--brand-dark);
  color: #fff;
  padding: 20pt 24pt;
}

/* ... rest of premium styles ... */
```

**Step 10 — `templateAccent` for the picker swatch**

In `templateConfig.ts`, set `templateAccent` to the brand color shown in the template picker UI:

```typescript
'my-premium': {
  templateAccent: '#4a4a8a',
  // ...
}
```

---

## 11. Key File Reference

| File | Purpose |
|---|---|
| `src/templates/{id}/index.html` | Template HTML skeleton — identical boilerplate for all templates |
| `src/templates/{id}/style.css` | Template-specific CSS overrides |
| `src/templates/shared/base.css` | Foundation styles shared by all templates (page setup, print rules, `.cv-*` classes) |
| `src/templates/shared/sections.js` | Universal renderer IIFE — reads `window.__CV_DATA__` and `window.__TEMPLATE_CONFIG__`, fills `#cv-root` |
| `src/config/templateConfig.ts` | Template registry: `TemplateConfig` interface, `TEMPLATE_CONFIGS`, `ALL_TEMPLATE_IDS`, `VISIBLE_TEMPLATE_IDS` |
| `src/types/cv.types.ts` | TypeScript types: `TemplateId`, `CVData`, `CVMeta`, `PersonalInfo`, `WorkExperience`, all sub-types |
| `src/services/pdfRenderer.ts` | `renderUnifiedHtml()` (builds the HTML), `generateCVPdf()`, `generateCVPreview()`, Puppeteer browser wrapper |
| `app/api/cv/preview-html/route.ts` | GET (sample preview) and POST (user CV preview) endpoints |
| `app/api/export/route.ts` | PDF export endpoint — validates subscription tier, calls `generateCVPdf()` |
| `app/api/cv/preview-png/route.ts` | PNG screenshot endpoint |
| `components/cv/premium/PreviewPanel.tsx` | Iframe preview component with zoom control and page navigation |
| `components/cv/CVEditor.tsx` | Editor state manager — handles template switching, `refreshPreview()`, section order |
| `components/cv/TemplateThumbnail.tsx` | Template picker thumbnail (iframe scaled down to card size) |
| `lib/cv-universal-bridge.ts` | `profileToUniversalCV()` and `universalToProfilePayload()` — bidirectional DB ↔ CVData mapping |
| `lib/cv-mapper.ts` | `dbRowToCvProfile()` — normalizes Supabase JSONB row to TypeScript interface |
| `lib/cv-section-visibility.ts` | `applyCvSectionVisibility()` — zeroes out hidden sections before render |
| `src/utils/cvDefaults.ts` | `normalizeTemplateId()` (maps legacy IDs), `createEmptyCVData()` |
| `supabase/migrations/011_new_schema.sql` | `cvs` table schema (all JSONB section columns, template/font/accent columns) |
| `supabase/migrations/016_cv_extra_and_templates.sql` | `cv_extra` JSONB column (publications, research, volunteer, interests, custom) |
