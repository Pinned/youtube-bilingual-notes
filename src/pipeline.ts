import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadAudio } from './yt.js';
import { transcribeAudio } from './transcribe.js';
import { chunkTranscriptByTime } from './segment.js';
import { writeSrt, writeJsonl } from './transcript_formats.js';
import { generateSegmentNotes, generateFullNotes } from './summarize.js';

export type PipelineParams = {
  url: string;
  outDir: string;
  model: string;
  sttModel: string;
  chunkMinutes: number;
  keepAudio: boolean;
  languageHint?: string;
};

export async function runPipeline(params: PipelineParams) {
  await fs.mkdir(params.outDir, { recursive: true });

  const audioPath = path.join(params.outDir, '00_audio.mp3');
  await downloadAudio(params.url, audioPath);

  const transcript = await transcribeAudio({
    audioPath,
    model: params.sttModel,
    languageHint: params.languageHint,
  });

  await writeSrt(path.join(params.outDir, '01_transcript.srt'), transcript);
  await writeJsonl(path.join(params.outDir, '01_transcript.jsonl'), transcript);

  const segments = chunkTranscriptByTime(transcript, params.chunkMinutes * 60);

  const segmentNotes: { range: string; mdPath: string; md: string }[] = [];

  for (const seg of segments) {
    const md = await generateSegmentNotes({
      model: params.model,
      range: seg.rangeLabel,
      transcriptLines: seg.lines,
    });

    const mdPath = path.join(params.outDir, `02_notes_segment_${seg.fileLabel}.md`);
    await fs.writeFile(mdPath, md, 'utf8');
    segmentNotes.push({ range: seg.rangeLabel, mdPath, md });
  }

  const full = await generateFullNotes({
    model: params.model,
    allSegmentNotes: segmentNotes.map((s) => `# Segment ${s.range}\n\n${s.md}`).join('\n\n---\n\n'),
  });
  await fs.writeFile(path.join(params.outDir, '03_notes_full_bilingual.md'), full, 'utf8');

  if (!params.keepAudio) {
    await fs.unlink(audioPath).catch(() => undefined);
  }
}
