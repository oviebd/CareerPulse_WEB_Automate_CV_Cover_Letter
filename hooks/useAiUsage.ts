'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';

export type AiUsageBreakdownRow = {
  category: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  input_chars: number;
  output_chars: number;
  event_count: number;
  credits_consumed: number;
  usd_cost: number;
};

export type AiUsageRecentRow = {
  id?: string;
  category?: string;
  operation?: string;
  input_tokens?: number;
  output_tokens?: number;
  input_chars?: number;
  output_chars?: number;
  credits_consumed?: number | string;
  usd_cost?: number | string;
  created_at?: string;
};

export type AiUsageResponse = {
  totals: {
    input_tokens: number;
    output_tokens: number;
    input_chars: number;
    output_chars: number;
    event_count: number;
    credits_consumed: number;
    usd_cost: number;
  };
  breakdown: AiUsageBreakdownRow[];
  recent: AiUsageRecentRow[];
};

export function useAiUsage() {
  return useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => apiFetch<AiUsageResponse>('/api/ai-usage'),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}
