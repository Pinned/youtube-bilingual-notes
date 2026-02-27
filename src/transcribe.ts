import fs from 'node:fs';
import OpenAI from 'openai';

export type TranscriptLine = {
  start: number; // seconds
  end: number; // seconds
  text: string;
};

export type Transcript = {
  lines: TranscriptLine[];
};

export async function transcribeAudio(params: {
  audioPath: string;
  model: string;
  languageHint?: string;
}): Promise<Transcript> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');

  const file = fs.createReadStream(params.audioPath);

  // Use verbose_json to get segment-level timestamps.
  const resp = await client.audio.transcriptions.create({
    file,
    model: params.model,
    response_format: 'verbose_json',
    language: params.languageHint,
  } as any);

  const segments = (resp as any).segments as Array<any> | undefined;
  if (!segments?.length) {
    // fallback: single line
    const text = (resp as any).text ?? '';
    return { lines: [{ start: 0, end: 0, text }] };
  }

  const lines: TranscriptLine[] = segments.map((s) => ({
    start: Number(s.start ?? 0),
    end: Number(s.end ?? 0),
    text: String(s.text ?? '').trim(),
  })).filter((l) => l.text.length);

  return { lines };
}
