import { readFile } from 'node:fs/promises';
import { Ajv, type ValidateFunction } from 'ajv';
import type { CatalogPlan, ConnectorResult } from '@eas/api-contract';
import { Fault, invalidParameters } from './errors.js';
interface Operation {
  operationId: string;
  'x-implementation'?: string;
  'x-permissions'?: string[];
  'x-human-only'?: boolean;
  requestBody?: { required?: boolean; content: Record<string, { schema: unknown }> };
  parameters?: Array<{
    $ref?: string;
    name?: string;
    in?: string;
    required?: boolean;
    schema?: unknown;
  }>;
}
export interface Contract {
  paths: Record<string, Record<string, Operation>>;
  components: {
    schemas: Record<string, unknown>;
    parameters: Record<string, { name: string; in: string; required?: boolean; schema: unknown }>;
  };
}
export async function contractValidation() {
  const spec = JSON.parse(
    await readFile(
      new URL('../../../../packages/api-contract/openapi.json', import.meta.url),
      'utf8',
    ),
  ) as Contract;
  const ajv = new Ajv({
    strict: false,
    allErrors: false,
    allowUnionTypes: true,
    removeAdditional: false,
    coerceTypes: false,
  });
  ajv.addFormat('uuid', /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i);
  ajv.addFormat('date-time', {
    type: 'string',
    validate: (s: string) => {
      const m =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
          s,
        );
      if (!m) return false;
      const y = Number(m[1]),
        month = Number(m[2]),
        day = Number(m[3]);
      return (
        y >= 1 &&
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= new Date(Date.UTC(y, month, 0)).getUTCDate() &&
        Number(m[4]) < 24 &&
        Number(m[5]) < 60 &&
        Number(m[6]) < 60 &&
        Number(m[7] ?? 0) < 24 &&
        Number(m[8] ?? 0) < 60 &&
        Number.isFinite(Date.parse(s))
      );
    },
  });
  ajv.addSchema(spec, 'eas');
  const cache = new Map<string, ValidateFunction>();
  const validate = (name: string, data: unknown): boolean => {
    let fn = cache.get(name);
    if (!fn) {
      fn = ajv.compile({ $ref: 'eas#/components/schemas/' + name });
      cache.set(name, fn);
    }
    return fn(data) === true;
  };
  const body = (operation: Operation, data: unknown) => {
    const schema = operation.requestBody?.content['application/json']?.schema;
    if (!schema) {
      if (data !== undefined && data !== null)
        throw new Fault(400, 'VALIDATION_ERROR', '此接口不接受请求体。', [
          { field: '/', reason: '移除请求体后重新提交。' },
        ]);
      return;
    }
    if (operation.requestBody?.required === false && data === undefined) return;
    const reference = (schema as { $ref?: string }).$ref;
    let fn: ValidateFunction;
    if (reference) {
      const name = reference.split('/').at(-1) ?? '';
      validate(name, data);
      fn = cache.get(name)!;
    } else fn = ajv.compile(schema as object);
    if (!fn(data)) throw invalidParameters(fn.errors);
  };
  const result = (
    r: ConnectorResult,
    p: Pick<CatalogPlan, 'jobId' | 'attempt' | 'operation' | 'relations'>,
  ): boolean => {
    if (
      !r ||
      typeof r !== 'object' ||
      Object.keys(r).some((k) => !['jobId', 'attempt', 'ok', 'data', 'failureCode'].includes(k)) ||
      r.jobId !== p.jobId ||
      r.attempt !== p.attempt ||
      typeof r.ok !== 'boolean'
    )
      return false;
    if (!r.ok)
      return r.data === null && typeof r.failureCode === 'string' && r.failureCode.length < 80;
    if (r.failureCode !== null || !r.data) return false;
    if (p.operation === 'health')
      return (
        Object.keys(r.data).sort().join(',') === 'checkedAt,healthy' &&
        'healthy' in r.data &&
        r.data.healthy === true &&
        'checkedAt' in r.data &&
        Number.isFinite(Date.parse(r.data.checkedAt))
      );
    if (p.operation === 'preview') return validate('PreviewResult', r.data);
    if (!('relations' in r.data) || r.data.relations.length !== p.relations.length) return false;
    return r.data.relations.every(
      (relation) =>
        validate('RelationMetadata', relation) &&
        p.relations.some((a) => a.schema === relation.schema && a.name === relation.name),
    );
  };
  return { spec, body, validate, result };
}
