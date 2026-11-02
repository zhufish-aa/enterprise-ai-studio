import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Api, type S } from './api.js';
import { PreviewFrame } from './studio-page.js';
import { Button, ErrorBanner, Loading } from './components.js';
import './sharing.css';
export function PublicSiteEntry({ shareId, fallback }: { shareId: string; fallback: ReactNode }) {
  const [site, setSite] = useState<S['SharedSite'] | null>(null),
    [privateSite, setPrivate] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    api = useMemo(() => new Api('', null), []);
  useEffect(() => {
    const a = new AbortController();
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch('/v1/public/site-shares/' + shareId, {
          credentials: 'omit',
          cache: 'no-store',
          signal: a.signal,
        });
        if (response.status === 404) {
          setPrivate(true);
          setSite(null);
          return;
        }
        if (!response.ok) throw new Error('站点服务暂时不可用，请确认后台已启动。');
        const r = (await response.json()) as S['SharedSite'];
        if (!a.signal.aborted) {
          setSite((old) => (old?.revision === r.revision ? old : r));
          setPrivate(false);
          setError('');
          document.title = r.title;
        }
      } catch (e) {
        if (!a.signal.aborted) setError(e instanceof Error ? e.message : '站点加载失败。');
      } finally {
        running = false;
        if (!a.signal.aborted) setLoading(false);
      }
    };
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 10000);
    return () => {
      a.abort();
      clearInterval(t);
    };
  }, [shareId, retry]);
  // Platform dataset queries use the visitor's authenticated session and organization.
  // Public sites with their own backend/accounts remain available without a platform login.
  if (privateSite || (site && site.preview.manifest.queries.length > 0)) return fallback;
  return (
    <main className="shared-site shared-site-standalone">
      {loading ? (
        <Loading />
      ) : site ? (
        <PreviewFrame
          api={api}
          preview={site.preview}
          shareId={shareId}
          key={site.preview.buildId + ':' + site.revision}
        />
      ) : (
        <section className="shared-site-unavailable">
          <h1>站点暂时无法打开</h1>
          <ErrorBanner error={error} />
          <Button onClick={() => setRetry((n) => n + 1)}>重新加载</Button>
        </section>
      )}
    </main>
  );
}
