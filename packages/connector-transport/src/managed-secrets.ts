import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, lstat, unlink } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
export interface ManagedSecretConfig {
  directory: string;
  keyFile: string;
}
export interface ManagedCredential {
  username: string;
  password: string;
  revision: string;
}
/** Environment-specific encrypted store. Key is provisioned outside metadata DB and project workspaces. */
export class ManagedSecrets {
  constructor(
    private readonly config: ManagedSecretConfig,
    private readonly environment: 'test' | 'production',
  ) {}
  private async key() {
    const { directory, keyFile } = this.config;
    if (!isAbsolute(directory) || !isAbsolute(keyFile) || resolve(directory) === resolve(keyFile))
      throw new Error('CREDENTIAL_STORE_UNAVAILABLE');
    const [dir, stat] = await Promise.all([lstat(directory), lstat(keyFile)]);
    if (
      !dir.isDirectory() ||
      dir.isSymbolicLink() ||
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.nlink !== 1 ||
      stat.size !== 32 ||
      (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)
    )
      throw new Error('CREDENTIAL_STORE_UNAVAILABLE');
    return readFile(keyFile);
  }
  private id(reference: string) {
    const match = /^managed:(test|production):([a-f0-9-]{36})$/.exec(reference);
    if (
      match?.[1] !== this.environment ||
      !match[2] ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(match[2])
    )
      throw new Error('CREDENTIAL_UNAVAILABLE');
    return match[2];
  }
  async put(credential: ManagedCredential) {
    const key = await this.key(),
      id = randomUUID(),
      reference = 'managed:' + this.environment + ':' + id,
      iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(reference));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(credential), 'utf8'),
      cipher.final(),
    ]);
    await writeFile(
      join(this.config.directory, id + '.json'),
      JSON.stringify({
        version: 1,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
      }),
      { mode: 0o600, flag: 'wx' },
    );
    key.fill(0);
    return reference;
  }
  async get(reference: string): Promise<ManagedCredential> {
    try {
      const id = this.id(reference),
        file = join(this.config.directory, id + '.json'),
        stat = await lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 32768)
        throw new Error();
      const key = await this.key(),
        raw = JSON.parse(await readFile(file, 'utf8')) as {
          version: number;
          iv: string;
          tag: string;
          ciphertext: string;
        };
      if (raw.version !== 1) throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'base64'));
      decipher.setAAD(Buffer.from(reference));
      decipher.setAuthTag(Buffer.from(raw.tag, 'base64'));
      const value = JSON.parse(
        Buffer.concat([
          decipher.update(Buffer.from(raw.ciphertext, 'base64')),
          decipher.final(),
        ]).toString(),
      ) as ManagedCredential;
      key.fill(0);
      if (
        typeof value.username !== 'string' ||
        typeof value.password !== 'string' ||
        typeof value.revision !== 'string'
      )
        throw new Error();
      return value;
    } catch {
      throw new Error('CREDENTIAL_UNAVAILABLE');
    }
  }
  async remove(reference: string) {
    await unlink(join(this.config.directory, this.id(reference) + '.json')).catch(() => {});
  }
}
