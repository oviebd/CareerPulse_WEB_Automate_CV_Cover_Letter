'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import type { VoiceState } from '@/hooks/useVoiceCapture';

const ACTIVE_VOICE_LABELS: Partial<Record<VoiceState, string>> = {
  listening: 'Listening…',
  processing: 'Processing audio…',
  transcript_ready: 'Transcript ready',
};

function showVoiceStatus(state: VoiceState): state is keyof typeof ACTIVE_VOICE_LABELS {
  return state === 'listening' || state === 'processing' || state === 'transcript_ready';
}

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
  }) => void | Promise<void>;
  loading?: boolean;
  mode: string;
}) {
  const voice = useVoiceCapture(sessionId);
  const [text, setText] = useState(draft);

  const combined = voice.transcript || text;

  async function handleSubmit() {
    const stateBefore = voice.voiceState;
    const transcriptBefore = voice.transcript.trim();
    const audioBefore = voice.audioPath;

    if (stateBefore === 'listening' || stateBefore === 'processing') {
      await voice.cancel();
    }

    const answerText = (transcriptBefore || text).trim();
    const usedVoice =
      stateBefore === 'transcript_ready' ||
      (Boolean(audioBefore) && Boolean(transcriptBefore));

    if (usedVoice) {
      onSubmit({
        text_answer: text.trim() || undefined,
        transcript: transcriptBefore || undefined,
        audio_path: audioBefore ?? undefined,
      });
    } else {
      onSubmit({ text_answer: answerText || undefined });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
        {showVoiceStatus(voice.voiceState) ? (
          <span>Voice: {ACTIVE_VOICE_LABELS[voice.voiceState]}</span>
        ) : (
          <span />
        )}
        {mode === 'realistic' ? (
          <span>Realistic mode — brief note after each answer, full scores at end</span>
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
            disabled={loading || voice.voiceState === 'processing'}
          >
            Record
          </Button>
        )}
        <Button
          variant="primary"
          loading={loading}
          onClick={() => void handleSubmit()}
          disabled={!combined.trim() || loading || voice.voiceState === 'processing'}
        >
          {loading ? 'Submitting…' : 'Submit answer'}
        </Button>
      </div>
    </div>
  );
}
