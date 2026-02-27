import type { Transcript, TranscriptLine } from './transcribe.js';

export type TranscriptSegment = {
  rangeLabel: string; // 00:00–05:00
  fileLabel: string; // 00-05
  lines: TranscriptLine[];
};

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

export function formatHhMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  return `${pad2(mm)}:${pad2(ss)}`;
}

export function formatRangeLabel(startSec: number, endSec: number) {
  return `${formatHhMmSs(startSec)}–${formatHhMmSs(endSec)}`;
}

export function formatFileLabel(startSec: number, endSec: number) {
  const sm = Math.floor(startSec / 60);
  const em = Math.floor(endSec / 60);
  return `${pad2(sm)}-${pad2(em)}`;
}

export function chunkTranscriptByTime(transcript: Transcript, chunkSeconds: number): TranscriptSegment[] {
  const lines = transcript.lines;
  if (!lines.length) return [];

  const maxEnd = Math.max(...lines.map((l) => l.end || l.start));
  const segments: TranscriptSegment[] = [];

  for (let start = 0; start < maxEnd + 1; start += chunkSeconds) {
    const end = Math.min(maxEnd, start + chunkSeconds);
    const segLines = lines.filter((l) => (l.start ?? 0) >= start && (l.start ?? 0) < end);
    if (!segLines.length) continue;
    segments.push({
      rangeLabel: formatRangeLabel(start, end),
      fileLabel: formatFileLabel(start, end),
      lines: segLines,
    });
  }

  return segments;
}
