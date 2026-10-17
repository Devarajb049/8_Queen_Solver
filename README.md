# 8-Puzzle Solver using AI (Heuristic A* Search Shootout)

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
3. **Enhanced Manhattan with Linear Conflict ($h_3$)**: Manhattan distance plus disjoint row and column linear conflicts. Adds +2 moves per conflict while preserving admissibility.

---

## 📊 Performance Shootout (Sample Results)

### Benchmark Puzzle: `2 1 3 4 5 6 8 7 0` (Solution Depth: 22 moves)

| Heuristic | Moves | Expanded Nodes | Discovered Nodes | Search Pruning vs $h_1$ |
| :--- | :---: | :---: | :---: | :---: |
| **Misplaced Tiles ($h_1$)** | 22 | 9,055 | 13,885 | Baseline (0%) |
| **Manhattan Distance ($h_2$)** | 22 | 2,375 | 3,683 | **73.8% reduction** |
| **Enhanced Manhattan ($h_3$)** | 22 | **1,487** | **2,329** | **83.6% reduction** |

*All three heuristics discover the exact same optimal 22-move path, but Enhanced Manhattan expands over 6x fewer nodes than Misplaced Tiles!*

---

## 🚀 How to Run

### Prerequisites
- Python 3.7+ installed.

### Steps
```bash
# Clone the repository
git clone https://github.com/Devarajb049/8_Queen_Solver.git
cd 8_Queen_Solver

# Run the solver
python proj.py
```

- Press **Enter** to run the built-in sample puzzle (`1 2 3 4 0 6 7 5 8`), or
- Enter any 9 space-separated numbers from `0` to `8` (e.g., `2 1 3 4 5 6 8 7 0`).

---

## 📁 Repository Contents
- [`proj.py`](proj.py): Complete Python implementation of the solver, heuristics, and visual output.
- [`DOCUMENTATION.md`](DOCUMENTATION.md): Full academic mini project documentation and report.
- [`DOCUMENTATION.pdf`](DOCUMENTATION.pdf): Formatted printable PDF version of the project documentation.
