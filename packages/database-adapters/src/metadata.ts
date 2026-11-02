import type { components, Engine } from '@eas/api-contract';
import type { DataRow, DriverPool } from './drivers.js';
import { AdapterError } from './network.js';
type S = components['schemas'];
const t = (v: unknown) => (v == null ? '' : String(v));
const b = (v: unknown) => v === true || v === 1 || v === '1' || v === 'YES';
const ordered = (rows: DataRow[], key: string) => rows.map((r) => t(r[key]));
export const placeholder = (engine: Engine, index: number) =>
  engine === 'postgresql' ? '$' + (index + 1) : engine === 'mysql' ? '?' : '@p' + index;
export const quote = (engine: Engine, value: string): string => {
  if (!value || value.includes('\0') || value.length > 128)
    throw new AdapterError('RELATION_FORBIDDEN');
  return engine === 'mysql'
    ? '`' + value.replaceAll('`', '``') + '`'
    : engine === 'sqlserver'
      ? '[' + value.replaceAll(']', ']]') + ']'
      : '"' + value.replaceAll('"', '""') + '"';
};
export async function readRelation(
  pool: DriverPool,
  engine: Engine,
  relation: S['RelationRef'],
  scope: S['RelationRef'][],
  signal: AbortSignal,
): Promise<S['RelationMetadata']> {
  const p0 = placeholder(engine, 0),
    p1 = placeholder(engine, 1),
    args = [relation.schema, relation.name];
  const run = (query: string) => pool.query(query, args, signal);
  let tables: DataRow[],
    columns: DataRow[],
    primary: DataRow[],
    foreign: DataRow[],
    indexes: DataRow[];
  if (engine === 'postgresql') {
    tables = await run(
      `SELECT c.relname AS name, CASE WHEN c.relkind IN ('v','m') THEN 'view' ELSE 'table' END AS kind, coalesce(obj_description(c.oid),'') AS comment FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=${p0} AND c.relname=${p1} AND c.relkind IN ('r','p','v','m') AND has_table_privilege(c.oid,'SELECT')`,
    );
    columns = await run(
      `SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS db_type,NOT a.attnotnull AS nullable,a.attnum AS ordinal,coalesce(col_description(c.oid,a.attnum),'') AS comment FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=${p0} AND c.relname=${p1} AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum LIMIT 501`,
    );
    primary = await run(
      `SELECT a.attname AS column_name FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN LATERAL unnest(k.conkey) WITH ORDINALITY x(num,pos) ON true JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num WHERE n.nspname=${p0} AND c.relname=${p1} AND k.contype='p' ORDER BY x.pos`,
    );
    foreign = await run(
      `SELECT k.conname AS name,a.attname AS column_name,rn.nspname AS referenced_schema,rc.relname AS referenced_relation,ra.attname AS referenced_column,x.pos FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_class rc ON rc.oid=k.confrelid JOIN pg_catalog.pg_namespace rn ON rn.oid=rc.relnamespace JOIN LATERAL unnest(k.conkey,k.confkey) WITH ORDINALITY x(num,rnum,pos) ON true JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num JOIN pg_catalog.pg_attribute ra ON ra.attrelid=rc.oid AND ra.attnum=x.rnum WHERE n.nspname=${p0} AND c.relname=${p1} AND k.contype='f' ORDER BY k.conname,x.pos`,
    );
    indexes = await run(
      `SELECT ic.relname AS name,i.indisunique AS is_unique,i.indisprimary AS is_primary,a.attname AS column_name,x.pos FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class c ON c.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid JOIN LATERAL unnest(i.indkey) WITH ORDINALITY x(num,pos) ON true LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.num WHERE n.nspname=${p0} AND c.relname=${p1} ORDER BY ic.relname,x.pos LIMIT 3000`,
    );
  } else if (engine === 'mysql') {
    tables = await run(
      `SELECT TABLE_NAME AS name,CASE WHEN TABLE_TYPE='VIEW' THEN 'view' ELSE 'table' END AS kind,coalesce(TABLE_COMMENT,'') AS comment FROM information_schema.TABLES WHERE TABLE_SCHEMA=${p0} AND TABLE_NAME=${p1}`,
    );
    columns = await run(
      `SELECT COLUMN_NAME AS name,COLUMN_TYPE AS db_type,IS_NULLABLE AS nullable,ORDINAL_POSITION AS ordinal,coalesce(COLUMN_COMMENT,'') AS comment FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=${p0} AND TABLE_NAME=${p1} ORDER BY ORDINAL_POSITION LIMIT 501`,
    );
    primary = await run(
      `SELECT COLUMN_NAME AS column_name FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=${p0} AND TABLE_NAME=${p1} AND CONSTRAINT_NAME='PRIMARY' ORDER BY ORDINAL_POSITION`,
    );
    foreign = await run(
      `SELECT CONSTRAINT_NAME AS name,COLUMN_NAME AS column_name,REFERENCED_TABLE_SCHEMA AS referenced_schema,REFERENCED_TABLE_NAME AS referenced_relation,REFERENCED_COLUMN_NAME AS referenced_column FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=${p0} AND TABLE_NAME=${p1} AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY CONSTRAINT_NAME,ORDINAL_POSITION`,
    );
    indexes = await run(
      `SELECT INDEX_NAME AS name,CASE WHEN NON_UNIQUE=0 THEN 1 ELSE 0 END AS is_unique,CASE WHEN INDEX_NAME='PRIMARY' THEN 1 ELSE 0 END AS is_primary,COLUMN_NAME AS column_name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=${p0} AND TABLE_NAME=${p1} ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 3000`,
    );
  } else {
    tables = await run(
      `SELECT o.name,CASE WHEN o.type='V' THEN 'view' ELSE 'table' END AS kind,coalesce(CAST(ep.value AS nvarchar(4000)),'') AS comment FROM sys.objects o JOIN sys.schemas s ON s.schema_id=o.schema_id LEFT JOIN sys.extended_properties ep ON ep.major_id=o.object_id AND ep.minor_id=0 AND ep.name='MS_Description' WHERE s.name=${p0} AND o.name=${p1} AND o.type IN ('U','V') AND HAS_PERMS_BY_NAME(QUOTENAME(s.name)+'.'+QUOTENAME(o.name),'OBJECT','SELECT')=1`,
    );
    columns = await run(
      `SELECT TOP(501) c.name,ty.name AS db_type,c.is_nullable AS nullable,c.column_id AS ordinal,coalesce(CAST(ep.value AS nvarchar(4000)),'') AS comment FROM sys.columns c JOIN sys.objects o ON o.object_id=c.object_id JOIN sys.schemas s ON s.schema_id=o.schema_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id LEFT JOIN sys.extended_properties ep ON ep.major_id=c.object_id AND ep.minor_id=c.column_id AND ep.name='MS_Description' WHERE s.name=${p0} AND o.name=${p1} ORDER BY c.column_id`,
    );
    primary = await run(
      `SELECT c.name AS column_name FROM sys.indexes i JOIN sys.objects o ON o.object_id=i.object_id JOIN sys.schemas s ON s.schema_id=o.schema_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE s.name=${p0} AND o.name=${p1} AND i.is_primary_key=1 ORDER BY ic.key_ordinal`,
    );
    foreign = await run(
      `SELECT fk.name,c.name AS column_name,rs.name AS referenced_schema,ro.name AS referenced_relation,rc.name AS referenced_column FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id=fkc.constraint_object_id JOIN sys.objects o ON o.object_id=fk.parent_object_id JOIN sys.schemas s ON s.schema_id=o.schema_id JOIN sys.columns c ON c.object_id=o.object_id AND c.column_id=fkc.parent_column_id JOIN sys.objects ro ON ro.object_id=fk.referenced_object_id JOIN sys.schemas rs ON rs.schema_id=ro.schema_id JOIN sys.columns rc ON rc.object_id=ro.object_id AND rc.column_id=fkc.referenced_column_id WHERE s.name=${p0} AND o.name=${p1} ORDER BY fk.name,fkc.constraint_column_id`,
    );
    indexes = await run(
      `SELECT TOP(3000) i.name,i.is_unique,i.is_primary_key AS is_primary,c.name AS column_name FROM sys.indexes i JOIN sys.objects o ON o.object_id=i.object_id JOIN sys.schemas s ON s.schema_id=o.schema_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id WHERE s.name=${p0} AND o.name=${p1} AND i.name IS NOT NULL ORDER BY i.name,ic.key_ordinal`,
    );
  }
  const table = tables[0];
  if (!table || columns.length > 500) throw new AdapterError('RELATION_FORBIDDEN');
  const pk = ordered(primary, 'column_name');
  const fks = new Map<string, S['ForeignKeyMetadata']>();
  for (const row of foreign) {
    if (
      !scope.some(
        (r) => r.schema === t(row['referenced_schema']) && r.name === t(row['referenced_relation']),
      )
    )
      continue;
    const name = t(row['name']);
    let f = fks.get(name);
    if (!f) {
      f = {
        name,
        columns: [],
        referencedSchema: t(row['referenced_schema']),
        referencedRelation: t(row['referenced_relation']),
        referencedColumns: [],
      };
      fks.set(name, f);
    }
    f.columns.push(t(row['column_name']));
    f.referencedColumns.push(t(row['referenced_column']));
  }
  const idx = new Map<string, S['IndexMetadata']>();
  for (const row of indexes) {
    const name = t(row['name']);
    let item = idx.get(name);
    if (!item) {
      item = { name, unique: b(row['is_unique']), primary: b(row['is_primary']), columns: [] };
      idx.set(name, item);
    }
    if (row['column_name']) item.columns.push(t(row['column_name']));
  }
  if (fks.size > 100 || idx.size > 100) throw new AdapterError('METADATA_SYNC_FAILED');
  return {
    ...relation,
    kind: table['kind'] === 'view' ? 'view' : 'table',
    comment: t(table['comment']).slice(0, 4000),
    columns: columns.map((row) => ({
      name: t(row['name']),
      dbType: t(row['db_type']),
      nullable: b(row['nullable']),
      ordinal: Number(row['ordinal']),
      comment: t(row['comment']).slice(0, 4000),
      primaryKey: pk.includes(t(row['name'])),
    })),
    primaryKey: pk,
    foreignKeys: [...fks.values()],
    indexes: [...idx.values()],
  };
}
