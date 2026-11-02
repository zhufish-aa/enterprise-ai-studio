import { createApp } from './app.js';
import { catalogOptionsFromEnvironment } from './catalog/config.js';
const port = Number(process.env['API_PORT'] ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid API_PORT');
const app = await createApp(await catalogOptionsFromEnvironment());
await app.listen(port, process.env['API_HOST'] ?? '127.0.0.1');
console.info('platform-api listening on port ' + port);
