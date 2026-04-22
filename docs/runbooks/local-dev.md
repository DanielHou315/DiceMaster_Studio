# Runbook: Local Development Workflow

## Prerequisites

- Node.js 18+ installed and on `$PATH`
- C++ build toolchain present (required for `better-sqlite3` native addon)
- Project cloned with the `DiceMaster_Studio` submodule checked out
- `.env.local` created with `GEMINI_API_KEY=...` (needed only for AI generation features)

## Steps

### 1. Install dependencies

```bash
cd /path/to/DiceMaster_Studio
npm install
```

On success the last line should be something like `added N packages in Xs`. If `better-sqlite3` fails to compile, see Troubleshooting below.

### 2. Start the dev server

```bash
npm run dev
```

This executes `tsx server.ts`. Expected output:

```
Server running on http://localhost:3000
```

The process stays running in the foreground. Vite middleware is mounted inside Express, so both API routes and the SPA are served from the same port.

### 3. Open the browser

Navigate to `http://localhost:3000`. The React SPA loads. The Pyodide Web Worker begins initializing in the background — watch the status indicator in the top bar change from **Loading** to **Ready** (typically 5–15 seconds on first load, faster on subsequent loads once CDN assets are cached).

### 4. Edit source files

All files under `src/` are watched by Vite's HMR. Saving a `.tsx`, `.ts`, or `.css` file triggers an instant hot module replacement — the browser updates without a full reload and without restarting the Express server or reinitializing Pyodide.

Files that do **not** benefit from HMR and require a page reload:

- `public/pyodide-worker.js` — the Web Worker is not hot-reloaded; refresh the browser after editing it
- `public/dice-0.1.0-py3-none-any.whl` — requires a full browser reload to pick up a new wheel
- `server.ts` — changing Express routes or the SQLite schema requires stopping and restarting `npm run dev` (the `tsx` process does not auto-restart)

### 5. Edit the Express server (server.ts)

Stop the server with Ctrl+C and restart:

```bash
npm run dev
```

If you add a new column to a table, add a migration block after the `CREATE TABLE IF NOT EXISTS` statements in the same try/catch pattern already used for `mock_rounds`:

```typescript
try {
  db.prepare("ALTER TABLE language_games ADD COLUMN new_col TEXT").run();
} catch (e) {
  // Column already exists
}
```

### 6. Type-check without building

```bash
npm run lint
```

This runs `tsc --noEmit`, which checks TypeScript types across both `src/` and `server.ts` without emitting any JavaScript. Fix all errors before committing.

### 7. Build for production

```bash
npm run build
```

Vite bundles the SPA into `dist/`. The Express server in `server.ts` serves `dist/` statically when `NODE_ENV=production`. See the deploy runbook for serving options.

### 8. Clean build artifacts

```bash
npm run clean
```

Removes `dist/`. Does not remove `dice_lab.db` or `node_modules`.

### 9. Reset the local database

```bash
rm dice_lab.db
```

The next `npm run dev` will recreate `dice_lab.db` from scratch with empty tables.

### 10. Inspect the database directly

```bash
sqlite3 dice_lab.db
```

Useful queries:

```sql
-- List all saved games
SELECT id, name, created_at FROM language_games ORDER BY created_at DESC;

-- Check project files
SELECT path, length(content) AS bytes FROM project_files;

-- Count assets
SELECT type, count(*) FROM assets GROUP BY type;
```

## Verify

After starting with `npm run dev`:

- `curl http://localhost:3000/api/language-games` returns `{ "games": [...] }` (empty array on a fresh database).
- `curl http://localhost:3000/` returns the HTML shell of the React app.
- The browser console shows no errors. Pyodide loading errors appear as `Init failed: ...` in the browser console.

## Troubleshooting

**`npm install` fails with `node-gyp` / `better-sqlite3` build error**

better-sqlite3 requires native compilation. Fix steps:

- macOS: `xcode-select --install` to install Command Line Tools, then `npm install` again.
- Linux (Debian/Ubuntu): `sudo apt-get install build-essential python3` then `npm install`.
- If Node.js version changed: `npm rebuild better-sqlite3`.
- If still failing: `npm install --ignore-scripts` installs without native compilation but the server will fail at startup with a binding error — use this only to verify other package installs.

**Port 3000 already in use**

```bash
lsof -ti :3000 | xargs kill -9
```

Then restart `npm run dev`. To use a different port, change `const PORT = 3000` in `server.ts` and update any hardcoded references.

**Pyodide fails to load (browser console shows "Init failed: ...")**

- Check network connectivity — Pyodide is loaded from `cdn.jsdelivr.net`.
- Open DevTools → Network tab → filter by `pyodide` to see if CDN requests are failing.
- If behind a corporate proxy, the CDN may be blocked. Pyodide can be self-hosted by downloading the release and serving it from `public/`, then updating the `importScripts` URL in `pyodide-worker.js`.

**Changes to `src/` files are not reflected in the browser**

- Verify the Vite dev server is running (look for Vite's startup messages in the `npm run dev` output).
- Check if `DISABLE_HMR=true` is set in your environment — this env var disables hot module replacement (it is used by AI Studio to prevent flicker during agent edits).
- Hard-refresh the browser (Cmd+Shift+R / Ctrl+Shift+R) to bypass the browser cache.

**SQLite "readonly database" or permission error**

- Check that the process has write permission to the project root directory.
- If running in a containerized environment, ensure the directory containing `dice_lab.db` is not mounted read-only.

**Web Serial (USB flash) not working**

- Web Serial API requires Chrome 89+ or Edge 89+. Firefox does not support it.
- The page must be served over `https://` or `localhost` — Web Serial is blocked on non-secure origins.
