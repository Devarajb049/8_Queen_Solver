/**
 * 8-Puzzle Solver Algorithm Module
 * Faithful JavaScript implementation of proj.py
 * 
 * Heuristics:
 * 1. Misplaced Tiles (h1)
 * 2. Manhattan Distance (h2)
 * 3. Enhanced Manhattan with Linear Conflict (h3)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PuzzleSolver = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Target Goal State: 1 2 3 / 4 5 6 / 7 8 0
  const GOAL = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 0]);

  // Precomputed goal coordinates: tile -> [row, col]
  const GOAL_POS = Object.freeze({
    1: [0, 0], 2: [0, 1], 3: [0, 2],
    4: [1, 0], 5: [1, 1], 6: [1, 2],
    7: [2, 0], 8: [2, 1], 0: [2, 2]
  });

  /**
   * 1. Misplaced Tiles Heuristic (h1)
   * Counts number of non-blank tiles not in their goal position.
   */
  function misplacedTiles(state) {
    let count = 0;
    for (let i = 0; i < 9; i++) {
      const tile = state[i];
      if (tile !== 0 && tile !== GOAL[i]) {
        count++;
      }
    }
    return count;
  }

  /**
   * 2. Manhattan Distance Heuristic (h2)
   * Sum of vertical and horizontal displacements for all non-blank tiles.
   */
  function manhattanDistance(state) {
    let distance = 0;
    for (let i = 0; i < 9; i++) {
      const tile = state[i];
      if (tile === 0) continue;
      const row = Math.floor(i / 3);
      const col = i % 3;
      const [goalRow, goalCol] = GOAL_POS[tile];
      distance += Math.abs(row - goalRow) + Math.abs(col - goalCol);
    }
    return distance;
  }

  /**
   * 3. Enhanced Manhattan with Linear Conflict (h3)
   * Adapted from Hansson, Mayer and Yung (1992): Manhattan distance + 2 * disjoint linear conflicts.
   * Preserves admissibility while providing superior search pruning.
   */
  function enhancedManhattan(state) {
    const distance = manhattanDistance(state);
    const pairs = [];

    // Check conflicts in rows
    for (let row = 0; row < 3; row++) {
      for (let c1 = 0; c1 < 3; c1++) {
        for (let c2 = c1 + 1; c2 < 3; c2++) {
          const t1 = state[row * 3 + c1];
          const t2 = state[row * 3 + c2];
          if (t1 === 0 || t2 === 0) continue;

          const g1 = GOAL_POS[t1];
          const g2 = GOAL_POS[t2];

          // Both tiles belong in this row, but their horizontal order is inverted
          if (g1[0] === row && g2[0] === row && g1[1] > g2[1]) {
            pairs.push([row * 3 + c1, row * 3 + c2]);
          }
        }
      }
    }

    // Check conflicts in columns
    for (let col = 0; col < 3; col++) {
      for (let r1 = 0; r1 < 3; r1++) {
        for (let r2 = r1 + 1; r2 < 3; r2++) {
          const t1 = state[r1 * 3 + col];
          const t2 = state[r2 * 3 + col];
          if (t1 === 0 || t2 === 0) continue;

          const g1 = GOAL_POS[t1];
          const g2 = GOAL_POS[t2];

          // Both tiles belong in this column, but their vertical order is inverted
          if (g1[1] === col && g2[1] === col && g1[0] > g2[0]) {
            pairs.push([r1 * 3 + col, r2 * 3 + col]);
          }
        }
      }
    }

    // Disjoint conflicts: greedy selection of non-overlapping conflicting pairs
    const used = new Set();
    let disjointCount = 0;
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      if (!used.has(a) && !used.has(b)) {
        used.add(a);
        used.add(b);
        disjointCount++;
      }
    }

    return distance + 2 * disjointCount;
  }

  /**
   * Linear conflicts inspector (for UI educational visualization)
   * Returns details of row and column linear conflicts.
   */
  function inspectLinearConflicts(state) {
    const rowConflicts = [];
    const colConflicts = [];

    for (let row = 0; row < 3; row++) {
      for (let c1 = 0; c1 < 3; c1++) {
        for (let c2 = c1 + 1; c2 < 3; c2++) {
          const t1 = state[row * 3 + c1];
          const t2 = state[row * 3 + c2];
          if (t1 === 0 || t2 === 0) continue;
          const g1 = GOAL_POS[t1];
          const g2 = GOAL_POS[t2];
          if (g1[0] === row && g2[0] === row && g1[1] > g2[1]) {
            rowConflicts.push({ row, t1, t2, pos1: [row, c1], pos2: [row, c2] });
          }
        }
      }
    }

    for (let col = 0; col < 3; col++) {
      for (let r1 = 0; r1 < 3; r1++) {
        for (let r2 = r1 + 1; r2 < 3; r2++) {
          const t1 = state[r1 * 3 + col];
          const t2 = state[r2 * 3 + col];
          if (t1 === 0 || t2 === 0) continue;
          const g1 = GOAL_POS[t1];
          const g2 = GOAL_POS[t2];
          if (g1[1] === col && g2[1] === col && g1[0] > g2[0]) {
            colConflicts.push({ col, t1, t2, pos1: [r1, col], pos2: [r2, col] });
          }
        }
      }
    }

    return { rowConflicts, colConflicts };
  }

  /**
   * Count inversions in the puzzle state (ignoring blank tile 0).
   */
  function countInversions(state) {
    const values = [];
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== 0) values.push(state[i]);
    }

    let inversions = 0;
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        if (values[i] > values[j]) {
          inversions++;
        }
      }
    }
    return inversions;
  }

  /**
   * Check whether an 8-puzzle configuration is mathematically solvable.
   * For 3x3 grid, a state is solvable iff number of inversions is even.
   */
  function isSolvable(state) {
    return countInversions(state) % 2 === 0;
  }

  /**
   * Validate user input configuration.
   * Returns { valid: boolean, error: string|null, state: number[]|null }
   */
  function validateState(input) {
    let arr = null;
    if (Array.isArray(input)) {
      arr = input.map(Number);
    } else if (typeof input === 'string') {
      const tokens = input.trim().split(/[\s,]+/);
      if (tokens.length !== 9) {
        return {
          valid: false,
          error: `Expected 9 numbers, but found ${tokens.length}.`,
          state: null
        };
      }
      for (let i = 0; i < tokens.length; i++) {
        if (!/^\d+$/.test(tokens[i])) {
          return {
            valid: false,
            error: `Invalid token "${tokens[i]}". All entries must be integers from 0 to 8.`,
            state: null
          };
        }
      }
      arr = tokens.map(t => parseInt(t, 10));
    } else {
      return { valid: false, error: 'Invalid input format.', state: null };
    }

    if (arr.length !== 9 || arr.some(isNaN)) {
      return { valid: false, error: 'All 9 entries must be valid integers.', state: null };
    }

    const set = new Set(arr);
    if (set.size !== 9) {
      return { valid: false, error: 'Duplicate numbers detected. Each number 0-8 must appear exactly once.', state: null };
    }

    for (let i = 0; i <= 8; i++) {
      if (!set.has(i)) {
        return { valid: false, error: `Missing number ${i}. The puzzle requires numbers 0 through 8.`, state: null };
      }
    }

    const solvable = isSolvable(arr);
    const inversions = countInversions(arr);

    return {
      valid: true,
      solvable,
      inversions,
      error: solvable ? null : `Puzzle is mathematically unsolvable (${inversions} inversions, odd parity).`,
      state: arr
    };
  }

  /**
   * Generate valid neighboring puzzle states.
   * Moves the blank tile 0 in order: Up, Down, Left, Right.
   */
  function getNeighbors(state) {
    const blank = state.indexOf(0);
    const row = Math.floor(blank / 3);
    const col = blank % 3;

    const directions = [
      [-1, 0, 'Up'],
      [1, 0, 'Down'],
      [0, -1, 'Left'],
      [0, 1, 'Right']
    ];

    const neighbors = [];
    for (let i = 0; i < directions.length; i++) {
      const [dr, dc, move] = directions[i];
      const nr = row + dr;
      const nc = col + dc;

      if (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
        const newPos = nr * 3 + nc;
        const newState = state.slice();
        // Swap blank with adjacent tile
        newState[blank] = newState[newPos];
        newState[newPos] = 0;
        // Tile that was moved
        const movedTile = newState[blank];
        neighbors.push({
          state: newState,
          move,
          movedTile,
          blankFrom: blank,
          blankTo: newPos
        });
      }
    }
    return neighbors;
  }

  /**
   * Min-Heap Priority Queue for A* Search.
   * Compares tuples (f, g, tie, state) matching Python's heapq behavior.
   */
  class MinHeap {
    constructor() {
      this.heap = [];
    }

    push(item) {
      this.heap.push(item);
      this._bubbleUp(this.heap.length - 1);
    }

    pop() {
      if (this.heap.length === 0) return null;
      const top = this.heap[0];
      const last = this.heap.pop();
      if (this.heap.length > 0) {
        this.heap[0] = last;
        this._sinkDown(0);
      }
      return top;
    }

    get size() {
      return this.heap.length;
    }

    _compare(a, b) {
      if (a.f !== b.f) return a.f - b.f;
      if (a.g !== b.g) return a.g - b.g;
      return a.tie - b.tie;
    }

    _bubbleUp(i) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this._compare(this.heap[i], this.heap[p]) < 0) {
          const temp = this.heap[i];
          this.heap[i] = this.heap[p];
          this.heap[p] = temp;
          i = p;
        } else {
          break;
        }
      }
    }

    _sinkDown(i) {
      const len = this.heap.length;
      while ((i << 1) + 1 < len) {
        let left = (i << 1) + 1;
        let right = left + 1;
        let smallest = i;

        if (this._compare(this.heap[left], this.heap[smallest]) < 0) {
          smallest = left;
        }
        if (right < len && this._compare(this.heap[right], this.heap[smallest]) < 0) {
          smallest = right;
        }

        if (smallest !== i) {
          const temp = this.heap[i];
          this.heap[i] = this.heap[smallest];
          this.heap[smallest] = temp;
          i = smallest;
        } else {
          break;
        }
      }
    }
  }

  /**
   * Fast integer key representation for 3x3 puzzle state.
   */
  function encodeState(state) {
    let key = 0;
    for (let i = 0; i < 9; i++) {
      key = (key * 10) + state[i];
    }
    return key;
  }

  const GOAL_KEY = encodeState(GOAL);

  const HEURISTIC_MAP = {
    'misplaced': { name: 'Misplaced Tiles', fn: misplacedTiles, key: 'misplaced', code: 'h1' },
    'manhattan': { name: 'Manhattan Distance', fn: manhattanDistance, key: 'manhattan', code: 'h2' },
    'enhanced': { name: 'Enhanced Manhattan', fn: enhancedManhattan, key: 'enhanced', code: 'h3' }
  };

  /**
   * A* Search Algorithm
   * Identical to proj.py: astar(start, heuristic)
   */
  function astar(start, heuristicInput) {
    const startTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    let heuristicFn = enhancedManhattan;
    let heuristicName = 'Enhanced Manhattan';
    let heuristicKey = 'enhanced';

    if (typeof heuristicInput === 'function') {
      heuristicFn = heuristicInput;
      heuristicName = heuristicInput.name || 'Custom';
    } else if (typeof heuristicInput === 'string' && HEURISTIC_MAP[heuristicInput]) {
      heuristicFn = HEURISTIC_MAP[heuristicInput].fn;
      heuristicName = HEURISTIC_MAP[heuristicInput].name;
      heuristicKey = heuristicInput;
    }

    const startState = Array.from(start);
    const startKey = encodeState(startState);

    // Check if already at goal
    if (startKey === GOAL_KEY) {
      const endTime = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      return {
        path: [],
        expanded: 0,
        discovered: 1,
        moves: 0,
        durationMs: Math.max(0.01, endTime - startTime),
        heuristicName,
        heuristicKey,
        isGoalAlready: true
      };
    }

    const queue = new MinHeap();
    let tie = 0;

    const initialH = heuristicFn(startState);
    queue.push({
      f: initialH,
      g: 0,
      tie: tie++,
      state: startState,
      key: startKey
    });

    // Parent map: key -> { prevKey, move, movedTile, state, g, h, f }
    const parent = new Map();
    parent.set(startKey, {
      prevKey: null,
      move: null,
      movedTile: null,
      state: startState,
      g: 0,
      h: initialH,
      f: initialH
    });

    const bestG = new Map();
    bestG.set(startKey, 0);

    let expanded = 0;

    while (queue.size > 0) {
      const current = queue.pop();

      // Skip stale priority queue entries with inferior cost
      if (current.g !== bestG.get(current.key)) {
        continue;
      }

      // Goal test
      if (current.key === GOAL_KEY) {
        const path = [];
        let currKey = current.key;

        while (parent.get(currKey).prevKey !== null) {
          const entry = parent.get(currKey);
          path.push({
            state: entry.state,
            move: entry.move,
            movedTile: entry.movedTile,
            g: entry.g,
            h: entry.h,
            f: entry.f
          });
          currKey = entry.prevKey;
        }

        path.reverse();

        const endTime = (typeof performance !== 'undefined' && performance.now)
          ? performance.now()
          : Date.now();

        return {
          path,
          expanded,
          discovered: bestG.size,
          moves: path.length,
          durationMs: endTime - startTime,
          heuristicName,
          heuristicKey,
          solvable: true
        };
      }

      expanded++;

      const neighbors = getNeighbors(current.state);
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        const newG = current.g + 1;
        const nKey = encodeState(neighbor.state);

        const prevBest = bestG.get(nKey);
        if (prevBest === undefined || newG < prevBest) {
          bestG.set(nKey, newG);
          const hVal = heuristicFn(neighbor.state);
          const newF = newG + hVal;

          parent.set(nKey, {
            prevKey: current.key,
            move: neighbor.move,
            movedTile: neighbor.movedTile,
            state: neighbor.state,
            g: newG,
            h: hVal,
            f: newF
          });

          queue.push({
            f: newF,
            g: newG,
            tie: tie++,
            state: neighbor.state,
            key: nKey
          });
        }
      }
    }

    const endTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    return {
      path: null,
      expanded,
      discovered: bestG.size,
      moves: null,
      durationMs: endTime - startTime,
      heuristicName,
      heuristicKey,
      solvable: false
    };
  }

  /**
   * Run shootout comparing all 3 heuristics on the same puzzle.
   * Matches main() in proj.py.
   */
  function shootout(start) {
    const results = {};
    const heuristics = ['misplaced', 'manhattan', 'enhanced'];

    for (let i = 0; i < heuristics.length; i++) {
      const hKey = heuristics[i];
      const res = astar(start, hKey);
      results[hKey] = res;
    }

    // Calculate pruning percentages compared to Misplaced Tiles (h1)
    const baseExpanded = results.misplaced.expanded;
    for (let i = 0; i < heuristics.length; i++) {
      const hKey = heuristics[i];
      if (baseExpanded > 0) {
        const reduction = ((baseExpanded - results[hKey].expanded) / baseExpanded) * 100;
        results[hKey].pruningPercent = Math.max(0, reduction);
      } else {
        results[hKey].pruningPercent = 0;
      }
    }

    return results;
  }

  /**
   * Generate a random solvable puzzle configuration.
   * Uses valid random moves from the goal state to guarantee solvability.
   */
  function generateRandomPuzzle(steps = 25) {
    let state = Array.from(GOAL);
    let lastMove = null;

    const opposites = {
      'Up': 'Down',
      'Down': 'Up',
      'Left': 'Right',
      'Right': 'Left'
    };

    for (let step = 0; step < steps; step++) {
      const neighbors = getNeighbors(state);
      // Filter out immediate reverse moves when possible
      let valid = neighbors.filter(n => !lastMove || n.move !== opposites[lastMove]);
      if (valid.length === 0) valid = neighbors;
      const pick = valid[Math.floor(Math.random() * valid.length)];
      state = pick.state;
      lastMove = pick.move;
    }

    return state;
  }

  // Pre-configured academic sample puzzles
  const PRESET_PUZZLES = {
    'sample': {
      name: 'Default Sample (proj.py)',
      state: [1, 2, 3, 4, 0, 6, 7, 5, 8],
      depth: 2,
      description: 'The built-in sample puzzle from proj.py (2 moves from goal).'
    },
    'benchmark': {
      name: 'Academic Benchmark (Depth 22)',
      state: [2, 1, 3, 4, 5, 6, 8, 7, 0],
      depth: 22,
      description: 'Standard benchmark puzzle evaluated in the project documentation.'
    },
    'medium': {
      name: 'Intermediate Test (Depth 4)',
      state: [1, 2, 3, 5, 0, 6, 4, 7, 8],
      depth: 4,
      description: 'Moderate complexity problem demonstrating linear conflicts.'
    },
    'quick': {
      name: 'Quick Test (Depth 3)',
      state: [1, 2, 3, 0, 4, 6, 7, 5, 8],
      depth: 3,
      description: 'Short 3-move puzzle for instant stepping demonstrations.'
    },
    'goal': {
      name: 'Goal State',
      state: [1, 2, 3, 4, 5, 6, 7, 8, 0],
      depth: 0,
      description: 'Target solved state.'
    }
  };

  return {
    GOAL,
    GOAL_POS,
    HEURISTIC_MAP,
    PRESET_PUZZLES,
    misplacedTiles,
    manhattanDistance,
    enhancedManhattan,
    inspectLinearConflicts,
    countInversions,
    isSolvable,
    validateState,
    getNeighbors,
    astar,
    shootout,
    generateRandomPuzzle
  };
});

