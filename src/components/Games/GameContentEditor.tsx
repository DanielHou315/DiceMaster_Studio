import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Download, Upload, Plus, Trash2, Type, Image as ImageIcon, Table as TableIcon, FileSpreadsheet } from 'lucide-react';
import { LanguageGame, DiceScreens } from '../../types';
import Papa from 'papaparse';

interface GameContentEditorProps {
  game: LanguageGame;
  onClose: () => void;
  onSave: (updatedGame: LanguageGame) => void;
}

export const GameContentEditor: React.FC<GameContentEditorProps> = ({ game, onClose, onSave }) => {
  const [rounds, setRounds] = useState<DiceScreens[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (game.mock_rounds && Array.isArray(game.mock_rounds)) {
      try {
        const parsed = game.mock_rounds.map(r => {
          if (typeof r === 'string' && r.trim()) {
            return JSON.parse(r);
          }
          return r;
        }).filter(r => r && typeof r === 'object');
        setRounds(parsed);
      } catch (e) {
        console.error("Failed to parse rounds", e);
        setRounds([]);
      }
    }
  }, [game]);

  const handleUpdateScreen = (roundIndex: number, face: keyof DiceScreens, field: 'type' | 'content', value: string) => {
    const newRounds = [...rounds];
    newRounds[roundIndex] = {
      ...newRounds[roundIndex],
      [face]: {
        ...newRounds[roundIndex][face],
        [field]: value
      }
    };
    setRounds(newRounds);
  };

  const addRound = () => {
    const emptyRound: DiceScreens = {
      top: { type: 'text', content: '' },
      bottom: { type: 'text', content: '' },
      front: { type: 'text', content: '' },
      back: { type: 'text', content: '' },
      left: { type: 'text', content: '' },
      right: { type: 'text', content: '' },
    };
    setRounds([...rounds, emptyRound]);
  };

  const removeRound = (index: number) => {
    setRounds(rounds.filter((_, i) => i !== index));
  };

  const exportToCSV = () => {
    const csvData = rounds.map((round, index) => ({
      Round: index + 1,
      Top_Type: round.top.type,
      Top_Content: round.top.content,
      Bottom_Type: round.bottom.type,
      Bottom_Content: round.bottom.content,
      Front_Type: round.front.type,
      Front_Content: round.front.content,
      Back_Type: round.back.type,
      Back_Content: round.back.content,
      Left_Type: round.left.type,
      Left_Content: round.left.content,
      Right_Type: round.right.type,
      Right_Content: round.right.content,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${game.name.replace(/\s+/g, '_')}_content.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const importedRounds: DiceScreens[] = results.data.map((row: any) => ({
          top: { type: row.Top_Type || 'text', content: row.Top_Content || '' },
          bottom: { type: row.Bottom_Type || 'text', content: row.Bottom_Content || '' },
          front: { type: row.Front_Type || 'text', content: row.Front_Content || '' },
          back: { type: row.Back_Type || 'text', content: row.Back_Content || '' },
          left: { type: row.Left_Type || 'text', content: row.Left_Content || '' },
          right: { type: row.Right_Type || 'text', content: row.Right_Content || '' },
        }));
        setRounds(importedRounds);
      }
    });
  };

  const handleSave = () => {
    const updatedMockRounds = rounds.map(r => JSON.stringify(r));
    
    // Try to update the code if it has a GAME_ROUNDS variable
    let updatedCode = game.code;
    const roundsJson = JSON.stringify(rounds, null, 2);
    
    // Look for GAME_ROUNDS = [...] or similar patterns
    const roundsRegex = /(GAME_ROUNDS\s*=\s*)\[[\s\S]*?\]/;
    if (roundsRegex.test(updatedCode)) {
      updatedCode = updatedCode.replace(roundsRegex, `$1${roundsJson}`);
    }

    onSave({
      ...game,
      mock_rounds: updatedMockRounds,
      code: updatedCode
    });
  };

  const faces: (keyof DiceScreens)[] = ['top', 'bottom', 'front', 'back', 'left', 'right'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-[2rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-bottom border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <TableIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Edit Game Content</h2>
              <p className="text-sm text-zinc-500">Manage rounds, vocabulary, and screens for "{game.name}"</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={importFromCSV} />
            </label>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {rounds.map((round, rIdx) => (
              <div key={rIdx} className="glass p-4 rounded-2xl border border-white/5 relative group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Round {rIdx + 1}</h3>
                  <button 
                    onClick={() => removeRound(rIdx)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {faces.map(face => (
                    <div key={face} className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter block ml-1">{face}</label>
                      <div className="flex flex-col gap-2">
                        <div className="flex bg-zinc-950 rounded-lg p-1 border border-white/5">
                          <button
                            onClick={() => handleUpdateScreen(rIdx, face, 'type', 'text')}
                            className={`flex-1 p-1 rounded-md transition-all ${round[face].type === 'text' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                          >
                            <Type className="w-3 h-3 mx-auto" />
                          </button>
                          <button
                            onClick={() => handleUpdateScreen(rIdx, face, 'type', 'image')}
                            className={`flex-1 p-1 rounded-md transition-all ${round[face].type === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                          >
                            <ImageIcon className="w-3 h-3 mx-auto" />
                          </button>
                        </div>
                        <input 
                          type="text"
                          value={round[face].content}
                          onChange={(e) => handleUpdateScreen(rIdx, face, 'content', e.target.value)}
                          placeholder={round[face].type === 'text' ? 'Text...' : 'icon.png'}
                          className="w-full bg-zinc-950 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={addRound}
              className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" />
              Add New Round
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-top border-white/5 flex justify-end gap-3 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-zinc-400 hover:text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-2 bg-emerald-500 text-zinc-950 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
