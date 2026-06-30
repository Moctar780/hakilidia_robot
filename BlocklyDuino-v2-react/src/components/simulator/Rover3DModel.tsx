import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import type { Rover3D } from '../../constants';

const ROVER_SCALE = 0.4;

export function Rover3DModel({
  rover,
  prevPositionRef,
}: {
  rover: Rover3D;
  prevPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}) {
  const groupRef = useRef<Group>(null);
  const wheelFL = useRef<Mesh>(null);
  const wheelFR = useRef<Mesh>(null);
  const wheelBL = useRef<Mesh>(null);
  const wheelBR = useRef<Mesh>(null);
  const gripperL = useRef<Mesh>(null);
  const gripperR = useRef<Mesh>(null);

  // Animation des roues
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Interpolation lissée de la position
    const targetX = rover.position.x * ROVER_SCALE;
    const targetZ = rover.position.z * ROVER_SCALE;
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.15;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.15;

    // Hauteur fixe au-dessus du sol
    groupRef.current.position.y = 0.15;

    // Rotation (Yaw)
    const targetYaw = (rover.rotation.y * Math.PI) / 180;
    groupRef.current.rotation.y += (targetYaw - groupRef.current.rotation.y) * 0.15;

    // Calcul vitesse pour animation roues
    const dx = rover.position.x - prevPositionRef.current.x;
    const dz = rover.position.z - prevPositionRef.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speedFactor = Math.min(dist / delta, 5);

    prevPositionRef.current = { x: rover.position.x, z: rover.position.z };

    // Rotation des roues proportionnelle à la vitesse
    const wheelSpeed = speedFactor * 3;
    if (wheelFL.current) wheelFL.current.rotation.x += wheelSpeed;
    if (wheelFR.current) wheelFR.current.rotation.x += wheelSpeed;
    if (wheelBL.current) wheelBL.current.rotation.x += wheelSpeed;
    if (wheelBR.current) wheelBR.current.rotation.x += wheelSpeed;

    // Pince
    const gripTarget = rover.gripperWidth * 0.02;
    if (gripperL.current) gripperL.current.position.x += (0.3 - gripTarget - gripperL.current.position.x) * 0.1;
    if (gripperR.current) gripperR.current.position.x += (gripTarget - 0.3 - gripperR.current.position.x) * 0.1;
  });

  return (
    <group ref={groupRef} position={[0, 0.15, 0]}>
      {/* Corps principal */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[0.6, 0.15, 0.8]} />
        <meshStandardMaterial color="#0F766E" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Cabine/capot */}
      <mesh position={[0, 0.18, 0.15]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.35]} />
        <meshStandardMaterial color="#14B8A6" metalness={0.2} roughness={0.8} />
      </mesh>

      {/* Capteur avant (tête) */}
      <mesh position={[0, 0.15, 0.5]} castShadow>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.3} />
      </mesh>

      {/* LED œil gauche */}
      <mesh position={[-0.12, 0.15, 0.48]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.5} />
      </mesh>

      {/* LED œil droit */}
      <mesh position={[0.12, 0.15, 0.48]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.5} />
      </mesh>

      {/* Roue avant gauche */}
      <mesh ref={wheelFL} position={[-0.35, 0.04, 0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>

      {/* Roue avant droite */}
      <mesh ref={wheelFR} position={[0.35, 0.04, 0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>

      {/* Roue arrière gauche */}
      <mesh ref={wheelBL} position={[-0.35, 0.04, -0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>

      {/* Roue arrière droite */}
      <mesh ref={wheelBR} position={[0.35, 0.04, -0.25]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#1E293B" roughness={0.9} />
      </mesh>

      {/* Pince gauche */}
      <mesh ref={gripperL} position={[-0.3, 0.08, 0.45]} castShadow>
        <boxGeometry args={[0.04, 0.08, 0.12]} />
        <meshStandardMaterial color="#64748B" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Pince droite */}
      <mesh ref={gripperR} position={[0.3, 0.08, 0.45]} castShadow>
        <boxGeometry args={[0.04, 0.08, 0.12]} />
        <meshStandardMaterial color="#64748B" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Antenne */}
      <mesh position={[0, 0.3, -0.2]}>
        <cylinderGeometry args={[0.005, 0.008, 0.15, 6]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.38, -0.2]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}
