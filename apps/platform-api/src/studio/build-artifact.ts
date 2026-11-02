import type { SiteBuildArtifact } from '@eas/api-contract';
import { createHash } from 'node:crypto';
import { Fault } from '../infrastructure/errors.js';
export function siteArtifact(content: Buffer | string): SiteBuildArtifact {
  let value: SiteBuildArtifact;
  try {
    value = JSON.parse(content.toString()) as SiteBuildArtifact;
  } catch {
    throw new Fault(409, 'SITE_BUILD_REQUIRED', '请先构建这个站点的完整前后端版本。');
  }
  if (
    value.format !== 'site-fullstack-v1' ||
    typeof value.html !== 'string' ||
    typeof value.backend !== 'string' ||
    createHash('sha256').update(value.backend).digest('hex') !== value.backendDigest ||
    !Array.isArray(value.migrations)
  )
    throw new Fault(409, 'SITE_BUILD_DIGEST_MISMATCH', '站点构建产物校验失败，请重新构建。');
  return value;
}
export function previewHtml(content: Buffer | string): string {
  const text = content.toString();
  return text.startsWith('{') ? siteArtifact(text).html : text;
}
