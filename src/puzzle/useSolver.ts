import { useEffect, useRef, useState } from 'react';
import type { Board, SolveResult } from './model';

export function useSolver() {
  const worker = useRef<Worker | null>(null);
  const [busy, setBusy] = useState(false);
  const [states, setStates] = useState(0);
  const [result, setResult] = useState<SolveResult | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  function cancel() {
    worker.current?.terminate(); worker.current = null; setBusy(false);
  }
  function clear() { cancel(); setResult(null); setStates(0); }
  function run(board: Board, prefix: number[], budgetMs: number, done: (result: SolveResult) => void) {
    clear(); setBusy(true);
    const current = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
    worker.current = current;
    function fail(message: string) {
      if (worker.current !== current) return;
      cancel();
      const failure: SolveResult = { status: 'invalid', path: [], states: 0, duration: 0, message };
      setResult(failure); done(failure);
    }
    current.onerror = () => fail('The solver could not start. Reload the page and try again.');
    current.onmessage = event => {
      if (worker.current !== current) return;
      if (event.data.type === 'progress') setStates(event.data.states);
      else if (event.data.type === 'error') fail(event.data.message);
      else if (event.data.type === 'result') {
        const value: SolveResult = event.data.result;
        setResult(value); setStates(value.states); cancel(); done(value);
      }
    };
    current.postMessage({ board, prefix, budgetMs });
  }
  return { busy, states, result, run, cancel, clear };
}
