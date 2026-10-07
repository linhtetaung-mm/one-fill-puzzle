import { neighbors, validateBoard, validatePrefix } from './model.ts';
import type { Board, SolveResult } from './model.ts';

// Refactors the original HamiltonianCycle.findPath backtracking search into
// an explicit start-to-finish path. No synthetic closing node is needed.
export function solve(board: Board, prefix: number[] = [board.start], options: { budgetMs?: number; onProgress?: (states: number) => void } = {}): SolveResult {
  const began = performance.now();
  let states = 0, timedOut = false;
  const result = (status: SolveResult['status'], path: number[], message: string): SolveResult => ({ status, path, message, states, duration: performance.now() - began });
  const error = validateBoard(board) || validatePrefix(board, prefix);
  if (error) return result('invalid', [], error);
  const total = board.rows * board.cols;
  const blocked = new Set(board.blocked);
  const active = Array.from({ length: total }, (_, i) => i).filter(i => !blocked.has(i));
  const edges = Array.from({ length: total }, (_, i) => neighbors(i, board).filter(n => !blocked.has(n)));
  const visited = new Uint8Array(total);
  prefix.forEach(i => { visited[i] = 1; });
  const path = [...prefix];
  const budget = options.budgetMs ?? 10000;
  const color = (i: number) => (Math.floor(i / board.cols) + i % board.cols) % 2;

  function viable(current: number): boolean {
    // In the residual graph only the current tile and finish may have degree 1.
    const residual = active.filter(i => !visited[i] || i === current);
    if (residual.length === 1) return current === board.end;
    let black = 0;
    for (const i of residual) {
      black += color(i) === 0 ? 1 : 0;
      const degree = edges[i].filter(n => !visited[n] || n === current).length;
      if (degree < (i === current || i === board.end ? 1 : 2)) return false;
    }
    const white = residual.length - black;
    if (residual.length % 2 === 0) {
      if (black !== white || color(current) === color(board.end)) return false;
    } else {
      if (color(current) !== color(board.end) || (color(current) === 0 ? black !== white + 1 : white !== black + 1)) return false;
    }
    // Every remaining tile must still be reachable from the current endpoint.
    const seen = new Set([current]), queue = [current];
    for (let q = 0; q < queue.length; q++) {
      for (const n of edges[queue[q]]) if ((!visited[n] || n === current) && !seen.has(n)) { seen.add(n); queue.push(n); }
    }
    return seen.size === residual.length;
  }
  function search(current: number): boolean {
    states++;
    if (states === 1 || states % 256 === 0) {
      if (performance.now() - began >= budget) { timedOut = true; return false; }
      options.onProgress?.(states);
    }
    if (path.length === active.length) return current === board.end;
    if (current === board.end || !viable(current)) return false;
    // Explore constrained neighbors first; still exhaust all viable branches.
    const candidates = edges[current].filter(n => !visited[n] && (n !== board.end || path.length === active.length - 1));
    candidates.sort((a, b) => edges[a].filter(n => !visited[n]).length - edges[b].filter(n => !visited[n]).length);
    for (const next of candidates) {
      visited[next] = 1; path.push(next);
      if (search(next)) return true;
      path.pop(); visited[next] = 0;
      if (timedOut) return false;
    }
    return false;
  }
  if (search(path[path.length - 1])) return result('solved', path, 'A complete route was found.');
  return timedOut ? result('timeout', [], 'Search reached its time limit. This does not mean the board is impossible. Try fewer open tiles or a longer search.') : result('unsolvable', [], 'No complete route exists from this starting line.');
}
