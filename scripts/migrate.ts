/**
 * Applies pending SQL migrations to an existing Postgres database.
 * Safe to run multiple times — migrations use IF NOT EXISTS guards.
 *
 * Usage: DATABASE_URL=postgresql://... npm run db:migrate
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    const envPath = join(process.cwd(), '.env.local');
    try {
      const envContent = readFileSync(envPath, 'utf8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      /* .env.local optional */
    }
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const migrations = [
    join(process.cwd(), 'db/migrations/029_interview_preparation.sql'),
    join(process.cwd(), 'db/migrations/030_interview_prep_questions.sql'),
    join(process.cwd(), 'db/migrations/031_interview_mapped_context_and_ai_usage.sql'),
    join(process.cwd(), 'db/migrations/032_interview_topic_prep.sql'),
    join(process.cwd(), 'db/migrations/033_prep_question_topic.sql'),
    join(process.cwd(), 'db/migrations/034_prep_question_example.sql'),
    join(process.cwd(), 'db/migrations/035_monetization.sql'),
    join(process.cwd(), 'db/migrations/036_admin_user_controls.sql'),
    join(process.cwd(), 'db/migrations/037_fractional_credits.sql'),
    join(process.cwd(), 'db/migrations/038_interview_session_timer.sql'),
  ];
  const db = postgres(url, { max: 1 });

  try {
    for (const sqlPath of migrations) {
      const migration = readFileSync(sqlPath, 'utf8');
      await db.unsafe(migration);
      console.log('Applied:', sqlPath.split('/').pop());
    }
    console.log('All migrations applied.');
  } catch (e) {
    console.error('Migration failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await db.end();
  }
}

void main();
