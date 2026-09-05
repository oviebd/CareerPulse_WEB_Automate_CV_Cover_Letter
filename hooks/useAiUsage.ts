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
};

export type AiUsageResponse = {
  chars_per_token: number;
  totals: {
    input_tokens: number;
    output_tokens: number;
    input_chars: number;
    output_chars: number;
    event_count: number;
  };
  breakdown: AiUsageBreakdownRow[];
  recent: Array<Record<string, unknown>>;
};

export function useAiUsage() {
  return useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => apiFetch<AiUsageResponse>('/api/ai-usage'),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}
