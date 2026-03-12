import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { DiceScreens, ScreenContent } from '../types';

interface Dice3DProps {
  screens: DiceScreens;
}

const FaceContent = ({ data, position, rotation }: { data: ScreenContent, position: [number, number, number], rotation: [number, number, number] }) => {
  const texture = data.type === 'image' ? useLoader(THREE.TextureLoader, data.content) : null;

  return (
    <group position={position} rotation={rotation}>
      {data.type === 'text' ? (
        <Text
          fontSize={0.15}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.8}
          textAlign="center"
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff"
        >
          {data.content}
        </Text>
      ) : (
        <mesh>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial map={texture} transparent />
        </mesh>
      )}
    </group>
  );
};

export const Dice3D: React.FC<Dice3DProps> = ({ screens }) => {
  const meshRef = useRef<THREE.Group>(null);

  return (
    <group ref={meshRef}>
      <RoundedBox args={[1, 1, 1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#18181b" roughness={0.1} metalness={0.8} />
      </RoundedBox>
      
      {/* Front */}
      <FaceContent data={screens.front} position={[0, 0, 0.51]} rotation={[0, 0, 0]} />
      {/* Back */}
      <FaceContent data={screens.back} position={[0, 0, -0.51]} rotation={[0, Math.PI, 0]} />
      {/* Top */}
      <FaceContent data={screens.top} position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* Bottom */}
      <FaceContent data={screens.bottom} position={[0, -0.51, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Left */}
      <FaceContent data={screens.left} position={[-0.51, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      {/* Right */}
      <FaceContent data={screens.right} position={[0.51, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
    </group>
  );
};
