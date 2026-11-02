import { useEffect, useRef, useState } from 'react';
import { siteShareUrl } from '@eas/platform-sdk';
import { Api, type S } from './api.js';
import { Button, Dialog, ErrorBanner, Loading } from './components.js';
import { Icon } from './icons.js';
import './sharing.css';
export function SiteSharingDialog({
  api,
  app,
  versionId,
  onClose,
  onSaved,
}: {
  api: Api;
  app: S['StudioApp'];
  versionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<S['SiteSharing'] | null>(null),
    [visibility, setVisibility] = useState<'private' | 'organization' | 'public'>('private'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false),
    [manual, setManual] = useState(false),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    void api
      .request<S['SiteSharing']>('/apps/' + app.id + '/sharing', { signal: abort.signal })
      .then((v) => {
        setValue(v);
        setVisibility(v.visibility);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [api, app.id]);
  const target = value?.canManage
      ? versionId || value.appVersionId || value.suggestedVersionId
      : value?.appVersionId,
    dirty =
      !!value?.canManage && (visibility !== value.visibility || target !== value.appVersionId),
    url = value ? siteShareUrl(location.origin, value.sharePath) : null,
    local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
  async function save() {
    if (!value) throw new Error('分享设置尚未就绪。');
    if (!dirty && url) return value;
    if (!target) throw new Error('请先构建可预览的版本。');
    const next = await api.request<S['SiteSharing']>('/apps/' + app.id + '/sharing', {
      method: 'POST',
      body: { visibility, appVersionId: target, expectedRevision: value.revision },
    });
    setValue(next);
    onSaved();
    return next;
  }
  async function copy() {
    setBusy(true);
    setError('');
    setManual(false);
    try {
      const next = await save(),
        href = siteShareUrl(location.origin, next.sharePath);
      if (!href) throw new Error('请先构建站点。');
      try {
        await navigator.clipboard.writeText(href);
        setCopied(true);
      } catch {
        if (input.current) {
          input.current.value = href;
          input.current.focus();
          input.current.select();
          setManual(true);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '无法创建分享链接。');
    } finally {
      setBusy(false);
    }
  }
  async function done() {
    setBusy(true);
    setError('');
    try {
      if (value?.canManage && dirty) await save();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={'分享 ' + app.name}
      subtitle="链接固定到已构建的 TEST 版本。"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="dialog-body site-sharing-body">
        {error && <ErrorBanner error={error} />}
        {!value ? (
          <Loading />
        ) : (
          <>
            <div className="share-access-heading">
              <strong>链接访问</strong>
              <span>{visibility === 'public' ? '无需平台登录' : '需登录平台'}</span>
            </div>
            <label className="share-access-select">
              <Icon name="lock" size={16} />
              <select
                aria-label="链接访问范围"
                value={visibility}
                disabled={!value.canManage || busy}
                onChange={(e) => {
                  setVisibility(e.target.value as 'private' | 'organization' | 'public');
                  setCopied(false);
                }}
              >
                <option value="private">私有</option>
                <option value="organization">组织内公开</option>
                <option value="public">对外公开</option>
              </select>
            </label>
            <p className="share-access-description">
              {visibility === 'private'
                ? '仅已有站点权限的成员可访问。'
                : visibility === 'public'
                  ? '任何持有链接的人都可打开，无需平台账号。'
                  : '同一组织中持有链接并登录的成员可访问。'}
            </p>
            <input
              className="share-link-value"
              aria-label="站点分享链接"
              readOnly
              ref={input}
              value={url ?? ''}
              placeholder={target ? '保存后生成站点链接' : '请先构建可预览版本'}
            />
            <p className="token-muted">源码更新不会自动替换此链接的版本。</p>
            <div className="share-permissions-note">
              <Icon name="shield" size={16} />
              <p>页面访问与数据权限分开；站内账号和数据仍由站点校验。</p>
            </div>
            {!value.canManage && (
              <p className="token-muted">只有站点维护者通过交互式身份登录后可修改访问范围。</p>
            )}
            {!target && <p className="token-muted">请先构建一个可预览的版本。</p>}
            {local && (
              <p className="token-muted">
                当前地址仅本机可访问。分享给同事前，请使用可达的企业内网门户地址。
              </p>
            )}
            {manual && (
              <p className="token-muted" role="status">
                链接已选中，请按 Ctrl+C 复制。
              </p>
            )}
          </>
        )}
      </div>
      <footer className="dialog-footer site-sharing-footer">
        <a
          href={!dirty && url ? url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={dirty || !url}
          onClick={(e) => {
            if (dirty || !url) e.preventDefault();
          }}
        >
          ↗ 访问站点
        </a>
        <Button
          onClick={() => void copy()}
          disabled={busy || !target || (!url && !value?.canManage)}
        >
          {copied ? '链接已复制' : dirty ? '保存并复制' : '复制链接'}
        </Button>
        <Button
          variant="primary"
          disabled={busy || (dirty && !value?.canManage)}
          onClick={() => void done()}
        >
          {busy ? '正在保存…' : '完成'}
        </Button>
      </footer>
    </Dialog>
  );
}
