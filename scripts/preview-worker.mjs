import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { unusedPort } from './postgres-fixture.mjs';
import { signedRequest } from '../packages/connector-transport/dist/index.js';
export async function startPreviewWorker() {
  const port = await unusedPort(),
    key = randomBytes(32).toString('hex');
  const child = spawn(process.execPath, [resolve('services/preview-worker/dist/main.js')], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PREVIEW_ALLOW_LOCAL: 'true',
      PREVIEW_WORKER_PORT: String(port),
      PREVIEW_WORKER_KEY: key,
    },
  });
  let output = '';
  child.stdout.on('data', () => {});
  child.stderr.on('data', (buffer) => (output = (output + buffer).slice(-2000)));
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error('PREVIEW_START_FAILED: ' + output);
      try {
        await signedRequest(
          new URL('http://127.0.0.1:' + port + '/ping'),
          key,
          {},
          { allowLocalHttp: true, timeoutMs: 500 },
        );
        break;
      } catch {
        if (attempt === 99) throw new Error('PREVIEW_START_TIMEOUT');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  } catch (error) {
    child.kill();
    throw error;
  }
  return {
    target: { url: new URL('http://127.0.0.1:' + port), key, allowLocalHttp: true },
    async close() {
      if (child.exitCode === null && child.signalCode === null) {
        const closed = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await closed;
      }
    },
  };
}
