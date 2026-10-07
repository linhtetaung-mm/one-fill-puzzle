import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { Flag, Play, X } from 'lucide-react';
import type { Board as PuzzleBoard } from './model';

interface Props { board: PuzzleBoard; path: number[]; onCell: (cell: number) => void; disabled?: boolean; editing?: boolean; hint?: number | null }
export default function Board({ board, path, onCell, disabled = false, editing = false, hint }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointer: number; last: number } | null>(null);
  const visited = new Set(path);
  const cellAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = grid.current!.getBoundingClientRect();
    const col = Math.floor((event.clientX - rect.left) / rect.width * board.cols);
    const row = Math.floor((event.clientY - rect.top) / rect.height * board.rows);
    return col < 0 || col >= board.cols || row < 0 || row >= board.rows ? -1 : row * board.cols + col;
  };
  return <div className={`board-frame ${editing ? 'editing' : ''}`}>
    <div ref={grid} className={`board ${board.cols >= 9 ? 'compact' : ''}`} role="group" aria-label={editing ? 'Puzzle editor' : 'Puzzle board'}
      style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)`, aspectRatio: `${board.cols}/${board.rows}` }}
      onPointerDown={event => {
        if (disabled || event.button !== 0) return;
        const cell = cellAt(event); if (cell < 0) return;
        gesture.current = { pointer: event.pointerId, last: cell };
        event.currentTarget.setPointerCapture(event.pointerId); onCell(cell);
      }}
      onPointerMove={event => {
        if (!gesture.current || gesture.current.pointer !== event.pointerId || disabled) return;
        const cell = cellAt(event);
        if (cell >= 0 && cell !== gesture.current.last) { gesture.current.last = cell; onCell(cell); }
      }}
      onPointerUp={() => { gesture.current = null; }} onPointerCancel={() => { gesture.current = null; }} onLostPointerCapture={() => { gesture.current = null; }}>
      {Array.from({ length: board.rows * board.cols }, (_, cell) => {
        const blocked = board.blocked.includes(cell), start = cell === board.start, end = cell === board.end;
        const isHead = path.at(-1) === cell;
        return <button key={cell} type="button" disabled={disabled || (!editing && blocked)} data-cell={cell}
          aria-label={`Row ${Math.floor(cell / board.cols) + 1}, column ${cell % board.cols + 1}${start ? ', start' : end ? ', finish' : blocked ? ', blocked' : ''}${visited.has(cell) ? ', visited' : ''}`}
          className={`cell ${blocked ? 'blocked' : ''} ${visited.has(cell) ? 'visited' : ''} ${start ? 'start' : ''} ${end ? 'end' : ''} ${isHead ? 'head' : ''} ${hint === cell ? 'hint' : ''}`}
          onClick={event => { if (event.detail === 0 && !disabled) onCell(cell); }}
          onKeyDown={event => {
            const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -board.cols, ArrowDown: board.cols };
            if (!(event.key in directions)) return;
            event.preventDefault();
            const next = cell + directions[event.key];
            if (next < 0 || next >= board.rows * board.cols || (event.key === 'ArrowLeft' && cell % board.cols === 0) || (event.key === 'ArrowRight' && cell % board.cols === board.cols - 1)) return;
            grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
            if (!editing && !disabled) onCell(next);
          }}>
          {blocked ? <X size={14} /> : start ? <span className="endpoint"><Play size={17} fill="currentColor"/><small>S</small></span> : end ? <span className="endpoint"><Flag size={18}/><small>F</small></span> : <span className="node-dot"/>}
          {isHead && !start && !end && <span className="head-dot"/>}
          {hint === cell && <span className="hint-ring"/>}
        </button>;
      })}
      <svg aria-hidden="true" className="route" viewBox={`0 0 ${board.cols * 100} ${board.rows * 100}`}>
        <polyline points={path.map(cell => `${(cell % board.cols) * 100 + 50},${Math.floor(cell / board.cols) * 100 + 50}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  </div>;
}
