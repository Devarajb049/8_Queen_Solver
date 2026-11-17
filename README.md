# 8-Puzzle Solver

An intelligent 8-Puzzle Solver implemented in Python using the **A* Search Algorithm**, comparing three different heuristic functions for search tree pruning.

---

## 📌 Project Overview
- **Problem**: 8-Puzzle sliding tile problem ($3 \times 3$ grid)
- **Algorithm**: A* Search with Priority Queue (`heapq`)
- **Goal State**:
  ```text
  1  2  3
  4  5  6
  7  8  _
  ```
- **Solvability Check**: Inversion parity calculation ($O(N^2)$) to detect unsolvable configurations before search.

---

## 🧠 Heuristics Compared
1. **Misplaced Tiles ($h_1$)**: Counts number of tiles out of position.
2. **Manhattan Distance ($h_2$)**: Sum of grid distances ($L_1$ norm) each tile must travel to its goal square.
3. **Enhanced Manhattan with Linear Conflict ($h_3$)**: Manhattan distance plus disjoint row and column linear conflicts (adapted from Hansson, Mayer and Yung, 1992). Adds +2 moves per conflict while preserving admissibility.

---

## 📊 Performance Shootout (Sample Results)

### Benchmark Puzzle: `2 1 3 4 5 6 8 7 0` (Solution Depth: 22 moves)

| Heuristic | Moves | Expanded Nodes | Discovered Nodes | Search Pruning vs $`h_1`$ |
| :--- | :---: | :---: | :---: | :---: |
| **Misplaced Tiles ($`h_1`$)** | 22 | 9,055 | 13,885 | Baseline (0%) |
| **Manhattan Distance ($`h_2`$)** | 22 | 2,375 | 3,683 | **73.8% reduction** |
| **Enhanced Manhattan ($`h_3`$)** | 22 | **1,487** | **2,329** | **83.6% reduction** |

*All three heuristics discover the exact same optimal 22-move path, but Enhanced Manhattan expands over 6x fewer nodes than Misplaced Tiles!*

---

## 💻 Sample Output

Terminal output when solving the benchmark puzzle (`2 1 3 4 5 6 8 7 0`):

```text
==================================================
       8-PUZZLE HEURISTIC SHOOTOUT
==================================================
Enter 9 numbers from 0 to 8 (separated by spaces or commas).
Use 0 for the blank space, or press Enter for the built-in sample.
Example: 1 2 3 4 0 6 7 5 8 (or 'q' to quit)
Enter puzzle: 2 1 3 4 5 6 8 7 0

GOAL STATE:
1 2 3
4 5 6
7 8 _

PERFORMANCE COMPARISON
------------------------------------------------------------------------
Heuristic                    Moves     Expanded   Discovered
------------------------------------------------------------------------
Misplaced Tiles                 22         9055        13885
Manhattan Distance              22         2375         3683
Enhanced Manhattan              22         1487         2329
------------------------------------------------------------------------

SOLUTION PATH: Enhanced Manhattan
Note: Moves describe the direction the blank space (0) slides.

Solution found in 22 moves:
Up -> Left -> Down -> Left -> Up -> Up -> Right -> Right -> Down -> Down -> Left -> Up -> Left -> Down -> Right -> Right -> Up -> Up -> Left -> Down -> Right -> Down

Initial state:
2 1 3
4 5 6
8 7 _

Step 1: Move blank Up
2 1 3
4 5 _
8 7 6

Step 2: Move blank Left
2 1 3
4 _ 5
8 7 6

... [Steps 3 to 21] ...

Step 22: Move blank Down
1 2 3
4 5 6
7 8 _

Program completed.
Press Enter to close...
```

---

## 🚀 How to Run

### Clone the Repository
```bash
git clone https://github.com/<username>/8-Puzzle-Solver.git
cd 8-Puzzle-Solver
```

### Option 1: Console / CLI Solver
```bash
# Run the interactive CLI solver
python proj.py
```
- Press **Enter** to run the built-in sample puzzle (`1 2 3 4 0 6 7 5 8`).
- Enter any 9 numbers separated by spaces or commas (e.g., `2 1 3 4 5 6 8 7 0` or `2, 1, 3, 4, 5, 6, 8, 7, 0`).
- If an invalid or unsolvable configuration is entered, the program reports the issue and prompts again.
- Type `q` at any prompt to quit.

### Option 2: Modern Interactive Web Application
- **Direct in Browser**: Double-click or open [`index.html`](index.html) directly in any modern web browser.
- **Live on GitHub Pages**: The entire web app runs client-side with zero dependencies, so it can be deployed directly via GitHub Pages (Settings → Pages → Branch: `main` → `/root`). Once enabled, visit `https://<username>.github.io/8_Queen_Solver/`.
- **With Python Web Server**:
  ```bash
  python server.py
  ```
  Open `http://localhost:8000` in your browser.
- **With Node.js Web Server**:
  ```bash
  node serve.js
  ```
  Open `http://localhost:3000` in your browser.

---

## 📁 Repository Contents
- [`proj.py`](proj.py): Complete Python implementation of the solver, heuristics, and console visual output.
- [`index.html`](index.html): Modern interactive web interface with responsive dashboard.
- [`styles.css`](styles.css): Minimalist stylesheet for the web interface.
- [`solver.js`](solver.js): Pure JavaScript algorithmic module matching `proj.py` search logic and heuristics.
- [`worker.js`](worker.js): Background Web Worker for non-blocking search in the browser.
- [`app.js`](app.js): Application controller for live interactive boards, animations, charts, and step navigation.
- [`server.py`](server.py): Zero-dependency Python HTTP server integrating directly with `proj.py`.
- [`serve.js`](serve.js): Lightweight Node.js static file server.
- [`DOCUMENTATION.md`](DOCUMENTATION.md): Full academic mini project documentation and report.
- [`DOCUMENTATION.pdf`](DOCUMENTATION.pdf): Formatted printable PDF version of the project documentation.

---

## 🏷️ GitHub Metadata Suggestions

- **About Description:**
  > An intelligent 8-Puzzle Solver in Python using A* search comparing Misplaced Tiles, Manhattan Distance, and Linear Conflict heuristics.
- **Topic Tags:**
  `python`, `artificial-intelligence`, `a-star-search`, `8-puzzle`, `heuristics`, `manhattan-distance`, `linear-conflict`, `state-space-search`, `search-algorithms`, `college-project`
