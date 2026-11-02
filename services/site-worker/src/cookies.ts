const token = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const names = (appId: string) => ({
  legacy: 'eas_sc_' + appId.replaceAll('-', ''),
  prefix: 'eas_site_' + appId.replaceAll('-', '') + '_',
});

/** Host cookies are partitioned per app even when apps share an IP/origin. */
export function backendCookies(appId: string, header: string): string {
  const { legacy, prefix } = names(appId);
  const result: string[] = [];
  for (const part of header.split(';')) {
    const pair = part.trim(),
      separator = pair.indexOf('=');
    if (separator < 1) continue;
    const key = pair.slice(0, separator),
      value = pair.slice(separator + 1);
    if (key === legacy) result.push(pair);
    else if (key.startsWith(prefix)) {
      const encoded = key.slice(prefix.length);
      if (!/^[A-Za-z0-9_-]+$/.test(encoded)) continue;
      const original = Buffer.from(encoded, 'base64url').toString();
      if (token.test(original)) result.push(original + '=' + value);
    }
  }
  return result.join('; ');
}

export function browserCookie(appId: string, header: string): string | undefined {
  const parts = header.split(';'),
    pair = parts.shift()!,
    separator = pair.indexOf('=');
  if (separator < 1) return undefined;
  const key = pair.slice(0, separator).trim();
  if (!token.test(key)) return undefined;
  const { legacy, prefix } = names(appId),
    wire = key === legacy ? key : prefix + Buffer.from(key).toString('base64url');
  const attributes = parts
    .map((p) => p.trim())
    .filter((p) => !/^(domain|path|samesite)=|^(secure|httponly)$/i.test(p));
  return [
    wire + '=' + pair.slice(separator + 1),
    ...attributes,
    'Path=/v1',
    'HttpOnly',
    'SameSite=Strict',
    'Secure',
  ].join('; ');
}
