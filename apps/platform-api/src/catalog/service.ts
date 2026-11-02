import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { digest } from '@eas/connector-transport';
import type { Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import { ifMatch } from '../infrastructure/mutations.js';
import type { Identity, Subject } from '../identity/identity.js';
import type { RuntimeGrantInvalidator } from '../releases/invalidation.js';
import {
  type S,
  type SourceRow,
  type ConnectionRow,
  type EndpointRow,
  type DatasetRow,
  type VersionRow,
  type SnapshotRow,
  type JobRow,
  sourceDto,
  connectionDto,
  datasetDto,
  versionDto,
  snapshotDto,
  jobDto,
  endpointDto,
} from './models.js';
export class CatalogService {
  async releaseRequirements(tx: Sql, org: string, datasetId: string, versionId: string) {
    const model = await this.queryDataset(tx, org, datasetId, versionId),
      version = requireValue(
        await tx.one<VersionRow>(
          'SELECT * FROM dataset_versions WHERE organization_id=$1 AND id=$2',
          [org, versionId],
        ),
      );
    const snapshot = requireValue(
      await tx.one<SnapshotRow>(
        'SELECT * FROM metadata_snapshots WHERE organization_id=$1 AND id=$2',
        [org, version.metadata_snapshot_id],
      ),
    );
    const relation = snapshot.relations.find(
      (value) =>
        value.schema === model.version.relation.schema &&
        value.name === model.version.relation.name,
    );
    if (!relation) throw new Fault(422, 'SCHEMA_MISMATCH', '该数据集版本的已保存结构不存在。');
    return {
      logicalDataSourceId: model.dataset.logicalDataSourceId,
      relation: model.version.relation,
      columns: relation.columns.filter((column) =>
        model.version.fields.some((field) => field.physicalColumn === column.name),
      ),
    };
  }
  async releaseMapping(tx: Sql, org: string, datasetId: string, versionId: string) {
    const dataset = await this.datasetRow(tx, org, datasetId),
      mapping = await tx.one(
        "SELECT mapping_id FROM mapping_heads WHERE organization_id=$1 AND logical_data_source_id=$2 AND environment='production'",
        [org, dataset.logical_data_source_id],
      );
    if (!mapping)
      throw new Fault(
        422,
        'PRODUCTION_MAPPING_NOT_CONFIGURED',
        '该逻辑数据源尚未配置生产连接。上线申请和审批可以先完成，实际发布前请配置生产环境映射。',
        [
          {
            field: 'datasetId',
            reason: '数据集 ' + dataset.name + ' 的逻辑数据源缺少生产环境映射。',
          },
        ],
      );
    const model = await this.queryDataset(tx, org, datasetId, versionId),
      test = await this.queryConnection(tx, org, model.dataset.logicalDataSourceId, 'test'),
      prod = await this.queryConnection(tx, org, model.dataset.logicalDataSourceId, 'production');
    if (prod.connection.engine !== 'postgresql')
      throw new Fault(422, 'GATEWAY_ENGINE_UNVERIFIED', '该生产查询适配器尚未完成真实数据库验收。');
    if (test.connection.engine !== prod.connection.engine)
      throw new Fault(422, 'SCHEMA_INCOMPATIBLE', 'TEST 与生产数据库类型不一致。');
    const snapshots = await tx.all<SnapshotRow>(
      'SELECT DISTINCT ON(physical_connection_id) * FROM metadata_snapshots WHERE organization_id=$1 AND physical_connection_id=ANY($2::uuid[]) ORDER BY physical_connection_id,created_at DESC,id DESC',
      [org, [test.connection.id, prod.connection.id]],
    );
    const relation = model.version.relation,
      find = (id: string) =>
        snapshots
          .find((snapshot) => snapshot.physical_connection_id === id)
          ?.relations.find((r) => r.schema === relation.schema && r.name === relation.name);
    const from = find(test.connection.id),
      to = find(prod.connection.id);
    if (!from || !to)
      throw new Fault(422, 'SCHEMA_INCOMPATIBLE', '缺少所选表或视图的 TEST/生产元数据。');
    for (const field of model.version.fields) {
      const a = from.columns.find((c) => c.name === field.physicalColumn),
        b = to.columns.find((c) => c.name === field.physicalColumn);
      if (!a || !b || a.dbType !== b.dbType || a.nullable !== b.nullable)
        throw new Fault(422, 'SCHEMA_INCOMPATIBLE', '生产字段与 TEST 字段不兼容。', [
          {
            field: field.key,
            reason: '字段缺失、数据库类型或可空性不同；请同步元数据并修正生产结构。',
          },
        ]);
    }
    return {
      mappingId: prod.mappingId,
      logicalDataSourceId: model.dataset.logicalDataSourceId,
      schemaDigest: prod.schemaDigest,
      connectionRevision: prod.revision,
      relation,
      columns: to.columns,
    };
  }
  async releaseInspection(
    tx: Sql,
    org: string,
    datasetId: string,
    versionId: string,
    mappingId: string,
  ) {
    const model = await this.queryDataset(tx, org, datasetId, versionId),
      prod = await this.queryConnection(
        tx,
        org,
        model.dataset.logicalDataSourceId,
        'production',
        mappingId,
      );
    const epoch = requireValue(
      await tx.one<{ policy_epoch: number }>('SELECT policy_epoch FROM organizations WHERE id=$1', [
        org,
      ]),
    );
    return {
      environment: 'production' as const,
      operation: 'metadata' as const,
      policyEpoch: Number(epoch.policy_epoch),
      connection: prod.connection,
      relations: [model.version.relation],
      preview: null,
    };
  }
  async queryDataset(tx: Sql, organizationId: string, datasetId: string, versionId?: string) {
    const dataset = await this.datasetRow(tx, organizationId, datasetId),
      source = await this.sourceRow(tx, organizationId, dataset.logical_data_source_id);
    if (dataset.status !== 'enabled' || source.status !== 'enabled')
      throw new Fault(404, 'NOT_FOUND');
    const row = requireValue(
      await tx.one<VersionRow>(
        'SELECT * FROM dataset_versions WHERE organization_id=$1 AND dataset_id=$2' +
          (versionId ? ' AND id=$3' : '') +
          ' ORDER BY version DESC LIMIT 1',
        versionId ? [organizationId, datasetId, versionId] : [organizationId, datasetId],
      ),
    );
    const snapshot = requireValue(
      await tx.one<SnapshotRow>(
        'SELECT * FROM metadata_snapshots WHERE organization_id=$1 AND id=$2',
        [organizationId, row.metadata_snapshot_id],
      ),
    );
    const relation = snapshot.relations.find(
      (r) => r.schema === row.relation_schema && r.name === row.relation_view,
    );
    if (!relation) throw new Fault(422, 'SCHEMA_MISMATCH');
    return {
      dataset: datasetDto(dataset),
      version: versionDto(row),
      primaryKeys: relation.primaryKey.flatMap((name) =>
        row.definition.fields.filter((f) => f.physicalColumn === name).map((f) => f.key),
      ),
    };
  }
  async queryConnection(
    tx: Sql,
    organizationId: string,
    sourceId: string,
    environment: 'test' | 'production',
    mappingId?: string,
  ) {
    const mapping = requireValue(
      await tx.one<{ id: string; physical_connection_id: string; schema_digest: string }>(
        `SELECT m.id,m.physical_connection_id,m.schema_digest FROM mapping_heads h JOIN source_mappings m ON m.organization_id=h.organization_id AND m.id=h.mapping_id WHERE h.organization_id=$1 AND h.logical_data_source_id=$2 AND h.environment=$3`,
        [organizationId, sourceId, environment],
      ),
    );
    if (mappingId && mappingId !== mapping.id) throw new Fault(403, 'POLICY_CHANGED');
    const c = await this.connectionRow(tx, organizationId, mapping.physical_connection_id);
    if (c.environment !== environment || c.status !== 'active')
      throw new Fault(403, 'ENVIRONMENT_FORBIDDEN');
    const endpoint = requireValue(
      await tx.one<EndpointRow>(
        'SELECT * FROM network_endpoints WHERE organization_id=$1 AND id=$2',
        [organizationId, c.endpoint_id],
      ),
    );
    const latest = await tx.one<{ schema_digest: string }>(
      'SELECT schema_digest FROM metadata_snapshots WHERE organization_id=$1 AND physical_connection_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1',
      [organizationId, c.id],
    );
    if (!latest || latest.schema_digest !== mapping.schema_digest)
      throw new Fault(403, 'SCHEMA_CHANGED');
    return {
      mappingId: mapping.id,
      schemaDigest: mapping.schema_digest,
      revision: Number(c.revision),
      connection: {
        id: c.id,
        engine: c.engine,
        databaseName: c.database_name,
        secretRef: c.secret_ref,
        credentialRevision: Number(c.credential_revision),
        connectTimeoutMs: c.connect_timeout_ms,
        requestTimeoutMs: c.request_timeout_ms,
        poolMax: c.pool_max,
        endpoint: { ...endpointDto(endpoint), caRef: endpoint.ca_ref },
      },
    };
  }
  async registerQueryPolicy(
    tx: Sql,
    organizationId: string,
    key: string,
    definition: unknown,
    policyDigest: string,
  ) {
    await tx.exec(
      'INSERT INTO row_policies(organization_id,key,definition,digest) VALUES($1,$2,$3,$4)',
      [organizationId, key, JSON.stringify(definition), policyDigest],
    );
  }
  constructor(
    readonly identity: Identity,
    private readonly invalidator: RuntimeGrantInvalidator,
  ) {}
  async invalidate(tx: Sql, org: string, sourceId?: string): Promise<void> {
    await tx.exec('UPDATE organizations SET policy_epoch=policy_epoch+1 WHERE id=$1', [org]);
    const versions = await tx.all<{ id: string }>(
      `SELECT v.id FROM dataset_versions v JOIN datasets d ON d.organization_id=v.organization_id AND d.id=v.dataset_id WHERE d.organization_id=$1 ${sourceId ? 'AND d.logical_data_source_id=$2' : ''}`,
      [org, ...(sourceId ? [sourceId] : [])],
    );
    await this.invalidator.revokeDatasetVersions(
      tx,
      org,
      versions.map((v) => v.id),
    );
  }
  async sourceRow(tx: Sql, org: string, id: string): Promise<SourceRow> {
    return requireValue(
      await tx.one<SourceRow>(
        'SELECT s.*,u.display_name AS owner_name FROM logical_data_sources s LEFT JOIN users u ON u.id=s.owner_user_id WHERE s.organization_id=$1 AND s.id=$2',
        [org, id],
      ),
    );
  }
  async connectionRow(tx: Sql, org: string, id: string): Promise<ConnectionRow> {
    return requireValue(
      await tx.one<ConnectionRow>(
        'SELECT c.*,e.host,e.port FROM physical_connections c JOIN network_endpoints e ON e.organization_id=c.organization_id AND e.id=c.endpoint_id WHERE c.organization_id=$1 AND c.id=$2',
        [org, id],
      ),
    );
  }
  async datasetRow(tx: Sql, org: string, id: string): Promise<DatasetRow> {
    return requireValue(
      await tx.one<DatasetRow>('SELECT * FROM datasets WHERE organization_id=$1 AND id=$2', [
        org,
        id,
      ]),
    );
  }
  async versionRow(tx: Sql, org: string, id: string): Promise<VersionRow> {
    return requireValue(
      await tx.one<VersionRow>(
        'SELECT * FROM dataset_versions WHERE organization_id=$1 AND id=$2',
        [org, id],
      ),
    );
  }
  async sources(tx: Sql, subject: Subject): Promise<S['LogicalDataSource'][]> {
    const rows = await tx.all<SourceRow>(
      'SELECT s.*,u.display_name AS owner_name FROM logical_data_sources s LEFT JOIN users u ON u.id=s.owner_user_id WHERE s.organization_id=$1 ORDER BY s.created_at DESC,s.id DESC',
      [subject.organizationId],
    );
    const visible = await this.identity.visible(tx, subject, 'source.read');
    if (visible === null) return rows.map(sourceDto);
    const data = await this.identity.visible(tx, subject, 'dataset.read');
    const related = await tx.all<{ logical_data_source_id: string; id: string }>(
      "SELECT logical_data_source_id,id FROM datasets WHERE organization_id=$1 AND status='enabled'",
      [subject.organizationId],
    );
    for (const row of related) if (data?.has(row.id)) visible.add(row.logical_data_source_id);
    return rows.filter((r) => r.status === 'enabled' && visible.has(r.id)).map(sourceDto);
  }
  async source(tx: Sql, subject: Subject, id: string): Promise<S['LogicalDataSource']> {
    return requireValue((await this.sources(tx, subject)).find((r) => r.id === id));
  }
  async createSource(
    tx: Sql,
    subject: Subject,
    input: S['CreateLogicalDataSource'],
  ): Promise<S['LogicalDataSource']> {
    const owner = await tx.one(
      "SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND status='active'",
      [subject.organizationId, input.ownerUserId],
    );
    if (!owner) throw new Fault(422, 'VALIDATION_ERROR');
    const id = randomUUID();
    await tx.exec(
      "INSERT INTO resources(id,organization_id,kind) VALUES($1,$2,'logical_data_source')",
      [id, subject.organizationId],
    );
    return sourceDto(
      requireValue(
        await tx.one<SourceRow>(
          `INSERT INTO logical_data_sources(id,organization_id,key,name,system_code,engine,description,department,owner_user_id,sensitivity,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            id,
            subject.organizationId,
            input.key,
            input.name,
            input.systemCode,
            input.engine,
            input.description,
            input.department,
            input.ownerUserId,
            input.sensitivity,
            input.status,
          ],
        ),
      ),
    );
  }
  async updateSource(
    tx: Sql,
    subject: Subject,
    id: string,
    input: S['UpdateLogicalDataSource'],
    req: FastifyRequest,
  ): Promise<S['LogicalDataSource']> {
    const row = await this.sourceRow(tx, subject.organizationId, id);
    ifMatch(req, Number(row.revision));
    const owner = await tx.one(
      "SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND status='active'",
      [subject.organizationId, input.ownerUserId],
    );
    if (!owner) throw new Fault(422, 'VALIDATION_ERROR');
    const result = requireValue(
      await tx.one<SourceRow>(
        `UPDATE logical_data_sources SET name=$3,system_code=$4,description=$5,department=$6,owner_user_id=$7,sensitivity=$8,status=$9,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2 RETURNING *`,
        [
          subject.organizationId,
          id,
          input.name,
          input.systemCode,
          input.description,
          input.department,
          input.ownerUserId,
          input.sensitivity,
          input.status,
        ],
      ),
    );
    await this.invalidate(tx, subject.organizationId, id);
    return sourceDto(result);
  }
  async createConnection(
    tx: Sql,
    subject: Subject,
    input: S['CreatePhysicalConnection'],
  ): Promise<S['PhysicalConnection']> {
    const endpoint = requireValue(
      await tx.one<EndpointRow>(
        'SELECT * FROM network_endpoints WHERE organization_id=$1 AND id=$2',
        [subject.organizationId, input.endpointId],
      ),
    );
    const profile = requireValue(
      await tx.one<{
        secret_ref: string;
        environment: string;
        engine: string;
        allowed_endpoint_ids: string[];
      }>('SELECT * FROM credential_profiles WHERE organization_id=$1 AND id=$2', [
        subject.organizationId,
        input.credentialProfileId,
      ]),
    );
    if (
      endpoint.environment !== input.environment ||
      endpoint.engine !== input.engine ||
      profile.environment !== input.environment ||
      profile.engine !== input.engine ||
      !profile.allowed_endpoint_ids.includes(endpoint.id) ||
      !endpoint.allowed_databases.includes(input.databaseName)
    )
      throw new Fault(422, 'ENVIRONMENT_FORBIDDEN');
    if (
      input.metadataScope.some(
        (r) => !endpoint.allowed_relations.some((a) => a.schema === r.schema && a.name === r.name),
      ) ||
      new Set(input.metadataScope.map((r) => r.schema + '.' + r.name)).size !==
        input.metadataScope.length
    )
      throw new Fault(422, 'RELATION_FORBIDDEN');
    if (
      input.engine === 'mysql' &&
      input.metadataScope.some((r) => r.schema !== input.databaseName)
    )
      throw new Fault(422, 'RELATION_FORBIDDEN');
    const row = requireValue(
      await tx.one<{ id: string }>(
        `INSERT INTO physical_connections(organization_id,name,environment,engine,endpoint_id,database_name,secret_ref,credential_profile_id,status,connect_timeout_ms,request_timeout_ms,pool_max,metadata_scope) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12) RETURNING id`,
        [
          subject.organizationId,
          input.name,
          input.environment,
          input.engine,
          input.endpointId,
          input.databaseName,
          profile.secret_ref,
          input.credentialProfileId,
          input.connectTimeoutMs,
          input.requestTimeoutMs,
          input.poolMax,
          JSON.stringify(input.metadataScope),
        ],
      ),
    );
    return connectionDto(await this.connectionRow(tx, subject.organizationId, row.id));
  }
  async updateConnection(
    tx: Sql,
    subject: Subject,
    id: string,
    input: S['UpdatePhysicalConnection'],
    req: FastifyRequest,
  ): Promise<S['PhysicalConnection']> {
    const c = await this.connectionRow(tx, subject.organizationId, id);
    ifMatch(req, Number(c.revision));
    await tx.exec(
      `UPDATE physical_connections SET name=$3,status=$4,connect_timeout_ms=$5,request_timeout_ms=$6,pool_max=$7,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2`,
      [
        subject.organizationId,
        id,
        input.name,
        input.status,
        input.connectTimeoutMs,
        input.requestTimeoutMs,
        input.poolMax,
      ],
    );
    await this.invalidate(tx, subject.organizationId);
    return connectionDto(await this.connectionRow(tx, subject.organizationId, id));
  }
  async mappings(tx: Sql, subject: Subject, id: string): Promise<S['SourceMapping'][]> {
    await this.sourceRow(tx, subject.organizationId, id);
    return tx.all<S['SourceMapping']>(
      `SELECT m.id,m.organization_id AS "organizationId",m.created_at AS "createdAt",m.logical_data_source_id AS "logicalDataSourceId",m.environment,m.physical_connection_id AS "physicalConnectionId",m.revision::integer,m.schema_digest AS "schemaDigest" FROM mapping_heads h JOIN source_mappings m ON m.organization_id=h.organization_id AND m.id=h.mapping_id WHERE h.organization_id=$1 AND h.logical_data_source_id=$2 ORDER BY m.environment`,
      [subject.organizationId, id],
    );
  }
  async setMapping(
    tx: Sql,
    subject: Subject,
    id: string,
    environment: 'test' | 'production',
    connectionId: string,
    req: FastifyRequest,
  ): Promise<S['SourceMapping']> {
    const source = await this.sourceRow(tx, subject.organizationId, id);
    ifMatch(req, Number(source.revision));
    const c = await this.connectionRow(tx, subject.organizationId, connectionId);
    if (
      source.status !== 'enabled' ||
      source.engine !== c.engine ||
      c.environment !== environment ||
      c.status !== 'active'
    )
      throw new Fault(422, 'ENVIRONMENT_FORBIDDEN');
    const snapshot = await tx.one<SnapshotRow>(
      'SELECT * FROM metadata_snapshots WHERE organization_id=$1 AND physical_connection_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1',
      [subject.organizationId, c.id],
    );
    if (!snapshot || c.last_health_status !== 'healthy')
      throw new Fault(
        422,
        'SCHEMA_MISMATCH',
        'Successful health check and metadata synchronization required',
      );
    const versions = await tx.all<VersionRow>(
      'SELECT v.* FROM dataset_versions v JOIN datasets d ON d.organization_id=v.organization_id AND d.id=v.dataset_id WHERE v.organization_id=$1 AND d.logical_data_source_id=$2',
      [subject.organizationId, id],
    );
    for (const version of versions) {
      const relation = snapshot.relations.find(
        (r) => r.schema === version.relation_schema && r.name === version.relation_view,
      );
      if (
        !relation ||
        !c.metadata_scope.some((r) => r.schema === relation.schema && r.name === relation.name)
      )
        throw new Fault(422, 'SCHEMA_MISMATCH');
      for (const field of version.definition.fields) {
        const column = relation.columns.find((c) => c.name === field.physicalColumn);
        if (
          !column ||
          (classify(column.dbType) !== field.dataType &&
            !(classify(column.dbType) === 'integer' && field.dataType === 'number'))
        )
          throw new Fault(422, 'SCHEMA_MISMATCH');
      }
    }
    const row = requireValue(
      await tx.one<{ id: string; revision: number; created_at: Date }>(
        `INSERT INTO source_mappings(organization_id,logical_data_source_id,environment,physical_connection_id,revision,schema_digest) SELECT $1,$2,$3,$4,coalesce(max(revision),0)+1,$5 FROM source_mappings WHERE organization_id=$1 AND logical_data_source_id=$2 AND environment=$3 RETURNING id,revision,created_at`,
        [subject.organizationId, id, environment, connectionId, snapshot.schema_digest],
      ),
    );
    await tx.exec(
      `INSERT INTO mapping_heads(organization_id,logical_data_source_id,environment,mapping_id) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,logical_data_source_id,environment) DO UPDATE SET mapping_id=EXCLUDED.mapping_id`,
      [subject.organizationId, id, environment, row.id],
    );
    await tx.exec(
      'UPDATE logical_data_sources SET revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2',
      [subject.organizationId, id],
    );
    await this.invalidate(tx, subject.organizationId, id);
    return {
      id: row.id,
      organizationId: subject.organizationId,
      createdAt: row.created_at.toISOString(),
      logicalDataSourceId: id,
      environment,
      physicalConnectionId: connectionId,
      revision: Number(row.revision),
      schemaDigest: snapshot.schema_digest,
    };
  }
  async datasets(tx: Sql, subject: Subject): Promise<S['Dataset'][]> {
    const visible = await this.identity.visible(tx, subject, 'dataset.read');
    const rows = await tx.all<DatasetRow & { source_status: string }>(
      'SELECT d.*,s.status AS source_status FROM datasets d JOIN logical_data_sources s ON s.organization_id=d.organization_id AND s.id=d.logical_data_source_id WHERE d.organization_id=$1 ORDER BY d.created_at DESC,d.id DESC',
      [subject.organizationId],
    );
    const results: S['Dataset'][] = [];
    for (const r of rows.filter(
      (r) =>
        visible === null ||
        (visible.has(r.id) && r.status === 'enabled' && r.source_status === 'enabled'),
    )) {
      let canPreview = false;
      if (
        r.status === 'enabled' &&
        r.source_status === 'enabled' &&
        subject.actions.has('dataset.query.test')
      )
        try {
          const queryGrant = await this.identity.queryGrant(
            tx,
            subject,
            r.id,
            'dataset.query.test',
          );
          const readGrant = await this.identity.queryGrant(tx, subject, r.id, 'dataset.read');
          canPreview = queryGrant.fieldKeys.some((k) => readGrant.fieldKeys.includes(k));
        } catch (error) {
          if (!(error instanceof Fault)) throw error;
        }
      results.push({ ...datasetDto(r), canPreview });
    }
    return results;
  }
  async dataset(tx: Sql, subject: Subject, id: string): Promise<S['Dataset']> {
    return requireValue((await this.datasets(tx, subject)).find((d) => d.id === id));
  }
  async createDataset(tx: Sql, subject: Subject, input: S['CreateDataset']): Promise<S['Dataset']> {
    const source = await this.sourceRow(tx, subject.organizationId, input.logicalDataSourceId);
    if (source.status !== 'enabled') throw new Fault(422, 'STATE_CONFLICT');
    const id = randomUUID();
    await tx.exec("INSERT INTO resources(id,organization_id,kind) VALUES($1,$2,'dataset')", [
      id,
      subject.organizationId,
    ]);
    return datasetDto(
      requireValue(
        await tx.one<DatasetRow>(
          `INSERT INTO datasets(id,organization_id,key,name,logical_data_source_id,description,status) VALUES($1,$2,$3,$4,$5,$6,'draft') RETURNING *`,
          [
            id,
            subject.organizationId,
            input.key,
            input.name,
            input.logicalDataSourceId,
            input.description,
          ],
        ),
      ),
    );
  }
  async updateDataset(
    tx: Sql,
    subject: Subject,
    id: string,
    input: S['UpdateDataset'],
    req: FastifyRequest,
  ): Promise<S['Dataset']> {
    const row = await this.datasetRow(tx, subject.organizationId, id);
    ifMatch(req, Number(row.revision));
    if (
      input.status === 'enabled' &&
      !(await tx.one(
        'SELECT id FROM dataset_versions WHERE organization_id=$1 AND dataset_id=$2 LIMIT 1',
        [subject.organizationId, id],
      ))
    )
      throw new Fault(422, 'SCHEMA_MISMATCH');
    const result = datasetDto(
      requireValue(
        await tx.one<DatasetRow>(
          'UPDATE datasets SET name=$3,description=$4,status=$5,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2 RETURNING *',
          [subject.organizationId, id, input.name, input.description, input.status],
        ),
      ),
    );
    await this.invalidate(tx, subject.organizationId, row.logical_data_source_id);
    return result;
  }
  async presentVersion(
    tx: Sql,
    subject: Subject,
    row: VersionRow,
    queryGrant: S['DatasetGrant'] | null = null,
  ): Promise<S['DatasetVersion']> {
    await this.dataset(tx, subject, row.dataset_id);
    const readGrant = await this.identity.allowed(tx, subject, row.dataset_id, 'dataset.read');
    const result = versionDto(row);
    const fields = result.fields.filter(
      (f) =>
        (readGrant === null || readGrant.fieldKeys.includes(f.key)) &&
        (queryGrant === null || queryGrant.fieldKeys.includes(f.key)),
    );
    const keys = new Set(fields.map((f) => f.key));
    const metrics = result.metrics
      .filter(
        (m) =>
          keys.has(m.fieldKey) &&
          m.filters.every((f) => keys.has(f.fieldKey)) &&
          (readGrant === null || readGrant.metricKeys.includes(m.key)) &&
          (queryGrant === null || queryGrant.metricKeys.includes(m.key)),
      )
      .map((m) => ({
        ...m,
        availableDimensions: m.availableDimensions.filter((k) => keys.has(k)),
      }));
    const relationships = [];
    for (const r of result.relationships) {
      if (!keys.has(r.sourceFieldKey)) continue;
      try {
        const target = await this.versionRow(tx, subject.organizationId, r.targetDatasetVersionId);
        await this.dataset(tx, subject, target.dataset_id);
        const targetGrant = await this.identity.allowed(
          tx,
          subject,
          target.dataset_id,
          'dataset.read',
        );
        if (targetGrant !== null && !targetGrant.fieldKeys.includes(r.targetFieldKey)) continue;
        relationships.push(r);
      } catch (error) {
        if (!(error instanceof Fault)) throw error;
      }
    }
    return { ...result, fields, metrics, relationships };
  }
  async versions(tx: Sql, subject: Subject, id: string): Promise<S['DatasetVersion'][]> {
    await this.dataset(tx, subject, id);
    const rows = await tx.all<VersionRow>(
      'SELECT * FROM dataset_versions WHERE organization_id=$1 AND dataset_id=$2 ORDER BY version DESC',
      [subject.organizationId, id],
    );
    const result: S['DatasetVersion'][] = [];
    for (const row of rows) result.push(await this.presentVersion(tx, subject, row));
    return result;
  }
  async createVersion(
    tx: Sql,
    subject: Subject,
    id: string,
    input: S['CreateDatasetVersion'],
  ): Promise<S['DatasetVersion']> {
    const dataset = await this.datasetRow(tx, subject.organizationId, id),
      source = await this.sourceRow(tx, subject.organizationId, dataset.logical_data_source_id);
    if (source.status !== 'enabled') throw new Fault(422, 'STATE_CONFLICT');
    const mapping = requireValue(
      await tx.one<{ physical_connection_id: string }>(
        `SELECT m.physical_connection_id FROM mapping_heads h JOIN source_mappings m ON m.organization_id=h.organization_id AND m.id=h.mapping_id WHERE h.organization_id=$1 AND h.logical_data_source_id=$2 AND h.environment='test'`,
        [subject.organizationId, source.id],
      ),
    );
    const snapshot = requireValue(
      await tx.one<SnapshotRow>(
        'SELECT * FROM metadata_snapshots WHERE organization_id=$1 AND id=$2 AND physical_connection_id=$3',
        [subject.organizationId, input.metadataSnapshotId, mapping.physical_connection_id],
      ),
    );
    const relation = snapshot.relations.find(
      (r) => r.schema === input.relation.schema && r.name === input.relation.name,
    );
    if (!relation) throw new Fault(422, 'RELATION_FORBIDDEN');
    const fieldKeys = new Set(input.fields.map((f) => f.key));
    if (
      fieldKeys.size !== input.fields.length ||
      new Set(input.fields.map((f) => f.physicalColumn)).size !== input.fields.length ||
      new Set(input.metrics.map((m) => m.key)).size !== input.metrics.length
    )
      throw new Fault(422, 'VALIDATION_ERROR');
    for (const f of input.fields) {
      const column = relation.columns.find((c) => c.name === f.physicalColumn);
      if (!column) throw new Fault(422, 'SCHEMA_MISMATCH');
      const kind = classify(column.dbType);
      if (kind !== f.dataType && !(kind === 'integer' && f.dataType === 'number'))
        throw new Fault(422, 'SCHEMA_MISMATCH');
    }
    for (const m of input.metrics) {
      const f = input.fields.find((f) => f.key === m.fieldKey);
      if (
        !f ||
        fieldKeys.has(m.key) ||
        (['sum', 'avg'].includes(m.aggregate) && !['number', 'integer'].includes(f.dataType)) ||
        m.availableDimensions.some(
          (k) => !input.fields.some((f) => f.key === k && f.isDimension),
        ) ||
        new Set(m.availableDimensions).size !== m.availableDimensions.length
      )
        throw new Fault(422, 'QUERY_REJECTED');
      this.validateFilters(input.fields, m.filters);
    }
    if (new Set(input.relationships.map((r) => r.key)).size !== input.relationships.length)
      throw new Fault(422, 'VALIDATION_ERROR');
    for (const r of input.relationships) {
      const target = await this.versionRow(tx, subject.organizationId, r.targetDatasetVersionId);
      const targetData = await this.datasetRow(tx, subject.organizationId, target.dataset_id);
      const a = input.fields.find((f) => f.key === r.sourceFieldKey),
        b = target.definition.fields.find((f) => f.key === r.targetFieldKey);
      if (!a || !b || a.dataType !== b.dataType || targetData.logical_data_source_id !== source.id)
        throw new Fault(422, 'SCHEMA_MISMATCH');
    }
    const policy = 'test_dataset_organization_v1';
    await tx.exec(
      `INSERT INTO row_policies(organization_id,key,definition,digest) VALUES($1,$2,'{"kind":"authorized-test-dataset"}',$3) ON CONFLICT DO NOTHING`,
      [subject.organizationId, policy, digest({ kind: 'authorized-test-dataset' })],
    );
    const row = requireValue(
      await tx.one<VersionRow>(
        `INSERT INTO dataset_versions(organization_id,dataset_id,version,relation_schema,relation_view,row_policy_key,schema_digest,metadata_snapshot_id,definition) SELECT $1,$2,coalesce(max(version),0)+1,$3,$4,$5,$6,$7,$8 FROM dataset_versions WHERE organization_id=$1 AND dataset_id=$2 RETURNING *`,
        [
          subject.organizationId,
          id,
          input.relation.schema,
          input.relation.name,
          policy,
          snapshot.schema_digest,
          input.metadataSnapshotId,
          JSON.stringify(input),
        ],
      ),
    );
    for (const f of input.fields)
      await tx.exec(
        `INSERT INTO dataset_fields(organization_id,dataset_version_id,key,physical_column,data_type,classification,filterable,name,description,is_dimension) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          subject.organizationId,
          row.id,
          f.key,
          f.physicalColumn,
          f.dataType,
          f.classification,
          f.filterable,
          f.name,
          f.description,
          f.isDimension,
        ],
      );
    for (const m of input.metrics)
      await tx.exec(
        `INSERT INTO metric_definitions(organization_id,dataset_version_id,key,aggregate,field_key,name,business_definition,description,filters,available_dimensions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          subject.organizationId,
          row.id,
          m.key,
          m.aggregate,
          m.fieldKey,
          m.name,
          m.businessDefinition,
          m.description,
          JSON.stringify(m.filters),
          m.availableDimensions,
        ],
      );
    await tx.exec(
      'UPDATE datasets SET revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2',
      [subject.organizationId, id],
    );
    return versionDto(row);
  }
  validateFilters(fields: S['DatasetField'][], filters: S['Filter'][]): void {
    for (const filter of filters) {
      const field = fields.find((f) => f.key === filter.fieldKey);
      if (!field?.filterable) throw new Fault(422, 'QUERY_REJECTED');
      const values = Array.isArray(filter.value) ? filter.value : [filter.value];
      if (
        (filter.operator === 'in' && !Array.isArray(filter.value)) ||
        (filter.operator === 'between' && values.length !== 2) ||
        (!['in', 'between'].includes(filter.operator) && Array.isArray(filter.value))
      )
        throw new Fault(422, 'QUERY_REJECTED');
      for (const value of values) {
        if (
          ['integer', 'number'].includes(field.dataType) &&
          !(
            typeof value === 'number' &&
            Number.isFinite(value) &&
            (field.dataType !== 'integer' || Number.isInteger(value))
          )
        )
          throw new Fault(422, 'QUERY_REJECTED');
        if (field.dataType === 'boolean' && typeof value !== 'boolean')
          throw new Fault(422, 'QUERY_REJECTED');
        if (
          ['date', 'datetime'].includes(field.dataType) &&
          (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
        )
          throw new Fault(422, 'QUERY_REJECTED');
        if (field.dataType === 'string' && typeof value !== 'string')
          throw new Fault(422, 'QUERY_REJECTED');
      }
    }
  }
  async createJob(
    tx: Sql,
    subject: Subject,
    connectionId: string,
    operation: JobRow['operation'],
    body: { relations?: S['RelationRef'][]; preview?: S['CreateDatasetPreview'] } = {},
    retryOf: string | null = null,
  ): Promise<S['CatalogJob']> {
    const c = await this.connectionRow(tx, subject.organizationId, connectionId);
    if (c.status !== 'active') throw new Fault(422, 'STATE_CONFLICT');
    if (operation !== 'preview') this.identity.requireConnection(subject, c.environment, operation);
    else if (c.environment !== 'test') throw new Fault(403, 'ENVIRONMENT_FORBIDDEN');
    if (
      body.relations?.some(
        (r) => !c.metadata_scope.some((a) => a.schema === r.schema && a.name === r.name),
      )
    )
      throw new Fault(422, 'RELATION_FORBIDDEN');
    if (
      operation === 'metadata' &&
      (!body.relations?.length ||
        new Set(body.relations.map((r) => r.schema + '.' + r.name)).size !== body.relations.length)
    )
      throw new Fault(422, 'RELATION_FORBIDDEN');
    const org = requireValue(
      await tx.one<{ policy_epoch: number }>('SELECT policy_epoch FROM organizations WHERE id=$1', [
        subject.organizationId,
      ]),
    );
    const input = {
      ...body,
      clientKind: subject.clientKind,
      authenticatedAt: subject.authenticatedAt,
      connectionRevision: Number(c.revision),
    };
    const row = requireValue(
      await tx.one<JobRow>(
        `INSERT INTO catalog_jobs(organization_id,requested_by,operation,environment,physical_connection_id,dataset_version_id,input,policy_epoch,retry_of) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          subject.organizationId,
          subject.userId,
          operation,
          c.environment,
          c.id,
          body.preview?.datasetVersionId ?? null,
          JSON.stringify(input),
          org.policy_epoch,
          retryOf,
        ],
      ),
    );
    return jobDto(row);
  }
  async previewVersion(
    tx: Sql,
    subject: Subject,
    datasetId: string,
    input: S['CreateDatasetPreview'],
  ): Promise<{ version: S['DatasetVersion']; connection: ConnectionRow }> {
    const d = await this.dataset(tx, subject, datasetId);
    if (d.status !== 'enabled') throw new Fault(404, 'NOT_FOUND');
    if (
      (await this.sourceRow(tx, subject.organizationId, d.logicalDataSourceId)).status !== 'enabled'
    )
      throw new Fault(404, 'NOT_FOUND');
    const row = await this.versionRow(tx, subject.organizationId, input.datasetVersionId);
    if (row.dataset_id !== datasetId) throw new Fault(404, 'NOT_FOUND');
    const grant = await this.identity.allowed(tx, subject, datasetId, 'dataset.query.test');
    const version = await this.presentVersion(tx, subject, row, grant);
    const fields = new Set(version.fields.map((f) => f.key));
    if (
      !version.fields.length ||
      new Set([...input.dimensions, ...input.metrics]).size !==
        input.dimensions.length + input.metrics.length ||
      input.dimensions.some((k) => !fields.has(k)) ||
      input.metrics.some((k) => !version.metrics.some((m) => m.key === k)) ||
      (input.metrics.length &&
        input.dimensions.some((k) => !version.fields.some((f) => f.key === k && f.isDimension)))
    )
      throw new Fault(422, 'QUERY_REJECTED');
    for (const m of version.metrics.filter((m) => input.metrics.includes(m.key)))
      if (input.dimensions.some((k) => !m.availableDimensions.includes(k)))
        throw new Fault(422, 'QUERY_REJECTED');
    this.validateFilters(version.fields, input.filters);
    const mapping = requireValue(
      await tx.one<{ physical_connection_id: string }>(
        `SELECT m.physical_connection_id FROM mapping_heads h JOIN source_mappings m ON m.organization_id=h.organization_id AND m.id=h.mapping_id WHERE h.organization_id=$1 AND h.logical_data_source_id=$2 AND h.environment='test'`,
        [subject.organizationId, d.logicalDataSourceId],
      ),
    );
    const c = await this.connectionRow(tx, subject.organizationId, mapping.physical_connection_id);
    if (
      c.environment !== 'test' ||
      c.status !== 'active' ||
      !c.metadata_scope.some(
        (r) => r.schema === version.relation.schema && r.name === version.relation.name,
      )
    )
      throw new Fault(403, 'ENVIRONMENT_FORBIDDEN');
    return { version, connection: c };
  }
  async job(tx: Sql, subject: Subject, id: string): Promise<S['CatalogJob']> {
    const row = requireValue(
      await tx.one<JobRow>('SELECT * FROM catalog_jobs WHERE organization_id=$1 AND id=$2', [
        subject.organizationId,
        id,
      ]),
    );
    if (row.operation === 'preview') throw new Fault(410, 'QUERY_GATEWAY_REQUIRED');
    this.identity.requireConnection(subject, row.environment, row.operation);
    return jobDto(row);
  }
  async snapshots(tx: Sql, subject: Subject, id: string): Promise<S['MetadataSnapshot'][]> {
    const c = await this.connectionRow(tx, subject.organizationId, id);
    this.identity.requireConnection(subject, c.environment, 'metadata');
    return (
      await tx.all<SnapshotRow>(
        'SELECT * FROM metadata_snapshots WHERE organization_id=$1 AND physical_connection_id=$2 ORDER BY created_at DESC,id DESC',
        [subject.organizationId, id],
      )
    ).map(snapshotDto);
  }
  async retry(tx: Sql, subject: Subject, id: string): Promise<S['CatalogJob']> {
    const row = requireValue(
      await tx.one<JobRow>('SELECT * FROM catalog_jobs WHERE organization_id=$1 AND id=$2', [
        subject.organizationId,
        id,
      ]),
    );
    if (row.status !== 'failed' || row.operation === 'preview')
      throw new Fault(409, 'STATE_CONFLICT');
    return this.createJob(
      tx,
      subject,
      row.physical_connection_id,
      row.operation,
      { ...(row.input.relations ? { relations: row.input.relations } : {}) },
      row.id,
    );
  }
}
export function classify(dbType: string): S['DatasetField']['dataType'] {
  const t = dbType.toLowerCase();
  if (/^(smallint|integer|bigint|int\b|tinyint|mediumint|serial|bigserial)/.test(t))
    return 'integer';
  if (/numeric|decimal|real|double|float|money/.test(t)) return 'number';
  if (/bool|^bit$/.test(t)) return 'boolean';
  if (/^date$/.test(t)) return 'date';
  if (/timestamp|datetime|datetimeoffset/.test(t)) return 'datetime';
  return 'string';
}
