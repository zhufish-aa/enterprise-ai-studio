export interface FaultDetail {
  field: string;
  reason: string;
}
export class Fault extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly safeMessage: string = code,
    readonly details: FaultDetail[] = [],
  ) {
    super(safeMessage);
    this.name = 'Fault';
  }
}
export function invalidParameters(
  errors:
    | readonly { instancePath: string; keyword: string; params: Record<string, unknown> }[]
    | null
    | undefined,
): Fault {
  const details = (errors ?? []).slice(0, 8).map((error) => {
    const missing = error.keyword === 'required' ? error.params['missingProperty'] : undefined;
    return {
      field:
        error.instancePath +
          (typeof missing === 'string' && /^[a-zA-Z0-9_]{1,80}$/.test(missing)
            ? '/' + missing
            : '') || '/',
      reason:
        error.keyword === 'required'
          ? '缺少必填字段'
          : error.keyword === 'type'
            ? '字段类型不正确，应为 ' + String(error.params['type'])
            : error.keyword === 'additionalProperties'
              ? '包含接口未定义的字段'
              : error.keyword === 'format'
                ? '字段格式不正确，应为 ' + String(error.params['format'])
                : '不满足 ' + error.keyword + ' 校验规则',
    };
  });
  return new Fault(400, 'VALIDATION_ERROR', '请求参数格式不正确，请按具体字段说明修正。', details);
}
export function requireValue<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Fault(404, 'NOT_FOUND');
  return value;
}
