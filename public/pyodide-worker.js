/* Pyodide Web Worker — runs user Python code with the dice package */

importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");

let pyodide = null;
let strategyRunning = false;

function patchBridge() {
  pyodide.runPython(`
from js import postMessage
from pyodide.ffi import to_js
from js import Object
import json as _json
import dice._bridge as _b

def _patched_post(message):
    """Intercept bridge messages to resolve file paths before sending to main thread."""
    msg_type = message.get("type", "")

    if msg_type == "screen.set_text":
        # Read JSON file from emscripten FS (mirrors real hardware TextGroup behavior)
        path = message.get("path", "")
        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = _json.load(f)
            # Send full structured TextGroup data matching hardware format
            enriched = dict(message)
            enriched["bg_color"] = payload.get("bg_color", "0x0000")
            enriched["texts"] = payload.get("texts", [])
            postMessage(to_js(enriched, dict_converter=Object.fromEntries))
        except Exception as e:
            # File not found or not JSON — send path as fallback text
            enriched = dict(message)
            enriched["texts"] = [{"x": 40, "y": 240, "font_name": "tf", "font_color": "0xFFFF", "text": str(path)}]
            enriched["bg_color"] = "0x0000"
            postMessage(to_js(enriched, dict_converter=Object.fromEntries))
            postMessage(to_js({"type": "log", "message": f"[set_text fallback] {path}: {e}"}, dict_converter=Object.fromEntries))
    else:
        postMessage(to_js(message, dict_converter=Object.fromEntries))

_b.get_bridge()._js_post = None  # Disable default to_js conversion
_b.get_bridge().send = lambda msg: _patched_post(msg)
`);
}

function sendEvent(msg) {
  if (!pyodide) return;
  try {
    const json = JSON.stringify(msg);
    pyodide.globals.set("__event_json__", json);
    pyodide.runPython(`
import json as _json, dice._bridge as _b
_b.get_bridge().receive(_json.loads(__event_json__))
`);
  } catch (err) {
    postMessage({ type: "log", message: "[sendEvent error] " + (err.message || String(err)) });
  }
}

async function init() {
  pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  const wheelUrl = self.location.origin + "/dice-0.1.0-py3-none-any.whl";
  await micropip.install(wheelUrl);
  pyodide.runPython("import dice");
  patchBridge();
  postMessage({ type: "status", status: "ready" });
}

const initPromise = init().catch((e) => {
  postMessage({ type: "error", message: "Init failed: " + e.message });
});

/*
 * Strategy lifecycle runner.
 * Runs user code, finds the BaseStrategy subclass, instantiates it,
 * and calls start_strategy(). The strategy stays alive (timers, callbacks)
 * until a "stop" message triggers stop_strategy() + teardown().
 */
const STRATEGY_RUNNER = `
import dice._runtime
import dice.strategy
import sys as _sys

# Teardown previous run
dice._runtime.teardown()

# Run user code in a fresh namespace
_ns = {}
_co = compile(__user_code__, "<user>", "exec")
_ev = eval  # indirect to avoid lint
_ev(_co, _ns)

# Find all BaseStrategy subclasses (excluding BaseStrategy itself)
_candidates = [
    v for v in _ns.values()
    if isinstance(v, type)
    and issubclass(v, dice.strategy.BaseStrategy)
    and v is not dice.strategy.BaseStrategy
]

if not _candidates:
    raise ValueError(
        "No BaseStrategy subclass found. Your code must define a class "
        "that inherits from dice.strategy.BaseStrategy with start_strategy() "
        "and stop_strategy() methods."
    )

# Use the last defined subclass (typically the one the student wrote)
_StrategyCls = _candidates[-1]

# Instantiate and start
_active_strategy = _StrategyCls(
    game_name=getattr(_StrategyCls, '_strategy_name', 'game'),
    config={},
    assets_path='/assets',
)
_active_strategy.start_strategy()

# Store reference so stop can find it
_sys.modules['__dice_active__'] = type(_sys)('__dice_active__')
_sys.modules['__dice_active__'].strategy = _active_strategy
`;

const STRATEGY_STOP = `
import sys as _sys
import dice._runtime

_mod = _sys.modules.get('__dice_active__')
if _mod and hasattr(_mod, 'strategy'):
    try:
        _mod.strategy.stop_strategy()
    except Exception:
        pass
    del _mod.strategy

dice._runtime.teardown()
`;

onmessage = async (e) => {
  await initPromise;
  const msg = e.data;

  if (msg.type === "run") {
    try {
      // Stop any previous strategy
      if (strategyRunning) {
        try { pyodide.runPython(STRATEGY_STOP); } catch (_) {}
      }
      patchBridge();
      postMessage({ type: "status", status: "running" });

      // Set user code as a global string, then run the strategy runner
      pyodide.globals.set("__user_code__", msg.code);
      await pyodide.runPythonAsync(STRATEGY_RUNNER);
      strategyRunning = true;

      // Don't post "stopped" — strategy stays alive via timers/callbacks
    } catch (err) {
      strategyRunning = false;
      // Extract the last meaningful line from the Python traceback
      const fullMsg = err.message || String(err);
      const lines = fullMsg.trim().split("\n");
      const lastLine = lines[lines.length - 1] || fullMsg;
      postMessage({ type: "error", message: lastLine, detail: fullMsg });
      postMessage({ type: "status", status: "stopped" });
    }
  } else if (msg.type === "stop") {
    try {
      pyodide.runPython(STRATEGY_STOP);
    } catch (_) {
      /* ignore */
    }
    strategyRunning = false;
    postMessage({ type: "status", status: "stopped" });
  } else if (msg.type === "mountAssets") {
    // msg.files: Array of [path, ArrayBuffer]
    const fs = pyodide.FS;
    const createdDirs = new Set();
    for (const [path, buffer] of msg.files) {
      // Ensure parent directories exist
      const parts = path.split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        const dir = "/" + parts.slice(0, i).join("/");
        if (!createdDirs.has(dir)) {
          try { fs.mkdir(dir); } catch (_) { /* exists */ }
          createdDirs.add(dir);
        }
      }
      fs.writeFile("/" + path, new Uint8Array(buffer));
    }
    // Assets mounted successfully — no status change needed
  } else if (msg.type === "motion.shake" || msg.type === "orientation.change") {
    sendEvent(msg);
  }
};
