import type { MutualTls } from '@eas/connector-transport';
/** Deployment-owned connector target, never populated from a business request. */
export interface WorkerTarget {
  url: URL;
  key: string;
  tls?: MutualTls | undefined;
  allowLocalHttp?: boolean;
}
