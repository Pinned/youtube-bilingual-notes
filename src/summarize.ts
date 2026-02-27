import OpenAI from 'openai';
import type { TranscriptLine } from './transcribe.js';
import { segmentPrompt, fullPrompt } from './prompts.js';

function transcriptToText(lines: TranscriptLine[]) {
  return lines
    .map((l) => {
      const ts = `[${formatMmSs(l.start)}-${formatMmSs(l.end)}]`;
      return `${ts} ${l.text}`;
    })
    .join('\n');
}

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

function formatMmSs(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateSegmentNotes(params: { model: string; range: string; transcriptLines: TranscriptLine[] }) {
  const c = client();

  const user = segmentPrompt({
    range: params.range,
    transcriptWithTimestamps: transcriptToText(params.transcriptLines),
  });

  const resp = await c.responses.create({
    model: params.model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You are a meticulous course note-taker. Produce bilingual notes with strict EN→CN pairing and keep key original quotes.',
          },
        ],
      },
      { role: 'user', content: [{ type: 'input_text', text: user }] },
    ],
  });

  return resp.output_text;
}

export async function generateFullNotes(params: { model: string; allSegmentNotes: string }) {
  const c = client();
  const user = fullPrompt({ allSegmentNotes: params.allSegmentNotes });

  const resp = await c.responses.create({
    model: params.model,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You are a bilingual editor. Merge segment notes into a coherent course handout. Keep EN→CN pairing.',
          },
        ],
      },
      { role: 'user', content: [{ type: 'input_text', text: user }] },
    ],
  });

  return resp.output_text;
}
