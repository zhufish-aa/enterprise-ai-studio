import React, { useEffect, useRef, useState } from 'react';
import type { NativeSharing, SitesRpc } from '../sites-contract.js';
import type { ShareKey } from './share-locales.js';
type Props = {
  rpc: SitesRpc;
  appId: string;
  title: string;
  versionId?: string | undefined;
  t: (key: ShareKey) => string;
  onClose: () => void;
  onSaved: (value: NativeSharing) => void;
};
export function ShareIcon({
  kind = 'link',
  size = 17,
}: {
  kind?: 'link' | 'lock' | 'globe' | 'close' | 'visit' | 'check' | 'chevron';
  size?: number;
}) {
  const shape = {
    link: (
      <>
        <path d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M14 8l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    visit: <path d="M7 17 18 6M7 6h11v11" />,
    check: <path d="m5 12 5 5L20 7" />,
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape[kind]}
    </svg>
  );
}
export function ShareDialog({ rpc, appId, title, versionId, t, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    menu = useRef<HTMLDivElement>(null),
    link = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [current, setCurrent] = useState<NativeSharing | null>(null),
    [visibility, setVisibility] = useState<'private' | 'organization' | 'public'>('private'),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false),
    [manual, setManual] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    void rpc
      .call<NativeSharing>('sharing', { appId }, abort.signal)
      .then((value) => {
        setCurrent(value);
        setVisibility(value.visibility);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(t('shareError'));
      });
    return () => abort.abort();
  }, [rpc, appId, t]);
  useEffect(() => {
    if (!open) return;
    const listener = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [open]);
  const targetVersion = current?.canManage
      ? versionId || current.appVersionId || current.suggestedVersionId
      : current?.appVersionId,
    dirty =
      !!current?.canManage &&
      (visibility !== current.visibility || targetVersion !== current.appVersionId),
    canSave = !!current?.canManage && !!targetVersion;
  const isLocal =
    !!current?.shareUrl &&
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(current.shareUrl).hostname);
  async function save(): Promise<NativeSharing> {
    if (!current) throw new Error('SHARE_NOT_READY');
    if (!dirty && current.shareUrl) return current;
    if (!canSave) throw new Error('SHARE_NOT_READY');
    const value = await rpc.call<NativeSharing>('sharingSave', {
      appId,
      sharing: { visibility, appVersionId: targetVersion, expectedRevision: current.revision },
    });
    setCurrent(value);
    setVisibility(value.visibility);
    onSaved(value);
    return value;
  }
  const fail = (e: unknown) =>
    setError(
      e instanceof Error && e.message === 'REVISION_MISMATCH'
        ? t('shareChanged')
        : e instanceof Error && ['NOT_FOUND', 'SHARE_NOT_READY'].includes(e.message)
          ? t('shareMissing')
          : t('shareError'),
    );
  async function copy() {
    setBusy(true);
    setError('');
    setCopied(false);
    setManual(false);
    try {
      const value = await save();
      if (!value.shareUrl) throw new Error('SHARE_NOT_READY');
      try {
        if (!navigator.clipboard?.writeText) throw new Error();
        await navigator.clipboard.writeText(value.shareUrl);
        setCopied(true);
      } catch {
        const input = link.current;
        if (input) {
          input.value = value.shareUrl;
          input.focus();
          input.select();
          setManual(true);
        }
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  async function done() {
    setBusy(true);
    setError('');
    try {
      if (current?.canManage && dirty) await save();
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="es-sites es-share-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <header>
        <h2>
          {t('share')} <span>{title}</span>
        </h2>
        <button
          className="es-icon-button"
          type="button"
          onClick={onClose}
          aria-label={t('shareClose')}
          disabled={busy}
        >
          <ShareIcon kind="close" size={18} />
        </button>
      </header>
      {!current ? (
        <div className="es-share-loading">{error || t('shareLoading')}</div>
      ) : (
        <>
          <div className="es-share-body">
            <div className="es-share-label">
              {t('shareAccess')}
              <span>{t(visibility === 'public' ? 'shareNoLogin' : 'shareLogin')}</span>
            </div>
            <div className="es-share-picker" ref={menu}>
              <button
                ref={trigger}
                className="es-share-access"
                type="button"
                disabled={!current.canManage || busy}
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((v) => !v)}
              >
                <ShareIcon kind={visibility !== 'private' ? 'globe' : 'lock'} size={15} />
                {t(
                  visibility === 'public'
                    ? 'sharePublic'
                    : visibility === 'organization'
                      ? 'shareOrganization'
                      : 'sharePrivate',
                )}
                <ShareIcon kind="chevron" size={12} />
              </button>
              {open && (
                <div className="es-share-menu" role="menu" aria-label={t('shareAccess')}>
                  {(['private', 'organization', 'public'] as const).map((option) => (
                    <button
                      key={option}
                      role="menuitemradio"
                      aria-checked={option === visibility}
                      onClick={() => {
                        setVisibility(option);
                        setOpen(false);
                        setCopied(false);
                        setManual(false);
                        trigger.current?.focus();
                      }}
                    >
                      <ShareIcon kind={option !== 'private' ? 'globe' : 'lock'} />
                      <span>
                        <strong>
                          {t(
                            option === 'public'
                              ? 'sharePublic'
                              : option === 'organization'
                                ? 'shareOrganization'
                                : 'sharePrivate',
                          )}
                        </strong>
                        <small>
                          {t(
                            option === 'public'
                              ? 'sharePublicHint'
                              : option === 'organization'
                                ? 'shareOrganizationHint'
                                : 'sharePrivateHint',
                          )}
                        </small>
                      </span>
                      {visibility === option && <ShareIcon kind="check" size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="es-share-description">
              {t(
                visibility === 'public'
                  ? 'sharePublicHint'
                  : visibility === 'organization'
                    ? 'shareOrganizationHint'
                    : 'sharePrivateHint',
              )}
            </p>
            <div className="es-share-link">
              <input
                ref={link}
                readOnly
                aria-label={t('shareLink')}
                value={current.shareUrl ?? ''}
                placeholder={t(targetVersion ? 'shareLinkPending' : 'shareNotReady')}
              />
            </div>
            <p className="es-share-note">{t('shareVersionHint')}</p>
            <div className="es-share-data">
              <ShareIcon kind="lock" size={14} />
              <span>{t('shareDataHint')}</span>
            </div>
            {!current.canManage && <p className="es-share-note">{t('shareReadOnly')}</p>}
            {!targetVersion && <p className="es-share-notice">{t('shareNotReady')}</p>}
            {isLocal && <p className="es-share-note es-share-local">{t('shareLocalHint')}</p>}
            {error && (
              <p className="es-share-notice" role="alert">
                {error}
              </p>
            )}
            {manual && (
              <p className="es-share-note" role="status">
                {t('shareManualCopy')}
              </p>
            )}
          </div>
          <footer>
            <a
              className="es-share-visit"
              href={!dirty && current.shareUrl ? current.shareUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={dirty || !current.shareUrl}
              onClick={(e) => {
                if (dirty || !current.shareUrl) e.preventDefault();
              }}
            >
              <ShareIcon kind="visit" size={15} />
              {t('shareVisit')}
            </a>
            <button
              onClick={() => void copy()}
              disabled={busy || !targetVersion || (!current.shareUrl && !current.canManage)}
            >
              <ShareIcon kind={copied ? 'check' : 'link'} size={15} />
              {copied ? t('shareCopied') : dirty ? t('shareSaveCopy') : t('shareCopy')}
            </button>
            <button
              className="es-primary"
              onClick={() => void done()}
              disabled={busy || (dirty && !canSave)}
            >
              {busy ? t('shareSaving') : t('shareDone')}
            </button>
          </footer>
        </>
      )}
    </dialog>
  );
}
