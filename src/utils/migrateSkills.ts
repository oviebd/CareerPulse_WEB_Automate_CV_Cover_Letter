import { generateId } from '@/lib/utils';
import type {
  SkillCategory,
  SkillItem,
  SkillRating,
} from '@/src/types/cv.types';

function clampRating(n: number): SkillRating {
  if (!Number.isFinite(n)) return 3;
  const r = Math.round(n);
  if (r < 1) return 1;
  if (r > 5) return 5;
  return r as SkillRating;
}

function levelToRating(level: unknown): SkillRating {
  const s = String(level ?? '')
    .toLowerCase()
    .trim();
  if (s === 'beginner') return 1;
  if (s === 'basic') return 2;
  if (s === 'intermediate') return 3;
  if (s === 'advanced') return 4;
  if (s === 'expert' || s === 'professional') return 5;
  return 3;
}

function normalizeItem(
  raw: unknown,
  index: number
): SkillItem | null {
  if (typeof raw === 'string') {
    const name = raw.trim();
    if (!name) return null;
    return {
      id: generateId(),
      name,
      rating: 3,
    };
  }
  if (raw && typeof raw === 'object' && 'name' in (raw as object)) {
    const o = raw as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) return null;
    if (typeof o.rating === 'number') {
      return {
        id: typeof o.id === 'string' && o.id ? o.id : generateId(),
        name,
        rating: clampRating(o.rating),
      };
    }
    if (o.level != null) {
      return {
        id: typeof o.id === 'string' && o.id ? o.id : generateId(),
        name,
        rating: levelToRating(o.level),
      };
    }
    return {
        id: typeof o.id === 'string' && o.id ? o.id : generateId(),
      name,
      rating: 3,
    };
  }
  return null;
}

function normalizeCategory(
  cat: Record<string, unknown>,
  ci: number
): SkillCategory {
  const id =
    typeof cat.id === 'string' && cat.id ? cat.id : generateId();
  const category = String(cat.category ?? cat.name ?? '').trim();
  const displayOrder =
    typeof cat.displayOrder === 'number' && Number.isFinite(cat.displayOrder)
      ? cat.displayOrder
      : ci;
  const itemsRaw = Array.isArray(cat.items) ? cat.items : [];
  const items: SkillItem[] = [];
  itemsRaw.forEach((raw, j) => {
    const it = normalizeItem(raw, j);
    if (it) items.push(it);
  });
  return { id, category, items, displayOrder };
}

/** One empty category for new CV drafts (editor starting point). */
export function createEmptySkillCategory(): SkillCategory {
  return {
    id: generateId(),
    category: '',
    items: [],
    displayOrder: 0,
  };
}

/**
 * Migrate legacy skills JSON (SkillGroup string items, flat arrays, old SkillItem levels)
 * to SkillCategory[] with numeric ratings.
 */
export function migrateSkillsToRated(raw: unknown): SkillCategory[] {
  if (raw == null) return [];

  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Flat string list: ["React", "TS"]
  if (typeof raw[0] === 'string') {
    return [
      {
        id: generateId(),
        category: 'Skills',
        displayOrder: 0,
        items: (raw as string[])
          .map((name) => String(name).trim())
          .filter(Boolean)
          .map((name) => ({
            id: generateId(),
            name,
            rating: 3 as SkillRating,
          })),
      },
    ];
  }

  function firstSkillSample(arr: unknown[]): unknown | null {
    for (const row of arr) {
      if (!row || typeof row !== 'object') continue;
      const items = (row as { items?: unknown }).items;
      if (!Array.isArray(items) || items.length === 0) continue;
      return items[0];
    }
    return null;
  }

  const fi = firstSkillSample(raw);

  if (fi != null) {
    // New format: rated items
    if (
      typeof fi === 'object' &&
      fi !== null &&
      typeof (fi as { rating?: unknown }).rating === 'number'
    ) {
      return (raw as Record<string, unknown>[]).map((row, i) =>
        normalizeCategory(row, i)
      );
    }
    // Items are plain strings (legacy SkillGroup)
    if (typeof fi === 'string') {
      return (raw as Record<string, unknown>[]).map((cat, ci) => {
        const c = normalizeCategory(
          {
            ...cat,
            items: Array.isArray(cat.items) ? cat.items : [],
          },
          ci
        );
        return {
          ...c,
          items: (Array.isArray(cat.items) ? cat.items : [])
            .filter((x) => typeof x === 'string')
            .map((name) => ({
              id: generateId(),
              name: String(name).trim(),
              rating: 3 as SkillRating,
            }))
            .filter((it) => it.name),
        };
      });
    }
    // Objects: legacy { name, level? } without rating
    if (typeof fi === 'object' && fi !== null) {
      return (raw as Record<string, unknown>[]).map((cat, ci) => {
        const itemsRaw = Array.isArray(cat.items) ? cat.items : [];
        const items: SkillItem[] = [];
        itemsRaw.forEach((item) => {
          const it = normalizeItem(item, items.length);
          if (it) items.push(it);
        });
        const id =
          typeof cat.id === 'string' && cat.id ? cat.id : generateId();
        const category = String(cat.category ?? cat.name ?? '').trim();
        const displayOrder =
          typeof cat.displayOrder === 'number' &&
          Number.isFinite(cat.displayOrder)
            ? cat.displayOrder
            : ci;
        return { id, category, items, displayOrder };
      });
    }
  }

  // Categories with empty items arrays still valid
  return (raw as Record<string, unknown>[]).map((row, i) =>
    normalizeCategory(row, i)
  );
}

export function normalizeSkillsForSave(
  skills: SkillCategory[]
): SkillCategory[] {
  return skills.map((cat, i) => {
    const items = (cat.items ?? []).map((it) => {
      let rating: SkillRating = 3;
      if (typeof it.rating === 'number') {
        rating = clampRating(it.rating);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[cv] Skill item missing rating; defaulting to 3', it);
        }
      }
      return {
        id: it.id || generateId(),
        name: it.name.trim(),
        rating,
      };
    });
    return {
      id: cat.id || generateId(),
      category: cat.category.trim() || 'Untitled Category',
      displayOrder: typeof cat.displayOrder === 'number' ? cat.displayOrder : i,
      items,
    };
  });
}
