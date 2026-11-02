import { useEffect, useMemo, useState } from 'react';
import { Api, type S } from './api.js';
import { PreviewFrame } from './studio-page.js';
import { Button, ErrorBanner, Loading } from './components.js';
import { Icon } from './icons.js';
import './sharing.css';
export function SharedSitePage({
  token,
  csrfToken,
  me,
  shareId,
  onLogout,
}: {
  token: string;
  csrfToken?: string;
  me: S['CurrentUser'];
  shareId: string;
  onLogout: () => void;
}) {
  const api = useMemo(
      () => new Api(token, me.organizationId, csrfToken),
      [token, me.organizationId, csrfToken],
    ),
    [site, setSite] = useState<S['SharedSite'] | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const value = await api.request<S['SharedSite']>('/site-shares/' + shareId, {
          signal: abort.signal,
        });
        setSite((old) => (old?.revision === value.revision ? old : value));
        setError('');
      } catch (e) {
        if (!abort.signal.aborted) {
          setSite(null);
          setError(e instanceof Error ? e.message : '此站点暂不可访问。');
        }
      } finally {
        running = false;
        if (!abort.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => {
        if (document.visibilityState === 'visible') void load();
      }, 10000),
      focus = () => void load();
    window.addEventListener('focus', focus);
    return () => {
      abort.abort();
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [api, shareId, retry]);
  return (
    <main className="shared-site shared-site-standalone">
      {loading ? (
        <Loading />
      ) : site ? (
        <PreviewFrame
          key={site.preview.buildId + ':' + site.revision}
          api={api}
          preview={site.preview}
          shareId={shareId}
        />
      ) : (
        <section className="shared-site-unavailable">
          <Icon name="lock" size={30} />
          <h1>暂时无法访问此站点</h1>
          <ErrorBanner error={error} />
          <Button onClick={() => setRetry((n) => n + 1)}>重新检查</Button>
          <Button onClick={onLogout}>切换账号</Button>
        </section>
      )}
    </main>
  );
}
