import React from 'react';
import { motion } from 'motion/react';
import { Languages, Plus, Loader2, Wand2, Sparkles, Dice6, Archive, Download, Upload, FileUp, Type, Image as ImageIcon } from 'lucide-react';
import { LanguageGame } from '../../types';
import { GameCard } from './GameCard';

interface GamesViewProps {
  games: LanguageGame[];
  isGenerating: boolean;
  gamePrompt: string;
  setGamePrompt: (val: string) => void;
  onGenerateGame: (mode: 'random' | 'text' | 'media' | 'custom') => void;
  onSimulate: (game: LanguageGame) => void;
  onDelete: (id: number) => void;
  onEnhance: (game: LanguageGame) => void;
  onEditContent: (game: LanguageGame) => void;
  isEnhancingId: number | null;
  onFlash: (code: string) => void;
  onDownload: (game: LanguageGame) => void;
  onDownloadAll: () => void;
  onUploadZip: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadPy: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddAllToEditor: () => void;
  onViewCode: (game: LanguageGame) => void;
  onInjectFeatured: () => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  games,
  isGenerating,
  gamePrompt,
  setGamePrompt,
  onGenerateGame,
  onSimulate,
  onDelete,
  onEnhance,
  onEditContent,
  isEnhancingId,
  onFlash,
  onDownload,
  onDownloadAll,
  onUploadZip,
  onUploadPy,
  onAddAllToEditor,
  onViewCode,
  onInjectFeatured
}) => {
  const zipInputRef = React.useRef<HTMLInputElement>(null);
  const pyInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <motion.div
      key="games"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Languages className="w-5 h-5 text-emerald-400" />
          Language Learning Games
        </h2>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={zipInputRef} 
            onChange={onUploadZip} 
            accept=".zip" 
            className="hidden" 
          />
          <input 
            type="file" 
            ref={pyInputRef} 
            onChange={onUploadPy} 
            accept=".py" 
            className="hidden" 
          />
          
          <button
            onClick={onInjectFeatured}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            title="Load official examples from DiceMaster repository"
          >
            <Sparkles className="w-3 h-3" />
            Load Official
          </button>

          <button
            onClick={() => pyInputRef.current?.click()}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5"
            title="Upload individual .py game"
          >
            <FileUp className="w-3 h-3" />
            Upload .py
          </button>

          <button
            onClick={() => zipInputRef.current?.click()}
            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5"
            title="Restore from ZIP backup"
          >
            <Upload className="w-3 h-3" />
            Restore ZIP
          </button>

          {games.length > 0 && (
            <>
              <button
                onClick={onDownloadAll}
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5"
                title="Backup all games to ZIP"
              >
                <Archive className="w-3 h-3" />
                Backup All
              </button>
              <button
                onClick={onAddAllToEditor}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                <Plus className="w-3 h-3" />
                Add All to Editor
              </button>
            </>
          )}
        </div>
      </div>

      <div className="glass p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={gamePrompt} 
              onChange={(e) => setGamePrompt(e.target.value)} 
              placeholder="Describe the game (e.g., 'Japanese Kanji matching', 'Spanish verb conjugation'...)" 
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 pr-10" 
              onKeyDown={(e) => e.key === 'Enter' && onGenerateGame('custom')} 
            />
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onGenerateGame('random')}
              disabled={isGenerating}
              className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Dice6 className="w-4 h-4" />
              Surprise Me
            </button>
            <button
              onClick={() => onGenerateGame('text')}
              disabled={isGenerating}
              className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all disabled:opacity-50 whitespace-nowrap border border-white/5"
            >
              <Type className="w-4 h-4" />
              Text Only
            </button>
            <button
              onClick={() => onGenerateGame('media')}
              disabled={isGenerating}
              className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all disabled:opacity-50 whitespace-nowrap border border-white/5"
            >
              <ImageIcon className="w-4 h-4" />
              With Media
            </button>
            <button
              onClick={() => onGenerateGame('custom')}
              disabled={isGenerating}
              className="bg-emerald-500 text-zinc-950 px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isGenerating ? 'Generating...' : 'Create Custom'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2 ml-1 italic">
          Tip: Use "Surprise Me" for a random game, or type a prompt for something specific.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map(game => (
          <GameCard 
            key={game.id} 
            game={game} 
            isEnhancing={isEnhancingId === game.id}
            onSimulate={() => onSimulate(game)}
            onDelete={() => onDelete(game.id)}
            onEnhance={onEnhance}
            onEditContent={onEditContent}
            onFlash={onFlash}
            onDownload={onDownload}
            onViewCode={onViewCode}
          />
        ))}
        
        {games.length === 0 && !isGenerating && (
          <div className="col-span-full py-20 text-center glass rounded-[2rem] border-dashed border-2 border-white/5">
            <Languages className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-400 mb-2">No Games Yet</h3>
            <p className="text-zinc-500 max-w-md mx-auto">
              Use the AI generator to create interactive language learning games for your DiceMaster.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
