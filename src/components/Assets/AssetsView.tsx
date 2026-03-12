import React from 'react';
import { motion } from 'motion/react';
import { Package, Plus, Loader2, ImageIcon, Sparkles, Upload, Info } from 'lucide-react';
import { AssetCard } from './AssetCard';

interface AssetsViewProps {
  assets: any[];
  isGenerating: boolean;
  assetPrompt: string;
  setAssetPrompt: (val: string) => void;
  onGenerateAsset: () => void;
  onUpload: () => void;
  onDelete: (id: number) => void;
  onCopy: (data: string) => void;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  isGenerating,
  assetPrompt,
  setAssetPrompt,
  onGenerateAsset,
  onUpload,
  onDelete,
  onCopy
}) => {
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
          Asset Library
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={assetPrompt} 
                  onChange={(e) => setAssetPrompt(e.target.value)} 
                  placeholder="Describe the asset (e.g., 'A pixel art dragon', 'Japanese Kanji for Fire'...)" 
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 pr-10" 
                  onKeyDown={(e) => e.key === 'Enter' && onGenerateAsset()} 
                />
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onUpload}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
                <button
                  onClick={onGenerateAsset}
                  disabled={isGenerating || !assetPrompt}
                  className="bg-emerald-500 text-zinc-950 px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {isGenerating ? 'Generating...' : 'AI Generate'}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map(asset => (
              <AssetCard 
                key={asset.id} 
                asset={asset} 
                onDelete={() => onDelete(asset.id)}
                onCopy={onCopy}
              />
            ))}
            
            {assets.length === 0 && !isGenerating && (
              <div className="col-span-full py-20 text-center glass rounded-[2rem] border-dashed border-2 border-white/5">
                <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-400 mb-2">No Assets Yet</h3>
                <p className="text-zinc-500 max-w-md mx-auto">
                  Generate custom icons and graphics for your multi-screen dice games.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl border border-emerald-500/10">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-emerald-400" />
              How to use Assets
            </h3>
            <div className="space-y-4 text-sm text-zinc-400">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-emerald-400 font-bold text-xs uppercase mb-1">Dimensions</h4>
                <p>The DiceMaster screens are **240x240 pixels**. For best results, upload square images.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-emerald-400 font-bold text-xs uppercase mb-1">File Types</h4>
                <p>Supported formats: **PNG, JPG, BMP**. Bitmaps are preferred for direct hardware rendering.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-emerald-400 font-bold text-xs uppercase mb-1">AI Generation</h4>
                <p>Gemini will generate a high-quality square image based on your prompt. You can then copy the URL to use in your Python code.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <h4 className="text-emerald-400 font-bold text-xs uppercase mb-1">Code Integration</h4>
                <p>Use the `lcd.image(0, 0, "url")` function in your Python scripts to display these assets.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
