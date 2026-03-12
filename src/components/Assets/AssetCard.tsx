import React from 'react';
import { Trash2, Download } from 'lucide-react';

interface AssetCardProps {
  asset: {
    id: number;
    name: string;
    data: string;
  };
  onDelete: (id: number) => void;
  onCopy: (data: string) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onDelete, onCopy }) => {
  return (
    <div className="glass p-3 rounded-2xl border border-white/5 group relative">
      <div className="aspect-square rounded-xl overflow-hidden bg-black mb-2">
        <img src={asset.data} alt={asset.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
      </div>
      <div className="text-[10px] text-zinc-500 truncate font-mono">{asset.name}</div>
      <button 
        onClick={() => onDelete(asset.id)}
        className="absolute top-2 right-2 p-1 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      <button 
        onClick={() => onCopy(asset.data)}
        className="absolute top-2 left-2 p-1 bg-emerald-500/20 text-emerald-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Download className="w-3 h-3" />
      </button>
    </div>
  );
};
