import type { SupabaseClient } from '@supabase/supabase-js';

import type { LinkedCoverLetter, LinkedCV } from '@/types/database';

/** Map `cvs` / `cover_letters` rows to API link shape (title from `name`). */
export function rowToLinkedCv(row: {
  id: string;
  name: string;
  created_at: string;
}): LinkedCV {
  return {
    id: row.id,
    title: row.name,
    created_at: row.created_at,
  };
}

export function rowToLinkedCl(row: {
  id: string;
  name: string;
  created_at: string;
}): LinkedCoverLetter {
  return {
    id: row.id,
    title: row.name,
    created_at: row.created_at,
  };
}

export async function fetchLinkedDocumentsForJobs(
  supabase: SupabaseClient,
  userId: string,
  jobIds: string[]
): Promise<{
  cvsByJob: Map<string, LinkedCV[]>;
  clByJob: Map<string, LinkedCoverLetter[]>;
}> {
  const cvsByJob = new Map<string, LinkedCV[]>();
  const clByJob = new Map<string, LinkedCoverLetter[]>();
  if (jobIds.length === 0) {
    return { cvsByJob, clByJob };
  }

  const { data: cvRows, error: cErr } = await supabase
    .from('cvs')
    .select('id, name, created_at, job_ids')
    .eq('user_id', userId);
  if (cErr) {
    console.error('fetchLinkedDocumentsForJobs cvs', cErr);
  } else {
    for (const row of cvRows ?? []) {
      const jids = (row.job_ids as string[] | undefined) ?? [];
      for (const jid of jids) {
        if (!jobIds.includes(jid)) continue;
        const list = cvsByJob.get(jid) ?? [];
        list.push(
          rowToLinkedCv({
            id: row.id as string,
            name: (row.name as string) ?? 'Untitled CV',
            created_at: row.created_at as string,
          })
        );
        cvsByJob.set(jid, list);
      }
    }
  }

  const { data: clRows, error: clErr } = await supabase
    .from('cover_letters')
    .select('id, name, created_at, job_ids')
    .eq('user_id', userId);
  if (clErr) {
    console.error('fetchLinkedDocumentsForJobs cover_letters', clErr);
  } else {
    for (const row of clRows ?? []) {
      const jids = (row.job_ids as string[] | undefined) ?? [];
      for (const jid of jids) {
        if (!jobIds.includes(jid)) continue;
        const list = clByJob.get(jid) ?? [];
        list.push(
          rowToLinkedCl({
            id: row.id as string,
            name: (row.name as string) ?? 'Untitled Cover Letter',
            created_at: row.created_at as string,
          })
        );
        clByJob.set(jid, list);
      }
    }
  }

  return { cvsByJob, clByJob };
}
