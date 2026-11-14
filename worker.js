/**
 * Web Worker for 8-Puzzle A* Search
 * Keeps the browser UI 100% smooth and responsive even during large state-space searches.
 */

/* global importScripts, PuzzleSolver */
self.importScripts('solver.js');

self.onmessage = function (e) {
  const { type, taskId, state, heuristic } = e.data;

  try {
    if (type === 'solve') {
      const result = PuzzleSolver.astar(state, heuristic);
      self.postMessage({
        type: 'solve_result',
        taskId,
        result
      });
    } else if (type === 'shootout') {
      const result = PuzzleSolver.shootout(state);
      self.postMessage({
        type: 'shootout_result',
        taskId,
        result
      });
    } else {
      self.postMessage({
        type: 'error',
        taskId,
        error: `Unknown worker action: ${type}`
      });
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      taskId,
      error: err.message || 'Worker computation error'
    });
  }
};

