import { previewHtml } from './build-artifact.js';
import type { TestAppContext } from './access.js';
import type { ReleaseSource } from './release-port.js';
import { randomUUID, createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import type { components } from '@eas/api-contract';
import { digest, signedRequest, canonical } from '@eas/connector-transport';
import type { Sql, Database } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Identity, Subject } from '../identity/identity.js';
import type { WorkerTarget } from '../infrastructure/worker-target.js';
type S = components['schemas'];
export interface TestQueryPort {
  read(tx: Sql, s: Subject, id: string): Promise<S['QueryJob']>;
  cancel(tx: Sql, s: Subject, id: string): Promise<unknown>;
  auditDenied(tx: Sql, s: Subject, appId: string, trace: string, code: string): Promise<void>;
  inspect(
    tx: Sql,
    s: Subject,
    r: S['DatasetRef'],
  ): Promise<{ fieldKeys: string[]; metricKeys: string[] }>;
  reference(tx: Sql, s: Subject, r: S['DatasetRef']): Promise<void>;
  validate(tx: Sql, s: Subject, q: S['QuerySpec']): Promise<void>;
  create(
    tx: Sql,
    s: Subject,
    q: S['QuerySpec'],
    trace: string,
    app?: TestAppContext,
  ): Promise<unknown>;
}
interface AppRow {
  sharing_visibility?: 'private' | 'organization' | 'public';
  id: string;
  key: string;
  name: string;
  type: 'REPORT' | 'SITE';
  description: string;
  workspace_id: string;
  owner_user_id: string;
  revision: number;
  created_at: Date;
}
interface VersionRow {
  id: string;
  app_id: string;
  version: number;
  source_digest: string;
  manifest: S['SourceManifest'];
  message: string;
  restored_from: string | null;
  changes: string[];
  created_at: Date;
  source_artifact_id: string;
}
interface BuildRow {
  id: string;
  app_version_id: string;
  status: S['StudioBuild']['status'];
  failure_code: string | null;
  logs: string[];
  created_at: Date;
  artifact_id: string | null;
  lease_token: string | null;
}
interface ReportRow {
  id: string;
  app_id: string;
  key: string;
  name: string;
  revision: number;
}
const appDto = (r: AppRow): S['StudioApp'] => ({
  sharingVisibility: r.sharing_visibility ?? 'private',
  id: r.id,
  key: r.key,
  name: r.name,
  type: r.type,
  description: r.description,
  workspaceId: r.workspace_id,
  ownerUserId: r.owner_user_id,
  revision: Number(r.revision),
  createdAt: r.created_at.toISOString(),
});
const versionDto = (r: VersionRow): S['StudioVersion'] => ({
  id: r.id,
  appId: r.app_id,
  version: r.version,
  sourceDigest: r.source_digest,
  manifest: r.manifest,
  message: r.message,
  restoredFrom: r.restored_from,
  changes: r.changes,
  createdAt: r.created_at.toISOString(),
});
const buildDto = (r: BuildRow): S['StudioBuild'] => ({
  id: r.id,
  appVersionId: r.app_version_id,
  status: r.status,
  failureCode: r.failure_code,
  logs: r.logs,
  createdAt: r.created_at.toISOString(),
});
const reportDto = (r: ReportRow): S['StudioReport'] => ({
  id: r.id,
  appId: r.app_id,
  key: r.key,
  name: r.name,
  revision: Number(r.revision),
});
export class StudioService {
  constructor(
    private readonly identity: Identity,
    private readonly queries: TestQueryPort,
    private readonly validate: (name: string, data: unknown) => boolean,
  ) {}
  async releaseApps(tx: Sql, s: Subject) {
    if (!s.actions.has('release.policy.manage')) return (await this.list(tx, s)).items;
    return (
      await tx.all<AppRow>(
        'SELECT * FROM apps WHERE organization_id=$1 ORDER BY created_at DESC,id DESC',
        [s.organizationId],
      )
    ).map(appDto);
  }
  async freezeRelease(
    tx: Sql,
    s: Subject,
    versionId: string,
    buildId: string,
  ): Promise<ReleaseSource> {
    const v = await tx.one<VersionRow>(
      'SELECT * FROM app_versions WHERE organization_id=$1 AND id=$2',
      [s.organizationId, versionId],
    );
    if (!v)
      throw new Fault(
        404,
        'RELEASE_VERSION_NOT_FOUND',
        '创建上线申请失败：所选源码版本在当前组织中不存在。',
        [{ field: 'appVersionId', reason: versionId }],
      );
    if (v.manifest.runtime)
      throw new Fault(
        409,
        'FULLSTACK_PRODUCTION_NOT_CONFIGURED',
        '此站点已有独立 TEST 后端；正式生产部署需配置对应的后端发布与生产数据源映射，不能按静态页面发布。',
      );
    const app = await this.app(tx, s, v.app_id, true).catch((error) => {
      if (error instanceof Fault && error.status === 404)
        throw new Fault(
          403,
          'APP_MAINTENANCE_REQUIRED',
          '创建上线申请失败：当前账号不是该应用的开发者或维护者。',
          [{ field: 'appId', reason: v.app_id }],
        );
      throw error;
    });
    await this.validateManifest(tx, s, v.manifest);
    const b = await tx.one<{ id: string; artifact_id: string; artifact_digest: string }>(
      "SELECT * FROM build_jobs WHERE organization_id=$1 AND id=$2 AND app_version_id=$3 AND status='succeeded' AND scan_status='passed'",
      [s.organizationId, buildId, versionId],
    );
    if (!b)
      throw new Fault(409, 'RELEASE_BUILD_NOT_READY', '所选源码版本尚无可发布的成功构建。', [
        { field: 'buildJobId', reason: '请在申请页构建所选版本，并使用该版本的成功构建。' },
      ]);
    const source = await tx.one<{ content: Buffer }>(
      'SELECT content FROM studio_artifact_blobs WHERE organization_id=$1 AND artifact_id=$2',
      [s.organizationId, v.source_artifact_id],
    );
    if (!source)
      throw new Fault(
        409,
        'RELEASE_SOURCE_UNAVAILABLE',
        '创建上线申请失败：所选版本的源码文件缺失。',
        [{ field: 'appVersionId', reason: versionId }],
      );
    const output = await tx.one<{ content: Buffer; digest: string }>(
      "SELECT b.content,a.digest FROM studio_artifact_blobs b JOIN artifacts a ON a.organization_id=b.organization_id AND a.id=b.artifact_id WHERE b.organization_id=$1 AND b.artifact_id=$2 AND a.status='sealed'",
      [s.organizationId, b.artifact_id],
    );
    if (!output)
      throw new Fault(
        409,
        'BUILD_ARTIFACT_UNAVAILABLE',
        '创建上线申请失败：所选构建的产物文件缺失或未封存，请重新构建。',
        [{ field: 'buildJobId', reason: buildId }],
      );
    const hash = (content: Buffer) =>
      'sha256:' + createHash('sha256').update(content).digest('hex');
    if (
      hash(source.content) !== v.source_digest ||
      hash(output.content) !== b.artifact_digest ||
      output.digest !== b.artifact_digest
    )
      throw new Fault(422, 'RELEASE_CONTENT_CHANGED', '版本或构建产物的实际内容与封存摘要不一致。');
    const reports = await tx.all(
      `SELECT v.id,v.config,v.config_digest,b.query_key,b.query_spec FROM app_version_reports a JOIN report_versions v ON v.organization_id=a.organization_id AND v.id=a.report_version_id JOIN report_version_datasets b ON b.organization_id=v.organization_id AND b.report_version_id=v.id WHERE a.organization_id=$1 AND a.app_version_id=$2 ORDER BY v.id,b.query_key`,
      [s.organizationId, versionId],
    );
    return {
      appId: app.id,
      appName: app.name,
      appVersionId: v.id,
      version: Number(v.version),
      buildJobId: b.id,
      sourceDigest: v.source_digest,
      artifactId: b.artifact_id,
      artifactDigest: b.artifact_digest,
      html: output.content.toString(),
      manifest: v.manifest,
      changes: v.changes,
      reports,
    };
  }
  async app(tx: Sql, s: Subject, id: string, write = false) {
    this.identity.require(s, write ? 'app.develop' : 'app.view');
    const r = requireValue(
      await tx.one<AppRow>(
        "SELECT a.*,coalesce(r.visibility,'private') sharing_visibility FROM apps a LEFT JOIN site_share_heads h ON h.organization_id=a.organization_id AND h.app_id=a.id LEFT JOIN site_share_revisions r ON r.organization_id=h.organization_id AND r.id=h.share_revision_id WHERE a.organization_id=$1 AND a.id=$2",
        [s.organizationId, id],
      ),
    );
    const m = await tx.one<{ role: string }>(
      'SELECT role FROM app_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
      [s.organizationId, id, s.userId],
    );
    if (!m || (write && !['developer', 'maintainer'].includes(m.role)))
      throw new Fault(404, 'NOT_FOUND');
    return r;
  }
  async list(tx: Sql, s: Subject) {
    this.identity.require(s, 'app.view');
    return {
      items: (
        await tx.all<AppRow>(
          "SELECT a.*,coalesce(r.visibility,'private') sharing_visibility FROM apps a JOIN app_members m ON m.organization_id=a.organization_id AND m.app_id=a.id LEFT JOIN site_share_heads h ON h.organization_id=a.organization_id AND h.app_id=a.id LEFT JOIN site_share_revisions r ON r.organization_id=h.organization_id AND r.id=h.share_revision_id WHERE a.organization_id=$1 AND m.user_id=$2 ORDER BY a.created_at DESC,a.id DESC LIMIT 100",
          [s.organizationId, s.userId],
        )
      ).map(appDto),
      nextCursor: null,
    };
  }
  async get(tx: Sql, s: Subject, id: string) {
    return appDto(await this.app(tx, s, id));
  }
  async checkRefs(tx: Sql, s: Subject, refs: S['DatasetRef'][]) {
    const ids = new Set<string>();
    for (const ref of refs) {
      if (ids.has(ref.datasetId)) throw new Fault(422, 'DUPLICATE_DATASET');
      ids.add(ref.datasetId);
      await this.queries.reference(tx, s, ref);
    }
  }
  async create(tx: Sql, s: Subject, b: S['StudioAppCreate']) {
    this.identity.require(s, 'app.create');
    await this.checkRefs(tx, s, b.datasetRefs);
    const id = randomUUID();
    await tx.exec("INSERT INTO resources(id,organization_id,kind) VALUES($1,$2,'app')", [
      id,
      s.organizationId,
    ]);
    const row = requireValue(
      await tx.one<AppRow>(
        'INSERT INTO apps(id,organization_id,key,name,type,description,workspace_id,owner_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [id, s.organizationId, b.key, b.name, b.type, b.description, b.workspaceId, s.userId],
      ),
    );
    await tx.exec(
      "INSERT INTO app_members(organization_id,app_id,user_id,role) VALUES($1,$2,$3,'maintainer')",
      [s.organizationId, id, s.userId],
    );
    for (const r of b.datasetRefs)
      await tx.exec('INSERT INTO app_dataset_bindings VALUES($1,$2,$3)', [
        s.organizationId,
        id,
        r.datasetVersionId,
      ]);
    return appDto(row);
  }
  async validateManifest(tx: Sql, s: Subject, m: S['SourceManifest']) {
    if (!this.validate('SourceManifest', m)) throw new Fault(400, 'VALIDATION_ERROR');
    await this.checkRefs(tx, s, m.datasetRefs);
    const keys = new Set<string>();
    for (const q of m.queries) {
      if (
        keys.has(q.key) ||
        !m.datasetRefs.some(
          (r) =>
            r.datasetId === q.query.datasetId && r.datasetVersionId === q.query.datasetVersionId,
        )
      )
        throw new Fault(422, 'INVALID_QUERY_BINDING');
      keys.add(q.key);
      await this.queries.validate(tx, s, q.query);
    }
    if (m.report) {
      await this.validateReport(tx, s, m.report);
      if (
        canonical(m.report.queries) !== canonical(m.queries) ||
        canonical(m.report.datasetRefs) !== canonical(m.datasetRefs)
      )
        throw new Fault(422, 'REPORT_BINDING_MISMATCH');
    }
  }
  async inspectManifest(tx: Sql, s: Subject, m: S['SourceManifest']) {
    // Version history is catalog metadata. It must not depend on TEST connection availability,
    // row policies or query execution grants. Field visibility still follows live dataset.read access.
    if (!this.validate('SourceManifest', m)) throw new Fault(400, 'VALIDATION_ERROR');
    const scopes = new Map<
      string,
      { versionId: string; fieldKeys: string[]; metricKeys: string[] }
    >();
    for (const ref of m.datasetRefs) {
      if (scopes.has(ref.datasetId)) throw new Fault(422, 'DUPLICATE_DATASET');
      scopes.set(ref.datasetId, {
        versionId: ref.datasetVersionId,
        ...(await this.queries.inspect(tx, s, ref)),
      });
    }
    const keys = new Set<string>();
    for (const bound of m.queries) {
      const q = bound.query,
        scope = scopes.get(q.datasetId);
      if (keys.has(bound.key) || !scope || scope.versionId !== q.datasetVersionId)
        throw new Fault(422, 'INVALID_QUERY_BINDING');
      keys.add(bound.key);
      const fields = [
        ...q.dimensions,
        ...q.groupBy,
        ...q.filters.map((f) => f.fieldKey),
        ...(q.timeRange ? [q.timeRange.fieldKey] : []),
      ];
      if (
        fields.some((key) => !scope.fieldKeys.includes(key)) ||
        q.metrics.some((key) => !scope.metricKeys.includes(key)) ||
        q.orderBy.some(
          (order) => !scope.fieldKeys.includes(order.key) && !scope.metricKeys.includes(order.key),
        )
      )
        throw new Fault(
          403,
          'VERSION_METADATA_ACCESS_DENIED',
          '此版本包含当前账号无权查看的字段或指标。',
          [
            { field: 'queryKey', reason: bound.key },
            { field: 'datasetId', reason: q.datasetId },
          ],
        );
    }
    if (
      m.report &&
      (canonical(m.report.queries) !== canonical(m.queries) ||
        canonical(m.report.datasetRefs) !== canonical(m.datasetRefs))
    )
      throw new Fault(422, 'REPORT_BINDING_MISMATCH');
  }
  async validateReport(tx: Sql, s: Subject, r: S['ReportDefinition']) {
    if (!this.validate('ReportDefinition', r)) throw new Fault(400, 'REPORT_SCHEMA_INVALID');
    await this.checkRefs(tx, s, r.datasetRefs);
    const queryKeys = new Set<string>(),
      chartIds = new Set<string>();
    for (const q of r.queries) {
      if (
        queryKeys.has(q.key) ||
        !r.datasetRefs.some(
          (d) =>
            d.datasetId === q.query.datasetId && d.datasetVersionId === q.query.datasetVersionId,
        )
      )
        throw new Fault(422, 'INVALID_QUERY_BINDING');
      queryKeys.add(q.key);
      await this.queries.validate(tx, s, q.query);
    }
    for (const chart of r.chartDefinitions) {
      const q = r.queries.find((q) => q.key === chart.queryKey)?.query;
      if (
        chartIds.has(chart.id) ||
        !q ||
        ![...q.dimensions, ...q.metrics].includes(chart.valueKey) ||
        (chart.categoryKey && !q.dimensions.includes(chart.categoryKey)) ||
        (!['metric', 'table'].includes(chart.type) && !chart.categoryKey)
      )
        throw new Fault(422, 'INVALID_CHART_BINDING');
      chartIds.add(chart.id);
    }
    const metricKeys = new Set(r.queries.flatMap((q) => q.query.metrics)),
      dimensions = new Set(r.queries.flatMap((q) => q.query.dimensions));
    if (r.metrics.some((k) => !metricKeys.has(k)) || r.dimensions.some((k) => !dimensions.has(k)))
      throw new Fault(422, 'INVALID_SEMANTIC_REFERENCE');
    for (const f of r.filters)
      if (
        !r.queries.some(
          (q) =>
            q.query.dimensions.includes(f.fieldKey) || q.query.timeRange?.fieldKey === f.fieldKey,
        )
      )
        throw new Fault(422, 'INVALID_FILTER_BINDING');
  }
  async inspectReport(tx: Sql, s: Subject, r: S['ReportDefinition']) {
    if (!this.validate('ReportDefinition', r)) throw new Fault(400, 'REPORT_SCHEMA_INVALID');
    await this.inspectManifest(tx, s, {
      schemaVersion: r.schemaVersion,
      entrypoint: 'src/main.tsx',
      datasetRefs: r.datasetRefs,
      queries: r.queries,
      report: r,
    });
  }
  async version(tx: Sql, s: Subject, appId: string, id: string, write = false) {
    await this.app(tx, s, appId, write);
    return requireValue(
      await tx.one<VersionRow>(
        'SELECT * FROM app_versions WHERE organization_id=$1 AND app_id=$2 AND id=$3',
        [s.organizationId, appId, id],
      ),
    );
  }
  async versions(tx: Sql, s: Subject, id: string) {
    await this.app(tx, s, id);
    const rows = await tx.all<VersionRow>(
      'SELECT * FROM app_versions WHERE organization_id=$1 AND app_id=$2 ORDER BY version DESC LIMIT 100',
      [s.organizationId, id],
    );
    for (const r of rows) await this.inspectManifest(tx, s, r.manifest);
    return { items: await this.versionBuildDetails(tx, s, rows), nextCursor: null };
  }
  async getVersion(tx: Sql, s: Subject, a: string, v: string) {
    const row = await this.version(tx, s, a, v);
    await this.inspectManifest(tx, s, row.manifest);
    return (await this.versionBuildDetails(tx, s, [row]))[0]!;
  }
  async versionBuildDetails(
    tx: Sql,
    s: Subject,
    rows: VersionRow[],
  ): Promise<S['StudioVersion'][]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id),
      latest = await tx.all<BuildRow>(
        'SELECT DISTINCT ON(app_version_id) * FROM build_jobs WHERE organization_id=$1 AND app_version_id=ANY($2::uuid[]) ORDER BY app_version_id,created_at DESC,id DESC',
        [s.organizationId, ids],
      );
    const succeeded = await tx.all<{ app_version_id: string; id: string }>(
      "SELECT DISTINCT ON(b.app_version_id) b.app_version_id,b.id FROM build_jobs b JOIN artifacts a ON a.organization_id=b.organization_id AND a.id=b.artifact_id AND a.status='sealed' AND a.digest=b.artifact_digest JOIN studio_artifact_blobs blob ON blob.organization_id=a.organization_id AND blob.artifact_id=a.id WHERE b.organization_id=$1 AND b.app_version_id=ANY($2::uuid[]) AND b.status='succeeded' AND b.scan_status='passed' ORDER BY b.app_version_id,b.created_at DESC,b.id DESC",
      [s.organizationId, ids],
    );
    const latestByVersion = new Map(latest.map((build) => [build.app_version_id, build])),
      successByVersion = new Map(succeeded.map((build) => [build.app_version_id, build.id]));
    return rows.map((row) => {
      const build = latestByVersion.get(row.id);
      return {
        ...versionDto(row),
        latestBuild: build ? buildDto(build) : null,
        successfulBuildId: successByVersion.get(row.id) ?? null,
      };
    });
  }
  async authorizeRestore(tx: Sql, s: Subject, a: string, v: string) {
    const row = await this.version(tx, s, a, v, true);
    await this.validateManifest(tx, s, row.manifest);
  }
  async artifact(tx: Sql, s: Subject, kind: 'source' | 'build', content: Buffer) {
    const hash = 'sha256:' + createHash('sha256').update(content).digest('hex'),
      id = randomUUID();
    await tx.exec(
      "INSERT INTO artifacts(id,organization_id,kind,object_key,digest,size_bytes,status,owner_user_id) VALUES($1,$2,$3,$4,$5,$6,'sealed',$7)",
      [id, s.organizationId, kind, kind + '/' + id, hash, content.length, s.userId],
    );
    await tx.exec('INSERT INTO studio_artifact_blobs VALUES($1,$2,$3)', [
      s.organizationId,
      id,
      content,
    ]);
    return { id, hash };
  }
  async upload(
    tx: Sql,
    s: Subject,
    appId: string,
    b: S['SourceUpload'],
    restoredFrom: string | null = null,
  ) {
    await this.app(tx, s, appId, true);
    await this.validateManifest(tx, s, b.manifest);
    let reportVersionId: string | undefined;
    if (b.manifest.report) {
      const report = await this.report(tx, s, b.manifest.report.reportId, true);
      if (report.app_id !== appId) throw new Fault(422, 'REPORT_BINDING_MISMATCH');
      const rv = await tx.one<{ id: string }>(
        'SELECT id FROM report_versions WHERE organization_id=$1 AND report_id=$2 AND config_digest=$3 ORDER BY version DESC LIMIT 1',
        [s.organizationId, report.id, digest(b.manifest.report)],
      );
      if (!rv) throw new Fault(422, 'REPORT_VERSION_REQUIRED');
      reportVersionId = rv.id;
    }
    const names = new Set<string>();
    let bytes = 0;
    for (const f of b.files) {
      if (
        names.has(f.path.toLowerCase()) ||
        f.path.split('/').some((p) => p === '.' || p === '..' || p.startsWith('.')) ||
        f.path.includes('\\') ||
        f.content.includes('\0')
      )
        throw new Fault(422, 'SOURCE_PATH_REJECTED');
      names.add(f.path.toLowerCase());
      bytes += Buffer.byteLength(f.content);
    }
    if (bytes > 4 * 1024 * 1024 || !names.has('src/main.tsx'))
      throw new Fault(413, 'SOURCE_LIMIT_EXCEEDED');
    const normalized = {
      manifest: b.manifest,
      files: [...b.files].sort((a, b) => a.path.localeCompare(b.path)),
      message: b.message,
    };
    const previous = await tx.one<VersionRow>(
      'SELECT * FROM app_versions WHERE organization_id=$1 AND app_id=$2 ORDER BY version DESC LIMIT 1',
      [s.organizationId, appId],
    );
    let oldFiles: S['SourceUpload']['files'] = [];
    if (previous) {
      const old = await tx.one<{ content: Buffer }>(
        'SELECT content FROM studio_artifact_blobs WHERE organization_id=$1 AND artifact_id=$2',
        [s.organizationId, previous.source_artifact_id],
      );
      if (old) oldFiles = (JSON.parse(old.content.toString()) as S['SourceUpload']).files;
    }
    const changes = [...new Set([...oldFiles.map((f) => f.path), ...b.files.map((f) => f.path)])]
      .filter(
        (p) =>
          oldFiles.find((f) => f.path === p)?.content !==
          b.files.find((f) => f.path === p)?.content,
      )
      .map(
        (p) =>
          (!oldFiles.some((f) => f.path === p)
            ? 'added: '
            : !b.files.some((f) => f.path === p)
              ? 'removed: '
              : 'modified: ') + p,
      );
    if (previous && canonical(previous.manifest) !== canonical(b.manifest))
      changes.push('modified: studio.manifest.json');
    const artifact = await this.artifact(tx, s, 'source', Buffer.from(canonical(normalized)));
    const saved = requireValue(
      await tx.one<VersionRow>(
        'INSERT INTO app_versions(organization_id,app_id,version,source_artifact_id,source_digest,manifest,created_by,message,restored_from,changes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
        [
          s.organizationId,
          appId,
          (previous?.version ?? 0) + 1,
          artifact.id,
          artifact.hash,
          JSON.stringify(b.manifest),
          s.userId,
          b.message,
          restoredFrom,
          JSON.stringify(changes),
        ],
      ),
    );
    if (reportVersionId)
      await tx.exec('INSERT INTO app_version_reports VALUES($1,$2,$3,$4)', [
        s.organizationId,
        appId,
        saved.id,
        reportVersionId,
      ]);
    return versionDto(saved);
  }
  async restore(tx: Sql, s: Subject, a: string, b: S['RestoreVersion']) {
    const old = await this.version(tx, s, a, b.versionId, true),
      blob = requireValue(
        await tx.one<{ content: Buffer }>(
          'SELECT content FROM studio_artifact_blobs WHERE organization_id=$1 AND artifact_id=$2',
          [s.organizationId, old.source_artifact_id],
        ),
      );
    return this.upload(
      tx,
      s,
      a,
      { ...(JSON.parse(blob.content.toString()) as S['SourceUpload']), message: b.message },
      old.id,
    );
  }
  async build(tx: Sql, s: Subject, id: string, enabled: boolean) {
    if (!enabled) throw new Fault(503, 'BUILD_WORKER_NOT_CONFIGURED');
    const v = requireValue(
      await tx.one<VersionRow>('SELECT * FROM app_versions WHERE organization_id=$1 AND id=$2', [
        s.organizationId,
        id,
      ]),
    );
    await this.app(tx, s, v.app_id, true);
    await this.validateManifest(tx, s, v.manifest);
    const pending = await tx.one<BuildRow>(
      "SELECT * FROM build_jobs WHERE organization_id=$1 AND app_version_id=$2 AND status IN('queued','running') ORDER BY created_at DESC,id DESC LIMIT 1",
      [s.organizationId, id],
    );
    if (pending) return buildDto(pending);
    return buildDto(
      requireValue(
        await tx.one<BuildRow>(
          "INSERT INTO build_jobs(organization_id,app_version_id,status,template_digest,lock_digest,logs) VALUES($1,$2,'queued',$3,$4,$5) RETURNING *",
          [
            s.organizationId,
            id,
            digest('react-static-v1'),
            digest('react19.3.1-echarts6.1.0-esbuild0.27.0'),
            JSON.stringify(['Source sealed. Awaiting fixed-profile compiler.']),
          ],
        ),
      ),
    );
  }
  async getBuild(tx: Sql, s: Subject, id: string) {
    const b = requireValue(
        await tx.one<BuildRow>('SELECT * FROM build_jobs WHERE organization_id=$1 AND id=$2', [
          s.organizationId,
          id,
        ]),
      ),
      v = requireValue(
        await tx.one<VersionRow>('SELECT * FROM app_versions WHERE organization_id=$1 AND id=$2', [
          s.organizationId,
          b.app_version_id,
        ]),
      );
    await this.app(tx, s, v.app_id);
    return buildDto(b);
  }
  async preview(tx: Sql, s: Subject, a: string, id: string) {
    const v = await this.version(tx, s, a, id);
    await this.validateManifest(tx, s, v.manifest);
    const b = await tx.one<BuildRow>(
      "SELECT * FROM build_jobs WHERE organization_id=$1 AND app_version_id=$2 AND status='succeeded' AND scan_status='passed' ORDER BY created_at DESC,id DESC LIMIT 1",
      [s.organizationId, id],
    );
    if (!b) {
      const latest = await tx.one<BuildRow>(
        'SELECT * FROM build_jobs WHERE organization_id=$1 AND app_version_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1',
        [s.organizationId, id],
      );
      const code = !latest
        ? 'BUILD_NOT_STARTED'
        : ['queued', 'running'].includes(latest.status)
          ? 'BUILD_IN_PROGRESS'
          : 'BUILD_FAILED';
      const reason =
        '版本 ' +
        v.version +
        (!latest
          ? ' 只有源码提交记录，尚未构建。'
          : latest.status === 'queued'
            ? ' 正在排队构建。'
            : latest.status === 'running'
              ? ' 正在构建。'
              : ' 最近构建未成功' +
                (latest.failure_code && /^[A-Z_]+$/.test(latest.failure_code)
                  ? '，错误码 ' + latest.failure_code
                  : '') +
                '。');
      throw new Fault(409, code, reason, [{ field: 'appVersionId', reason }]);
    }
    const blob = await tx.one<{ content: Buffer }>(
      'SELECT content FROM studio_artifact_blobs WHERE organization_id=$1 AND artifact_id=$2',
      [s.organizationId, b.artifact_id],
    );
    if (!blob)
      throw new Fault(409, 'BUILD_ARTIFACT_UNAVAILABLE', '构建产物不可用，请重新构建此源码版本。');
    return {
      appId: a,
      versionId: id,
      buildId: b.id,
      environment: 'test' as const,
      manifest: v.manifest,
      html: previewHtml(blob.content),
    };
  }
  async query(tx: Sql, s: Subject, a: string, id: string, b: S['StudioQuery'], trace: string) {
    await this.version(tx, s, a, id);
    return this.boundQuery(tx, s, { appId: a, versionId: id }, b, trace);
  }
  async boundQuery(
    tx: Sql,
    s: Subject,
    context: TestAppContext,
    b: S['StudioQuery'],
    trace: string,
  ) {
    const v = requireValue(
      await tx.one<VersionRow>(
        'SELECT * FROM app_versions WHERE organization_id=$1 AND app_id=$2 AND id=$3',
        [s.organizationId, context.appId, context.versionId],
      ),
    );
    const bound = v.manifest.queries.find((q) => q.key === b.queryKey);
    if (!bound)
      throw new Fault(422, 'INVALID_QUERY_BINDING', '该应用版本未登记请求的查询。', [
        { field: 'queryKey', reason: '请使用此版本 studio.manifest.json 已登记的查询 key。' },
      ]);
    const q = {
      ...bound.query,
      filters: [...bound.query.filters, ...b.filters],
      ...(b.timeRange ? { timeRange: b.timeRange } : {}),
    };
    if (b.timeRange && b.timeRange.fieldKey !== bound.query.timeRange?.fieldKey)
      throw new Fault(422, 'INVALID_FILTER_BINDING', '日期筛选与应用版本的查询绑定不一致。', [
        {
          field: 'timeRange.fieldKey',
          reason: bound.query.timeRange
            ? '查询 ' + bound.key + ' 的日期字段应为 ' + bound.query.timeRange.fieldKey + '。'
            : '查询 ' +
              bound.key +
              ' 未配置 timeRange 日期字段。请在 studio.manifest.json 中登记 ' +
              b.timeRange.fieldKey +
              '，提交并重新构建版本。',
        },
      ]);
    return this.queries.create(tx, s, q, trace, context);
  }
  async report(tx: Sql, s: Subject, id: string, write = false) {
    this.identity.require(s, 'report.view');
    const r = requireValue(
      await tx.one<ReportRow>('SELECT * FROM reports WHERE organization_id=$1 AND id=$2', [
        s.organizationId,
        id,
      ]),
    );
    await this.app(tx, s, r.app_id, write);
    return r;
  }
  async listReports(tx: Sql, s: Subject) {
    this.identity.require(s, 'report.view');
    return {
      items: (
        await tx.all<ReportRow>(
          'SELECT r.* FROM reports r JOIN app_members m ON m.organization_id=r.organization_id AND m.app_id=r.app_id WHERE r.organization_id=$1 AND m.user_id=$2 ORDER BY r.created_at DESC LIMIT 100',
          [s.organizationId, s.userId],
        )
      ).map(reportDto),
      nextCursor: null,
    };
  }
  async createReport(tx: Sql, s: Subject, b: S['StudioReportCreate']) {
    await this.app(tx, s, b.appId, true);
    const id = randomUUID();
    await tx.exec("INSERT INTO resources(id,organization_id,kind) VALUES($1,$2,'report')", [
      id,
      s.organizationId,
    ]);
    return reportDto(
      requireValue(
        await tx.one<ReportRow>(
          'INSERT INTO reports(id,organization_id,app_id,key,name) VALUES($1,$2,$3,$4,$5) RETURNING *',
          [id, s.organizationId, b.appId, b.key, b.name],
        ),
      ),
    );
  }
  async reportVersions(tx: Sql, s: Subject, id: string) {
    await this.report(tx, s, id);
    const rows = await tx.all<S['StudioReportVersion']>(
      'SELECT id,report_id AS "reportId",version,config,config_digest AS "configDigest",created_at AS "createdAt" FROM report_versions WHERE organization_id=$1 AND report_id=$2 ORDER BY version DESC LIMIT 100',
      [s.organizationId, id],
    );
    for (const r of rows) await this.inspectReport(tx, s, r.config);
    return { items: rows, nextCursor: null };
  }
  async authorizeReportRestore(tx: Sql, s: Subject, id: string, v: string) {
    await this.report(tx, s, id, true);
    const row = requireValue(
      await tx.one<{ config: S['ReportDefinition'] }>(
        'SELECT config FROM report_versions WHERE organization_id=$1 AND report_id=$2 AND id=$3',
        [s.organizationId, id, v],
      ),
    );
    await this.validateReport(tx, s, row.config);
  }
  async saveReport(tx: Sql, s: Subject, id: string, config: S['ReportDefinition']) {
    const r = await this.report(tx, s, id, true);
    if (config.reportId !== id) throw new Fault(422, 'REPORT_BINDING_MISMATCH');
    await this.validateReport(tx, s, config);
    const v = requireValue(
      await tx.one<S['StudioReportVersion']>(
        'INSERT INTO report_versions(organization_id,report_id,app_id,version,config,config_digest) SELECT $1,$2,$3,coalesce(max(version),0)+1,$4,$5 FROM report_versions WHERE organization_id=$1 AND report_id=$2 RETURNING id,report_id AS "reportId",version,config,config_digest AS "configDigest",created_at AS "createdAt"',
        [s.organizationId, id, r.app_id, JSON.stringify(config), digest(config)],
      ),
    );
    for (const q of config.queries)
      await tx.exec('INSERT INTO report_version_datasets VALUES($1,$2,$3,$4,$5)', [
        s.organizationId,
        v.id,
        q.key,
        q.query.datasetVersionId,
        JSON.stringify(q.query),
      ]);
    await tx.exec('UPDATE reports SET revision=revision+1 WHERE organization_id=$1 AND id=$2', [
      s.organizationId,
      id,
    ]);
    return v;
  }
  async restoreReport(tx: Sql, s: Subject, id: string, b: S['RestoreVersion']) {
    await this.report(tx, s, id, true);
    const v = requireValue(
      await tx.one<{ config: S['ReportDefinition'] }>(
        'SELECT config FROM report_versions WHERE organization_id=$1 AND report_id=$2 AND id=$3',
        [s.organizationId, id, b.versionId],
      ),
    );
    return this.saveReport(tx, s, id, v.config);
  }
}
export class StudioBuilds {
  private timer: ReturnType<typeof setInterval> | undefined;
  private task: Promise<void> | undefined;
  private stopped = false;
  constructor(
    private readonly db: Database,
    private readonly service: StudioService,
    private readonly identity: Identity,
    private readonly worker: WorkerTarget | undefined,
  ) {}
  start() {
    if (this.worker) {
      this.timer = setInterval(() => {
        if (!this.task && !this.stopped)
          this.task = this.tick()
            .catch(() => {})
            .finally(() => {
              this.task = undefined;
            });
      }, 300);
      this.timer.unref();
    }
  }
  async close() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.task;
  }
  private async tick() {
    for (const org of await this.db.global.all<{ id: string }>('SELECT id FROM organizations')) {
      if (this.stopped) return;
      const leased = await this.db.tenant(org.id, async (tx) => {
        await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org.id]);
        await tx.exec(
          "UPDATE build_jobs SET status='failed',failure_code='BUILD_LEASE_EXPIRED',logs='[\"Compiler lease expired; create a new build.\"]' WHERE organization_id=$1 AND status='running' AND lease_expires_at<now()",
          [org.id],
        );
        const b = await tx.one<BuildRow>(
          "SELECT * FROM build_jobs WHERE organization_id=$1 AND status='queued' ORDER BY created_at,id LIMIT 1 FOR UPDATE",
          [org.id],
        );
        if (!b) return null;
        const token = randomUUID();
        await tx.exec(
          "UPDATE build_jobs SET status='running',lease_token=$3,lease_expires_at=now()+interval '40 seconds' WHERE organization_id=$1 AND id=$2",
          [org.id, b.id, token],
        );
        const v = requireValue(
          await tx.one<VersionRow & { created_by: string }>(
            'SELECT * FROM app_versions WHERE organization_id=$1 AND id=$2',
            [org.id, b.app_version_id],
          ),
        );
        const blob = requireValue(
          await tx.one<{ content: Buffer }>(
            'SELECT content FROM studio_artifact_blobs WHERE organization_id=$1 AND artifact_id=$2',
            [org.id, v.source_artifact_id],
          ),
        );
        return { b, v, token, upload: JSON.parse(blob.content.toString()) as S['SourceUpload'] };
      });
      if (!leased) continue;
      let html: string | null = null,
        code = 'BUILD_FAILED',
        diagnostics: string[] = [];
      try {
        const w = this.worker!;
        const r = await signedRequest<{
          ok: boolean;
          gzip?: string;
          code?: string;
          diagnostics?: string[];
        }>(
          new URL('/compile', w.url),
          w.key,
          {
            profile: leased.v.manifest.runtime ? 'site-fullstack-v1' : 'react-static-v1',
            files: leased.upload.files,
            ...(leased.v.manifest.runtime ? { runtime: leased.v.manifest.runtime } : {}),
          },
          { tls: w.tls, allowLocalHttp: w.allowLocalHttp, timeoutMs: 30000 },
        );
        if (r.ok && r.gzip) {
          html = gunzipSync(Buffer.from(r.gzip, 'base64'), { maxOutputLength: 8388608 }).toString();
        } else {
          diagnostics = r.diagnostics?.filter((value) => typeof value === 'string') ?? [];
          code = [
            'SOURCE_IMPORT_REJECTED',
            'SOURCE_PATH_REJECTED',
            'SOURCE_SYNTAX_INVALID',
            'BUILD_OUTPUT_TOO_LARGE',
            'SITE_BACKEND_BUILD_FAILED',
            'SITE_BACKEND_ENTRY_REQUIRED',
          ].includes(r.code ?? '')
            ? r.code!
            : 'BUILD_FAILED';
        }
      } catch {
        code = 'BUILD_WORKER_UNAVAILABLE';
      }
      await this.db.tenant(org.id, async (tx) => {
        await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org.id]);
        const current = await tx.one<BuildRow>(
          "SELECT * FROM build_jobs WHERE organization_id=$1 AND id=$2 AND status='running' AND lease_token=$3 AND lease_expires_at>now()",
          [org.id, leased.b.id, leased.token],
        );
        if (!current) return;
        if (html) {
          try {
            const s = await this.identity.subject(
              tx,
              {
                userId: leased.v.created_by,
                displayName: 'build',
                clientKind: 'ai',
                authenticatedAt: 0,
              },
              org.id,
            );
            await this.service.app(tx, s, leased.v.app_id, true);
            await this.service.validateManifest(tx, s, leased.v.manifest);
            const a = await this.service.artifact(tx, s, 'build', Buffer.from(html));
            await tx.exec(
              "UPDATE build_jobs SET status='succeeded',artifact_id=$3,artifact_digest=$4,scan_status='passed',attestation_ref=$5,logs=$6 WHERE organization_id=$1 AND id=$2",
              [
                org.id,
                current.id,
                a.id,
                a.hash,
                'static-profile:' + a.hash,
                JSON.stringify([
                  'Fixed-profile compile completed.',
                  'No project scripts or dependency installation executed.',
                  'TEST preview ready; production attestation not issued.',
                ]),
              ],
            );
            return;
          } catch {
            code = 'POLICY_CHANGED';
          }
        }
        await tx.exec(
          "UPDATE build_jobs SET status='failed',failure_code=$3,scan_status='blocked',logs=$4 WHERE organization_id=$1 AND id=$2",
          [org.id, current.id, code, JSON.stringify([code, ...diagnostics])],
        );
      });
    }
  }
}
