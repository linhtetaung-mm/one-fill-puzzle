export interface Board { rows: number; cols: number; start: number; end: number; blocked: number[] }
export interface Level extends Board { id: string; name: string }
export type SolveStatus = 'solved' | 'unsolvable' | 'timeout' | 'invalid';
export interface SolveResult { status: SolveStatus; path: number[]; states: number; duration: number; message: string }

export function neighbors(cell: number, board: Board): number[] {
  const row = Math.floor(cell / board.cols), col = cell % board.cols;
  return [col > 0 ? cell - 1 : -1, col < board.cols - 1 ? cell + 1 : -1, row > 0 ? cell - board.cols : -1, row < board.rows - 1 ? cell + board.cols : -1].filter(n => n >= 0);
}
export function adjacent(a: number, b: number, cols: number) {
  return Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs(a % cols - b % cols) === 1;
}
export function validateBoard(value: unknown): string | null {
  if (!value || typeof value !== 'object') return 'Choose a valid puzzle board.';
  const b = value as Board;
  if (![b.rows, b.cols].every(n => Number.isInteger(n) && n >= 2 && n <= 12)) return 'Rows and columns must be between 2 and 12.';
  const validCell = (n: number) => Number.isInteger(n) && n >= 0 && n < b.rows * b.cols;
  if (!validCell(b.start) || !validCell(b.end)) return 'Choose a start and a finish inside the board.';
  if (b.start === b.end) return 'Start and finish must be different tiles.';
  if (!Array.isArray(b.blocked) || !b.blocked.every(validCell) || new Set(b.blocked).size !== b.blocked.length) return 'Blocked tiles must be unique positions inside the board.';
  if (b.blocked.includes(b.start) || b.blocked.includes(b.end)) return 'Start and finish cannot be blocked.';
  return null;
}
export function validatePrefix(board: Board, path: number[]): string | null {
  if (!path.length || path[0] !== board.start) return 'The line must begin at the start tile.';
  if (new Set(path).size !== path.length) return 'Visit each tile only once.';
  for (let i = 0; i < path.length; i++) {
    if (!Number.isInteger(path[i]) || path[i] < 0 || path[i] >= board.rows * board.cols || board.blocked.includes(path[i])) return 'The line crosses an unavailable tile.';
    if (i && !adjacent(path[i - 1], path[i], board.cols)) return 'Move only between neighboring tiles.';
    if (path[i] === board.end && i !== board.rows * board.cols - board.blocked.length - 1) return 'Visit all other tiles before the finish.';
  }
  return null;
}
export function complete(board: Board, path: number[]) {
  return path.length === board.rows * board.cols - board.blocked.length && path.at(-1) === board.end && !validatePrefix(board, path);
}
export function parseBoard(text: string): Board {
  const value: unknown = JSON.parse(text);
  const error = validateBoard(value);
  if (error) throw new Error(error);
  const b = value as Board;
  return { rows: b.rows, cols: b.cols, start: b.start, end: b.end, blocked: [...b.blocked] };
}
