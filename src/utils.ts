import { spawn } from 'node:child_process';

export async function which(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('bash', ['-lc', `command -v ${cmd} >/dev/null 2>&1`], { stdio: 'ignore' });
    p.on('exit', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry<T>(fn: () => Promise<T>, opts: { retries: number; baseDelayMs?: number; label?: string }) {
  const base = opts.baseDelayMs ?? 1000;
  let lastErr: unknown;
  for (let i = 0; i <= opts.retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === opts.retries) break;
      const delay = base * Math.pow(2, i);
      const tag = opts.label ? ` (${opts.label})` : '';
      console.warn(`Retry ${i + 1}/${opts.retries}${tag} in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}
