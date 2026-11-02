import { randomUUID } from 'node:crypto';
import type { components } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Identity, Subject } from '../identity/identity.js';
import type { TestAppContext } from './access.js';
import type { StudioService } from './service.js';
import { previewHtml } from './build-artifact.js';
import { canonical } from '@eas/connector-transport';
type S = components['schemas'];
interface ShareRow {
  share_id: string;
  app_id: string;
  revision: number;
  visibility: 'private' | 'organization' | 'public';
  app_version_id: string;
  build_job_id: string;
}
const selectShare =
  'SELECT h.share_id,r.app_id,r.revision,r.visibility,r.app_version_id,r.build_job_id FROM site_share_heads h JOIN site_share_revisions r ON r.organization_id=h.organization_id AND r.app_id=h.app_id AND r.id=h.share_revision_id WHERE h.organization_id=$1';
export class SiteSharing {
  constructor(
    private readonly identity: Identity,
    private readonly studio: StudioService,
  ) {}
  async auditTarget(tx: Sql, org: string, shareId: string): Promise<string | undefined> {
    return (await tx.one<{ app_id: string }>(selectShare + ' AND h.share_id=$2', [org, shareId]))
      ?.app_id;
  }
  async manage(tx: Sql, s: Subject, appId: string) {
    await this.studio.app(tx, s, appId, true);
    this.identity.require(s, 'app.develop', true);
    const member = await tx.one<{ role: string }>(
      'SELECT role FROM app_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
      [s.organizationId, appId, s.userId],
    );
    if (member?.role !== 'maintainer') throw new Fault(403, 'FORBIDDEN');
  }
  async settings(tx: Sql, s: Subject, appId: string): Promise<S['SiteSharing']> {
    await this.studio.app(tx, s, appId);
    const member = await tx.one<{ role: string }>(
      'SELECT role FROM app_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
      [s.organizationId, appId, s.userId],
    );
    const row = await tx.one<ShareRow>(selectShare + ' AND h.app_id=$2', [s.organizationId, appId]);
    const suggested = await tx.one<{ id: string }>(
      "SELECT v.id FROM app_versions v JOIN build_jobs b ON b.organization_id=v.organization_id AND b.app_version_id=v.id WHERE v.organization_id=$1 AND v.app_id=$2 AND b.status='succeeded' AND b.preview_only=true ORDER BY v.version DESC,b.created_at DESC,b.id DESC LIMIT 1",
      [s.organizationId, appId],
    );
    return {
      appId,
      shareId: row?.share_id ?? null,
      visibility: row?.visibility ?? 'private',
      revision: Number(row?.revision ?? 0),
      appVersionId: row?.app_version_id ?? null,
      buildId: row?.build_job_id ?? null,
      suggestedVersionId: suggested?.id ?? null,
      sharePath: row ? '/s/' + row.share_id + '?organizationId=' + s.organizationId : null,
      environment: 'test',
      canManage:
        member?.role === 'maintainer' && s.actions.has('app.develop') && s.clientKind === 'human',
    };
  }
  async update(
    tx: Sql,
    s: Subject,
    appId: string,
    input: S['UpdateSiteSharing'],
  ): Promise<S['SiteSharing']> {
    await this.manage(tx, s, appId);
    const previous = await tx.one<ShareRow>(selectShare + ' AND h.app_id=$2', [
      s.organizationId,
      appId,
    ]);
    if (Number(previous?.revision ?? 0) !== input.expectedRevision)
      throw new Fault(412, 'REVISION_MISMATCH');
    const version = await this.studio.version(tx, s, appId, input.appVersionId, true);
    // Revocation is allowed even after dataset grants expire. Expanding access requires current owner grants.
    if (input.visibility !== 'private') await this.studio.validateManifest(tx, s, version.manifest);
    const build = requireValue(
      await tx.one<{ id: string; artifact_id: string }>(
        "SELECT id,artifact_id FROM build_jobs WHERE organization_id=$1 AND app_version_id=$2 AND status='succeeded' AND preview_only=true AND artifact_id IS NOT NULL AND ($3::uuid IS NULL OR id=$3) ORDER BY created_at DESC,id DESC LIMIT 1",
        [
          s.organizationId,
          version.id,
          previous?.app_version_id === version.id ? previous.build_job_id : null,
        ],
      ),
    );
    const revisionId = randomUUID();
    await tx.exec(
      'INSERT INTO site_share_revisions(id,organization_id,app_id,revision,visibility,app_version_id,build_job_id,changed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        revisionId,
        s.organizationId,
        appId,
        Number(previous?.revision ?? 0) + 1,
        input.visibility,
        version.id,
        build.id,
        s.userId,
      ],
    );
    await tx.exec(
      'INSERT INTO site_share_heads(organization_id,app_id,share_revision_id) VALUES($1,$2,$3) ON CONFLICT(organization_id,app_id) DO UPDATE SET share_revision_id=EXCLUDED.share_revision_id',
      [s.organizationId, appId, revisionId],
    );
    return this.settings(tx, s, appId);
  }
  async check(tx: Sql, s: Subject, shareId: string, proof?: TestAppContext): Promise<ShareRow> {
    this.identity.require(s, 'app.view');
    const row = requireValue(
      await tx.one<ShareRow>(selectShare + ' AND h.share_id=$2', [s.organizationId, shareId]),
    );
    if (
      proof &&
      (proof.appId !== row.app_id ||
        proof.versionId !== row.app_version_id ||
        proof.share?.id !== shareId ||
        proof.share.revision !== Number(row.revision))
    )
      throw new Fault(403, 'POLICY_CHANGED');
    if (row.visibility === 'private') await this.studio.app(tx, s, row.app_id);
    const build = await tx.one(
      "SELECT 1 FROM build_jobs WHERE organization_id=$1 AND id=$2 AND app_version_id=$3 AND status='succeeded' AND preview_only=true",
      [s.organizationId, row.build_job_id, row.app_version_id],
    );
    if (!build) throw new Fault(404, 'NOT_FOUND');
    return row;
  }
  /** Replace code for an existing TEST link without changing its audience or data scope. */
  async activate(
    tx: Sql,
    s: Subject,
    appId: string,
    versionId: string,
    expectedRevision: number,
  ): Promise<S['SiteSharing']> {
    await this.studio.app(tx, s, appId, true);
    this.identity.require(s, 'app.develop');
    const member = await tx.one<{ role: string }>(
      'SELECT role FROM app_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
      [s.organizationId, appId, s.userId],
    );
    if (member?.role !== 'maintainer') throw new Fault(403, 'FORBIDDEN');
    await tx.one('SELECT id FROM apps WHERE organization_id=$1 AND id=$2 FOR UPDATE', [
      s.organizationId,
      appId,
    ]);
    const previous = requireValue(
      await tx.one<ShareRow>(selectShare + ' AND h.app_id=$2', [s.organizationId, appId]),
    );
    if (Number(previous.revision) !== expectedRevision) throw new Fault(412, 'REVISION_MISMATCH');
    const version = await this.studio.version(tx, s, appId, versionId, true),
      old = await this.studio.version(tx, s, appId, previous.app_version_id, true);
    await this.studio.validateManifest(tx, s, version.manifest);
    if (canonical(old.manifest.datasetRefs) !== canonical(version.manifest.datasetRefs))
      throw new Fault(
        409,
        'SITE_SHARING_SCOPE_CHANGED',
        '数据授权范围发生变化，请在分享设置中确认范围。',
      );
    const build = requireValue(
      await tx.one<{ id: string }>(
        "SELECT id FROM build_jobs WHERE organization_id=$1 AND app_version_id=$2 AND status='succeeded' AND preview_only=true ORDER BY created_at DESC,id DESC LIMIT 1",
        [s.organizationId, versionId],
      ),
    );
    if (previous.app_version_id === versionId && previous.build_job_id === build.id)
      return this.settings(tx, s, appId);
    const id = randomUUID();
    await tx.exec(
      'INSERT INTO site_share_revisions(id,organization_id,app_id,revision,visibility,app_version_id,build_job_id,changed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        id,
        s.organizationId,
        appId,
        Number(previous.revision) + 1,
        previous.visibility,
        versionId,
        build.id,
        s.userId,
      ],
    );
    await tx.exec(
      'UPDATE site_share_heads SET share_revision_id=$3 WHERE organization_id=$1 AND app_id=$2',
      [s.organizationId, appId, id],
    );
    return this.settings(tx, s, appId);
  }
  async open(tx: Sql, s: Subject, shareId: string): Promise<S['SharedSite']> {
    const row = await this.check(tx, s, shareId),
      version = requireValue(
        await tx.one<{ manifest: S['SourceManifest'] }>(
          'SELECT manifest FROM app_versions WHERE organization_id=$1 AND app_id=$2 AND id=$3',
          [s.organizationId, row.app_id, row.app_version_id],
        ),
      );
    await this.studio.validateManifest(tx, s, version.manifest);
    const artifact = requireValue(
      await tx.one<{ content: Buffer; name: string }>(
        'SELECT b.content,a.name FROM build_jobs j JOIN studio_artifact_blobs b ON b.organization_id=j.organization_id AND b.artifact_id=j.artifact_id JOIN apps a ON a.organization_id=j.organization_id AND a.id=$3 WHERE j.organization_id=$1 AND j.id=$2',
        [s.organizationId, row.build_job_id, row.app_id],
      ),
    );
    return {
      shareId,
      title: artifact.name,
      visibility: row.visibility,
      revision: Number(row.revision),
      preview: {
        appId: row.app_id,
        versionId: row.app_version_id,
        buildId: row.build_job_id,
        environment: 'test',
        manifest: version.manifest,
        html: previewHtml(artifact.content),
      },
    };
  }
  async query(tx: Sql, s: Subject, shareId: string, input: S['StudioQuery'], trace: string) {
    const row = await this.check(tx, s, shareId);
    return this.studio.boundQuery(
      tx,
      s,
      {
        appId: row.app_id,
        versionId: row.app_version_id,
        share: { id: shareId, revision: Number(row.revision) },
      },
      input,
      trace,
    );
  }
  async openPublic(tx: Sql, organizationId: string, shareId: string): Promise<S['SharedSite']> {
    const r = await tx.one<{
      app_id: string;
      app_version_id: string;
      build_job_id: string;
      revision: number;
      name: string;
      manifest: S['SourceManifest'];
      content: Buffer;
    }>(
      `SELECT r.app_id,r.app_version_id,r.build_job_id,r.revision,a.name,v.manifest,b.content FROM site_share_heads h JOIN site_share_revisions r ON r.organization_id=h.organization_id AND r.app_id=h.app_id AND r.id=h.share_revision_id JOIN apps a ON a.organization_id=r.organization_id AND a.id=r.app_id JOIN app_versions v ON v.organization_id=r.organization_id AND v.app_id=r.app_id AND v.id=r.app_version_id JOIN build_jobs j ON j.organization_id=r.organization_id AND j.id=r.build_job_id AND j.app_version_id=v.id JOIN studio_artifact_blobs b ON b.organization_id=j.organization_id AND b.artifact_id=j.artifact_id WHERE h.organization_id=$1 AND h.share_id=$2 AND r.visibility='public' AND j.status='succeeded' AND j.scan_status='passed' AND j.preview_only=true`,
      [organizationId, shareId],
    );
    if (!r) throw new Fault(404, 'NOT_FOUND', '此站点尚未对外公开，或分享链接已停用。');
    return {
      shareId,
      title: r.name,
      visibility: 'public',
      revision: Number(r.revision),
      preview: {
        appId: r.app_id,
        versionId: r.app_version_id,
        buildId: r.build_job_id,
        environment: 'test',
        manifest: r.manifest,
        html: previewHtml(r.content),
      },
    };
  }
}
