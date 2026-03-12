import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import JSZip from "jszip";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("dice_lab.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS analysis_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS language_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    code TEXT NOT NULL,
    mock_data TEXT NOT NULL,
    mock_rounds TEXT,
    assets_manifest TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add mock_rounds to language_games if it doesn't exist
try {
  db.prepare("ALTER TABLE language_games ADD COLUMN mock_rounds TEXT").run();
} catch (e) {
  // Column already exists or table doesn't exist yet
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });

  // API routes
  app.get("/api/project", (req, res) => {
    const files = db.prepare("SELECT path, content FROM project_files").all();
    res.json({ files });
  });

  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM analysis_logs ORDER BY created_at DESC").all();
    res.json({ logs });
  });

  app.get("/api/language-games", (req, res) => {
    const games = db.prepare("SELECT * FROM language_games ORDER BY created_at DESC").all();
    res.json({ games });
  });

  app.post("/api/language-games", (req, res) => {
    const { name, description, code, mock_data, mock_rounds, assets_manifest } = req.body;
    if (!name || !description || !code || !mock_data) return res.status(400).json({ error: "Missing fields" });
    const roundsStr = mock_rounds ? (Array.isArray(mock_rounds) ? JSON.stringify(mock_rounds) : mock_rounds) : null;
    const info = db.prepare("INSERT INTO language_games (name, description, code, mock_data, mock_rounds, assets_manifest) VALUES (?, ?, ?, ?, ?, ?)").run(name, description, code, mock_data, roundsStr, assets_manifest);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/language-games/:id", (req, res) => {
    const { name, description, code, mock_data, mock_rounds, assets_manifest } = req.body;
    const roundsStr = mock_rounds ? (Array.isArray(mock_rounds) ? JSON.stringify(mock_rounds) : mock_rounds) : null;
    const info = db.prepare("UPDATE language_games SET name = ?, description = ?, code = ?, mock_data = ?, mock_rounds = ?, assets_manifest = ? WHERE id = ?").run(name, description, code, mock_data, roundsStr, assets_manifest, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Game not found" });
    res.json({ message: "Game updated" });
  });

  app.delete("/api/language-games", (req, res) => {
    db.prepare("DELETE FROM language_games").run();
    res.json({ message: "All games deleted" });
  });

  app.delete("/api/language-games/:id", (req, res) => {
    db.prepare("DELETE FROM language_games WHERE id = ?").run(req.params.id);
    res.json({ message: "Game deleted" });
  });

  app.get("/api/assets", (req, res) => {
    const assets = db.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
    res.json({ assets });
  });

  app.post("/api/assets", (req, res) => {
    const { name, data, type } = req.body;
    if (!name || !data || !type) return res.status(400).json({ error: "Missing fields" });
    const info = db.prepare("INSERT INTO assets (name, data, type) VALUES (?, ?, ?)").run(name, data, type);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/assets", (req, res) => {
    db.prepare("DELETE FROM assets").run();
    res.json({ message: "All assets deleted" });
  });

  app.delete("/api/assets/:id", (req, res) => {
    db.prepare("DELETE FROM assets WHERE id = ?").run(req.params.id);
    res.json({ message: "Asset deleted" });
  });

  app.delete("/api/project", (req, res) => {
    db.prepare("DELETE FROM project_files").run();
    res.json({ message: "Project cleared" });
  });

  app.delete("/api/logs", (req, res) => {
    db.prepare("DELETE FROM analysis_logs").run();
    res.json({ message: "Logs cleared" });
  });

  app.put("/api/project/file", (req, res) => {
    const { path, content } = req.body;
    if (!path || content === undefined) return res.status(400).json({ error: "Missing path or content" });
    const info = db.prepare("UPDATE project_files SET content = ? WHERE path = ?").run(content, path);
    if (info.changes === 0) return res.status(404).json({ error: "File not found" });
    res.json({ message: "File updated successfully" });
  });

  app.post("/api/logs", (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "No content" });
    const info = db.prepare("INSERT INTO analysis_logs (content) VALUES (?)").run(content);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const zip = new JSZip();
      const contents = await zip.loadAsync(req.file.buffer);
      
      const files: { path: string; content: string }[] = [];
      
      for (const [relativePath, file] of Object.entries(contents.files)) {
        if (!file.dir) {
          const content = await file.async("string");
          files.push({
            path: relativePath,
            content: content
          });
        }
      }

      const filteredFiles = files.filter(f => !f.path.includes('node_modules') && !f.path.includes('.git'));

      // Update database: Clear old files and insert new ones
      const deleteStmt = db.prepare("DELETE FROM project_files");
      const insertStmt = db.prepare("INSERT INTO project_files (path, content) VALUES (?, ?)");
      
      const transaction = db.transaction((filesToInsert) => {
        deleteStmt.run();
        for (const file of filesToInsert) {
          insertStmt.run(file.path, file.content);
        }
      });

      transaction(filteredFiles);

      res.json({ 
        message: "File unzipped and persisted successfully", 
        files: filteredFiles
      });
    } catch (error) {
      console.error("Error unzipping file:", error);
      res.status(500).json({ error: "Failed to unzip file" });
    }
  });

  app.post("/api/upload-preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const zip = new JSZip();
      const contents = await zip.loadAsync(req.file.buffer);
      
      const files: { path: string; content: string }[] = [];
      
      for (const [relativePath, file] of Object.entries(contents.files)) {
        if (!file.dir && !relativePath.includes('node_modules') && !relativePath.includes('.git')) {
          const content = await file.async("string");
          files.push({
            path: relativePath,
            content: content
          });
        }
      }

      res.json({ files });
    } catch (error) {
      console.error("Error unzipping file:", error);
      res.status(500).json({ error: "Failed to unzip file" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
