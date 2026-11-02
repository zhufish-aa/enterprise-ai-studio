import type { components } from '@eas/api-contract';
export type Entities = components['schemas'];
export type NativeSharing = Entities['SiteSharing'] & { shareUrl: string | null };
export interface SitesSettings {
  apiUrl: string;
  portalUrl: string;
  organizationId: string;
  workspaceRoot: string;
  allowLocalHttp: boolean;
  hasToken: boolean;
  configured: boolean;
}
export interface SitesConfiguration {
  apiUrl: string;
  portalUrl: string;
  organizationId: string;
  workspaceRoot: string;
  allowLocalHttp: boolean;
  token?: string;
}
export interface DatasetSelection {
  datasourceId: string;
  datasetId: string;
  datasetName: string;
  datasourceName: string;
  environment: 'test';
}
export interface SitesCatalog {
  sources: Entities['LogicalDataSource'][];
  datasets: Entities['Dataset'][];
  truncated: boolean;
}
export interface SitesRpc {
  call<T>(action: string, input?: object, signal?: AbortSignal): Promise<T>;
}
