import { solve } from './solver';
import type { Board } from './model';
self.onmessage = (event: MessageEvent<{ board: Board; prefix: number[]; budgetMs: number }>) => {
  try {
    const { board, prefix, budgetMs } = event.data;
    let lastProgress = 0;
    const result = solve(board, prefix, { budgetMs, onProgress: states => {
      const now = performance.now();
      if (now - lastProgress >= 100) { self.postMessage({ type: 'progress', states }); lastProgress = now; }
    } });
    self.postMessage({ type: 'result', result });
  } catch {
    self.postMessage({ type: 'error', message: 'The solver could not finish. Please reset the board and try again.' });
  }
};
