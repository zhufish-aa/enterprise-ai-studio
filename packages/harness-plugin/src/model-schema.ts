/** Reviewed Harness 0.2.1-rc.2/rc.3 raw tools use this JSON Schema projection.
 * Length/range/pattern limits remain enforced by the full Ajv schema in execute(). */
export function modelSchema(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const s = { ...value } as Record<string, unknown>,
    allowed = [
      'type',
      'oneOf',
      'properties',
      'required',
      'additionalProperties',
      'items',
      'enum',
      'const',
      'description',
      'title',
      'default',
      'examples',
    ];
  if (!s['type'] && ('const' in s || Array.isArray(s['enum']))) {
    const scalar = 'const' in s ? s['const'] : (s['enum'] as unknown[])[0];
    s['type'] = scalar === null ? 'null' : typeof scalar;
  }
  if (Array.isArray(s['type']))
    return { oneOf: s['type'].map((t) => modelSchema({ ...s, type: t })) };
  if (Array.isArray(s['anyOf'])) return { oneOf: s['anyOf'].map(modelSchema) };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (!allowed.includes(k)) continue;
    if (k === 'properties')
      result[k] = Object.fromEntries(
        Object.entries(v as object).map(([key, node]) => [key, modelSchema(node)]),
      );
    else if (k === 'items') result[k] = modelSchema(v);
    else if (k === 'oneOf') result[k] = (v as unknown[]).map(modelSchema);
    else result[k] = v;
  }
  return result;
}
