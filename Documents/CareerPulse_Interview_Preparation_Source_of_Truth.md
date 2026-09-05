# CareerPulse Interview Preparation Module — Source of Truth

## 1. Purpose

Build a profession-agnostic, job-specific AI Interview Preparation module as a sub-module of the existing CareerPulse web application.

The module must work across professions, job types, domains, and career levels without hard-coded profession-specific application logic.

Examples:
- Medical doctor
- Nurse
- Teacher
- Accountant
- Lawyer
- Software developer
- IT specialist
- Product manager
- Designer
- Sales professional
- Engineer
- Marketing professional
- Researcher
- Entry-level, junior, mid-level, senior, lead, manager, specialist, etc.

Core principle:

> Application code understands the interview system. AI understands the profession, role, job, candidate, competencies, questions, interview methodology, and evaluation criteria.

The existing CareerPulse database is PostgreSQL 16, accessed through Drizzle ORM and `postgres` (postgres.js). Interview data must be stored in the existing database. Do not introduce a separate database.

---

# 2. Product Goal

Turn a selected CareerPulse job into a personalized AI interview coach.

Input:

- Selected job / job description
- Candidate CV/profile already available in CareerPulse
- Optional interview date
- Optional interview stage/type
- Optional user-provided context
- Previous performance for this job, if available

Output:

1. Job-specific interview profile
2. Personalized preparation plan
3. Dynamic study topics
4. Dynamic quizzes
5. Adaptive mock interviews
6. Text answering
7. Voice answering capability
8. AI evaluation
9. Weakness detection
10. Targeted improvement recommendations
11. Interview history and progress
12. Final interview readiness score/report

The experience should be a continuous loop:

Job
→ Analyze
→ Prepare
→ Learn
→ Quiz
→ Practice
→ Mock Interview
→ Evaluate
→ Find Weaknesses
→ Targeted Practice
→ Mock Interview Again

---

# 3. Product Positioning

Do not position this as a generic AI question generator.

The product should feel like:

> “Your personal AI interview coach for this specific job.”

Generic AI:
“What are common software engineer interview questions?”

CareerPulse:
“For this job, using this job description, your CV, seniority, interview context, and previous performance, these are the areas you should prepare, these are the questions you are likely to face, and this is where you currently need improvement.”

---

# 4. Existing Application Context

CareerPulse already contains career functionality such as CV creation/analysis, job matching, and job-related generation.

The interview module should reuse existing entities and services wherever possible rather than duplicating:
- users
- CV/resume
- jobs/job descriptions
- authentication
- subscription/usage limits
- AI infrastructure
- existing UI components
- existing API conventions
- existing database conventions

Database technology:
- PostgreSQL 16
- Drizzle ORM
- `postgres` / postgres.js

Deployment/runtime details from the existing project should remain unchanged.

---

# 5. High-Level Architecture

```text
                     CAREERPULSE
                          |
                     Selected Job
                          |
             +------------+-------------+
             |                          |
            CV                     Job Description
             |                          |
             +------------+-------------+
                          |
                    AI Job Profiler
                          |
                  Candidate Analysis
                          |
                    Gap Analysis
                          |
                Interview Blueprint
                          |
        +-----------------+------------------+
        |                 |                  |
        v                 v                  v
 Preparation            Quiz             Interview
 Engine                 Engine             Engine
        |                 |                  |
        +-----------------+------------------+
                          |
                   Evaluation Engine
                          |
                    Weakness Map
                          |
                  Adaptive Engine
                          |
                Updated Preparation
```

---

# 6. Core Architectural Principle

Do NOT build profession-specific code such as:

```text
if profession == doctor
if profession == teacher
if profession == software_engineer
```

Do NOT create separate application logic for every profession.

Instead, AI produces a structured `Interview Blueprint`.

The application executes that blueprint.

The same infrastructure must be able to represent:

- technical questions
- clinical cases
- classroom scenarios
- sales role-play
- legal reasoning
- design critique
- behavioral questions
- coding questions
- architecture questions
- practical scenarios
- knowledge questions
- ethical scenarios
- communication scenarios

without changing the core interview engine.

---

# 7. User Journey

## Step 1 — Select a Job

User opens an existing saved job and chooses:

`Prepare for Interview`

If the job is not suitable or does not contain enough information, the system should explain what is missing.

---

## Step 2 — Analyze Existing Context

The system gathers:

- Job title
- Company
- Job description
- Responsibilities
- Required skills
- Preferred skills
- Qualifications
- Experience requirements
- Candidate CV/profile
- Relevant previous interview results

Do not send unnecessary full documents to the LLM on every request.

Create reusable structured summaries.

---

## Step 3 — Determine Whether Clarification Is Needed

AI should calculate whether available information is sufficient.

If sufficient:

`Generate Preparation`

If not:

Ask only the minimum useful questions.

Potential questions:

- Do you know the interview stage?
- When is the interview?
- Do you know the interview format?
- Is there a practical/case assessment?
- Is this your first interview for this role?
- Is there anything specific you are worried about?

Do not force a long questionnaire.

AI should decide what information is actually missing.

---

# 8. Job/Candidate Understanding

Create an AI analysis stage that extracts a structured representation.

Example:

```json
{
  "profession": "technology",
  "occupation": "software_engineer",
  "role": "senior_ios_engineer",
  "domain": "mobile_development",
  "seniority": "senior",
  "responsibilities": [],
  "required_competencies": [],
  "preferred_competencies": [],
  "experience_expectations": [],
  "likely_interview_methods": [],
  "evaluation_dimensions": []
}
```

For a teacher the structure can be completely different.

For a doctor it can be completely different.

The schema should be flexible enough to support profession-specific information while keeping a stable top-level structure.

---

# 9. Candidate Profile

Create/reuse a structured candidate representation.

Potential data:

```json
{
  "skills": [],
  "experience": [],
  "projects": [],
  "achievements": [],
  "leadership": [],
  "education": [],
  "certifications": [],
  "domain_experience": [],
  "potential_gaps": []
}
```

The candidate profile should be derived from existing CareerPulse CV/profile data.

Do not repeatedly send the entire CV when a structured summary is enough.

---

# 10. Competency Model

The AI must identify what the candidate is likely to be evaluated on.

Competencies are dynamic.

Software engineer example:
- Swift
- concurrency
- architecture
- testing
- system design
- leadership

Teacher example:
- classroom management
- lesson planning
- pedagogy
- subject knowledge
- student assessment
- parent communication

Doctor example:
- clinical reasoning
- patient communication
- clinical knowledge
- ethics
- decision making
- safety

Do not hard-code these lists.

Each competency should contain:

```text
id
name
category
description
importance
evidence_from_job
evidence_from_cv
candidate_mastery
priority
```

---

# 11. Gap Analysis

Compare job expectations with candidate evidence.

Conceptually:

```text
Required competency
        +
Candidate evidence
        +
Previous performance
        ↓
Candidate gap
        ↓
Priority
```

Example:

```text
System Design
Required: High
CV evidence: Medium
Practice score: Low
Priority: High
```

The gap analysis should drive the preparation plan.

---

# 12. Interview Blueprint

The Interview Blueprint is the central AI-generated object.

It should define:

```json
{
  "job_context": {},
  "candidate_context": {},
  "interview_strategy": {
    "objectives": [],
    "evaluation_dimensions": [],
    "question_categories": [],
    "question_count": 10,
    "duration_minutes": 30,
    "difficulty": "job_level",
    "adaptive": true
  },
  "preparation": {
    "topics": [],
    "priority_order": [],
    "learning_objectives": []
  },
  "quiz": {
    "question_types": [],
    "difficulty": "adaptive"
  },
  "mock_interview": {
    "question_types": [],
    "follow_up_strategy": {},
    "evaluation_strategy": {}
  }
}
```

The exact schema may evolve, but the architecture must preserve this separation.

---

# 13. Dynamic Question Types

Question types must be selected by AI based on profession, role, level, job description, and interview context.

Possible universal infrastructure types:

- conceptual
- knowledge
- multiple_choice
- multiple_select
- true_false
- short_answer
- scenario
- case_analysis
- role_play
- behavioral
- experience
- problem_solving
- coding
- debugging
- architecture
- system_design
- clinical_case
- lesson_planning
- portfolio_discussion
- design_critique
- ethical_scenario
- communication
- presentation

The list should be extensible.

The engine must not assume every type applies to every profession.

---

# 14. Profession Examples

## Software Developer

Potential:
- coding
- debugging
- architecture
- system design
- technical knowledge
- behavioral
- experience
- scenario

## Medical Doctor

Potential:
- clinical case
- diagnosis/reasoning
- treatment decision
- patient communication
- ethical scenario
- medical knowledge
- emergency scenario
- experience

## Teacher

Potential:
- classroom scenario
- lesson planning
- pedagogy
- subject knowledge
- student management
- parent communication
- behavioral
- teaching philosophy

## Sales

Potential:
- role-play
- objection handling
- negotiation
- product pitch
- customer scenario
- performance analysis
- behavioral

The application must not contain special branching for these professions.

---

# 15. Career Levels

The system must work across all reasonable career levels.

AI should infer seniority from:
- job title
- required years of experience
- responsibilities
- qualifications
- leadership expectations
- candidate experience

Potential normalized levels:

- trainee
- intern
- entry
- junior
- mid
- senior
- lead
- principal
- specialist
- manager
- director
- executive

Profession-specific levels can be represented as additional metadata rather than forcing them into a rigid global enum.

---

# 16. Interview Stage

The same job may have multiple interview stages.

Support a generic stage model.

Possible examples:

- recruiter screening
- hiring manager
- technical
- behavioral
- panel
- practical
- case study
- assessment
- final
- presentation
- teaching demonstration
- clinical assessment

Do not hard-code a finite list that prevents new stage types.

Store:

```text
stage_type
stage_name
objectives
context
```

AI decides which stage is appropriate.

---

# 17. Preparation Engine

The preparation engine receives:

- Interview Blueprint
- Candidate Profile
- Gap Analysis
- Interview date/time if known

It generates a personalized plan.

Example:

```text
Day 1
Topic A
Topic B
Quiz

Day 2
Topic C
Scenario practice

Day 3
Weak area practice

Day 4
Mock interview

Day 5
Final simulation
```

If the interview is in 5 days, generate a 5-day plan.

If the interview is in 30 days, generate a longer plan.

If no date exists, create a flexible plan.

---

# 18. Preparation Topic Structure

Each topic should have:

```text
topic_id
name
category
description
importance
priority
estimated_minutes
learning_objectives
recommended_activities
mastery_score
```

Activities may include:

- read/learn
- quiz
- practice question
- scenario
- mock interview
- retry weak question

The AI determines which activities are appropriate.

---

# 19. Quiz Engine

Quiz generation is AI-driven.

Input:
- Interview Blueprint
- Competencies
- Preparation topics
- Candidate mastery
- Desired difficulty

AI generates questions.

The quiz engine must support multiple formats.

Each question should contain structured data such as:

```json
{
  "question": "...",
  "type": "scenario",
  "competency": "...",
  "difficulty": "medium",
  "options": [],
  "correct_answer": "...",
  "explanation": "...",
  "evaluation_points": []
}
```

For subjective questions, do not rely on a single exact answer.

Use evaluation criteria/rubrics.

---

# 20. Quiz Evaluation

For objective questions:

- determine correctness
- provide explanation
- update mastery

For subjective questions:

- evaluate using AI
- score against expected concepts
- identify missing points
- provide feedback
- update competency mastery

Example:

```json
{
  "score": 8,
  "strengths": [],
  "weaknesses": [],
  "missing_points": [],
  "feedback": "...",
  "recommended_practice": []
}
```

---

# 21. Mock Interview Engine

The mock interview should be conversational.

Basic loop:

```text
AI question
    ↓
Candidate answer
    ↓
Evaluate
    ↓
Decide:
  follow-up?
  clarify?
  next competency?
    ↓
Next question
```

Do not pre-generate an entire rigid question list and blindly execute it.

The AI should adapt to answers.

---

# 22. Practice Mode vs Realistic Mode

Support two primary modes.

## Practice Mode

AI provides feedback after each answer.

```text
Question
→ Answer
→ Feedback
→ Improvement
→ Next
```

## Realistic Mode

AI does not provide detailed feedback during the interview.

```text
Question
→ Answer
→ Next question
→ ...
→ Final evaluation
```

Realistic mode should feel closer to an actual interview.

---

# 23. Adaptive Interviewing

The AI should adjust difficulty and follow-ups.

Strong answer:

```text
Good answer
→ deeper follow-up
```

Weak answer:

```text
Weak answer
→ clarification/easier question
→ assess same competency again
```

Avoid asking the same thing repeatedly.

The interviewer should balance:

- coverage
- depth
- difficulty
- candidate performance
- interview time

---

# 24. Voice Answering

The product should support:

```text
Microphone
→ audio capture
→ speech-to-text
→ transcript
→ evaluation
```

MVP can use asynchronous transcription.

The UX should support:

- start recording
- stop recording
- transcript preview
- retry
- text fallback

Later support real-time voice conversation.

Do not make real-time voice a prerequisite for the first implementation.

---

# 25. Voice Evaluation

Do not judge users negatively because of accent.

Focus on useful communication signals:

- clarity
- structure
- relevance
- conciseness
- filler words
- excessive pauses
- answer length
- completeness

If speech analytics are unavailable or unreliable, do not fabricate scores.

---

# 26. Interview Evaluation Engine

Evaluation dimensions must be dynamic.

The AI determines the appropriate dimensions.

Examples:

Doctor:
- clinical reasoning
- patient communication
- safety
- ethics
- medical knowledge

Teacher:
- pedagogy
- classroom management
- communication
- empathy
- planning

Software engineer:
- technical knowledge
- problem solving
- architecture
- trade-offs
- communication

Universal evaluation output:

```json
{
  "overall_score": 7.8,
  "dimensions": [
    {
      "name": "...",
      "score": 8,
      "feedback": "..."
    }
  ],
  "strengths": [],
  "weaknesses": [],
  "missing_points": [],
  "recommendations": [],
  "follow_up_needed": false
}
```

---

# 27. Evidence-Based Evaluation

AI feedback should be grounded in the candidate's actual answer.

Avoid generic feedback.

Bad:
“You should improve your technical skills.”

Good:
“You identified the main trade-off, but your answer did not explain why you selected this approach or what downside it introduced.”

Where practical, evaluations should include evidence/reasoning metadata internally.

---

# 28. Behavioral Evaluation

For behavioral questions, AI may dynamically select an appropriate framework.

STAR can be used when appropriate:

- Situation
- Task
- Action
- Result

But do not force STAR on every profession/question.

For a technical or clinical question, another rubric may be more appropriate.

---

# 29. Answer Improvement

After evaluation:

```text
Your score: 6.5/10

Strengths:
- ...
- ...

Improve:
- ...
- ...

Missing:
- ...

Try again
```

When the user retries:

```text
Attempt 1: 6.5
Attempt 2: 8.2
```

Store attempts and improvement.

This creates a learning loop.

---

# 30. Weakness Map

Maintain a competency-level performance map.

Example:

```text
Competency              Mastery

Communication              82
Problem solving            74
System design              52
Leadership                 69
Technical knowledge        81
```

This should be updated from:

- quizzes
- practice questions
- mock interviews
- answer retries

The latest evidence should influence recommendations.

---

# 31. Interview Readiness Score

Create a CareerPulse-specific readiness score.

Example:

```text
Interview Readiness
76%

Technical                 82
Job-specific              78
Architecture              71
Behavioral                69
Communication             81
```

Do not represent this as a probability of getting hired.

Use wording such as:

> “Based on your CareerPulse practice performance.”

The score is a practice/readiness indicator, not a hiring prediction.

---

# 32. Readiness Calculation

The exact formula should be configurable.

Potential inputs:

- competency mastery
- recent interview scores
- quiz scores
- consistency
- coverage
- performance trend
- weaknesses
- interview stage importance

Do not simply average all scores.

Important competencies should have higher weight based on the AI-generated blueprint.

---

# 33. Interview History

For each job:

```text
Interview 1
61%

Interview 2
68%

Interview 3
76%

Interview 4
82%
```

Track:

- score
- date
- type
- duration
- competency performance
- improvement
- weaknesses

This creates a reason for users to return.

---

# 34. Preparation Dashboard

The main dashboard should answer:

1. What job am I preparing for?
2. How ready am I?
3. What are my weak areas?
4. What should I do next?
5. When is my interview?
6. How am I improving?

Example:

```text
Senior iOS Engineer
Company X

Interview Readiness
72%

Technical          78%
Behavioral         65%
Architecture       61%
Communication      81%

Highest Priority
System Design

Today's Recommendation
Practice 3 system-design scenarios

[Practice Now]
[Take Quiz]
[Start Mock Interview]
```

The exact categories must be dynamic.

---

# 35. “Likely Questions” Feature

Generate a prioritized list of questions based on:

- JD
- CV
- role
- seniority
- interview stage
- competency importance
- common interview methodology where appropriate

Each question can show why it was selected:

```text
High likelihood

Reason:
- explicitly required by job
- relevant to candidate CV
- important for role level
```

Avoid claiming certainty.

Use “likely”, “high priority”, or similar language.

---

# 36. Interview Risk Areas

AI should identify potential risks before the interview.

Example:

```text
High Risk
System Design
Strong requirement, limited CV evidence,
weak practice performance.

Medium Risk
Leadership
Required at senior level, limited evidence.

Low Risk
Swift
Strong CV evidence and practice results.
```

This should directly link to preparation actions.

---

# 37. Pre-Interview Cheat Sheet

Provide a compact preparation screen:

```text
Your strengths
- ...
- ...

Watch out for
- ...
- ...

Important topics
- ...
- ...

Your strongest experience stories
- ...
- ...

Likely question themes
- ...
- ...

Questions to ask the interviewer
- ...
- ...
```

This should be generated for the selected job.

---

# 38. Questions to Ask the Interviewer

AI can generate personalized questions based on:

- job
- company
- role
- responsibilities
- candidate level

Examples:

- What would success look like in the first six months?
- What are the biggest challenges for this role?
- How is the team structured?

Do not make this the core MVP; it is a useful supporting feature.

---

# 39. AI Prompt Architecture

Do not create one huge prompt for the entire system.

Create specialized AI operations.

Suggested operations:

```text
analyze_job_for_interview
analyze_candidate_for_interview
build_competency_model
perform_gap_analysis
build_interview_blueprint
generate_preparation_plan
generate_quiz
evaluate_quiz_answer
generate_interview_question
evaluate_interview_answer
decide_follow_up
generate_final_report
generate_improvement_plan
generate_cheat_sheet
```

Each operation should have:

- clearly defined input
- clearly defined output schema
- strict JSON validation
- appropriate context
- token limits
- error handling

---

# 40. AI Structured Output

Never rely on free-form AI text for core application state.

Use schema-validated JSON.

Example question:

```json
{
  "question": "...",
  "type": "scenario",
  "competency_id": "...",
  "difficulty": "medium",
  "expected_points": [],
  "evaluation_rubric": []
}
```

Example evaluation:

```json
{
  "overall_score": 7.5,
  "dimension_scores": [],
  "strengths": [],
  "weaknesses": [],
  "missing_points": [],
  "feedback": "...",
  "follow_up_needed": true,
  "recommended_action": "..."
}
```

The backend should reject malformed AI output and retry/repair safely.

---

# 41. AI Context Management

Avoid sending unnecessary historical data.

Use layers:

## Stable context

- candidate summary
- job analysis
- competency model
- blueprint

## Session context

- current interview
- previous questions
- recent answers
- current competency

## Historical context

- summarized previous performance
- mastery scores
- major weaknesses

This reduces cost and improves consistency.

---

# 42. AI Safety / Quality Rules

The AI must:

- avoid fabricating facts about the job
- distinguish job-derived facts from general assumptions
- not claim guaranteed interview questions
- not claim hiring probability
- not invent candidate experience
- not evaluate information absent from the answer
- ask for clarification when important information is insufficient
- avoid irrelevant questions
- stay within job/profession context
- maintain appropriate difficulty
- explain uncertainty where necessary

For high-stakes professions such as healthcare or law, the product should frame content as interview preparation rather than professional advice.

---

# 43. Database Design

Use the existing PostgreSQL 16 database.

Use Drizzle ORM and postgres.js consistently with the existing application.

Do not introduce another database.

Suggested logical entities:

```text
interview_profiles
interview_competencies
interview_preparation_plans
interview_preparation_topics
interview_quizzes
interview_quiz_questions
interview_quiz_attempts
interview_sessions
interview_questions
interview_answers
interview_evaluations
interview_mastery
```

Reuse existing `users`, `jobs`, `resumes`/CV tables where available.

Before implementing, inspect the existing schema and use the actual existing table names.

---

# 44. `interview_profiles`

Purpose: one personalized interview context for one candidate + job.

Suggested fields:

```text
id
user_id
job_id
resume_id
status
profession
occupation
role
domain
seniority
interview_stage
interview_date
candidate_summary
job_summary
blueprint_json
readiness_score
created_at
updated_at
```

Do not duplicate data that should remain relational unless there is a strong reason.

JSON is appropriate for AI-generated flexible blueprint data.

---

# 45. `interview_competencies`

Suggested fields:

```text
id
interview_profile_id
name
category
description
importance
priority
evidence_from_job
evidence_from_candidate
mastery_score
metadata_json
created_at
updated_at
```

Competencies should be generated dynamically.

---

# 46. `interview_preparation_plans`

Suggested:

```text
id
interview_profile_id
title
duration_days
status
plan_json
created_at
updated_at
```

The JSON can hold AI-generated scheduling details, while important queryable data should remain relational.

---

# 47. `interview_preparation_topics`

Suggested:

```text
id
plan_id
competency_id
name
description
priority
estimated_minutes
learning_objectives_json
mastery_score
status
created_at
updated_at
```

---

# 48. `interview_quizzes`

Suggested:

```text
id
interview_profile_id
topic_id
title
difficulty
question_count
metadata_json
created_at
```

---

# 49. `interview_quiz_questions`

Suggested:

```text
id
quiz_id
sequence
question_type
question_text
options_json
correct_answer_json
evaluation_rubric_json
explanation
competency_id
difficulty
metadata_json
```

For subjective questions, store rubric rather than pretending there is always one exact answer.

---

# 50. `interview_quiz_attempts`

Suggested:

```text
id
quiz_id
user_id
score
answers_json
evaluation_json
started_at
completed_at
```

If answer-level analytics are important, use a separate attempt-answer table later.

---

# 51. `interview_sessions`

Suggested:

```text
id
interview_profile_id
type
mode
difficulty
status
question_count
started_at
completed_at
overall_score
evaluation_json
created_at
```

Examples:

```text
type:
- mock
- technical
- behavioral
- case
- final
```

But keep type extensible.

---

# 52. `interview_questions`

Suggested:

```text
id
session_id
sequence
question_type
question_text
competency_id
difficulty
expected_points_json
evaluation_rubric_json
parent_question_id
created_at
```

`parent_question_id` can represent follow-up questions.

---

# 53. `interview_answers`

Suggested:

```text
id
question_id
text_answer
transcript
audio_url
duration_seconds
attempt_number
created_at
```

Audio should be stored using the existing storage infrastructure where possible.

Do not store large binary audio directly in PostgreSQL.

---

# 54. `interview_evaluations`

Suggested:

```text
id
answer_id
overall_score
dimension_scores_json
strengths_json
weaknesses_json
missing_points_json
feedback
recommended_actions_json
ai_metadata_json
created_at
```

---

# 55. `interview_mastery`

Suggested:

```text
id
interview_profile_id
competency_id
mastery_score
confidence
evidence_count
last_assessed_at
trend
```

This provides the persistent weakness/progress map.

---

# 56. Database Relationships

Conceptually:

```text
User
 |
 +-- Job
 |
 +-- Resume
 |
 +-- Interview Profile
        |
        +-- Competencies
        |
        +-- Preparation Plan
        |      |
        |      +-- Topics
        |
        +-- Quizzes
        |      |
        |      +-- Questions
        |      +-- Attempts
        |
        +-- Interview Sessions
               |
               +-- Questions
               |     |
               |     +-- Answers
               |            |
               |            +-- Evaluations
               |
               +-- Mastery
```

---

# 57. API Design

Follow the existing CareerPulse API conventions.

Suggested endpoints:

```text
POST /api/interview/analyze
POST /api/interview/clarify
POST /api/interview/prepare
GET  /api/interview/profiles/:id

POST /api/interview/quizzes
GET  /api/interview/quizzes/:id
POST /api/interview/quizzes/:id/submit

POST /api/interview/sessions
GET  /api/interview/sessions/:id
POST /api/interview/sessions/:id/answer
POST /api/interview/sessions/:id/follow-up
POST /api/interview/sessions/:id/complete

GET /api/interview/profiles/:id/readiness
GET /api/interview/profiles/:id/progress
GET /api/interview/profiles/:id/report
POST /api/interview/questions/:id/retry
```

Before implementation, inspect existing API route patterns and naming conventions and follow them instead of blindly copying this list.

---

# 58. API Responsibilities

## Analyze

Creates/updates:

- job analysis
- candidate analysis
- competency model
- gap analysis

## Prepare

Creates:

- interview blueprint
- preparation plan
- topics

## Quiz

Generates or retrieves quiz content.

## Submit Quiz

Evaluates answers and updates mastery.

## Start Session

Creates interview session.

## Answer

Stores answer, evaluates it, and decides next action.

## Follow-up

Generates the next adaptive follow-up when required.

## Complete

Generates final interview evaluation and updates mastery/readiness.

---

# 59. Frontend Routes / Screens

Suggested module structure:

```text
/interview
/interview/[profileId]
/interview/[profileId]/prepare
/interview/[profileId]/quiz/[quizId]
/interview/[profileId]/practice
/interview/[profileId]/mock
/interview/[profileId]/mock/[sessionId]
/interview/[profileId]/report
```

Follow existing CareerPulse routing conventions.

---

# 60. Main UI Screens

## Interview Landing

- selected job
- readiness
- preparation progress
- next action

## Preparation

- plan
- topics
- priority
- completion

## Topic Detail

- learning objectives
- practice
- quiz
- mastery

## Quiz

- question
- answer
- progress
- explanation
- score

## Interview Lobby

- interview type
- duration
- mode
- difficulty
- voice/text

## Interview Room

- AI question
- transcript
- recording
- progress
- answer controls

## Report

- overall score
- dynamic dimensions
- strengths
- weaknesses
- question review
- recommendations

---

# 61. Maximum UX Principles

The experience should minimize friction.

Use:

- one-click “Prepare for Interview” from a job
- progressive disclosure
- minimal setup
- AI-generated defaults
- clear next action
- autosave
- resume interrupted interview
- keyboard support
- accessible controls
- responsive desktop/mobile UI
- text fallback for voice
- clear recording state
- visible transcript
- progress indicator
- retry question
- skip question when appropriate

Do not force the user through long forms.

---

# 62. Interview Room UX

Recommended structure:

```text
------------------------------------------------
AI Interviewer

Question 4 / 10

“Question text...”

[ AI avatar/status ]

-----------------------------------------------

Transcript / Answer area

“Candidate's answer...”

[ Type answer................................. ]

        🎤 Record

[Finish Answer]

-----------------------------------------------
```

In realistic mode, avoid showing detailed evaluation during the interview.

---

# 63. Voice UX

States:

```text
Idle
Listening
Processing
Transcript Ready
Evaluating
Next Question
```

Make these states explicit.

The user should always know whether the system is recording.

Provide:

- stop
- retry
- cancel
- text alternative

Do not lose the answer on a transient error.

---

# 64. Interrupted Session Handling

If the user closes the browser:

- persist current session state
- persist current question
- persist draft answer where practical
- allow resume

Session state should be server-backed.

Do not rely only on browser memory.

---

# 65. Cost Management

AI is the heavy component, so design for cost control.

Use:

- structured summaries
- cached job analysis
- cached candidate profile
- cached interview blueprint
- targeted context
- appropriate model selection
- retry only on malformed output
- avoid regenerating unchanged content
- store generated questions
- reuse preparation content

Do not call the LLM unnecessarily for every UI action.

---

# 66. AI Generation Lifecycle

Preferred:

```text
Job selected
    ↓
Check existing interview profile
    ↓
If valid:
    reuse
Else:
    analyze
    ↓
Generate blueprint
    ↓
Persist
```

When the job/CV changes significantly:

```text
invalidate/rebuild relevant analysis
```

Do not silently keep stale interview content after major job changes.

---

# 67. Caching / Regeneration

Every generated artifact should have a way to determine:

- source version
- AI model/version
- prompt version
- generated_at

Suggested metadata:

```json
{
  "model": "...",
  "prompt_version": "v1",
  "source_job_version": "...",
  "source_resume_version": "...",
  "generated_at": "..."
}
```

This helps future regeneration and debugging.

---

# 68. AI Versioning

Prompts will evolve.

Treat prompt versions as application code.

Example:

```text
INTERVIEW_BLUEPRINT_PROMPT_V1
INTERVIEW_EVALUATION_PROMPT_V1
```

When prompts materially change, increment versions.

Do not overwrite historical evaluation meaning without tracking the version.

---

# 69. Error Handling

Handle:

- AI timeout
- malformed JSON
- AI refusal
- rate limits
- transcription failure
- audio upload failure
- database failure
- duplicate generation
- user closing browser
- insufficient job information

User-facing messages should be simple.

Example:

> “We couldn't generate the next question. Your progress is saved. Try again.”

Do not expose raw LLM/API errors.

---

# 70. Concurrency / Duplicate Requests

Generation endpoints must be idempotent where possible.

For example, double-clicking:

`Generate Preparation`

must not create two different preparation plans accidentally.

Use:

- status fields
- unique constraints
- generation keys
- transactions where appropriate

---

# 71. Security

All interview records must be scoped to the authenticated user.

Never trust:

```text user_id
```

from the browser.

Derive user identity from the existing authentication/session system.

Check ownership for:

- job
- CV
- interview profile
- quiz
- interview session
- audio
- evaluation

---

# 72. AI Data Privacy

Interview answers may contain personal information.

Do not log full user answers unnecessarily.

Avoid logging:
- raw transcripts
- audio
- CV content
- private job information

unless required for debugging and handled according to the application's privacy policy.

---

# 73. Subscription / Usage

The interview feature should integrate with existing CareerPulse subscription/usage logic.

Potential usage units:

- preparation generation
- quiz generation
- mock interview
- advanced interview
- voice interview

Do not hard-code billing rules inside the AI engine.

Create a usage/service layer that can be changed independently.

---

# 74. MVP Scope

Build the universal architecture but keep the first release focused.

### MVP includes

1. Job + CV analysis
2. Profession/role/seniority detection
3. Dynamic competency model
4. Gap analysis
5. AI interview blueprint
6. Personalized preparation plan
7. Dynamic quiz
8. Text mock interview
9. Adaptive follow-up
10. Answer evaluation
11. Readiness score
12. Weakness analysis
13. Interview report
14. Retry weak questions
15. Persistent interview history

This is enough to release a meaningful product.

---

# 75. Phase 2

Add:

- voice recording
- speech-to-text
- communication analytics
- answer improvement
- multiple interview stages
- interview date-driven planning
- pre-interview cheat sheet
- likely-question predictions
- interviewer style
- more quiz formats

---

# 76. Phase 3

Add:

- real-time voice conversation
- advanced role-play
- coding editor
- system-design canvas
- presentation evaluation
- document/image-based practical tasks
- advanced company research
- richer interview analytics

The architecture should allow these without rewriting the core engine.

---

# 77. Testing Strategy

## Unit tests

Test:

- database repositories
- schema validation
- score calculations
- readiness calculation
- mastery updates
- session state transitions
- authorization
- usage limits

## AI contract tests

Given fixed input, verify AI output conforms to schema.

Test:
- malformed JSON
- missing fields
- invalid enum
- unexpected question type
- invalid score

## Integration tests

Test:

```text
Job
→ Interview Profile
→ Blueprint
→ Preparation
→ Quiz
→ Attempt
→ Interview
→ Evaluation
→ Readiness
```

## UI tests

Test:
- starting interview
- answering
- retrying
- resuming
- completing
- error states
- voice fallback

---

# 78. AI Evaluation Testing

Build a test dataset containing different professions.

At minimum:

```text
Software Engineer
Teacher
Medical Doctor
Sales Representative
Accountant
Designer
Project Manager
Lawyer
```

And different levels:

```text
Entry
Junior
Mid
Senior
Manager
```

Verify that the engine:

- identifies appropriate competencies
- generates relevant question types
- adapts difficulty
- produces meaningful rubrics
- avoids profession leakage
- does not use software-specific questions for unrelated jobs

---

# 79. Golden Test Cases

Maintain fixed job/CV fixtures.

Example:

```text
Fixture A
Senior iOS Engineer

Fixture B
High School Teacher

Fixture C
Medical Doctor

Fixture D
Sales Manager
```

The goal is not to require exact AI wording.

Test structural and semantic properties:

- correct profession/domain
- relevant competency categories
- valid question types
- valid scores
- valid blueprint
- no missing required fields

---

# 80. Observability

Track internal metrics:

- AI generation success rate
- JSON validation failure rate
- retry rate
- average latency
- token usage
- estimated AI cost
- quiz completion
- interview completion
- voice transcription failure
- interview abandonment
- average readiness improvement

Do not store unnecessary personal content in analytics.

---

# 81. Recommended Implementation Order

## Phase A — Foundation

1. Inspect existing CareerPulse architecture.
2. Inspect existing Drizzle schema.
3. Identify existing users/jobs/CV entities.
4. Identify existing AI service.
5. Identify existing authentication.
6. Identify existing subscription/usage system.
7. Define interview module domain types.
8. Create database migrations.

## Phase B — AI Intelligence

9. Job profiler
10. Candidate profiler
11. Competency extraction
12. Gap analysis
13. Interview blueprint
14. Preparation plan

## Phase C — Preparation

15. Preparation dashboard
16. Topics
17. Quiz generation
18. Quiz evaluation
19. Mastery tracking

## Phase D — Interview

20. Interview session creation
21. Question generation
22. Answer submission
23. Answer evaluation
24. Adaptive follow-up
25. Session completion

## Phase E — Reporting

26. Readiness calculation
27. Weakness map
28. Interview report
29. Retry/improvement loop
30. Interview history

## Phase F — Voice

31. Audio recording
32. Storage
33. Transcription
34. Transcript evaluation
35. Voice UX/error handling

---

# 82. Definition of Done

The feature is ready for initial release when:

- A user can select any saved job.
- The system uses the job and user's CV.
- AI determines profession/role/seniority.
- AI creates a dynamic competency model.
- AI identifies candidate gaps.
- AI creates a job-specific preparation plan.
- AI generates appropriate quiz content.
- Quiz answers are evaluated.
- User can start a text mock interview.
- Questions adapt based on answers.
- Answers are evaluated.
- Feedback is specific and evidence-based.
- Weak areas are persisted.
- Readiness score updates.
- User can retry weak questions.
- User can see interview history.
- Data is stored in PostgreSQL through Drizzle/postgres.js.
- Authentication/authorization is enforced.
- Existing CareerPulse architecture and conventions are followed.
- No profession-specific branching is required in the application.
- The system works with multiple professions and career levels.

---

# 83. Critical Design Rules for the Coding LLM

When handing this specification to a coding LLM, explicitly enforce:

1. First inspect the existing repository.
2. Do not rewrite existing CareerPulse architecture.
3. Reuse existing authentication.
4. Reuse existing users/jobs/CV entities.
5. Reuse existing AI service infrastructure.
6. Reuse existing subscription/usage infrastructure.
7. Reuse existing UI/design system.
8. Use PostgreSQL 16.
9. Use Drizzle ORM.
10. Use postgres.js.
11. Create proper migrations.
12. Keep interview functionality modular.
13. Do not hard-code professions.
14. Do not hard-code interview categories.
15. Do not hard-code evaluation dimensions.
16. Do not hard-code question counts unless used as AI defaults.
17. Use AI-generated structured blueprints.
18. Validate every AI response.
19. Persist generated artifacts.
20. Make generation operations idempotent.
21. Enforce user ownership on every resource.
22. Do not expose AI/API secrets to the client.
23. Do not send entire CV/job context unnecessarily.
24. Keep prompts versioned.
25. Make the system extensible for voice and advanced interview formats.
26. Do not build a separate database.
27. Do not create profession-specific tables.
28. Do not make the UI depend on one profession's concepts.
29. Handle AI failure gracefully.
30. Preserve existing application functionality.

---

# 84. Final Architecture Principle

The most important rule of the entire module is:

```text
                  CAREERPULSE CODE
                         |
              "How does an interview work?"
                         |
                         v
              Generic Interview Engine
                         ^
                         |
              "What should this interview
               contain and evaluate?"
                         |
                         |
                    AI ENGINE
                         |
       +-----------------+----------------+
       |                 |                |
       v                 v                v
    Profession         Job Level       Context
       |                 |                |
       +-----------------+----------------+
                         |
                         v
                Interview Blueprint
```

The code should provide the **platform**.

The AI should provide the **intelligence**.

That is what allows one CareerPulse interview module to support radically different professions and job levels without creating a separate product for each profession.
