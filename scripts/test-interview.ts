import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeAnswerEvaluation,
  normalizeBlueprint,
  normalizeCompetencies,
  normalizeJobAnalysis,
  normalizeCandidateAnalysis,
  normalizePreparationPlan,
  normalizeQuizOutput,
  normalizeQuizQuestion,
} from '../lib/interview/validators';
import { calculateReadiness } from '../lib/interview/readiness';
import { evaluateQuizAnswerLocal } from '../lib/interview/quiz-eval';
import { updateMasteryScore } from '../lib/interview/mastery';
import { hashJobContext, hashCvContext } from '../lib/interview/hashing';
import { estimateTokensFromText } from '../lib/ai/token-estimate';
import { mappedContextPrompt, buildMappedContext } from '../lib/interview/mapped-context';

describe('interview validators', () => {
  it('normalizes job analysis with defaults', () => {
    const result = normalizeJobAnalysis({});
    assert.equal(result.profession, 'general');
    assert.ok(Array.isArray(result.evaluation_dimensions));
  });

  it('normalizes blueprint question count bounds', () => {
    const bp = normalizeBlueprint({
      interview_strategy: { question_count: 999, duration_minutes: 5 },
    });
    assert.equal(bp.interview_strategy.question_count, 10);
    assert.equal(bp.interview_strategy.duration_minutes, 15);
  });

  it('caps preparation topics at 10 without time estimates', () => {
    const topics = Array.from({ length: 15 }, (_, i) => ({ name: `Topic ${i}`, priority: i }));
    const plan = normalizePreparationPlan({ title: 'T', topics });
    assert.equal(plan.topics.length, 10);
    assert.equal(plan.duration_days, undefined);
    assert.equal('estimated_minutes' in plan.topics[0], false);
  });

  it('rejects unknown quiz question types', () => {
    const question = normalizeQuizQuestion({
      question: 'Test?',
      type: 'clinical_case',
      difficulty: 'high',
      correct_answer: 'A',
      options: ['A', 'B'],
    });
    assert.equal(question, null);
  });

  it('accepts objective quiz questions with correct answers', () => {
    const quiz = normalizeQuizOutput({
      questions: [
        {
          question: 'Pick one',
          type: 'single_choice',
          difficulty: 'medium',
          options: ['A', 'B'],
          correct_answer: 'A',
          explanation: 'Because A',
        },
      ],
    });
    assert.equal(quiz.questions[0].type, 'single_choice');
  });

  it('clamps evaluation scores', () => {
    const ev = normalizeAnswerEvaluation({ overall_score: 99, recommended_action: 'bogus' });
    assert.equal(ev.overall_score, 10);
    assert.equal(ev.recommended_action, 'next_competency');
  });

  it('normalizes competencies from array', () => {
    const comps = normalizeCompetencies([
      { name: 'Communication', importance: 'high', priority: 1 },
    ]);
    assert.equal(comps.length, 1);
    assert.equal(comps[0].importance, 'high');
  });
});

describe('readiness calculation', () => {
  it('allocates 70% across completed topics only', () => {
    const topics = Array.from({ length: 7 }, (_, i) => ({
      status: i < 3 ? 'done' : 'pending',
    }));
    const r = calculateReadiness({ topics, quizAttempts: [], sessions: [] });
    assert.equal(r.topic_points, 30);
    assert.equal(r.overall, 30);
    assert.equal(r.topics_done, 3);
    assert.equal(r.topics_total, 7);
  });

  it('adds 15% for quiz and 15% for mock participation regardless of score', () => {
    const topics = Array.from({ length: 7 }, () => ({ status: 'done' }));
    const r = calculateReadiness({
      topics,
      quizAttempts: [{ completed_at: '2026-01-01T00:00:00Z', score: 20 }],
      sessions: [{ status: 'completed', completed_at: '2026-01-02T00:00:00Z', overall_score: 40 }],
    });
    assert.equal(r.topic_points, 70);
    assert.equal(r.quiz_points, 15);
    assert.equal(r.mock_points, 15);
    assert.equal(r.overall, 100);
  });
});

describe('quiz local evaluation', () => {
  it('matches true/false answers with boolean storage', () => {
    const result = evaluateQuizAnswerLocal('true_false', true, 'true');
    assert.equal(result.correct, true);
  });

  it('matches multiple select answers regardless of order', () => {
    const result = evaluateQuizAnswerLocal('multiple_select', ['B', 'A'], 'A|||B');
    assert.equal(result.correct, true);
  });
});

describe('mastery updates', () => {
  it('increases score on strong answer', () => {
    const u = updateMasteryScore(50, 9, 2);
    assert.ok(u.masteryScore > 50);
  });
});

describe('hashing', () => {
  it('hashes job context consistently', () => {
    const input = {
      jobTitle: 'Software Engineer',
      companyName: 'Acme',
      jobSummary: 'Build APIs',
      keywords: ['node', 'api'],
    };
    const a = hashJobContext(input);
    const b = hashJobContext(input);
    assert.equal(a, b);
  });

  it('hashes cv context consistently', () => {
    const cv = { professional_title: 'Jane Doe', summary: '5 years backend', skills: [] };
    const a = hashCvContext(cv);
    const b = hashCvContext(cv);
    assert.equal(a, b);
  });
});

describe('mapped context', () => {
  it('builds prompt from mapped context', () => {
    const ctx = buildMappedContext({
      jobAnalysis: {
        profession: 'software',
        occupation: 'engineer',
        role: 'Engineer',
        domain: 'tech',
        seniority: 'mid',
        responsibilities: ['API design'],
        required_competencies: ['Node.js'],
        preferred_competencies: [],
        experience_expectations: [],
        likely_interview_methods: [],
        evaluation_dimensions: [],
        summary: 'Backend role',
      },
      candidateAnalysis: {
        summary: 'Strong TypeScript developer',
        skills: ['TypeScript'],
        achievements: [],
        experience_highlights: ['5 years'],
        potential_gaps: ['Kubernetes'],
        domain_experience: [],
      },
      competencies: [
        {
          id: 'c1',
          name: 'API design',
          importance: 'high',
          priority: 1,
          category: 'technical',
          description: '',
          evidence_from_job: '',
          evidence_from_candidate: '',
          candidate_mastery: 50,
        },
      ],
      gaps: [],
      topicNames: ['System design'],
    });
    const prompt = mappedContextPrompt(ctx);
    assert.ok(prompt.includes('System design'));
  });
});

describe('token estimate', () => {
  it('estimates tokens from text length', () => {
    const tokens = estimateTokensFromText('hello world');
    assert.ok(tokens > 0);
  });
});
