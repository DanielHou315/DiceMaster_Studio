# ADR-003: SQLite (dice_lab.db) for Local Game Storage

## Status

Accepted

## Context

Studio needs to persist structured game data across sessions. A "game" in this context has several distinct components:

- **Python source code** (`code` column) — the strategy the student writes
- **Mock data** (`mock_data`) — JSON configuration used for simulation
- **Mock rounds** (`mock_rounds`) — JSON array of per-round screen snapshots, used for replay/preview
- **Assets manifest** (`assets_manifest`) — references to binary assets (images, fonts) associated with the game
- **Metadata** — name, description, creation timestamp

Additionally, the server needs to persist:

- Uploaded project files (`project_files` table) — files extracted from a zip upload
- Binary assets (`assets` table) — base64-encoded image/audio data
- Analysis logs (`analysis_logs` table) — Gemini AI analysis results

All of this data must survive browser refreshes and be accessible to the Express API layer that also serves the Vite frontend.

## Decision

Use **better-sqlite3** (synchronous SQLite bindings for Node.js) with the database file stored as `dice_lab.db` in the project root. The database is initialized by `server.ts` on startup using `CREATE TABLE IF NOT EXISTS` statements, which means it is created automatically on first run and is always migrated forward (additive-only column additions use `ALTER TABLE ... ADD COLUMN` wrapped in a try/catch to handle the already-exists case).

Schema:

```sql
CREATE TABLE project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analysis_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE language_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  mock_data TEXT NOT NULL,
  mock_rounds TEXT,           -- added via migration
  assets_manifest TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  data TEXT NOT NULL,         -- base64-encoded binary
  type TEXT NOT NULL,         -- MIME type
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The REST API in `server.ts` exposes full CRUD for `language_games` and `assets`, and append/clear operations for `analysis_logs` and `project_files`. Binary assets are stored as base64 strings in the `data` column.

Note that there is a second game storage layer for zip-packaged games: **IndexedDB** (`assetStore.ts`) stores raw zip blobs keyed by game name in the browser's `dicemaster` / `games` object store. This layer is used for games loaded from zip files (including the bundled examples in `public/examples/`), while SQLite is used for games created or edited directly within Studio's game builder UI.

## Consequences

**Positive:**

- better-sqlite3's synchronous API means all database operations in Express route handlers are straightforward `try/catch` synchronous code — no callbacks or promise chains.
- `dice_lab.db` is a single file that can be copied, backed up, or deleted to reset the app state. During development, `rm dice_lab.db` gives a clean slate.
- SQLite handles multi-megabyte Python source strings and base64-encoded images without issue, including the 50 MB body size limit configured on Express's `json()` middleware.
- Schema migrations are additive-only and handled at server startup without a migration framework.
- No separate database process to manage. The database is embedded in the Node.js process.

**Negative:**

- better-sqlite3 requires a native Node.js addon (`node-gyp` compilation). On a fresh machine without build tools, `npm install` may fail with a native compilation error. This is the most common setup problem reported for Studio.
- SQLite only supports one writer at a time. If multiple Studio instances were run against the same `dice_lab.db` (unlikely, but possible in a shared filesystem scenario), write conflicts would cause errors.
- `dice_lab.db` is created in the project root. The `.gitignore` should exclude it to avoid accidentally committing user game data.
- Binary assets stored as base64 in the `data` column inflate storage by ~33% compared to storing raw binary blobs.

## Alternatives Considered

**IndexedDB (browser-side only)**  
IndexedDB is already used for zip-packaged game storage (`assetStore.ts`). Extending it to cover the structured game builder data would eliminate the SQLite dependency but would also eliminate the Express server API layer — the game data would only be accessible from the browser, not from server-side routes. The API-based architecture allows future integrations (export scripts, CI tooling) to query game data via HTTP. IndexedDB's API is also considerably more verbose than better-sqlite3's synchronous interface.

**localStorage**  
localStorage is synchronous and simple but has a 5–10 MB per-origin size limit. A single game with its mock_rounds snapshots can exceed this limit. Not viable.

**File System Access API (browser)**  
The File System Access API allows reading and writing files in user-chosen directories. It would avoid the Node.js server entirely but has limited browser support (no Firefox as of the project's start), requires a user permission prompt on every session, and cannot be accessed from server-side code.

**PostgreSQL or MySQL**  
Relational databases with a server process would be appropriate for a multi-user deployment but are significant operational overhead for a local development tool used by a single developer. SQLite provides the same SQL interface at zero infrastructure cost.

**JSON files on disk**  
Storing each game as a `.json` file in a directory would work for a few games but lacks atomic multi-record transactions, makes listing/filtering games require directory traversal, and has no built-in support for concurrent writes. SQLite is strictly better for this use case.
