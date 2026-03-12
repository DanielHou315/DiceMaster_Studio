# Studio Pyodide Simulator Design

**Goal:** Replace the fake MOCK_SCREENS regex-based "simulator" with real Python execution via Pyodide in a Web Worker, using the `dice` web package from DiceMaster_Central_Web.

## Architecture

```
Main Thread (React)                    Web Worker (Pyodide)
─────────────────                      ────────────────────
Monaco Editor ──Run──▶ PyodideService  ──postMessage──▶  Pyodide runtime
                       │                                  │ imports dice pkg
Shake btn ────────────▶│ motion.shake  ──postMessage──▶  bridge.receive()
                       │                                  │ dispatches callbacks
screens state ◀────────│               ◀──postMessage──  bridge.send()
  │                                                       (screen.set_text etc)
Simulator2D/3D
```

## Message Protocol

### Worker → Main (from dice package bridge)
- `{type: "screen.set_text", screen_id, path}`
- `{type: "screen.set_image", screen_id, path}`
- `{type: "screen.set_gif", screen_id, path}`
- `{type: "log", message}`

### Main → Worker (control + simulated hardware events)
- `{type: "run", code}` — execute student Python code
- `{type: "stop"}` — teardown and halt
- `{type: "motion.shake", intensity}` — simulate shake
- `{type: "orientation.change", top, bottom}` — simulate orientation change

### Worker → Main (status)
- `{type: "status", status: "ready"|"running"|"stopped"}`
- `{type: "error", message}`

## Screen ID Mapping

Screen 1=top, 2=front, 3=right, 4=back, 5=left, 6=bottom.

## Files to Create

| File | Purpose |
|---|---|
| `public/pyodide-worker.js` | Web Worker: loads Pyodide, installs dice wheel, handles run/stop/events |
| `src/services/pyodideService.ts` | TypeScript service: manages worker lifecycle, translates bridge messages to React state |
| `public/dice-0.1.0-py3-none-any.whl` | Pre-built dice wheel from DiceMaster_Central_Web |

## Files to Modify

| File | Change |
|---|---|
| `src/App.tsx` | Wire `runCurrentCode` to PyodideService; wire `shakeDice` to send motion event; map screen messages to state |
| `src/constants.ts` | Replace M5Stack examples with `dice.*` API examples |

## Test Strategy

Load `pipeline_test` strategy in editor, click Run, verify screens update in 2D simulator via Playwright.
