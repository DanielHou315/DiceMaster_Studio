# ADR-002: Pyodide for In-Browser Python Execution

## Status

Accepted

## Context

DiceMaster games are Python classes that subclass `dice.strategy.BaseStrategy` and interact with the physical hardware through a `dice` package API (`screen`, `motion`, `orientation`, `assets`, `log`). Students write these strategies to run on the actual device.

Studio needs a simulation environment where students can test their strategies without having physical hardware. The core requirement is that the same `.py` file a student runs on the die should run unmodified in the browser simulator. This rules out any approach that requires rewriting or transpiling the Python code.

The hardware API has specific behaviors that must be simulated faithfully:

- `screen.set_text(screen_id, path)` reads a JSON file from a local filesystem path and renders structured `TextGroup` data on the specified face.
- `motion.on_shake(callback)` calls a Python function when shake intensity exceeds a threshold.
- `orientation.on_change(callback)` fires when the die is placed with a new face up.
- All of these run asynchronously — the strategy registers callbacks and stays alive; it does not run to completion.

The `dice` package itself is distributed as a wheel (`dice-0.1.0-py3-none-any.whl`) that is served from the Studio `public/` directory. This means the shim package can be updated independently of Studio without redeploying the frontend.

## Decision

Use **Pyodide 0.27.7** (CPython compiled to WebAssembly) running inside a **Web Worker** (`public/pyodide-worker.js`). The Web Worker is managed by `PyodideService` (`src/services/pyodideService.ts`), a singleton that wraps the Worker with a typed message interface.

Startup sequence:

1. Worker imports Pyodide via `importScripts` from the jsDelivr CDN.
2. `micropip.install()` fetches and installs `dice-0.1.0-py3-none-any.whl` from the app's own origin.
3. `patchBridge()` replaces `dice._bridge`'s default `send` function with a Python closure that intercepts `screen.set_text` calls, reads the referenced JSON file from Pyodide's Emscripten virtual filesystem, and forwards the full `TextGroup` payload to the main thread.

Asset mounting: before running a strategy, the main thread calls `pyodideService.mountAssets(files)`, which posts a `{ type: "mountAssets", files }` message with transferable `ArrayBuffer`s. The worker writes these into Pyodide's Emscripten FS at `/assets/`, matching the path prefix expected by strategy code (`assets_path='/assets'`).

Strategy lifecycle: the worker executes a `STRATEGY_RUNNER` Python snippet that finds the `BaseStrategy` subclass in the user's namespace, instantiates it, and calls `start_strategy()`. The strategy stays alive. Shake and orientation events are injected via `sendEvent()`, which serializes event JSON into a Python global and calls `dice._bridge.receive()`.

The `PyodideService` class exposes:

- `init()` — creates the Worker and sends the `init` message
- `run(code)` — sends `{ type: "run", code }`
- `stop()` — sends `{ type: "stop" }`, triggers `stop_strategy()` + teardown
- `shake(intensity)` — simulates a physical shake event
- `setOrientation(top, bottom)` — simulates placing the die face-up
- `mountAssets(files)` — writes game assets into the virtual FS
- `onMessage(handler)` — subscribe to typed `WorkerMessage` events
- `destroy()` — terminates the Worker

## Consequences

**Positive:**

- The same `strategy.py` file that runs on the physical die runs in the browser without modification. No transpilation, no rewriting.
- Full CPython 3.x compatibility: `import os`, `import time`, `import random`, `import json` all work as expected.
- The Web Worker prevents Python execution from blocking the React UI thread. Long-running `while True` loops in the strategy do not freeze the editor or simulator.
- The `dice` package wheel can be versioned and updated independently of the frontend build.
- Pyodide's Emscripten FS gives Python code a real POSIX-style filesystem, so `open(path)` in strategy code works without any shims.

**Negative:**

- Pyodide's initial load is approximately 10 MB (the `pyodide.js` loader + the CPython Wasm binary). On a cold cache, this adds several seconds before the simulator is ready. Studio shows a `loading` status indicator while Pyodide initializes.
- The Web Worker cannot be reused across page reloads for cached module state — each page load triggers the full Pyodide init sequence again unless the CDN assets are browser-cached.
- Pyodide runs on a single Wasm thread. Strategies that use Python `threading` or `asyncio` may behave differently from the actual hardware's multi-threaded MicroPython environment.
- The CDN dependency (`cdn.jsdelivr.net`) means the simulator does not work offline unless the browser cache is warm.

## Alternatives Considered

**Backend Python server with WebSockets**  
Running Python on the server and streaming screen updates back over a WebSocket would give full CPython compatibility and avoid the 10 MB Wasm load. However, it requires a persistent backend process, adds network round-trip latency on every screen update, and makes the tool harder to deploy (no longer a static site). It also means strategies cannot run offline.

**Brython**  
Brython transpiles Python to JavaScript at runtime. It does not support the full Python standard library — notably `os.path`, `json`, and `time` all have gaps or incomplete behavior. The `dice` package's bridge code uses standard library features that Brython handles inconsistently. Not viable.

**Skulpt**  
Similar to Brython. Skulpt supports a subset of Python 2/3 but has an incomplete `os` module and no support for file I/O via a virtual filesystem. The `screen.set_text` path resolution pattern (reading JSON from `/assets/`) would require significant workarounds.

**Transpiling to JavaScript at save time**  
Tools like `py2js` exist but produce JavaScript that is not semantically equivalent to Python (different scoping, no generators, no `with` statements, incomplete exception model). Not suitable for educational code where students expect standard Python behavior.
