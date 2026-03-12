import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DiceScreens, ScreenContent } from '../types';
import { cn } from '../lib/utils';

interface CSSDice3DProps {
  screens: DiceScreens;
  isShaking?: boolean;
  onOrientationChange?: (top: number, bottom: number) => void;
}

/**
 * Map face names to screen IDs.
 * 1=top, 2=front, 3=right, 4=back, 5=left, 6=bottom
 */
const FACE_TO_ID: Record<string, number> = {
  top: 1, front: 2, right: 3, back: 4, left: 5, bottom: 6
};

const OPPOSITE: Record<number, number> = {
  1: 6, 6: 1, 2: 4, 4: 2, 3: 5, 5: 3
};

/**
 * Given rotation angles (degrees), determine which face points up.
 * We transform the world-space "up" vector (0, -1, 0) by the inverse
 * of the dice rotation, then check which face normal it aligns with.
 */
function getTopFace(rx: number, ry: number): number {
  const toRad = Math.PI / 180;
  const cx = Math.cos(rx * toRad), sx = Math.sin(rx * toRad);
  const cy = Math.cos(ry * toRad), sy = Math.sin(ry * toRad);

  // "Up" in world space is (0, -1, 0) (CSS Y points down).
  // The dice transform is rotateX(rx) rotateY(ry).
  // We need the inverse: rotateY(-ry) rotateX(-rx) applied to (0, -1, 0).
  // After rotateX(-rx): (0, -cx, sx)
  // After rotateY(-ry): (sx*cy + 0*(-sy)... let's just compute directly.
  //
  // Inverse of rotateX(a) rotateY(b) = rotateY(-b) rotateX(-a).
  // rotateX(-rx) on (0, -1, 0): (0, -cos(rx), sin(rx)) = (0, -cx, sx)
  // rotateY(-ry) on (x,y,z): (x*cy + z*sy, y, -x*sy + z*cy)
  //   = (0*cy + sx*sy, -cx, 0*(-sy) + sx*cy) = (sx*sy, -cx, sx*cy)

  const upInDice = { x: sx * sy, y: -cx, z: sx * cy };

  // Face normals in dice-local space:
  // top: (0, -1, 0), bottom: (0, 1, 0)
  // front: (0, 0, 1), back: (0, 0, -1)
  // right: (1, 0, 0), left: (-1, 0, 0)
  const faces: [number, number][] = [
    [1, -upInDice.y],   // top: dot with (0,-1,0)
    [6, upInDice.y],    // bottom: dot with (0,1,0)
    [2, upInDice.z],    // front: dot with (0,0,1)
    [4, -upInDice.z],   // back: dot with (0,0,-1)
    [3, upInDice.x],    // right: dot with (1,0,0)
    [5, -upInDice.x],   // left: dot with (-1,0,0)
  ];

  let best = faces[0];
  for (const f of faces) {
    if (f[1] > best[1]) best = f;
  }
  return best[0];
}

/**
 * Compute a CSS rotation to counter-rotate face text so it appears
 * upright to the viewer. We project the world "up" onto the face plane
 * and compute the angle.
 */
function getTextRotation(rx: number, ry: number, faceNormal: 'x' | 'y' | 'z', faceSign: number): number {
  const toRad = Math.PI / 180;
  const cx = Math.cos(rx * toRad), sx = Math.sin(rx * toRad);
  const cy = Math.cos(ry * toRad), sy = Math.sin(ry * toRad);

  // World up in dice-local space (same as getTopFace)
  const up = { x: sx * sy, y: -cx, z: sx * cy };

  // For each face, project the up vector onto the face plane
  // and compute the angle relative to the face's "natural up" direction.
  let angle = 0;

  if (faceNormal === 'z') {
    // front (z+) or back (z-): face plane is XY. Natural up = -Y.
    // For back face, X is mirrored.
    const projX = faceSign > 0 ? up.x : -up.x;
    const projY = up.y;
    angle = Math.atan2(projX, -projY) * (180 / Math.PI);
  } else if (faceNormal === 'x') {
    // right (x+) or left (x-): face plane is ZY. Natural up = -Y.
    const projZ = faceSign > 0 ? -up.z : up.z;
    const projY = up.y;
    angle = Math.atan2(projZ, -projY) * (180 / Math.PI);
  } else {
    // top (y-) or bottom (y+): face plane is XZ. Natural up = -Z.
    const projX = faceSign < 0 ? up.x : -up.x;
    const projZ = up.z;
    angle = Math.atan2(projX, -projZ) * (180 / Math.PI);
  }

  // Snap to nearest 90 degrees for clean rotation
  return Math.round(angle / 90) * 90;
}

/**
 * Hardware font sizes (U8g2 unifont ~16px on 480px screen).
 * Face is 192px (w-48 = 12rem), so scale = 192/480 = 0.4
 */
const HW_SCALE = 192 / 480;
const FONT_SIZES: Record<number, number> = {
  0: 0,    // NOTEXT
  1: 16,   // TF (unifont)
  2: 16,   // ARABIC (unifont)
  3: 16,   // CHINESE (unifont)
  4: 12,   // CYRILLIC (cu12)
  5: 16,   // DEVANAGARI (unifont)
};

const Face = ({ content, transform, label, textRotation }: { content: ScreenContent, transform: string, label: string, textRotation: number }) => {
  const hasBgColor = content.bgColor && content.bgColor !== 'rgb(0,0,0)';
  const bgStyle = content.bgColor || '#18181b'; // zinc-900 default

  return (
    <div
      className="absolute w-48 h-48 border-2 border-emerald-500/30 rounded-2xl overflow-hidden backface-hidden shadow-[inset_0_0_20px_rgba(16,185,129,0.1)] select-none"
      style={{ transform, backfaceVisibility: 'hidden', backgroundColor: bgStyle }}
    >
      <div className="absolute top-1 left-1 text-[7px] font-mono text-zinc-600/50 uppercase tracking-widest z-10"
        style={{ transform: `rotate(${textRotation}deg)` }}
      >
        {label}
      </div>
      {content.type === 'text' && content.textEntries ? (
        /* Hardware-accurate positioned text rendering */
        <div className="absolute inset-0" style={{ transform: `rotate(${textRotation}deg)` }}>
          {content.textEntries.map((entry, i) => {
            const fontSize = Math.max(8, Math.round((FONT_SIZES[entry.fontId] || 16) * HW_SCALE));
            return (
              <span
                key={i}
                className="absolute whitespace-pre leading-tight"
                style={{
                  left: `${entry.x * HW_SCALE}px`,
                  top: `${entry.y * HW_SCALE}px`,
                  fontSize: `${fontSize}px`,
                  color: entry.fontColor,
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
      ) : content.type === 'text' ? (
        /* Fallback for plain text (no structured entries) */
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-emerald-400 font-bold text-xl text-center px-4 break-words"
            style={{ transform: `rotate(${textRotation}deg)` }}
          >
            {content.content}
          </div>
        </div>
      ) : (
        <img
          src={content.content}
          alt={label}
          className="w-full h-full object-cover pointer-events-none"
          referrerPolicy="no-referrer"
          draggable={false}
          style={{ transform: `rotate(${textRotation}deg)` }}
        />
      )}
    </div>
  );
};

export const CSSDice3D: React.FC<CSSDice3DProps> = ({ screens, isShaking, onOrientationChange }) => {
  const [rotation, setRotation] = useState({ x: -25, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const lastOrientationRef = useRef({ top: 1, bottom: 6 });

  // Fire initial orientation on mount
  const hasFiredInitialRef = useRef(false);

  // Notify parent of orientation changes
  useEffect(() => {
    const top = getTopFace(rotation.x, rotation.y);
    const bottom = OPPOSITE[top];
    if (!hasFiredInitialRef.current || top !== lastOrientationRef.current.top) {
      hasFiredInitialRef.current = true;
      lastOrientationRef.current = { top, bottom };
      onOrientationChange?.(top, bottom);
    }
  }, [rotation, onOrientationChange]);

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

  // Compute text counter-rotation for each face
  const rx = rotation.x, ry = rotation.y;
  const textRotations = {
    front:  getTextRotation(rx, ry, 'z',  1),
    back:   getTextRotation(rx, ry, 'z', -1),
    right:  getTextRotation(rx, ry, 'x',  1),
    left:   getTextRotation(rx, ry, 'x', -1),
    top:    getTextRotation(rx, ry, 'y', -1),
    bottom: getTextRotation(rx, ry, 'y',  1),
  };

  const topFace = getTopFace(rx, ry);
  const topName = Object.entries(FACE_TO_ID).find(([, id]) => id === topFace)?.[0] || 'top';

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
          <Face content={screens.front} transform="translateZ(96px)" label="Front" textRotation={textRotations.front} />
          {/* Back */}
          <Face content={screens.back} transform="rotateY(180deg) translateZ(96px)" label="Back" textRotation={textRotations.back} />
          {/* Right */}
          <Face content={screens.right} transform="rotateY(90deg) translateZ(96px)" label="Right" textRotation={textRotations.right} />
          {/* Left */}
          <Face content={screens.left} transform="rotateY(-90deg) translateZ(96px)" label="Left" textRotation={textRotations.left} />
          {/* Top */}
          <Face content={screens.top} transform="rotateX(90deg) translateZ(96px)" label="Top" textRotation={textRotations.top} />
          {/* Bottom */}
          <Face content={screens.bottom} transform="rotateX(-90deg) translateZ(96px)" label="Bottom" textRotation={textRotations.bottom} />
        </div>

      <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 font-mono">
        CSS 3D Engine • Drag to Rotate • Top: {topName}
      </div>
    </div>
  );
};
