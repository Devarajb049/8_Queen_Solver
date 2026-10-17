
# 8-Puzzle Solver Using AI (Heuristic A* Search Shootout)
## College Mini Project Documentation

---

### 1. Title Page Details

| Field | Details |
| :--- | :--- |
| **Project Title** | 8-Puzzle Solver using Artificial Intelligence (Heuristic A* Search Shootout) |
| **Course Name** | Artificial Intelligence |
| **Student Name** | [name] |
| **Roll Number** | [roll no] |
| **Department** | Computer Science & Engineering |
| **College** | [college] |
| **Project Guide** | [professor name] |
| **Implementation Language** | Python 3 |
| **Algorithm Used** | A* Search Algorithm (Informed Best-First Search) |
| **Heuristics Evaluated** | 1. Misplaced Tiles ($h_1$)<br>2. Manhattan Distance ($h_2$)<br>3. Enhanced Manhattan with Linear Conflict ($h_3$) |
| **Output Interface** | Console / Command-Line Interface (CLI) |
| **Academic Year** | 2025 – 2026 |

---

### 2. Abstract
The 8-puzzle is a foundational benchmark in Artificial Intelligence used to study heuristic state-space search. It consists of eight numbered sliding tiles and one blank space arranged on a 3×3 grid, where the goal is to reach a designated target arrangement using minimum moves. This project implements a Python-based solver utilizing the A* Search algorithm to empirically compare three heuristic functions: Misplaced Tiles, Manhattan Distance, and an Enhanced Manhattan heuristic incorporating Linear Conflict. Mathematical solvability is validated prior to search via inversion parity to prevent infinite loops on unsolvable configurations. Experimental findings confirm that while all three heuristics find the optimal minimal-step path, the Enhanced Manhattan heuristic achieves superior pruning, eliminating up to 83.6% of node expansions compared to the Misplaced Tiles heuristic.

---

### 3. Problem Statement
The 8-puzzle problem consists of a $3 \times 3$ grid with eight numbered tiles (1 to 8) and a blank space (represented by 0). Tiles adjacent to the blank space can slide horizontally or vertically into the empty space.

Given an initial arrangement, the problem requires:
1. Verifying whether the initial configuration is mathematically solvable toward the target goal state:
   $$\text{Goal State} = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \\ 7 & 8 & \_ \end{bmatrix}$$
2. Finding the optimal (shortest) sequence of legal sliding moves to reach the goal state.
3. Quantifying and comparing the search efficiency of different heuristic functions in terms of path length, expanded nodes, and discovered nodes.

---

### 4. Objectives
- Formulate the 8-puzzle as a formal Artificial Intelligence state-space search problem.
- Implement an inversion-counting algorithm (`is_solvable`) to verify solvability in $O(N^2)$ time before initiating graph search.
- Implement the A* Search algorithm using Python's `heapq` priority queue and back-pointer path reconstruction.
- Code and benchmark three distinct heuristic functions:
  1. **Misplaced Tiles ($h_1$):** Counting tiles currently out of position.
  2. **Manhattan Distance ($h_2$):** Summing vertical and horizontal grid displacements to goal slots.
  3. **Enhanced Manhattan ($h_3$):** Manhattan distance plus non-overlapping (disjoint) linear conflicts.
- Display a performance comparison table and a step-by-step visual solution path in the terminal.

---

### 5. Tools and Technologies

| Component | Tool / Technology | Purpose |
| :--- | :--- | :--- |
| **Programming Language** | Python 3.x | Core language used for game logic, search, and heuristics. |
| **Algorithm Paradigm** | A* Graph Search | Informed best-first search algorithm optimizing $f(n) = g(n) + h(n)$. |
| **Standard Library: `heapq`** | Python `heapq` | Provides a binary min-heap for $O(\log V)$ priority queue operations. |
| **Standard Library: `itertools.count`** | Python `itertools` | Generates unique sequential integers as tie-breakers in the priority queue. |
| **Development Environment** | VS Code / Antigravity IDE | Script development, code execution, and testing. |
| **User Interface** | Console / CLI | Interactive command-line prompts, ASCII board display, and performance reports. |

---

### 6. Algorithm Explanation with Pseudocode

#### Algorithm Explanation (A* Search)
A* is an informed search algorithm that navigates a state space by evaluating candidate states using an evaluation function $f(n)$:

$$f(n) = g(n) + h(n)$$

Where:
- **$g(n)$**: The actual path cost from the start state to the current state $n$ (number of moves made so far).
- **$h(n)$**: The estimated heuristic cost from state $n$ to the goal.
- **$f(n)$**: The estimated total cost of the cheapest solution path passing through state $n$.

The algorithm maintains:
1. **Priority Queue (`queue`):** A min-heap storing tuples `(f, g, tie_breaker, state)` ordered by lowest $f(n)$.
2. **Cost Map (`best_g`):** A dictionary recording the lowest known $g$-cost to reach each state.
3. **Parent Map (`parent`):** A dictionary mapping `state -> (previous_state, move_taken)` for backtracking the optimal path.

#### A* Search Pseudocode
```text
Algorithm: AStar(start, heuristic)
Input: start state, heuristic function h
Output: (path, expanded_count, discovered_count)

1. Initialize queue as PriorityQueue
2. Push (h(start), 0, tie_breaker, start) into queue
3. Initialize parent[start] ← (None, None)
4. Initialize best_g[start] ← 0
5. expanded ← 0

6. WHILE queue is not empty DO
7.     Pop (f, g, _, current) with smallest f from queue
8.     
9.     IF g != best_g[current] THEN
10.        CONTINUE  // Outdated entry with inferior cost
11.    END IF
12.    
13.    IF current == GOAL THEN
14.        Reconstruct path by following parent pointers backward
15.        RETURN (path, expanded, length(best_g))
16.    END IF
17.    
18.    expanded ← expanded + 1
19.    
20.    FOR EACH (neighbor, move) IN GetNeighbors(current) DO
21.        new_g ← g + 1
22.        IF new_g < best_g.get(neighbor, ∞) THEN
23.            best_g[neighbor] ← new_g
24.            parent[neighbor] ← (current, move)
25.            new_f ← new_g + heuristic(neighbor)
26.            Push (new_f, new_g, next_tie, neighbor) into queue
27.        END IF
28.    END FOR
29. END WHILE

30. RETURN (None, expanded, length(best_g))
```

---

### 7. State Representation and Conflict-Checking Logic

#### State Representation
The 3×3 puzzle grid is modeled as an immutable **9-element tuple** of integers:
$$\text{state} = (s_0, s_1, s_2, s_3, s_4, s_5, s_6, s_7, s_8)$$
- Numbers `1` through `8` denote tiles; `0` denotes the blank slot.
- Tile coordinates are mapped using:
  $$\text{row} = \lfloor \text{index} / 3 \rfloor, \quad \text{col} = \text{index} \pmod 3$$
- The target state is defined as `GOAL = (1, 2, 3, 4, 5, 6, 7, 8, 0)`.

#### Solvability and Inversion Counting (`is_solvable`)
An inversion occurs when a tile with a higher number appears before a tile with a lower number in linear array order (ignoring the blank 0).
- Legal horizontal sliding moves change 0 inversions.
- Legal vertical sliding moves swap a tile with two others, altering inversions by 0, +2, or -2.
- Therefore, the parity of inversions is invariant. Since the goal state has 0 inversions (even), **an initial configuration is solvable if and only if its total inversion count is even**:
  $$\text{inversions} = \sum_{i < j, s_i \ne 0, s_j \ne 0} [s_i > s_j]$$
  $$\text{is\_solvable} = (\text{inversions} \pmod 2 == 0)$$

#### Conflict-Checking & Heuristics
1. **Misplaced Tiles ($h_1$):**
   $$h_1(\text{state}) = \sum_{i=0}^{8} [s_i \ne 0 \land s_i \ne \text{GOAL}[i]]$$
   Admissible because every misplaced tile must move at least once.

2. **Manhattan Distance ($h_2$):**
   $$h_2(\text{state}) = \sum_{\text{tile}=1}^{8} \left( |\text{row} - \text{goal\_row}| + |\text{col} - \text{goal\_col}| \right)$$
   Admissible because tiles cannot move diagonally. Strictly dominates $h_1$ ($h_2 \ge h_1$).

3. **Enhanced Manhattan ($h_3 = \text{Manhattan} + 2 \times \text{Disjoint Conflicts}$):**
   A **linear conflict** occurs when two tiles $t_1$ and $t_2$ belong in the same row (or column), are both currently situated in that row (or column), but their goal positions are reversed ($g_1 > g_2$). One tile must move out of the row into an adjacent row and return, adding at least **2 additional moves**.
   To preserve admissibility, only mutually exclusive (disjoint) pairs are added:
   $$h_3(\text{state}) = h_2(\text{state}) + 2 \times (\text{disjoint\_linear\_conflicts})$$
   $h_3$ dominates both $h_2$ and $h_1$ ($h_3 \ge h_2 \ge h_1$).

---

### 8. Code Explanation (Function by Function)

All functions present in [`proj.py`](file:///e:/8_Queen_Solver/proj.py) are explained below:

#### 1. `misplaced_tiles(state)`
- **Input:** 9-tuple representing the puzzle state.
- **Output:** Integer count of misplaced tiles.
- **Explanation:** Iterates over the state with `enumerate` and sums `1` for every tile where `tile != 0` and `tile != GOAL[i]`.

#### 2. `manhattan_distance(state)`
- **Input:** 9-tuple representing the puzzle state.
- **Output:** Total Manhattan distance across non-zero tiles.
- **Explanation:** Computes `(row, col) = divmod(i, 3)` for each tile $\ne 0$, retrieves `(goal_row, goal_col) = GOAL_POS[tile]`, and sums `abs(row - goal_row) + abs(col - goal_col)`.

#### 3. `enhanced_manhattan(state)`
- **Input:** 9-tuple representing the puzzle state.
- **Output:** Integer heuristic value ($h_2 + 2 \times \text{disjoint conflicts}$).
- **Explanation:** Computes base Manhattan distance. Checks all pairs in each row and column to identify tiles in their target row/column whose target indices are reversed. Disjoint pairs are greedily selected using a `used` set. Returns `distance + 2 * disjoint_count`.

#### 4. `is_solvable(state)`
- **Input:** 9-tuple representing the puzzle state.
- **Output:** Boolean (`True` if solvable, `False` otherwise).
- **Explanation:** Extracts non-zero tiles into `values`, counts pairs $(i, j)$ with $i < j$ and `values[i] > values[j]`, and verifies if `inversions % 2 == 0`.

#### 5. `get_neighbors(state)`
- **Input:** 9-tuple representing the puzzle state.
- **Output:** Generator yielding tuples of `(new_state, move_name)`.
- **Explanation:** Locates blank index with `state.index(0)`, tests moves in 4 directions (`Up`, `Down`, `Left`, `Right`), ensures indices remain within grid limits ($0 \le nr < 3, 0 \le nc < 3$), swaps blank with adjacent tile, and yields the resulting state.

#### 6. `astar(start, heuristic)`
- **Input:** Initial state tuple and heuristic function reference.
- **Output:** `(path, expanded, discovered)` tuple.
- **Explanation:** Executes the priority queue search using `heapq`. Skips outdated queue entries (`g != best_g.get(current)`), stops when reaching `GOAL`, and reconstructs the optimal move path via the `parent` pointer dictionary.

#### 7. `print_board(state)`
- **Input:** 9-tuple state.
- **Output:** None (prints formatted grid to stdout).
- **Explanation:** Slices the tuple into 3 rows of 3 numbers, printing `_` for 0 and numbers for other tiles.

#### 8. `main()`
- **Input:** User console input.
- **Output:** None.
- **Explanation:** Coordinates execution: displays header, prompts for user input (or defaults to sample), validates input and solvability, runs all 3 heuristics through `astar()`, displays the comparative performance table, and outputs step-by-step board configurations for the solution.

---

### 9. How to Run

#### Prerequisites
- Python 3.7 or higher installed on your computer.

#### Execution Steps
1. Open PowerShell or Command Prompt.
2. Navigate to the project directory:
   ```bash
   cd e:\8_Queen_Solver
   ```
3. Run the script:
   ```bash
   py proj.py
   # or
   python proj.py
   ```
4. **Sample Run:** Press **Enter** directly to evaluate the default puzzle:
   `1 2 3 4 0 6 7 5 8`
5. **Custom Puzzle Run:** Enter any 9 space-separated numbers (0 to 8), for example:
   `2 1 3 4 5 6 8 7 0`

---

### 10. Sample Output

Below is an actual console output from testing the program with a linear conflict configuration (`2 1 3 4 5 6 8 7 0`):

```text
==================================================
       8-PUZZLE HEURISTIC SHOOTOUT
==================================================
Enter 9 numbers from 0 to 8.
Use 0 for the blank space.
Example: 1 2 3 4 0 6 7 5 8
Enter puzzle (press Enter for sample): 2 1 3 4 5 6 8 7 0

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
Initial state:
2 1 3
4 5 6
8 7 _

Step 1: Move blank Up
2 1 3
4 5 _
8 7 6

... [intermediate steps 2 to 21] ...

Step 22: Move blank Down
1 2 3
4 5 6
7 8 _

Program completed.
Press Enter to close...
```

---

### 11. Time and Space Complexity Analysis

#### Theoretical Complexity
- **Time Complexity:** $O(b^d)$ in worst case, where $b$ is the branching factor ($b \approx 2$ to $3$) and $d$ is solution depth. A more informed heuristic reduces the effective branching factor $b^*$, bringing execution time closer to $O(d)$.
- **Space Complexity:** $O(b^d)$ because A* must store all visited and discovered states in `best_g` and the priority queue to prevent cycles and ensure optimality.

#### Comparison: A* Search vs. Breadth-First Search (BFS)

| Criterion | Breadth-First Search (Uninformed) | A* with Enhanced Manhattan (Informed) |
| :--- | :--- | :--- |
| **Search Guidance** | Blind exhaustive search across all levels | Guided by $f(n) = g(n) + h(n)$ directly toward goal |
| **Nodes Expanded (Depth 22)** | $> 100,000$ nodes | Only **1,487** nodes |
| **Optimality Guarantee** | Optimal (for uniform step costs) | Optimal (because $h_3$ is strictly admissible) |
| **Time Complexity** | $O(b^d)$ with $b \approx 3$ | $O(b^{*d})$ with effective $b^* \approx 1.3$ |
| **Memory Consumption** | Extremely high; risks memory exhaustion | Significantly reduced due to early branch pruning |

---

### 12. Results and Performance Shootout

A shootout was conducted across two distinct test cases to demonstrate heuristic dominance:

#### Test Case 1: Built-in Sample Puzzle (`1 2 3 4 0 6 7 5 8`, Depth 2)
| Heuristic | Moves | Expanded Nodes | Discovered Nodes |
| :--- | :---: | :---: | :---: |
| Misplaced Tiles | 2 | 2 | 7 |
| Manhattan Distance | 2 | 2 | 7 |
| Enhanced Manhattan | 2 | 2 | 7 |

#### Test Case 2: Linear Conflict Puzzle (`2 1 3 4 5 6 8 7 0`, Depth 22)
| Heuristic | Moves | Expanded Nodes | Discovered Nodes | Search Pruning vs Misplaced |
| :--- | :---: | :---: | :---: | :---: |
| **Misplaced Tiles ($h_1$)** | 22 | 9,055 | 13,885 | Baseline (0%) |
| **Manhattan Distance ($h_2$)** | 22 | 2,375 | 3,683 | 73.8% reduction |
| **Enhanced Manhattan ($h_3$)** | 22 | **1,487** | **2,329** | **83.6% reduction** |

#### Key Findings:
1. **Identical Solution Length:** All three heuristics discovered the exact same optimal path length (22 moves), verifying admissibility.
2. **Heuristic Dominance:** Because $h_3(n) \ge h_2(n) \ge h_1(n)$ for all states $n$, Enhanced Manhattan dominates the other two, expanding **6 times fewer nodes** than Misplaced Tiles and **37.4% fewer nodes** than standard Manhattan Distance.

---

### 13. Limitations
- **Memory Growth on Larger Boards:** Storing all states in `best_g` and `heapq` causes memory exhaustion on larger puzzles such as the 15-puzzle ($4 \times 4$) or 24-puzzle ($5 \times 5$).
- **Redundant Conflict Calculation:** In `enhanced_manhattan`, lines 46–79 count raw conflicts without using them, while lines 82–127 recompute the conflicting pairs for greedy disjoint selection.
- **Console-Only Interface:** The current implementation provides a text-only interface without mouse interactions or graphical animations.

---

### 14. Future Scope
- **Memory-Bounded Algorithms:** Implementing **IDA\*** (Iterative Deepening A\*) or **SMA\*** (Simplified Memory-Bounded A\*) to eliminate the exponential memory bottleneck and solve the 15-puzzle.
- **Pattern Databases:** Precomputing disjoint additive pattern databases to create even more dominant heuristics.
- **Graphical User Interface (GUI):** Developing a graphical desktop interface using Python's `tkinter` or `pygame` with animated tile sliding and playback speed controls.

---

### 15. Conclusion
This project designed, implemented, and benchmarked an intelligent 8-puzzle solver using the A* search algorithm in Python. Pre-checking solvability via inversion parity prevents wasted computation on impossible configurations. The heuristic shootout conclusively demonstrated the principle of heuristic dominance: augmenting Manhattan Distance with disjoint linear conflicts prunes up to 83.6% of the search space without sacrificing path optimality.

---

### 16. References
1. Russell, S., & Norvig, P. (2020). *Artificial Intelligence: A Modern Approach* (4th ed.). Pearson. (Chapters on Heuristic Search & A*).
2. Hansson, O., Mayer, A., & Kulzer, W. (1992). *Heuristic-Search Approaches to Board Games: Linear Conflict*. Advances in Computer Chess, 7.
3. Korf, R. E., & Taylor, L. A. (1996). *Finding optimal solutions to the twenty-four puzzle*. AAAI Proceedings.
4. Python Software Foundation. *heapq — Heap queue algorithm*. Python 3 Standard Library Documentation.

---

### 17. Viva-Voce Questions and Answers

**Q1: What conditions must a heuristic function satisfy for A* to guarantee an optimal solution?**  
**Answer:** A heuristic $h(n)$ must be **admissible** (it never overestimates the true cost to reach the goal, $h(n) \le h^*(n)$). For graph search where visited nodes are not reopened, it should also be **consistent** (monotonic), satisfying $h(n) \le c(n, a, n') + h(n')$.

**Q2: What is "Heuristic Dominance" and which heuristic dominates in our project?**  
**Answer:** If $h_a(n) \ge h_b(n)$ for all states $n$, and both are admissible, then $h_a$ **dominates** $h_b$. A dominating heuristic will never expand more nodes than a dominated one. In our project, Enhanced Manhattan ($h_3$) dominates Manhattan Distance ($h_2$), which dominates Misplaced Tiles ($h_1$).

**Q3: How does the solvability check work using inversion counting?**  
**Answer:** An inversion occurs when a larger tile precedes a smaller tile in row-major order (ignoring the blank). Horizontal sliding moves change 0 inversions, while vertical moves change inversions by 0, +2, or -2. Parity is invariant. Because the goal state has 0 inversions (even), any solvable initial state must also have an even number of inversions.

**Q4: What is a "Linear Conflict" and why does it add 2 moves?**  
**Answer:** A linear conflict occurs when two tiles are in their goal row (or column), but positioned in reverse order. One tile must move out of the line into an adjacent line and then move back to let the other tile pass, adding at least 2 moves (1 move away + 1 return move) not accounted for in standard Manhattan distance.

**Q5: Why did we use `itertools.count()` in the priority queue tuple?**  
**Answer:** In Python's `heapq`, tuples are compared element-by-element: `(f, g, tie, state)`. If two states have identical $f$ and $g$ values, Python compares the third element. `next(tie)` provides a strictly incrementing unique integer that resolves ties immediately, preventing Python from attempting to compare board tuples.

---

### Appendix: Complete Project Source Code (`proj.py`)

```python
import heapq
from itertools import count

GOAL = (1, 2, 3, 4, 5, 6, 7, 8, 0)

GOAL_POS = {
    tile: divmod(i, 3)
    for i, tile in enumerate(GOAL)
}


# 1. Misplaced Tiles Heuristic
def misplaced_tiles(state):
    return sum(
        1 for i, tile in enumerate(state)
        if tile != 0 and tile != GOAL[i]
    )


# 2. Manhattan Distance Heuristic
def manhattan_distance(state):
    distance = 0

    for i, tile in enumerate(state):
        if tile == 0:
            continue

        row, col = divmod(i, 3)
        goal_row, goal_col = GOAL_POS[tile]

        distance += (
            abs(row - goal_row)
            + abs(col - goal_col)
        )

    return distance


# 3. Student-designed Heuristic:
# Manhattan Distance + Linear Conflict
def enhanced_manhattan(state):
    distance = manhattan_distance(state)
    conflicts = 0

    # Check conflicts in rows
    for row in range(3):
        for c1 in range(3):
            for c2 in range(c1 + 1, 3):
                t1 = state[row * 3 + c1]
                t2 = state[row * 3 + c2]

                if t1 == 0 or t2 == 0:
                    continue

                g1 = GOAL_POS[t1]
                g2 = GOAL_POS[t2]

                if (g1[0] == row and g2[0] == row
                        and g1[1] > g2[1]):
                    conflicts += 1

    # Check conflicts in columns
    for col in range(3):
        for r1 in range(3):
            for r2 in range(r1 + 1, 3):
                t1 = state[r1 * 3 + col]
                t2 = state[r2 * 3 + col]

                if t1 == 0 or t2 == 0:
                    continue

                g1 = GOAL_POS[t1]
                g2 = GOAL_POS[t2]

                if (g1[1] == col and g2[1] == col
                        and g1[0] > g2[0]):
                    conflicts += 1

    # Disjoint conflicts are required for admissibility.
    # Use a greedy selection of non-overlapping conflicting tiles.
    pairs = []

    for row in range(3):
        for c1 in range(3):
            for c2 in range(c1 + 1, 3):
                t1 = state[row * 3 + c1]
                t2 = state[row * 3 + c2]

                if t1 == 0 or t2 == 0:
                    continue

                g1 = GOAL_POS[t1]
                g2 = GOAL_POS[t2]

                if (g1[0] == row and g2[0] == row
                        and g1[1] > g2[1]):
                    pairs.append((row * 3 + c1,
                                  row * 3 + c2))

    for col in range(3):
        for r1 in range(3):
            for r2 in range(r1 + 1, 3):
                t1 = state[r1 * 3 + col]
                t2 = state[r2 * 3 + col]

                if t1 == 0 or t2 == 0:
                    continue

                g1 = GOAL_POS[t1]
                g2 = GOAL_POS[t2]

                if (g1[1] == col and g2[1] == col
                        and g1[0] > g2[0]):
                    pairs.append((r1 * 3 + col,
                                  r2 * 3 + col))

    used = set()
    disjoint_count = 0

    for a, b in pairs:
        if a not in used and b not in used:
            used.add(a)
            used.add(b)
            disjoint_count += 1

    return distance + 2 * disjoint_count


# Check whether the puzzle can be solved
def is_solvable(state):
    values = [x for x in state if x != 0]

    inversions = sum(
        1
        for i in range(len(values))
        for j in range(i + 1, len(values))
        if values[i] > values[j]
    )

    return inversions % 2 == 0


# Generate neighboring puzzle states
def get_neighbors(state):
    blank = state.index(0)
    row, col = divmod(blank, 3)

    directions = [
        (-1, 0, "Up"),
        (1, 0, "Down"),
        (0, -1, "Left"),
        (0, 1, "Right")
    ]

    for dr, dc, move in directions:
        nr, nc = row + dr, col + dc

        if 0 <= nr < 3 and 0 <= nc < 3:
            new_pos = nr * 3 + nc
            new_state = list(state)

            new_state[blank], new_state[new_pos] = (
                new_state[new_pos],
                new_state[blank]
            )

            yield tuple(new_state), move


# A* Search Algorithm
def astar(start, heuristic):
    queue = []
    tie = count()

    heapq.heappush(
        queue,
        (heuristic(start), 0, next(tie), start)
    )

    parent = {start: (None, None)}
    best_g = {start: 0}
    expanded = 0

    while queue:
        f, g, _, current = heapq.heappop(queue)

        if g != best_g.get(current):
            continue

        if current == GOAL:
            path = []
            node = current

            while parent[node][0] is not None:
                previous, move = parent[node]
                path.append((node, move))
                node = previous

            path.reverse()

            return path, expanded, len(best_g)

        expanded += 1

        for neighbor, move in get_neighbors(current):
            new_g = g + 1

            if new_g < best_g.get(neighbor, float("inf")):
                best_g[neighbor] = new_g
                parent[neighbor] = (current, move)

                new_f = new_g + heuristic(neighbor)

                heapq.heappush(
                    queue,
                    (new_f, new_g, next(tie), neighbor)
                )

    return None, expanded, len(best_g)


# Display puzzle board
def print_board(state):
    for i in range(0, 9, 3):
        row = [
            "_" if x == 0 else str(x)
            for x in state[i:i + 3]
        ]
        print(" ".join(row))
    print()


# Main program
def main():
    print("=" * 50)
    print("       8-PUZZLE HEURISTIC SHOOTOUT")
    print("=" * 50)

    print("Enter 9 numbers from 0 to 8.")
    print("Use 0 for the blank space.")
    print("Example: 1 2 3 4 0 6 7 5 8")

    user_input = input(
        "Enter puzzle (press Enter for sample): "
    ).strip()

    if user_input == "":
        start = (1, 2, 3, 4, 0, 6, 7, 5, 8)
    else:
        try:
            start = tuple(
                int(x) for x in user_input.split()
            )
        except ValueError:
            print("Invalid input. Enter numbers only.")
            input("Press Enter to exit...")
            return

    if len(start) != 9 or set(start) != set(range(9)):
        print("Invalid puzzle. Use each number 0 to 8 once.")
        input("Press Enter to exit...")
        return

    if not is_solvable(start):
        print("This puzzle is not solvable.")
        input("Press Enter to exit...")
        return

    methods = [
        ("Misplaced Tiles", misplaced_tiles),
        ("Manhattan Distance", manhattan_distance),
        ("Enhanced Manhattan", enhanced_manhattan)
    ]

    results = []

    for name, heuristic in methods:
        path, expanded, discovered = astar(
            start, heuristic
        )

        results.append(
            (name, path, expanded, discovered)
        )

    print("\nGOAL STATE:")
    print_board(GOAL)

    print("PERFORMANCE COMPARISON")
    print("-" * 72)
    print(
        f"{'Heuristic':25} {'Moves':>8} "
        f"{'Expanded':>12} {'Discovered':>12}"
    )
    print("-" * 72)

    for name, path, expanded, discovered in results:
        moves = len(path) if path is not None else "N/A"

        print(
            f"{name:25} {moves:>8} "
            f"{expanded:>12} {discovered:>12}"
        )

    print("-" * 72)

    # Show solution using the student-designed heuristic
    best_path = results[2][1]

    print("\nSOLUTION PATH: Enhanced Manhattan")
    print("Initial state:")
    print_board(start)

    if best_path is not None:
        for step, (state, move) in enumerate(
            best_path, start=1
        ):
            print(f"Step {step}: Move blank {move}")
            print_board(state)

    print("Program completed.")
    input("Press Enter to close...")


if __name__ == "__main__":
    main()
```
