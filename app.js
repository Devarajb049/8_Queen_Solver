/**
 * 8-Puzzle Solver Application Controller
 * Ultra-responsive, fully dynamic controller directly invoking solver.js.
 * All results, statistics, heuristic evaluations, and comparison tables
 * are dynamically calculated from the user's active puzzle state.
 */

/* global PuzzleSolver */

(function () {
  'use strict';

  // Application State
  const state = {
    initialState: [3, 1, 2, 4, 5, 6, 7, 8, 0], // Active initial puzzle configuration
    currentState: [3, 1, 2, 4, 5, 6, 7, 8, 0], // Current animated/scrubbed state
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
    // Header & Global Controls
    dom.themeToggle = document.getElementById('themeToggle');
    dom.backendBadgeText = document.getElementById('backendBadgeText');

    // Left Panel: Configuration & Presets
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
    dom.btnFixParity = document.getElementById('btnFixParity');

    // Center Panel: Solver & Simulation Stage
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

    // Right Panel: Card 2 (Actual Solution Results)
    dom.highlightActualMoves = document.getElementById('highlightActualMoves');
    dom.highlightActualMovesDesc = document.getElementById('highlightActualMovesDesc');
    dom.shootoutTableBody = document.getElementById('shootoutTableBody');
    dom.nodesChartBars = document.getElementById('nodesChartBars');
    dom.efficiencyBadge = document.getElementById('efficiencyBadge');
    dom.pruningNotice = document.getElementById('pruningNotice');
  }

  /**
   * Theme Manager (Dark / Light)
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('puzzle_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('puzzle_theme', next);
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

    // Automatically load, validate, and compute shootout on the new board
    loadAndSolvePuzzle(newState, false);
  }

  /**
   * Render Card 1: Heuristic Calculation Results Table
   * Dynamically calculates pre-search heuristic estimates h(n) from the active board state.
   */
  function renderHeuristicCalculationTable(boardState) {
    if (!dom.heuristicCalcTableBody || !PuzzleSolver.getHeuristicBreakdown) return;
    const breakdown = PuzzleSolver.getHeuristicBreakdown(boardState);
    if (!breakdown) return;

    dom.heuristicCalcTableBody.innerHTML = `
      <tr>
        <td><strong>${breakdown.misplaced.name}</strong> (${breakdown.misplaced.code})</td>
        <td><code class="calc-code">${breakdown.misplaced.calc}</code></td>
        <td class="text-right font-mono font-bold text-amber">${breakdown.misplaced.val}</td>
      </tr>
      <tr>
        <td><strong>${breakdown.manhattan.name}</strong> (${breakdown.manhattan.code})</td>
        <td><code class="calc-code">${breakdown.manhattan.calc}</code></td>
        <td class="text-right font-mono font-bold text-cyan">${breakdown.manhattan.val}</td>
      </tr>
      <tr class="highlight-row">
        <td><strong>${breakdown.enhanced.name}</strong> (${breakdown.enhanced.code})</td>
        <td><code class="calc-code">${breakdown.enhanced.calc}</code></td>
        <td class="text-right font-mono font-bold text-emerald">${breakdown.enhanced.val}</td>
      </tr>
    `;
  }

  /**
   * Render Card 2: Actual Solution Results Table & Comparison Chart
   * Displays the dynamically calculated empirical A* results (Initial h, Actual Moves g*, Nodes Explored, Discovered Nodes, Time).
   */
  function renderComparisonTableAndChart(results) {
    if (!results) return;

    const list = [
      { key: 'misplaced', label: 'Misplaced Tiles', code: 'h1', data: results.misplaced },
      { key: 'manhattan', label: 'Manhattan Distance', code: 'h2', data: results.manhattan },
      { key: 'enhanced', label: 'Enhanced Manhattan', code: 'h3', data: results.enhanced, isChampion: true }
    ];

    const mMoves = results.misplaced ? results.misplaced.moves : null;
    const manMoves = results.manhattan ? results.manhattan.moves : null;
    const enhMoves = results.enhanced ? results.enhanced.moves : null;

    // Dynamic Optimal Solution Display
    if (dom.highlightActualMoves && dom.highlightActualMovesDesc) {
      if (enhMoves === null) {
        dom.highlightActualMoves.textContent = 'No Solution Found';
        dom.highlightActualMovesDesc.innerHTML = 'A* search space exhausted without discovering a path to goal.';
      } else if (enhMoves === 0) {
        dom.highlightActualMoves.textContent = '0 Moves (Already Solved)';
        dom.highlightActualMovesDesc.innerHTML = 'The puzzle configuration is already in the target solved goal state.';
      } else {
        const allSame = (mMoves === manMoves && manMoves === enhMoves);
        dom.highlightActualMoves.textContent = `${enhMoves} Actual Moves`;

        if (allSame) {
          dom.highlightActualMovesDesc.innerHTML = `All three admissible heuristics found the exact same <strong>${enhMoves}-move</strong> optimal path (<em>g* = ${enhMoves}</em>).`;
        } else {
          dom.highlightActualMovesDesc.innerHTML = `Heuristics found different path costs: Misplaced (${mMoves}), Manhattan (${manMoves}), Enhanced (${enhMoves}).`;
        }
      }
    }

    // Populate Dynamic 6-Column Results Table
    if (dom.shootoutTableBody) {
      dom.shootoutTableBody.innerHTML = list.map(item => {
        const isActive = item.key === state.selectedHeuristic;
        const champBadge = item.isChampion ? ' <span class="mini-champion-badge">Best</span>' : '';
        const initialH = (item.data.initialH !== undefined && item.data.initialH !== null)
          ? item.data.initialH
          : '--';
        const moves = item.data.moves !== null ? item.data.moves : '--';
        const expanded = item.data.expanded !== undefined ? item.data.expanded.toLocaleString() : '--';
        const discovered = item.data.discovered !== undefined ? item.data.discovered.toLocaleString() : '--';
        const duration = item.data.durationMs !== undefined ? `${item.data.durationMs.toFixed(1)} ms` : '--';

        return `
          <tr class="${isActive ? 'active-row' : ''} ${item.isChampion ? 'highlight-row' : ''}">
            <td><strong>${item.label}</strong> (${item.code})${champBadge}</td>
            <td class="text-right font-mono font-bold">${initialH}</td>
            <td class="text-right font-mono font-bold text-accent">${moves}</td>
            <td class="text-right font-mono">${expanded}</td>
            <td class="text-right font-mono text-secondary">${discovered}</td>
            <td class="text-right font-mono">${duration}</td>
          </tr>
        `;
      }).join('');
    }

    // Comparison Chart for Nodes Explored
    if (dom.nodesChartBars) {
      const maxNodes = Math.max(...list.map(it => it.data.expanded || 0), 1);
      dom.nodesChartBars.innerHTML = list.map(item => {
        const val = item.data.expanded || 0;
        const widthPct = Math.max(6, (val / maxNodes) * 100);
        const isChamp = item.isChampion;
        const barClass = isChamp ? 'champion-bar' : (item.key === 'manhattan' ? 'mid' : 'dim');
        const badge = isChamp ? ' <span class="mini-champion-badge">Fewest Nodes</span>' : '';

        return `
          <div class="chart-bar-item">
            <div class="chart-bar-label">
              <span class="chart-bar-name"><strong>${item.label}</strong> (${item.code})${badge}</span>
              <span class="chart-bar-val font-mono font-bold">${val.toLocaleString()} nodes</span>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill ${barClass}" style="width: ${widthPct.toFixed(1)}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Dynamic Efficiency Badge & Pruning Notice
    if (dom.efficiencyBadge) {
      if (results.misplaced && results.enhanced && results.misplaced.expanded > 0) {
        const base = results.misplaced.expanded;
        const enh = results.enhanced.expanded;
        const saved = (((base - enh) / base) * 100).toFixed(1);
        dom.efficiencyBadge.textContent = `Enhanced Manhattan is Most Efficient (-${saved}% nodes)`;
      } else if (results.enhanced && results.enhanced.moves === 0) {
        dom.efficiencyBadge.textContent = 'Already Solved (0 nodes)';
      } else {
        dom.efficiencyBadge.textContent = 'Optimal Pruning';
      }
    }

    if (dom.pruningNotice) {
      if (results.misplaced && results.enhanced && results.misplaced.expanded > 0) {
        const base = results.misplaced.expanded;
        const enh = results.enhanced.expanded;
        const saved = (((base - enh) / base) * 100).toFixed(1);
        const vsMan = (results.manhattan && results.manhattan.expanded > 0)
          ? (((results.manhattan.expanded - enh) / results.manhattan.expanded) * 100).toFixed(1)
          : null;
        const vsManText = vsMan ? ` and <strong>${vsMan}%</strong> fewer than Manhattan Distance` : '';

        dom.pruningNotice.innerHTML = `<strong>Efficiency Analysis:</strong> Enhanced Manhattan explored only <strong>${enh.toLocaleString()} nodes</strong> (${saved}% fewer than Misplaced Tiles${vsManText}) to discover the <strong>${enhMoves}-move</strong> optimal solution.`;
      } else if (results.enhanced && results.enhanced.moves === 0) {
        dom.pruningNotice.innerHTML = '<strong>Goal State:</strong> The puzzle is currently in the solved arrangement (0 moves required).';
      } else {
        dom.pruningNotice.innerHTML = '';
      }
    }
  }

  /**
   * Main Dynamic Pipeline:
   * Validates puzzle, checks solvability, calculates heuristics, runs A* shootout,
   * updates all cards, tables, charts, and simulation state.
   */
  function loadAndSolvePuzzle(rawInput, autoAnimate = false) {
    pausePlayback();

    // 1. Validate Input
    const validation = PuzzleSolver.validateState(rawInput);
    if (!validation.valid) {
      showValidationMessage(validation.error, false);
      setExecutionStatus('unsolvable', 'Invalid Input', validation.error);
      clearResultsForInvalidState(validation.error);
      return;
    }

    const stateArr = validation.state;
    state.initialState = stateArr.slice();
    state.currentState = stateArr.slice();
    state.solutionPath = [];
    state.currentStepIndex = 0;
    state.shootoutResults = null;
    state.lastSingleResult = null;

    // Sync input field value
    if (dom.customInput && document.activeElement !== dom.customInput) {
      dom.customInput.value = state.initialState.join(' ');
    }

    // Render boards with new state
    renderBoard(dom.configBoard, state.currentState, true);
    renderBoard(dom.solverBoard, state.currentState, false);

    // Calculate Inversion Parity
    const inversions = PuzzleSolver.countInversions(state.initialState);
    const solvable = inversions % 2 === 0;

    if (dom.inversionText) {
      dom.inversionText.textContent = `${inversions} (${solvable ? 'Even' : 'Odd'})`;
    }

    if (dom.solvabilityStatus) {
      if (solvable) {
        dom.solvabilityStatus.className = 'solvable-tag solvable';
        dom.solvabilityStatus.textContent = '✓ Solvable';
        if (dom.btnFixParity) dom.btnFixParity.style.display = 'none';
      } else {
        dom.solvabilityStatus.className = 'solvable-tag unsolvable';
        dom.solvabilityStatus.textContent = '✕ Unsolvable';
        if (dom.btnFixParity) dom.btnFixParity.style.display = 'inline-flex';
      }
    }

    // Card 1: Always dynamically calculate initial heuristics (valid for all 3x3 states)
    renderHeuristicCalculationTable(state.initialState);

    // 2. Handle Unsolvable Configurations
    if (!solvable) {
      showValidationMessage(`Unsolvable: Inversions = ${inversions} (odd parity). Puzzle cannot reach goal.`, false);
      setExecutionStatus('unsolvable', 'Unsolvable', `Puzzle is mathematically unsolvable (${inversions} inversions, odd parity).`);
      
      if (dom.highlightActualMoves) dom.highlightActualMoves.textContent = 'Unsolvable';
      if (dom.highlightActualMovesDesc) {
        dom.highlightActualMovesDesc.innerHTML = `This configuration has an odd number of inversions (<em>${inversions}</em>). Due to permutation parity invariance, it cannot reach the goal state.`;
      }
      if (dom.shootoutTableBody) {
        dom.shootoutTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No solution path exists for an unsolvable configuration.</td></tr>';
      }
      if (dom.nodesChartBars) dom.nodesChartBars.innerHTML = '';
      if (dom.pruningNotice) dom.pruningNotice.innerHTML = '';
      if (dom.metricTotalMoves) dom.metricTotalMoves.textContent = '--';
      if (dom.metricCurrentStep) dom.metricCurrentStep.textContent = '0';
      if (dom.simulationSlider) {
        dom.simulationSlider.disabled = true;
        dom.simulationSlider.max = 0;
        dom.simulationSlider.value = 0;
      }
      if (dom.scrubberStepLabel) dom.scrubberStepLabel.textContent = 'Step 0 of 0';
      if (dom.scrubberPercentLabel) dom.scrubberPercentLabel.textContent = '0%';
      updatePlaybackControls();
      return;
    }

    // Solvable configuration
    showValidationMessage('Valid solvable configuration.', true);
    state.isSolving = true;
    updateSolveButtonState();

    // Show loading state across UI
    setExecutionStatus('solving', 'Solving...', 'Executing A* searches across all 3 heuristics...');
    if (dom.highlightActualMoves) dom.highlightActualMoves.textContent = 'Calculating...';
    if (dom.highlightActualMovesDesc) dom.highlightActualMovesDesc.textContent = 'Traversing state space with A* algorithm...';
    if (dom.shootoutTableBody) {
      dom.shootoutTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">Running A* graph search...</td></tr>';
    }

    // Run via setTimeout to ensure browser draws the loading state
    setTimeout(() => {
      try {
        // Execute shootout: runs A* for Misplaced, Manhattan, and Enhanced heuristics
        const results = PuzzleSolver.shootout(state.initialState);
        state.shootoutResults = results;

        const activeResult = results[state.selectedHeuristic] || results.enhanced;
        state.lastSingleResult = activeResult;
        state.solutionPath = activeResult.path || [];
        state.currentStepIndex = 0;

        // Render Card 2 comparison table & chart
        renderComparisonTableAndChart(results);

        // Update live step status bar
        if (dom.metricTotalMoves) dom.metricTotalMoves.textContent = activeResult.moves;
        if (dom.metricActiveHeuristic) dom.metricActiveHeuristic.textContent = activeResult.heuristicName;

        // Scrubber configuration
        if (dom.simulationSlider) {
          dom.simulationSlider.disabled = (state.solutionPath.length === 0);
          dom.simulationSlider.max = state.solutionPath.length;
          dom.simulationSlider.value = 0;
        }
        if (dom.scrubberStepLabel) {
          dom.scrubberStepLabel.textContent = `Step 0 of ${state.solutionPath.length}`;
        }
        if (dom.scrubberPercentLabel) {
          dom.scrubberPercentLabel.textContent = '0%';
        }

        if (activeResult.moves === 0) {
          setExecutionStatus('solved', 'Solved', 'Puzzle is already at the target goal state!');
        } else {
          setExecutionStatus('ready', 'Ready', `Optimal path found in ${activeResult.moves} moves. Click Start Solving or Step-by-Step.`);
        }

        updatePlaybackControls();

        // Auto animate if requested
        if (autoAnimate && state.solutionPath && state.solutionPath.length > 0) {
          startAutoPlay();
        }
      } catch (err) {
        console.error('Shootout error:', err);
        setExecutionStatus('unsolvable', 'Error', err.message || 'Search execution failed');
      } finally {
        state.isSolving = false;
        updateSolveButtonState();
      }
    }, 15);
  }

  function clearResultsForInvalidState(errorMsg) {
    if (dom.highlightActualMoves) dom.highlightActualMoves.textContent = 'Invalid Input';
    if (dom.highlightActualMovesDesc) dom.highlightActualMovesDesc.textContent = errorMsg;
    if (dom.heuristicCalcTableBody) dom.heuristicCalcTableBody.innerHTML = '';
    if (dom.shootoutTableBody) {
      dom.shootoutTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">${errorMsg}</td></tr>`;
    }
    if (dom.nodesChartBars) dom.nodesChartBars.innerHTML = '';
    if (dom.pruningNotice) dom.pruningNotice.innerHTML = '';
    if (dom.metricTotalMoves) dom.metricTotalMoves.textContent = '--';
    if (dom.inversionText) dom.inversionText.textContent = '--';
    if (dom.solvabilityStatus) {
      dom.solvabilityStatus.className = 'solvable-tag unsolvable';
      dom.solvabilityStatus.textContent = 'Invalid';
    }
  }

  /**
   * Fix Parity helper:
   * Swaps the first two non-zero tiles in the board, which flips parity by an odd number,
   * guaranteeing the new configuration is solvable!
   */
  function fixParity() {
    const arr = state.initialState.slice();
    const nonZeroIndices = [];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== 0) nonZeroIndices.push(i);
      if (nonZeroIndices.length === 2) break;
    }

    if (nonZeroIndices.length === 2) {
      const idx1 = nonZeroIndices[0];
      const idx2 = nonZeroIndices[1];
      const temp = arr[idx1];
      arr[idx1] = arr[idx2];
      arr[idx2] = temp;

      showValidationMessage('Parity corrected: Swapped tiles to make puzzle solvable.', true);
      loadAndSolvePuzzle(arr, false);
    }
  }

  function setExecutionStatus(type, status, bannerText = '') {
    if (dom.execIndicator) {
      dom.execIndicator.className = `exec-dot ${type}`;
    }
    if (dom.execStatusText) {
      dom.execStatusText.textContent = status;
    }
    if (dom.currentMoveBanner) {
      dom.currentMoveBanner.innerHTML = `<span class="banner-pulse"></span> ${bannerText || status}`;
    }
    if (dom.metricSolutionStatus) {
      dom.metricSolutionStatus.textContent = status;
    }
  }

  function updateSolveButtonState() {
    if (!dom.btnStartSolve) return;
    if (state.isSolving) {
      dom.btnStartSolve.disabled = true;
      dom.btnStartSolve.innerHTML = '<span class="status-pulse-dot" style="display:inline-block; margin-right:4px;"></span> Solving...';
    } else {
      dom.btnStartSolve.disabled = false;
      dom.btnStartSolve.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span>Start Solving</span>
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
    if (dom.btnStepByStep) dom.btnStepByStep.disabled = !hasPath || state.isPlaying;
    if (dom.btnPrevStep) dom.btnPrevStep.disabled = !hasPath || curr <= 0 || state.isPlaying;
    if (dom.btnNextStep) dom.btnNextStep.disabled = !hasPath || curr >= totalSteps || state.isPlaying;
    if (dom.btnAutoPlay) dom.btnAutoPlay.disabled = !hasPath || state.isPlaying;
    if (dom.btnPause) dom.btnPause.disabled = !state.isPlaying;
    if (dom.btnResetSim) dom.btnResetSim.disabled = !hasPath || curr === 0;

    // Center simulation bar step
    if (dom.metricCurrentStep) {
      dom.metricCurrentStep.textContent = curr;
    }

    // Move Banner
    if (dom.currentMoveBanner) {
      if (!hasPath) {
        dom.currentMoveBanner.innerHTML = '<span class="banner-pulse"></span> Ready to solve';
      } else if (curr === 0) {
        dom.currentMoveBanner.innerHTML = '<span class="banner-pulse"></span> Initial Configuration (Start)';
      } else if (curr === totalSteps) {
        dom.currentMoveBanner.innerHTML = `<span class="banner-pulse"></span> Goal Reached in ${totalSteps} Moves!`;
      } else {
        const step = state.solutionPath[curr - 1];
        dom.currentMoveBanner.innerHTML = `<span class="banner-pulse"></span> Move ${curr}: Blank moved ${step.move} (Tile ${step.movedTile})`;
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

    const movedTile = (state.solutionPath && index > 0)
      ? state.solutionPath[index - 1].movedTile
      : null;

    if (index === 0) {
      state.currentState = state.initialState.slice();
    } else {
      state.currentState = state.solutionPath[index - 1].state.slice();
    }

    renderBoard(dom.solverBoard, state.currentState, false, movedTile);
    updatePlaybackControls();
  }

  function nextStep() {
    if (!state.solutionPath || state.solutionPath.length === 0) {
      loadAndSolvePuzzle(state.initialState, false);
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
      loadAndSolvePuzzle(state.initialState, true);
      return;
    }

    // Rewind to start if at end
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
    // Theme Toggle
    if (dom.themeToggle) {
      dom.themeToggle.addEventListener('click', toggleTheme);
    }

    // Fix Parity Button
    if (dom.btnFixParity) {
      dom.btnFixParity.addEventListener('click', fixParity);
    }

    // Preset Action Buttons
    if (dom.btnDemoPuzzle) {
      dom.btnDemoPuzzle.addEventListener('click', () => {
        const p = PuzzleSolver.PRESET_PUZZLES.demo.state;
        loadAndSolvePuzzle(p, false);
      });
    }

    if (dom.btnBenchmarkPuzzle) {
      dom.btnBenchmarkPuzzle.addEventListener('click', () => {
        const p = PuzzleSolver.PRESET_PUZZLES.benchmark.state;
        loadAndSolvePuzzle(p, false);
      });
    }

    if (dom.btnDefaultPuzzle) {
      dom.btnDefaultPuzzle.addEventListener('click', () => {
        const p = PuzzleSolver.PRESET_PUZZLES.sample.state;
        loadAndSolvePuzzle(p, false);
      });
    }

    if (dom.btnRandomPuzzle) {
      dom.btnRandomPuzzle.addEventListener('click', () => {
        const rand = PuzzleSolver.generateRandomPuzzle(26);
        loadAndSolvePuzzle(rand, false);
      });
    }

    if (dom.btnResetBoard) {
      dom.btnResetBoard.addEventListener('click', () => {
        const goal = PuzzleSolver.GOAL.slice();
        loadAndSolvePuzzle(goal, false);
      });
    }

    // Manual custom input sequence
    if (dom.btnApplyCustom && dom.customInput) {
      const applyInput = () => {
        const val = dom.customInput.value;
        loadAndSolvePuzzle(val, false);
      };

      dom.btnApplyCustom.addEventListener('click', applyInput);
      dom.customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyInput();
      });
    }

    // Algorithm Selection Dropdown
    if (dom.algorithmSelect) {
      dom.algorithmSelect.addEventListener('change', (e) => {
        state.selectedHeuristic = e.target.value;
        if (dom.metricActiveHeuristic) {
          dom.metricActiveHeuristic.textContent = PuzzleSolver.HEURISTIC_MAP[state.selectedHeuristic].name;
        }

        if (state.shootoutResults) {
          const active = state.shootoutResults[state.selectedHeuristic] || state.shootoutResults.enhanced;
          state.lastSingleResult = active;
          state.solutionPath = active.path || [];
          state.currentStepIndex = 0;
          state.currentState = state.initialState.slice();

          renderBoard(dom.solverBoard, state.currentState, false);
          renderComparisonTableAndChart(state.shootoutResults);
          updatePlaybackControls();
        }
      });
    }

    // Main Start Solving Button (animates!)
    if (dom.btnStartSolve) {
      dom.btnStartSolve.addEventListener('click', () => {
        if (state.solutionPath && state.solutionPath.length > 0 && state.currentStepIndex >= state.solutionPath.length) {
          goToStep(0);
        }
        startAutoPlay();
      });
    }

    // Step-by-Step
    if (dom.btnStepByStep) dom.btnStepByStep.addEventListener('click', nextStep);

    // Auto Play / Pause / Step Controls
    if (dom.btnAutoPlay) dom.btnAutoPlay.addEventListener('click', startAutoPlay);
    if (dom.btnPause) dom.btnPause.addEventListener('click', pausePlayback);
    if (dom.btnPrevStep) dom.btnPrevStep.addEventListener('click', prevStep);
    if (dom.btnNextStep) dom.btnNextStep.addEventListener('click', nextStep);
    if (dom.btnResetSim) dom.btnResetSim.addEventListener('click', resetSimulation);

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
        startAutoPlay();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }

  // Initialize Application
  function init() {
    initTheme();
    cacheDOM();
    registerEvents();

    // Dynamically calculate and solve the initial default puzzle configuration
    loadAndSolvePuzzle(state.initialState, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
