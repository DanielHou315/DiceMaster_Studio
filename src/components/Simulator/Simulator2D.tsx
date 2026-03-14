import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, FileUp, Github, RotateCw, Smartphone, Loader2, Info, BookOpen, Sparkles, Edit3, Database, Wand2, List } from 'lucide-react';
import type { SimStatus } from '../../services/pyodideService';
import { SimulatorScreen } from './SimulatorScreen';
import { DiceScreens, LanguageGame, ProjectFile } from '../../types';
import { cn } from '../../lib/utils';

interface Simulator2DProps {
  screens: DiceScreens;
  isShaking: boolean;
  isAnalyzing: boolean;
  pyodideStatus?: SimStatus;
  onLoadFile: () => void;
  onLoadBaseCode: () => void;
  onShakeDice: () => void;
  onUpdateScreen: (face: keyof DiceScreens, content: string, type: 'text' | 'image') => void;
  shakeSensitivity?: number;
  activeGame?: LanguageGame | null;
  files: ProjectFile[];
  onGenerateInstructions: (game: LanguageGame) => void;
  onEditInstructions: (path: string) => void;
  onExpandGameData: (game: LanguageGame) => void;
  isExpandingData?: boolean;
}

export const Simulator2D: React.FC<Simulator2DProps> = ({
  screens,
  isShaking,
  isAnalyzing,
  pyodideStatus,
  onLoadFile,
  onLoadBaseCode,
  onShakeDice,
  onUpdateScreen,
  shakeSensitivity = 50,
  activeGame,
  files,
  onGenerateInstructions,
  onEditInstructions,
  onExpandGameData,
  isExpandingData = false
}) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState<'instructions' | 'data' | 'editor'>('instructions');
  const intensity = shakeSensitivity / 50;

  const readmePath = activeGame ? `games/${activeGame.name.replace(/\s+/g, '_')}_README.md` : null;
  const hasReadme = readmePath ? files.some(f => f.path === readmePath) : false;

  const mockRounds = activeGame?.mock_rounds ? (typeof activeGame.mock_rounds === 'string' ? JSON.parse(activeGame.mock_rounds) : activeGame.mock_rounds) : [];

  return (
    <motion.div
      key="sim2d"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layout className="w-5 h-5 text-emerald-400" />
          2D Flat Layout Simulation
        </h2>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Status Pill */}
          {pyodideStatus === 'loading' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-bold">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading Python...
            </div>
          ) : pyodideStatus === 'running' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Running
            </div>
          ) : pyodideStatus === 'error' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Error
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-700/50 text-zinc-400 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-zinc-400" /> Ready
            </div>
          )}
          <button
            onClick={onLoadFile}
            className="flex-1 sm:flex-none bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all"
          >
            <FileUp className="w-4 h-4" />
            Load .py
          </button>
          <button 
            onClick={onLoadBaseCode}
            disabled={isAnalyzing}
            className="flex-1 sm:flex-none bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
            Base Code
          </button>
          <button 
            onClick={onShakeDice}
            className="flex-1 sm:flex-none bg-emerald-500 text-zinc-950 px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all"
          >
            <RotateCw className={cn("w-4 h-4", isShaking && "animate-spin")} />
            Shake
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass p-4 sm:p-12 rounded-[2rem] sm:rounded-[3rem] bg-zinc-900/30 flex flex-col items-center justify-center min-h-[400px] sm:min-h-[600px] overflow-x-auto custom-scrollbar relative">
          {/* Hardware Status Overlay */}
          <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500/50">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM: ONLINE
            </div>
            <div className="text-[10px] font-mono text-zinc-600">
              SPI_BUS: 40MHz
            </div>
            <div className="text-[10px] font-mono text-zinc-600">
              FPS: 60.0
            </div>
          </div>

          <motion.div 
            animate={isShaking ? { 
              x: [0, -20 * intensity, 20 * intensity, -20 * intensity, 20 * intensity, 0],
              y: [0, 10 * intensity, -10 * intensity, 10 * intensity, -10 * intensity, 0],
              rotate: [0, -5 * intensity, 5 * intensity, -5 * intensity, 5 * intensity, 0]
            } : {}}
            className="relative w-full max-w-2xl aspect-square grid grid-cols-4 grid-rows-3 gap-3 sm:gap-6 min-w-[500px]"
          >
            {/* Standard Cube Net Layout - All 6 faces */}
            <div className="col-start-2 row-start-1"><SimulatorScreen face="top" data={screens.top} /></div>
            <div className="col-start-1 row-start-2"><SimulatorScreen face="left" data={screens.left} /></div>
            <div className="col-start-2 row-start-2 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-2xl"><SimulatorScreen face="front" data={screens.front} /></div>
            <div className="col-start-3 row-start-2"><SimulatorScreen face="right" data={screens.right} /></div>
            <div className="col-start-4 row-start-2"><SimulatorScreen face="back" data={screens.back} /></div>
            <div className="col-start-2 row-start-3"><SimulatorScreen face="bottom" data={screens.bottom} /></div>
          </motion.div>
        </div>

        {/* Sidebar with Tabs */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="glass rounded-3xl overflow-hidden border border-white/5 flex flex-col h-full min-h-[500px]">
            {/* Tabs Header */}
            <div className="flex border-b border-white/5 bg-white/5">
              <button 
                onClick={() => setActiveSidebarTab('instructions')}
                className={cn(
                  "flex-1 py-3 px-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-all",
                  activeSidebarTab === 'instructions' ? "text-emerald-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <BookOpen className="w-4 h-4" />
                Info
              </button>
              <button 
                onClick={() => setActiveSidebarTab('data')}
                className={cn(
                  "flex-1 py-3 px-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-all",
                  activeSidebarTab === 'data' ? "text-emerald-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Database className="w-4 h-4" />
                Data
              </button>
              <button 
                onClick={() => setActiveSidebarTab('editor')}
                className={cn(
                  "flex-1 py-3 px-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 transition-all",
                  activeSidebarTab === 'editor' ? "text-emerald-400 bg-white/5" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Smartphone className="w-4 h-4" />
                Edit
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <AnimatePresence mode="wait">
                {activeSidebarTab === 'instructions' && (
                  <motion.div
                    key="instructions"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    {activeGame ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-emerald-400">{activeGame.name}</div>
                          <div className="flex items-center gap-1">
                            {hasReadme ? (
                              <button 
                                onClick={() => readmePath && onEditInstructions(readmePath)}
                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                title="Edit Instructions"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => onGenerateInstructions(activeGame)}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 text-[10px] font-bold"
                                title="Generate Instructions"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Generate
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{activeGame.description}</p>
                        <div className="pt-4 border-t border-white/5">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">How to play:</div>
                          <ul className="text-sm text-zinc-400 space-y-2">
                            <li className="flex gap-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              Click "Shake" to cycle through rounds
                            </li>
                            <li className="flex gap-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              Observe all 6 screens for clues
                            </li>
                            <li className="flex gap-2">
                              <span className="text-emerald-500 font-bold">•</span>
                              The bottom screen usually shows status
                            </li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Info className="w-10 h-10 text-zinc-800 mb-4" />
                        <p className="text-zinc-500 text-sm">Select a game from the "Games" tab to see specific instructions.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeSidebarTab === 'data' && (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        Game Data Lab
                      </h3>
                      {activeGame && (
                        <button 
                          onClick={() => onExpandGameData(activeGame)}
                          disabled={isExpandingData}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-zinc-950 rounded-lg text-[10px] font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
                        >
                          {isExpandingData ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                          AI Expand
                        </button>
                      )}
                    </div>

                    {activeGame ? (
                      <div className="space-y-3">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Rounds Count</div>
                          <div className="text-xl font-bold text-white">{mockRounds.length} Rounds</div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <List className="w-3 h-3" />
                            Rounds Preview
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {mockRounds.map((round: any, idx: number) => {
                              const data = typeof round === 'string' ? JSON.parse(round) : round;
                              return (
                                <div key={idx} className="bg-zinc-900/50 border border-white/5 rounded-lg p-2 text-[10px] text-zinc-400 flex items-center justify-between">
                                  <span className="font-mono text-emerald-500/50">#{idx + 1}</span>
                                  <span className="truncate max-w-[150px]">{data.front?.content || 'Round Data'}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Database className="w-10 h-10 text-zinc-800 mb-4" />
                        <p className="text-zinc-500 text-sm">Load a game to manage its data rounds.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeSidebarTab === 'editor' && (
                  <motion.div
                    key="editor"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Quick Content Editor
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      {(Object.keys(screens) as Array<keyof DiceScreens>).map(face => (
                        <div key={face} className="space-y-1">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">{face}</label>
                          <input 
                            type="text" 
                            value={screens[face].content}
                            onChange={(e) => onUpdateScreen(face, e.target.value, screens[face].type)}
                            className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
