import {
  responseFailure,
  type StudentCenterAction,
  type StudentCenterResponse,
} from '@eas/platform-sdk';
import { ApiError } from './api.js';
import { runtimeRequestId } from '@eas/platform-sdk/runtime';
export function studentCenterBridge(appId: string, versionId: string) {
  let csrf: string | null = null;
  const request = async (
    action: StudentCenterAction,
    payload: unknown,
    id: string,
    signal: AbortSignal,
  ) => {
    const path = '/student-centers/' + appId + '/actions',
      response = await fetch('/v1' + path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': id,
          ...(csrf ? { 'X-Student-CSRF': csrf } : {}),
        },
        body: JSON.stringify({ versionId, action, payload }),
        signal,
      }),
      r: unknown = await response.json().catch(() => null);
    const next = response.headers.get('X-Student-CSRF');
    if (next) csrf = next;
    if (!response.ok) {
      const code =
        (r as { error?: { code?: string } } | null)?.error?.code ?? 'STUDENT_SERVICE_UNAVAILABLE';
      if (response.status === 401) csrf = null;
      throw new ApiError(
        code,
        response.status,
        '',
        responseFailure(code, response.status, action, r),
      );
    }
    if (action === 'auth.logout') csrf = null;
    return (r as StudentCenterResponse).result;
  };
  return async (action: StudentCenterAction, payload: unknown, id: string, signal: AbortSignal) => {
    if (!csrf && !['auth.session', 'auth.login'].includes(action))
      await request('auth.session', {}, runtimeRequestId(), signal);
    return request(action, payload, id, signal);
  };
}
