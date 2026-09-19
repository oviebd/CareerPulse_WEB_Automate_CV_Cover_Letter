'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'transcript_ready';

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<{ [index: number]: { transcript: string } }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useVoiceCapture(sessionId?: string) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const skipUploadRef = useRef(false);
  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  const releaseMedia = useCallback(async () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;

    const recorder = mediaRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
        recorder.stream.getTracks().forEach((t) => t.stop());
      });
    }
    mediaRef.current = null;
  }, []);

  const startListening = useCallback(async () => {
    setTranscript('');
    setAudioPath(null);
    skipUploadRef.current = false;
    setVoiceState('listening');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();

      const rec = getSpeechRecognition();
      if (rec) {
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (ev) => {
          let text = '';
          for (let i = 0; i < ev.results.length; i++) {
            text += ev.results[i][0].transcript;
          }
          setTranscript(text.trim());
        };
        rec.start();
        recognitionRef.current = rec;
      }
    } catch {
      setVoiceState('idle');
    }
  }, []);

  const stopListening = useCallback(async () => {
    skipUploadRef.current = false;
    setVoiceState('processing');
    await releaseMedia();

    if (skipUploadRef.current) {
      setVoiceState('idle');
      return;
    }

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (blob.size > 0) {
      try {
        const form = new FormData();
        form.append('file', blob, 'answer.webm');
        if (sessionId) form.append('session_id', sessionId);
        const res = await fetch('/api/interview/audio', {
          method: 'POST',
          body: form,
        });
        if (res.ok) {
          const data = (await res.json()) as { audio_path?: string };
          setAudioPath(data.audio_path ?? null);
        }
      } catch {
        /* text fallback remains */
      }
    }

    if (skipUploadRef.current) {
      setVoiceState('idle');
      return;
    }
    setVoiceState('transcript_ready');
  }, [releaseMedia, sessionId]);

  const cancel = useCallback(async () => {
    skipUploadRef.current = true;
    const state = voiceStateRef.current;
    if (state === 'listening' || state === 'processing') {
      await releaseMedia();
    }
    setVoiceState('idle');
  }, [releaseMedia]);

  const reset = useCallback(() => {
    skipUploadRef.current = true;
    void releaseMedia().then(() => {
      setVoiceState('idle');
      setTranscript('');
      setAudioPath(null);
      chunksRef.current = [];
    });
  }, [releaseMedia]);

  useEffect(() => {
    return () => {
      skipUploadRef.current = true;
      void releaseMedia();
    };
  }, [releaseMedia]);

  return {
    voiceState,
    transcript,
    setTranscript,
    audioPath,
    startListening,
    stopListening,
    cancel,
    reset,
  };
}
