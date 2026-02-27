import fs from 'node:fs/promises';
import type { Transcript } from './transcribe.js';

function pad(n: number, w = 2) {
  return String(Math.floor(n)).padStart(w, '0');
}

function formatSrtTime(sec: number) {
  const s = Math.max(0, sec);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(ms, 3)}`;
}

export async function writeSrt(filePath: string, transcript: Transcript) {
  const chunks: string[] = [];
  transcript.lines.forEach((l, idx) => {
    chunks.push(String(idx + 1));
    chunks.push(`${formatSrtTime(l.start)} --> ${formatSrtTime(l.end)}`);
    chunks.push(l.text);
    chunks.push('');
  });
  await fs.writeFile(filePath, chunks.join('\n'), 'utf8');
}

export async function writeJsonl(filePath: string, transcript: Transcript) {
  const lines = transcript.lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  await fs.writeFile(filePath, lines, 'utf8');
}
