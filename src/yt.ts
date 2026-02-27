import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

/**
 * Downloads best-available audio to a single mp3 file.
 * Requires yt-dlp in PATH.
 *
 * Note: `yt-dlp -o <path>` expects a template. We pass a fixed filename.
 */
export async function downloadAudio(url: string, outPath: string) {
  // ensure directory exists
  const dir = outPath.split('/').slice(0, -1).join('/') || '.';
  await fs.mkdir(dir, { recursive: true });

  await run('yt-dlp', [
    '--no-playlist',
    '-f',
    'bestaudio/best',
    '--extract-audio',
    '--audio-format',
    'mp3',
    '--audio-quality',
    '0',
    '-o',
    outPath,
    url,
  ]);
}
