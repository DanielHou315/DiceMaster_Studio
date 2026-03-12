import React from 'react';

interface SimulatorScreenProps {
  face: string;
  data: {
    type: 'text' | 'image';
    content: string;
  };
}

export const SimulatorScreen: React.FC<SimulatorScreenProps> = ({ face, data }) => {
  return (
    <div className="relative group">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
        {face}
      </div>
      <div className="w-full aspect-square bg-black rounded-2xl border-4 border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center p-4 ring-1 ring-white/5 group-hover:border-emerald-500/50 transition-colors duration-500">
        {data.type === 'image' ? (
          <img 
            src={data.content} 
            alt={face} 
            className="w-full h-full object-cover rounded-lg"
            referrerPolicy="no-referrer"
            onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/error/480/480')}
          />
        ) : (
          <div className="text-emerald-400 font-mono text-center break-all text-xs leading-tight">
            {data.content}
          </div>
        )}
        {/* LCD Glare Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_100%)] pointer-events-none" />
        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-30" />
      </div>
    </div>
  );
};
