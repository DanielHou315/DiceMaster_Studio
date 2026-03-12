import React, { useState, useEffect, useRef } from 'react';
import { DiceScreens, ScreenContent } from '../types';
import { cn } from '../lib/utils';

interface CSSDice3DProps {
  screens: DiceScreens;
  isShaking?: boolean;
}

const Face = ({ content, transform, label }: { content: ScreenContent, transform: string, label: string }) => {
  return (
    <div 
      className="absolute w-48 h-48 bg-zinc-900 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-center overflow-hidden backface-hidden shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
      style={{ transform, backfaceVisibility: 'hidden' }}
    >
      <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
        {label}
      </div>
      {content.type === 'text' ? (
        <div className="text-emerald-400 font-bold text-xl text-center px-4 break-words">
          {content.content}
        </div>
      ) : (
        <img 
          src={content.content} 
          alt={label} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};

export const CSSDice3D: React.FC<CSSDice3DProps> = ({ screens, isShaking }) => {
  const [rotation, setRotation] = useState({ x: -25, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;
      setRotation(prev => ({
        x: prev.x - deltaY * 0.5,
        y: prev.y + deltaX * 0.5
      }));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-zinc-950 cursor-grab active:cursor-grabbing relative overflow-visible" onMouseDown={handleMouseDown} style={{ perspective: '1000px' }}>
      <div 
        className={cn(
          "w-48 h-48 relative transition-transform duration-100 ease-out",
          isShaking && "animate-shake"
        )}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
        }}
      >
          {/* Front */}
          <Face content={screens.front} transform="translateZ(96px)" label="Front" />
          {/* Back */}
          <Face content={screens.back} transform="rotateY(180deg) translateZ(96px)" label="Back" />
          {/* Right */}
          <Face content={screens.right} transform="rotateY(90deg) translateZ(96px)" label="Right" />
          {/* Left */}
          <Face content={screens.left} transform="rotateY(-90deg) translateZ(96px)" label="Left" />
          {/* Top */}
          <Face content={screens.top} transform="rotateX(90deg) translateZ(96px)" label="Top" />
          {/* Bottom */}
          <Face content={screens.bottom} transform="rotateX(-90deg) translateZ(96px)" label="Bottom" />
        </div>
      
      <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 font-mono">
        CSS 3D Engine (Fallback Mode) • Drag to Rotate
      </div>
    </div>
  );
};
