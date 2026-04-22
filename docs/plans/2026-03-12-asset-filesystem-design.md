# Virtual Asset Filesystem & Game Platform Design

## Goal

Transform DiceMaster Studio from a code-centric tool into a platform where non-technical users can manage games (strategy + assets as zips), create class session collections, and eventually sync to Google Drive.

## Architecture

### Data Model

**Game (zip file):**
```
my_game.zip/
  manifest.json     — { name, description, strategy_name, version }
  strategy.py       — BaseStrategy subclass code
  assets/           — full directory tree
    question.json
    cat/
      answer.json
      images/
        cat_1.jpg
        cat_2.jpg
        cat4.gif.d/
          0.jpg
          1.jpg
          ...
```

**Collection/Session:**
```json
{
  "id": "uuid",
  "name": "Class A — Week 3",
  "games": ["chinese_quizlet", "math_dice"],
  "created": "2026-03-12T00:00:00Z"
}
```

### Storage (Phase 1 — Local)

- **IndexedDB** via `idb-keyval` or raw IndexedDB for game zips (binary blobs)
- **IndexedDB** for collection metadata (JSON)
- **Pyodide emscripten FS** — game assets unpacked into `/assets/` before each run
- **React state** — current game's unpacked asset tree for UI display

### Storage (Phase 2 — Google Drive, future)

- Drive folder `DiceMaster/games/*.zip`, `DiceMaster/collections/*.json`
- IndexedDB becomes a read cache
- Auto-sync on open/save

### Pyodide Integration

When user clicks Run:
1. Unpack current game's zip assets into Pyodide's emscripten virtual FS at `/assets/`
2. Python code uses `os.walk`, `os.listdir`, `os.path.exists` naturally
3. `screen.set_image(id, "/assets/cat/images/cat_1.jpg")` — path sent to main thread
4. Main thread resolves path against the unpacked asset map to get a displayable blob URL
5. React renders `<img src={blobURL}>`

### Image Path Resolution

Worker sends: `{ type: "screen.set_image", screen_id: 2, path: "/assets/cat/images/cat_1.jpg" }`

Main thread has `assetBlobURLs: Map<string, string>` (path → object URL).
In the message handler:
```
case 'screen.set_image':
  const blobUrl = assetBlobURLs.get(msg.path) || msg.path;
  setScreens(prev => ({ ...prev, [face]: { type: 'image', content: blobUrl } }));
```

### UI Changes

**Simulator tab merge:** 2D and 3D views become a toggle within a single "Simulator" tab. The sidebar (Info/Data/Edit) stays the same regardless of view mode.

**Asset Manager:** Replace flat asset library with a tree-based file manager:
- Folder tree view (collapsible)
- Upload files into specific folders
- Create/delete folders
- Drag and drop
- Image preview on hover/click

**Game Manager:** New "My Games" section:
- List of games (each is a zip)
- Import game zip
- Export game zip (download)
- Create new game from template

## Phased Rollout

**Phase 1 (this implementation):**
- Virtual asset filesystem (IndexedDB + Pyodide FS mount)
- Asset manager UI with folder tree
- Game zip import/export
- Simulator 2D/3D toggle merge
- Test with real chinese_quizlet game + images

**Phase 2 (future):**
- Google Drive sync
- Collection/session management
- Game sharing (read-only Drive links)
- Flash drive export (USB)
