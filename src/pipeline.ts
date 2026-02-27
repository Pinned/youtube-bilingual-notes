import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadAudio } from './yt.js';
import { transcribeAudio } from './transcribe.js';
import { chunkTranscriptByTime } from './segment.js';
import { writeSrt, writeJsonl } from './transcript_formats.js';
import { generateSegmentNotes, generateFullNotes } from './summarize.js';
import { which, retry } from './utils.js';

export type PipelineParams = {
  url: string;
  outDir: string;
  model: string;
  sttModel: string;
  chunkMinutes: number;
  keepAudio: boolean;
  languageHint?: string;
  resume: boolean;
  retries: number;
};

export async function runPipeline(params: PipelineParams) {
  await fs.mkdir(params.outDir, { recursive: true });

  // dependency checks
  if (!(await which('yt-dlp'))) {
    throw new Error(
      `Missing dependency: yt-dlp\n\nInstall:\n  macOS: brew install yt-dlp\n  Ubuntu/Debian: sudo apt-get install yt-dlp\n\nThen re-run.`
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }

  const audioPath = path.join(params.outDir, '00_audio.mp3');
  const srtPath = path.join(params.outDir, '01_transcript.srt');
  const jsonlPath = path.join(params.outDir, '01_transcript.jsonl');

  // 1) download audio
  const hasAudio = await fs
    .stat(audioPath)
    .then((s) => s.size > 0)
    .catch(() => false);

  if (!params.resume || !hasAudio) {
    await retry(() => downloadAudio(params.url, audioPath), { retries: params.retries, label: 'downloadAudio' });
  } else {
    console.log(`[resume] using existing audio: ${audioPath}`);
  }

  // 2) transcribe
  const hasTranscript = await fs
    .stat(jsonlPath)
    .then((s) => s.size > 0)
    .catch(() => false);

  let transcript: Awaited<ReturnType<typeof transcribeAudio>>;
  if (params.resume && hasTranscript) {
    console.log(`[resume] using existing transcript: ${jsonlPath}`);
    // minimal loader from jsonl
    const raw = await fs.readFile(jsonlPath, 'utf8');
    const lines = raw
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    transcript = { lines };
  } else {
    transcript = await retry(
      () =>
        transcribeAudio({
          audioPath,
          model: params.sttModel,
          languageHint: params.languageHint,
        }),
      { retries: params.retries, label: 'transcribeAudio' }
    );

    await writeSrt(srtPath, transcript);
    await writeJsonl(jsonlPath, transcript);
  }

  // 3) segment + notes
  const segments = chunkTranscriptByTime(transcript, params.chunkMinutes * 60);
  const segmentNotes: { range: string; mdPath: string; md: string }[] = [];

  for (const seg of segments) {
    const mdPath = path.join(params.outDir, `02_notes_segment_${seg.fileLabel}.md`);
    const exists = await fs
      .stat(mdPath)
      .then((s) => s.size > 0)
      .catch(() => false);

    if (params.resume && exists) {
      const md = await fs.readFile(mdPath, 'utf8');
      console.log(`[resume] segment exists: ${mdPath}`);
      segmentNotes.push({ range: seg.rangeLabel, mdPath, md });
      continue;
    }

    const md = await retry(
      () =>
        generateSegmentNotes({
          model: params.model,
          range: seg.rangeLabel,
          transcriptLines: seg.lines,
        }),
      { retries: params.retries, label: `segmentNotes ${seg.fileLabel}` }
    );

    await fs.writeFile(mdPath, md, 'utf8');
    segmentNotes.push({ range: seg.rangeLabel, mdPath, md });
  }

  // 4) full merge
  const fullPath = path.join(params.outDir, '03_notes_full_bilingual.md');
  const hasFull = await fs
    .stat(fullPath)
    .then((s) => s.size > 0)
    .catch(() => false);

  if (!params.resume || !hasFull) {
    const full = await retry(
      () =>
        generateFullNotes({
          model: params.model,
          allSegmentNotes: segmentNotes.map((s) => `# Segment ${s.range}\n\n${s.md}`).join('\n\n---\n\n'),
        }),
      { retries: params.retries, label: 'fullNotes' }
    );
    await fs.writeFile(fullPath, full, 'utf8');
  } else {
    console.log(`[resume] full notes exists: ${fullPath}`);
  }

  // 5) cleanup
  if (!params.keepAudio) {
    await fs.unlink(audioPath).catch(() => undefined);
  }
}
