import { createClient } from '@/lib/supabase/client';
import type { Job, JobInsert, JobUpdate } from '@/types/database';
import { stripUndefined } from '@/lib/queries/strip-undefined';

export async function getJobs(options?: {
  status?: Job['status'];
  starred?: boolean;
}): Promise<Job[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let q = supabase.from('jobs').select('*').eq('user_id', user.id);
  if (options?.status) {
    q = q.eq('status', options.status);
  }
  if (options?.starred === true) {
    q = q.eq('is_starred', true);
  }
  const { data, error } = await q.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Job[];
}

export async function getJob(id: string): Promise<Job | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

export async function createJob(data: JobInsert): Promise<Job> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = stripUndefined(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from('jobs')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return row as Job;
}

export async function updateJob(id: string, data: JobUpdate): Promise<Job> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = stripUndefined(data as Record<string, unknown>);
  const { data: row, error } = await supabase
    .from('jobs')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) throw error;
  return row as Job;
}

export async function deleteJob(id: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('jobs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function updateJobStatus(id: string, status: Job['status']): Promise<Job> {
  return updateJob(id, { status });
}
