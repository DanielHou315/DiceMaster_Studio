import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Package, Upload, Download, FolderPlus, Trash2, ChevronRight,
  ChevronDown, File, Folder, Image as ImageIcon, FileText, Plus
} from 'lucide-react';
import {
  listGames, saveGame, deleteGame, loadGame,
  unpackZip, packZip, UnpackedGame, GameManifest
} from '../../services/assetStore';
import { cn } from '../../lib/utils';

interface AssetsViewProps {
  onSelectGame?: (gameName: string) => void;
  currentGameName?: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
  size?: number;
}

function buildTree(files: Map<string, Uint8Array>): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  const getOrCreateDir = (dirPath: string): TreeNode => {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!;
    const parts = dirPath.split('/');
    const name = parts[parts.length - 1];
    const node: TreeNode = { name, path: dirPath, isDir: true, children: [] };
    dirMap.set(dirPath, node);
    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = getOrCreateDir(parentPath);
      parent.children!.push(node);
    }
    return node;
  };

  for (const [path, data] of files) {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    const fileNode: TreeNode = { name: fileName, path, isDir: false, size: data.length };
    if (parts.length === 1) {
      root.push(fileNode);
    } else {
      const dirPath = parts.slice(0, -1).join('/');
      const parent = getOrCreateDir(dirPath);
      parent.children!.push(fileNode);
    }
  }

  return root;
}

function isImageFile(path: string): boolean {
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  return exts.some(ext => path.toLowerCase().endsWith(ext));
}

const FileTreeNode: React.FC<{
  node: TreeNode;
  depth: number;
  onDelete: (path: string) => void;
  previewUrl?: string;
}> = ({ node, depth, onDelete, previewUrl }) => {
  const [expanded, setExpanded] = useState(depth < 2);

  const icon = node.isDir ? (
    expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />
  ) : isImageFile(node.path) ? (
    <ImageIcon className="w-4 h-4 text-emerald-400" />
  ) : node.path.endsWith('.json') ? (
    <FileText className="w-4 h-4 text-blue-400" />
  ) : (
    <File className="w-4 h-4 text-zinc-400" />
  );

  const folderIcon = node.isDir ? <Folder className="w-4 h-4 text-yellow-500" /> : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 group cursor-pointer text-sm",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => node.isDir && setExpanded(!expanded)}
      >
        {icon}
        {folderIcon}
        <span className="text-zinc-300 truncate flex-1">{node.name}</span>
        {!node.isDir && node.size !== undefined && (
          <span className="text-zinc-600 text-xs">{(node.size / 1024).toFixed(1)}KB</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {previewUrl && !node.isDir && isImageFile(node.path) && (
        <div style={{ paddingLeft: `${depth * 16 + 32}px` }} className="py-1">
          <img src={previewUrl} alt={node.name} className="w-16 h-16 object-cover rounded-lg border border-white/10" />
        </div>
      )}
      {node.isDir && expanded && node.children?.map(child => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} onDelete={onDelete} />
      ))}
    </div>
  );
};

export const AssetsView: React.FC<AssetsViewProps> = ({ onSelectGame, currentGameName }) => {
  const [games, setGames] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(currentGameName ?? null);
  const [unpacked, setUnpacked] = useState<UnpackedGame | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [newFolderPath, setNewFolderPath] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  const refreshGames = useCallback(async () => {
    const names = await listGames();
    setGames(names);
  }, []);

  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  const selectGame = useCallback(async (name: string) => {
    setSelectedGame(name);
    onSelectGame?.(name);
    const blob = await loadGame(name);
    if (blob) {
      const u = await unpackZip(blob);
      setUnpacked(u);
      setTree(buildTree(u.files));
    }
  }, [onSelectGame]);

  useEffect(() => {
    if (currentGameName && currentGameName !== selectedGame) {
      selectGame(currentGameName);
    }
  }, [currentGameName, selectedGame, selectGame]);

  const handleImportZip = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const name = file.name.replace('.zip', '');
      await saveGame(name, file);
      await refreshGames();
      selectGame(name);
    };
    input.click();
  };

  const handleExportZip = async () => {
    if (!selectedGame || !unpacked) return;
    const blob = await packZip(unpacked);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedGame}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteGame = async (name: string) => {
    if (!confirm(`Delete game "${name}"?`)) return;
    await deleteGame(name);
    if (selectedGame === name) {
      setSelectedGame(null);
      setUnpacked(null);
      setTree([]);
    }
    await refreshGames();
  };

  const handleDeleteFile = async (path: string) => {
    if (!unpacked) return;
    unpacked.files.delete(path);
    // Also delete children if directory
    for (const key of [...unpacked.files.keys()]) {
      if (key.startsWith(path + '/')) unpacked.files.delete(key);
    }
    setTree(buildTree(unpacked.files));
    // Save back to IndexedDB
    if (selectedGame) {
      const blob = await packZip(unpacked);
      await saveGame(selectedGame, blob);
    }
  };

  const handleUploadFiles = async () => {
    if (!unpacked || !selectedGame) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e: Event) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (!fileList) return;
      for (const file of Array.from(fileList)) {
        const buffer = await file.arrayBuffer();
        const path = `assets/${file.name}`;
        unpacked.files.set(path, new Uint8Array(buffer));
      }
      setTree(buildTree(unpacked.files));
      const blob = await packZip(unpacked);
      await saveGame(selectedGame, blob);
    };
    input.click();
  };

  const handleCreateFolder = async () => {
    if (!unpacked || !selectedGame || !newFolderPath.trim()) return;
    const folderPath = newFolderPath.trim().replace(/^\/+|\/+$/g, '');
    // Add a placeholder file so the folder persists
    unpacked.files.set(`${folderPath}/.keep`, new Uint8Array(0));
    setTree(buildTree(unpacked.files));
    const blob = await packZip(unpacked);
    await saveGame(selectedGame, blob);
    setNewFolderPath('');
    setShowNewFolder(false);
  };

  return (
    <motion.div
      key="assets"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          Game Assets
        </h2>
        <button
          onClick={handleImportZip}
          className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all"
        >
          <Upload className="w-4 h-4" />
          Import Game Zip
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Game List */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">My Games</h3>
          {games.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-sm">
              No games yet. Import a zip to get started.
            </div>
          )}
          {games.map(name => (
            <div
              key={name}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all group",
                selectedGame === name
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-white/5 border border-white/5 hover:bg-white/10"
              )}
              onClick={() => selectGame(name)}
            >
              <Package className={cn("w-4 h-4", selectedGame === name ? "text-emerald-400" : "text-zinc-500")} />
              <span className="text-sm text-zinc-300 flex-1 truncate">{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteGame(name); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* File Tree */}
        <div className="lg:col-span-3">
          {!selectedGame ? (
            <div className="text-center py-20 glass rounded-[2rem] border-dashed border-2 border-white/5">
              <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-400 mb-2">Select a Game</h3>
              <p className="text-zinc-500">Choose a game from the list or import a new zip file.</p>
            </div>
          ) : (
            <div className="glass rounded-2xl border border-emerald-500/10 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 p-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white flex-1">
                  {unpacked?.manifest.name || selectedGame}
                  {unpacked?.manifest.version && (
                    <span className="text-zinc-500 ml-2">v{unpacked.manifest.version}</span>
                  )}
                </h3>
                <button onClick={handleUploadFiles} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5" title="Upload files">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setShowNewFolder(!showNewFolder)} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5" title="New folder">
                  <FolderPlus className="w-4 h-4" />
                </button>
                <button onClick={handleExportZip} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5" title="Export zip">
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* New Folder Input */}
              {showNewFolder && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/5">
                  <input
                    type="text"
                    value={newFolderPath}
                    onChange={(e) => setNewFolderPath(e.target.value)}
                    placeholder="assets/my-folder"
                    className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="bg-emerald-500 text-zinc-950 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-400"
                  >
                    Create
                  </button>
                </div>
              )}

              {/* Manifest info */}
              {unpacked?.manifest.description && (
                <div className="px-4 py-2 border-b border-white/5 text-xs text-zinc-500">
                  {unpacked.manifest.description}
                </div>
              )}

              {/* Strategy file */}
              {unpacked?.strategyCode && (
                <div className="px-4 py-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5 text-sm text-zinc-300">
                    <FileText className="w-4 h-4 text-purple-400" />
                    strategy.py
                    <span className="text-zinc-600 text-xs ml-auto">{(unpacked.strategyCode.length / 1024).toFixed(1)}KB</span>
                  </div>
                </div>
              )}

              {/* File tree */}
              <div className="p-2 max-h-[500px] overflow-y-auto">
                {tree.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-sm">
                    No asset files. Upload some files to get started.
                  </div>
                ) : (
                  tree.map(node => (
                    <FileTreeNode key={node.path} node={node} depth={0} onDelete={handleDeleteFile} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
