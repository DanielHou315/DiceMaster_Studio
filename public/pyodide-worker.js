/* Pyodide Web Worker — runs user Python code with the dice package */

importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");

let pyodide = null;

function patchBridge() {
  pyodide.runPython(`
import dice._bridge as _b
_bridge = _b.get_bridge()
_bridge._js_post = lambda msg: __import__('js').postMessage(msg)
`);
}

function sendEvent(msg) {
  try {
    const json = JSON.stringify(msg);
    pyodide.globals.set("__event_json__", json);
    pyodide.runPython(`
import json as _json, dice._bridge as _b
_b.get_bridge().receive(_json.loads(__event_json__))
del __event_json__
`);
  } catch (_) {
    /* ignore — no handler registered */
  }
}

async function init() {
  pyodide = await loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("/dice-0.1.0-py3-none-any.whl");
  pyodide.runPython("import dice");
  patchBridge();
  postMessage({ type: "status", status: "ready" });
}

const initPromise = init().catch((e) => {
  postMessage({ type: "error", message: "Init failed: " + e.message });
});

onmessage = async (e) => {
  await initPromise;
  const msg = e.data;

  if (msg.type === "run") {
    try {
      pyodide.runPython("import dice._runtime; dice._runtime.teardown()");
      patchBridge();
      postMessage({ type: "status", status: "running" });
      await pyodide.runPythonAsync(msg.code);
      postMessage({ type: "status", status: "stopped" });
    } catch (err) {
      postMessage({ type: "error", message: err.message });
    }
  } else if (msg.type === "stop") {
    try {
      pyodide.runPython("import dice._runtime; dice._runtime.teardown()");
    } catch (_) {
      /* ignore */
    }
    postMessage({ type: "status", status: "stopped" });
  } else if (msg.type === "motion.shake" || msg.type === "orientation.change") {
    sendEvent(msg);
  }
};
