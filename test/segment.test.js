import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatHhMmSs,
  formatRangeLabel,
  formatFileLabel,
  chunkTranscriptByTime,
} from '../dist/segment.js';

test('formatHhMmSs formats mm:ss and hh:mm:ss', () => {
  assert.equal(formatHhMmSs(0), '00:00');
  assert.equal(formatHhMmSs(9), '00:09');
  assert.equal(formatHhMmSs(70), '01:10');
  assert.equal(formatHhMmSs(3600), '01:00:00');
  assert.equal(formatHhMmSs(3661), '01:01:01');
  assert.equal(formatHhMmSs(-10), '00:00');
});

test('formatRangeLabel uses en dash and formatted times', () => {
  assert.equal(formatRangeLabel(0, 300), '00:00–05:00');
});

test('formatFileLabel uses minute buckets', () => {
  assert.equal(formatFileLabel(0, 300), '00-05');
  assert.equal(formatFileLabel(60, 359), '01-05');
});

test('chunkTranscriptByTime chunks by start timestamps and omits empty chunks', () => {
  const transcript = {
    lines: [
      { start: 0, end: 1, text: 'a' },
      { start: 2, end: 3, text: 'b' },
      { start: 61, end: 62, text: 'c' },
      { start: 120, end: 121, text: 'd' },
    ],
  };

  const segments = chunkTranscriptByTime(transcript, 60);
  assert.equal(segments.length, 3);

  assert.equal(segments[0].fileLabel, '00-01');
  assert.deepEqual(
    segments[0].lines.map((l) => l.text),
    ['a', 'b']
  );

  assert.equal(segments[1].fileLabel, '01-02');
  assert.deepEqual(
    segments[1].lines.map((l) => l.text),
    ['c']
  );

  assert.equal(segments[2].fileLabel, '02-02');
  assert.deepEqual(
    segments[2].lines.map((l) => l.text),
    ['d']
  );
});
