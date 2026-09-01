import type { LinkedCoverLetter, LinkedCV } from '@/types/database';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';

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

  const cvRows = await getCvsRepo().listByUser(userId, { includeArchived: true });
  for (const row of cvRows) {
    const jids = (row.job_ids as string[] | undefined) ?? [];
    for (const jid of jids) {
      if (!jobIds.includes(jid)) continue;
      const list = cvsByJob.get(jid) ?? [];
      list.push(
        rowToLinkedCv({
          id: row.id as string,
          name: (row.name as string) ?? 'Untitled CV',
          created_at: String(row.created_at ?? ''),
        })
      );
      cvsByJob.set(jid, list);
    }
  }

  const clRows = await getCoverLettersRepo().listByUser(userId);
  for (const row of clRows) {
    const jids = (row.job_ids as string[] | undefined) ?? [];
    for (const jid of jids) {
      if (!jobIds.includes(jid)) continue;
      const list = clByJob.get(jid) ?? [];
      list.push(
        rowToLinkedCl({
          id: row.id as string,
          name: (row.name as string) ?? 'Untitled Cover Letter',
          created_at: String(row.created_at ?? ''),
        })
      );
      clByJob.set(jid, list);
    }
  }

  return { cvsByJob, clByJob };
}
