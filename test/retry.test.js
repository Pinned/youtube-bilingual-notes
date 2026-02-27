import test from 'node:test';
import assert from 'node:assert/strict';

import { retry } from '../dist/utils.js';

test('retry resolves on first try when fn succeeds', async () => {
  let calls = 0;
  const out = await retry(
    async () => {
      calls++;
      return 'ok';
    },
    { retries: 3, baseDelayMs: 1 }
  );

  assert.equal(out, 'ok');
  assert.equal(calls, 1);
});

test('retry retries and eventually succeeds', async () => {
  let calls = 0;
  const out = await retry(
    async () => {
      calls++;
      if (calls < 3) throw new Error('boom');
      return 42;
    },
    { retries: 5, baseDelayMs: 1, label: 'unit' }
  );

  assert.equal(out, 42);
  assert.equal(calls, 3);
});

test('retry throws last error after exhausting retries', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      retry(
        async () => {
          calls++;
          throw new Error(`fail-${calls}`);
        },
        { retries: 2, baseDelayMs: 1 }
      ),
    /fail-3/
  );
  assert.equal(calls, 3);
});
