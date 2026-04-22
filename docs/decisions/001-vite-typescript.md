# ADR-001: Vite + TypeScript for the Web Frontend

## Status

Accepted

## Context

DiceMaster Studio is a developer-facing tool used to write, preview, and iterate on Python game strategies for a physical dice device. The core development loop is tightly interactive: the developer edits Python code in Monaco Editor, clicks Run, and immediately sees all six virtual screens update. This loop demands a fast feedback cycle on the frontend itself — changes to UI components or layouts must be visible without full-page reloads.

The project also integrates several complex third-party libraries at once: `@react-three/fiber` for 3D rendering, `@monaco-editor/react` for code editing, `motion` for animations, and `@google/genai` for AI generation. Managing the interplay of these libraries benefits from static typing to catch interface mismatches at compile time rather than at runtime in the browser.

The server side (`server.ts`) is written in TypeScript as well and run with `tsx` directly, so a single tsconfig and type ecosystem covers both Express route handlers and React components. Interfaces like `LanguageGame`, `ScreenContent`, `DiceScreens`, and `WorkerMessage` are defined once in `src/types.ts` and used by both the API layer and UI components.

## Decision

Use **Vite 6** as the build tool and dev server, with **TypeScript ~5.8** and the `@vitejs/plugin-react` plugin. Tailwind CSS is integrated as a Vite plugin (`@tailwindcss/vite`) rather than a PostCSS step, keeping configuration minimal.

Key configuration choices (see `vite.config.ts`):

- `@/` path alias resolves to the project root, allowing imports like `@/src/types` from anywhere.
- `GEMINI_API_KEY` is injected via `define` at build time from the `.env.local` file loaded with `loadEnv`, so the key is never read at runtime from a separate fetch.
- HMR is conditionally disabled when `DISABLE_HMR=true` (used by AI Studio to prevent screen flicker during agent-driven edits).

The dev server is not Vite's built-in server but rather Express (`server.ts`) with Vite mounted as middleware via `createViteServer({ server: { middlewareMode: true } })`. This allows the REST API (`/api/*`) and the SPA to share the same port (3000) without CORS configuration.

## Consequences

**Positive:**

- HMR is sub-100ms for component edits; the Python-in-browser simulation persists across hot reloads of unrelated UI components.
- TypeScript catches type errors across the Worker message protocol, the Express API bodies, and the React component props — the `WorkerMessage` discriminated union in `pyodideService.ts` is especially valuable here.
- Tailwind's Vite plugin eliminates the need for a separate PostCSS build step.
- `tsx` allows running `server.ts` directly without a separate compilation step for the Express server.
- `npm run lint` (`tsc --noEmit`) gives a quick type-check pass without producing build artifacts.

**Negative:**

- Node.js 18+ is required as a development prerequisite. The project cannot be edited without a Node toolchain even though the runtime target is entirely browser-based.
- better-sqlite3 (used in `server.ts`) requires a native Node.js addon, which means `npm install` triggers a native compilation step on first install and can fail on platforms without build tools (Python, make, C++ compiler).
- Vite's SPA mode (`appType: "spa"`) means all unknown routes fall back to `index.html`, which is correct for client-side routing but requires the Express catch-all to be the last middleware registered.

## Alternatives Considered

**Webpack + Babel**  
Webpack 5 with Babel would have worked but has a significantly slower HMR story for React projects. Configuration overhead (webpack.config.js, babel.config.js, separate PostCSS config) is higher. No compelling advantage over Vite for this project's size.

**Create React App**  
CRA is effectively deprecated upstream (no releases since mid-2023, React team no longer recommends it). It also does not support the server-side Express integration pattern this project uses.

**Plain HTML + vanilla JavaScript**  
Viable for a prototype but would lose type safety across the Worker message boundary (`WorkerMessage` union types), Monaco Editor's TypeScript type definitions, and React component prop checking. The Monaco + Three.js integration in particular produces difficult-to-debug runtime errors without TypeScript.

**Next.js**  
Next.js would add SSR complexity that is not needed — Studio is a single-user local tool with no need for server-rendered pages. The file-based routing model would not align well with the single-page tab architecture.
