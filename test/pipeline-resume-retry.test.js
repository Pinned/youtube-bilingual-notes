import test from 'node:test';
import assert from 'node:assert/strict';

import { runPipeline } from '../dist/pipeline.js';

function makeMemFs({
  existing = {},
} = {}) {
  const files = new Map(Object.entries(existing));

  return {
    async mkdir(_p, _opts) {},
    async stat(p) {
      if (!files.has(p)) {
        const err = new Error(`ENOENT: no such file or directory, stat '${p}'`);
        err.code = 'ENOENT';
        throw err;
      }
      return { size: String(files.get(p)).length };
    },
    async readFile(p, _enc) {
      if (!files.has(p)) {
        const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
        err.code = 'ENOENT';
        throw err;
      }
      return String(files.get(p));
    },
    async writeFile(p, content, _enc) {
      files.set(p, String(content));
    },
    async unlink(p) {
      files.delete(p);
    },
    _files: files,
  };
}

const memPath = {
  join: (...parts) => parts.join('/'),
};

test('runPipeline resumes: skips download/transcribe/segment/full when outputs exist', async () => {
  const outDir = '/out';
  const audioPath = `${outDir}/00_audio.mp3`;
  const jsonlPath = `${outDir}/01_transcript.jsonl`;
  const segPath = `${outDir}/02_notes_segment_00-01.md`;
  const fullPath = `${outDir}/03_notes_full_bilingual.md`;

  const memFs = makeMemFs({
    existing: {
      [audioPath]: 'audio',
      [jsonlPath]: JSON.stringify({ start: 0, end: 1, text: 'hello' }) + '\n',
      [segPath]: '# seg',
      [fullPath]: '# full',
    },
  });

  let downloadCalls = 0;
  let transcribeCalls = 0;
  let segCalls = 0;
  let fullCalls = 0;

  const deps = {
    fs: memFs,
    path: memPath,
    which: async () => true,
    retry: async (fn) => fn(),
    downloadAudio: async () => {
      downloadCalls++;
    },
    transcribeAudio: async () => {
      transcribeCalls++;
      return { lines: [{ start: 0, end: 1, text: 'x' }] };
    },
    chunkTranscriptByTime: () => [
      {
        rangeLabel: '00:00–00:01',
        fileLabel: '00-01',
        lines: [{ start: 0, end: 1, text: 'hello' }],
      },
    ],
    writeSrt: async () => {},
    writeJsonl: async () => {},
    generateSegmentNotes: async () => {
      segCalls++;
      return '# seg';
    },
    generateFullNotes: async () => {
      fullCalls++;
      return '# full';
    },
    log: { log() {}, warn() {}, error() {} },
  };

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test';
  try {
    await runPipeline(
      {
        url: 'https://example.com',
        outDir,
        model: 'm',
        sttModel: 's',
        chunkMinutes: 1,
        keepAudio: true,
        resume: true,
        retries: 0,
      },
      deps
    );
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
  }

  assert.equal(downloadCalls, 0);
  assert.equal(transcribeCalls, 0);
  assert.equal(segCalls, 0);
  assert.equal(fullCalls, 0);
});

test('runPipeline uses retry wrapper for download and transcribe when not resuming', async () => {
  const outDir = '/out';
  const memFs = makeMemFs();

  const retryLabels = [];
  const deps = {
    fs: memFs,
    path: memPath,
    which: async () => true,
    retry: async (fn, opts) => {
      retryLabels.push(opts?.label);
      return fn();
    },
    downloadAudio: async (_url, outPath) => {
      // create audio file
      await memFs.writeFile(outPath, 'audio', 'utf8');
    },
    transcribeAudio: async () => ({ lines: [{ start: 0, end: 1, text: 'hello' }] }),
    chunkTranscriptByTime: () => [
      {
        rangeLabel: '00:00–00:01',
        fileLabel: '00-01',
        lines: [{ start: 0, end: 1, text: 'hello' }],
      },
    ],
    writeSrt: async () => {},
    writeJsonl: async (p) => {
      await memFs.writeFile(p, JSON.stringify({ start: 0, end: 1, text: 'hello' }) + '\n', 'utf8');
    },
    generateSegmentNotes: async () => '# seg',
    generateFullNotes: async () => '# full',
    log: { log() {}, warn() {}, error() {} },
  };

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test';
  try {
    await runPipeline(
      {
        url: 'https://example.com',
        outDir,
        model: 'm',
        sttModel: 's',
        chunkMinutes: 1,
        keepAudio: true,
        resume: false,
        retries: 2,
      },
      deps
    );
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
  }

  assert.deepEqual(
    retryLabels.filter(Boolean),
    ['downloadAudio', 'transcribeAudio', 'segmentNotes 00-01', 'fullNotes']
  );
});
