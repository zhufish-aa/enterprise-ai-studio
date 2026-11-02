import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Icon } from './icons.js';

type SourceFile = { path: string; bytes: number };
type TreeNode = {
  path: string;
  name: string;
  kind: 'file' | 'folder';
  children: TreeNode[];
  bytes: number;
};

function createTree(files: readonly SourceFile[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const folders = new Map<string, TreeNode>();
  for (const file of files) {
    const parts = file.path.split('/');
    let children = roots;
    for (let index = 0; index < parts.length; index++) {
      const name = parts[index]!;
      const path = parts.slice(0, index + 1).join('/');
      if (index === parts.length - 1) {
        children.push({ path, name, kind: 'file', children: [], bytes: file.bytes });
        continue;
      }
      let folder = folders.get(path);
      if (!folder) {
        folder = { path, name, kind: 'folder', children: [], bytes: 0 };
        folders.set(path, folder);
        children.push(folder);
      }
      children = folder.children;
    }
  }
  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) =>
        a.kind === b.kind
          ? a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
          : a.kind === 'folder'
            ? -1
            : 1,
      )
      .map((node) => ({ ...node, children: sort(node.children) }));
  return sort(roots);
}

export function SourceFileIcon({ path }: { path: string }) {
  const extension = path.split('.').at(-1)?.toLowerCase();
  if (extension === 'tsx' || extension === 'jsx')
    return (
      <svg className="source-file-icon react" viewBox="0 0 18 18" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          <ellipse cx="9" cy="9" rx="8" ry="3.1" />
          <ellipse cx="9" cy="9" rx="8" ry="3.1" transform="rotate(60 9 9)" />
          <ellipse cx="9" cy="9" rx="8" ry="3.1" transform="rotate(120 9 9)" />
        </g>
        <circle cx="9" cy="9" r="1.5" fill="currentColor" />
      </svg>
    );
  if (extension === 'json')
    return (
      <svg className="source-file-icon json" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M6 2H4.8v4.2L3 9l1.8 2.8V16H6m6-14h1.2v4.2L15 9l-1.8 2.8V16H12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  const label =
    extension === 'ts' ? 'TS' : extension === 'css' ? 'CSS' : extension === 'md' ? 'M↓' : '';
  return (
    <svg
      className={
        'source-file-icon ' +
        (extension === 'ts' ? 'typescript' : extension === 'css' ? 'css' : 'document')
      }
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      {label ? (
        <>
          <rect x="1" y="2" width="16" height="14" rx="3" fill="currentColor" opacity=".13" />
          <text
            x="9"
            y="11.8"
            textAnchor="middle"
            fill="currentColor"
            fontSize={label.length === 3 ? '6.4' : '8'}
            fontWeight="600"
            fontFamily="Arial,sans-serif"
          >
            {label}
          </text>
        </>
      ) : (
        <path
          d="M4 1.8h6l4 4V16H4zm6 0V6h4M6.5 9h5m-5 3h5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function ServerFileTree({
  files,
  selectedPath,
  modifiedPaths,
  busy,
  onOpen,
}: {
  files: readonly SourceFile[];
  selectedPath: string;
  modifiedPaths: ReadonlySet<string>;
  busy: boolean;
  onOpen: (path: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focusedPath, setFocusedPath] = useState('');
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const search = query.trim().toLocaleLowerCase();
  const matches = useMemo(
    () => files.filter((file) => file.path.toLocaleLowerCase().includes(search)),
    [files, search],
  );
  const tree = useMemo(() => createTree(matches), [matches]);
  const allFolders = useMemo(() => {
    const paths: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes)
        if (node.kind === 'folder') {
          paths.push(node.path);
          walk(node.children);
        }
    };
    walk(tree);
    return paths;
  }, [tree]);
  const visible = useMemo(() => {
    const nodes: TreeNode[] = [];
    const walk = (children: TreeNode[]) => {
      for (const node of children) {
        nodes.push(node);
        if (!collapsed.has(node.path)) walk(node.children);
      }
    };
    walk(tree);
    return nodes;
  }, [tree, collapsed]);
  const focusPath = visible.some((node) => node.path === focusedPath)
    ? focusedPath
    : visible.some((node) => node.path === selectedPath)
      ? selectedPath
      : visible[0]?.path;

  useEffect(() => {
    const parts = selectedPath.split('/');
    const parents = parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
    setCollapsed((current) =>
      parents.some((parent) => current.has(parent))
        ? new Set([...current].filter((path) => !parents.includes(path)))
        : current,
    );
  }, [selectedPath]);

  const toggle = (path: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  const focus = (path: string | undefined) => {
    if (path) {
      setFocusedPath(path);
      refs.current.get(path)?.focus();
    }
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, node: TreeNode) => {
    const index = visible.findIndex((item) => item.path === node.path);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focus(visible[index + 1]?.path);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focus(visible[index - 1]?.path);
        break;
      case 'Home':
        event.preventDefault();
        focus(visible[0]?.path);
        break;
      case 'End':
        event.preventDefault();
        focus(visible.at(-1)?.path);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (node.kind === 'folder') {
          if (collapsed.has(node.path)) toggle(node.path);
          else focus(node.children[0]?.path);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (node.kind === 'folder' && !collapsed.has(node.path)) toggle(node.path);
        else
          focus(
            node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : undefined,
          );
        break;
    }
  };
  const render = (nodes: TreeNode[], depth: number): ReactNode[] =>
    nodes.map((node) => {
      const folder = node.kind === 'folder',
        expanded = !collapsed.has(node.path),
        modified = modifiedPaths.has(node.path);
      return (
        <li role="none" key={node.path}>
          <button
            type="button"
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={folder ? expanded : undefined}
            aria-selected={!folder && node.path === selectedPath}
            aria-label={node.name + (modified ? '，未保存' : '')}
            aria-disabled={!folder && busy}
            tabIndex={node.path === focusPath ? 0 : -1}
            className={
              'source-tree-row' +
              (node.path === selectedPath ? ' selected' : '') +
              (folder ? ' folder' : '')
            }
            style={{ paddingLeft: 10 + depth * 18 }}
            data-path={node.path}
            ref={(element) => {
              if (element) refs.current.set(node.path, element);
              else refs.current.delete(node.path);
            }}
            onFocus={() => setFocusedPath(node.path)}
            onKeyDown={(event) => navigate(event, node)}
            onClick={() => {
              if (folder) toggle(node.path);
              else if (!busy) onOpen(node.path);
            }}
            title={
              folder
                ? node.path
                : node.path + ' · ' + new Intl.NumberFormat('zh-CN').format(node.bytes) + ' 字节'
            }
          >
            <span className={'source-tree-chevron' + (folder && expanded ? ' expanded' : '')}>
              {folder && <Icon name="chevron" size={12} />}
            </span>
            {folder ? <Icon name="folder" size={16} /> : <SourceFileIcon path={node.path} />}
            <span className="source-tree-name">{node.name}</span>
            {modified && <span className="source-tree-modified" aria-hidden="true" />}
          </button>
          {folder && expanded && (
            <ul
              role="group"
              className="source-tree-group"
              style={{ '--tree-guide': 17 + depth * 18 + 'px' } as CSSProperties}
            >
              {render(node.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  return (
    <div className="source-tree">
      <div className="source-tree-toolbar">
        <span>项目文件</span>
        <div>
          <button
            type="button"
            aria-label="展开所有文件夹"
            title="展开所有文件夹"
            disabled={!allFolders.length}
            onClick={() => setCollapsed(new Set())}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m4 5 4-3 4 3M4 11l4 3 4-3M3 8h10" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="折叠所有文件夹"
            title="折叠所有文件夹"
            disabled={!allFolders.length}
            onClick={() => setCollapsed(new Set(allFolders))}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="2.5" y="4.5" width="9" height="9" rx="1.5" />
              <path d="M5 2h7.5L14 3.5V11M5 9h4" />
            </svg>
          </button>
        </div>
      </div>
      <div className="source-tree-search">
        <Icon name="search" size={14} />
        <input
          aria-label="搜索服务器文件"
          placeholder="搜索文件…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCollapsed(new Set());
          }}
        />
        {query && (
          <button type="button" aria-label="清除文件搜索" onClick={() => setQuery('')}>
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
      <div className="source-tree-scroll">
        {tree.length ? (
          <ul role="tree" aria-label="服务器项目文件" aria-busy={busy}>
            {render(tree, 0)}
          </ul>
        ) : (
          <div className="source-tree-empty">
            {search ? '没有匹配的文件' : '项目中还没有文件'}
            {!search && <span>新建文件，或载入已有源码版本。</span>}
          </div>
        )}
      </div>
      <div className="source-tree-summary">
        {search ? matches.length + ' / ' + files.length + ' 个文件' : files.length + ' 个文件'}
        {modifiedPaths.size > 0 && <span>{modifiedPaths.size} 个未保存</span>}
      </div>
    </div>
  );
}
