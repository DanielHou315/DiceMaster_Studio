import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Download, Copy, Loader2, Search } from 'lucide-react';

interface ExampleMeta {
  file: string;
  name: string;
  description: string;
  strategy_name?: string;
  version?: string;
}

interface ExamplesGalleryProps {
  onClose: () => void;
  onLoad: (file: string, name: string) => Promise<void>;
  onRemix: (file: string, name: string) => Promise<void>;
  loadingFile: string | null;
}

export const ExamplesGallery: React.FC<ExamplesGalleryProps> = ({
  onClose,
  onLoad,
  onRemix,
  loadingFile,
}) => {
  const [examples, setExamples] = useState<ExampleMeta[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/examples/manifest.json')
      .then(r => r.json())
      .then(setExamples)
      .catch(console.error);
  }, []);

  const filtered = examples.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase()) ||
    e.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Example Games</h2>
              <span className="text-xs text-zinc-500 ml-1">({examples.length} games)</span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-5 py-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search examples..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-y-auto flex-1 p-5">
            {filtered.length === 0 ? (
              <p className="text-center text-zinc-500 py-10">No examples match your search.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(ex => {
                  const isLoading = loadingFile === ex.file;
                  return (
                    <div
                      key={ex.file}
                      className="bg-zinc-800 border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm leading-tight mb-1">{ex.name}</h3>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{ex.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onLoad(ex.file, ex.name)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-bold py-1.5 rounded-lg transition-colors"
                          title="Load this game into your library"
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                          Load
                        </button>
                        <button
                          onClick={() => onRemix(ex.file, ex.name)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                          title="Create a remix to customize with your own assets"
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                          Remix
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-white/5 text-xs text-zinc-500">
            <strong className="text-zinc-400">Load</strong> — add the game to your library as-is &nbsp;·&nbsp;
            <strong className="text-zinc-400">Remix</strong> — create an editable copy with your own assets
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
