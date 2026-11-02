import type { components } from '@eas/api-contract';
import { failureInfo, formatFailure, type FailureInfo } from './diagnostics.js';
export { failureInfo, formatFailure } from './diagnostics.js';
type S = components['schemas'];
import type {
  StudentCenterAction,
  StudentCenterPayload,
  StudentCenterResult,
} from './student-center.js';
export interface SiteRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}
export interface SiteResponse<T> {
  status: number;
  headers: Record<string, string | string[]>;
  body: T;
}
/** Generic HTTP bridge; the parent binds the immutable version and never forwards platform credentials. */
export function siteRequest<T = unknown>(
  path: string,
  options: SiteRequestOptions = {},
  signal?: AbortSignal,
): Promise<SiteResponse<T>> {
  const id = runtimeRequestId();
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = (value?: SiteResponse<T>, error?: Error) => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(value!);
    };
    const cancel = () => {
      window.parent.postMessage({ type: 'site.cancel', id }, '*');
      finish(undefined, new Error('操作已取消。'));
    };
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.type !== 'site.result' ||
        event.data?.id !== id
      )
        return;
      if (event.data.error)
        finish(undefined, new Error(String(event.data.message ?? event.data.error)));
      else finish(event.data.response as SiteResponse<T>);
    };
    timer = setTimeout(
      () => finish(undefined, new Error('站点后端响应超时，请查看后端运行状态。')),
      180000,
    );
    window.addEventListener('message', receive);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    window.parent.postMessage(
      {
        type: 'site.request',
        id,
        path,
        method: options.method ?? 'GET',
        body: options.body,
        headers: options.headers ?? {},
      },
      '*',
    );
  });
}
export type {
  StudentCenterAction,
  StudentCenterPayload,
  StudentCenterResult,
} from './student-center.js';
export function runtimeRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return (
    hex.slice(0, 8) +
    '-' +
    hex.slice(8, 12) +
    '-' +
    hex.slice(12, 16) +
    '-' +
    hex.slice(16, 20) +
    '-' +
    hex.slice(20)
  );
}
/** App-bound departmental records. The trusted host supplies the actual app/version and login session. */
export function studentCenter<K extends StudentCenterAction>(
  action: K,
  payload: StudentCenterPayload<K>,
  signal?: AbortSignal,
): Promise<StudentCenterResult<K>> {
  if (window.parent === window) return Promise.reject(new Error('请从企业平台打开此站点。'));
  const id = runtimeRequestId();
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = (value?: StudentCenterResult<K>, error?: Error) => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(value!);
    };
    const cancel = () => finish(undefined, new Error('操作已取消。'));
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.id !== id ||
        event.data?.type !== 'student-center.result'
      )
        return;
      const r = event.data as {
        result?: StudentCenterResult<K>;
        error?: string;
        diagnostic?: FailureInfo;
      };
      if (r.error) {
        if (r.error === 'STUDENT_LOGIN_REQUIRED')
          window.dispatchEvent(new Event('student-center.session-expired'));
        finish(
          undefined,
          new RuntimeQueryError(r.diagnostic ?? failureInfo(r.error, { operation: action })),
        );
      } else finish(r.result);
    };
    timer = setTimeout(
      () => finish(undefined, new Error('后台响应超时，请确认服务已启动后重试。')),
      120000,
    );
    window.addEventListener('message', receive);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    window.parent.postMessage({ type: 'student-center.request', id, action, payload }, '*');
  });
}
export class RuntimeQueryError extends Error {
  constructor(readonly diagnostic: FailureInfo) {
    super(formatFailure(diagnostic));
    this.name = 'RuntimeQueryError';
  }
}
/** Display metadata only. Server authorization never trusts a client-provided environment. */
export function getRuntimeContext(): {
  environment: 'test' | 'production';
  appId: string;
  versionId: string;
} | null {
  if (typeof window === 'undefined' || !window.name.startsWith('eas-runtime:')) return null;
  try {
    const context = JSON.parse(window.name.slice('eas-runtime:'.length)) as Record<string, unknown>;
    if (
      !['test', 'production'].includes(String(context['environment'])) ||
      typeof context['appId'] !== 'string' ||
      typeof context['versionId'] !== 'string'
    )
      return null;
    return {
      environment: context['environment'] as 'test' | 'production',
      appId: context['appId'],
      versionId: context['versionId'],
    };
  } catch {
    return null;
  }
}
/** Runs only in an opaque sandbox. No token, API URL, database address or environment parameter. */
export async function query(
  queryKey: string,
  filters: S['Filter'][] = [],
  timeRange?: S['QuerySpec']['timeRange'],
  signal?: AbortSignal,
): Promise<S['QueryResult']> {
  if (window.parent === window) throw new Error('PREVIEW_BRIDGE_REQUIRED');
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const heartbeat = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.parent.postMessage({ type: 'studio.cancel', id }, '*');
        finish(
          undefined,
          new RuntimeQueryError(failureInfo('QUERY_TIMEOUT', { operation: '查询 ' + queryKey })),
        );
      }, 30000);
    };
    const finish = (value?: S['QueryResult'], error?: Error) => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      signal?.removeEventListener('abort', cancel);
      error ? reject(error) : resolve(value!);
    };
    const cancel = () => {
      window.parent.postMessage({ type: 'studio.cancel', id }, '*');
      finish(undefined, new Error('QUERY_CANCELLED'));
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.id !== id) return;
      if (event.data.type === 'studio.pending') {
        heartbeat();
        return;
      }
      if (event.data.type !== 'studio.result') return;
      const value = event.data as {
        result?: S['QueryResult'];
        error?: string;
        diagnostic?: FailureInfo;
      };
      if (value.error) {
        const code = /^[A-Z_]{1,80}$/.test(value.error) ? value.error : 'QUERY_FAILED';
        finish(
          undefined,
          new RuntimeQueryError(
            value.diagnostic?.code === code
              ? value.diagnostic
              : failureInfo(code, { operation: '查询 ' + queryKey }),
          ),
        );
      } else if (
        value.result &&
        Array.isArray(value.result.rows) &&
        Array.isArray(value.result.columns)
      )
        finish(value.result);
      else
        finish(
          undefined,
          new RuntimeQueryError(
            failureInfo('INVALID_QUERY_RESULT', { operation: '查询 ' + queryKey }),
          ),
        );
    };
    heartbeat();
    window.addEventListener('message', receive);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    window.parent.postMessage(
      { type: 'studio.query', id, queryKey, filters, ...(timeRange ? { timeRange } : {}) },
      '*',
    );
  });
}
