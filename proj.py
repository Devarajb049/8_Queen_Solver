
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
