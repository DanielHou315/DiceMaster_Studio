/**
 * AssetStore — IndexedDB-backed storage for game zips and asset management.
 *
 * Games are stored as zip blobs. On run, zips are unpacked to a file map
 * that can be mounted into Pyodide's emscripten FS and resolved to blob URLs.
 */
import JSZip from "jszip";

const DB_NAME = "dicemaster";
const DB_VERSION = 1;
const GAMES_STORE = "games";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(GAMES_STORE)) {
        db.createObjectStore(GAMES_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface GameManifest {
  name: string;
  description?: string;
  strategy_name?: string;
  version?: string;
}

export interface UnpackedGame {
  manifest: GameManifest;
  strategyCode: string;
  files: Map<string, Uint8Array>; // path -> binary data (relative to zip root)
}

export async function saveGame(name: string, zipBlob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GAMES_STORE, "readwrite");
    tx.objectStore(GAMES_STORE).put(zipBlob, name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadGame(name: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GAMES_STORE, "readonly");
    const req = tx.objectStore(GAMES_STORE).get(name);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listGames(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GAMES_STORE, "readonly");
    const req = tx.objectStore(GAMES_STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteGame(name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GAMES_STORE, "readwrite");
    tx.objectStore(GAMES_STORE).delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Unpack a game zip into its components. */
export async function unpackZip(zipBlob: Blob): Promise<UnpackedGame> {
  const zip = await JSZip.loadAsync(zipBlob);

  let manifest: GameManifest = { name: "Unknown Game" };
  let strategyCode = "";
  const files = new Map<string, Uint8Array>();

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;

    // Normalize: strip leading folder if zip has a root folder
    const normalizedPath = normalizePath(path);

    if (normalizedPath === "manifest.json") {
      const text = await entry.async("text");
      try {
        manifest = JSON.parse(text);
      } catch {
        manifest = { name: "Unknown Game" };
      }
    } else if (normalizedPath === "strategy.py") {
      strategyCode = await entry.async("text");
    } else {
      const data = await entry.async("uint8array");
      files.set(normalizedPath, data);
    }
  }

  return { manifest, strategyCode, files };
}

/** Create blob URLs for image/media files in the unpacked game. */
export function createBlobURLs(
  files: Map<string, Uint8Array>
): Map<string, string> {
  const urls = new Map<string, string>();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

  for (const [path, data] of files) {
    const lower = path.toLowerCase();
    const isImage = imageExts.some((ext) => lower.endsWith(ext));
    if (isImage) {
      const mime = getMimeType(lower);
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      // Store with / prefix to match how Python code references them
      // Paths already include "assets/" from the zip structure
      urls.set(`/${path}`, url);
    }
  }

  return urls;
}

/** Revoke all blob URLs to free memory. */
export function revokeBlobURLs(urls: Map<string, string>): void {
  for (const url of urls.values()) {
    URL.revokeObjectURL(url);
  }
}

/** Create a zip blob from a game's components. */
export async function packZip(game: UnpackedGame): Promise<Blob> {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(game.manifest, null, 2));
  zip.file("strategy.py", game.strategyCode);
  for (const [path, data] of game.files) {
    zip.file(path, data);
  }
  return zip.generateAsync({ type: "blob" });
}

function normalizePath(path: string): string {
  // If zip has a root folder (e.g., "chinese_quizlet/assets/..."),
  // strip it so we get "assets/..."
  const parts = path.split("/");
  // Check if first part looks like a root folder (not "assets", "manifest.json", etc.)
  if (
    parts.length > 1 &&
    parts[0] !== "assets" &&
    parts[0] !== "manifest.json" &&
    parts[0] !== "strategy.py"
  ) {
    return parts.slice(1).join("/");
  }
  return path;
}

function getMimeType(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".bmp")) return "image/bmp";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}
