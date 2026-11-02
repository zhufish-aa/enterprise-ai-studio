import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const value = `POSTGRES_DB=enterprise_ai_studio\nPOSTGRES_USER=eas_local\nPOSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nREDIS_PASSWORD=${randomBytes(24).toString('hex')}\nAPI_HOST=127.0.0.1\nAPI_PORT=3000\n`;
try {
  await writeFile(new URL('../.env', import.meta.url), value, { flag: 'wx', mode: 0o600 });
  console.log('Created local .env with random development credentials.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env already exists; preserved existing values.');
  else throw error;
}
