import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Flag, Code2, Grid2X2, Lightbulb, MousePointer2, Play, RotateCcw, Route, Sparkles, Square, Undo2, WandSparkles, X } from 'lucide-react';
import BoardView from './puzzle/Board';
import { adjacent, complete, parseBoard } from './puzzle/model';
import type { Board, Level } from './puzzle/model';
import { useSolver } from './puzzle/useSolver';
import levelData from './puzzle/levels.json';

const levels: Level[] = levelData;
const blankBoard = (rows = 5, cols = 5): Board => ({ rows, cols, start: 0, end: rows * cols - 1, blocked: [] });
const storage = {
  read(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  write(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Play remains available when storage is disabled. */ } },
};
function savedEditor(): Board { try { return parseBoard(storage.read('onefill.editor') || 'null'); } catch { return blankBoard(); } }
function savedWins(): string[] { try { const value: unknown = JSON.parse(storage.read('onefill.wins') || '[]'); return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } }

export default function App() {
  const [view, setView] = useState<'play' | 'studio'>('play');
  const [levelIndex, setLevelIndex] = useState(15);
  const [gameBoard, setGameBoard] = useState<Board>(levels[15]);
  const [customGame, setCustomGame] = useState(false);
  const [gamePath, setGamePath] = useState<number[]>([levels[15].start]);
  const [gameMessage, setGameMessage] = useState('Start at S. Make every tile part of your line.');
  const [hint, setHint] = useState<number | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [wins, setWins] = useState<string[]>(savedWins);
  const [editor, setEditor] = useState<Board>(savedEditor);
  const [tool, setTool] = useState<'block' | 'start' | 'end'>('block');
  const [studioPath, setStudioPath] = useState<number[]>([]);
  const [studioMessage, setStudioMessage] = useState('Paint blocked tiles, then place your start and finish.');
  const [budget, setBudget] = useState(10);
  const [help, setHelp] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const replay = useRef<ReturnType<typeof setInterval> | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const solver = useSolver();
  const board = view === 'play' ? gameBoard : editor;
  const path = view === 'play' ? gamePath : studioPath;
  const count = board.rows * board.cols - board.blocked.length;
  const won = complete(gameBoard, gamePath);
  const lock = solver.busy || replaying;

  useEffect(() => { storage.write('onefill.editor', JSON.stringify(editor)); }, [editor]);
  useEffect(() => { storage.write('onefill.wins', JSON.stringify(wins)); }, [wins]);
  useEffect(() => () => { if (replay.current) clearInterval(replay.current); }, []);
  useEffect(() => { if (help) dialog.current?.showModal(); else dialog.current?.close(); }, [help]);

  function stopReplay() { if (replay.current) clearInterval(replay.current); replay.current = null; setReplaying(false); }
  function clearWork() { solver.clear(); stopReplay(); setHint(null); }
  function changeView(next: 'play' | 'studio') { if (solver.busy) (view === 'play' ? setGameMessage : setStudioMessage)('Search cancelled when switching modes.'); clearWork(); setView(next); }
  function loadLevel(index: number) {
    clearWork(); setLevelIndex(index); setGameBoard(levels[index]); setGamePath([levels[index].start]); setCustomGame(false); setAssisted(false);
    setGameMessage('Start at S. Make every tile part of your line.');
  }
  function resetGame() { clearWork(); setGamePath([gameBoard.start]); setAssisted(false); setGameMessage('A fresh start. Find your own way through.'); }
  function editBoard(next: Board) { clearWork(); setEditor(next); setStudioPath([]); setStudioMessage('Board updated. Ready to find a route.'); }
  function selectCell(cell: number) {
    if (lock) return;
    if (view === 'studio') {
      if (tool === 'block') {
        if (cell === editor.start || cell === editor.end) { setStudioMessage('Move the start or finish before blocking this tile.'); return; }
        editBoard({ ...editor, blocked: editor.blocked.includes(cell) ? editor.blocked.filter(n => n !== cell) : [...editor.blocked, cell] });
      } else {
        if (cell === (tool === 'start' ? editor.end : editor.start)) { setStudioMessage('Start and finish need separate tiles.'); return; }
        editBoard({ ...editor, [tool]: cell, blocked: editor.blocked.filter(n => n !== cell) });
      }
      return;
    }
    if (won || gameBoard.blocked.includes(cell)) return;
    const old = gamePath.indexOf(cell);
    if (old >= 0) { setHint(null); setGameMessage('Line shortened. Try another direction.'); setGamePath(gamePath.slice(0, old + 1)); return; }
    if (!adjacent(gamePath[gamePath.length - 1], cell, gameBoard.cols)) return;
    if (cell === gameBoard.end && gamePath.length !== count - 1) { setGameMessage('Save the finish for last. There are still tiles to visit.'); return; }
    const next = [...gamePath, cell]; setHint(null); setGamePath(next);
    if (complete(gameBoard, next)) {
      setGameMessage(assisted ? 'Route complete. Try it again without assistance!' : 'Beautifully connected. Every tile, one line.');
      if (!customGame && !assisted) setWins(current => current.includes(levels[levelIndex].id) ? current : [...current, levels[levelIndex].id]);
    } else setGameMessage('Keep going. You can tap a visited tile to backtrack.');
  }
  function undo() {
    clearWork(); setGamePath(current => current.slice(0, Math.max(1, current.length - 1))); setGameMessage('One step back. A new possibility.');
  }
  function showRoute(route: number[], game: boolean) {
    stopReplay(); setReplaying(true); let step = 1;
    const update = game ? setGamePath : setStudioPath;
    update(route.slice(0, 1));
    replay.current = setInterval(() => {
      step++; update(route.slice(0, step));
      if (step >= route.length) { stopReplay(); if (game) setGameMessage('Solution revealed. Reset the board to try it yourself.'); else setStudioMessage('Route complete. Play this puzzle or edit it to create a new challenge.'); }
    }, 90);
  }
  function run(kind: 'hint' | 'reveal' | 'studio') {
    stopReplay(); setHint(null);
    const game = kind !== 'studio';
    const message = game ? setGameMessage : setStudioMessage;
    message(kind === 'hint' ? 'Looking for a route that continues your line…' : 'Exploring the board…');
    solver.run(game ? gameBoard : editor, kind === 'hint' ? gamePath : [game ? gameBoard.start : editor.start], budget * 1000, result => {
      if (result.status !== 'solved') {
        message(result.status === 'unsolvable' ? (kind === 'hint' ? 'Your current line has no complete route. Undo a move or reset, then try again.' : 'This board has no complete route. Try changing its tiles or endpoints.') : result.message); return;
      }
      if (game) setAssisted(true);
      if (kind === 'hint') { setHint(result.path[gamePath.length] ?? null); message('Follow the glowing tile. A full route is still possible.'); }
      else { message('A complete route was found. Watch the line unfold.'); showRoute(result.path, game); }
    });
  }
  function playCustom() {
    clearWork(); setGameBoard({ ...editor, blocked: [...editor.blocked] }); setGamePath([editor.start]); setCustomGame(true); setAssisted(false); setGameMessage('Your creation. Can you connect every tile?'); setView('play');
  }
  function exportBoard() {
    const blob = new Blob([JSON.stringify({ rows: editor.rows, cols: editor.cols, start: editor.start, end: editor.end, blocked: [...editor.blocked].sort((a, b) => a - b) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `one-fill-${editor.rows}x${editor.cols}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStudioMessage('Puzzle exported. Share it with someone who loves a challenge.');
  }

  return <div className="app">
    <header className="topbar"><a className="brand" href="#" onClick={event => { event.preventDefault(); changeView('play'); }}><span className="brand-mark"><Route size={23}/></span><span>one<span className="brand-accent">fill</span><small>THE PUZZLE COLLECTION</small></span></a>
      <nav className="tabs" aria-label="Puzzle mode"><button className={view === 'play' ? 'active' : ''} onClick={() => changeView('play')}><Play size={15}/> Play</button><button className={view === 'studio' ? 'active studio-active' : ''} onClick={() => changeView('studio')}><WandSparkles size={16}/> Create & solve</button></nav>
      <button ref={helpButton} aria-label="How to play" className="help-button" onClick={() => setHelp(true)}><CircleHelp size={18}/><span>How to play</span></button>
    </header>
    <main>
      <div className="page-intro"><div className="eyebrow"><span/>{view === 'play' ? 'A LITTLE LOGIC. A SINGLE LINE.' : 'YOUR IDEAS. ENDLESS POSSIBILITIES.'}</div><h1>{view === 'play' ? <>Every tile. <span>One line.</span></> : <>Make a puzzle. <span>Find its path.</span></>}</h1><p>{view === 'play' ? 'A simple idea with a satisfying twist. Connect the start to the finish, visiting every open tile once.' : 'Build your own board, try it yourself, or let the solver find a way through.'}</p></div>
      <div className="workspace">
        <aside className="sidebar">
          {view === 'play' ? <>
            <div className="side-heading"><Grid2X2 size={16}/><span>THE CHALLENGE</span><span className="pill">{customGame ? 'Custom' : 'Original'}</span></div>
            <div className="level-title"><h2>{customGame ? 'Your puzzle' : levels[levelIndex].name}</h2><p>{gameBoard.rows} × {gameBoard.cols} board <span>·</span> {count} open tiles</p></div>
            <label className="field-label" htmlFor="level">Explore the collection</label><select id="level" value={levelIndex} disabled={lock} onChange={event => loadLevel(Number(event.target.value))}>{levels.map((level, i) => <option key={level.id} value={i}>{wins.includes(level.id) ? '✓ ' : ''}{level.name} — {level.rows}×{level.cols}</option>)}</select>
            <div className="level-navigation"><button disabled={lock || levelIndex === 0} onClick={() => loadLevel(levelIndex - 1)}><ChevronLeft size={16}/> Previous</button><button disabled={lock || levelIndex === levels.length - 1} onClick={() => loadLevel(levelIndex + 1)}>Next <ChevronRight size={16}/></button></div>
            <div className="divider"/><div className="side-heading"><Route size={16}/><span>YOUR PROGRESS</span></div><div className="progress-count"><strong>{gamePath.length}<span> / {count}</span></strong><span>tiles connected</span></div><div className="progress-track"><span style={{ width: `${gamePath.length / count * 100}%` }}/></div>
            <div className="detail-row"><span>Moves</span><b>{gamePath.length - 1}</b></div><div className="detail-row"><span>Collection completed</span><b>{wins.length} / {levels.length}</b></div>
            <div className="tip-card"><Lightbulb size={18}/><div><strong>A little nudge</strong><p>Look for tiles with only two neighbors. Your line has to pass through both.</p></div></div>
          </> : <>
            <div className="side-heading"><Grid2X2 size={16}/><span>BOARD SETTINGS</span><span className="pill purple">Studio</span></div><h2 className="studio-title">Your blank canvas</h2><p className="muted">Small changes. New challenges.</p>
            <div className="dimensions">{(['rows', 'cols'] as const).map(key => <label key={key}>{key === 'rows' ? 'Rows' : 'Columns'}<select value={editor[key]} disabled={lock} onChange={event => editBoard(blankBoard(key === 'rows' ? Number(event.target.value) : editor.rows, key === 'cols' ? Number(event.target.value) : editor.cols))}>{Array.from({ length: 11 }, (_, i) => i + 2).map(n => <option key={n}>{n}</option>)}</select></label>)}</div>
            <p className="tiny">Changing dimensions creates an empty board.</p><div className="divider"/><div className="side-heading"><MousePointer2 size={16}/><span>EDITOR TOOLS</span></div>
            <div className="tools">{([{ value: 'block', name: 'Block / erase', icon: Square, help: 'Tap or drag to paint tiles' }, { value: 'start', name: 'Place start', icon: Play, help: 'Where your line begins' }, { value: 'end', name: 'Place finish', icon: Flag, help: 'The very last tile' }] as const).map(item => <button key={item.value} disabled={lock} aria-pressed={tool === item.value} className={tool === item.value ? 'selected' : ''} onClick={() => setTool(item.value)}><item.icon size={18}/><span>{item.name}<small>{item.help}</small></span>{tool === item.value && <Check size={15}/>}</button>)}</div>
            <div className="divider"/><label className="field-label" htmlFor="budget">Solver time limit</label><select id="budget" value={budget} disabled={lock} onChange={event => setBudget(Number(event.target.value))}><option value={10}>10 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select><p className="tiny">Large boards can take longer. You can cancel any search.</p>
            <div className="file-actions"><button disabled={lock} onClick={() => importInput.current?.click()}><ArrowUpFromLine size={15}/> Import</button><button onClick={exportBoard}><ArrowDownToLine size={15}/> Export</button></div><input ref={importInput} hidden type="file" accept=".json,application/json" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { if (file.size > 100000) throw new Error('Choose a puzzle JSON file smaller than 100 KB.'); editBoard(parseBoard(await file.text())); setStudioMessage('Puzzle imported. Ready to play or solve.'); } catch (error) { setStudioMessage(error instanceof Error ? error.message : 'Could not read this puzzle.'); } }}/>
          </>}
        </aside>
        <section className="game-panel" aria-label={view === 'play' ? 'Play One Fill' : 'Create and solve'}>
          <div className="board-heading"><div><span className={`status-dot ${won && view === 'play' ? 'success' : ''}`}/><span>{view === 'studio' ? 'EDITING YOUR BOARD' : won ? (assisted ? 'SOLUTION COMPLETE' : 'PUZZLE COMPLETE') : 'FIND YOUR FLOW'}</span></div><span className="board-size">{board.rows} × {board.cols}</span></div>
          <BoardView board={board} path={path} onCell={selectCell} disabled={lock} editing={view === 'studio'} hint={view === 'play' ? hint : null}/>
          <div className="legend"><span><i className="start-key"/> Start</span><span><i className="finish-key"/> Finish</span><span><i className="blocked-key"/> Blocked</span></div>
          <div className={`message ${won && view === 'play' ? 'win-message' : ''}`} role="status" aria-live="polite">{won && view === 'play' ? <Check size={17}/> : <MousePointer2 size={15}/>}<span>{view === 'play' ? gameMessage : studioMessage}</span></div>
          <div className="board-actions">{view === 'play' ? <><button className="secondary" disabled={lock || gamePath.length <= 1} onClick={undo}><Undo2 size={16}/> Undo</button><button className="secondary" onClick={resetGame}><RotateCcw size={16}/> Reset</button><button className="primary" disabled={lock || won} onClick={() => run('hint')}><Lightbulb size={16}/> Get a hint</button></> : <><button className="secondary" onClick={() => editBoard(blankBoard(editor.rows, editor.cols))}><RotateCcw size={16}/> Clear</button><button className="secondary" disabled={lock} onClick={playCustom}><Play size={16}/> Play it</button><button className="primary purple-button" disabled={lock} onClick={() => run('studio')}><Sparkles size={16}/> Find a route</button></>}</div>
          <div className="below-actions">{solver.busy ? <><span className="thinking">Searching · {solver.states.toLocaleString()} states</span><button onClick={() => { solver.cancel(); (view === 'play' ? setGameMessage : setStudioMessage)('Search cancelled. You can try again.'); }}>Cancel search</button></> : replaying ? <><span>Drawing the solution…</span><button onClick={() => { stopReplay(); if (view === 'play') resetGame(); else { setStudioPath([]); setStudioMessage('Replay stopped. Ready to edit.'); } }}>Stop replay</button></> : view === 'play' ? <button disabled={won} onClick={() => run('reveal')}>Stuck? Reveal the full route <ArrowRight size={13}/></button> : <span>{count} open tiles · {editor.blocked.length} blocked</span>}</div>
          {solver.result && <div className="solver-stats"><span>{solver.result.status === 'solved' ? 'Route found' : solver.result.status === 'timeout' ? 'Time limit reached' : solver.result.status === 'unsolvable' ? 'No route' : 'Check your board'}</span><span>{solver.states.toLocaleString()} states · {(solver.result.duration / 1000).toFixed(3)}s</span></div>}
        </section>
      </div>
      <section className="how-it-works"><div><span className="step-number">01</span><h3>Start with a spark</h3><p>Begin at the mint tile marked S.</p></div><div><span className="step-number">02</span><h3>Leave no tile behind</h3><p>Move up, down, left or right. Visit each open tile once.</p></div><div><span className="step-number">03</span><h3>Finish with a flourish</h3><p>Reach the purple flag only after filling the board.</p></div></section>
    </main>
    <footer><span>Made for curious minds.</span><span>550 original puzzles <i>·</i> One satisfying idea</span><a href="https://github.com/linhtetaung-mm/one-fill-puzzle-solution" target="_blank" rel="noreferrer"><Code2 size={14}/> The original project <ArrowRight size={12}/></a></footer>
    <dialog ref={dialog} onCancel={() => setHelp(false)} onClose={() => { setHelp(false); helpButton.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) setHelp(false); }}><div className="dialog-heading"><span><BookOpen size={19}/> A guide to One Fill</span><button aria-label="Close guide" onClick={() => setHelp(false)}><X size={20}/></button></div><div className="dialog-body"><h2>One continuous line.</h2><p>Start at <b>S</b> and end at <b>F</b>. Visit every open tile exactly once using only horizontal or vertical moves. Blocked tiles are off limits.</p><h3>Make your move</h3><p>Tap neighboring tiles or drag across the board. Tap any tile in your line to shorten it. Use Undo to step back, or Reset to start over. With a keyboard, focus the start tile and use arrow keys to move; Enter or Space selects a tile.</p><h3>A hint when you need it</h3><p>Get a hint highlights the next tile on a valid continuation of your current line. If you have painted yourself into a corner, undo and ask again. Reveal shows a complete route from the original start. Assisted routes do not count toward collection completion.</p><h3>Your own little challenge</h3><p>In Create & solve, choose a board size, paint blocked tiles, and place your endpoints. Play it opens your creation as a game. Import and export share boards as JSON. Your editor and completed levels are saved in this browser when storage is available.</p><h3>Behind the line</h3><p>The solver is a refactor of Lin Htet Aung’s original Hamiltonian backtracking algorithm. It searches for a path from start to finish, rejecting branches with disconnected tiles, impossible neighbor counts, or incompatible checkerboard colors. It runs in a background worker. A time limit means the answer is still unknown; it does not prove a board impossible.</p></div><button className="primary dialog-done" onClick={() => setHelp(false)}>Let’s connect <ArrowRight size={16}/></button></dialog>
  </div>;
}
