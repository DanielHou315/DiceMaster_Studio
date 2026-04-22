# Guide: Running DiceMaster Studio

DiceMaster Studio is a browser-based IDE for writing and simulating Python game strategies for the DiceMaster hardware die. This guide walks through getting it running locally from scratch.

## Prerequisites

- **Node.js 18 or later** — check with `node --version`. The project uses ES modules (`"type": "module"` in package.json) and `tsx` for direct TypeScript execution, both of which require Node 18+.
- **A C++ build toolchain** — required for the native `better-sqlite3` addon. On macOS this means Xcode Command Line Tools (`xcode-select --install`). On Linux, `build-essential` and `python3`. On Windows, Visual Studio Build Tools.
- **A Gemini API key** — required for the AI game generation feature. Get one at [Google AI Studio](https://aistudio.google.com/apikey). The simulator and manual code editing work without a key.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

   This compiles the `better-sqlite3` native addon. If it fails, check that your C++ toolchain is installed and that your Node.js version matches (run `node --version` and compare against the `.nvmrc` or engines field if present).

2. Create the environment file:

   ```bash
   cp .env.local.example .env.local  # if an example exists
   # or create .env.local manually
   ```

   Add your Gemini API key:

   ```
   GEMINI_API_KEY=your_key_here
   ```

   Vite reads this file via `loadEnv` in `vite.config.ts` and injects the key at build time. The key is embedded in the JavaScript bundle — do not use a production API key for local development if you plan to commit or share the build output.

## Running

Start the development server:

```bash
npm run dev
```

This runs `tsx server.ts`, which:

- Creates `dice_lab.db` in the project root (if it does not exist yet).
- Starts an Express server on port 3000 with the REST API and Vite middleware.
- Prints `Server running on http://localhost:3000`.

Open your browser at **http://localhost:3000**.

Note: `npm run dev` binds to `0.0.0.0`, so the app is accessible on your local network at `http://<your-ip>:3000`. This is useful for testing on a mobile device or from the Raspberry Pi dev machine.

## First Use

### Simulator tab (default)

When you first open Studio, the **Simulator** tab is active. The Python editor contains `DEFAULT_BASE_CODE` — a minimal strategy stub that demonstrates the `dice` API.

The simulator status indicator in the top bar shows the Pyodide loading state. On a cold browser cache, Pyodide takes 5–15 seconds to load (~10 MB of WebAssembly). Once it shows **Ready**, click **Run** to execute the default strategy.

The six virtual screens (top, bottom, front, back, left, right) update as the strategy sends `screen.set_text` or `screen.set_image` messages. Use the **Shake** button to fire a `motion.on_shake` event, and the orientation controls to simulate placing the die with a different face up.

Switch between **2D** (flat six-face grid), **3D** (interactive Three.js cube), and **Split** views using the view toggle.

### Loading an existing game from the library

1. Go to the **Games** tab.
2. Click **Examples** to see the bundled game library (30+ games in `public/examples/`).
3. Click any game card to load it into the simulator.

The game's `manifest.json` provides the name and description. Its `strategy.py` is loaded into the editor. All assets from the zip (`assets/` folder) are mounted into Pyodide's virtual filesystem at `/assets/`.

### Writing a new Python strategy

1. Go to the **Simulator** tab.
2. Edit the Python code in the Monaco editor on the left.
3. Your strategy must define a class that inherits from `dice.strategy.BaseStrategy` with `start_strategy()` and `stop_strategy()` methods:

   ```python
   from dice import screen, motion, orientation
   from dice.strategy import BaseStrategy

   class MyGame(BaseStrategy):
       _strategy_name = "my_game"

       def start_strategy(self):
           orientation.on_change(self._on_orientation_change)
           motion.on_shake(self._on_shake)

       def _on_orientation_change(self, top, bottom):
           screen.set_text(top, self._assets_path + "/welcome.json")

       def _on_shake(self, intensity):
           screen.set_text(1, self._assets_path + "/result.json")

       def stop_strategy(self):
           pass
   ```

4. Click **Run**. If there is a Python error, it appears in the console below the editor (last line of the traceback is shown prominently).

### Creating a game with AI

1. Go to the **Games** tab.
2. Click **New Game** or the generate button.
3. Enter a description of your game concept.
4. Studio sends your prompt to Gemini and generates a complete `BaseStrategy` subclass, mock data, and round snapshots.
5. The generated game is saved to `dice_lab.db` and appears in the game list.

### Saving and managing games

The **Games** tab shows all games saved in `dice_lab.db`. Each card shows the game name, description, and creation date with options to edit, duplicate, export as zip, or delete.

The **Assets** tab manages binary assets (images, fonts) that are referenced by game strategies.

### Connecting to physical hardware

1. Connect your DiceMaster device via USB.
2. Click the **USB** button in the top bar.
3. Select the serial port in the browser's port picker dialog (requires Chrome or Edge — Firefox does not support Web Serial).
4. Once connected, the **Flash** button uploads `main.py` (or the currently open file) to the device and triggers `machine.reset()`.
