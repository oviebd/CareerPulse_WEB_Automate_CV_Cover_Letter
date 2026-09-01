'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import type { CVTemplate } from '@/types';

export function useCvTemplates() {
  return useQuery({
    queryKey: ['cv-templates'],
    queryFn: () => apiFetch<CVTemplate[]>('/api/templates?type=cv'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCoverLetterTemplates() {
  return useQuery({
    queryKey: ['cover-letter-templates'],
    queryFn: () => apiFetch<CVTemplate[]>('/api/templates?type=cover_letter'),
    staleTime: 10 * 60 * 1000,
  });
}
