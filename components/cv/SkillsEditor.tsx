'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, generateId } from '@/lib/utils';
import type { SkillCategory, SkillRating } from '@/src/types/cv.types';
import {
  SKILL_RATING_LABEL,
} from '@/src/types/cv.types';

export interface SkillsEditorProps {
  skills: SkillCategory[];
  onChange: (skills: SkillCategory[]) => void;
  /** When false, hide 1–5 rating controls (template only lists skill names). Default true. */
  showRatingControls?: boolean;
}

interface CategoryInputState {
  [categoryId: string]: {
    inputValue: string;
    rating: SkillRating;
  };
}

function defaultInputState(): { inputValue: string; rating: SkillRating } {
  return { inputValue: '', rating: 3 };
}

/** Capitalize only the first character (tools → Tools). Leaves the rest unchanged. */
function capitalizeCategoryName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function SkillsEditor({
  skills,
  onChange,
  showRatingControls = true,
}: SkillsEditorProps) {
  const [inputs, setInputs] = useState<CategoryInputState>({});
  const [dupError, setDupError] = useState<Record<string, string | undefined>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearId, setConfirmClearId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skillInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const labelInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const ensureInput = useCallback(
    (categoryId: string) =>
      inputs[categoryId] ?? defaultInputState(),
    [inputs]
  );

  const setInputSlice = useCallback(
    (
      categoryId: string,
      patch: Partial<{ inputValue: string; rating: SkillRating }>
    ) => {
      setInputs((prev) => ({
        ...prev,
        [categoryId]: {
          ...defaultInputState(),
          ...prev[categoryId],
          ...patch,
        },
      }));
    },
    []
  );

  useEffect(() => {
    const ids = new Set(skills.map((s) => s.id));
    setInputs((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!ids.has(k)) delete next[k];
      }
      return next;
    });
  }, [skills]);

  const addCategory = () => {
    const id = generateId();
    const nextOrder =
      skills.length === 0
        ? 0
        : Math.max(...skills.map((s) => s.displayOrder ?? 0), -1) + 1;
    onChange([
      ...skills,
      { id, category: '', items: [], displayOrder: nextOrder },
    ]);
    requestAnimationFrame(() => {
      blockRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      labelInputRefs.current[id]?.focus();
    });
  };

  const updateCategory = (id: string, patch: Partial<SkillCategory>) => {
    onChange(
      skills.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const updateSkillRating = (
    catId: string,
    itemId: string,
    rating: SkillRating
  ) => {
    onChange(
      skills.map((s) => {
        if (s.id !== catId) return s;
        return {
          ...s,
          items: s.items.map((it) =>
            it.id === itemId ? { ...it, rating } : it
          ),
        };
      })
    );
  };

  const removeCategory = (id: string) => {
    onChange(skills.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  };

  const tryDeleteCategory = (cat: SkillCategory) => {
    if (cat.items.length === 0) {
      removeCategory(cat.id);
      return;
    }
    setConfirmClearId(null);
    setConfirmDeleteId(cat.id);
  };

  const clearCategoryItems = (id: string) => {
    updateCategory(id, { items: [] });
    setConfirmClearId(null);
  };

  const tryClearCategory = (cat: SkillCategory) => {
    if (cat.items.length === 0) return;
    setConfirmDeleteId(null);
    setConfirmClearId(cat.id);
  };

  const addSkill = (cat: SkillCategory) => {
    const st = ensureInput(cat.id);
    const name = st.inputValue.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (
      cat.items.some((it) => it.name.trim().toLowerCase() === lower)
    ) {
      setDupError((e) => ({ ...e, [cat.id]: `'${name}' is already in this category` }));
      skillInputRefs.current[cat.id]?.focus();
      return;
    }
    setDupError((e) => ({ ...e, [cat.id]: undefined }));
    const rating = showRatingControls
      ? typeof st.rating === 'number' && st.rating >= 1 && st.rating <= 5
        ? (st.rating as SkillRating)
        : 3
      : (3 as SkillRating);
    updateCategory(cat.id, {
      items: [
        ...cat.items,
        { id: generateId(), name, rating },
      ],
    });
    setInputSlice(cat.id, { inputValue: '', rating: 3 });
    requestAnimationFrame(() => skillInputRefs.current[cat.id]?.focus());
  };

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-faint)] p-6 text-center">
        <p className="text-sm italic text-[var(--color-muted)]">
          No skill categories yet.
        </p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addCategory}>
          + Add New Category
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skills.map((cat) => {
        const st = ensureInput(cat.id);
        const dup = dupError[cat.id];
        const displayCategory = capitalizeCategoryName(cat.category);
        const catLabel = displayCategory.trim() || 'Untitled Category';
        const charCount = displayCategory.length;
        const showCount = charCount > 45;

        return (
          <div
            key={cat.id}
            ref={(el) => {
              blockRefs.current[cat.id] = el;
            }}
            className="relative mb-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <input
                ref={(el) => {
                  labelInputRefs.current[cat.id] = el;
                }}
                type="text"
                maxLength={60}
                aria-label="Skill category name"
                placeholder="Category name (e.g. Tools, Languages, Frameworks)"
                className={cn(
                  'w-full border-0 border-b border-transparent bg-transparent font-semibold text-base text-gray-900',
                  'focus:border-gray-400 focus:outline-none',
                  charCount >= 60 && 'border-red-400'
                )}
                value={displayCategory}
                onChange={(e) =>
                  updateCategory(cat.id, {
                    category: capitalizeCategoryName(e.target.value),
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    skillInputRefs.current[cat.id]?.focus();
                  }
                }}
              />
              <div className="flex shrink-0 items-center gap-2">
                {showCount && (
                  <span
                    className={cn(
                      'text-xs',
                      charCount >= 60 ? 'font-medium text-red-600' : 'text-[var(--color-muted)]'
                    )}
                  >
                    {charCount}/60
                  </span>
                )}
                {cat.items.length > 0 ? (
                  <button
                    type="button"
                    className="rounded px-1.5 py-1 text-xs font-medium text-gray-600 hover:bg-black/[0.04] hover:text-red-600"
                    aria-label={`Clear all skills in ${catLabel}`}
                    onClick={() => tryClearCategory(cat)}
                  >
                    Clear all
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded p-1 text-[var(--color-muted)] hover:bg-black/[0.04] hover:text-red-600"
                  aria-label={`Remove category ${catLabel}`}
                  onClick={() => tryDeleteCategory(cat)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {confirmClearId === cat.id ? (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Clear all {cat.items.length} skill
                {cat.items.length === 1 ? '' : 's'} in &apos;{catLabel}&apos;?{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => setConfirmClearId(null)}
                >
                  Cancel
                </button>{' '}
                <button
                  type="button"
                  className="font-semibold text-red-700 underline"
                  onClick={() => clearCategoryItems(cat.id)}
                >
                  Clear
                </button>
              </div>
            ) : null}

            {confirmDeleteId === cat.id ? (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Remove &apos;{catLabel}&apos; and its {cat.items.length} skill
                {cat.items.length === 1 ? '' : 's'}?{' '}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancel
                </button>{' '}
                <button
                  type="button"
                  className="font-semibold text-red-700 underline"
                  onClick={() => removeCategory(cat.id)}
                >
                  Remove
                </button>
              </div>
            ) : null}

            <div className="mb-3 flex min-h-[24px] flex-wrap gap-x-1 gap-y-1 text-sm text-gray-700">
              {cat.items.length === 0 ? (
                <span className="italic text-gray-400">No skills added yet</span>
              ) : showRatingControls ? (
                <ul className="w-full space-y-2">
                  {cat.items.map((it) => (
                    <li
                      key={it.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5"
                    >
                      <span
                        className="min-w-0 flex-1 truncate font-medium text-gray-900"
                        title={it.name}
                      >
                        {it.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-gray-600">
                        {it.rating} · {SKILL_RATING_LABEL[it.rating]}
                      </span>
                      <button
                        type="button"
                        disabled={it.rating <= 1}
                        aria-label={`Decrease rating for ${it.name}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-bold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() =>
                          updateSkillRating(
                            cat.id,
                            it.id,
                            Math.max(1, it.rating - 1) as SkillRating
                          )
                        }
                      >
                        −
                      </button>
                      <button
                        type="button"
                        disabled={it.rating >= 5}
                        aria-label={`Increase rating for ${it.name}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-xs font-bold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() =>
                          updateSkillRating(
                            cat.id,
                            it.id,
                            Math.min(5, it.rating + 1) as SkillRating
                          )
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="shrink-0 cursor-pointer text-[14px] leading-none text-gray-400 hover:text-red-500"
                        aria-label={`Remove ${it.name} from ${catLabel}`}
                        onClick={() =>
                          updateCategory(cat.id, {
                            items: cat.items.filter((x) => x.id !== it.id),
                          })
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                cat.items.map((it, ii) => (
                  <span key={it.id} className="inline-flex max-w-full min-w-0 items-center gap-0.5">
                    {ii > 0 ? <span className="text-gray-500">,</span> : null}
                    <span className="max-w-[min(100%,280px)] truncate" title={it.name}>
                      {it.name}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 cursor-pointer text-[14px] leading-none text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${it.name} from ${catLabel}`}
                      onClick={() =>
                        updateCategory(cat.id, {
                          items: cat.items.filter((x) => x.id !== it.id),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {dup ? (
              <p className="mb-2 text-sm text-red-600" role="alert">
                {dup}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {showRatingControls ? (
                <>
                  <button
                    type="button"
                    disabled={st.rating <= 1}
                    aria-label="Decrease rating"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() =>
                      setInputSlice(cat.id, {
                        rating: Math.max(1, st.rating - 1) as SkillRating,
                      })
                    }
                  >
                    −
                  </button>
                  <div
                    className="min-w-[80px] text-center text-xs font-semibold text-gray-600"
                    aria-live="polite"
                  >
                    {st.rating} · {SKILL_RATING_LABEL[st.rating]}
                  </div>
                </>
              ) : null}
              <input
                ref={(el) => {
                  skillInputRefs.current[cat.id] = el;
                }}
                type="text"
                maxLength={80}
                placeholder="Add skill..."
                className="min-w-[120px] flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-400)]"
                value={st.inputValue}
                onChange={(e) => {
                  setDupError((d) => ({ ...d, [cat.id]: undefined }));
                  setInputSlice(cat.id, { inputValue: e.target.value });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill(cat);
                  }
                }}
              />
              {showRatingControls ? (
                <button
                  type="button"
                  disabled={st.rating >= 5}
                  aria-label="Increase rating"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-bold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() =>
                    setInputSlice(cat.id, {
                      rating: Math.min(5, st.rating + 1) as SkillRating,
                    })
                  }
                >
                  +
                </button>
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!st.inputValue.trim()}
                aria-label={`Add skill to ${catLabel}`}
                onClick={() => addSkill(cat)}
              >
                Add
              </Button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="secondary" size="sm" onClick={addCategory}>
        + Add New Category
      </Button>
    </div>
  );
}
