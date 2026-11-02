import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './icons.js';
export function Button({
  children,
  variant = 'default',
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'quiet' | 'danger';
  icon?: IconName;
}) {
  return (
    <button {...props} className={'button ' + variant + ' ' + (props.className ?? '')}>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
    </button>
  );
}
export function IconButton({
  icon,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      {...props}
      className={'icon-button ' + (props.className ?? '')}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </button>
  );
}
export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog wide' : 'dialog'}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header className="dialog-header">
        <div>
          <h2 id={id}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <IconButton icon="x" label="关闭" onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={'field ' + (wide ? 'span-2' : '')}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  title,
  description,
  action,
  icon = 'database',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Status({ value, label }: { value: string; label?: string }) {
  const text: Record<string, string> = {
    enabled: '已启用',
    disabled: '已停用',
    draft: '草稿',
    active: '可用',
    healthy: '正常',
    unhealthy: '检查失败',
    unknown: '未检查',
    queued: '等待执行',
    running: '正在执行',
    succeeded: '已完成',
    failed: '执行失败',
  };
  return (
    <span className={'status status-' + value}>
      <i />
      {label ?? text[value] ?? value}
    </span>
  );
}
export function Environment({ value }: { value: 'test' | 'production' }) {
  return <span className={'environment ' + value}>{value === 'test' ? 'TEST' : 'PROD'}</span>;
}
export function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="error-banner" role="alert">
      <Icon name="alert" size={17} />
      <span>{error}</span>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      正在读取数据…
    </div>
  );
}
export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '尚未执行';
