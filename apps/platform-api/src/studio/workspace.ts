import { createHash } from 'node:crypto';
import type { components } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Subject } from '../identity/identity.js';
import type { StudioService } from './service.js';
type S = components['schemas'];
interface Head {
  revision: number;
  base_version_id: string | null;
  updated_at: Date;
}
interface File {
  path: string;
  content: string;
}
const hash = (content: string) => 'sha256:' + createHash('sha256').update(content).digest('hex');
/** Durable project files on the server, without a client filesystem/cwd dependency. */
export class ServerWorkspace {
  constructor(private readonly studio: StudioService) {}
  private path(path: string) {
    if (
      path.length > 160 ||
      !/^(studio\.manifest\.json|(?:src|server|shared|db)\/[a-zA-Z0-9_./-]+\.(tsx?|css|json|sql)|package\.json|README\.md)$/.test(
        path,
      ) ||
      path.split('/').some((p) => !p || p === '.' || p === '..' || p.startsWith('.'))
    )
      throw new Fault(422, 'SOURCE_PATH_REJECTED');
  }
  private content(content: string) {
    if (content.includes('\0') || Buffer.byteLength(content) > 131072)
      throw new Fault(422, 'SOURCE_LIMIT_EXCEEDED');
  }
  private async files(tx: Sql, s: Subject, id: string) {
    return tx.all<File>(
      'SELECT path,content FROM app_workspace_files WHERE organization_id=$1 AND app_id=$2 ORDER BY path',
      [s.organizationId, id],
    );
  }
  async list(tx: Sql, s: Subject, id: string): Promise<S['ServerWorkspace']> {
    await this.studio.app(tx, s, id, true);
    const head = await tx.one<Head>(
      'SELECT revision,base_version_id,updated_at FROM app_workspaces WHERE organization_id=$1 AND app_id=$2',
      [s.organizationId, id],
    );
    return {
      appId: id,
      revision: Number(head?.revision ?? 0),
      baseVersionId: head?.base_version_id ?? null,
      updatedAt: head?.updated_at.toISOString() ?? null,
      files: (await this.files(tx, s, id)).map((f) => ({
        path: f.path,
        bytes: Buffer.byteLength(f.content),
        digest: hash(f.content),
      })),
    };
  }
  async read(tx: Sql, s: Subject, id: string, path: string): Promise<S['ServerWorkspaceFile']> {
    await this.studio.app(tx, s, id, true);
    this.path(path);
    const file = requireValue(
      await tx.one<File>(
        'SELECT path,content FROM app_workspace_files WHERE organization_id=$1 AND app_id=$2 AND path=$3',
        [s.organizationId, id, path],
      ),
    );
    const head = requireValue(
      await tx.one<Head>(
        'SELECT revision FROM app_workspaces WHERE organization_id=$1 AND app_id=$2',
        [s.organizationId, id],
      ),
    );
    return { ...file, revision: Number(head.revision), digest: hash(file.content) };
  }
  private async lock(tx: Sql, s: Subject, id: string, revision: number) {
    await this.studio.app(tx, s, id, true);
    await tx.exec(
      'INSERT INTO app_workspaces(organization_id,app_id,updated_by) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [s.organizationId, id, s.userId],
    );
    const head = requireValue(
      await tx.one<Head>(
        'SELECT revision,base_version_id,updated_at FROM app_workspaces WHERE organization_id=$1 AND app_id=$2 FOR UPDATE',
        [s.organizationId, id],
      ),
    );
    if (Number(head.revision) !== revision) throw new Fault(409, 'WORKSPACE_REVISION_CONFLICT');
  }
  private async advance(tx: Sql, s: Subject, id: string) {
    const stats = requireValue(
      await tx.one<{ count: number; bytes: number }>(
        'SELECT count(*)::integer count,coalesce(sum(octet_length(content)),0)::integer bytes FROM app_workspace_files WHERE organization_id=$1 AND app_id=$2',
        [s.organizationId, id],
      ),
    );
    if (stats.count > 200 || stats.bytes > 524288) throw new Fault(422, 'SOURCE_LIMIT_EXCEEDED');
    await tx.exec(
      'UPDATE app_workspaces SET revision=revision+1,updated_by=$3,updated_at=now() WHERE organization_id=$1 AND app_id=$2',
      [s.organizationId, id, s.userId],
    );
    return this.list(tx, s, id);
  }
  async write(tx: Sql, s: Subject, id: string, b: S['WriteServerWorkspace']) {
    await this.lock(tx, s, id, b.revision);
    const paths = new Set<string>();
    for (const f of b.files) {
      this.path(f.path);
      this.content(f.content);
      if (paths.has(f.path.toLowerCase())) throw new Fault(422, 'SOURCE_PATH_REJECTED');
      paths.add(f.path.toLowerCase());
      await tx.exec(
        'INSERT INTO app_workspace_files(organization_id,app_id,path,content) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,app_id,path) DO UPDATE SET content=EXCLUDED.content,updated_at=now()',
        [s.organizationId, id, f.path, f.content],
      );
    }
    return this.advance(tx, s, id);
  }
  async edit(tx: Sql, s: Subject, id: string, b: S['EditServerWorkspace']) {
    await this.lock(tx, s, id, b.revision);
    this.path(b.path);
    const f = requireValue(
      await tx.one<File>(
        'SELECT path,content FROM app_workspace_files WHERE organization_id=$1 AND app_id=$2 AND path=$3',
        [s.organizationId, id, b.path],
      ),
    );
    const count = f.content.split(b.oldText).length - 1;
    if (count === 0 || (count > 1 && !b.replaceAll))
      throw new Fault(409, 'WORKSPACE_EDIT_CONFLICT');
    const content = b.replaceAll
      ? f.content.replaceAll(b.oldText, b.newText)
      : f.content.replace(b.oldText, b.newText);
    this.content(content);
    await tx.exec(
      'UPDATE app_workspace_files SET content=$4,updated_at=now() WHERE organization_id=$1 AND app_id=$2 AND path=$3',
      [s.organizationId, id, b.path, content],
    );
    return this.advance(tx, s, id);
  }
  async remove(tx: Sql, s: Subject, id: string, b: S['RemoveServerWorkspaceFiles']) {
    await this.lock(tx, s, id, b.revision);
    for (const path of b.paths) {
      this.path(path);
      if (
        !(await tx.one(
          'DELETE FROM app_workspace_files WHERE organization_id=$1 AND app_id=$2 AND path=$3 RETURNING path',
          [s.organizationId, id, path],
        ))
      )
        throw new Fault(404, 'NOT_FOUND');
    }
    return this.advance(tx, s, id);
  }
  async move(tx: Sql, s: Subject, id: string, b: S['MoveServerWorkspaceFile']) {
    await this.lock(tx, s, id, b.revision);
    this.path(b.from);
    this.path(b.to);
    if (b.from === b.to) throw new Fault(409, 'WORKSPACE_EDIT_CONFLICT');
    if (
      !(await tx.one(
        'UPDATE app_workspace_files SET path=$4,updated_at=now() WHERE organization_id=$1 AND app_id=$2 AND path=$3 RETURNING path',
        [s.organizationId, id, b.from, b.to],
      ))
    )
      throw new Fault(404, 'NOT_FOUND');
    return this.advance(tx, s, id);
  }
  async checkout(tx: Sql, s: Subject, id: string, b: S['CheckoutServerWorkspace']) {
    await this.lock(tx, s, id, b.revision);
    await this.studio.version(tx, s, id, b.versionId, true);
    const blob = requireValue(
      await tx.one<{ content: Buffer }>(
        'SELECT b.content FROM app_versions v JOIN studio_artifact_blobs b ON b.organization_id=v.organization_id AND b.artifact_id=v.source_artifact_id WHERE v.organization_id=$1 AND v.app_id=$2 AND v.id=$3',
        [s.organizationId, id, b.versionId],
      ),
    );
    const source = JSON.parse(blob.content.toString()) as S['SourceUpload'];
    await this.studio.validateManifest(tx, s, source.manifest);
    await tx.exec('DELETE FROM app_workspace_files WHERE organization_id=$1 AND app_id=$2', [
      s.organizationId,
      id,
    ]);
    for (const f of [
      ...source.files,
      { path: 'studio.manifest.json', content: JSON.stringify(source.manifest, null, 2) },
    ]) {
      this.path(f.path);
      this.content(f.content);
      await tx.exec(
        'INSERT INTO app_workspace_files(organization_id,app_id,path,content) VALUES($1,$2,$3,$4)',
        [s.organizationId, id, f.path, f.content],
      );
    }
    await tx.exec(
      'UPDATE app_workspaces SET base_version_id=$3 WHERE organization_id=$1 AND app_id=$2',
      [s.organizationId, id, b.versionId],
    );
    return this.advance(tx, s, id);
  }
  async commit(
    tx: Sql,
    s: Subject,
    id: string,
    b: S['CommitServerWorkspace'],
  ): Promise<S['ServerWorkspaceCommit']> {
    await this.lock(tx, s, id, b.revision);
    const files = await this.files(tx, s, id),
      raw = files.find((f) => f.path === 'studio.manifest.json');
    if (!raw || !files.some((f) => f.path === 'src/main.tsx'))
      throw new Fault(422, 'WORKSPACE_PROJECT_INCOMPLETE');
    let manifest: S['SourceManifest'];
    try {
      manifest = JSON.parse(raw.content) as S['SourceManifest'];
    } catch {
      throw new Fault(422, 'WORKSPACE_MANIFEST_INVALID');
    }
    const version = await this.studio.upload(tx, s, id, {
      manifest,
      files: files.filter((f) => f.path !== raw.path),
      message: b.message,
    });
    await tx.exec(
      'UPDATE app_workspaces SET base_version_id=$3 WHERE organization_id=$1 AND app_id=$2',
      [s.organizationId, id, version.id],
    );
    return { version, workspace: await this.advance(tx, s, id) };
  }
}
