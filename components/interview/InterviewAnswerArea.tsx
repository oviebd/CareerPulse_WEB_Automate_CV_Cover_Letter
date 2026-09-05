'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import type { VoiceState } from '@/hooks/useVoiceCapture';

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Ready',
  listening: 'Listening…',
  processing: 'Processing…',
  transcript_ready: 'Transcript ready',
  evaluating: 'Evaluating…',
  next_question: 'Next question',
};

export function InterviewAnswerArea({
  sessionId,
  draft,
  onDraftChange,
  onSubmit,
  loading,
  mode,
}: {
  sessionId: string;
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: (payload: {
    text_answer?: string;
    transcript?: string;
    audio_path?: string;
  }) => void;
  loading?: boolean;
  mode: string;
}) {
  const voice = useVoiceCapture(sessionId);
  const [text, setText] = useState(draft);

  const combined = voice.transcript || text;

  function handleSubmit() {
    voice.setVoiceState('evaluating');
    onSubmit({
      text_answer: text.trim() || undefined,
      transcript: voice.transcript.trim() || undefined,
      audio_path: voice.audioPath ?? undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>Voice: {STATE_LABELS[voice.voiceState]}</span>
        {mode === 'realistic' ? (
          <span>Realistic mode — feedback after interview</span>
        ) : (
          <span>Practice mode — feedback after each answer</span>
        )}
      </div>

      <Textarea
        value={combined || text}
        onChange={(e) => {
          setText(e.target.value);
          onDraftChange(e.target.value);
          if (voice.transcript) voice.setTranscript(e.target.value);
        }}
        rows={6}
        placeholder="Type your answer or use the microphone..."
      />

      <div className="flex flex-wrap gap-2">
        {voice.voiceState === 'listening' ? (
          <Button variant="danger" size="sm" icon={<MicOff className="h-4 w-4" />} onClick={() => void voice.stopListening()}>
            Stop recording
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            icon={<Mic className="h-4 w-4" />}
            onClick={() => void voice.startListening()}
            disabled={loading}
          >
            Record
          </Button>
        )}
        <Button variant="primary" loading={loading} onClick={handleSubmit} disabled={!combined.trim()}>
          Submit answer
        </Button>
      </div>
    </div>
  );
}
