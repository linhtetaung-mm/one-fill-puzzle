import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solve } from '../src/puzzle/solver.ts';
import { adjacent, complete, neighbors, parseBoard, validateBoard } from '../src/puzzle/model.ts';
import type { Board, Level } from '../src/puzzle/model.ts';

// Independent exhaustive reference: no parity, connectivity or degree pruning.
function brute(board: Board, prefix = [board.start]): boolean {
  const available = board.rows * board.cols - board.blocked.length;
  const seen = new Set(prefix);
  function visit(current: number, length: number): boolean {
    if (length === available) return current === board.end;
    if (current === board.end) return false;
    for (const n of neighbors(current, board)) {
      if (seen.has(n) || board.blocked.includes(n)) continue;
      seen.add(n);
      if (visit(n, length + 1)) return true;
      seen.delete(n);
    }
    return false;
  }
  return visit(prefix[prefix.length - 1], prefix.length);
}

test('pruned search matches exhaustive search for every 3×3 board and ordered endpoints', () => {
  let checked = 0;
  for (let start = 0; start < 9; start++) for (let end = 0; end < 9; end++) {
    if (start === end) continue;
    const others = Array.from({ length: 9 }, (_, i) => i).filter(i => i !== start && i !== end);
    for (let mask = 0; mask < 128; mask++) {
      const board = { rows: 3, cols: 3, start, end, blocked: others.filter((_, i) => mask & (1 << i)) };
      const result = solve(board);
      assert.equal(result.status, brute(board) ? 'solved' : 'unsolvable', JSON.stringify(board));
      if (result.status === 'solved') assert.ok(complete(board, result.path));
      checked++;
    }
  }
  assert.equal(checked, 9216);
});

test('hint search respects the current prefix and detects dead ends', () => {
  const board = { rows: 3, cols: 3, start: 0, end: 8, blocked: [] };
  const prefixes = [[0], [0, 1], [0, 3], [0, 1, 4], [0, 3, 4], [0, 1, 2, 5, 4]];
  for (const prefix of prefixes) {
    const result = solve(board, prefix);
    assert.equal(result.status, brute(board, prefix) ? 'solved' : 'unsolvable');
    if (result.status === 'solved') { assert.deepEqual(result.path.slice(0, prefix.length), prefix); assert.ok(complete(board, result.path)); }
  }
});

test('all 550 migrated original levels have valid boards and solver routes', () => {
  const levels: Level[] = JSON.parse(readFileSync(new URL('../src/puzzle/levels.json', import.meta.url), 'utf8'));
  assert.equal(levels.length, 550);
  for (const board of levels) {
    assert.equal(validateBoard(board), null, board.id);
    const result = solve(board, [board.start], { budgetMs: 2000 });
    assert.equal(result.status, 'solved', `${board.id}: ${result.status}`);
    assert.ok(complete(board, result.path), board.id);
  }
});

test('invalid input, premature finish, row wrapping, and timeout are distinct', () => {
  const board = { rows: 3, cols: 3, start: 0, end: 8, blocked: [] };
  assert.equal(solve({ ...board, end: 0 }).status, 'invalid');
  assert.equal(solve({ ...board, blocked: [0] }).status, 'invalid');
  assert.equal(solve(board, [0, 1, 0]).status, 'invalid');
  assert.equal(solve(board, [0, 1, 2, 3]).status, 'invalid');
  assert.equal(solve(board, [0, 3, 6, 7, 8]).status, 'invalid');
  assert.equal(adjacent(2, 3, 3), false);
  assert.equal(solve(board, [0], { budgetMs: 0 }).status, 'timeout');
  assert.throws(() => parseBoard('{"rows":9000}'));
  assert.throws(() => parseBoard('not json'));
  assert.throws(() => parseBoard(JSON.stringify({ ...board, blocked: [4, 4] })));
  assert.deepEqual(parseBoard(JSON.stringify(board)), board);
});
