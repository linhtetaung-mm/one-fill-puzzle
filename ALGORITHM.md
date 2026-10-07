# From a Hamiltonian cycle to the puzzle’s path

A solution is a sequence of all unblocked cells, starting at S and ending at F. Every consecutive pair must share an edge of the rectangular grid. No cell can repeat.

The old program creates a synthetic node connected to S and its inferred finish, then searches for a cycle through the augmented graph. Removing the synthetic node from such a cycle gives the puzzle path. The new solver searches for that path directly, with endpoints supplied by the board. It preserves the recursive neighbor search and undo step.

## What can safely prune a branch?

After a partial route, remove all already visited cells except its current endpoint. A completion must be a spanning path in this residual graph, from the current endpoint to F.

**Degrees.** A path’s endpoints need at least one incident residual edge. Every other residual vertex needs at least two. If any vertex fails this test, the branch has no completion.

**Connectivity.** If a breadth-first traversal from the current endpoint cannot reach every residual vertex, no single line can visit them all. The branch is impossible.

**Checkerboard parity.** Orthogonal grid edges always connect opposite colors. A path alternates colors. An even number of residual vertices requires equal color counts and opposite-colored endpoints. An odd number requires same-colored endpoints and exactly one extra vertex of the endpoint color. This test applies to the residual graph at every recursive step.

All three checks are necessary conditions. Passing them does not guarantee a solution. Failing any of them proves the particular branch cannot complete. The tests compare the pruned solver to an independent exhaustive solver to catch false pruning.

**Neighbor ordering.** Among the unvisited neighbors of the current endpoint, search those with fewer remaining choices first. This only reorders candidates; every candidate remains available for backtracking.

## Search and result semantics

Validate dimensions (2–12 per side), blocked cells, endpoint availability, and the optional prefix. Mark prefix cells visited. At each step, check whether every active cell is in the path. If so, succeed only at F. Otherwise reject arriving at F early, apply the necessary-condition checks, and recurse through legal candidates. On failure, pop the candidate and restore its visited flag.

- `solved`: includes the complete validated path.
- `unsolvable`: all legal branches exhausted or rejected by necessary conditions.
- `timeout`: the search budget expired; feasibility is unknown.
- `invalid`: the board or prefix breaks the input contract.

Hints pass the user’s line as the prefix and expose the next cell of a complete continuation. Reveal and studio solving start from S. Search state lives entirely in one invocation, independent of the UI. Each browser request gets a worker; changing the board, switching mode, or cancelling terminates it. Worker identity checks prevent stale results from affecting another session.

## Cost

Grid adjacency storage is O(V+E), with E at most 4V. The recursion and visited state are O(V). Connectivity and degree/parity checks take O(V+E) per explored state. Worst-case search is exponential, as in the original Hamiltonian backtracking solver. The implementation imposes a configurable time budget instead of claiming every arbitrary custom board is fast.
