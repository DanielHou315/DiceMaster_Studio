import React, { useRef, useEffect, useState } from 'react';
import { DiceScreens, ScreenContent } from '../types';

interface CanvasDice3DProps {
  screens: DiceScreens;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Face {
  indices: number[];
  label: string;
  content: ScreenContent;
  normal: Point3D;
}

export const CanvasDice3D: React.FC<CanvasDice3DProps> = ({ screens }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 0.5, y: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const vertices: Point3D[] = [
    { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 }
  ];

  const faces: Face[] = [
    { indices: [0, 1, 2, 3], label: 'Front', content: screens.front, normal: { x: 0, y: 0, z: 1 } },
    { indices: [1, 5, 6, 2], label: 'Right', content: screens.right, normal: { x: 1, y: 0, z: 0 } },
    { indices: [5, 4, 7, 6], label: 'Back', content: screens.back, normal: { x: 0, y: 0, z: -1 } },
    { indices: [4, 0, 3, 7], label: 'Left', content: screens.left, normal: { x: -1, y: 0, z: 0 } },
    { indices: [3, 2, 6, 7], label: 'Top', content: screens.top, normal: { x: 0, y: 1, z: 0 } },
    { indices: [4, 5, 1, 0], label: 'Bottom', content: screens.bottom, normal: { x: 0, y: -1, z: 0 } }
  ];

  const rotate = (p: Point3D, rx: number, ry: number): Point3D => {
    let y = p.y * Math.cos(rx) - p.z * Math.sin(rx);
    let z = p.y * Math.sin(rx) + p.z * Math.cos(rx);
    let x = p.x * Math.cos(ry) + z * Math.sin(ry);
    z = -p.x * Math.sin(ry) + z * Math.cos(ry);
    return { x, y, z };
  };

  const project = (p: Point3D, width: number, height: number) => {
    const scale = Math.min(width, height) * 0.25;
    const zScale = 2 / (p.z + 4);
    return {
      x: p.x * scale * zScale + width / 2,
      y: -p.y * scale * zScale + height / 2,
      z: p.z
    };
  };

  // Animation loop removed to keep dice still as requested
  useEffect(() => {
    // No-op to keep the structure if needed, but we don't want auto-rotation
  }, []);

  // Drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const rotatedVertices = vertices.map(v => rotate(v, rotation.x, rotation.y));
    
    const faceData = faces.map(face => {
      const rotatedNormal = rotate(face.normal, rotation.x, rotation.y);
      const center = face.indices.reduce((acc, idx) => {
        const v = rotatedVertices[idx];
        return { x: acc.x + v.x / 4, y: acc.y + v.y / 4, z: acc.z + v.z / 4 };
      }, { x: 0, y: 0, z: 0 });
      
      return { ...face, center, rotatedNormal };
    });

    faceData.sort((a, b) => b.center.z - a.center.z);

    faceData.forEach(face => {
      if (face.rotatedNormal.z <= 0) return;

      ctx.beginPath();
      face.indices.forEach((idx, i) => {
        const p = project(rotatedVertices[idx], width, height);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();

      ctx.fillStyle = '#18181b';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      const p0 = project(rotatedVertices[face.indices[0]], width, height);
      const p1 = project(rotatedVertices[face.indices[1]], width, height);
      const p2 = project(rotatedVertices[face.indices[2]], width, height);
      const p3 = project(rotatedVertices[face.indices[3]], width, height);

      const centerX = (p0.x + p1.x + p2.x + p3.x) / 4;
      const centerY = (p0.y + p1.y + p2.y + p3.y) / 4;

      ctx.save();
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (face.content.type === 'text') {
        ctx.fillText(face.content.content, centerX, centerY);
      } else {
        ctx.fillText('[IMG]', centerX, centerY);
      }
      
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '8px monospace';
      ctx.fillText(face.label, centerX, centerY - 20);
      ctx.restore();
    });
  }, [rotation, screens]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      setRotation(prev => ({ x: prev.x + dy * 0.01, y: prev.y + dx * 0.01 }));
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

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-950 cursor-grab active:cursor-grabbing" onMouseDown={handleMouseDown}>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={400} 
        className="max-w-full max-h-full"
      />
      <div className="absolute bottom-4 left-4 text-[10px] text-zinc-500 font-mono">
        Canvas 2D Engine (Legacy Backup) • Drag to Rotate
      </div>
    </div>
  );
};
