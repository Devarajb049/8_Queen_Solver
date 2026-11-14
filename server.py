#!/usr/bin/env python3
"""
8-Puzzle Solver Web Application Server
Directly integrates with the existing proj.py algorithms and serves the modern UI.
Zero external dependencies required (uses standard library http.server).
"""

import http.server
import socketserver
import json
import time
import os
import sys

# Import the core algorithms directly from proj.py
try:
    from proj import (
        misplaced_tiles,
        manhattan_distance,
        enhanced_manhattan,
        is_solvable,
        astar,
        GOAL
    )
except ImportError as e:
    print(f"Warning: Could not import from proj.py: {e}")
    misplaced_tiles = None
    manhattan_distance = None
    enhanced_manhattan = None
    is_solvable = None
    astar = None
    GOAL = (1, 2, 3, 4, 5, 6, 7, 8, 0)

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

HEURISTIC_MAP = {
    'misplaced': ('Misplaced Tiles', misplaced_tiles),
    'manhattan': ('Manhattan Distance', manhattan_distance),
    'enhanced': ('Enhanced Manhattan', enhanced_manhattan)
}

class PuzzleRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            resp = {
                'status': 'ok',
                'backend': 'Python (proj.py)',
                'python_version': sys.version
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        # Serve static files as normal
        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/solve':
            self.handle_solve()
        elif self.path == '/api/shootout':
            self.handle_shootout()
        else:
            self.send_error(404, "Endpoint not found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def handle_solve(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)

            state = tuple(data.get('state', []))
            heuristic_key = data.get('heuristic', 'enhanced')

            if len(state) != 9 or set(state) != set(range(9)):
                self.send_json_response(400, {
                    'error': 'Invalid puzzle state. Expected 9 unique integers (0 to 8).'
                })
                return

            if not is_solvable(state):
                self.send_json_response(200, {
                    'solvable': False,
                    'error': 'This puzzle configuration is mathematically unsolvable.'
                })
                return

            if heuristic_key not in HEURISTIC_MAP:
                heuristic_key = 'enhanced'

            name, heuristic_fn = HEURISTIC_MAP[heuristic_key]

            t_start = time.perf_counter()
            path, expanded, discovered = astar(state, heuristic_fn)
            t_end = time.perf_counter()
            duration_ms = (t_end - t_start) * 1000

            formatted_path = []
            if path:
                for step_state, move in path:
                    formatted_path.append({
                        'state': list(step_state),
                        'move': move
                    })

            self.send_json_response(200, {
                'solvable': True,
                'path': formatted_path,
                'moves': len(formatted_path) if path else 0,
                'expanded': expanded,
                'discovered': discovered,
                'durationMs': duration_ms,
                'heuristicName': name,
                'heuristicKey': heuristic_key,
                'engine': 'Python proj.py'
            })

        except Exception as e:
            self.send_json_response(500, {'error': str(e)})

    def handle_shootout(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(body)

            state = tuple(data.get('state', []))

            if len(state) != 9 or set(state) != set(range(9)):
                self.send_json_response(400, {
                    'error': 'Invalid puzzle state.'
                })
                return

            if not is_solvable(state):
                self.send_json_response(200, {
                    'solvable': False,
                    'error': 'This puzzle configuration is mathematically unsolvable.'
                })
                return

            results = {}
            for h_key in ['misplaced', 'manhattan', 'enhanced']:
                name, fn = HEURISTIC_MAP[h_key]
                t_start = time.perf_counter()
                path, expanded, discovered = astar(state, fn)
                t_end = time.perf_counter()

                formatted_path = []
                if path:
                    for step_state, move in path:
                        formatted_path.append({
                            'state': list(step_state),
                            'move': move
                        })

                results[h_key] = {
                    'heuristicName': name,
                    'heuristicKey': h_key,
                    'moves': len(formatted_path) if path else 0,
                    'expanded': expanded,
                    'discovered': discovered,
                    'durationMs': (t_end - t_start) * 1000,
                    'path': formatted_path
                }

            base_expanded = results['misplaced']['expanded']
            for h_key in results:
                if base_expanded > 0:
                    red = ((base_expanded - results[h_key]['expanded']) / base_expanded) * 100
                    results[h_key]['pruningPercent'] = max(0.0, red)
                else:
                    results[h_key]['pruningPercent'] = 0.0

            self.send_json_response(200, {
                'solvable': True,
                'results': results,
                'engine': 'Python proj.py'
            })

        except Exception as e:
            self.send_json_response(500, {'error': str(e)})

    def send_json_response(self, code, payload):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode('utf-8'))


def main():
    with socketserver.TCPServer(("", PORT), PuzzleRequestHandler) as httpd:
        print("=" * 60)
        print(f" 8-Puzzle Solver Web Application Running at:")
        print(f" http://localhost:{PORT}")
        print(f" Directly powered by proj.py logic")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()


if __name__ == '__main__':
    main()
