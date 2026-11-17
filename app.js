/**
 * 8-Puzzle Solver Application Controller
 * Ultra-responsive, bulletproof controller directly invoking solver.js
 * with smooth animations, step controls, and live empirical metrics.
 */

/* global PuzzleSolver */

(function () {
  'use strict';

  // Application State
  const state = {
    initialState: [3, 1, 2, 4, 5, 6, 7, 8, 0], // Default demo puzzle with Linear Conflict (16 moves)
    currentState: [3, 1, 2, 4, 5, 6, 7, 8, 0],
    selectedHeuristic: 'enhanced', // 'enhanced', 'manhattan', 'misplaced'
    solutionPath: [], // Array of { state, move, movedTile, g, h, f }
    currentStepIndex: 0,
    isPlaying: false,
    playInterval: null,
    playSpeedMs: 400,
    isSolving: false,
    shootoutResults: null,
    lastSingleResult: null
  };

  // DOM Elements Cache
  const dom = {};

  function cacheDOM() {
    // Left Panel: Configuration
    dom.configBoard = document.getElementById('configBoard');
    dom.btnDemoPuzzle = document.getElementById('btnDemoPuzzle');
    dom.btnBenchmarkPuzzle = document.getElementById('btnBenchmarkPuzzle');
    dom.btnDefaultPuzzle = document.getElementById('btnDefaultPuzzle');
    dom.btnRandomPuzzle = document.getElementById('btnRandomPuzzle');
    dom.btnResetBoard = document.getElementById('btnResetBoard');
    dom.customInput = document.getElementById('customInput');
    dom.btnApplyCustom = document.getElementById('btnApplyCustom');
    dom.validationMessage = document.getElementById('validationMessage');
    dom.inversionText = document.getElementById('inversionText');
    dom.solvabilityStatus = document.getElementById('solvabilityStatus');

    // Center Panel: Solver & Simulation
    dom.execIndicator = document.getElementById('execIndicator');
    dom.execStatusText = document.getElementById('execStatusText');
    dom.algorithmSelect = document.getElementById('algorithmSelect');
    dom.solverBoard = document.getElementById('solverBoard');
    dom.currentMoveBanner = document.getElementById('currentMoveBanner');
    dom.simulationSlider = document.getElementById('simulationSlider');
    dom.scrubberStepLabel = document.getElementById('scrubberStepLabel');
    dom.scrubberPercentLabel = document.getElementById('scrubberPercentLabel');
    dom.btnStartSolve = document.getElementById('btnStartSolve');
    dom.btnStepByStep = document.getElementById('btnStepByStep');
    dom.btnPrevStep = document.getElementById('btnPrevStep');
    dom.btnAutoPlay = document.getElementById('btnAutoPlay');
    dom.btnPause = document.getElementById('btnPause');
    dom.btnNextStep = document.getElementById('btnNextStep');
    dom.btnResetSim = document.getElementById('btnResetSim');
    dom.speedSelector = document.getElementById('speedSelector');

    // Center Panel: Live Step Status Bar
    dom.metricCurrentStep = document.getElementById('metricCurrentStep');
    dom.metricTotalMoves = document.getElementById('metricTotalMoves');
    dom.metricActiveHeuristic = document.getElementById('metricActiveHeuristic');
    dom.metricSolutionStatus = document.getElementById('metricSolutionStatus');

    // Right Panel: Card 1 (Heuristic Calculation Results)
    dom.heuristicCalcTableBody = document.getElementById('heuristicCalcTableBody');
    dom.linearConflictNote = document.getElementById('linearConflictNote');

    // Right Panel: Card 2 (Actual Solution Results)
    dom.highlightActualMoves = document.getElementById('highlightActualMoves');
    dom.highlightActualMovesDesc = document.getElementById('highlightActualMovesDesc');
    dom.shootoutTableBody = document.getElementById('shootoutTableBody');
    dom.nodesChartBars = document.getElementById('nodesChartBars');
    dom.efficiencyBadge = document.getElementById('efficiencyBadge');
    dom.pruningNotice = document.getElementById('pruningNotice');
    dom.resultsStatusBadge = document.getElementById('resultsStatusBadge');
    dom.btnRunShootout = document.getElementById('btnRunShootout');
  }

  /**
   * Render Board Helper
   * Allows interactive tile-clicking on both boards when simulation is idle.
   */
  function renderBoard(container, boardState, isConfig = false, movedTile = null) {
    if (!container) return;
    container.innerHTML = '';

    const blankIndex = boardState.indexOf(0);
    const blankRow = Math.floor(blankIndex / 3);
    const blankCol = blankIndex % 3;

    for (let i = 0; i < 9; i++) {
      const tileVal = boardState[i];
      const row = Math.floor(i / 3);
      const col = i % 3;
      const isAdjacent = Math.abs(row - blankRow) + Math.abs(col - blankCol) === 1;

      let tileEl;
      if (tileVal === 0) {
        tileEl = document.createElement('div');
        tileEl.className = 'puzzle-tile blank-tile';
        tileEl.setAttribute('aria-hidden', 'true');
        tileEl.innerHTML = '<span>0</span>';
      } else if (isAdjacent && !state.isPlaying && !state.isSolving) {
        tileEl = document.createElement('button');
        tileEl.type = 'button';
        tileEl.className = 'puzzle-tile slideable';
        tileEl.textContent = tileVal;
        tileEl.setAttribute('aria-label', `Slide tile ${tileVal}`);
        tileEl.title = `Click or press Enter/Space to slide tile ${tileVal}`;
        tileEl.addEventListener('click', () => onTileSlide(i));
        if (movedTile !== null && tileVal === movedTile) {
          tileEl.classList.add('tile-moved');
        }
      } else {
        tileEl = document.createElement('div');
        tileEl.className = 'puzzle-tile';
        tileEl.textContent = tileVal;
        tileEl.setAttribute('aria-label', `Tile ${tileVal}`);
        if (movedTile !== null && tileVal === movedTile) {
          tileEl.classList.add('tile-moved');
        }
      }

      container.appendChild(tileEl);
    }
  }

  /**
   * Interactive tile sliding
   */
  function onTileSlide(tileIndex) {
    if (state.isSolving || state.isPlaying) return;

    const blankIndex = state.currentState.indexOf(0);
    const tileRow = Math.floor(tileIndex / 3);
    const tileCol = tileIndex % 3;
    const blankRow = Math.floor(blankIndex / 3);
    const blankCol = blankIndex % 3;

    if (Math.abs(tileRow - blankRow) + Math.abs(tileCol - blankCol) !== 1) return;

    // Swap tile and blank
    const newState = state.currentState.slice();
    newState[blankIndex] = newState[tileIndex];
    newState[tileIndex] = 0;

    state.currentState = newState;
    state.initialState = newState.slice();
    state.solutionPath = [];
    state.currentStepIndex = 0;
    state.shootoutResults = null;
    state.lastSingleResult = null;

    updateUI();
    setExecutionStatus('ready', 'Tile Moved', 'Click "Start Solving" to solve from this state');
  }

  /**
   * Render Card 1: Heuristic Calculation Results Table
   * Displays dynamic pre-search heuristic estimates h(n)
   */
  function renderHeuristicCalculationTable(boardState) {
    if (!dom.heuristicCalcTableBody || !PuzzleSolver.getHeuristicBreakdown) return;
    const breakdown = PuzzleSolver.getHeuristicBreakdown(boardState);
    if (!breakdown) return;

    dom.heuristicCalcTableBody.innerHTML = `
      <tr>
        <td><strong>${breakdown.misplaced.name}</strong></td>
        <td><code class="calc-code">${breakdown.misplaced.calc}</code></td>
        <td class="text-right font-mono font-bold">${breakdown.misplaced.val}</td>
      </tr>
      <tr>
        <td><strong>${breakdown.manhattan.name}</strong></td>
        <td><code class="calc-code">${breakdown.manhattan.calc}</code></td>
        <td class="text-right font-mono font-bold">${breakdown.manhattan.val}</td>
      </tr>
      <tr class="highlight-row">
        <td><strong>${breakdown.enhanced.name}</strong></td>
        <td><code class="calc-code">${breakdown.enhanced.calc}</code></td>
        <td class="text-right font-mono font-bold text-accent">${breakdown.enhanced.val}</td>
      </tr>
    `;

    if (dom.linearConflictNote) {
      if (breakdown.enhanced.conflicts > 0) {
        dom.linearConflictNote.innerHTML = `<strong>Linear Conflict Detected:</strong> Found <strong>${breakdown.enhanced.conflicts}</strong> disjoint conflicting pair(s), adding <strong>+${breakdown.enhanced.conflicts * 2} bypass moves</strong> to Manhattan distance (Total h3 = ${breakdown.enhanced.val}).`;
      } else {
        dom.linearConflictNote.innerHTML = `<strong>No Linear Conflicts:</strong> No conflicting tiles in goal rows/columns. Enhanced Manhattan equals standard Manhattan distance (${breakdown.manhattan.val}).`;
      }
    }
  }

  /**
   * Render Card 2: Actual Solution Results Table & Comparison Chart
   * Displays the empirical A* search traversal results (Actual Moves g*, Nodes Explored, Time)
   */
  function renderComparisonTableAndChart(results) {
    if (!results) return;

    const list = [
      { key: 'misplaced', label: 'Misplaced Tiles', code: 'h1', data: results.misplaced },
      { key: 'manhattan', label: 'Manhattan Distance', code: 'h2', data: results.manhattan },
      { key: 'enhanced', label: 'Enhanced Manhattan', code: 'h3', data: results.enhanced, isChampion: true }
    ];

    // Highlight the actual solution moves (16) clearly
    const actualMoves = results.enhanced ? results.enhanced.moves : (results.manhattan ? results.manhattan.moves : 0);
    if (dom.highlightActualMoves) {
      dom.highlightActualMoves.textContent = `${actualMoves} Actual Moves`;
    }
    if (dom.highlightActualMovesDesc) {
      dom.highlightActualMovesDesc.innerHTML = `All 3 admissible heuristics find the exact same <strong>${actualMoves}-move</strong> optimal path (<em>g* = ${actualMoves}</em>).`;
    }

    // Populate Actual Solution Results Table
    if (dom.shootoutTableBody) {
      dom.shootoutTableBody.innerHTML = list.map(item => {
        const isActive = item.key === state.selectedHeuristic;
        const champBadge = item.isChampion ? ' <span class="mini-champion-badge">Best</span>' : '';
        return `
          <tr class="${isActive ? 'active-row' : ''} ${item.isChampion ? 'highlight-row' : ''}">
            <td><strong>${item.label}</strong>${champBadge}</td>
            <td class="text-right font-mono font-bold">${item.data.moves}</td>
            <td class="text-right font-mono">${item.data.expanded.toLocaleString()}</td>
            <td class="text-right font-mono">${item.data.durationMs.toFixed(1)} ms</td>
          </tr>
        `;
      }).join('');
    }

    // Comparison chart for nodes explored by all three heuristics
    if (dom.nodesChartBars) {
      const maxNodes = Math.max(...list.map(it => it.data.expanded), 1);
      dom.nodesChartBars.innerHTML = list.map(item => {
        const val = item.data.expanded;
        const widthPct = Math.max(8, (val / maxNodes) * 100);
        const isChamp = item.isChampion;
        const barClass = isChamp ? 'champion-bar' : (item.key === 'manhattan' ? 'mid' : 'dim');
        const badge = isChamp ? ' <span class="mini-champion-badge">Fewest Nodes</span>' : '';
        return `
          <div class="chart-bar-item ${isChamp ? 'champion-item' : ''}">
            <div class="chart-bar-label">
              <span class="chart-bar-name"><strong>${item.label}</strong>${badge}</span>
              <span class="chart-bar-val font-mono font-bold">${val.toLocaleString()} nodes</span>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill ${barClass}" style="width: ${widthPct.toFixed(1)}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Efficiency Pill / Banner
    if (dom.efficiencyBadge) {
      if (results.misplaced && results.enhanced && results.misplaced.expanded > 0) {
        const base = results.misplaced.expanded;
        const enh = results.enhanced.expanded;
        const saved = (((base - enh) / base) * 100).toFixed(1);
        dom.efficiencyBadge.textContent = `Enhanced Manhattan is Most Efficient (-${saved}% nodes)`;
      } else {
        dom.efficiencyBadge.textContent = 'Enhanced Manhattan is Most Efficient';
      }
    }

    // Efficiency & Pruning Detail Note
    if (dom.pruningNotice) {
      if (results.misplaced && results.enhanced && results.misplaced.expanded > 0) {
        const base = results.misplaced.expanded;
        const enh = results.enhanced.expanded;
        const saved = (((base - enh) / base) * 100).toFixed(1);
        const vsMan = results.manhattan && results.manhattan.expanded > 0
          ? (((results.manhattan.expanded - enh) / results.manhattan.expanded) * 100).toFixed(1)
          : null;
        const vsManText = vsMan ? ` and <strong>${vsMan}%</strong> fewer than Manhattan Distance` : '';
        dom.pruningNotice.innerHTML = `<strong>Efficiency Champion:</strong> Enhanced Manhattan explored only <strong>${enh.toLocaleString()} nodes</strong> (${saved}% fewer nodes than Misplaced Tiles${vsManText}) to discover the exact same <strong>${actualMoves}-move</strong> optimal solution.`;
      } else {
        dom.pruningNotice.innerHTML = '';
      }
    }
  }

  /**
   * Update full UI
   */
  function updateUI() {
    const movedTile = (state.solutionPath && state.currentStepIndex > 0)
      ? state.solutionPath[state.currentStepIndex - 1].movedTile
      : null;

    // Render both boards
    renderBoard(dom.configBoard, state.currentState, true);
    renderBoard(dom.solverBoard, state.currentState, false, movedTile);

    // Sync input field
    if (dom.customInput && document.activeElement !== dom.customInput) {
      dom.customInput.value = state.initialState.join(' ');
    }

    // Solvability & Parity
    const inversions = PuzzleSolver.countInversions(state.initialState);
    const isSolvable = PuzzleSolver.isSolvable(state.initialState);

    if (dom.inversionText) {
      dom.inversionText.textContent = `${inversions} (${inversions % 2 === 0 ? 'Even' : 'Odd'})`;
    }

    if (dom.solvabilityStatus) {
      if (isSolvable) {
        dom.solvabilityStatus.className = 'solvable-tag solvable';
        dom.solvabilityStatus.textContent = '✓ Solvable';
      } else {
        dom.solvabilityStatus.className = 'solvable-tag unsolvable';
        dom.solvabilityStatus.textContent = '✕ Unsolvable';
      }
    }

    // Card 1: Render Heuristic Calculation Breakdown for current initial state
    renderHeuristicCalculationTable(state.initialState);

    // Playback and step controls
    updatePlaybackControls();
  }

  function setExecutionStatus(type, status, bannerText = '') {
    if (dom.execIndicator) {
      dom.execIndicator.className = `exec-dot ${type}`;
    }
    if (dom.execStatusText) {
      dom.execStatusText.textContent = status;
    }
    if (dom.currentMoveBanner) {
      dom.currentMoveBanner.textContent = bannerText || status;
    }
    if (dom.metricSolutionStatus) {
      dom.metricSolutionStatus.textContent = status;
    }
    if (dom.resultsStatusBadge) {
      dom.resultsStatusBadge.textContent = status;
    }
  }

  function updateSolveButtonState() {
    if (!dom.btnStartSolve) return;
    if (state.isSolving) {
      dom.btnStartSolve.disabled = true;
      dom.btnStartSolve.innerHTML = '<span class="status-dot" style="display:inline-block; margin-right:4px;"></span> Solving...';
    } else {
      dom.btnStartSolve.disabled = false;
      dom.btnStartSolve.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Start Solving
      `;
    }
  }

  function updatePlaybackControls() {
    const hasPath = state.solutionPath && state.solutionPath.length > 0;
    const totalSteps = hasPath ? state.solutionPath.length : 0;
    const curr = state.currentStepIndex;

    // Scrubber
    if (dom.simulationSlider) {
      dom.simulationSlider.disabled = !hasPath;
      dom.simulationSlider.max = totalSteps;
      dom.simulationSlider.value = curr;
    }

    if (dom.scrubberStepLabel) {
      dom.scrubberStepLabel.textContent = `Step ${curr} of ${totalSteps}`;
    }

    if (dom.scrubberPercentLabel) {
      const pct = totalSteps > 0 ? Math.round((curr / totalSteps) * 100) : 0;
      dom.scrubberPercentLabel.textContent = `${pct}%`;
    }

    // Control buttons
    if (dom.btnStepByStep) dom.btnStepByStep.disabled = state.isPlaying;
    if (dom.btnPrevStep) dom.btnPrevStep.disabled = !hasPath || curr <= 0 || state.isPlaying;
    if (dom.btnNextStep) dom.btnNextStep.disabled = !hasPath || curr >= totalSteps || state.isPlaying;
    if (dom.btnAutoPlay) dom.btnAutoPlay.disabled = state.isPlaying;
    if (dom.btnPause) dom.btnPause.disabled = !state.isPlaying;
    if (dom.btnResetSim) dom.btnResetSim.disabled = !hasPath || curr === 0;

    // Center simulation bar step
    if (dom.metricCurrentStep) {
      dom.metricCurrentStep.textContent = curr;
    }

    // Move Banner
    if (dom.currentMoveBanner) {
      if (!hasPath) {
        dom.currentMoveBanner.textContent = 'State: Ready to solve';
      } else if (curr === 0) {
        dom.currentMoveBanner.textContent = 'Initial State (Start of solution)';
      } else if (curr === totalSteps) {
        dom.currentMoveBanner.textContent = `Goal Reached in ${totalSteps} Moves!`;
      } else {
        const step = state.solutionPath[curr - 1];
        dom.currentMoveBanner.textContent = `Move ${curr}: Blank moved ${step.move} (Tile ${step.movedTile})`;
      }
    }
  }

  /**
   * Run A* Search and automatically animate solution
   */
  function startSolving(autoAnimate = true) {
    if (state.isSolving) return;

    // Validation
    const validation = PuzzleSolver.validateState(state.initialState);
    if (!validation.valid) {
      showValidationMessage(validation.error, false);
      setExecutionStatus('unsolvable', 'Invalid Input', validation.error);
      return;
    }
    if (!validation.solvable) {
      showValidationMessage(validation.error, false);
      setExecutionStatus('unsolvable', 'Unsolvable', `Inversions: ${validation.inversions} (odd). Puzzle cannot be solved.`);
      return;
    }

    showValidationMessage('Valid solvable configuration.', true);
    pausePlayback();
    state.isSolving = true;
    updateSolveButtonState();

    const heuristicName = PuzzleSolver.HEURISTIC_MAP[state.selectedHeuristic].name;
    setExecutionStatus('solving', 'Solving...', `Searching with ${heuristicName}...`);

    // Run via setTimeout to ensure UI draws the "Solving..." status
    setTimeout(() => {
      try {
        // Run full shootout so all metrics and charts are populated with real empirical data
        const shootoutRes = PuzzleSolver.shootout(state.initialState);
        applyShootoutResult(shootoutRes);

        // Immediately start animating solution if autoAnimate is true
        if (autoAnimate && state.solutionPath && state.solutionPath.length > 0) {
          startAutoPlay();
        }
      } catch (err) {
        console.error('Solve error:', err);
        setExecutionStatus('unsolvable', 'Error', err.message || 'Search error');
      } finally {
        state.isSolving = false;
        updateSolveButtonState();
      }
    }, 25);
  }

  function applyShootoutResult(results) {
    state.shootoutResults = results;
    const active = results[state.selectedHeuristic] || results.enhanced;
    applySingleResult(active);
    renderComparisonTableAndChart(results);
  }

  function applySingleResult(result) {
    state.lastSingleResult = result;

    if (!result || !result.path) {
      setExecutionStatus('unsolvable', 'No Solution', 'Search space exhausted without finding goal.');
      return;
    }

    state.solutionPath = result.path;
    state.currentStepIndex = 0;
    state.currentState = state.initialState.slice();

    // Populate Center Simulation Metrics
    if (dom.metricTotalMoves) dom.metricTotalMoves.textContent = result.moves;
    if (dom.metricActiveHeuristic) dom.metricActiveHeuristic.textContent = result.heuristicName;

    if (result.moves === 0) {
      setExecutionStatus('solved', 'Solved', 'Puzzle is already at the goal state!');
      if (dom.pruningNotice) dom.pruningNotice.innerHTML = '';
    } else {
      setExecutionStatus('solved', 'Solved', `Optimal path: ${result.moves} moves (${result.expanded.toLocaleString()} nodes in ${result.durationMs.toFixed(1)} ms)`);
    }

    updateUI();
  }

  /**
   * Step Navigation & Playback Controls
   */
  function goToStep(index) {
    if (!state.solutionPath) return;
    const max = state.solutionPath.length;
    index = Math.max(0, Math.min(index, max));
    state.currentStepIndex = index;

    if (index === 0) {
      state.currentState = state.initialState.slice();
    } else {
      state.currentState = state.solutionPath[index - 1].state.slice();
    }

    updateUI();
  }

  function nextStep() {
    if (!state.solutionPath || state.solutionPath.length === 0) {
      startSolving(false);
      setTimeout(() => {
        if (state.solutionPath && state.solutionPath.length > 0) {
          goToStep(1);
        }
      }, 50);
      return;
    }

    if (state.currentStepIndex < state.solutionPath.length) {
      goToStep(state.currentStepIndex + 1);
    } else {
      pausePlayback();
    }
  }

  function prevStep() {
    if (state.currentStepIndex > 0) {
      goToStep(state.currentStepIndex - 1);
    }
  }

  function startAutoPlay() {
    if (!state.solutionPath || state.solutionPath.length === 0) {
      startSolving(true);
      return;
    }

    // Rewind to 0 if already at the end
    if (state.currentStepIndex >= state.solutionPath.length) {
      goToStep(0);
    }

    state.isPlaying = true;
    updatePlaybackControls();

    if (state.playInterval) clearInterval(state.playInterval);
    state.playInterval = setInterval(() => {
      if (state.currentStepIndex < state.solutionPath.length) {
        nextStep();
      } else {
        pausePlayback();
      }
    }, state.playSpeedMs);
  }

  function pausePlayback() {
    state.isPlaying = false;
    if (state.playInterval) {
      clearInterval(state.playInterval);
      state.playInterval = null;
    }
    updatePlaybackControls();
  }

  function resetSimulation() {
    pausePlayback();
    goToStep(0);
  }

  function showValidationMessage(msg, isSuccess) {
    if (!dom.validationMessage) return;
    dom.validationMessage.textContent = msg;
    dom.validationMessage.className = `validation-msg ${isSuccess ? 'success' : 'error'}`;
  }

  /**
   * Event Listeners Registration
   */
  function registerEvents() {
    // Preset Buttons
    if (dom.btnDemoPuzzle) {
      dom.btnDemoPuzzle.addEventListener('click', () => {
        pausePlayback();
        const p = PuzzleSolver.PRESET_PUZZLES.demo ? PuzzleSolver.PRESET_PUZZLES.demo.state : [3, 1, 2, 4, 5, 6, 7, 8, 0];
        state.initialState = p.slice();
        state.currentState = p.slice();
        state.solutionPath = [];
        state.currentStepIndex = 0;
        state.shootoutResults = null;
        updateUI();
        setExecutionStatus('ready', 'Demo Loaded', 'Linear conflict demo loaded (16 moves)');
        showValidationMessage('Demo puzzle loaded: 3 1 2 / 4 5 6 / 7 8 0 (16 optimal moves).', true);
        startSolving(false);
      });
    }

    if (dom.btnBenchmarkPuzzle) {
      dom.btnBenchmarkPuzzle.addEventListener('click', () => {
        pausePlayback();
        const p = PuzzleSolver.PRESET_PUZZLES.benchmark.state;
        state.initialState = p.slice();
        state.currentState = p.slice();
        state.solutionPath = [];
        state.currentStepIndex = 0;
        state.shootoutResults = null;
        updateUI();
        setExecutionStatus('ready', 'Benchmark Loaded', 'Depth 22 benchmark puzzle loaded');
        showValidationMessage('Benchmark puzzle loaded (22 optimal moves).', true);
        startSolving(false);
      });
    }

    if (dom.btnDefaultPuzzle) {
      dom.btnDefaultPuzzle.addEventListener('click', () => {
        pausePlayback();
        const p = PuzzleSolver.PRESET_PUZZLES.sample.state;
        state.initialState = p.slice();
        state.currentState = p.slice();
        state.solutionPath = [];
        state.currentStepIndex = 0;
        state.shootoutResults = null;
        updateUI();
        setExecutionStatus('ready', 'Sample Loaded', 'Click "Start Solving" to animate');
        showValidationMessage('Default puzzle loaded (2 moves to goal).', true);
        startSolving(false);
      });
    }

    if (dom.btnRandomPuzzle) {
      dom.btnRandomPuzzle.addEventListener('click', () => {
        pausePlayback();
        const rand = PuzzleSolver.generateRandomPuzzle(26);
        state.initialState = rand.slice();
        state.currentState = rand.slice();
        state.solutionPath = [];
        state.currentStepIndex = 0;
        state.shootoutResults = null;
        updateUI();
        setExecutionStatus('ready', 'Random Solvable Puzzle', 'Generated random valid moves from goal');
        showValidationMessage('Random solvable puzzle generated.', true);
        startSolving(false);
      });
    }

    if (dom.btnResetBoard) {
      dom.btnResetBoard.addEventListener('click', () => {
        pausePlayback();
        const goal = PuzzleSolver.GOAL.slice();
        state.initialState = goal.slice();
        state.currentState = goal.slice();
        state.solutionPath = [];
        state.currentStepIndex = 0;
        state.shootoutResults = null;
        updateUI();
        setExecutionStatus('ready', 'Goal State', 'Target solved configuration');
        showValidationMessage('Reset to solved goal state.', true);
        startSolving(false);
      });
    }

    // Manual custom input sequence
    if (dom.btnApplyCustom && dom.customInput) {
      const applyInput = () => {
        const val = dom.customInput.value;
        const res = PuzzleSolver.validateState(val);
        if (!res.valid) {
          showValidationMessage(res.error, false);
          return;
        }

        pausePlayback();
        state.initialState = res.state.slice();
        state.currentState = res.state.slice();
        state.solutionPath = [];
        state.currentStepIndex = 0;
        state.shootoutResults = null;
        updateUI();

        if (res.solvable) {
          showValidationMessage('Custom configuration loaded.', true);
          setExecutionStatus('ready', 'Custom Loaded', 'Ready to solve');
          startSolving(false);
        } else {
          showValidationMessage(res.error, false);
          setExecutionStatus('unsolvable', 'Unsolvable', res.error);
        }
      };

      dom.btnApplyCustom.addEventListener('click', applyInput);
      dom.customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyInput();
      });
    }

    // Algorithm selection dropdown
    if (dom.algorithmSelect) {
      dom.algorithmSelect.addEventListener('change', (e) => {
        state.selectedHeuristic = e.target.value;
        if (dom.metricActiveHeuristic) {
          dom.metricActiveHeuristic.textContent = PuzzleSolver.HEURISTIC_MAP[state.selectedHeuristic].name;
        }
        if (state.shootoutResults) {
          applyShootoutResult(state.shootoutResults);
        }
      });
    }

    // Main Start Solving Button (with auto-play animation!)
    if (dom.btnStartSolve) {
      dom.btnStartSolve.addEventListener('click', () => {
        if (state.solutionPath && state.solutionPath.length > 0 && state.currentStepIndex >= state.solutionPath.length) {
          goToStep(0);
        }
        startSolving(true);
      });
    }

    // Step-by-Step
    if (dom.btnStepByStep) {
      dom.btnStepByStep.addEventListener('click', () => {
        nextStep();
      });
    }

    // Auto Play / Pause
    if (dom.btnAutoPlay) dom.btnAutoPlay.addEventListener('click', startAutoPlay);
    if (dom.btnPause) dom.btnPause.addEventListener('click', pausePlayback);
    if (dom.btnPrevStep) dom.btnPrevStep.addEventListener('click', prevStep);
    if (dom.btnNextStep) dom.btnNextStep.addEventListener('click', nextStep);
    if (dom.btnResetSim) dom.btnResetSim.addEventListener('click', resetSimulation);
    if (dom.btnRunShootout) dom.btnRunShootout.addEventListener('click', () => startSolving(false));

    // Speed Selector
    if (dom.speedSelector) {
      dom.speedSelector.addEventListener('change', (e) => {
        state.playSpeedMs = parseInt(e.target.value, 10);
        if (state.isPlaying) {
          pausePlayback();
          startAutoPlay();
        }
      });
    }

    // Slider Scrubber
    if (dom.simulationSlider) {
      dom.simulationSlider.addEventListener('input', (e) => {
        pausePlayback();
        goToStep(parseInt(e.target.value, 10));
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'BUTTON') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (state.isPlaying) pausePlayback();
        else startAutoPlay();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        startSolving(true);
      }
    });
  }

  // Initialize
  function init() {
    cacheDOM();
    registerEvents();
    renderHeuristicCalculationTable(state.initialState);
    updateUI();

    // Populate initial comparison table and metrics quietly without marking state as solved
    try {
      const shootoutRes = PuzzleSolver.shootout(state.initialState);
      state.shootoutResults = shootoutRes;
      const active = shootoutRes[state.selectedHeuristic] || shootoutRes.enhanced;
      state.solutionPath = active.path || [];
      state.currentStepIndex = 0;
      state.currentState = state.initialState.slice();

      if (dom.metricTotalMoves) dom.metricTotalMoves.textContent = active.moves;
      if (dom.metricActiveHeuristic) dom.metricActiveHeuristic.textContent = active.heuristicName;

      renderComparisonTableAndChart(shootoutRes);
      updateUI();
    } catch (e) {
      console.warn('Initial search computation:', e);
    }

    setExecutionStatus('ready', 'Ready', 'Click "Start Solving" or "Step-by-Step" to solve');
    if (dom.resultsStatusBadge) dom.resultsStatusBadge.textContent = 'Ready';
    if (dom.currentMoveBanner) dom.currentMoveBanner.textContent = 'State: Ready to solve';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
