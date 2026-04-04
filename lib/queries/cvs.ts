import { createClient } from '@/lib/supabase/client';
import type { CV, CVUpdate } from '@/types/database';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import type { CVProfile } from '@/types';
import { stripUndefined } from '@/lib/queries/strip-undefined';

function isGeneralCvRow(row: { job_ids?: string[] | null }): boolean {
  return !row.job_ids || row.job_ids.length === 0;
}

export async function getCVs(options?: {
  includeArchived?: boolean;
  generalOnly?: boolean;
}): Promise<CVProfile[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let q = supabase.from('cvs').select('*').eq('user_id', user.id);
  if (!options?.includeArchived) {
    q = q.eq('is_archived', false);
  }
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const filtered = options?.generalOnly
    ? rows.filter((r) => isGeneralCvRow(r as { job_ids?: string[] }))
    : rows;
  return filtered.map(dbRowToCvProfile);
}

export async function getCV(id: string): Promise<CVProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return dbRowToCvProfile(data as Record<string, unknown>);
}

export async function createCV(name: string): Promise<CVProfile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cvs')
    .insert({
      user_id: user.id,
      name: name.trim() || 'Untitled CV',
    })
    .select()
    .single();
  if (error) throw error;
  return dbRowToCvProfile(data as Record<string, unknown>);
}

export async function updateCV(id: string, data: CVUpdate): Promise<CVProfile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = stripUndefined(data as Record<string, unknown>) as Record<string, unknown>;

  const { data: row, error } = await supabase
    .from('cvs')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) throw error;
  return dbRowToCvProfile(row as Record<string, unknown>);
}

export async function archiveCV(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('cvs')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;
}

export async function deleteCV(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('cvs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function getCVsByJobId(jobId: string): Promise<CVProfile[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cvs')
    .select('*')
    .eq('user_id', user.id)
    .contains('job_ids', [jobId])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbRowToCvProfile);
}

export async function linkCVToJob(cvId: string, jobId: string): Promise<CVProfile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const current = await getCV(cvId);
  if (!current) throw new Error('CV not found');
  const next = Array.from(new Set([...(current.job_ids ?? []), jobId]));
  return updateCV(cvId, { job_ids: next } as CVUpdate);
}

export async function unlinkCVFromJob(cvId: string, jobId: string): Promise<CVProfile> {
  const current = await getCV(cvId);
  if (!current) throw new Error('CV not found');
  const next = (current.job_ids ?? []).filter((j) => j !== jobId);
  return updateCV(cvId, { job_ids: next } as CVUpdate);
}

/** Raw row as database CV type — for code that expects `CV` from schema */
export function rowAsCV(row: Record<string, unknown>): CV {
  return row as unknown as CV;
}
