import React, { useEffect, useState } from 'react';

interface HardwareGifProps {
  /** Ordered blob URLs of the GIF frames (numbered JPEGs from a .gif.d dir). */
  frames: string[];
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/** Hardware plays .gif.d frame sequences at GIF_FRAME_TIME = 1/12 (~12fps). */
const FRAME_INTERVAL_MS = 1000 / 12;

/**
 * Plays a hardware "GIF": a .gif.d directory of numbered JPEG frames, cycled
 * at ~12fps to match the device (constants.py GIF_FRAME_TIME). Frames are
 * rendered with object-contain so the square aspect is preserved, and the
 * passed className/style are applied so 3D-face rotation (style.transform)
 * still works.
 */
export const HardwareGif: React.FC<HardwareGifProps> = ({
  frames,
  className,
  style,
  alt,
}) => {
  const [frameIndex, setFrameIndex] = useState(0);

  // Reset to the first frame whenever the frames array identity changes, and
  // cycle at ~12fps. A single frame (or none) needs no interval.
  useEffect(() => {
    setFrameIndex(0);
    if (frames.length <= 1) return;
    const id = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(id);
  }, [frames]);

  if (frames.length === 0) {
    return (
      <div
        className={`${className ?? ''} flex flex-col items-center justify-center bg-zinc-900 text-center select-none pointer-events-none`}
        style={style}
      >
        <span className="text-base leading-none" aria-hidden>⚠</span>
        <span className="mt-1 px-1 text-[8px] leading-tight text-zinc-500">
          GIF frames not found
        </span>
      </div>
    );
  }

  // Force object-contain (override any object-cover passed in className).
  const imgClassName = `${(className ?? '').replace(/\bobject-cover\b/g, '')} object-contain`.trim();
  const src = frames[Math.min(frameIndex, frames.length - 1)];

  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      style={style}
      referrerPolicy="no-referrer"
      draggable={false}
    />
  );
};
