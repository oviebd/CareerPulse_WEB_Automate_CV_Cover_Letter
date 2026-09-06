'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useStartInterview } from '@/hooks/useInterview';
import { ApiError } from '@/lib/api-fetch';
import { AiWorkingOverlay } from '@/components/shared/AiWorkingOverlay';
import {
  SUGGESTED_TOPIC_CHIPS,
  TOPIC_EXPERTISE_LEVELS,
  TOPIC_PURPOSES,
  normalizeTopicName,
} from '@/lib/interview/topic-config';
import { cn } from '@/lib/utils';

const NOTE_MAX_LENGTH = 200;

function topicErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'TOPIC_CONFIG_INVALID') return e.message;
    if (e.code === 'UPGRADE_REQUIRED') return 'Interview preparation requires a Pro plan.';
    return e.message;
  }
  return 'Could not start topic preparation. Please try again.';
}

export function TopicPrepWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const start = useStartInterview();

  const [topic, setTopic] = useState('');
  const [currentLevel, setCurrentLevel] = useState('intermediate');
  const [goalLevel, setGoalLevel] = useState('expert');
  const [purpose, setPurpose] = useState('interview');
  const [notes, setNotes] = useState('');

  const normalizedTopic = normalizeTopicName(topic);
  const selectedPurpose = TOPIC_PURPOSES.find((p) => p.value === purpose);
  const canSubmit = normalizedTopic.length > 0 && Boolean(currentLevel) && Boolean(goalLevel) && Boolean(purpose);

  async function handleSubmit() {
    if (!canSubmit) return;
    try {
      const result = await start.mutateAsync({
        source: 'topic',
        topic: normalizedTopic,
        current_level: currentLevel,
        goal_level: goalLevel,
        purpose,
        notes: notes.trim() || undefined,
      });
      const profileId = result.profile?.id;
      if (profileId) {
        toast('Topic preparation started.', 'success');
        router.push(`/interview/${profileId}`);
      }
    } catch (e) {
      toast(topicErrorMessage(e), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <AiWorkingOverlay
        open={start.isPending}
        title="Setting up your preparation"
        messages={[
          'Saving your topic and goals…',
          'Building your preparation workspace…',
          'Almost ready…',
        ]}
      />

      <section className="space-y-5">
        <header className="space-y-1">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            What do you want to prepare for?
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Enter a topic, choose your purpose, and set your expertise goals. Add an optional note to
            tailor question generation.
          </p>
        </header>

        <Input
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. System design, SQL, Leadership"
        />

        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPIC_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setTopic(chip)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm transition-colors',
                normalizedTopic.toLowerCase() === chip.toLowerCase()
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-100)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
              )}
            >
              {chip}
            </button>
          ))}
        </div>

        <Select
          label="Purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          options={TOPIC_PURPOSES.map((p) => ({ value: p.value, label: p.label }))}
        />
        {selectedPurpose ? (
          <p className="-mt-3 text-sm text-[var(--color-muted)]">{selectedPurpose.description}</p>
        ) : null}

        <Select
          label="Your current expertise"
          value={currentLevel}
          onChange={(e) => setCurrentLevel(e.target.value)}
          options={TOPIC_EXPERTISE_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
        />

        <Select
          label="Goal"
          value={goalLevel}
          onChange={(e) => setGoalLevel(e.target.value)}
          options={TOPIC_EXPERTISE_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
        />

        <Textarea
          label="Note (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
          placeholder="e.g. Focus on distributed systems, preparing for a FAANG loop…"
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <Link
          href="/interview"
          className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to interview prep
        </Link>

        <Button
          type="button"
          variant="primary"
          loading={start.isPending}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {start.isPending ? 'Setting up…' : 'Start preparation'}
        </Button>
      </div>
    </div>
  );
}
