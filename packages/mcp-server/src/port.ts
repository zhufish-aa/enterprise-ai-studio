export interface PlatformRequest {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
}
/** The platform owns identity and authorization; this module never accepts credentials from tool arguments. */
export interface McpPlatformPort {
  portalUrl: string;
  request<T>(path: string, options?: PlatformRequest): Promise<T>;
}
