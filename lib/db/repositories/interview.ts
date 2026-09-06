import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import {
  interviewAnswers,
  interviewCompetencies,
  interviewEvaluations,
  interviewMastery,
  interviewPreparationPlans,
  interviewPreparationTopics,
  interviewPrepQuestions,
  interviewProfiles,
  interviewQuestions,
  interviewQuizAttempts,
  interviewQuizQuestions,
  interviewQuizzes,
  interviewSessions,
} from '@/lib/db/schema';
import { fromSnake, toSnake } from '@/lib/db/map-row';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import type { JobStatus } from '@/types/database';

const ELIGIBLE_STATUS_PRIORITY: Partial<Record<JobStatus, number>> = {
  interviewing: 0,
  technical_test: 1,
  applied: 2,
  offer_received: 3,
  negotiating: 3,
  offered: 3,
  apply_later: 4,
  rejected: 5,
  withdrawn: 5,
  ghosted: 5,
  archived: 6,
};

const JOB_CONTEXT_MIN = 80;

async function listEligibleJobs(userId: string) {
  const allJobs = await getJobsRepo().listByUser(userId);
  const profiles = await listProfiles(userId);
  const profileJobIds = new Set(
    profiles
      .map((p) => p.job_id as string | null)
      .filter((id): id is string => Boolean(id))
  );
  const cvs = await getCvsRepo().listByUser(userId);

  return allJobs
    .filter((j) => j.status !== 'none' && !profileJobIds.has(j.id as string))
    .map((j) => {
      const summary = typeof j.job_summary === 'string' ? j.job_summary : '';
      const jobId = j.id as string;
      const linkedCv = cvs.find((c) => {
        const ids = (c.job_ids as string[] | undefined) ?? [];
        return ids.includes(jobId);
      });
      return {
        id: jobId,
        job_title: j.job_title as string,
        company_name: j.company_name as string,
        status: j.status as JobStatus,
        job_summary: summary.trim() || null,
        needs_job_context: summary.trim().length < JOB_CONTEXT_MIN,
        has_cv: cvs.length > 0,
        linked_cv_id: (linkedCv?.id as string | undefined) ?? null,
      };
    })
    .sort((a, b) => {
      const pa = ELIGIBLE_STATUS_PRIORITY[a.status] ?? 99;
      const pb = ELIGIBLE_STATUS_PRIORITY[b.status] ?? 99;
      return pa - pb;
    });
}

type Row = Record<string, unknown>;

async function getProfileById(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewProfiles)
    .where(and(eq(interviewProfiles.id, id), eq(interviewProfiles.userId, userId)))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function getProfileByJob(userId: string, jobId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewProfiles)
    .where(and(eq(interviewProfiles.userId, userId), eq(interviewProfiles.jobId, jobId)))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function listProfiles(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(interviewProfiles)
    .where(eq(interviewProfiles.userId, userId))
    .orderBy(desc(interviewProfiles.updatedAt));
  return rows.map((r) => toSnake(r));
}

async function insertProfile(userId: string, row: Row) {
  const db = getDb();
  const mapped = fromSnake(row);
  delete mapped.userId;
  const [created] = await db
    .insert(interviewProfiles)
    .values({ ...mapped, userId } as typeof interviewProfiles.$inferInsert)
    .returning();
  return toSnake(created);
}

async function updateProfile(userId: string, id: string, patch: Row) {
  const db = getDb();
  const mapped = fromSnake(patch);
  delete mapped.id;
  delete mapped.userId;
  const [updated] = await db
    .update(interviewProfiles)
    .set(mapped as Partial<typeof interviewProfiles.$inferInsert>)
    .where(and(eq(interviewProfiles.id, id), eq(interviewProfiles.userId, userId)))
    .returning();
  if (!updated) throw new Error('Profile not found');
  return toSnake(updated);
}

async function listAudioPathsForProfile(profileId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ audioPath: interviewAnswers.audioPath })
    .from(interviewAnswers)
    .innerJoin(interviewQuestions, eq(interviewAnswers.questionId, interviewQuestions.id))
    .innerJoin(interviewSessions, eq(interviewQuestions.sessionId, interviewSessions.id))
    .where(
      and(
        eq(interviewSessions.interviewProfileId, profileId),
        isNotNull(interviewAnswers.audioPath)
      )
    );
  return rows.map((r) => r.audioPath).filter((p): p is string => Boolean(p));
}

async function deleteProfile(userId: string, id: string) {
  const db = getDb();
  const deleted = await db
    .delete(interviewProfiles)
    .where(and(eq(interviewProfiles.id, id), eq(interviewProfiles.userId, userId)))
    .returning({ id: interviewProfiles.id });
  if (!deleted.length) throw new Error('Profile not found');
}

async function deleteCompetenciesForProfile(profileId: string) {
  const db = getDb();
  await db
    .delete(interviewCompetencies)
    .where(eq(interviewCompetencies.interviewProfileId, profileId));
}

async function insertCompetencies(profileId: string, rows: Row[]) {
  if (!rows.length) return [];
  const db = getDb();
  const values = rows.map((r) => {
    const m = fromSnake(r);
    delete m.interviewProfileId;
    return { ...m, interviewProfileId: profileId } as typeof interviewCompetencies.$inferInsert;
  });
  const created = await db.insert(interviewCompetencies).values(values).returning();
  return created.map((r) => toSnake(r));
}

async function listCompetencies(profileId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(interviewCompetencies)
    .where(eq(interviewCompetencies.interviewProfileId, profileId))
    .orderBy(interviewCompetencies.priority);
  return rows.map((r) => toSnake(r));
}

async function getCompetencyById(profileId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewCompetencies)
    .where(
      and(eq(interviewCompetencies.id, id), eq(interviewCompetencies.interviewProfileId, profileId))
    )
    .limit(1);
  return row ? toSnake(row) : null;
}

async function deletePlansForProfile(profileId: string) {
  const db = getDb();
  const plans = await db
    .select({ id: interviewPreparationPlans.id })
    .from(interviewPreparationPlans)
    .where(eq(interviewPreparationPlans.interviewProfileId, profileId));
  const planIds = plans.map((p) => p.id);
  if (planIds.length) {
    await db
      .delete(interviewPreparationTopics)
      .where(inArray(interviewPreparationTopics.planId, planIds));
  }
  await db
    .delete(interviewPreparationPlans)
    .where(eq(interviewPreparationPlans.interviewProfileId, profileId));
}

async function insertPlan(profileId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.interviewProfileId;
  const [created] = await db
    .insert(interviewPreparationPlans)
    .values({ ...m, interviewProfileId: profileId } as typeof interviewPreparationPlans.$inferInsert)
    .returning();
  return toSnake(created);
}

async function insertTopics(planId: string, rows: Row[]) {
  if (!rows.length) return [];
  const db = getDb();
  const values = rows.map((r) => {
    const m = fromSnake(r);
    delete m.planId;
    return { ...m, planId } as typeof interviewPreparationTopics.$inferInsert;
  });
  const created = await db.insert(interviewPreparationTopics).values(values).returning();
  return created.map((r) => toSnake(r));
}

async function getActivePlan(profileId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewPreparationPlans)
    .where(eq(interviewPreparationPlans.interviewProfileId, profileId))
    .orderBy(desc(interviewPreparationPlans.createdAt))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function listTopics(planId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(interviewPreparationTopics)
    .where(eq(interviewPreparationTopics.planId, planId))
    .orderBy(interviewPreparationTopics.priority);
  return rows.map((r) => toSnake(r));
}

async function getProfileIdForTopic(userId: string, topicId: string) {
  const db = getDb();
  const [row] = await db
    .select({ profileId: interviewProfiles.id })
    .from(interviewPreparationTopics)
    .innerJoin(
      interviewPreparationPlans,
      eq(interviewPreparationTopics.planId, interviewPreparationPlans.id)
    )
    .innerJoin(
      interviewProfiles,
      eq(interviewPreparationPlans.interviewProfileId, interviewProfiles.id)
    )
    .where(and(eq(interviewPreparationTopics.id, topicId), eq(interviewProfiles.userId, userId)))
    .limit(1);
  return row?.profileId ?? null;
}

async function getTopicById(userId: string, topicId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      topic: interviewPreparationTopics,
      plan: interviewPreparationPlans,
      profile: interviewProfiles,
    })
    .from(interviewPreparationTopics)
    .innerJoin(
      interviewPreparationPlans,
      eq(interviewPreparationTopics.planId, interviewPreparationPlans.id)
    )
    .innerJoin(
      interviewProfiles,
      eq(interviewPreparationPlans.interviewProfileId, interviewProfiles.id)
    )
    .where(and(eq(interviewPreparationTopics.id, topicId), eq(interviewProfiles.userId, userId)))
    .limit(1);
  if (!row) return null;
  return toSnake(row.topic);
}

async function updateTopic(userId: string, topicId: string, patch: Row) {
  const existing = await getTopicById(userId, topicId);
  if (!existing) throw new Error('Topic not found');
  const db = getDb();
  const mapped = fromSnake(patch);
  delete mapped.id;
  delete mapped.planId;
  const [updated] = await db
    .update(interviewPreparationTopics)
    .set(mapped as Partial<typeof interviewPreparationTopics.$inferInsert>)
    .where(eq(interviewPreparationTopics.id, topicId))
    .returning();
  return toSnake(updated);
}

async function insertQuiz(profileId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.interviewProfileId;
  const [created] = await db
    .insert(interviewQuizzes)
    .values({ ...m, interviewProfileId: profileId } as typeof interviewQuizzes.$inferInsert)
    .returning();
  return toSnake(created);
}

async function insertQuizQuestions(quizId: string, rows: Row[]) {
  if (!rows.length) return [];
  const db = getDb();
  const values = rows.map((r) => {
    const m = fromSnake(r);
    delete m.quizId;
    return { ...m, quizId } as typeof interviewQuizQuestions.$inferInsert;
  });
  const created = await db.insert(interviewQuizQuestions).values(values).returning();
  return created.map((r) => toSnake(r));
}

async function getQuiz(userId: string, quizId: string) {
  const db = getDb();
  const [row] = await db
    .select({ quiz: interviewQuizzes })
    .from(interviewQuizzes)
    .innerJoin(interviewProfiles, eq(interviewQuizzes.interviewProfileId, interviewProfiles.id))
    .where(and(eq(interviewQuizzes.id, quizId), eq(interviewProfiles.userId, userId)))
    .limit(1);
  if (!row) return null;
  return toSnake(row.quiz);
}

async function getSession(userId: string, sessionId: string) {
  const db = getDb();
  const [row] = await db
    .select({ session: interviewSessions })
    .from(interviewSessions)
    .innerJoin(interviewProfiles, eq(interviewSessions.interviewProfileId, interviewProfiles.id))
    .where(and(eq(interviewSessions.id, sessionId), eq(interviewProfiles.userId, userId)))
    .limit(1);
  if (!row) return null;
  return toSnake(row.session);
}

async function getQuizAttemptById(userId: string, quizId: string, attemptId: string) {
  const db = getDb();
  const [row] = await db
    .select({ attempt: interviewQuizAttempts, quiz: interviewQuizzes })
    .from(interviewQuizAttempts)
    .innerJoin(interviewQuizzes, eq(interviewQuizAttempts.quizId, interviewQuizzes.id))
    .innerJoin(interviewProfiles, eq(interviewQuizzes.interviewProfileId, interviewProfiles.id))
    .where(
      and(
        eq(interviewQuizAttempts.id, attemptId),
        eq(interviewQuizAttempts.quizId, quizId),
        eq(interviewQuizAttempts.userId, userId),
        eq(interviewProfiles.userId, userId)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    ...(toSnake(row.attempt) as Record<string, unknown>),
    quiz_id: row.quiz.id,
    quiz_title: row.quiz.title,
    quiz_topic_id: row.quiz.topicId ?? null,
  };
}

async function listQuizQuestions(quizId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(interviewQuizQuestions)
    .where(eq(interviewQuizQuestions.quizId, quizId))
    .orderBy(interviewQuizQuestions.sequence);
  return rows.map((r) => toSnake(r));
}

async function insertQuizAttempt(userId: string, quizId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.userId;
  delete m.quizId;
  const [created] = await db
    .insert(interviewQuizAttempts)
    .values({ ...m, userId, quizId } as typeof interviewQuizAttempts.$inferInsert)
    .returning();
  return toSnake(created);
}

async function getInProgressQuizAttempt(userId: string, quizId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewQuizAttempts)
    .where(
      and(
        eq(interviewQuizAttempts.userId, userId),
        eq(interviewQuizAttempts.quizId, quizId),
        isNull(interviewQuizAttempts.completedAt)
      )
    )
    .orderBy(desc(interviewQuizAttempts.startedAt))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function updateQuizAttempt(userId: string, attemptId: string, patch: Row) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(interviewQuizAttempts)
    .where(and(eq(interviewQuizAttempts.id, attemptId), eq(interviewQuizAttempts.userId, userId)))
    .limit(1);
  if (!existing) throw new Error('Attempt not found');
  const mapped = fromSnake(patch);
  delete mapped.id;
  delete mapped.userId;
  delete mapped.quizId;
  const [updated] = await db
    .update(interviewQuizAttempts)
    .set(mapped as Partial<typeof interviewQuizAttempts.$inferInsert>)
    .where(eq(interviewQuizAttempts.id, attemptId))
    .returning();
  return toSnake(updated);
}

async function listQuizAttemptsForProfile(userId: string, profileId: string) {
  const db = getDb();
  const rows = await db
    .select({
      attempt: interviewQuizAttempts,
      quiz: interviewQuizzes,
      topicName: interviewPreparationTopics.name,
    })
    .from(interviewQuizAttempts)
    .innerJoin(interviewQuizzes, eq(interviewQuizAttempts.quizId, interviewQuizzes.id))
    .innerJoin(interviewProfiles, eq(interviewQuizzes.interviewProfileId, interviewProfiles.id))
    .leftJoin(
      interviewPreparationTopics,
      eq(interviewQuizzes.topicId, interviewPreparationTopics.id)
    )
    .where(
      and(eq(interviewProfiles.userId, userId), eq(interviewQuizzes.interviewProfileId, profileId))
    )
    .orderBy(desc(interviewQuizAttempts.startedAt));
  return rows.map((r) => ({
    ...(toSnake(r.attempt) as Record<string, unknown>),
    quiz_id: r.quiz.id,
    quiz_title: r.quiz.title,
    quiz_topic_id: r.quiz.topicId ?? null,
    quiz_topic_name: r.topicName ?? null,
  }));
}

async function getInProgressQuizForProfile(userId: string, profileId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      attempt: interviewQuizAttempts,
      quiz: interviewQuizzes,
      topicName: interviewPreparationTopics.name,
    })
    .from(interviewQuizAttempts)
    .innerJoin(interviewQuizzes, eq(interviewQuizAttempts.quizId, interviewQuizzes.id))
    .innerJoin(interviewProfiles, eq(interviewQuizzes.interviewProfileId, interviewProfiles.id))
    .leftJoin(
      interviewPreparationTopics,
      eq(interviewQuizzes.topicId, interviewPreparationTopics.id)
    )
    .where(
      and(
        eq(interviewProfiles.userId, userId),
        eq(interviewQuizzes.interviewProfileId, profileId),
        isNull(interviewQuizAttempts.completedAt)
      )
    )
    .orderBy(desc(interviewQuizAttempts.startedAt))
    .limit(1);
  if (!row) return null;
  return {
    ...(toSnake(row.attempt) as Record<string, unknown>),
    quiz_id: row.quiz.id,
    quiz_title: row.quiz.title,
    quiz_topic_id: row.quiz.topicId ?? null,
    quiz_topic_name: row.topicName ?? null,
  };
}

async function getActiveSession(profileId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewSessions)
    .where(
      and(eq(interviewSessions.interviewProfileId, profileId), eq(interviewSessions.status, 'active'))
    )
    .orderBy(desc(interviewSessions.startedAt))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function insertSession(profileId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.interviewProfileId;
  const [created] = await db
    .insert(interviewSessions)
    .values({ ...m, interviewProfileId: profileId } as typeof interviewSessions.$inferInsert)
    .returning();
  return toSnake(created);
}

async function updateSession(userId: string, sessionId: string, patch: Row) {
  const db = getDb();
  const [session] = await db
    .select({ session: interviewSessions })
    .from(interviewSessions)
    .innerJoin(interviewProfiles, eq(interviewSessions.interviewProfileId, interviewProfiles.id))
    .where(and(eq(interviewSessions.id, sessionId), eq(interviewProfiles.userId, userId)))
    .limit(1);
  if (!session) throw new Error('Session not found');
  const mapped = fromSnake(patch);
  delete mapped.id;
  const [updated] = await db
    .update(interviewSessions)
    .set(mapped as Partial<typeof interviewSessions.$inferInsert>)
    .where(eq(interviewSessions.id, sessionId))
    .returning();
  return toSnake(updated);
}

async function listSessions(profileId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.interviewProfileId, profileId))
    .orderBy(desc(interviewSessions.startedAt));
  return rows.map((r) => toSnake(r));
}

async function insertQuestion(sessionId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.sessionId;
  const [created] = await db
    .insert(interviewQuestions)
    .values({ ...m, sessionId } as typeof interviewQuestions.$inferInsert)
    .returning();
  return toSnake(created);
}

async function getQuestion(sessionId: string, questionId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(interviewQuestions)
    .where(and(eq(interviewQuestions.id, questionId), eq(interviewQuestions.sessionId, sessionId)))
    .limit(1);
  return row ? toSnake(row) : null;
}

async function listQuestions(sessionId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.sessionId, sessionId))
    .orderBy(interviewQuestions.sequence);
  return rows.map((r) => toSnake(r));
}

async function insertAnswer(questionId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.questionId;
  const [created] = await db
    .insert(interviewAnswers)
    .values({ ...m, questionId } as typeof interviewAnswers.$inferInsert)
    .returning();
  return toSnake(created);
}

async function insertEvaluation(answerId: string, row: Row) {
  const db = getDb();
  const m = fromSnake(row);
  delete m.answerId;
  const [created] = await db
    .insert(interviewEvaluations)
    .values({ ...m, answerId } as typeof interviewEvaluations.$inferInsert)
    .returning();
  return toSnake(created);
}

async function listAnswersForSession(sessionId: string) {
  const db = getDb();
  const questions = await db
    .select()
    .from(interviewQuestions)
    .where(eq(interviewQuestions.sessionId, sessionId))
    .orderBy(interviewQuestions.sequence);
  const result: Record<string, unknown>[] = [];
  for (const q of questions) {
    const [answer] = await db
      .select()
      .from(interviewAnswers)
      .where(eq(interviewAnswers.questionId, q.id))
      .orderBy(desc(interviewAnswers.createdAt))
      .limit(1);
    if (!answer) continue;
    const [evalRow] = await db
      .select()
      .from(interviewEvaluations)
      .where(eq(interviewEvaluations.answerId, answer.id))
      .limit(1);
    result.push({
      question: toSnake(q),
      answer: toSnake(answer),
      evaluation: evalRow ? toSnake(evalRow) : null,
    });
  }
  return result;
}

async function getLatestEvaluation(questionId: string) {
  const db = getDb();
  const answers = await db
    .select()
    .from(interviewAnswers)
    .where(eq(interviewAnswers.questionId, questionId))
    .orderBy(desc(interviewAnswers.createdAt))
    .limit(1);
  if (!answers.length) return null;
  const [evalRow] = await db
    .select()
    .from(interviewEvaluations)
    .where(eq(interviewEvaluations.answerId, answers[0].id))
    .limit(1);
  return evalRow ? toSnake(evalRow) : null;
}

async function upsertMastery(profileId: string, competencyId: string, patch: Row) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(interviewMastery)
    .where(
      and(
        eq(interviewMastery.interviewProfileId, profileId),
        eq(interviewMastery.competencyId, competencyId)
      )
    )
    .limit(1);
  const mapped = fromSnake(patch);
  if (existing) {
    const [updated] = await db
      .update(interviewMastery)
      .set(mapped as Partial<typeof interviewMastery.$inferInsert>)
      .where(eq(interviewMastery.id, existing.id))
      .returning();
    return toSnake(updated);
  }
  const [created] = await db
    .insert(interviewMastery)
    .values({
      ...mapped,
      interviewProfileId: profileId,
      competencyId,
    } as typeof interviewMastery.$inferInsert)
    .returning();
  return toSnake(created);
}

async function listMastery(profileId: string): Promise<Record<string, unknown>[]> {
  const db = getDb();
  const rows = await db
    .select({
      mastery: interviewMastery,
      competency: interviewCompetencies,
    })
    .from(interviewMastery)
    .innerJoin(interviewCompetencies, eq(interviewMastery.competencyId, interviewCompetencies.id))
    .where(eq(interviewMastery.interviewProfileId, profileId));
  return rows.map((r) => ({
    ...(toSnake(r.mastery) as Record<string, unknown>),
    name: r.competency.name,
    category: r.competency.category,
  }));
}

async function listPrepQuestions(profileId: string): Promise<Record<string, unknown>[]> {
  const db = getDb();
  const rows = await db
    .select({
      question: interviewPrepQuestions,
      topicName: interviewPreparationTopics.name,
    })
    .from(interviewPrepQuestions)
    .leftJoin(
      interviewPreparationTopics,
      eq(interviewPrepQuestions.topicId, interviewPreparationTopics.id)
    )
    .where(eq(interviewPrepQuestions.interviewProfileId, profileId))
    .orderBy(interviewPrepQuestions.sequence);
  return rows.map((r) => ({
    ...toSnake(r.question),
    topic_name: r.topicName ?? null,
  }));
}

async function listPrepQuestionTexts(
  profileId: string,
  topicId?: string | null
): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ questionText: interviewPrepQuestions.questionText })
    .from(interviewPrepQuestions)
    .where(
      topicId
        ? and(
            eq(interviewPrepQuestions.interviewProfileId, profileId),
            eq(interviewPrepQuestions.topicId, topicId)
          )
        : eq(interviewPrepQuestions.interviewProfileId, profileId)
    )
    .orderBy(interviewPrepQuestions.sequence);
  return rows.map((r) => r.questionText);
}

async function getNextPrepBatchNumber(profileId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ batchNumber: interviewPrepQuestions.batchNumber })
    .from(interviewPrepQuestions)
    .where(eq(interviewPrepQuestions.interviewProfileId, profileId))
    .orderBy(desc(interviewPrepQuestions.batchNumber))
    .limit(1);
  return rows.length ? (rows[0].batchNumber ?? 0) + 1 : 1;
}

async function getNextPrepSequence(profileId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ sequence: interviewPrepQuestions.sequence })
    .from(interviewPrepQuestions)
    .where(eq(interviewPrepQuestions.interviewProfileId, profileId))
    .orderBy(desc(interviewPrepQuestions.sequence))
    .limit(1);
  return rows.length ? (rows[0].sequence ?? 0) + 1 : 1;
}

async function insertPrepQuestions(profileId: string, rows: Row[]): Promise<Record<string, unknown>[]> {
  if (!rows.length) return [];
  const db = getDb();
  const values = rows.map((row) => {
    const m = fromSnake(row);
    delete m.interviewProfileId;
    return { ...m, interviewProfileId: profileId } as typeof interviewPrepQuestions.$inferInsert;
  });
  const created = await db.insert(interviewPrepQuestions).values(values).returning();
  return created.map((r) => toSnake(r));
}

async function getPrepQuestionById(userId: string, questionId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      question: interviewPrepQuestions,
      profile: interviewProfiles,
    })
    .from(interviewPrepQuestions)
    .innerJoin(
      interviewProfiles,
      eq(interviewPrepQuestions.interviewProfileId, interviewProfiles.id)
    )
    .where(and(eq(interviewPrepQuestions.id, questionId), eq(interviewProfiles.userId, userId)))
    .limit(1);
  if (!row) return null;
  return toSnake(row.question);
}

async function updatePrepQuestionAnswer(
  userId: string,
  questionId: string,
  answerText: string
) {
  const existing = await getPrepQuestionById(userId, questionId);
  if (!existing) throw new Error('Prep question not found');
  const db = getDb();
  const [updated] = await db
    .update(interviewPrepQuestions)
    .set({ answerText, answerSource: 'user' })
    .where(eq(interviewPrepQuestions.id, questionId))
    .returning();
  return toSnake(updated);
}

async function updatePrepQuestionExample(
  userId: string,
  questionId: string,
  exampleAnswer: string
) {
  const existing = await getPrepQuestionById(userId, questionId);
  if (!existing) throw new Error('Prep question not found');
  const db = getDb();
  const [updated] = await db
    .update(interviewPrepQuestions)
    .set({ exampleAnswer })
    .where(eq(interviewPrepQuestions.id, questionId))
    .returning();
  return toSnake(updated);
}

export function getInterviewRepo() {
  return {
    getProfileById,
    getProfileByJob,
    listProfiles,
    insertProfile,
    updateProfile,
    listAudioPathsForProfile,
    deleteProfile,
    deleteCompetenciesForProfile,
    insertCompetencies,
    listCompetencies,
    getCompetencyById,
    deletePlansForProfile,
    insertPlan,
    insertTopics,
    getActivePlan,
    listTopics,
    getTopicById,
    getProfileIdForTopic,
    updateTopic,
    insertQuiz,
    insertQuizQuestions,
    getQuiz,
    listQuizQuestions,
    insertQuizAttempt,
    getInProgressQuizAttempt,
    updateQuizAttempt,
    getQuizAttemptById,
    listQuizAttemptsForProfile,
    getInProgressQuizForProfile,
    getActiveSession,
    insertSession,
    updateSession,
    getSession,
    listSessions,
    insertQuestion,
    getQuestion,
    listQuestions,
    insertAnswer,
    insertEvaluation,
    getLatestEvaluation,
    listAnswersForSession,
    upsertMastery,
    listMastery,
    listEligibleJobs,
    listPrepQuestions,
    listPrepQuestionTexts,
    getNextPrepBatchNumber,
    getNextPrepSequence,
    insertPrepQuestions,
    getPrepQuestionById,
    updatePrepQuestionAnswer,
    updatePrepQuestionExample,
  };
}
