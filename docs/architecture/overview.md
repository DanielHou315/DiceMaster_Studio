# Architecture Overview: DiceMaster Studio

DiceMaster Studio is a browser-based development environment for authoring and testing Python game strategies that run on the physical DiceMaster hardware — a six-faced die with an LCD screen on each face.

## Technology Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 6 + `@vitejs/plugin-react` |
| UI framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 (Vite plugin) |
| 3D rendering | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Python runtime | Pyodide 0.27.7 in a Web Worker |
| Local game DB | better-sqlite3 (`dice_lab.db`) via Express server |
| Asset storage | IndexedDB (`dicemaster` database, `games` object store) |
| Dev server | Express + Vite middleware (server.ts, port 3000) |
| AI features | Google Gemini via `@google/genai` |

## Key Source Locations

```
DiceMaster_Studio/
  server.ts               # Express server: REST API + Vite middleware + SQLite init
  vite.config.ts          # Vite config: React plugin, Tailwind, path alias @/
  public/
    pyodide-worker.js     # Web Worker: loads Pyodide, runs user Python strategies
    dice-0.1.0-py3-none-any.whl  # Custom `dice` Python package (hardware API shim)
    examples/             # 30+ pre-built game zips (chinese_quizlet, etc.)
  src/
    App.tsx               # Root component: tab routing, state, USB/serial wiring
    types.ts              # Shared TypeScript interfaces (ScreenContent, DiceScreens, etc.)
    constants.ts          # DEFAULT_BASE_CODE, CHINESE_QUIZLET_CODE, DICE_API_REFERENCE
    services/
      pyodideService.ts   # PyodideService class: manages Worker lifecycle & messages
      serialService.ts    # SerialService: Web Serial API for flashing physical dice
      assetStore.ts       # IndexedDB helpers: saveGame, loadGame, unpackZip, createBlobURLs
    components/
      Simulator/          # SimulatorScreen, Simulator2D, Simulator3DContainer
      Dice3D.tsx          # Three.js 3D dice model
      CSSDice3D.tsx       # Pure-CSS 3D die
      CanvasDice3D.tsx    # Canvas-based 3D die
      Editor/CodeEditor.tsx
      Games/              # GamesView, GameCard, GameContentEditor, ExamplesGallery
      Assets/             # AssetsView, AssetCard
      Settings/SettingsView.tsx
```

## Subsystems

### 1. Dev Server (server.ts)

`npm run dev` invokes `tsx server.ts`, which:

1. Opens (or creates) `dice_lab.db` with better-sqlite3.
2. Runs `CREATE TABLE IF NOT EXISTS` for four tables: `project_files`, `analysis_logs`, `language_games`, and `assets`.
3. Registers a REST API under `/api/` (see below).
4. Mounts Vite as Express middleware (in development) so the SPA and the API share port 3000.
5. In production (`NODE_ENV=production`), serves the pre-built `dist/` folder with `express.static`.

REST endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET/DELETE | `/api/project` | Read or clear uploaded project files |
| PUT | `/api/project/file` | Upsert a single file by path |
| POST | `/api/upload` | Accept a zip, extract, persist to `project_files` |
| POST | `/api/upload-preview` | Extract a zip and return files without persisting |
| GET/POST/PUT/DELETE | `/api/language-games[/:id]` | CRUD for saved games in `language_games` |
| GET/POST/DELETE | `/api/assets[/:id]` | CRUD for binary assets in `assets` |
| GET/POST/DELETE | `/api/logs` | Analysis log management |

### 2. Python Execution via Pyodide (pyodide-worker.js)

The virtual simulator runs Python code entirely in the browser using Pyodide — CPython compiled to WebAssembly. Execution happens inside a Web Worker so the UI thread stays responsive.

Startup sequence (triggered once by `PyodideService.init()`):

1. Worker imports Pyodide from CDN (`cdn.jsdelivr.net/pyodide/v0.27.7`).
2. `micropip.install()` loads `dice-0.1.0-py3-none-any.whl` — the `dice` Python package that shims the hardware API (`screen`, `motion`, `orientation`, `assets`, `log`).
3. `patchBridge()` replaces the bridge's default `send` function so `screen.set_text` calls read JSON layout files from the Emscripten virtual filesystem before forwarding structured `TextGroup` data to the main thread.
4. Worker posts `{ type: "status", status: "ready" }`.

Run sequence (triggered by the Run button):

1. Main thread calls `pyodideService.run(code)`.
2. Worker receives `{ type: "run", code }`, stops any running strategy via `STRATEGY_STOP` snippet, then executes `STRATEGY_RUNNER`.
3. `STRATEGY_RUNNER` compiles user code in a fresh namespace, finds the `BaseStrategy` subclass, instantiates it with `assets_path='/assets'`, and calls `start_strategy()`.
4. The strategy registers event callbacks (`motion.on_shake`, `orientation.on_change`). Those callbacks fire when the main thread posts `{ type: "motion.shake" }` or `{ type: "orientation.change" }`, routed through `sendEvent()` which calls `dice._bridge.receive()`.

Worker → main thread messages:

| type | Payload | Meaning |
|---|---|---|
| `status` | `status: SimStatus` | loading / ready / running / stopped / error |
| `screen.set_text` | `screen_id`, `texts[]`, `bg_color` | Update a face with structured text |
| `screen.set_image` | `screen_id`, `path` | Update a face with an image |
| `screen.set_gif` | `screen_id`, `path` | Update a face with an animated GIF |
| `log` | `message` | Console output from Python `log()` calls |
| `error` | `message`, `detail` | Python exception, last line extracted |

### 3. Virtual Dice UI

The physical die has six 480×480 LCD screens (one per face). Studio replicates each screen with `SimulatorScreen`, which:

- Renders at the native 480×480 hardware resolution and scales down to fit its container using `ResizeObserver` and CSS `transform: scale()`.
- For `screen.set_text` payloads, maps `font_id` values (0–5: notext, tf/unifont, arabic, chinese, cyrillic, devanagari) to pixel sizes and appropriate web fonts.
- Converts RGB565 color values (e.g., `"0xFFFF"`) to CSS `rgb()` via a bit-shift calculation in App.tsx (`rgb565ToCss`).
- Hardware screen IDs 1–6 map to faces: top, front, right, back, left, bottom (via `SCREEN_ID_TO_FACE`).

Two additional simulation views are available:

- **2D** (`Simulator2D`): flat six-face grid.
- **3D** (`Simulator3DContainer` / `Dice3D`): interactive Three.js cube with OrbitControls.

### 4. Game Storage

Games are stored in two places simultaneously:

**IndexedDB (`assetStore.ts`)**  
Game zip blobs keyed by name in the `dicemaster` / `games` store. This is the primary runtime store. On load, `unpackZip` extracts:
- `manifest.json` → `GameManifest` (name, description, strategy_name, version)
- `strategy.py` → Python source shown in the editor
- All other files → `Map<string, Uint8Array>` passed to Pyodide's Emscripten FS via `mountAssets`

Image files from the unpacked game are resolved to blob URLs (`createBlobURLs`) so `SimulatorScreen` can display them with `<img>`.

**SQLite (`dice_lab.db`)**  
Structured game metadata and code stored server-side by the Express API. The `language_games` table holds: name, description, code (Python source), mock_data (JSON), mock_rounds (JSON array of round snapshots), and assets_manifest. This table is used by `GamesView` to list and edit games without requiring a zip file.

### 5. Data Flow: Load Game → Python Runs → Screens Update

```
User clicks "Run"
  → App.tsx calls pyodideService.run(code)
    → Worker receives { type: "run", code }
      → STRATEGY_RUNNER executes user Python class
        → strategy.start_strategy() registers callbacks
          → orientation.on_change fires immediately (simulated)
            → Python calls screen.set_text(screen_id, "/assets/round_0_top.json")
              → bridge.send({ type: "screen.set_text", screen_id, path })
                → patchBridge intercept reads JSON from Emscripten FS
                  → enriched message posted to main thread
                    → App.tsx handler updates diceScreens[face]
                      → SimulatorScreen re-renders with new text layout
```

### 6. USB Flash (serialService.ts)

When a physical die is connected, `SerialService` uses the Web Serial API (115200 baud) to write Python files to the device using MicroPython REPL commands (`open()`, `write()`, `close()`), then resets the board with `machine.reset()`.

### 7. AI Features

The `GEMINI_API_KEY` environment variable (loaded from `.env.local`) is injected at build time by Vite's `define` block. The app uses `@google/genai` to generate new game strategies from a text prompt in `GamesView`.
