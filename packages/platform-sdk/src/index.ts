import type { components } from '@eas/api-contract';
import { failureInfo, formatFailure, responseFailure, type FailureInfo } from './diagnostics.js';
export * from './diagnostics.js';
export { PreviewQueryQueue } from './preview-queue.js';
export type S = components['schemas'];
/** Share paths identify resources; they carry no token or transferable data permission. */
export function siteShareUrl(portalUrl: string, sharePath: string | null): string | null {
  if (sharePath === null) return null;
  if (!/^\/s\/[a-f0-9-]{36}\?organizationId=[a-f0-9-]{36}$/i.test(sharePath))
    throw new Error('SHARE_LINK_INVALID');
  const base = new URL(portalUrl);
  if (base.username || base.password || !['https:', 'http:'].includes(base.protocol))
    throw new Error('SHARE_LINK_INVALID');
  return new URL(sharePath, base).href;
}
export class PlatformError extends Error {
  readonly diagnostic: FailureInfo;
  constructor(
    readonly code: string,
    readonly status: number,
    diagnostic?: FailureInfo,
  ) {
    const info = diagnostic ?? failureInfo(code, { status });
    super(formatFailure(info));
    this.name = 'PlatformError';
    this.diagnostic = info;
  }
}
export interface ClientOptions {
  apiUrl: string;
  organizationId: string;
  token: () => Promise<string>;
  timeoutMs?: number;
  allowLocalHttp?: boolean;
  log?: (entry: { method: string; status: number; code?: string }) => void;
}
export class PlatformClient {
  private readonly base: URL;
  constructor(private readonly config: ClientOptions) {
    this.base = new URL(config.apiUrl);
    if (
      this.base.username ||
      this.base.password ||
      this.base.search ||
      this.base.hash ||
      (this.base.protocol !== 'https:' &&
        !(
          config.allowLocalHttp &&
          this.base.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(this.base.hostname)
        ))
    )
      throw new PlatformError('API_ADDRESS_REJECTED', 0);
  }
  async request<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST';
      body?: unknown;
      signal?: AbortSignal;
      idempotencyKey?: string;
    } = {},
  ): Promise<T> {
    if (
      !/^\/[a-zA-Z0-9_/.-]+(?:\?[a-zA-Z0-9_%~!()*'+=&.-]*)?$/.test(path) ||
      path.split('?')[0]!.includes('..') ||
      path.split('?')[0]!.includes('//')
    )
      throw new PlatformError('API_PATH_REJECTED', 0);
    const method = options.method ?? 'GET',
      deadline = AbortSignal.timeout(this.config.timeoutMs ?? 15000),
      signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
    try {
      let token: string;
      try {
        token = await this.config.token();
      } catch (error) {
        const code =
          error instanceof Error && /^[A-Z_]{1,80}$/.test(error.message)
            ? error.message
            : 'TOKEN_STORE_UNAVAILABLE';
        throw new PlatformError(code, 0, failureInfo(code, { operation: method + ' ' + path }));
      }
      if (!token || /[\r\n]/.test(token)) throw new PlatformError('UNAUTHENTICATED', 401);
      const res = await fetch(new URL('/v1' + path, this.base), {
        method,
        signal,
        redirect: 'error',
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + token,
          'X-Organization-Id': this.config.organizationId,
          ...(method === 'POST'
            ? { 'Idempotency-Key': options.idempotencyKey ?? crypto.randomUUID() }
            : {}),
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
      const value: unknown = await res.json().catch(() => {
        throw new PlatformError(
          'PLATFORM_INVALID_RESPONSE',
          res.status,
          failureInfo('PLATFORM_INVALID_RESPONSE', {
            status: res.status,
            operation: method + ' ' + path,
          }),
        );
      });
      if (!res.ok) {
        const raw = (value as { error?: { code?: unknown } })?.error?.code,
          code =
            typeof raw === 'string' && /^[A-Z_]{1,80}$/.test(raw) ? raw : 'PLATFORM_REQUEST_FAILED';
        throw new PlatformError(
          code,
          res.status,
          responseFailure(code, res.status, method + ' ' + path, value),
        );
      }
      this.config.log?.({ method, status: res.status });
      return value as T;
    } catch (e) {
      const code = options.signal?.aborted
        ? 'REQUEST_CANCELLED'
        : deadline.aborted
          ? 'REQUEST_TIMEOUT'
          : 'PLATFORM_UNAVAILABLE';
      const error =
        e instanceof PlatformError
          ? e
          : new PlatformError(code, 0, failureInfo(code, { operation: method + ' ' + path }));
      this.config.log?.({ method, status: error.status, code: error.code });
      throw error;
    }
  }
  apps(signal?: AbortSignal) {
    return this.request<S['StudioAppPage']>('/apps', signal ? { signal } : {});
  }
  openDebug(appId: string, input: S['StudioDebugOpen'], signal?: AbortSignal) {
    return this.request<S['StudioDebugSession']>('/apps/' + appId + '/debug-sessions', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  debugSession(id: string, signal?: AbortSignal) {
    return this.request<S['StudioDebugSession']>('/debug-sessions/' + id, signal ? { signal } : {});
  }
  debugAction(id: string, input: S['StudioDebugAction'], signal?: AbortSignal) {
    return this.request<S['StudioDebugSession']>('/debug-sessions/' + id + '/actions', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  debugScreenshot(
    id: string,
    options: { fullPage?: boolean; selector?: string } = {},
    signal?: AbortSignal,
  ) {
    const query = new URLSearchParams({
      fullPage: String(options.fullPage !== false),
      ...(options.selector ? { selector: options.selector } : {}),
    });
    return this.request<S['StudioDebugScreenshot']>(
      '/debug-sessions/' + id + '/screenshot?' + query.toString(),
      signal ? { signal } : {},
    );
  }
  closeDebug(id: string, signal?: AbortSignal) {
    return this.request<S['StudioDebugSession']>('/debug-sessions/' + id + '/close', {
      method: 'POST',
      ...(signal ? { signal } : {}),
    });
  }
  createRelease(input: S['Stage06CreateRelease'], signal?: AbortSignal) {
    return this.request<S['Stage06Release']>('/release-requests', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  submitRelease(releaseRequestId: string, signal?: AbortSignal) {
    return this.request<S['Stage06Release']>('/release-requests/' + releaseRequestId + '/submit', {
      method: 'POST',
      ...(signal ? { signal } : {}),
    });
  }
  release(releaseRequestId: string, signal?: AbortSignal) {
    return this.request<S['Stage06Release']>(
      '/release-requests/' + releaseRequestId,
      signal ? { signal } : {},
    );
  }
  deployment(deploymentId: string, signal?: AbortSignal) {
    return this.request<S['Stage06Deployment']>(
      '/deployments/' + deploymentId,
      signal ? { signal } : {},
    );
  }
  createApp(input: S['StudioAppCreate'], signal?: AbortSignal) {
    return this.request<S['StudioApp']>('/apps', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  upload(id: string, input: S['SourceUpload'], signal?: AbortSignal) {
    return this.request<S['StudioVersion']>('/apps/' + id + '/versions', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  build(versionId: string, signal?: AbortSignal) {
    return this.request<S['StudioBuild']>('/app-versions/' + versionId + '/builds', {
      method: 'POST',
      ...(signal ? { signal } : {}),
    });
  }
  workspace(appId: string, signal?: AbortSignal) {
    return this.request<S['ServerWorkspace']>(
      '/apps/' + appId + '/workspace',
      signal ? { signal } : {},
    );
  }
  readWorkspaceFile(appId: string, input: S['ReadServerWorkspaceFile'], signal?: AbortSignal) {
    return this.request<S['ServerWorkspaceFile']>('/apps/' + appId + '/workspace/read', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  writeWorkspace(appId: string, input: S['WriteServerWorkspace'], signal?: AbortSignal) {
    return this.request<S['ServerWorkspace']>('/apps/' + appId + '/workspace/write', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  editWorkspace(appId: string, input: S['EditServerWorkspace'], signal?: AbortSignal) {
    return this.request<S['ServerWorkspace']>('/apps/' + appId + '/workspace/edit', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  removeWorkspaceFiles(
    appId: string,
    input: S['RemoveServerWorkspaceFiles'],
    signal?: AbortSignal,
  ) {
    return this.request<S['ServerWorkspace']>('/apps/' + appId + '/workspace/remove', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  moveWorkspaceFile(appId: string, input: S['MoveServerWorkspaceFile'], signal?: AbortSignal) {
    return this.request<S['ServerWorkspace']>('/apps/' + appId + '/workspace/move', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  checkoutWorkspace(appId: string, input: S['CheckoutServerWorkspace'], signal?: AbortSignal) {
    return this.request<S['ServerWorkspace']>('/apps/' + appId + '/workspace/checkout', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
  commitWorkspace(appId: string, input: S['CommitServerWorkspace'], signal?: AbortSignal) {
    return this.request<S['ServerWorkspaceCommit']>('/apps/' + appId + '/workspace/commit', {
      method: 'POST',
      body: input,
      ...(signal ? { signal } : {}),
    });
  }
}
export { studentCenterActions } from './student-center.js';
export type {
  StudentCenterAction,
  StudentCenterRequest,
  StudentCenterResponse,
  StudentCenterPayload,
  StudentCenterResult,
} from './student-center.js';
