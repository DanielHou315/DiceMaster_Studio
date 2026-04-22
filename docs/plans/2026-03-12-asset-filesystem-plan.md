# Virtual Asset Filesystem — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable games with images/gifs to run in the simulator by adding a virtual asset filesystem, merging 2D/3D into one tab, and testing with the real chinese_quizlet example.

**Architecture:** IndexedDB stores game zips. On Run, assets are unpacked to Pyodide's emscripten FS and a blob URL map. Image paths from worker are resolved to blob URLs for display.

**Tech Stack:** IndexedDB (idb-keyval), JSZip, Pyodide emscripten FS, React

---

### Task 1: Add JSZip dependency

**Files:**
- Modify: `package.json`

**Steps:**
1. `npm install jszip`
2. Verify it imports correctly

---

### Task 2: Create AssetStore service (IndexedDB)

**Files:**
- Create: `src/services/assetStore.ts`

**Implementation:**
- `saveGame(name: string, zipBlob: Blob): Promise<void>` — store zip in IndexedDB
- `loadGame(name: string): Promise<Blob | null>` — retrieve zip
- `listGames(): Promise<string[]>` — list stored game names
- `deleteGame(name: string): Promise<void>`
- `unpackZip(zipBlob: Blob): Promise<Map<string, Uint8Array>>` — unpack zip to path→data map
- `createBlobURLs(files: Map<string, Uint8Array>): Map<string, string>` — create object URLs for image files
- Use raw IndexedDB with a "games" object store

---

### Task 3: Wire Pyodide worker to mount assets into emscripten FS

**Files:**
- Modify: `public/pyodide-worker.js`
- Modify: `src/services/pyodideService.ts`

**Implementation:**
- Add `mountAssets(files: Map<string, ArrayBuffer>)` message type to worker
- In worker: create directory structure in Pyodide FS, write files
- In PyodideService: add `mountAssets(files: Map<string, Uint8Array>)` method that serializes file data to worker via transferable ArrayBuffers
- Worker receives file map, creates dirs with `pyodide.FS.mkdir`, writes files with `pyodide.FS.writeFile`

---

### Task 4: Update App.tsx — asset blob URL resolution for images

**Files:**
- Modify: `src/App.tsx`

**Implementation:**
- Add `assetBlobURLs` state: `Map<string, string>`
- Before running code: unpack current game zip, create blob URLs, mount to worker
- In message handler for `screen.set_image`/`screen.set_gif`: resolve path through blob URL map
- Cleanup: revoke object URLs on unmount/new run

---

### Task 5: Merge 2D/3D into single Simulator tab with toggle

**Files:**
- Modify: `src/App.tsx` — remove separate sim2d/sim3d tabs, add single "simulator" tab
- Create: `src/components/Simulator/SimulatorView.tsx` — wrapper with 2D/3D toggle
- Minor tweaks to Simulator2D and Simulator3DContainer (remove redundant headers)

**Implementation:**
- New SimulatorView component contains:
  - Header with title + 2D/3D toggle switch
  - Conditionally renders Simulator2D or CSSDice3D based on toggle
  - Shared sidebar (Info/Data/Edit) rendered once regardless of mode
- Tab bar: replace "2D Simulator" and "3D Simulator" with single "Simulator"

---

### Task 6: Build Asset Manager UI

**Files:**
- Rewrite: `src/components/Assets/AssetsView.tsx` — tree-based file manager
- Modify: `src/components/Assets/AssetCard.tsx` — file/folder row component

**Implementation:**
- Tree view of current game's assets (collapsible folders)
- Upload button that uploads into the currently selected folder
- Create folder button
- Delete file/folder
- Image preview (thumbnail for images, icon for JSON/other)
- Import game zip button
- Export game zip button (download)

---

### Task 7: Copy chinese_quizlet assets and create test game zip

**Files:**
- Script or manual: create `chinese_quizlet.zip` from Central repo assets

**Implementation:**
- Copy assets from `DiceMaster_Central/src/dicemaster_central/examples/games/chinese_quizlet/assets/`
- Copy strategy from `DiceMaster_Central/src/dicemaster_central/examples/strategies/shake_quizlet/shake_quizlet.py`
- Create `manifest.json`
- Package into zip
- Place in `public/examples/chinese_quizlet.zip` for easy loading

---

### Task 8: End-to-end test with Playwright

**Steps:**
1. Load app, wait for Pyodide ready
2. Import chinese_quizlet.zip via Asset Manager
3. Click Run
4. Verify all 6 screens show content (question text, answer text, 4 images)
5. Click Shake 3 times, verify screens change to next card
6. Toggle 2D/3D, verify both render images
7. Click Stop, verify cleanup
