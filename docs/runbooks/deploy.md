# Runbook: Deploying DiceMaster Studio

## Prerequisites

- Node.js 18+ installed
- `npm install` completed successfully (including native `better-sqlite3` compilation)
- `.env.local` with `GEMINI_API_KEY` set, or the key available as an environment variable at build time
- A target hosting environment: static file server, VPS, or a platform like Vercel or GitHub Pages

## Steps

### 1. Build the frontend

```bash
npm run build
```

Vite compiles TypeScript, bundles React and all dependencies, processes Tailwind CSS, and writes the output to `dist/`. The `GEMINI_API_KEY` is read from `.env.local` (or the environment) and embedded in the JavaScript bundle at build time — the browser never fetches it from a server.

Expected output: a `dist/` directory containing `index.html`, hashed JS/CSS chunks, and copies of everything in `public/` (including `pyodide-worker.js`, `dice-0.1.0-py3-none-any.whl`, and the `examples/` folder).

### 2. Serving options

#### Option A: Express server (full API + static files)

The `server.ts` Express server serves `dist/` when `NODE_ENV=production`. This option is required if you need the REST API (`/api/language-games`, `/api/assets`, etc.) and the SQLite database.

```bash
NODE_ENV=production npm run dev
```

Or run the compiled output:

```bash
npm run build
node --loader tsx server.ts  # or compile server.ts separately
```

The server listens on `0.0.0.0:3000`. Use a reverse proxy (nginx, Caddy) to expose it on port 80/443.

**nginx example:**

```nginx
server {
    listen 80;
    server_name studio.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Important:** `dice_lab.db` is created in the working directory when the process starts. Make sure the user running the Node process has write permission to that directory. On a VPS, consider placing the database in a persistent volume rather than the app directory.

#### Option B: Static hosting (no API, simulator only)

If you only need the Python simulator (no game library persistence, no AI generation), you can deploy `dist/` to any static file host. The Pyodide worker, the `dice` wheel, and the example games are all static assets.

**Important caveats for static hosting:**

- The `/api/*` routes will return 404. The Games tab's save/load features require the Express backend.
- Some static hosts require specific headers for Pyodide's WebAssembly to work:

  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```

  These are needed if you use `SharedArrayBuffer` (Pyodide may require it for some operations). Configure them in your host's response headers settings.

**GitHub Pages:**

```bash
npm run build
# Push dist/ to the gh-pages branch
npx gh-pages -d dist
```

If the site is served from a subdirectory (e.g., `https://username.github.io/DiceMaster_Studio/`), set the base path in `vite.config.ts` before building:

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/DiceMaster_Studio/',   // add this line
    plugins: [react(), tailwindcss()],
    // ...
  };
});
```

Without `base`, all asset URLs are root-relative (`/assets/...`) and will return 404 when served from a subdirectory.

**Vercel:**

Create a `vercel.json` in the project root to configure headers and rewrites:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Then deploy:

```bash
vercel --prod
```

#### Option C: Docker (Express + SQLite)

Build the image:

```dockerfile
FROM node:20-slim
WORKDIR /app

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "--import", "tsx/esm", "server.ts"]
```

```bash
docker build -t dicemaster-studio .
docker run -p 3000:3000 -v /data/dice_lab:/app/dice_lab_data dicemaster-studio
```

Adjust the volume mount path and update `server.ts` to use the path from an environment variable if you want the database to persist outside the container.

### 3. Clean up old builds

```bash
npm run clean   # removes dist/
npm run build   # rebuild from scratch
```

## Verify

After deploying:

1. Open the app URL in Chrome or Edge.
2. The simulator tab should show the Python editor and six virtual screens.
3. The Pyodide status indicator should transition from **Loading** to **Ready** within ~15 seconds.
4. Click **Run** — the default strategy should update at least one screen.
5. If using the full Express backend: open `/api/language-games` in the browser — it should return `{"games":[]}` (or your existing games).

## Troubleshooting

**`dist/` is missing `pyodide-worker.js` or the `examples/` folder**

These are in `public/` and should be copied to `dist/` by Vite automatically. If they are missing, check that Vite's `publicDir` is not overridden in `vite.config.ts`.

**Pyodide fails with a CORS or SharedArrayBuffer error on the deployed site**

Add the `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to all responses. These are required for cross-origin isolation, which some Pyodide operations depend on. Without them, the simulator may load but fail silently when running Python code.

**Assets (images in games) are not loading on the deployed site**

Check that the `examples/*.zip` files are present in `dist/examples/`. These are served as static files from `public/examples/`. If they are missing from the deployed `dist/`, the CDN or deployment pipeline may be excluding binary files — check your `.gitignore` or deployment configuration.

**`GEMINI_API_KEY` is missing in the deployed build**

The key is embedded at build time by Vite's `define` block. If you are building in a CI environment (GitHub Actions, Vercel CI), set `GEMINI_API_KEY` as a repository secret or environment variable in the CI platform settings, not in `.env.local` (which should not be committed).

**The app loads but `/api/*` routes return 404**

You are serving the static `dist/` without the Express backend. The REST API requires the Node.js server process (`server.ts`) to be running. Static hosting (GitHub Pages, CDN) cannot serve the API — use Option A or Option C above.
