import type { TestAppAccessPort, TestAppContext } from '../studio/access.js';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { digest } from '@eas/connector-transport';
import type { GatewayPlan, components } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
import type { Identity, Subject, Actor } from '../identity/identity.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { QueryCatalogPort } from '../catalog/query-port.js';
import { RuntimeQueryAccess, type RuntimeQueryContext } from '../releases/query-access.js';
type S = components['schemas'];
export type Purpose = 'query' | 'export';
export interface PolicyRow {
  id: string;
  organization_id: string;
  dataset_id: string;
  dataset_version_id: string;
  revision: number;
  definition: S['QueryPolicyInput'];
  digest: string;
  row_policy_key: string;
  created_at: Date;
}
export interface GatewayJobRow {
  id: string;
  organization_id: string;
  initiator_user_id: string;
  app_version_id: string | null;
  dataset_id: string;
  dataset_version_id: string;
  environment: 'test' | 'production';
  physical_connection_id: string;
  mapping_id: string;
  logical_data_source_id: string;
  deployment_id: string | null;
  runtime_grant_id: string | null;
  report_version_id: string | null;
  query_spec: S['QuerySpec'];
  query_policy_id: string;
  policy_epoch: number;
  purpose: Purpose;
  context: {
    releaseRequestId?: string | null;
    actor: Actor;
    runtime?: RuntimeQueryContext;
    testApp?: TestAppContext;
    appId: string | null;
    reportId: string | null;
  };
  authorization_digest: string;
  trace_id: string;
  attempt: number;
  status: S['QueryJob']['status'];
  result: S['QueryResult'] | null;
  failure_code: string | null;
  duration_ms: number | null;
  row_count: number;
  lease_expires_at: Date | null;
  expires_at: Date;
  created_at: Date;
}
export const policyDto = (p: PolicyRow): S['QueryPolicy'] => ({
  ...p.definition,
  id: p.id,
  organizationId: p.organization_id,
  datasetId: p.dataset_id,
  revision: p.revision,
  digest: p.digest,
  createdAt: p.created_at.toISOString(),
});
export const jobDto = (j: GatewayJobRow, includeResult = true): S['QueryJob'] => ({
  deploymentId: j.deployment_id,
  releaseRequestId: j.context.releaseRequestId ?? null,
  id: j.id,
  organizationId: j.organization_id,
  createdAt: j.created_at.toISOString(),
  environment: j.environment,
  datasetId: j.dataset_id,
  traceId: j.trace_id,
  purpose: j.purpose,
  status: j.status,
  expiresAt: j.expires_at.toISOString(),
  durationMs: j.duration_ms,
  rowCount: j.row_count,
  truncated: j.result?.truncated ?? false,
  result: includeResult && j.purpose === 'query' ? j.result : null,
  failureCode: j.failure_code,
});
export class QueryGateway {
  readonly releases: RuntimeQueryAccess;
  constructor(
    private readonly identity: Identity,
    readonly catalog: QueryCatalogPort,
    private readonly cursorKey: string,
    private readonly appAccess?: TestAppAccessPort,
  ) {
    this.releases = new RuntimeQueryAccess(identity);
  }
  async releaseScope(
    tx: Sql,
    s: Subject,
    ref: S['DatasetRef'],
    fieldKeys: string[],
    metricKeys: string[],
  ) {
    const grants: Awaited<ReturnType<Identity['queryGrant']>>[] = [];
    for (const action of ['dataset.read', 'dataset.query.test']) {
      try {
        grants.push(await this.identity.queryGrant(tx, s, ref.datasetId, action));
      } catch (error) {
        if (error instanceof Fault && [403, 404].includes(error.status))
          throw new Fault(
            403,
            'RELEASE_DATASET_GRANT_REQUIRED',
            '创建上线申请失败：申请人缺少数据集的' +
              (action === 'dataset.read' ? '读取' : 'TEST查询') +
              '授权。',
            [
              { field: 'datasetId', reason: ref.datasetId },
              { field: 'permission', reason: '需要 ' + action + ' 资源授权。' },
            ],
          );
        throw error;
      }
    }
    const model = await this.catalog
      .queryDataset(tx, s.organizationId, ref.datasetId, ref.datasetVersionId)
      .catch((error) => {
        if (error instanceof Fault && error.status === 404)
          throw new Fault(
            422,
            'RELEASE_DATASET_UNAVAILABLE',
            '创建上线申请失败：引用的数据集或版本不存在，或已停用。',
            [{ field: 'datasetVersionId', reason: ref.datasetVersionId }],
          );
        throw error;
      });
    if (
      fieldKeys.some(
        (k) =>
          !model.version.fields.some((f) => f.key === k) ||
          grants.some((g) => !g.fieldKeys.includes(k)),
      ) ||
      metricKeys.some(
        (k) =>
          !model.version.metrics.some((m) => m.key === k) ||
          grants.some((g) => !g.metricKeys.includes(k)),
      )
    )
      throw new Fault(422, 'RELEASE_SCOPE_INVALID', '发布字段或指标超出申请人的当前授权范围。');
    for (const key of metricKeys) {
      const m = model.version.metrics.find((m) => m.key === key)!;
      if (
        !fieldKeys.includes(m.fieldKey) ||
        m.filters.some((filter) => !fieldKeys.includes(filter.fieldKey))
      )
        throw new Fault(
          422,
          'RELEASE_SCOPE_INVALID',
          '发布指标的底层字段和口径筛选字段也必须声明。',
        );
    }
    const policy = await tx.one<PolicyRow>(
      'SELECT p.* FROM query_policy_heads h JOIN query_policies p ON p.organization_id=h.organization_id AND p.id=h.policy_id WHERE h.organization_id=$1 AND h.dataset_version_id=$2',
      [s.organizationId, ref.datasetVersionId],
    );
    if (!policy)
      throw new Fault(
        403,
        'QUERY_POLICY_REQUIRED',
        '创建上线申请失败：此数据集版本尚未配置查询策略。',
        [{ field: 'datasetVersionId', reason: ref.datasetVersionId }],
      );
    return {
      rowPolicyKey: policy.row_policy_key,
      policyId: policy.id,
      policyDigest: policy.digest,
      timeoutMs: policy.definition.timeoutMs,
      sensitiveFieldKeys: model.version.fields
        .filter(
          (f) =>
            fieldKeys.includes(f.key) && ['confidential', 'restricted'].includes(f.classification),
        )
        .map((f) => f.key),
    };
  }
  async createPolicy(tx: Sql, subject: Subject, datasetId: string, input: S['QueryPolicyInput']) {
    this.identity.require(subject, 'query.policy.manage', true);
    const { version } = await this.catalog.queryDataset(
        tx,
        subject.organizationId,
        datasetId,
        input.datasetVersionId,
      ),
      fields = version.fields;
    const field = (key: string | null) =>
      key === null ||
      fields.some((f) => f.key === key && ['string', 'integer'].includes(f.dataType));
    if (
      !field(input.organizationFieldKey) ||
      !field(input.departmentFieldKey) ||
      !field(input.userFieldKey) ||
      (!input.organizationFieldKey && !input.dedicatedSource) ||
      new Set(input.masks.map((m) => m.fieldKey)).size !== input.masks.length ||
      input.masks.some((m) => !fields.some((f) => f.key === m.fieldKey))
    )
      throw new Fault(422, 'QUERY_POLICY_INVALID');
    this.catalog.validateFilters(fields, input.fixedFilters);
    const id = randomUUID(),
      key = 'gateway_' + id.replaceAll('-', ''),
      definitionDigest = digest(input);
    await this.catalog.registerQueryPolicy(
      tx,
      subject.organizationId,
      key,
      input,
      definitionDigest,
    );
    const row = requireValue(
      await tx.one<PolicyRow>(
        `INSERT INTO query_policies(id,organization_id,dataset_id,dataset_version_id,revision,definition,digest,row_policy_key) SELECT $1,$2,$3,$4,coalesce(max(revision),0)+1,$5,$6,$7 FROM query_policies WHERE organization_id=$2 AND dataset_version_id=$4 RETURNING *`,
        [
          id,
          subject.organizationId,
          datasetId,
          version.id,
          JSON.stringify(input),
          definitionDigest,
          key,
        ],
      ),
    );
    await tx.exec(
      'INSERT INTO query_policy_heads(organization_id,dataset_version_id,policy_id) VALUES($1,$2,$3) ON CONFLICT(organization_id,dataset_version_id) DO UPDATE SET policy_id=EXCLUDED.policy_id',
      [subject.organizationId, version.id, id],
    );
    await this.catalog.invalidate(tx, subject.organizationId);
    return policyDto(row);
  }
  async policies(tx: Sql, subject: Subject, datasetId: string) {
    this.identity.require(subject, 'query.policy.manage', true);
    return (
      await tx.all<PolicyRow>(
        'SELECT * FROM query_policies WHERE organization_id=$1 AND dataset_id=$2 ORDER BY created_at DESC,id DESC',
        [subject.organizationId, datasetId],
      )
    ).map(policyDto);
  }
  async authorize(
    tx: Sql,
    subject: Subject,
    query: S['QuerySpec'],
    purpose: Purpose,
    runtime?: RuntimeQueryContext,
  ) {
    const environment: 'test' | 'production' = runtime ? 'production' : 'test';
    if (runtime) await this.releases.checkContext(tx, subject, runtime);
    const grants = [
      await this.identity.queryGrant(tx, subject, query.datasetId, 'dataset.read'),
      await this.identity.queryGrant(
        tx,
        subject,
        query.datasetId,
        'dataset.query.' + (runtime ? 'production' : 'test'),
      ),
    ];
    if (purpose === 'export')
      grants.push(await this.identity.queryGrant(tx, subject, query.datasetId, 'dataset.export'));
    const { dataset, version, primaryKeys } = await this.catalog.queryDataset(
      tx,
      subject.organizationId,
      query.datasetId,
      query.datasetVersionId,
    );
    const policy = await tx.one<PolicyRow>(
      'SELECT p.* FROM query_policy_heads h JOIN query_policies p ON p.organization_id=h.organization_id AND p.id=h.policy_id WHERE h.organization_id=$1 AND h.dataset_version_id=$2',
      [subject.organizationId, version.id],
    );
    if (!policy) throw new Fault(403, 'QUERY_POLICY_REQUIRED');
    const def = policy.definition,
      departments = await this.identity.dataScope(tx, subject),
      org = requireValue(
        await tx.one<{ policy_epoch: number }>(
          'SELECT policy_epoch FROM organizations WHERE id=$1',
          [subject.organizationId],
        ),
      );
    const release = runtime
      ? await this.releases.authorize(tx, subject, runtime, version.id, policy.row_policy_key)
      : null;
    const hasField = (key: string) =>
      grants.every((g) => g.fieldKeys.includes(key)) && (!release || release.fields.includes(key));
    const hasMetric = (key: string) =>
      grants.every((g) => g.metricKeys.includes(key)) &&
      (!release || release.metrics.includes(key));
    let unmask: S['DatasetGrant'] | null = null;
    if (subject.actions.has('dataset.unmask'))
      try {
        unmask = await this.identity.queryGrant(tx, subject, dataset.id, 'dataset.unmask');
      } catch (error) {
        if (!(error instanceof Fault)) throw error;
      }
    const masks = def.masks.filter((m) => !unmask?.fieldKeys.includes(m.fieldKey)),
      masked = new Set(masks.map((m) => m.fieldKey)),
      fields = new Map(version.fields.map((f) => [f.key, f]));
    if (
      (!query.dimensions.length && !query.metrics.length) ||
      new Set([...query.dimensions, ...query.metrics]).size !==
        query.dimensions.length + query.metrics.length ||
      query.dimensions.some((k) => !fields.has(k) || !hasField(k)) ||
      query.groupBy.some((k) => !query.dimensions.includes(k)) ||
      (query.metrics.length &&
        (query.groupBy.length !== query.dimensions.length ||
          query.dimensions.some(
            (k) => !query.groupBy.includes(k) || !fields.get(k)?.isDimension || masked.has(k),
          ))) ||
      (!query.metrics.length && query.groupBy.length)
    )
      throw new Fault(422, 'QUERY_REJECTED');
    for (const key of query.metrics) {
      const m = version.metrics.find((m) => m.key === key);
      if (
        !m ||
        !hasMetric(key) ||
        !hasField(m.fieldKey) ||
        masked.has(m.fieldKey) ||
        m.filters.some((f) => !hasField(f.fieldKey) || masked.has(f.fieldKey)) ||
        query.groupBy.some((k) => !m.availableDimensions.includes(k))
      )
        throw new Fault(422, 'QUERY_REJECTED');
    }
    if (
      query.filters.some((f) => !hasField(f.fieldKey) || masked.has(f.fieldKey)) ||
      query.orderBy.some(
        (o) => ![...query.dimensions, ...query.metrics].includes(o.key) || masked.has(o.key),
      )
    )
      throw new Fault(422, 'QUERY_REJECTED');
    this.catalog.validateFilters(version.fields, query.filters);
    if (query.timeRange) {
      const f = fields.get(query.timeRange.fieldKey);
      if (
        !f ||
        !hasField(f.key) ||
        masked.has(f.key) ||
        !f.filterable ||
        !['date', 'datetime'].includes(f.dataType) ||
        Date.parse(query.timeRange.from) >= Date.parse(query.timeRange.to)
      )
        throw new Fault(422, 'QUERY_REJECTED');
    }
    const requestedRows = query.limit ?? query.pagination?.pageSize ?? 0;
    if (query.pagination && query.limit !== undefined && query.pagination.pageSize !== query.limit)
      throw new Fault(400, 'VALIDATION_ERROR', '分页大小与查询 limit 不一致。', [
        {
          field: 'pagination.pageSize',
          reason: 'pageSize 与 limit 同时提供时必须相同；不需要 limit 时可只提供 pageSize。',
        },
      ]);
    // TEST uses the caller's explicit limit/page size. Zero means no requested row ceiling.
    // Production still follows the immutable, approved release scope.
    const rowLimit = release?.maxRows
      ? requestedRows === 0
        ? release.maxRows
        : Math.min(requestedRows, release.maxRows)
      : requestedRows;
    if (
      query.pagination &&
      !query.metrics.length &&
      (!primaryKeys.length ||
        primaryKeys.some((k) => !query.dimensions.includes(k) || masked.has(k)))
    )
      throw new Fault(422, 'PAGINATION_REQUIRES_UNIQUE_KEY');
    const rowFilters = [...def.fixedFilters];
    if (def.organizationFieldKey)
      rowFilters.push({
        fieldKey: def.organizationFieldKey,
        operator: 'eq',
        value: subject.organizationId,
      });
    if (def.departmentFieldKey) {
      if (!departments.length) throw new Fault(403, 'DATA_SCOPE_DENIED');
      rowFilters.push({ fieldKey: def.departmentFieldKey, operator: 'in', value: departments });
    }
    if (def.userFieldKey)
      rowFilters.push({ fieldKey: def.userFieldKey, operator: 'eq', value: subject.userId });
    const parameterCount = [
      ...query.filters,
      ...rowFilters,
      ...version.metrics.filter((m) => query.metrics.includes(m.key)).flatMap((m) => m.filters),
    ].reduce((n, f) => n + (Array.isArray(f.value) ? f.value.length : 1), 0);
    if (parameterCount > 500 || query.dimensions.length + query.metrics.length > 40)
      throw new Fault(422, 'QUERY_COST_REJECTED');
    const connection = await this.catalog.queryConnection(
      tx,
      subject.organizationId,
      dataset.logicalDataSourceId,
      environment,
      release?.mappingId,
    );
    if (
      !connection.connection.endpoint.allowedRelations.some(
        (r) => r.schema === version.relation.schema && r.name === version.relation.name,
      )
    )
      throw new Fault(403, 'RELATION_FORBIDDEN');
    const normalized = {
      ...query,
      datasetVersionId: version.id,
      ...(rowLimit > 0 ? { limit: rowLimit } : {}),
    };
    const authorizationDigest = digest({
      user: subject.userId,
      organization: subject.organizationId,
      actions: [...subject.actions].sort(),
      departments: [...departments].sort(),
      grants,
      unmask,
      policy: policy.id,
      policyDigest: policy.digest,
      epoch: Number(org.policy_epoch),
      mapping: connection.mappingId,
      connectionRevision: connection.revision,
      endpoint: connection.connection.endpoint,
      release,
    });
    const scope = digest({
      authorizationDigest,
      query: {
        ...normalized,
        pagination: query.pagination ? { pageSize: query.pagination.pageSize } : null,
      },
      runtime: runtime ?? null,
      purpose,
    });
    let offset = 0;
    if (query.pagination?.cursor) {
      const value = this.decodeCursor(query.pagination.cursor);
      if (value.scope !== scope) throw new Fault(403, 'POLICY_CHANGED');
      offset = value.offset;
    }
    if (!Number.isSafeInteger(offset + rowLimit))
      throw new Fault(400, 'VALIDATION_ERROR', '分页位置超出可表示的整数范围。');
    return {
      query: normalized,
      version,
      dataset,
      policy,
      release,
      environment,
      authorizationDigest,
      scope,
      offset,
      rowLimit,
      policyEpoch: Number(org.policy_epoch),
      plan: {
        environment,
        policyEpoch: Number(org.policy_epoch),
        operation: 'query' as const,
        connection: {
          ...connection.connection,
          poolMax: Math.min(2, connection.connection.poolMax),
          requestTimeoutMs: Math.min(
            def.timeoutMs,
            connection.connection.requestTimeoutMs,
            release?.timeoutMs ?? 10000,
          ),
        },
        relations: [version.relation],
        query: normalized,
        model: { relation: version.relation, fields: version.fields, metrics: version.metrics },
        rowFilters,
        masks,
        offset,
        rowLimit,
        timeoutMs: Math.min(
          def.timeoutMs,
          connection.connection.requestTimeoutMs,
          release?.timeoutMs ?? 10000,
        ),
        maxCost: def.maxCost,
        maxScanRows: def.maxScanRows,
        requireDatabaseRls: def.requireDatabaseRls,
        databaseContext: {
          organizationId: subject.organizationId,
          userId: subject.userId,
          departments,
        },
      },
      mappingId: connection.mappingId,
    };
  }
  async create(
    tx: Sql,
    subject: Subject,
    query: S['QuerySpec'],
    purpose: Purpose,
    traceId: string,
    runtime?: RuntimeQueryContext,
    testApp?: TestAppContext,
  ) {
    if (testApp) {
      if (runtime || !this.appAccess) throw new Fault(403, 'FORBIDDEN');
      await this.appAccess.checkTestVersion(tx, subject, testApp);
    }
    const a = await this.authorize(tx, subject, query, purpose, runtime);
    const context = {
      releaseRequestId: a.release?.releaseRequestId ?? null,
      actor: {
        userId: subject.userId,
        displayName: subject.displayName,
        clientKind: subject.clientKind,
        authenticatedAt: subject.authenticatedAt,
        ...(subject.personalToken ? { personalToken: subject.personalToken } : {}),
        ...(subject.browserSession
          ? { browserSession: subject.browserSession, authMethod: subject.authMethod }
          : {}),
      },
      ...(runtime ? { runtime } : {}),
      ...(testApp ? { testApp } : {}),
      appId: a.release?.appId ?? testApp?.appId ?? null,
      reportId: a.release?.reportId ?? null,
    };
    const row = requireValue(
      await tx.one<GatewayJobRow>(
        `INSERT INTO query_jobs(organization_id,initiator_user_id,app_version_id,dataset_id,dataset_version_id,environment,mapping_id,logical_data_source_id,deployment_id,runtime_grant_id,report_version_id,query_spec,query_policy_id,physical_connection_id,policy_epoch,status,purpose,context,authorization_digest,trace_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'queued',$16,$17,$18,$19,now()+interval '5 minutes') RETURNING *`,
        [
          subject.organizationId,
          subject.userId,
          a.release?.appVersionId ?? testApp?.versionId ?? null,
          a.dataset.id,
          a.version.id,
          a.environment,
          a.mappingId,
          a.dataset.logicalDataSourceId,
          a.release?.deploymentId ?? null,
          a.release?.runtimeGrantId ?? null,
          a.release?.reportVersionId ?? null,
          JSON.stringify(a.query),
          a.policy.id,
          a.plan.connection.id,
          a.policyEpoch,
          purpose,
          JSON.stringify(context),
          a.authorizationDigest,
          traceId,
        ],
      ),
    );
    await this.audit(tx, subject, {
      jobId: row.id,
      datasetId: a.dataset.id,
      appId: context.appId,
      reportId: context.reportId,
      environment: a.environment,
      durationMs: 0,
      rowCount: 0,
      status: 'queued',
      allowed: true,
      traceId,
    });
    return jobDto(row);
  }
  async authorizedJob(tx: Sql, subject: Subject, id: string) {
    const row = requireValue(
      await tx.one<GatewayJobRow>('SELECT * FROM query_jobs WHERE organization_id=$1 AND id=$2', [
        subject.organizationId,
        id,
      ]),
    );
    if (row.context.actor.personalToken || row.context.actor.browserSession)
      await this.identity.subject(tx, row.context.actor, row.organization_id);
    if (row.initiator_user_id !== subject.userId || row.expires_at.getTime() <= Date.now())
      throw new Fault(404, 'NOT_FOUND');
    if (row.context.testApp) {
      if (!this.appAccess) throw new Fault(403, 'FORBIDDEN');
      await this.appAccess.checkTestVersion(tx, subject, row.context.testApp);
    }
    const auth = await this.authorize(
      tx,
      subject,
      row.query_spec,
      row.purpose,
      row.context.runtime,
    );
    if (auth.authorizationDigest !== row.authorization_digest)
      throw new Fault(403, 'POLICY_CHANGED');
    return { row, auth };
  }
  validation(
    a: Awaited<ReturnType<QueryGateway['authorize']>>,
    traceId: string,
  ): S['QueryValidation'] {
    return {
      valid: true,
      environment: a.environment,
      datasetVersionId: a.version.id,
      policyRevision: a.policy.revision,
      maxRows: a.rowLimit || null,
      timeoutMs: a.plan.timeoutMs,
      maskedFieldKeys: a.plan.masks
        .filter((m) => a.query.dimensions.includes(m.fieldKey))
        .map((m) => m.fieldKey),
      traceId,
    };
  }
  cursor(scope: string, offset: number) {
    const value = Buffer.from(
      JSON.stringify({ scope, offset, expires: Date.now() + 300000 }),
    ).toString('base64url');
    return value + '.' + createHmac('sha256', this.cursorKey).update(value).digest('hex');
  }
  private decodeCursor(cursor: string): { scope: string; offset: number } {
    try {
      const [value, signature] = cursor.split('.');
      if (
        !value ||
        !signature ||
        !/^[a-f0-9]{64}$/.test(signature) ||
        cursor.length > 2048 ||
        !timingSafeEqual(
          Buffer.from(signature, 'hex'),
          createHmac('sha256', this.cursorKey).update(value).digest(),
        )
      )
        throw new Error();
      const decoded = JSON.parse(Buffer.from(value, 'base64url').toString()) as {
        scope: string;
        offset: number;
        expires: number;
      };
      if (
        !Number.isSafeInteger(decoded.offset) ||
        decoded.offset < 0 ||
        decoded.expires < Date.now()
      )
        throw new Error();
      return decoded;
    } catch {
      throw new Fault(400, 'INVALID_QUERY_CURSOR');
    }
  }
  async audit(
    tx: Sql,
    subject: Subject,
    input: {
      jobId?: string;
      datasetId?: string;
      runtime?: RuntimeQueryContext;
      appId?: string | null;
      reportId?: string | null;
      environment: 'test' | 'production';
      durationMs: number;
      rowCount: number;
      status: string;
      allowed: boolean;
      traceId: string;
      slow?: boolean;
    },
  ) {
    await tx.exec(
      `INSERT INTO query_audits(organization_id,user_id,job_id,app_id,report_id,dataset_id,environment,duration_ms,row_count,status,permission_result,trace_id,slow) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        subject.organizationId,
        subject.userId,
        input.jobId ?? null,
        input.appId ?? (input.runtime?.kind === 'app' ? input.runtime.resourceId : null),
        input.reportId ?? (input.runtime?.kind === 'report' ? input.runtime.resourceId : null),
        input.datasetId ?? null,
        input.environment,
        Math.max(0, input.durationMs),
        input.rowCount,
        input.status,
        input.allowed ? 'allow' : 'deny',
        input.traceId,
        input.slow ?? false,
      ],
    );
  }
}
