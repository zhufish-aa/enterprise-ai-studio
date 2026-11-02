import {
  PlatformError,
  PreviewQueryQueue,
  failureInfo,
  formatFailure,
  type FailureInfo,
} from '@eas/platform-sdk';
import { UploadDialog } from './upload-dialog.js';
import { ShareDialog, ShareIcon } from './share-dialog.js';
import { shareZh, shareEn } from './share-locales.js';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client';
import type {
  SitesRpc,
  SitesSettings,
  SitesConfiguration,
  SitesCatalog,
  DatasetSelection,
  NativeSharing,
  Entities as S,
} from '../sites-contract.js';
import { styles } from './styles.js';

const NS = 'enterprise.sites';
const zh = {
  ...shareZh,
  copyError: '复制错误信息',
  serverSource: '服务器源码',
  newSitePrompt:
    '先加载 enterprise-sites Skill，通过插件直接在服务器创建和编辑一个新站点的源码，无需本地工作区或上传。先问我想做什么网站，以及它需要解决什么业务问题。需要数据时，让我选择已授权的 TEST 数据集。',
  continueSite: '继续开发',
  connectTitle: '连接企业平台，开始创建站点',
  connectHint: '配置后台服务器地址，即可在这里管理站点和版本，并在会话中使用授权的测试数据。',
  hostHint: '插件服务尚未连接，请重启 Harness 后重试。',
  backendHint: '暂时无法连接后台服务器，请检查服务状态和地址。',
  identityHint: '登录身份已失效，请在服务器设置中更新访问 Token。',
  requestHint: '请求未完成，请重试或检查当前身份的权限。',
  technical: '技术信息',
  panel: '站点',
  title: '站点',
  subtitle: '让业务想法，成为可以使用的网站。',
  settings: '服务器设置',
  newSite: '新建站点',
  search: '搜索站点',
  all: '全部站点',
  site: '业务网站',
  report: '数据报表',
  refresh: '刷新',
  empty: '从第一个想法开始',
  emptyHint: '创建站点，再让 Harness 帮你编写和迭代代码。',
  none: '没有找到匹配的站点',
  connect: '连接服务器',
  setupTitle: '连接你的企业平台',
  setupHint: '填写后台服务器地址。站点、版本和测试数据将由该平台统一管理。',
  api: '后台服务器地址',
  portal: 'Web 门户地址',
  org: '组织 ID',
  token: '访问 Token',
  tokenHint: '留空保留现有身份；更换服务器或组织时需要重新填写。',
  save: '保存并连接',
  cancel: '取消',
  local: '允许本机 HTTP（仅 localhost / 127.0.0.1）',
  configured: '已配置',
  notConnected: '尚未连接',
  connected: '已连接',
  name: '站点名称',
  description: '描述',
  type: '类型',
  dataset: '数据集',
  optional: '暂不绑定',
  create: '创建站点',
  back: '所有站点',
  versions: '版本记录',
  preview: '测试预览',
  build: '构建此版本',
  restore: '恢复为新草稿',
  noVersions: '等待第一次源码提交',
  noVersionsHint: '让 Harness 直接编辑此应用的服务器文件，再提交源码版本并构建预览。',
  copy: '复制开发指令',
  copied: '已复制',
  version: '版本',
  draft: '草稿',
  testOnly: '仅测试预览',
  release: '上线申请与审批',
  retry: '重试',
  building: '构建中',
  buildFailed: '构建失败',
  view: '查看预览',
  loading: '正在加载…',
  chooseDataset: '选择数据源',
  datasetHint: '仅展示当前身份获授权的 TEST 数据集。',
  datasetSearch: '搜索数据源或数据集',
  clear: '不绑定数据集',
  noDataset: '当前没有可用的测试数据集',
  workspace: '会话默认文件夹',
  server: '后台服务',
  openSettings: '配置平台服务器',
  close: '关闭',
  list: '列表视图',
  grid: '网格视图',
  details: '查看版本和预览',
  select: '选择',
  error: '操作未完成',
  saveHint: 'Token 在本机加密保存，不会传入 AI 上下文。',
  connectedHint: '权限由平台实时校验',
  schema: '数据集结构',
  closeSchema: '收起结构',
};
type Key = keyof typeof zh;
const en: Record<Key, string> = {
  ...zh,
  ...shareEn,
  copyError: 'Copy error details',
  serverSource: 'Server files',
  newSitePrompt:
    'Load the enterprise-sites skill first. Create and edit a new site using server workspace tools, without a local project or upload. Start by asking me what it should be about and which business problem it should solve. If data is needed, ask me to choose an authorized TEST dataset.',
  continueSite: 'Continue in chat',
  connectTitle: 'Connect your platform. Start building.',
  connectHint:
    'Set up your backend server to manage sites and versions, and use authorized test datasets in your conversations.',
  hostHint: 'The plugin service is not connected. Restart Harness and retry.',
  backendHint: 'The backend is unavailable. Check its address and service status.',
  identityHint: 'Your sign-in has expired. Update the access token in Server settings.',
  requestHint: 'The request could not be completed. Retry or check your current permissions.',
  technical: 'Technical details',
  panel: 'Sites',
  title: 'Sites',
  subtitle: 'Turn business ideas into useful websites.',
  settings: 'Server settings',
  newSite: 'Create site',
  search: 'Search sites',
  all: 'All sites',
  site: 'Business sites',
  report: 'Reports',
  refresh: 'Refresh',
  empty: 'Start with an idea',
  emptyHint: 'Create a site, then let Harness write and iterate on its code.',
  none: 'No matching sites',
  connect: 'Connect server',
  setupTitle: 'Connect your enterprise platform',
  setupHint: 'Configure your backend server to manage sites, versions and test datasets.',
  api: 'Backend server URL',
  portal: 'Web portal URL',
  org: 'Organization ID',
  token: 'Access token',
  tokenHint:
    'Leave blank to keep the current identity. A new server or organization needs a new token.',
  save: 'Save and connect',
  cancel: 'Cancel',
  local: 'Allow local HTTP (localhost / 127.0.0.1 only)',
  configured: 'Configured',
  notConnected: 'Not connected',
  connected: 'Connected',
  name: 'Site name',
  description: 'Description',
  type: 'Type',
  dataset: 'Dataset',
  optional: 'No dataset yet',
  create: 'Create site',
  back: 'All sites',
  versions: 'Versions',
  preview: 'Test preview',
  build: 'Build version',
  restore: 'Restore as new draft',
  noVersions: 'Waiting for the first source upload',
  noVersionsHint:
    'Ask Harness to edit this application’s server files, commit a source version, and build a preview.',
  copy: 'Copy development prompt',
  copied: 'Copied',
  version: 'Version',
  draft: 'Draft',
  testOnly: 'Test preview only',
  release: 'Production release requests are not enabled yet',
  retry: 'Retry',
  building: 'Building',
  buildFailed: 'Build failed',
  view: 'Open preview',
  loading: 'Loading…',
  chooseDataset: 'Choose data source',
  datasetHint: 'Only authorized TEST datasets are shown.',
  datasetSearch: 'Search data sources or datasets',
  clear: 'No dataset binding',
  noDataset: 'No authorized test datasets',
  workspace: 'Default chat folder',
  server: 'Backend server',
  openSettings: 'Configure platform server',
  close: 'Close',
  list: 'List view',
  grid: 'Grid view',
  details: 'Versions and preview',
  select: 'Select',
  error: 'Unable to complete the request',
  saveHint: 'The token is encrypted locally and never enters AI context.',
  connectedHint: 'Permissions are checked by the platform',
  schema: 'Dataset schema',
  closeSchema: 'Hide schema',
};
type T = (key: Key) => string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'enterprise.sites': Key;
  }
}
// The published carrier exports its handle without a Context merge in this release.
declare module '@deepseek-ai/cordis' {
  interface Context {
    connection: ConnectionHandle;
  }
}
const PANEL = 'enterprise-sites' as MainPanelId;
export const inject = ['slots', 'locale', 'connection', 'layout', 'uiWorkspace', 'workspaces'];
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'enterprise-sites: locale');
  const translate = ctx.locale.bind(NS),
    t: T = (key) => translate(key);
  const rpc: SitesRpc = {
    async call<R>(action: string, input: object = {}, signal?: AbortSignal) {
      try {
        const result = await ctx.connection.rpc.call(
          '/api',
          'enterprise-sites/' + action,
          input,
          signal ?? AbortSignal.timeout(60000),
        );
        if (!result.ok) {
          const info = (result.error.details as { diagnostic?: FailureInfo } | undefined)
            ?.diagnostic;
          throw new PlatformError(
            result.error.code,
            info?.status ?? 0,
            info ?? failureInfo(result.error.code, { operation: action }),
          );
        }
        return result.value as R;
      } catch (error) {
        if (error instanceof PlatformError) throw error;
        const code = signal?.aborted ? 'REQUEST_CANCELLED' : 'HARNESS_CONNECTION_UNAVAILABLE';
        throw new PlatformError(code, 0, failureInfo(code, { operation: action }));
      }
    },
  };
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      { name: 'sidebar.panellist', id: PANEL, order: 5, locale: NS, label: () => t('panel') },
      ({ size }) => <Icon kind="sites" size={size} />,
    ),
  );
  const startSite = async (root: string, prompt: string) => {
    const workspace = await ctx.workspaces.create({ path: root });
    ctx.uiWorkspace.startSession(workspace.workspaceId, { prompt, clearPreviousDraft: false });
  };
  ctx.slots.inject('main', () =>
    ctx.slots.register(
      { name: 'main', key: PANEL, locale: NS, inject: () => ({ rpc, t, startSite }) },
      SitesPage,
    ),
  );
  for (const seat of ['conversation.hero.options', 'conversation.session.header.actions'] as const)
    ctx.slots.inject(seat, () =>
      ctx.slots.register(
        {
          name: seat,
          id: 'enterprise-dataset',
          order: -5,
          locale: NS,
          inject: (sessionId) => ({
            rpc,
            t,
            sessionId,
            openSettings: () => ctx.layout.selectPanel(PANEL),
          }),
        },
        DatasetPicker,
      ),
    );
}

function Icon({ kind = 'sites', size = 18 }: { kind?: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    sites: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1.8" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 5 7 7-7 7" />,
    back: <path d="m15 5-7 7 7 7" />,
    chevron: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 5 5L20 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m10 3-1 3-3 1-3-1-1 4 2 2v3l-1 2 3 3 3-1 3 1 1 2 4-1 1-3 3-1 1-4-2-2V8l-2-3-3 1-2-2z" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3" />
      </>
    ),
    report: (
      <>
        <path d="M4 20h17M6 16v-4M12 16V5M18 16V9" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" />
      </>
    ),
    server: (
      <>
        <rect x="3" y="3" width="18" height="7" rx="2" />
        <rect x="3" y="14" width="18" height="7" rx="2" />
        <path d="M7 6h.01M7 17h.01M16 6h2M16 17h2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind] ?? paths['sites']}
    </svg>
  );
}
const failure = (e: unknown) =>
  e instanceof PlatformError
    ? e.message
    : formatFailure(
        failureInfo(
          e instanceof Error && /^[A-Z_]{1,80}$/.test(e.message)
            ? e.message
            : 'ENTERPRISE_REQUEST_FAILED',
        ),
      );
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
function Css() {
  return <style>{styles}</style>;
}
function ErrorNotice({ message, t }: { message: string; t: T }) {
  const [copied, setCopied] = useState(false);
  if (!message) return null;
  const text = /^[A-Z_]{1,80}$/.test(message) ? formatFailure(failureInfo(message)) : message;
  return (
    <div className="es-error es-error-detail" role="alert">
      <strong>{t('error')}</strong>
      <p>{text}</p>
      <button
        type="button"
        onClick={() =>
          void navigator.clipboard
            .writeText(text)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      >
        {copied ? t('copied') : t('copyError')}
      </button>
    </div>
  );
}

function SettingsForm({
  rpc,
  initial,
  t,
  onSaved,
  onCancel,
}: {
  rpc: SitesRpc;
  initial: SitesSettings;
  t: T;
  onSaved: (s: SitesSettings) => void;
  onCancel?: (() => void) | undefined;
}) {
  const [form, setForm] = useState<SitesConfiguration>({
      apiUrl: initial.apiUrl,
      portalUrl: initial.portalUrl,
      organizationId: initial.organizationId,
      workspaceRoot: initial.workspaceRoot,
      allowLocalHttp: initial.allowLocalHttp,
    }),
    [token, setToken] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const set = (key: 'apiUrl' | 'portalUrl' | 'workspaceRoot', value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { organizationId: _organizationId, ...connection } = form;
      const result = await rpc.call<SitesSettings>('configure', {
        ...connection,
        ...(token ? { token } : {}),
      });
      setToken('');
      await rpc.call('connect');
      onSaved(result);
    } catch (e) {
      setToken('');
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="es-settings" onSubmit={(e) => void save(e)}>
      <div className="es-setup-icon">
        <Icon kind="server" size={27} />
      </div>
      <h2>{t('setupTitle')}</h2>
      <p className="es-subtle">{t('setupHint')}</p>
      <ErrorNotice t={t} message={error} />
      <label>
        {t('api')}
        <input
          required
          type="url"
          placeholder="https://10.10.20.15:3000"
          value={form.apiUrl}
          onChange={(e) => set('apiUrl', e.target.value)}
        />
      </label>
      <label>
        {t('portal')}
        <input
          required
          type="url"
          placeholder="https://studio.company.internal"
          value={form.portalUrl}
          onChange={(e) => set('portalUrl', e.target.value)}
        />
      </label>
      <label>
        {t('workspace')}
        <input
          required
          value={form.workspaceRoot}
          onChange={(e) => set('workspaceRoot', e.target.value)}
        />
      </label>
      <label>
        {t('token')}
        <input
          type="password"
          autoComplete="new-password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={initial.hasToken ? '••••••••' : ''}
        />
        <small>{t('tokenHint')}</small>
      </label>
      <label className="es-checkbox">
        <input
          type="checkbox"
          checked={form.allowLocalHttp}
          onChange={(e) => setForm((f) => ({ ...f, allowLocalHttp: e.target.checked }))}
        />
        {t('local')}
      </label>
      <div className="es-settings-note">
        <Icon kind="check" size={15} />
        {t('saveHint')}
      </div>
      <div className="es-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel}>
            {t('cancel')}
          </button>
        )}
        <button className="es-primary" disabled={busy}>
          {busy ? t('loading') : t('save')}
        </button>
      </div>
    </form>
  );
}

export function SitesPage({
  rpc,
  t,
  startSite,
}: {
  rpc: SitesRpc;
  t: T;
  startSite: (root: string, prompt: string) => Promise<void>;
}) {
  const [settings, setSettings] = useState<SitesSettings | null>(null),
    [editingSettings, setEditingSettings] = useState(false),
    [apps, setApps] = useState<S['StudioApp'][]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [grid, setGrid] = useState(false),
    [selected, setSelected] = useState<S['StudioApp'] | null>(null),
    [connected, setConnected] = useState(false),
    [starting, setStarting] = useState(false),
    [sharingTarget, setSharingTarget] = useState<{
      app: S['StudioApp'];
      versionId: string | undefined;
    } | null>(null);
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const s = await rpc.call<SitesSettings>('settings', {}, signal);
        setSettings(s);
        if (s.configured && s.hasToken) {
          const list = await rpc.call<S['StudioAppPage']>('apps', {}, signal);
          setApps(list.items);
          setConnected(true);
        } else {
          setConnected(false);
          setEditingSettings(true);
        }
      } catch (e) {
        if (!signal?.aborted) {
          setConnected(false);
          setError(failure(e));
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [rpc],
  );
  useEffect(() => {
    const a = new AbortController();
    void reload(a.signal);
    return () => a.abort();
  }, [reload]);
  const begin = async (prompt = t('newSitePrompt')) => {
    if (!settings) return;
    setStarting(true);
    setError('');
    try {
      await startSite(settings.workspaceRoot, prompt);
    } catch (e) {
      setError(failure(e));
    } finally {
      setStarting(false);
    }
  };
  const filtered = apps.filter(
    (a) =>
      (filter === 'all' || a.type === filter) &&
      [a.name, a.description].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const counts = {
    all: apps.length,
    REPORT: apps.filter((a) => a.type === 'REPORT').length,
    SITE: apps.filter((a) => a.type === 'SITE').length,
  };
  const setup = () => (settings ? setEditingSettings(true) : void reload());
  return (
    <div className="es-sites">
      <Css />
      <div className="es-container">
        <header className="es-header">
          <div>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className="es-header-actions">
            {connected && (
              <span className="es-connection is-connected" title={settings?.apiUrl}>
                <i />
                {t('connected')}
              </span>
            )}
            <button className="es-icon-button" aria-label={t('settings')} onClick={setup}>
              <Icon kind="settings" />
            </button>
            {connected && !editingSettings && (
              <button className="es-primary" onClick={() => void begin()} disabled={starting}>
                <Icon kind="plus" size={16} />
                {starting ? t('loading') : t('newSite')}
              </button>
            )}
          </div>
        </header>
        {editingSettings && settings ? (
          <div className="es-setup-layout">
            <aside>
              <span className="es-eyebrow">ENTERPRISE SITES</span>
              <h2>{t('connectTitle')}</h2>
              <p>{t('connectHint')}</p>
              <div className="es-setup-benefits">
                <span>
                  <Icon kind="sites" size={18} />
                  {t('site')} · {t('versions')}
                </span>
                <span>
                  <Icon kind="database" size={18} />
                  {t('dataset')} · TEST
                </span>
                <span>
                  <Icon kind="check" size={18} />
                  {t('preview')}
                </span>
              </div>
            </aside>
            <SettingsForm
              rpc={rpc}
              initial={settings}
              t={t}
              onSaved={(s) => {
                setSettings(s);
                setEditingSettings(false);
                setSelected(null);
                void reload();
              }}
              onCancel={connected ? () => setEditingSettings(false) : undefined}
            />
          </div>
        ) : loading && !settings ? (
          <div className="es-skeleton" aria-label={t('loading')}>
            {[1, 2, 3].map((n) => (
              <div key={n} />
            ))}
          </div>
        ) : !connected ? (
          <section className="es-connect-gate">
            <div className="es-gate-art">
              <Icon kind="server" size={35} />
              <span>
                <Icon kind="sites" size={20} />
              </span>
            </div>
            <span className="es-eyebrow">ENTERPRISE SITES</span>
            <h2>{t('connectTitle')}</h2>
            <p>{t('connectHint')}</p>
            <div className="es-gate-actions">
              <button className="es-primary" onClick={setup}>
                <Icon kind="settings" size={15} />
                {settings ? t('connect') : t('retry')}
              </button>
              {settings && (
                <button onClick={() => void reload()}>
                  <Icon kind="refresh" size={15} />
                  {t('retry')}
                </button>
              )}
            </div>
            <ErrorNotice t={t} message={error} />
          </section>
        ) : selected ? (
          <SiteDetail
            portalUrl={settings?.portalUrl ?? ''}
            rpc={rpc}
            app={selected}
            t={t}
            workspaceRoot={settings?.workspaceRoot ?? ''}
            onBack={() => setSelected(null)}
            onContinue={begin}
            onShare={(v) => setSharingTarget({ app: selected, versionId: v || undefined })}
          />
        ) : (
          <>
            <div className="es-toolbar">
              <nav className="es-tabs" aria-label={t('type')}>
                {(['all', 'SITE', 'REPORT'] as const).map((key) => (
                  <button
                    key={key}
                    aria-current={filter === key ? 'page' : undefined}
                    onClick={() => setFilter(key)}
                  >
                    {t(key === 'all' ? 'all' : key === 'SITE' ? 'site' : 'report')}
                    <span>{counts[key]}</span>
                  </button>
                ))}
              </nav>
              <div className="es-list-tools">
                <label className="es-search">
                  <Icon kind="search" size={16} />
                  <input
                    aria-label={t('search')}
                    placeholder={t('search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="es-view-toggle">
                  <button
                    aria-label={t('list')}
                    aria-pressed={!grid}
                    onClick={() => setGrid(false)}
                  >
                    <Icon kind="list" size={16} />
                  </button>
                  <button aria-label={t('grid')} aria-pressed={grid} onClick={() => setGrid(true)}>
                    <Icon size={15} />
                  </button>
                </div>
                <button
                  className="es-icon-button"
                  aria-label={t('refresh')}
                  onClick={() => void reload()}
                >
                  <Icon kind="refresh" size={16} />
                </button>
              </div>
            </div>
            <ErrorNotice message={error} t={t} />
            {loading ? (
              <div className="es-skeleton" aria-label={t('loading')}>
                {[1, 2, 3].map((n) => (
                  <div key={n} />
                ))}
              </div>
            ) : filtered.length ? (
              <div className={grid ? 'es-app-grid' : 'es-app-list'}>
                {filtered.map((a) => (
                  <div className="es-app-row" key={a.id}>
                    <button className="es-app" onClick={() => setSelected(a)}>
                      <div className={'es-thumbnail ' + (a.type === 'REPORT' ? 'is-report' : '')}>
                        <Icon
                          kind={a.type === 'REPORT' ? 'report' : 'sites'}
                          size={grid ? 30 : 22}
                        />
                      </div>
                      <div className="es-app-info">
                        <strong>{a.name}</strong>
                        <p>{a.description || t(a.type === 'REPORT' ? 'report' : 'site')}</p>
                        <span>
                          {date(a.createdAt)}
                          <b>·</b>
                          {t('draft')}
                        </span>
                      </div>
                      <div className="es-app-meta">
                        <span className="es-badge">
                          {t(a.type === 'REPORT' ? 'report' : 'site')}
                        </span>
                        <span className="es-app-sharing">
                          <ShareIcon
                            kind={a.sharingVisibility !== 'private' ? 'globe' : 'lock'}
                            size={12}
                          />
                          {t(
                            a.sharingVisibility === 'public'
                              ? 'sharePublic'
                              : a.sharingVisibility === 'organization'
                                ? 'shareOrganization'
                                : 'sharePrivate',
                          )}
                        </span>
                        <Icon kind="arrow" size={14} />
                      </div>
                    </button>
                    <button
                      className="es-row-share es-icon-button"
                      aria-label={t('share') + ' ' + a.name}
                      onClick={() => setSharingTarget({ app: a, versionId: undefined })}
                    >
                      <ShareIcon />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="es-empty">
                <div className="es-empty-art">
                  <Icon size={30} />
                </div>
                <h2>{search ? t('none') : t('empty')}</h2>
                <p>{search ? t('search') : t('emptyHint')}</p>
                {!search && (
                  <button className="es-primary" onClick={() => void begin()} disabled={starting}>
                    <Icon kind="plus" size={16} />
                    {t('newSite')}
                  </button>
                )}
              </div>
            )}
            <footer className="es-footer">
              <span>
                <Icon kind="database" size={14} />
                {t('connectedHint')}
              </span>
              <span>{t('testOnly')}</span>
            </footer>
          </>
        )}
        {sharingTarget && (
          <ShareDialog
            rpc={rpc}
            appId={sharingTarget.app.id}
            title={sharingTarget.app.name}
            versionId={sharingTarget.versionId}
            t={t}
            onClose={() => setSharingTarget(null)}
            onSaved={(value) => {
              setApps((items) =>
                items.map((app) =>
                  app.id === value.appId ? { ...app, sharingVisibility: value.visibility } : app,
                ),
              );
              setSelected((app) =>
                app?.id === value.appId ? { ...app, sharingVisibility: value.visibility } : app,
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

function SiteDetail({
  portalUrl,
  rpc,
  app,
  t,
  workspaceRoot,
  onBack,
  onContinue,
  onShare,
}: {
  portalUrl: string;
  rpc: SitesRpc;
  app: S['StudioApp'];
  t: T;
  workspaceRoot: string;
  onBack: () => void;
  onContinue: (prompt: string) => Promise<void>;
  onShare: (versionId: string) => void;
}) {
  const [versions, setVersions] = useState<S['StudioVersion'][]>([]),
    [version, setVersion] = useState(''),
    [preview, setPreview] = useState<S['StudioPreview'] | null>(null),
    [build, setBuild] = useState<S['StudioBuild'] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false),
    [uploading, setUploading] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const r = await rpc.call<S['StudioVersionPage']>('versions', { appId: app.id }, signal);
      setVersions(r.items);
      setVersion((id) => (r.items.some((v) => v.id === id) ? id : (r.items[0]?.id ?? '')));
    },
    [app.id, rpc],
  );
  useEffect(() => {
    const abort = new AbortController();
    void load(abort.signal).catch((e) => {
      if (!abort.signal.aborted) setError(failure(e));
    });
    return () => abort.abort();
  }, [load]);
  useEffect(() => {
    setPreview(null);
    setBuild(null);
    setError('');
  }, [version]);
  const current = versions.find((v) => v.id === version);
  async function showPreview() {
    setBusy(true);
    setError('');
    try {
      setPreview(await rpc.call('preview', { appId: app.id, versionId: version }));
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  const abortBuild = useRef<AbortController | null>(null);
  useEffect(() => () => abortBuild.current?.abort(), []);
  async function startBuild() {
    setBusy(true);
    setError('');
    abortBuild.current?.abort();
    const abort = new AbortController();
    abortBuild.current = abort;
    try {
      let b = await rpc.call<S['StudioBuild']>('build', { versionId: version }, abort.signal);
      setBuild(b);
      for (let i = 0; i < 180 && ['queued', 'running'].includes(b.status); i++) {
        await new Promise((r) => setTimeout(r, 500));
        abort.signal.throwIfAborted();
        b = await rpc.call('buildStatus', { buildId: b.id }, abort.signal);
        setBuild(b);
      }
      if (b.status === 'succeeded')
        setPreview(await rpc.call('preview', { appId: app.id, versionId: version }, abort.signal));
      else setError(b.failureCode ?? 'BUILD_NOT_READY');
    } catch (e) {
      if (!abort.signal.aborted) setError(failure(e));
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    try {
      const restored = await rpc.call<S['StudioVersion']>('restore', {
        appId: app.id,
        versionId: version,
      });
      await load();
      setVersion(restored.id);
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    const text = `先加载 enterprise-sites Skill。继续维护 Enterprise AI Studio 应用 ${app.id}（${app.name}），直接编辑该应用的服务器工作区文件。先调用 enterprise_dataset_selected 和 enterprise_dataset_schema 确认 TEST 数据权限与口径；使用 enterprise_workspace_list/read/write/edit 编写服务器 React + TypeScript 源码及 studio.manifest.json。通过 @eas/platform-sdk/runtime 的 query 绑定真实测试数据；调用 enterprise_workspace_commit 提交服务器草稿为新版本，再调用 enterprise_build、enterprise_deployment_status、enterprise_preview。当前应用版本 ${version || '尚未上传'}。不要以静态样本替代最终查询结果。`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }
  return (
    <section className="es-detail">
      <button className="es-back" onClick={onBack}>
        <Icon kind="back" size={15} />
        {t('back')}
      </button>
      <header className="es-detail-heading">
        <div className="es-thumbnail">
          <Icon kind={app.type === 'REPORT' ? 'report' : 'sites'} size={25} />
        </div>
        <div>
          <h2>{app.name}</h2>
          <p className="es-subtle">{app.description}</p>
        </div>
        <button
          onClick={() =>
            window.open(
              new URL('/?app=' + app.id + '&tab=source', portalUrl).href,
              '_blank',
              'noopener,noreferrer',
            )
          }
        >
          {t('serverSource')}
        </button>
        <button onClick={() => setUploading(true)}>导入本地项目</button>
        <button onClick={() => onShare(version)}>
          <ShareIcon size={15} />
          {t('share')}
        </button>
        <button
          className="es-primary"
          onClick={() =>
            void onContinue(
              '先加载 enterprise-sites Skill。继续维护企业应用 ' +
                app.id +
                '（' +
                app.name +
                '）。使用原应用的服务器工作区，不创建无关应用。先检查当前会话选中的 TEST 数据集及语义口径，再根据我的需求直接修改服务器文件并提交新版本。请先问我这次要修改什么。',
            ).catch((e) => setError(failure(e)))
          }
        >
          <Icon kind="plus" size={15} />
          {t('continueSite')}
        </button>
        <button
          aria-label={t('copy')}
          onClick={() => void copy().catch((e) => setError(failure(e)))}
        >
          <Icon kind={copied ? 'check' : 'plus'} size={15} />
          {copied ? t('copied') : t('copy')}
        </button>
      </header>
      <ErrorNotice message={error} t={t} />
      {!versions.length ? (
        <div className="es-empty">
          <Icon kind="sites" size={30} />
          <h2>{t('noVersions')}</h2>
          <p>{t('noVersionsHint')}</p>
          <code>{app.id}</code>
        </div>
      ) : (
        <>
          <div className="es-version-toolbar">
            <label>
              {t('version')}
              <select disabled={busy} value={version} onChange={(e) => setVersion(e.target.value)}>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} · {date(v.createdAt)}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy} onClick={() => void restore()}>
              {t('restore')}
            </button>
            <button disabled={busy} onClick={() => void startBuild()}>
              {busy ? t('building') : t('build')}
            </button>
            <button className="es-primary" disabled={busy} onClick={() => void showPreview()}>
              {t('view')}
            </button>
          </div>
          {build && (
            <div className="es-build-log">
              <span className="es-badge">{build.status}</span>
              {build.logs.map((line, i) => (
                <code key={i}>{line}</code>
              ))}
            </div>
          )}
          {preview ? (
            <Preview rpc={rpc} preview={preview} t={t} />
          ) : (
            <div className="es-preview-placeholder">
              <Icon kind="sites" size={30} />
              <p>{t('preview')}</p>
              <small>{current?.message}</small>
            </div>
          )}
          <details className="es-versions" open>
            <summary>
              {t('versions')} <span>{versions.length}</span>
            </summary>
            {versions.map((v) => (
              <button
                key={v.id}
                aria-current={v.id === version ? 'true' : undefined}
                onClick={() => setVersion(v.id)}
                disabled={busy}
              >
                <strong>v{v.version}</strong>
                <div>
                  <span>{v.message}</span>
                  <small>
                    {date(v.createdAt)} · {v.sourceDigest.slice(0, 12)}
                  </small>
                </div>
                <span className="es-subtle">{v.changes.length} files</span>
              </button>
            ))}
          </details>
        </>
      )}
      <footer className="es-footer">
        <span>{t('testOnly')}</span>
        <button
          onClick={() =>
            window.open(
              new URL(
                '/?section=releases&create=1&app=' +
                  app.id +
                  (version ? '&version=' + version : ''),
                portalUrl,
              ).href,
              '_blank',
              'noopener,noreferrer',
            )
          }
        >
          {t('release')}
        </button>
      </footer>
      {uploading && (
        <UploadDialog
          rpc={rpc}
          appId={app.id}
          root={workspaceRoot}
          onClose={() => setUploading(false)}
          onUploaded={(item) => {
            setVersions((items) => [item, ...items]);
            setVersion(item.id);
          }}
        />
      )}
    </section>
  );
}

function IndependentSitePreview({ rpc, appId, t }: { rpc: SitesRpc; appId: string; t: T }) {
  const [sharing, setSharing] = useState<NativeSharing | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const a = new AbortController();
    void rpc
      .call<NativeSharing>('sharing', { appId }, a.signal)
      .then(setSharing)
      .catch((e) => {
        if (!a.signal.aborted) setError(failure(e));
      });
    return () => a.abort();
  }, [rpc, appId]);
  return (
    <div
      style={{
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
        background: '#f8faff',
        border: '1px solid #e3eaf5',
        borderRadius: 10,
      }}
    >
      <ShareIcon kind="visit" size={28} />
      <strong>{t('independentTitle')}</strong>
      <p style={{ margin: 0, color: '#8897ae', fontSize: 12 }}>{t('independentHint')}</p>
      {sharing?.shareUrl ? (
        <a
          className="es-primary"
          style={{ padding: '9px 16px', borderRadius: 6, textDecoration: 'none' }}
          href={sharing.shareUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('independentOpen')} ↗
        </a>
      ) : (
        <span style={{ fontSize: 12, color: '#8897ae' }}>{error || t('independentMissing')}</span>
      )}
    </div>
  );
}

function Preview({ rpc, preview, t }: { rpc: SitesRpc; preview: S['StudioPreview']; t: T }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [errors, setErrors] = useState<Record<string, FailureInfo>>({});
  useEffect(() => {
    let disposed = false;
    const queue = new PreviewQueryQueue();
    setErrors({});
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== 'null' ||
        !event.data ||
        typeof event.data !== 'object'
      )
        return;
      const data = event.data as Record<string, unknown>,
        id = data['id'];
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return;
      if (data['type'] === 'studio.cancel') {
        queue.cancel(id);
        return;
      }
      if (data['type'] !== 'studio.query' || queue.has(id)) return;
      const reply = (body: object) => {
        if (!disposed)
          frame.current?.contentWindow?.postMessage({ type: 'studio.result', id, ...body }, '*');
      };
      const reject = (
        code: string,
        diagnostic = failureInfo(code, { operation: '查询 ' + String(data['queryKey']) }),
      ) => {
        if (!disposed && code !== 'QUERY_CANCELLED')
          setErrors((current) => ({ ...current, [String(data['queryKey'])]: diagnostic }));
        reply({ error: code, diagnostic });
      };
      if (
        !preview.manifest.queries.some((q) => q.key === data['queryKey']) ||
        Object.keys(data).some(
          (k) => !['type', 'id', 'queryKey', 'filters', 'timeRange'].includes(k),
        )
      ) {
        reject('INVALID_QUERY_BINDING');
        return;
      }
      if (
        !queue.enqueue(id, async (signal) => {
          if (!disposed)
            setErrors((current) => {
              const next = { ...current };
              delete next[String(data['queryKey'])];
              return next;
            });
          let jobId: string | undefined;
          try {
            signal.throwIfAborted();
            let job = await rpc.call<S['QueryJob']>('previewQuery', {
              appId: preview.appId,
              versionId: preview.versionId,
              query: {
                queryKey: data['queryKey'],
                filters: data['filters'],
                ...(data['timeRange'] ? { timeRange: data['timeRange'] } : {}),
              },
            });
            jobId = job.id;
            while (!['succeeded', 'failed', 'cancelled'].includes(job.status)) {
              await new Promise((resolve) => setTimeout(resolve, 250));
              signal.throwIfAborted();
              job = await rpc.call('queryStatus', { queryJobId: job.id }, signal);
            }
            signal.throwIfAborted();
            if (job.status === 'succeeded' && job.result) reply({ result: job.result });
            else
              reject(
                job.failureCode ?? 'QUERY_TIMEOUT',
                failureInfo(job.failureCode ?? 'QUERY_TIMEOUT', {
                  operation: '查询 ' + String(data['queryKey']),
                  traceId: job.traceId,
                }),
              );
          } catch (error) {
            if (error instanceof PlatformError) reject(error.code, error.diagnostic);
            else reject(signal.aborted ? 'QUERY_CANCELLED' : 'QUERY_FAILED');
          } finally {
            if (signal.aborted && jobId)
              void rpc.call('queryCancel', { queryJobId: jobId }).catch(() => {});
          }
        })
      )
        reject('PREVIEW_QUEUE_FULL');
    };
    const pending = setInterval(() => {
      for (const id of queue.pendingIds())
        frame.current?.contentWindow?.postMessage({ type: 'studio.pending', id }, '*');
    }, 5000);
    window.addEventListener('message', receive);
    return () => {
      disposed = true;
      clearInterval(pending);
      window.removeEventListener('message', receive);
      queue.close();
    };
  }, [rpc, preview]);
  if (preview.manifest.capabilities?.includes('student-center'))
    return <IndependentSitePreview rpc={rpc} appId={preview.appId} t={t} />;
  return (
    <div className="es-preview-runtime">
      <iframe
        className="es-preview-frame"
        title={t('preview')}
        ref={frame}
        name={
          'eas-runtime:' +
          JSON.stringify({
            environment: preview.environment,
            appId: preview.appId,
            versionId: preview.versionId,
          })
        }
        sandbox="allow-scripts allow-forms"
        referrerPolicy="no-referrer"
        srcDoc={preview.html}
      />
      {Object.keys(errors).length > 0 && (
        <aside className="es-preview-diagnostics">
          <ErrorNotice message={Object.values(errors).map(formatFailure).join('\n\n')} t={t} />
        </aside>
      )}
    </div>
  );
}

export function DatasetPicker({
  rpc,
  t,
  sessionId,
  openSettings,
}: {
  rpc: SitesRpc;
  t: T;
  sessionId: string;
  openSettings: () => void;
}) {
  const [open, setOpen] = useState(false),
    [catalog, setCatalog] = useState<SitesCatalog | null>(null),
    [selected, setSelected] = useState<DatasetSelection | null>(null),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    setSelected(null);
    setOpen(false);
    void rpc
      .call<DatasetSelection | null>('selection', { sessionId }, abort.signal)
      .then(setSelected)
      .catch(() => {});
    return () => abort.abort();
  }, [rpc, sessionId]);
  useEffect(() => {
    if (!open) return;
    const a = new AbortController();
    setLoading(true);
    setError('');
    void rpc
      .call<SitesCatalog>('catalog', {}, a.signal)
      .then(setCatalog)
      .catch((e) => {
        if (!a.signal.aborted) setError(failure(e));
      })
      .finally(() => {
        if (!a.signal.aborted) setLoading(false);
      });
    searchInput.current?.focus();
    const close = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      a.abort();
      document.removeEventListener('pointerdown', close);
    };
  }, [open, rpc]);
  async function choose(datasetId: string | null) {
    setBusy(true);
    setError('');
    try {
      setSelected(await rpc.call('select', { sessionId, datasetId }));
      setOpen(false);
      trigger.current?.focus();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  }
  const datasets =
    catalog?.datasets.filter((d) =>
      [d.name, d.description, catalog.sources.find((s) => s.id === d.logicalDataSourceId)?.name]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
    ) ?? [];
  return (
    <div
      className="es-picker"
      ref={container}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <Css />
      <button
        className={'es-picker-trigger ' + (selected ? 'has-selection' : '')}
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          selected
            ? `${selected.datasourceName} / ${selected.datasetName} · TEST`
            : t('chooseDataset')
        }
        onClick={() => setOpen((v) => !v)}
      >
        <Icon kind="database" size={15} />
        <span>{selected?.datasetName ?? t('chooseDataset')}</span>
        {selected && <small>TEST</small>}
        <Icon kind="chevron" size={11} />
      </button>
      {open && (
        <div className="es-picker-popover es-sites" role="dialog" aria-label={t('chooseDataset')}>
          <div className="es-picker-heading">
            <strong>{t('chooseDataset')}</strong>
            <span className="es-badge">TEST</span>
          </div>
          <label className="es-search">
            <Icon kind="search" size={15} />
            <input
              ref={searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('datasetSearch')}
              aria-label={t('datasetSearch')}
            />
          </label>
          <p className="es-picker-hint">{t('datasetHint')}</p>
          <ErrorNotice t={t} message={error} />
          <div className="es-picker-results">
            {loading ? (
              <p className="es-subtle">{t('loading')}</p>
            ) : datasets.length ? (
              datasets.map((d) => (
                <button
                  key={d.id}
                  disabled={busy}
                  aria-pressed={selected?.datasetId === d.id}
                  onClick={() => void choose(d.id)}
                >
                  <span className="es-dataset-icon">
                    <Icon kind="database" size={18} />
                  </span>
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {catalog?.sources.find((s) => s.id === d.logicalDataSourceId)?.name} ·{' '}
                      {d.description}
                    </small>
                  </span>
                  {selected?.datasetId === d.id && <Icon kind="check" size={16} />}
                </button>
              ))
            ) : (
              <p className="es-subtle">{t('noDataset')}</p>
            )}
          </div>
          <div className="es-picker-footer">
            <button disabled={busy} onClick={() => void choose(null)}>
              {t('clear')}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                openSettings();
              }}
            >
              <Icon kind="settings" size={13} />
              {t('settings')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
