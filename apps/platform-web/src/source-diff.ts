/** Pure, bounded text comparison. Never evaluates or renders source as markup. */
export type DiffRow = {
  kind: 'equal' | 'add' | 'delete';
  text: string;
  oldLine: number | null;
  newLine: number | null;
  ending: 'lf' | 'crlf' | 'none';
};
export type FileDiff = {
  path: string;
  status: 'added' | 'deleted' | 'modified';
  additions: number;
  deletions: number;
  rows: DiffRow[];
  coarse: boolean;
  before: string | undefined;
  after: string | undefined;
};
type SourceFile = { path: string; content: string };
type Line = { text: string; ending: DiffRow['ending']; raw: string };

function lines(content: string): Line[] {
  // Do not normalize CRLF or invent a final empty line: both EOL and EOF changes matter.
  const result: Line[] = [];
  let start = 0;
  while (start < content.length) {
    const end = content.indexOf('\n', start);
    if (end === -1) {
      result.push({ text: content.slice(start), ending: 'none', raw: content.slice(start) });
      break;
    }
    const crlf = end > start && content[end - 1] === '\r';
    result.push({
      text: content.slice(start, crlf ? end - 1 : end),
      ending: crlf ? 'crlf' : 'lf',
      raw: content.slice(start, end + 1),
    });
    start = end + 1;
  }
  return result;
}

const MAX_LCS_CELLS = 1_000_000;

/** A single file receives a fresh bounded budget; the file-list API shares one. */
export function diffLines(
  before: string,
  after: string,
  options: { maxCells?: number } = {},
): { rows: DiffRow[]; coarse: boolean } {
  const requested = options.maxCells ?? MAX_LCS_CELLS;
  const remaining = Number.isFinite(requested)
    ? Math.max(0, Math.min(MAX_LCS_CELLS, Math.floor(requested)))
    : MAX_LCS_CELLS;
  const { rows, coarse } = compareLines(before, after, { remaining }, true);
  return { rows, coarse };
}

function compareLines(
  before: string,
  after: string,
  budget: { remaining: number },
  retainRows: boolean,
): { rows: DiffRow[]; coarse: boolean; additions: number; deletions: number } {
  const a = lines(before),
    b = lines(after),
    rows: DiffRow[] = [];
  let oldIndex = 0,
    newIndex = 0,
    additions = 0,
    deletions = 0;
  const emit = (kind: DiffRow['kind']) => {
    const line = kind === 'add' ? b[newIndex]! : a[oldIndex]!;
    const oldLine = kind === 'add' ? null : ++oldIndex;
    const newLine = kind === 'delete' ? null : ++newIndex;
    if (kind === 'add') additions++;
    if (kind === 'delete') deletions++;
    if (retainRows) rows.push({ kind, text: line.text, ending: line.ending, oldLine, newLine });
  };
  while (oldIndex < a.length && newIndex < b.length && a[oldIndex]!.raw === b[newIndex]!.raw)
    emit('equal');
  let suffix = 0;
  while (
    a.length - suffix > oldIndex &&
    b.length - suffix > newIndex &&
    a[a.length - suffix - 1]!.raw === b[b.length - suffix - 1]!.raw
  )
    suffix++;
  const n = a.length - suffix - oldIndex,
    m = b.length - suffix - newIndex;
  // Cap work and memory independently of untrusted line count. For an oversized
  // changed region show a complete replacement, explicitly marked coarse, rather
  // than blocking the browser or silently dropping lines. Prefix/suffix stay exact.
  const cells = (n + 1) * (m + 1);
  const coarse = n > 0 && m > 0 && cells > budget.remaining;
  if (coarse || n === 0 || m === 0) {
    for (let i = 0; i < n; i++) emit('delete');
    for (let j = 0; j < m; j++) emit('add');
  } else {
    budget.remaining -= cells;
    const width = m + 1,
      lengths = new Uint32Array((n + 1) * width);
    const oldStart = oldIndex,
      newStart = newIndex;
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lengths[i * width + j] =
          a[oldStart + i]!.raw === b[newStart + j]!.raw
            ? lengths[(i + 1) * width + j + 1]! + 1
            : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!);
      }
    }
    let i = 0,
      j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[oldStart + i]!.raw === b[newStart + j]!.raw) {
        emit('equal');
        i++;
        j++;
      } else if (
        i < n &&
        (j === m || lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!)
      ) {
        emit('delete');
        i++;
      } else {
        emit('add');
        j++;
      }
    }
  }
  for (let i = 0; i < suffix; i++) emit('equal');
  return { rows, coarse, additions, deletions };
}

export function compareFiles(
  before: readonly SourceFile[],
  after: readonly SourceFile[],
  options: { retainRows?: boolean } = {},
): FileDiff[] {
  // Source snapshots are bounded by the API. Avoid multiplying expensive LCS work
  // by their file count; summaries never allocate or retain per-line row objects.
  const budget = { remaining: MAX_LCS_CELLS };
  const oldFiles = new Map(before.map((file) => [file.path, file.content]));
  const newFiles = new Map(after.map((file) => [file.path, file.content]));
  const result: FileDiff[] = [];
  for (const path of [...new Set([...oldFiles.keys(), ...newFiles.keys()])].sort()) {
    const previous = oldFiles.get(path),
      next = newFiles.get(path);
    if (previous === next) continue;
    const { rows, coarse, additions, deletions } = compareLines(
      previous ?? '',
      next ?? '',
      budget,
      options.retainRows !== false,
    );
    result.push({
      path,
      status: previous === undefined ? 'added' : next === undefined ? 'deleted' : 'modified',
      before: previous,
      after: next,
      rows,
      coarse,
      additions,
      deletions,
    });
  }
  return result;
}
