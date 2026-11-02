import React, { useEffect, useRef, useState } from 'react';
import type { SitesRpc, Entities as S } from '../sites-contract.js';
import { ShareIcon } from './share-dialog.js';
interface Snapshot {
  confirmationId: string;
  digest: string;
  files: { path: string; bytes: number }[];
  totalBytes: number;
  expiresInSeconds: number;
}
export function UploadDialog({
  rpc,
  appId,
  root,
  onClose,
  onUploaded,
}: {
  rpc: SitesRpc;
  appId: string;
  root: string;
  onClose: () => void;
  onUploaded: (version: S['StudioVersion']) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    pending = useRef<string | null>(null),
    [path, setPath] = useState(''),
    [message, setMessage] = useState('站点源码更新'),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
    return () => {
      if (pending.current)
        void rpc.call('uploadDiscard', { confirmationId: pending.current }).catch(() => {});
    };
  }, [rpc]);
  async function prepare() {
    setBusy(true);
    setError('');
    try {
      const value = await rpc.call<Snapshot>('uploadPrepare', {
        appId,
        projectPath: path.trim(),
        message: message.trim(),
      });
      pending.current = value.confirmationId;
      setSnapshot(value);
    } catch (error) {
      setError(error instanceof Error ? error.message : '读取项目失败。请检查项目目录是否存在。');
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    if (!snapshot) return;
    setBusy(true);
    setError('');
    try {
      const version = await rpc.call<S['StudioVersion']>('uploadConfirm', {
        appId,
        confirmationId: snapshot.confirmationId,
      });
      pending.current = null;
      onUploaded(version);
      onClose();
    } catch (error) {
      pending.current = null;
      setSnapshot(null);
      setError(error instanceof Error ? error.message : '源码上传失败，请重新检查文件后上传。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="es-sites es-share-dialog es-upload-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header>
        <h2>上传源码</h2>
        <button className="es-icon-button" onClick={onClose} disabled={busy} aria-label="关闭上传">
          <ShareIcon kind="close" />
        </button>
      </header>
      <div className="es-share-body">
        <p className="es-share-description">
          将本机项目保存为此站点的新版本，随后即可构建测试预览。
        </p>
        <label>
          默认项目目录
          <input readOnly value={root} />
        </label>
        <label>
          项目文件夹
          <input
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              setSnapshot(null);
            }}
            disabled={busy || !!snapshot}
            placeholder="例如 D:/Projects/sales-report 或 sales-report"
          />
        </label>
        <label>
          版本说明
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={busy || !!snapshot}
            maxLength={500}
          />
        </label>
        {snapshot && (
          <div className="es-upload-summary">
            <strong>
              {snapshot.files.length} 个文件 · {(snapshot.totalBytes / 1024).toFixed(1)} KB
            </strong>
            <ul>
              {snapshot.files.map((f) => (
                <li key={f.path}>
                  <span>{f.path}</span>
                  <small>{f.bytes} B</small>
                </li>
              ))}
            </ul>
            <code>{snapshot.digest}</code>
            <p>将上传以上文件的固定快照。确认 3 分钟内有效，仅可使用一次。</p>
          </div>
        )}
        {error && (
          <p className="es-share-notice" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer>
        <button onClick={onClose} disabled={busy}>
          取消
        </button>
        {snapshot ? (
          <button className="es-primary" onClick={() => void upload()} disabled={busy}>
            {busy ? '正在上传…' : '确认上传'}
          </button>
        ) : (
          <button
            className="es-primary"
            onClick={() => void prepare()}
            disabled={busy || !path.trim() || !message.trim()}
          >
            {busy ? '正在检查…' : '检查项目文件'}
          </button>
        )}
      </footer>
    </dialog>
  );
}
