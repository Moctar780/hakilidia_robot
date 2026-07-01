import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Rover3DScene } from './Rover3DScene';
import { Rover3DTrail } from './Rover3DTrail';
import { Rover3DLoadedModel, EnvironmentModel } from './Rover3DModels';
import type { Rover3D } from '../../constants';

export function Rover3DCanvas({
  rover,
  trail,
  className = '',
  showEnvironment = true,
}: {
  rover: Rover3D;
  trail: { x: number; z: number }[];
  className?: string;
  showEnvironment?: boolean;
}) {
  // Ref stable : ne change JAMAIS, même si rover.position change
  const prevPositionRef = useRef({ x: rover.position.x, z: rover.position.z });

  return (
    <div className={`w-full h-full min-h-[300px] ${className}`}>
      <Canvas
        shadows
        camera={{
          position: [5, 6, 7],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        gl={{ antialias: true }}
      >
        {/* Éclairage ambiant */}
        <ambientLight intensity={0.6} />

        {/* Lumière principale avec ombres */}
        <directionalLight
          position={[8, 12, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={30}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />

        {/* Lumière de remplissage */}
        <directionalLight position={[-5, 8, -5]} intensity={0.3} />
        <hemisphereLight args={['#87CEEB', '#8B7355', 0.4]} />

        {/* Environnement HDRI */}
        <Environment preset="sunset" />

        {/* Ombres portées */}
        <ContactShadows
          position={[0, -0.01, 0]}
          opacity={0.5}
          scale={20}
          blur={2.5}
          far={6}
        />

        {/* Moteur physique Rapier */}
        <Physics gravity={[0, -9.81, 0]} debug={false}>
          {/* Scène : sol + grille + colliders */}
          <Rover3DScene />

          {/* Rover 3D avec physique */}
          <Rover3DLoadedModel rover={rover} prevPositionRef={prevPositionRef} />
        </Physics>

        {/* Environnement 3D (usine/structure) — décoratif, pas de physique */}
        {showEnvironment && (
          <Float speed={0} rotationIntensity={0} floatIntensity={0}>
            <EnvironmentModel />
          </Float>
        )}

        {/* Traînée */}
        <Rover3DTrail trail={trail} />

        {/* Contrôles de caméra */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={30}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
