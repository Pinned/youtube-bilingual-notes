import { z } from 'zod';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { runPipeline } from './pipeline.js';

const ArgsSchema = z.object({
  url: z.string().url(),
  outDir: z.string().default('./out'),
  model: z.string().default('gpt-4.1-mini'),
  sttModel: z.string().default('whisper-1'),
  chunkMinutes: z.number().int().positive().default(5),
  keepAudio: z.boolean().default(false),
  resume: z.boolean().default(true),
  retries: z.number().int().min(0).default(2),
  languageHint: z.string().optional(),
});

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = { retries: '2' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--keep-audio') args.keepAudio = true;
    else if (a === '--no-resume') args.resume = false;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (!val || val.startsWith('--')) throw new Error(`Missing value for --${key}`);
      args[key] = val;
      i++;
    } else if (!args.url) args.url = a;
  }
  return args;
}

function help() {
  return `ytbnotes - YouTube URL -> transcript -> bilingual EN→CN notes\n\nUsage:\n  ytbnotes <youtube_url> [--outDir ./out] [--model gpt-4.1-mini] [--sttModel whisper-1] [--chunkMinutes 5] [--keep-audio] [--retries 2] [--no-resume]\n\nResume behavior (default on):\n- Reuses existing transcript/segment notes in outDir and continues from the first missing step.\n\nEnv:\n  OPENAI_API_KEY (required)\n\nOutput files in outDir:\n  01_transcript.srt\n  01_transcript.jsonl\n  02_notes_segment_00-05.md ...\n  03_notes_full_bilingual.md\n`;
}

export async function main() {
  const raw = parseArgs(process.argv);
  if (raw.help) {
    console.log(help());
    return;
  }

  const parsed = ArgsSchema.parse({
    url: raw.url,
    outDir: raw.outDir,
    model: raw.model,
    sttModel: raw.sttModel,
    chunkMinutes: raw.chunkMinutes ? Number(raw.chunkMinutes) : undefined,
    keepAudio: raw.keepAudio,
    resume: raw.resume,
    retries: raw.retries ? Number(raw.retries) : undefined,
    languageHint: raw.languageHint,
  });

  const outDirAbs = path.resolve(process.cwd(), parsed.outDir);
  if (!existsSync(outDirAbs)) {
    // created in pipeline
  }

  await runPipeline({
    url: parsed.url,
    outDir: outDirAbs,
    model: parsed.model,
    sttModel: parsed.sttModel,
    chunkMinutes: parsed.chunkMinutes,
    keepAudio: parsed.keepAudio,
    resume: parsed.resume,
    retries: parsed.retries,
    languageHint: parsed.languageHint,
  });
}
