import {
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from 'react';
/** Keep the browser's native activation path: date showPicker() is restricted in opaque iframes. */
export function DateInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <span className="date-control">
      <input {...props} type="date" />
      <Icon name="calendar" size={17} />
    </span>
  );
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const p: Record<string, ReactNode> = {
    students: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9" />
        <circle cx="9" cy="7" r="4" />
        <path d="M16 3a4 4 0 0 1 0 8" />
      </>
    ),
    certificate: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 12h8M8 16h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4" />
      </>
    ),
    arrow: <path d="m9 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    edit: (
      <>
        <path d="m14 5 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15Z" />
      </>
    ),
    print: (
      <>
        <path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 13h12v8H6Z" />
        <path d="M17 11h1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    settings: (
      <>
        <path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 2 3-1 2 4 4-1 1-3 4-2-1-4-3-1-2-4Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H4v16h5M12 12h9m-4-4 4 4-4 4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 2v6M17 2v6M3 11h18" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 8V3l-4 4M4 16v5l4-4M4 9a8 8 0 0 1 13-4M20 15a8 8 0 0 1-13 4" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    book: (
      <>
        <path d="M12 5C7 2 2 4 2 4v16s5-2 10 1c5-3 10-1 10-1V4s-5-2-10 1Zm0 0v16" />
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
      {p[name] ?? p['certificate']}
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand-symbol">
      <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <path d="M9 5h15l8 8v22H9z" fill="currentColor" opacity=".12" />
        <path
          d="M9 5h15l8 8v22H9zM24 5v9h8M15 21h11M15 27h7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="31" cy="32" r="7" fill="#e8bd6c" />
        <path d="m28 32 2 2 4-4" stroke="white" strokeWidth="1.6" />
      </svg>
    </span>
  );
}
export function Button({
  children,
  icon,
  variant = '',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: string; variant?: string }) {
  return (
    <button type="button" className={'btn ' + variant + ' ' + className} {...props}>
      {icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error-box" role="alert">
      <Icon name="info" size={18} />
      <span>{error}</span>
    </div>
  ) : null;
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  footer,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      className={'modal' + (wide ? ' wide' : '') + ' ' + className}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-btn" type="button" onClick={onClose} aria-label="关闭">
          <Icon name="close" />
        </button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </dialog>
  );
}
export function Empty({
  title,
  children,
  icon = 'students',
}: {
  title: string;
  children: ReactNode;
  icon?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={27} />
      </div>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <span className="spinner" />
      正在加载
    </div>
  );
}
export function Pager({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="pager">
      <span>
        共 <b>{total.toLocaleString()}</b> 条
      </span>
      <div>
        <Button disabled={page === 1} onClick={() => onChange(page - 1)}>
          上一页
        </Button>
        <span>
          {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <Button disabled={page * pageSize >= total} onClick={() => onChange(page + 1)}>
          下一页
        </Button>
      </div>
    </div>
  );
}
export function Status({ value }: { value?: string }) {
  const text = value || '未填写';
  return (
    <span
      className={'status ' + (text === '在读' ? 'green' : text === '已毕业' ? 'blue' : 'neutral')}
    >
      <i />
      {text}
    </span>
  );
}
