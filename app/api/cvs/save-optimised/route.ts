import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GenerationType } from '@/types';
import type { Json } from '@/types/database';
import { CLAUDE_MODEL } from '@/lib/claude';

function err(
  msg: string,
  status: number,
  extra?: { code?: string; details?: string | null; hint?: string | null }
) {
  return NextResponse.json(
    { error: msg, code: extra?.code, details: extra?.details, hint: extra?.hint },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err('Unauthorized', 401);

    const body = (await request.json()) as {
      cvContent?: string;
      coverLetterContent?: string;
      originalCvId: string;
      jobId?: string | null;
      generationType: GenerationType;
      ai_changes_summary?: string | null;
      keywords_added?: string[];
      bullets_improved?: number;
      coverLetterTone?: string | null;
      coverLetterLength?: string | null;
      coverLetterEmphasis?: string | null;
      coverLetterTemplateId?: string | null;
    };

    const originalCvId =
      typeof body.originalCvId === 'string' ? body.originalCvId.trim() : '';
    if (!originalCvId) return err('originalCvId is required', 400);

    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (profileErr) {
      console.error('save-optimised profile lookup', profileErr);
      return err('Could not verify your profile.', 500, {
        code: profileErr.code,
        details: profileErr.message,
      });
    }
    if (!profileRow) {
      return err(
        'Your profile could not be found. Try signing out and back in.',
        400
      );
    }

    const gen = body.generationType;
    if (gen !== 'cv' && gen !== 'coverLetter' && gen !== 'both') {
      return err('Invalid generationType', 400);
    }

    const hasCv = typeof body.cvContent === 'string' && body.cvContent.trim().length > 0;
    const hasCl =
      typeof body.coverLetterContent === 'string' &&
      body.coverLetterContent.trim().length > 0;

    if (gen === 'cv' && !hasCv) return err('cvContent is required', 400);
    if (gen === 'coverLetter' && !hasCl) return err('coverLetterContent is required', 400);
    if (gen === 'both' && (!hasCv || !hasCl)) {
      return err('Both cvContent and coverLetterContent are required', 400);
    }

    const jobId =
      typeof body.jobId === 'string' && body.jobId.trim() ? body.jobId.trim() : null;

    let cvData: Record<string, unknown>;
    if (hasCv) {
      try {
        cvData = JSON.parse(body.cvContent!) as Record<string, unknown>;
      } catch {
        return err('Invalid cvContent JSON', 422);
      }
    } else {
      cvData = {};
    }

    let savedCvId: string | null = null;
    let savedCoverLetterId: string | null = null;

    const rawKw = body.keywords_added;
    const keywordsAddedJson: Json = Array.isArray(rawKw)
      ? rawKw.filter((k): k is string => typeof k === 'string')
      : [];

    if (hasCv) {
      if (!jobId) {
        const cvName =
          gen === 'both' || gen === 'cv'
            ? 'Tailored CV'
            : 'Tailored CV';
        const { data, error } = await supabase
          .from('cvs')
          .insert({
            user_id: user.id,
            name: cvName,
            job_ids: [],
            full_name: cvData.full_name ?? null,
            professional_title: cvData.professional_title ?? null,
            email: cvData.email ?? null,
            phone: cvData.phone ?? null,
            location: cvData.location ?? null,
            linkedin_url: cvData.linkedin_url ?? null,
            github_url: cvData.github_url ?? null,
            links: cvData.links ?? [],
            summary: cvData.summary ?? null,
            experience: cvData.experience ?? [],
            education: cvData.education ?? [],
            skills: cvData.skills ?? [],
            projects: cvData.projects ?? [],
            certifications: cvData.certifications ?? [],
            languages: cvData.languages ?? [],
            awards: cvData.awards ?? [],
            referrals: cvData.referrals ?? [],
            ai_changes_summary: body.ai_changes_summary ?? null,
            keywords_added: keywordsAddedJson,
            bullets_improved: body.bullets_improved ?? 0,
            preferred_template_id: 'classic',
            accent_color: '#6C63FF',
            font_family: (cvData as { font_family?: string }).font_family ?? 'Inter',
          })
          .select('id')
          .single();
        if (error) {
          console.error('save-optimised cv no job', error);
          return err(error.message || 'Failed to save CV', 500, {
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
        savedCvId = data.id;
      } else {
        const { data: jobRow, error: jobLookupErr } = await supabase
          .from('jobs')
          .select('id, job_title, company_name')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (jobLookupErr || !jobRow) {
          return err('Job not found', 404);
        }
        const resolvedJobTitle = String(jobRow.job_title ?? '').trim() || 'Untitled role';
        const resolvedCompanyName = String(jobRow.company_name ?? '').trim() || 'Company';
        const cvName = `${resolvedJobTitle} — ${resolvedCompanyName}`;

        const { data, error } = await supabase
          .from('cvs')
          .insert({
            user_id: user.id,
            name: cvName,
            job_ids: [jobId],
            full_name: cvData.full_name ?? null,
            professional_title: cvData.professional_title ?? null,
            email: cvData.email ?? null,
            phone: cvData.phone ?? null,
            location: cvData.location ?? null,
            linkedin_url: cvData.linkedin_url ?? null,
            github_url: cvData.github_url ?? null,
            links: cvData.links ?? [],
            summary: cvData.summary ?? null,
            experience: cvData.experience ?? [],
            education: cvData.education ?? [],
            skills: cvData.skills ?? [],
            projects: cvData.projects ?? [],
            certifications: cvData.certifications ?? [],
            languages: cvData.languages ?? [],
            awards: cvData.awards ?? [],
            referrals: cvData.referrals ?? [],
            ai_changes_summary: body.ai_changes_summary ?? null,
            keywords_added: keywordsAddedJson,
            bullets_improved: body.bullets_improved ?? 0,
            preferred_template_id: 'classic',
            accent_color: '#6C63FF',
            font_family: (cvData as { font_family?: string }).font_family ?? 'Inter',
          })
          .select('id')
          .single();
        if (error) {
          console.error('save-optimised cv', error);
          return err(error.message || 'Failed to save CV', 500, {
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
        savedCvId = data.id;
      }
    }

    if (hasCl) {
      const { data: baseCv } = await supabase
        .from('cvs')
        .select('full_name, professional_title, email, phone, location')
        .eq('id', originalCvId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: clRow, error: clErr } = await supabase
        .from('cover_letters')
        .insert({
          user_id: user.id,
          applicant_name: baseCv?.full_name ?? null,
          applicant_role: baseCv?.professional_title ?? null,
          applicant_email: baseCv?.email ?? null,
          applicant_phone: baseCv?.phone ?? null,
          applicant_location: baseCv?.location ?? null,
          tone: body.coverLetterTone ?? 'professional',
          length: body.coverLetterLength ?? 'medium',
          specific_emphasis: body.coverLetterEmphasis?.trim() || null,
          content: body.coverLetterContent!.trim(),
          template_id: body.coverLetterTemplateId?.trim() || 'cl-classic',
          generation_model: CLAUDE_MODEL,
          job_ids: jobId ? [jobId] : [],
        })
        .select('id')
        .single();

      if (clErr) {
        console.error('save-optimised cover letter', clErr);
        return err(clErr.message || 'Failed to save cover letter', 500, {
          code: clErr.code,
          details: clErr.details,
          hint: clErr.hint,
        });
      }
      savedCoverLetterId = clRow.id;
    }

    return NextResponse.json({
      cvId: savedCvId,
      coverLetterId: savedCoverLetterId,
      originalCvId,
    });
  } catch (e) {
    console.error('cvs/save-optimised', e);
    const msg = e instanceof Error ? e.message : 'save_failed';
    return err(msg, 500);
  }
}
