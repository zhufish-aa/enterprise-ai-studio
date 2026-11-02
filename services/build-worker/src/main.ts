import { capability } from './index.js';
if (process.env['BUILD_WORKER_KEY']) {
  const { startCompiler } = await import('./server.js');
  const server = await startCompiler();
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
} else console.info(JSON.stringify(capability));
