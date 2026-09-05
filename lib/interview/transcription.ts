/** Transcription adapter — no vendor lock-in. Web Speech API for browser; server stub for uploaded audio. */

export type TranscriptionResult = {
  transcript: string;
  confidence: number | null;
  provider: string;
};

export interface TranscriptionProvider {
  transcribe(_audioPath: string, _mimeType: string): Promise<TranscriptionResult>;
}

/** Server-side stub: returns empty transcript; client should use Web Speech or typed text. */
export class StubTranscriptionProvider implements TranscriptionProvider {
  async transcribe(): Promise<TranscriptionResult> {
    return { transcript: '', confidence: null, provider: 'stub' };
  }
}

let provider: TranscriptionProvider = new StubTranscriptionProvider();

export function setTranscriptionProvider(p: TranscriptionProvider): void {
  provider = p;
}

export function getTranscriptionProvider(): TranscriptionProvider {
  return provider;
}

export async function transcribeAudio(
  audioPath: string,
  mimeType = 'audio/webm'
): Promise<TranscriptionResult> {
  return provider.transcribe(audioPath, mimeType);
}
