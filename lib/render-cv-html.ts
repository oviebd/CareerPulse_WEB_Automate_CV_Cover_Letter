import type {
  AwardEntry,
  CertificationEntry,
  CVProfile,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  SkillGroup,
} from '@/types';

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderExperienceHtml(rows: ExperienceEntry[]): string {
  return rows
    .map(
      (e) => `
    <div class="exp-block">
      <div class="exp-head"><strong>${esc(e.title)}</strong> — ${esc(e.company)} <span class="muted">${esc(e.start_date)}–${e.is_current ? 'Present' : esc(e.end_date ?? '')}</span></div>
      <div class="muted">${esc(e.location)}</div>
      <ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    </div>`
    )
    .join('');
}

export function renderEducationHtml(rows: EducationEntry[]): string {
  return rows
    .map(
      (r) => `
    <div class="edu-block">
      <strong>${esc(r.institution)}</strong> — ${esc(r.degree)} in ${esc(r.field_of_study)}
      <div class="muted">${esc(r.start_date)}–${r.end_date ? esc(r.end_date) : 'Present'}</div>
    </div>`
    )
    .join('');
}

export function renderSkillsHtml(groups: SkillGroup[]): string {
  return groups
    .filter((g) => g.items.length)
    .map(
      (g) => `
    <div class="skill-group"><span class="cat">${esc(g.category)}</span>
      <div class="chips">${g.items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>
    </div>`
    )
    .join('');
}

export function renderProjectsHtml(rows: ProjectEntry[]): string {
  return rows
    .map(
      (p) => `
    <div class="proj-block">
      <strong>${esc(p.name)}</strong>
      <p>${esc(p.description)}</p>
      <div class="muted">${p.tech_stack.map(esc).join(', ')}</div>
    </div>`
    )
    .join('');
}

export function renderCertificationsHtml(rows: CertificationEntry[]): string {
  return rows
    .map(
      (c) => `
    <div>${esc(c.name)} — ${esc(c.issuer)} <span class="muted">${esc(c.issue_date)}</span></div>`
    )
    .join('');
}

export function renderLanguagesHtml(rows: LanguageEntry[]): string {
  return rows
    .map((l) => `<div>${esc(l.language)} <span class="muted">(${esc(l.proficiency)})</span></div>`)
    .join('');
}

export function renderAwardsHtml(rows: AwardEntry[]): string {
  return rows
    .map(
      (a) => `
    <div><strong>${esc(a.title)}</strong> — ${esc(a.issuer)} <span class="muted">${esc(a.date)}</span></div>`
    )
    .join('');
}

export function cvToTemplateVars(
  p: CVProfile,
  primaryColor = '#2563EB'
): Record<string, string> {
  return {
    full_name: esc(p.full_name ?? ''),
    professional_title: esc(p.professional_title ?? ''),
    email: esc(p.email ?? ''),
    phone: esc(p.phone ?? ''),
    location: esc(p.location ?? ''),
    linkedin_url: esc(p.linkedin_url ?? ''),
    portfolio_url: esc(p.portfolio_url ?? ''),
    website_url: esc(p.website_url ?? ''),
    summary: esc(p.summary ?? '').replaceAll('\n', '<br/>'),
    experience_html: renderExperienceHtml(p.experience ?? []),
    education_html: renderEducationHtml(p.education ?? []),
    skills_html: renderSkillsHtml(p.skills ?? []),
    projects_html: renderProjectsHtml(p.projects ?? []),
    certifications_html: renderCertificationsHtml(p.certifications ?? []),
    languages_html: renderLanguagesHtml(p.languages ?? []),
    awards_html: renderAwardsHtml(p.awards ?? []),
    primary_color: primaryColor,
  };
}
