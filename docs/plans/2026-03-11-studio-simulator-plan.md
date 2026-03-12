# Studio Pyodide Simulator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the DiceMaster Studio simulator actually execute Python code via Pyodide in a Web Worker, using the `dice` web package bridge protocol.

**Architecture:** A Web Worker loads Pyodide and the `dice` wheel. Student code runs inside the worker. `dice.*` calls send postMessage to the main thread, which updates React screen state. The main thread sends simulated hardware events (shake, orientation) back to the worker.

**Tech Stack:** Pyodide (CDN), dice wheel (pre-built from DiceMaster_Central_Web), Vite, React, TypeScript

---

### Task 1: Build and copy the dice wheel

**Files:**
- Source: `../DiceMaster_Central_Web/`
- Create: `public/dice-0.1.0-py3-none-any.whl`

**Step 1: Build the wheel**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Central_Web && uv build
```

Expected: `dist/dice-0.1.0-py3-none-any.whl` created.

**Step 2: Copy wheel to Studio public dir**

```bash
cp /Users/danielhou/Code/DiceMaster/DiceMaster_Central_Web/dist/dice-0.1.0-py3-none-any.whl /Users/danielhou/Code/DiceMaster/DiceMaster_Studio/public/
```

**Step 3: Commit**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Studio
git add public/dice-0.1.0-py3-none-any.whl
git commit -m "feat: add pre-built dice wheel for Pyodide"
```

---

### Task 2: Create the Pyodide Web Worker

**Files:**
- Create: `public/pyodide-worker.js`

**Step 1: Write the worker**

```javascript
// public/pyodide-worker.js
// Web Worker that loads Pyodide, installs the dice wheel, and runs student Python code.
// Communicates with main thread via postMessage.

importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");

let pyodide = null;
let isRunning = false;

async function initPyodide() {
  pyodide = await loadPyodide();

  // Install the dice wheel from the same origin
  const wheelUrl = new URL("/dice-0.1.0-py3-none-any.whl", self.location.origin).href;
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install(wheelUrl);

  // Patch the bridge to use postMessage to main thread
  pyodide.runPython(`
from dice._bridge import get_bridge
bridge = get_bridge()

def _js_post(msg):
    from js import postMessage
    from pyodide.ffi import to_js
    postMessage(to_js(msg, dict_converter=lambda x: x))

bridge._js_post = _js_post
  `);

  postMessage({ type: "status", status: "ready" });
}

async function runCode(code) {
  if (!pyodide) return;
  isRunning = true;
  postMessage({ type: "status", status: "running" });

  try {
    // Reset state from previous run
    pyodide.runPython(`
from dice._runtime import teardown
teardown()

# Re-patch bridge after teardown reset
from dice._bridge import get_bridge
bridge = get_bridge()

def _js_post(msg):
    from js import postMessage
    from pyodide.ffi import to_js
    postMessage(to_js(msg, dict_converter=lambda x: x))

bridge._js_post = _js_post
    `);

    await pyodide.runPythonAsync(code);
  } catch (err) {
    postMessage({ type: "error", message: err.message || String(err) });
  } finally {
    isRunning = false;
    postMessage({ type: "status", status: "stopped" });
  }
}

function stopCode() {
  if (!pyodide) return;
  try {
    pyodide.runPython(`
from dice._runtime import teardown
teardown()
    `);
  } catch (e) {
    // ignore
  }
  isRunning = false;
  postMessage({ type: "status", status: "stopped" });
}

function sendEvent(msg) {
  if (!pyodide || !isRunning) return;
  try {
    const msgJson = JSON.stringify(msg);
    pyodide.runPython(`
from dice._bridge import get_bridge
import json
get_bridge().receive(json.loads('${msgJson.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'))
    `);
  } catch (e) {
    // ignore errors from dispatching events
  }
}

self.onmessage = async function(e) {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      await initPyodide();
      break;
    case "run":
      await runCode(msg.code);
      break;
    case "stop":
      stopCode();
      break;
    case "motion.shake":
    case "motion.still":
    case "orientation.change":
      sendEvent(msg);
      break;
  }
};
```

**Step 2: Verify file exists and is valid JS syntax**

```bash
node -c public/pyodide-worker.js
```

Expected: No syntax errors.

**Step 3: Commit**

```bash
git add public/pyodide-worker.js
git commit -m "feat: add Pyodide web worker for Python execution"
```

---

### Task 3: Create PyodideService TypeScript wrapper

**Files:**
- Create: `src/services/pyodideService.ts`

**Step 1: Write the service**

```typescript
// src/services/pyodideService.ts
// Manages the Pyodide Web Worker lifecycle and message translation.

export type SimStatus = "loading" | "ready" | "running" | "stopped" | "error";

export interface ScreenMessage {
  type: "screen.set_text" | "screen.set_image" | "screen.set_gif";
  screen_id: number;
  path: string;
}

export interface LogMessage {
  type: "log";
  message: string;
}

export interface StatusMessage {
  type: "status";
  status: SimStatus;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type WorkerMessage = ScreenMessage | LogMessage | StatusMessage | ErrorMessage;

type MessageHandler = (msg: WorkerMessage) => void;

class PyodideService {
  private worker: Worker | null = null;
  private handlers: MessageHandler[] = [];
  private _status: SimStatus = "loading";

  get status(): SimStatus {
    return this._status;
  }

  init(): void {
    if (this.worker) return;
    this.worker = new Worker("/pyodide-worker.js");
    this.worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as WorkerMessage;
      if (msg.type === "status") {
        this._status = msg.status;
      }
      if (msg.type === "error") {
        this._status = "error";
      }
      for (const handler of this.handlers) {
        handler(msg);
      }
    };
    this.worker.postMessage({ type: "init" });
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  run(code: string): void {
    this.worker?.postMessage({ type: "run", code });
  }

  stop(): void {
    this.worker?.postMessage({ type: "stop" });
  }

  shake(intensity: number = 0.7): void {
    this.worker?.postMessage({ type: "motion.shake", intensity });
  }

  setOrientation(top: number, bottom: number): void {
    this.worker?.postMessage({ type: "orientation.change", top, bottom });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.handlers = [];
    this._status = "loading";
  }
}

export const pyodideService = new PyodideService();
```

**Step 2: Verify it compiles**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Studio && npx tsc --noEmit src/services/pyodideService.ts 2>&1 || true
```

**Step 3: Commit**

```bash
git add src/services/pyodideService.ts
git commit -m "feat: add PyodideService wrapper for web worker"
```

---

### Task 4: Wire PyodideService into App.tsx

**Files:**
- Modify: `src/App.tsx`

This task modifies the existing `runCurrentCode` and `shakeDice` functions to use the PyodideService instead of regex parsing. It also adds a screen ID → face mapping to handle incoming `screen.set_*` messages.

**Step 1: Add imports and state at the top of App component**

Add after the existing imports (around line 20):

```typescript
import { pyodideService, WorkerMessage, SimStatus } from './services/pyodideService';
```

Add state variables inside the App component (after existing state declarations around line 60):

```typescript
const [pyodideStatus, setPyodideStatus] = useState<SimStatus>('loading');
const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
```

Add the screen ID mapping constant (outside the component or at the top):

```typescript
const SCREEN_ID_TO_FACE: Record<number, keyof DiceScreens> = {
  1: 'top',
  2: 'front',
  3: 'right',
  4: 'back',
  5: 'left',
  6: 'bottom',
};
```

**Step 2: Add useEffect to initialize PyodideService and handle messages**

Add after state declarations:

```typescript
useEffect(() => {
  pyodideService.init();

  const unsubscribe = pyodideService.onMessage((msg: WorkerMessage) => {
    switch (msg.type) {
      case 'status':
        setPyodideStatus(msg.status);
        break;
      case 'error':
        setError(msg.message);
        setConsoleLogs(prev => [...prev, `ERROR: ${msg.message}`]);
        break;
      case 'log':
        setConsoleLogs(prev => [...prev, msg.message]);
        break;
      case 'screen.set_text':
      case 'screen.set_image':
      case 'screen.set_gif': {
        const face = SCREEN_ID_TO_FACE[msg.screen_id];
        if (face) {
          const contentType = msg.type === 'screen.set_text' ? 'text' : 'image';
          setScreens(prev => ({
            ...prev,
            [face]: { type: contentType, content: msg.path }
          }));
        }
        break;
      }
    }
  });

  return () => {
    unsubscribe();
    pyodideService.destroy();
  };
}, []);
```

**Step 3: Replace `runCurrentCode` function**

Replace the existing `runCurrentCode` function (around line 364-386) with:

```typescript
const runCurrentCode = async () => {
  if (!selectedFile) return;

  if (pyodideStatus !== 'ready' && pyodideStatus !== 'stopped') {
    setError('Python runtime is still loading. Please wait...');
    return;
  }

  setConsoleLogs([]);
  setError(null);

  // Reset screens to blank
  setScreens({
    top: { type: 'text', content: '' },
    bottom: { type: 'text', content: '' },
    front: { type: 'text', content: '' },
    back: { type: 'text', content: '' },
    left: { type: 'text', content: '' },
    right: { type: 'text', content: '' },
  });

  // Switch to simulator tab
  if (activeTab !== 'sim2d' && activeTab !== 'sim3d') {
    setActiveTab('sim2d');
  }

  pyodideService.run(selectedFile.content);
};
```

**Step 4: Replace `shakeDice` function**

Replace the existing `shakeDice` function (around line 896-944) with:

```typescript
const shakeDice = () => {
  setIsShaking(true);
  setTimeout(() => setIsShaking(false), 500);

  // If Pyodide is running, send a real shake event
  if (pyodideStatus === 'running') {
    pyodideService.shake(0.7);
    return;
  }

  // Fallback: cycle mock rounds if active game has them
  if (activeGame && activeGame.mock_rounds && activeGame.mock_rounds.length > 0) {
    const nextRoundIdx = (currentRound + 1) % activeGame.mock_rounds.length;
    setCurrentRound(nextRoundIdx);
    try {
      const roundData = activeGame.mock_rounds[nextRoundIdx];
      if (roundData) {
        const parsedRound = typeof roundData === 'string' ? JSON.parse(roundData) : roundData;
        setScreens(resolveScreens(parsedRound));
      }
    } catch (err) {
      console.error("Failed to parse round data", err);
    }
  }
};
```

**Step 5: Verify it compiles**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Studio && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire PyodideService into App for real Python execution"
```

---

### Task 5: Replace M5Stack example code with dice API examples

**Files:**
- Modify: `src/constants.ts`

**Step 1: Replace the entire file contents**

Replace `CHINESE_QUIZLET_CODE`, `HARDWARE_OPTIMIZER_CODE`, and `DEFAULT_BASE_CODE` with examples using the `dice.*` API. Use the pipeline_test strategy as the default since it has no asset dependencies.

```typescript
export const CHINESE_QUIZLET_CODE = `"""
Shake Quizlet — dice API example.
Shaking the dice cycles through flashcards.
"""
import os
import random
import time

from dice import screen, motion, orientation, log
from dice.strategy import BaseStrategy


class ShakeQuizletStrategy(BaseStrategy):
    _strategy_name = "shake_quizlet"

    def __init__(self, game_name, config, assets_path, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.cards = [
            {"q": "Apple", "a": "苹果", "hints": ["Red", "Sweet", "Fruit", "🍎"]},
            {"q": "Cat", "a": "猫", "hints": ["Meow", "Feline", "Whiskers", "🐱"]},
            {"q": "Computer", "a": "电脑", "hints": ["Screen", "Keyboard", "Electric", "💻"]},
        ]
        self.current = 0
        self.shake_count = 0
        self.last_shake = 0.0

    def start_strategy(self):
        motion.on_shake(self._on_shake)
        self._display()
        log("ShakeQuizlet started")

    def stop_strategy(self):
        log("ShakeQuizlet stopped")

    def _on_shake(self, intensity):
        now = time.time()
        if now - self.last_shake < 1.0:
            return
        self.last_shake = now
        self.current = (self.current + 1) % len(self.cards)
        self._display()

    def _display(self):
        card = self.cards[self.current]
        screen.set_text(1, card["q"])       # top
        screen.set_text(6, card["a"])       # bottom
        for i, hint in enumerate(card["hints"][:4]):
            screen.set_text(i + 2, hint)    # front, right, back, left
        log(f"Showing: {card['q']} = {card['a']}")


# Run the strategy
game = ShakeQuizletStrategy("quizlet", {}, "/assets")
game.start_strategy()
`;

export const HARDWARE_OPTIMIZER_CODE = `"""
Pipeline Test — sends text to screens on a timer.
Simplest dice API example, no assets needed.
"""
import os
import json
import tempfile

from dice import screen, log, timer
from dice.strategy import BaseStrategy


class TestStrategy(BaseStrategy):
    _strategy_name = "pipeline_test"

    def __init__(self, game_name, config, assets_path, **kwargs):
        super().__init__(game_name, config, assets_path, **kwargs)
        self.available_screen_ids = list(range(1, 7))
        self.current_screen_index = 0
        self.message_count = 0
        self._timer_id = None

    def start_strategy(self):
        self._timer_id = timer.set(1.0, self._send_notification)
        log("TestStrategy started - sending notifications every 1s")

    def stop_strategy(self):
        if self._timer_id is not None:
            timer.cancel(self._timer_id)
            self._timer_id = None
        log("TestStrategy stopped")

    def _send_notification(self):
        target_id = self.available_screen_ids[self.current_screen_index]
        self.current_screen_index = (self.current_screen_index + 1) % len(self.available_screen_ids)
        self.message_count += 1
        content = f"Test #{self.message_count} screen {target_id}"
        screen.set_text(target_id, content)
        log(f"Sent: {content}")


# Run the strategy
game = TestStrategy("test", {}, "/assets")
game.start_strategy()
`;

export const DEFAULT_BASE_CODE = `"""
DiceMaster — write your game here!

Available APIs:
  from dice import screen, motion, orientation, log, timer
  from dice.strategy import BaseStrategy

  screen.set_text(screen_id, text)    — show text on screen 1-6
  screen.set_image(screen_id, path)   — show image on screen
  motion.on_shake(callback)           — callback(intensity) on shake
  orientation.on_change(callback)     — callback(top, bottom) on flip
  timer.set(interval, callback)       — repeat every N seconds
  timer.once(delay, callback)         — fire once after N seconds
  timer.cancel(timer_id)              — cancel a timer
  log(message)                        — print to console
"""
from dice import screen, log, timer


count = 0

def tick():
    global count
    count += 1
    screen.set_text(1, f"Hello #{count}")
    log(f"tick {count}")

timer_id = timer.set(2.0, tick)
screen.set_text(1, "Starting...")
log("Game started! Screens will update every 2 seconds.")
`;
```

**Step 2: Verify it compiles**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Studio && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/constants.ts
git commit -m "feat: replace M5Stack examples with dice API examples"
```

---

### Task 6: Install dependencies and verify dev server runs

**Files:**
- No new files

**Step 1: Install npm dependencies**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Studio && npm install
```

**Step 2: Start dev server and verify it loads**

```bash
cd /Users/danielhou/Code/DiceMaster/DiceMaster_Studio && npm run dev
```

Expected: Server starts on http://localhost:3000, no build errors.

**Step 3: Verify in browser with Playwright**

Use Playwright MCP to:
1. Navigate to http://localhost:3000
2. Wait for page to load
3. Verify the app renders (look for "LCD Dice" or similar heading)
4. Wait for Pyodide to load (check for "ready" status)
5. Click "Run" on the default code
6. Verify screens update with text content

---

### Task 7: End-to-end test with pipeline_test strategy

**Files:**
- No new files, testing existing implementation

**Step 1: Load the pipeline test code**

Use Playwright to:
1. Navigate to http://localhost:3000
2. Switch to Editor tab
3. Select the "Hardware Optimizer" preset (which is now pipeline_test)
4. Click "Run"
5. Switch to sim2d tab
6. Wait 3 seconds for timer to fire
7. Verify at least one screen shows "Test #" text
8. Check console logs show "TestStrategy started"

**Step 2: Test shake functionality**

1. Load the Chinese Quizlet example (which is now shake_quizlet)
2. Click Run
3. Verify initial screen state shows "Apple" on top
4. Click Shake
5. Verify screens update to show "Cat"
