import { startDeploymentWorker } from './server.js';
const server = await startDeploymentWorker();
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.once(signal, () => server.close(() => process.exit(0)));
