import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportView } from '@eas/report-ui';
import { PlatformClient, PlatformError, type S } from '@eas/platform-sdk';
import '@eas/report-ui/style.css';
import './style.css';
function App() {
  const params = new URLSearchParams(location.search),
    [token, setToken] = useState(''),
    [organization, setOrganization] = useState(params.get('organization') ?? ''),
    [appId, setApp] = useState(params.get('app') ?? ''),
    [version, setVersion] = useState(params.get('version') ?? ''),
    [client, setClient] = useState<PlatformClient | null>(null),
    [config, setConfig] = useState<S['ReportDefinition'] | null>(null),
    [error, setError] = useState('');
  const execute = useCallback(
    async (
      key: string,
      filters: S['Filter'][],
      range: S['QuerySpec']['timeRange'],
      signal: AbortSignal,
    ) => {
      if (!client) throw new Error('USER_SESSION_REQUIRED');
      let job = await client.request<S['QueryJob']>(
        '/apps/' + appId + '/preview/' + version + '/queries',
        {
          method: 'POST',
          body: { queryKey: key, filters, ...(range ? { timeRange: range } : {}) },
          signal,
        },
      );
      try {
        for (
          let i = 0;
          i < 120 && !['succeeded', 'failed', 'cancelled'].includes(job.status);
          i++
        ) {
          await new Promise((r) => setTimeout(r, 200));
          job = await client.request('/query-jobs/' + job.id, { signal });
        }
        if (job.status !== 'succeeded' || !job.result)
          throw new Error(job.failureCode ?? 'QUERY_FAILED');
        return job.result;
      } finally {
        if (signal.aborted)
          void client
            .request('/query-jobs/' + job.id + '/cancel', { method: 'POST' })
            .catch(() => {});
      }
    },
    [client, appId, version],
  );
  if (config) return <ReportView config={config} execute={execute} />;
  return (
    <main className="runtime-login">
      <p>ENTERPRISE AI STUDIO / TEST RUNTIME</p>
      <h1>打开授权报表</h1>
      <span>当前访问者的权限决定数据范围。正式生产运行尚未启用。</span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = new PlatformClient({
            apiUrl: location.origin,
            organizationId: organization,
            token: async () => token,
            allowLocalHttp: location.hostname === '127.0.0.1' || location.hostname === 'localhost',
          });
          void c
            .request<S['StudioVersion']>('/apps/' + appId + '/versions/' + version)
            .then((v) => {
              if (!v.manifest.report) throw new Error('REPORT_DEFINITION_REQUIRED');
              setClient(c);
              setConfig(v.manifest.report);
              setToken('');
            })
            .catch((e) => setError(e instanceof PlatformError ? e.code : 'REPORT_UNAVAILABLE'));
        }}
      >
        <label>
          组织 ID
          <input required value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </label>
        <label>
          应用 ID
          <input required value={appId} onChange={(e) => setApp(e.target.value)} />
        </label>
        <label>
          源码版本 ID
          <input required value={version} onChange={(e) => setVersion(e.target.value)} />
        </label>
        <label>
          当前用户 Token
          <input
            required
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
        <button>打开测试报表</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
const root = document.getElementById('root');
if (!root) throw new Error('ROOT_REQUIRED');
createRoot(root).render(<App />);
