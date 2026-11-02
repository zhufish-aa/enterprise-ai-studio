import { siteRequest } from '@eas/platform-sdk/runtime';
import type { components } from '../shared/contracts';
type S = components['schemas'];
type Action = S['StudentCenterRequest']['action'];
type Payload<K extends Action> = Extract<S['StudentCenterRequest'], { action: K }>['payload'];
type Result<K extends Action> = Extract<S['StudentCenterResponse'], { action: K }>['result'];
let csrf: string | undefined;
export async function studentCenter<K extends Action>(
  action: K,
  payload: Payload<K>,
  signal?: AbortSignal,
): Promise<Result<K>> {
  if (!csrf && !['auth.session', 'auth.login'].includes(action))
    await studentCenter('auth.session', {}, signal);
  const response = await siteRequest<{
    action: K;
    result: Result<K>;
    error?: { code: string; message: string; details?: { field: string; reason: string }[] };
  }>(
    '/actions',
    { method: 'POST', body: { action, payload }, headers: csrf ? { 'x-student-csrf': csrf } : {} },
    signal,
  );
  const next = response.headers['x-student-csrf'];
  if (typeof next === 'string') csrf = next;
  if (response.status >= 400) {
    if (response.status === 401) {
      csrf = undefined;
      window.dispatchEvent(new Event('student-center.session-expired'));
    }
    const error = response.body.error;
    throw new Error(
      (error?.message ?? '站点操作失败。') +
        (error?.details?.length
          ? '\n' + error.details.map((d) => d.field + '：' + d.reason).join('\n')
          : ''),
    );
  }
  if (action === 'auth.logout') csrf = undefined;
  return response.body.result;
}
