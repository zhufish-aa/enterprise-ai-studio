import type { components } from '@eas/api-contract';
import type { Sql } from '../infrastructure/database.js';
import type { Subject } from '../identity/identity.js';
export interface ReleaseSource {
  appId: string;
  appName: string;
  appVersionId: string;
  version: number;
  buildJobId: string;
  sourceDigest: string;
  artifactId: string;
  artifactDigest: string;
  html: string;
  manifest: components['schemas']['SourceManifest'];
  changes: string[];
  reports: unknown[];
}
export interface StudioReleasePort {
  freeze(tx: Sql, s: Subject, versionId: string, buildId: string): Promise<ReleaseSource>;
  apps(tx: Sql, s: Subject): Promise<components['schemas']['StudioApp'][]>;
}
