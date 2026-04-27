'use client';

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { X, FileText, Wand2, Cloud, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stashGuestEditorStateForOAuth } from '@/lib/guest-cv-handoff';
import type { CVEditorState } from '@/lib/cv-editor-state';

function buildReturnToParam(
  pathname: string,
  searchToString: string,
  addHydrate: boolean
) {
  const rel = `${pathname}${searchToString ? `?${searchToString}` : ''}`;
  const u = new URL(rel, 'http://localhost');
  if (addHydrate) u.searchParams.set('hydrateGuest', 'true');
  return encodeURIComponent(u.pathname + u.search);
}

type NeedLoginModalProps = {
  open: boolean;
  onClose: () => void;
  /** When set, stashed to sessionStorage before OAuth (survives full page reload). */
  guestStateForOauth: CVEditorState | null;
};

export function NeedLoginModal({ open, onClose, guestStateForOauth }: NeedLoginModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const returnTo = buildReturnToParam(pathname, search, guestStateForOauth !== null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => firstFocusRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const list = [firstFocusRef.current, ...Array.from(focusable)].filter(Boolean) as HTMLElement[];
    if (list.length === 0) return;
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!el.contains(t)) {
        e.preventDefault();
        list[0].focus();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el.contains(e.target as Node)) return;
      const idx = list.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          list[list.length - 1].focus();
        }
      } else {
        if (idx === list.length - 1) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const onBeforeAuthNavigation = () => {
    if (guestStateForOauth) stashGuestEditorStateForOAuth(guestStateForOauth);
  };

  const qs = `returnTo=${returnTo}&preserveGuestCv=true`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[101] w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold text-[var(--color-text-primary)]"
          >
            Unlock This Feature
          </h2>
          <button
            type="button"
            ref={firstFocusRef}
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] transition hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Exporting to PDF and AI-powered rewrites are available with a free account. Sign up in
          seconds—no card required.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-[var(--color-text-primary)]">
          {[
            { icon: FileText, text: 'Export to PDF' },
            { icon: Wand2, text: 'AI Suggestions' },
            { icon: Cloud, text: 'Save & access your CV from anywhere' },
            { icon: Share2, text: 'Link & share' },
          ].map((row) => (
            <li key={row.text} className="flex items-center gap-2 rounded-lg bg-[var(--color-background)]/60 px-3 py-2">
              <row.icon className="h-4 w-4 shrink-0 text-[var(--color-primary-500)]" aria-hidden />
              {row.text}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            href={`/register?${qs}`}
            onClick={onBeforeAuthNavigation}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-btn px-4 text-sm font-semibold text-white',
              'bg-[var(--color-primary-500)] shadow-sm transition hover:brightness-110'
            )}
          >
            Sign Up Free
          </Link>
          <Link
            href={`/login?${qs}`}
            onClick={onBeforeAuthNavigation}
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-btn border border-[var(--color-border)] px-4',
              'text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)]'
            )}
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
