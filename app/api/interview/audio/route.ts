import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { storageUpload } from '@/lib/storage';
import { err } from '@/lib/interview/api-auth';

export const runtime = 'nodejs';

const BUCKET = 'interview-audio' as const;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 401);

    const form = await request.formData();
    const file = form.get('file');
    const sessionId = form.get('session_id');

    if (!(file instanceof File)) return err('file is required', 422);

    const path = `${user.id}/interview/${sessionId ?? 'draft'}/${Date.now()}.webm`;
    const { signedPath } = await storageUpload(BUCKET, path, file);

    return NextResponse.json({ audio_path: path, signed_url: signedPath });
  } catch (e) {
    console.error('interview/audio', e);
    return err('Audio upload failed. You can still type your answer.', 500);
  }
}
