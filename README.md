# One Fill

Every tile. One line. A React + TypeScript refactor of [Lin Htet Aung’s original One Fill puzzle](https://github.com/linhtetaung-mm/one-fill-puzzle-solution), following the play/editor structure of [Find Paths](https://github.com/linhtetaung-mm/find-paths-puzzle) and the visual direction of the newer puzzle collection.

## Run locally

Use Node.js 22.18+ (24+ recommended) and pnpm.

```sh
pnpm install
pnpm dev
```

Open the local address printed by Vite. For a production bundle, run `pnpm build`; serve `dist/` with any static host. `pnpm preview` previews that bundle. `pnpm lint` checks the application; `pnpm test` runs the independent solver verification suite. This project is implemented in `/Users/krown/Projects/oneline`.

## Play and create

- 550 original levels, migrated from `test2/levels.js`. The opening board is Level 16, the first 5×5 puzzle; the collection selector includes every original level in order.
- Click, tap, or drag from S toward F using orthogonal neighbors. Fill every open tile once; the finish must be last.
- Tap a visited tile to shorten the line, Undo a single move, or Reset the board. Keyboard users can focus S and use arrow keys; Enter/Space selects a tile.
- Hints calculate a full continuation of your current line. A dead end tells you to backtrack. Reveal searches afresh from S and animates the answer.
- Create & solve supports rectangular boards from 2×2 to 12×12, blocked tiles, explicit endpoints, custom play, solver replay, and JSON import/export.
- Editor and unassisted collection completions persist in browser storage. Switching tabs keeps both boards and paths. Searches and replays stop when switching modes or changing a board. Assisted finishes do not count as unassisted completion.
- Background worker searches have adjustable 10/30/60 second budgets and can be cancelled. Results distinguish solved, proven impossible, invalid input, and time limit reached.

## Algorithm changes

The original `HamiltonianCycle.findPath` algorithm is recursive neighbor-by-neighbor backtracking, with an extra vertex connecting the start and an inferred degree-one finish to close a cycle. That reduction is mathematically valid when the endpoints are known and the graph is constructed consistently. However, the old implementation infers the finish from degree-one cells, overwrites it when several exist, and has no reliable explicit finish for boards without one. Mutable global graph state and the adjacency matrix also couple the solver to the canvas.

The new solver retains the Hamiltonian search and backtracking idea but expresses the actual puzzle directly as a **Hamiltonian path with fixed endpoints**. Changes:

1. Explicit start and finish, no synthetic closing vertex.
2. Adjacency lists and constant-time visited flags, replacing a dense adjacency matrix and repeated whole-path scans.
3. Search only legal orthogonal unvisited neighbors, reserving the finish for the last step.
4. Reject residual graphs whose endpoints have no neighbor or whose interior vertices have fewer than two neighbors.
5. Reject disconnected residual graphs.
6. Reject incompatible checkerboard counts: even-length paths need equally many colors and opposite-colored endpoints; odd-length paths need same-colored endpoints with one extra vertex of that color.
7. Try the most constrained neighbor first. This changes search order without discarding legal solutions.
8. Accept an already drawn prefix, so hints continue the player’s actual route.
9. Run in a worker, report explored states, terminate immediately on cancellation, and keep timeouts separate from proofs of impossibility.

Worst-case search remains exponential. The pruning checks are necessary conditions, not a substitute for exhaustive search. Large custom boards can legitimately exceed the budget. Timeout checks happen every 256 states, so the budget is approximate; stopping the worker is immediate.

Implementation details and correctness reasoning: [ALGORITHM.md](./ALGORITHM.md).

## Verification

`tests/solver.test.ts` checks all 9,216 possible 3×3 boards with distinct ordered endpoints against a separate unpruned exhaustive implementation. It also solves and validates every one of the 550 migrated levels, tests continuation prefixes, invalid input, checkerboard-related impossibility, row-wrap prevention, and explicit timeout semantics.

The browser interface was checked for movement, undo, hints, custom editing, impossible-board results, complete solution replay, custom play, keyboard controls, help-dialog behavior, mobile overflow, JSON sharing, and browser persistence.

## Source layout

- `src/App.tsx`: collection, play/editor sessions, actions, and persistence.
- `src/puzzle/Board.tsx`: responsive board, SVG route, pointer capture, keyboard input.
- `src/puzzle/model.ts`: board format, validation, movement, and completion rules.
- `src/puzzle/solver.ts`: pure deterministic Hamiltonian path search.
- `src/puzzle/solver.worker.ts` and `useSolver.ts`: background computation and lifecycle.
- `src/puzzle/levels.json`: original boards; stored solutions are not used at runtime.
- `src/styles.css`: responsive collection UI.

The old project and its original puzzle data are credited to Lin Htet Aung. This refactor does not add or assume a license for the original source.
