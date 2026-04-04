import { createClient } from '@/lib/supabase/client';
import type { CoverLetter, CoverLetterUpdate } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';

export async function getCoverLetters(options?: { jobId?: string }): Promise<CoverLetter[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let q = supabase.from('cover_letters').select('*').eq('user_id', user.id);
  if (options?.jobId) {
    q = q.contains('job_ids', [options.jobId]);
  }
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CoverLetter[];
}

export async function getCoverLetter(id: string): Promise<CoverLetter | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as CoverLetter) ?? null;
}

export async function createCoverLetter(name: string): Promise<CoverLetter> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('cover_letters')
    .insert({
      user_id: user.id,
      name: name.trim() || 'Untitled Cover Letter',
    })
    .select()
    .single();
  if (error) throw error;
  return data as CoverLetter;
}

export async function updateCoverLetter(id: string, data: CoverLetterUpdate): Promise<CoverLetter> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = stripUndefined(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from('cover_letters')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) throw error;
  return row as CoverLetter;
}

export async function deleteCoverLetter(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('cover_letters').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function getCoverLettersByJobId(jobId: string): Promise<CoverLetter[]> {
  return getCoverLetters({ jobId });
}
