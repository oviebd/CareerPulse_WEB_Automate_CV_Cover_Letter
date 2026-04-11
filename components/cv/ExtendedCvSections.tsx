'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import type { CustomSection, Publication, Research, Volunteer } from '@/types';
import { CV_FORM_CARD as FORM_CARD } from '@/lib/cv-editor-styles';
import { generateId, moveIndexInArray } from '@/lib/utils';
import { ListReorderArrows } from '@/components/cv/ListReorderArrows';

const PUB_TYPES: { value: Publication['type']; label: string }[] = [
  { value: 'journal', label: 'Journal' },
  { value: 'conference', label: 'Conference' },
  { value: 'book-chapter', label: 'Book chapter' },
  { value: 'preprint', label: 'Preprint' },
  { value: 'thesis', label: 'Thesis' },
];

const PUB_STATUS: { value: Publication['status']; label: string }[] = [
  { value: 'published', label: 'Published' },
  { value: 'in-press', label: 'In press' },
  { value: 'under-review', label: 'Under review' },
];

type PubProps = {
  publications: Publication[];
  onChange: (next: Publication[]) => void;
};

export function PublicationsSection({ publications, onChange }: PubProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Journal articles, conference papers, and other scholarly output.
      </p>
      {publications.map((pub, i) => (
        <div key={pub.id} className={FORM_CARD}>
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-medium text-[var(--color-muted)]">Publication {i + 1}</span>
            <ListReorderArrows
              index={i}
              length={publications.length}
              onMove={(from, to) => onChange(moveIndexInArray(publications, from, to))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              className="sm:col-span-2"
              label="Title"
              value={pub.title}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, title: e.target.value };
                onChange(n);
              }}
            />
            <Input
              className="sm:col-span-2"
              label="Authors (comma-separated)"
              value={(pub.authors ?? []).join(', ')}
              onChange={(e) => {
                const n = [...publications];
                n[i] = {
                  ...pub,
                  authors: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                onChange(n);
              }}
            />
            <Input
              label="Journal / venue"
              value={pub.journal}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, journal: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="Year"
              value={pub.year}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, year: e.target.value };
                onChange(n);
              }}
            />
            <Select
              label="Type"
              value={pub.type}
              options={PUB_TYPES}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, type: e.target.value as Publication['type'] };
                onChange(n);
              }}
            />
            <Select
              label="Status"
              value={pub.status}
              options={PUB_STATUS}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, status: e.target.value as Publication['status'] };
                onChange(n);
              }}
            />
            <Input
              label="DOI (optional)"
              value={pub.doi ?? ''}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, doi: e.target.value || undefined };
                onChange(n);
              }}
            />
            <Input
              label="URL (optional)"
              value={pub.url ?? ''}
              onChange={(e) => {
                const n = [...publications];
                n[i] = { ...pub, url: e.target.value || undefined };
                onChange(n);
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onChange(publications.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange([
            ...publications,
            {
              id: generateId(),
              title: '',
              authors: [],
              journal: '',
              year: '',
              type: 'journal',
              status: 'published',
            },
          ])
        }
      >
        Add publication
      </Button>
    </div>
  );
}

type ResearchProps = {
  research: Research[];
  onChange: (next: Research[]) => void;
};

export function ResearchSection({ research, onChange }: ResearchProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">Research projects, labs, and grants.</p>
      {research.map((r, i) => (
        <div key={r.id} className={FORM_CARD}>
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-medium text-[var(--color-muted)]">Research {i + 1}</span>
            <ListReorderArrows
              index={i}
              length={research.length}
              onMove={(from, to) => onChange(moveIndexInArray(research, from, to))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              className="sm:col-span-2"
              label="Title"
              value={r.title}
              onChange={(e) => {
                const n = [...research];
                n[i] = { ...r, title: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="Institution"
              value={r.institution}
              onChange={(e) => {
                const n = [...research];
                n[i] = { ...r, institution: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="Your role"
              value={r.role}
              onChange={(e) => {
                const n = [...research];
                n[i] = { ...r, role: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="Start (month)"
              type="month"
              value={r.startDate?.slice(0, 7) ?? ''}
              onChange={(e) => {
                const n = [...research];
                n[i] = { ...r, startDate: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="End (month)"
              type="month"
              value={r.endDate?.slice(0, 7) ?? ''}
              onChange={(e) => {
                const n = [...research];
                n[i] = { ...r, endDate: e.target.value };
                onChange(n);
              }}
            />
            <Input
              className="sm:col-span-2"
              label="Funding (optional)"
              value={r.funding ?? ''}
              onChange={(e) => {
                const n = [...research];
                n[i] = { ...r, funding: e.target.value || undefined };
                onChange(n);
              }}
            />
          </div>
          <Textarea
            className="mt-3"
            label="Description"
            value={r.description}
            onChange={(e) => {
              const n = [...research];
              n[i] = { ...r, description: e.target.value };
              onChange(n);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onChange(research.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange([
            ...research,
            {
              id: generateId(),
              title: '',
              institution: '',
              role: '',
              startDate: '',
              endDate: '',
              description: '',
            },
          ])
        }
      >
        Add research entry
      </Button>
    </div>
  );
}

type VolProps = {
  volunteer: Volunteer[];
  onChange: (next: Volunteer[]) => void;
};

export function VolunteerSection({ volunteer, onChange }: VolProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">Volunteer roles and community work.</p>
      {volunteer.map((v, i) => (
        <div key={v.id} className={FORM_CARD}>
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
            <span className="text-xs font-medium text-[var(--color-muted)]">Volunteer {i + 1}</span>
            <ListReorderArrows
              index={i}
              length={volunteer.length}
              onMove={(from, to) => onChange(moveIndexInArray(volunteer, from, to))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Organization"
              value={v.organization}
              onChange={(e) => {
                const n = [...volunteer];
                n[i] = { ...v, organization: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="Role"
              value={v.role}
              onChange={(e) => {
                const n = [...volunteer];
                n[i] = { ...v, role: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="Start (month)"
              type="month"
              value={v.startDate?.slice(0, 7) ?? ''}
              onChange={(e) => {
                const n = [...volunteer];
                n[i] = { ...v, startDate: e.target.value };
                onChange(n);
              }}
            />
            <Input
              label="End (month)"
              type="month"
              value={v.endDate?.slice(0, 7) ?? ''}
              onChange={(e) => {
                const n = [...volunteer];
                n[i] = { ...v, endDate: e.target.value };
                onChange(n);
              }}
            />
          </div>
          <Textarea
            className="mt-3"
            label="Description"
            value={v.description}
            onChange={(e) => {
              const n = [...volunteer];
              n[i] = { ...v, description: e.target.value };
              onChange(n);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onChange(volunteer.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange([
            ...volunteer,
            {
              id: generateId(),
              organization: '',
              role: '',
              startDate: '',
              endDate: '',
              description: '',
            },
          ])
        }
      >
        Add volunteer role
      </Button>
    </div>
  );
}

type InterestsProps = {
  interestsText: string;
  onChange: (v: string) => void;
};

export function InterestsSection({ interestsText, onChange }: InterestsProps) {
  return (
    <div className={FORM_CARD}>
      <p className="mb-3 text-sm text-[var(--color-muted)]">
        Short list for sidebar templates (one interest per line).
      </p>
      <Textarea
        className="min-h-[160px]"
        label="Interests"
        value={interestsText}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'Photography\nOpen source\nHiking'}
      />
    </div>
  );
}

type CustomProps = {
  custom: CustomSection[];
  onChange: (next: CustomSection[]) => void;
};

export function CustomSectionsForm({ custom, onChange }: CustomProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-muted)]">
        Add named sections with dated items (e.g. &ldquo;Board positions&rdquo;, &ldquo;Media&rdquo;).
      </p>
      {custom.map((block, bi) => (
        <div key={block.id} className={FORM_CARD}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-[var(--color-border)] pb-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Section title"
                value={block.title}
                onChange={(e) => {
                  const n = [...custom];
                  n[bi] = { ...block, title: e.target.value };
                  onChange(n);
                }}
              />
            </div>
            <ListReorderArrows
              index={bi}
              length={custom.length}
              onMove={(from, to) => onChange(moveIndexInArray(custom, from, to))}
            />
          </div>
          <div className="space-y-3">
            {(block.items ?? []).map((it, ii) => (
              <div
                key={`${block.id}-it-${ii}`}
                className="rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="mb-2 flex justify-end">
                  <ListReorderArrows
                    index={ii}
                    length={(block.items ?? []).length}
                    onMove={(from, to) => {
                      const n = [...custom];
                      const items = moveIndexInArray(block.items ?? [], from, to);
                      n[bi] = { ...block, items };
                      onChange(n);
                    }}
                  />
                </div>
                <Input
                  label="Heading"
                  value={it.heading}
                  onChange={(e) => {
                    const n = [...custom];
                    const items = [...(block.items ?? [])];
                    items[ii] = { ...it, heading: e.target.value };
                    n[bi] = { ...block, items };
                    onChange(n);
                  }}
                />
                <Input
                  className="mt-2"
                  label="Subheading (optional)"
                  value={it.subheading ?? ''}
                  onChange={(e) => {
                    const n = [...custom];
                    const items = [...(block.items ?? [])];
                    items[ii] = { ...it, subheading: e.target.value || undefined };
                    n[bi] = { ...block, items };
                    onChange(n);
                  }}
                />
                <Input
                  className="mt-2"
                  label="Date (optional)"
                  value={it.date ?? ''}
                  onChange={(e) => {
                    const n = [...custom];
                    const items = [...(block.items ?? [])];
                    items[ii] = { ...it, date: e.target.value || undefined };
                    n[bi] = { ...block, items };
                    onChange(n);
                  }}
                />
                <Textarea
                  className="mt-2"
                  label="Description (optional)"
                  value={it.description ?? ''}
                  onChange={(e) => {
                    const n = [...custom];
                    const items = [...(block.items ?? [])];
                    items[ii] = { ...it, description: e.target.value || undefined };
                    n[bi] = { ...block, items };
                    onChange(n);
                  }}
                />
                <p className="mt-2 text-xs text-[var(--color-muted)]">Bullets (one per line)</p>
                <Textarea
                  className="mt-1 min-h-[72px]"
                  value={(it.bullets ?? []).join('\n')}
                  onChange={(e) => {
                    const n = [...custom];
                    const items = [...(block.items ?? [])];
                    items[ii] = {
                      ...it,
                      bullets: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    };
                    n[bi] = { ...block, items };
                    onChange(n);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const n = [...custom];
                    const items = (block.items ?? []).filter((_, j) => j !== ii);
                    n[bi] = { ...block, items };
                    onChange(n);
                  }}
                >
                  Remove item
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const n = [...custom];
                const items = [
                  ...(block.items ?? []),
                  { heading: '', subheading: '', date: '', description: '', bullets: [] },
                ];
                n[bi] = { ...block, items };
                onChange(n);
              }}
            >
              + Add item in this section
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => onChange(custom.filter((_, j) => j !== bi))}
          >
            Remove entire section
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange([
            ...custom,
            {
              id: generateId(),
              title: '',
              items: [],
            },
          ])
        }
      >
        Add custom section
      </Button>
    </div>
  );
}
