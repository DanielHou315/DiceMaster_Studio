import React from 'react';
import { Wand2, Zap, Download, Trash2, Play, Code2, ImageIcon, Type, Table as TableIcon } from 'lucide-react';
import { LanguageGame } from '../../types';

interface GameCardProps {
  game: LanguageGame;
  isEnhancing: boolean;
  onEnhance: (game: LanguageGame) => void;
  onEditContent: (game: LanguageGame) => void;
  onFlash: (code: string) => void;
  onDownload: (game: LanguageGame) => void;
  onDelete: (id: number) => void;
  onSimulate: (game: LanguageGame) => void;
  onViewCode: (game: LanguageGame) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ 
  game, 
  isEnhancing,
  onEnhance, 
  onEditContent,
  onFlash, 
  onDownload, 
  onDelete, 
  onSimulate, 
  onViewCode 
}) => {
  return (
    <div className="glass p-4 rounded-2xl flex flex-col gap-3 border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
      {isEnhancing && (
        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
          <Wand2 className="w-8 h-8 text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">AI Enhancing...</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 truncate pr-2">
          {game.assets_manifest ? (
            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Type className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          <h3 className="text-lg font-bold text-white truncate">{game.name}</h3>
          {game.name.includes('(Official)') && (
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">
              Official
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => onEditContent(game)}
            className="text-zinc-600 hover:text-emerald-400 transition-colors p-1"
            title="Edit Content (Table/CSV)"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onEnhance(game)}
            className="text-zinc-600 hover:text-emerald-400 transition-colors p-1"
            title="AI Enhance (Add Rounds & Content)"
          >
            <Wand2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onFlash(game.code)}
            className="text-zinc-600 hover:text-amber-400 transition-colors p-1"
            title="Flash to Dice"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDownload(game)}
            className="text-zinc-600 hover:text-emerald-400 transition-colors p-1"
            title="Download Game"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(game.id)}
            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
            title="Delete Game"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-zinc-400 text-xs line-clamp-2 flex-1">{game.description}</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSimulate(game)}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Play className="w-3 h-3" />
          Simulate
        </button>
        <button
          onClick={() => onViewCode(game)}
          className="px-3 bg-zinc-900 border border-white/5 hover:border-emerald-500/50 text-zinc-400 hover:text-white rounded-lg transition-all"
          title="View Code"
        >
          <Code2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
