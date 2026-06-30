import React, { useRef, useState, useEffect } from 'react';
import { ScreenContent } from '../../types';
import { HardwareImage } from './HardwareImage';
import { HardwareGif } from './HardwareGif';

const HW_RES = 480;
// U8g2-native sizes × 2 (firmware uses setTextSize(2)): unifont 16->32, cu12 12->24.
const FONT_SIZES: Record<number, number> = {
  0: 0,    // NOTEXT
  1: 32,   // TF (unifont, 16×2)
  2: 32,   // ARABIC (unifont, 16×2)
  3: 32,   // CHINESE (unifont, 16×2)
  4: 24,   // CYRILLIC (cu12, 12×2)
  5: 32,   // DEVANAGARI (unifont, 16×2)
};
// Approximate alphabetic ascent fraction; baseline sits ASCENT_RATIO*fontPx below box top.
const ASCENT_RATIO = 0.8;

interface SimulatorScreenProps {
  face: string;
  data: ScreenContent;
}

export const SimulatorScreen: React.FC<SimulatorScreenProps> = ({ face, data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / HW_RES);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="relative group">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
        {face}
      </div>
      <div
        ref={containerRef}
        className="w-full aspect-square rounded-2xl border-4 border-zinc-800 shadow-2xl overflow-hidden relative ring-1 ring-white/5 group-hover:border-emerald-500/50 transition-colors duration-500 select-none"
        style={{ backgroundColor: data.bgColor || '#000000' }}
      >
        {data.type === 'gif' ? (
          <HardwareGif frames={data.frames ?? []} className="w-full h-full" alt={face} />
        ) : data.type === 'image' ? (
          <HardwareImage src={data.content} path={data.imagePath} className="w-full h-full" alt={face} />
        ) : data.textEntries && data.textEntries.length > 0 ? (
          /* Hardware-accurate: render at 480×480 then scale to container */
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: HW_RES,
              height: HW_RES,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {data.textEntries.map((entry, i) => {
              const fontPx = FONT_SIZES[entry.fontId] || 32;
              if (fontPx === 0) return null;
              return (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: entry.x,
                    top: entry.y - ASCENT_RATIO * fontPx,
                    fontSize: fontPx,
                    lineHeight: 1,
                    color: entry.fontColor,
                    whiteSpace: 'pre',
                    fontFamily: entry.fontId === 3 ? '"Noto Sans SC", "Microsoft YaHei", sans-serif'
                      : entry.fontId === 2 ? '"Noto Sans Arabic", sans-serif'
                      : entry.fontId === 4 ? '"Noto Sans", sans-serif'
                      : entry.fontId === 5 ? '"Noto Sans Devanagari", sans-serif'
                      : 'monospace',
                  }}
                >
                  {entry.text}
                </span>
              );
            })}
          </div>
        ) : null}
        {/* LCD Glare Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_100%)] pointer-events-none" />
        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-30" />
      </div>
    </div>
  );
};
