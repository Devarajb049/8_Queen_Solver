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
    initialState: [1, 2, 3, 4, 0, 6, 7, 5, 8], // Default sample from proj.py
    currentState: [1, 2, 3, 4, 0, 6, 7, 5, 8],
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
    dom.btnDefaultPuzzle = document.getElementById('btnDefaultPuzzle');
    dom.btnBenchmarkPuzzle = document.getElementById('btnBenchmarkPuzzle');
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

    // Right Panel: Live Results
    dom.resultsStatusBadge = document.getElementById('resultsStatusBadge');
    dom.metricCurrentStep = document.getElementById('metricCurrentStep');
    dom.metricTotalMoves = document.getElementById('metricTotalMoves');
    dom.metricNodesExplored = document.getElementById('metricNodesExplored');
    dom.metricExecutionTime = document.getElementById('metricExecutionTime');
    dom.metricActiveHeuristic = document.getElementById('metricActiveHeuristic');
    dom.metricSolutionStatus = document.getElementById('metricSolutionStatus');
    dom.btnRunShootout = document.getElementById('btnRunShootout');
    dom.shootoutTableBody = document.getElementById('shootoutTableBody');
    dom.nodesChartBars = document.getElementById('nodesChartBars');
    dom.pruningNotice = document.getElementById('pruningNotice');
    dom.backendBadgeText = document.getElementById('backendBadgeText');
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
      const tileEl = document.createElement('div');
      tileEl.className = 'puzzle-tile';

      if (tileVal === 0) {
        tileEl.classList.add('blank-tile');
        tileEl.innerHTML = '<span>0</span>';
      } else {
        tileEl.textContent = tileVal;

        if (movedTile !== null && tileVal === movedTile) {
          tileEl.classList.add('tile-moved');
        }

        // Both boards allow tile clicking when not actively running
        const isAdjacent = Math.abs(row - blankRow) + Math.abs(col - blankCol) === 1;
        if (isAdjacent && !state.isPlaying && !state.isSolving) {
          tileEl.classList.add('slideable');
          tileEl.title = `Click to slide tile ${tileVal}`;
          tileEl.addEventListener('click', () => onTileSlide(i));
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

    // Metrics panel updates
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

    // Populate Metrics
    if (dom.metricTotalMoves) dom.metricTotalMoves.textContent = result.moves;
    if (dom.metricNodesExplored) dom.metricNodesExplored.textContent = result.expanded.toLocaleString();
    if (dom.metricExecutionTime) dom.metricExecutionTime.textContent = `${result.durationMs.toFixed(1)} ms`;
    if (dom.metricActiveHeuristic) dom.metricActiveHeuristic.textContent = result.heuristicName;

    if (result.moves === 0) {
      setExecutionStatus('solved', 'Solved', 'Puzzle is already at the goal state!');
    } else {
      setExecutionStatus('solved', 'Solved', `Optimal path: ${result.moves} moves (${result.expanded.toLocaleString()} nodes in ${result.durationMs.toFixed(1)} ms)`);
    }

    updateUI();
  }

  /**
   * Render Heuristics Comparison Table & Visual Bar Chart
   */
  function renderComparisonTableAndChart(results) {
    if (!results || !dom.shootoutTableBody) return;

    const list = [
      { key: 'enhanced', label: 'Enhanced Manhattan (h3)', data: results.enhanced },
      { key: 'manhattan', label: 'Manhattan Distance (h2)', data: results.manhattan },
      { key: 'misplaced', label: 'Misplaced Tiles (h1)', data: results.misplaced }
    ];

    dom.shootoutTableBody.innerHTML = list.map(item => {
      const isActive = item.key === state.selectedHeuristic;
      return `
        <tr class="${isActive ? 'active-row' : ''}">
          <td><strong>${item.label}</strong></td>
          <td>${item.data.moves}</td>
          <td>${item.data.expanded.toLocaleString()}</td>
          <td>${item.data.durationMs.toFixed(1)} ms</td>
        </tr>
      `;
    }).join('');

    // Render Bar Chart
    if (dom.nodesChartBars) {
      const maxNodes = Math.max(...list.map(it => it.data.expanded), 1);
      dom.nodesChartBars.innerHTML = list.map(item => {
        const val = item.data.expanded;
        const widthPct = Math.max(5, (val / maxNodes) * 100);
        const colorClass = item.key === 'enhanced' ? '' : (item.key === 'manhattan' ? 'mid' : 'dim');
        return `
          <div class="chart-bar-item">
            <div class="chart-bar-label">
              <span class="chart-bar-name">${item.label}</span>
              <span class="chart-bar-val">${val.toLocaleString()} nodes</span>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill ${colorClass}" style="width: ${widthPct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Pruning Notice
    if (dom.pruningNotice && results.misplaced && results.enhanced) {
      const base = results.misplaced.expanded;
      const enh = results.enhanced.expanded;
      if (base > 0) {
        const saved = (((base - enh) / base) * 100).toFixed(1);
        dom.pruningNotice.innerHTML = `<strong>Pruning:</strong> Enhanced Manhattan pruned <strong>${saved}%</strong> of node expansions compared to Misplaced Tiles.`;
      }
    }
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
        setExecutionStatus('ready', 'Default Sample Loaded', 'Click "Start Solving" to animate');
        showValidationMessage('Default puzzle loaded (2 moves to goal).', true);
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
        setExecutionStatus('ready', 'Random Solvable Puzzle', 'Generated 26 random valid moves from goal');
        showValidationMessage('Random solvable puzzle generated.', true);
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
        // If simulation already ran and is at the end, rewind to 0 first
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
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
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

  function checkBackend() {
    if (!dom.backendBadgeText) return;
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          dom.backendBadgeText.textContent = 'Python proj.py Backend Active';
        }
      })
      .catch(() => {
        dom.backendBadgeText.textContent = 'A* Engine Ready';
      });
  }

  // Initialize
  function init() {
    cacheDOM();
    registerEvents();
    updateUI();
    checkBackend();

    // Populate initial benchmark data without starting playback so user can press "Start Solving"
    startSolving(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
