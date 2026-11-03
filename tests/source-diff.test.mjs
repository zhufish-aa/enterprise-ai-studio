import test from 'node:test';
import assert from 'node:assert/strict';
import { compareFiles, diffLines } from '../apps/platform-web/src/source-diff.ts';

const source = (path, content) => ({ path, content });
const restore = (rows, side) =>
  rows
    .filter((r) => r.kind !== (side === 'old' ? 'add' : 'delete'))
    .map((r) => r.text + { lf: '\n', crlf: '\r\n', none: '' }[r.ending])
    .join('');

test('empty snapshots and identical files have no changes', () => {
  assert.deepEqual(compareFiles([], []), []);
  assert.deepEqual(compareFiles([source('a.ts', 'a\n')], [source('a.ts', 'a\n')]), []);
  assert.deepEqual(diffLines('', ''), { rows: [], coarse: false });
});

test('added/deleted empty files are retained, while paths sort deterministically', () => {
  const result = compareFiles(
    [source('z.ts', ''), source('unchanged', '')],
    [source('a.ts', ''), source('unchanged', '')],
  );
  assert.deepEqual(
    result.map(({ path, status, additions, deletions }) => ({
      path,
      status,
      additions,
      deletions,
    })),
    [
      { path: 'a.ts', status: 'added', additions: 0, deletions: 0 },
      { path: 'z.ts', status: 'deleted', additions: 0, deletions: 0 },
    ],
  );
});

test('insertion, replacement, deletion retain both line number domains', () => {
  const before = 'start\nold\nkeep\nremove\nend\n';
  const after = 'start\nnew\nkeep\nend\nextra\n';
  const [file] = compareFiles([source('a.ts', before)], [source('a.ts', after)]);
  assert.equal(file.status, 'modified');
  assert.equal(file.additions, 2);
  assert.equal(file.deletions, 2);
  assert.equal(restore(file.rows, 'old'), before);
  assert.equal(restore(file.rows, 'new'), after);
  assert.deepEqual(
    file.rows.filter((r) => r.oldLine !== null).map((r) => r.oldLine),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    file.rows.filter((r) => r.newLine !== null).map((r) => r.newLine),
    [1, 2, 3, 4, 5],
  );
});

test('EOF newline, CRLF, blank lines, lone CR and Unicode remain byte-faithful', () => {
  for (const [before, after] of [
    ['hello', 'hello\n'],
    ['hello\r\n', 'hello\n'],
    ['', '\n'],
    ['\n', ''],
    ['a\r', 'a'],
    ['你好\n🙂\n', '你好\n😀\n'],
    ['a\n\n', 'a\n'],
  ]) {
    const { rows } = diffLines(before, after);
    assert.equal(restore(rows, 'old'), before);
    assert.equal(restore(rows, 'new'), after);
    assert.ok(rows.some((r) => r.kind !== 'equal'));
  }
  assert.equal(diffLines('a', 'a\n').rows[0].ending, 'none');
});

test('first version and complete deletion count actual lines, not trailing phantom lines', () => {
  const [added] = compareFiles([], [source('a', 'one\ntwo\n')]);
  const [deleted] = compareFiles([source('a', 'one\ntwo')], []);
  assert.equal(added.additions, 2);
  assert.equal(added.deletions, 0);
  assert.equal(deleted.deletions, 2);
  assert.equal(deleted.additions, 0);
});

test('large distant changes use explicit bounded fallback without losing source', () => {
  const before =
    'common\n' + Array.from({ length: 1800 }, (_, i) => `old-${i}\n`).join('') + 'tail';
  const after = 'common\n' + Array.from({ length: 1800 }, (_, i) => `new-${i}\n`).join('') + 'tail';
  const result = diffLines(before, after);
  assert.equal(result.coarse, true);
  assert.equal(result.rows[0].kind, 'equal');
  assert.equal(result.rows.at(-1).kind, 'equal');
  assert.equal(restore(result.rows, 'old'), before);
  assert.equal(restore(result.rows, 'new'), after);
});

test('large mostly-identical files remain exact after common-context trimming', () => {
  const prefix = 'same\n'.repeat(20_000),
    suffix = '\ntail\n'.repeat(100);
  const result = diffLines(prefix + 'before' + suffix, prefix + 'after' + suffix);
  assert.equal(result.coarse, false);
  assert.equal(result.rows.filter((r) => r.kind === 'add').length, 1);
  assert.equal(result.rows.filter((r) => r.kind === 'delete').length, 1);
});

test('random small sequences reconstruct both sides and retain minimal edit counts', () => {
  let seed = 29;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let trial = 0; trial < 150; trial++) {
    const a = Array.from(
      { length: Math.floor(random() * 16) },
      () => String(Math.floor(random() * 4)) + '\n',
    );
    const b = Array.from(
      { length: Math.floor(random() * 16) },
      () => String(Math.floor(random() * 4)) + '\n',
    );
    const { rows, coarse } = diffLines(a.join(''), b.join(''));
    assert.equal(coarse, false);
    assert.equal(restore(rows, 'old'), a.join(''));
    assert.equal(restore(rows, 'new'), b.join(''));
    const table = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        table[i][j] =
          a[i - 1] === b[j - 1]
            ? table[i - 1][j - 1] + 1
            : Math.max(table[i - 1][j], table[i][j - 1]);
    assert.equal(
      rows.filter((r) => r.kind !== 'equal').length,
      a.length + b.length - 2 * table[a.length][b.length],
    );
  }
});

test('snapshot LCS budget is shared across files, with no rows allocated in summary mode', () => {
  // Both snapshots remain under the API 512 KiB / 200-file / 128 KiB-per-file limits.
  // Each file could individually use ~361k cells; only two fit the shared 1M budget.
  const before = Array.from({ length: 200 }, (_, i) =>
    source(`${String(i).padStart(3, '0')}.ts`, 'a\n'.repeat(600)),
  );
  const after = before.map(({ path }) => source(path, 'b\n'.repeat(600)));
  const result = compareFiles(before, after, { retainRows: false });
  assert.equal(result.length, 200);
  assert.equal(result.filter((file) => !file.coarse).length, 2);
  assert.equal(result.filter((file) => file.coarse).length, 198);
  for (const file of result) {
    assert.deepEqual(file.rows, []);
    assert.equal(file.additions, 600);
    assert.equal(file.deletions, 600);
  }
  // Selected-file comparison can receive its own fresh budget without changing summaries.
  assert.equal(diffLines(result.at(-1).before, result.at(-1).after).coarse, false);
});

test('summary mode agrees with retained rows and preserves bounded coarse full-file counts', () => {
  const before = [source('small.ts', 'a\nx\nb\n'), source('large.ts', 'a\n'.repeat(65536))];
  const after = [source('small.ts', 'a\ny\nb\n'), source('large.ts', 'b\n'.repeat(65536))];
  const summary = compareFiles(before, after, { retainRows: false });
  const detail = compareFiles(before, after);
  assert.deepEqual(
    summary,
    detail.map((file) => ({ ...file, rows: [] })),
  );
  assert.equal(summary[0].coarse, true);
  assert.equal(summary[0].additions, 65536);
  assert.equal(summary[0].deletions, 65536);
});

test('selected-file expansion can preserve summary coarse mode and displayed counts', () => {
  const before = Array.from({ length: 4 }, (_, i) =>
    source(`${i}.ts`, 'a\n' + 'shared\n'.repeat(600) + 'z\n'),
  );
  const after = before.map(({ path }) => source(path, 'b\n' + 'shared\n'.repeat(600) + 'y\n'));
  const summary = compareFiles(before, after, { retainRows: false });
  for (const file of summary) {
    const result = diffLines(file.before, file.after, { maxCells: file.coarse ? 0 : 1_000_000 });
    assert.equal(result.coarse, file.coarse);
    assert.equal(result.rows.filter((row) => row.kind === 'add').length, file.additions);
    assert.equal(result.rows.filter((row) => row.kind === 'delete').length, file.deletions);
  }
  assert.equal(summary.at(-1).coarse, true);
  assert.equal(diffLines('a\n', 'b\n', { maxCells: 0 }).coarse, true);
  assert.equal(diffLines('', 'b\n', { maxCells: 0 }).coarse, false);
});
