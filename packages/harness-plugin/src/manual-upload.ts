import { randomBytes, createHash } from 'node:crypto';
import { collectProject } from './workspace.js';
import type { PlatformClient, S } from '@eas/platform-sdk';
/** Explicit owner UI action; independent of Agent approval. Never registered as an AI tool. */
export function manualUploads(
  root: () => string,
  client: () => PlatformClient,
  scope: () => string,
) {
  const pending = new Map<
    string,
    { appId: string; root: string; scope: string; upload: S['SourceUpload']; expires: number }
  >();
  return {
    clear() {
      pending.clear();
    },
    async prepare(appId: string, projectPath: string, message: string, signal: AbortSignal) {
      for (const [key, value] of pending) if (value.expires < Date.now()) pending.delete(key);
      if (pending.size >= 4) throw new Error('UPLOAD_PREPARATION_LIMIT');
      const initialScope = scope();
      await client().request('/apps/' + appId, { signal });
      const approvedRoot = root(),
        upload = await collectProject(approvedRoot, projectPath, signal);
      upload.message = message;
      const confirmationId = randomBytes(24).toString('base64url'),
        digest = 'sha256:' + createHash('sha256').update(JSON.stringify(upload)).digest('hex');
      if (scope() !== initialScope) throw new Error('CONNECTION_CHANGED');
      pending.set(confirmationId, {
        appId,
        root: approvedRoot,
        scope: initialScope,
        upload,
        expires: Date.now() + 180000,
      });
      return {
        confirmationId,
        digest,
        files: upload.files.map((f) => ({ path: f.path, bytes: Buffer.byteLength(f.content) })),
        totalBytes: upload.files.reduce((n, f) => n + Buffer.byteLength(f.content), 0),
        expiresInSeconds: 180,
      };
    },
    async confirm(appId: string, confirmationId: string, signal: AbortSignal) {
      const value = pending.get(confirmationId);
      pending.delete(confirmationId);
      if (
        !value ||
        value.appId !== appId ||
        value.root !== root() ||
        value.scope !== scope() ||
        value.expires < Date.now()
      )
        throw new Error('UPLOAD_CONFIRMATION_EXPIRED');
      return client().upload(appId, value.upload, signal);
    },
    discard(confirmationId: string) {
      pending.delete(confirmationId);
    },
  };
}
