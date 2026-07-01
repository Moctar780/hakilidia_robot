import { useRef, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type Group, type Mesh } from 'three';
import type { Rover3D } from '../../constants';
import { roverPhysics } from '../../lib/roverPhysicsStore';

const ROVER_SCALE = 0.35;
const ENV_SCALE = 0.9;

/**
 * Charge le modèle GLB du rover et expose ses refs (groupe châssis + roues)
 * pour que PhysicsBridge les lie aux corps Rapier.
 */
export function Rover3DLoadedModel({
  rover,
  prevPositionRef,
  children,
}: {
  rover: Rover3D;
  prevPositionRef: React.MutableRefObject<{ x: number; z: number }>;
  children?: (roverGroup: React.RefObject<Group | null>, leftWheel: React.RefObject<Group | null>, rightWheel: React.RefObject<Group | null>) => ReactNode;
}) {
  const roverGroupRef = useRef<Group>(null);
  const leftWheelRef = useRef<Group>(null);
  const rightWheelRef = useRef<Group>(null);
  const { scene } = useGLTF('/models/rover.glb');
  const model = useMemo(() => scene?.clone() ?? null, [scene]);

  // À chaque frame : si physique pas prête, on place le modèle à la position initiale
  useFrame(() => {
    if (!roverGroupRef.current) return;
    // La position est gérée par PhysicsBridge → bindings
    // Mais on met à jour prevPositionRef pour le trail
    const pos = roverPhysics.getGridPosition();
    prevPositionRef.current = pos;
  });

  if (!model) return null;

  return (
    <group>
      {/* Groupe châssis (sera bindé au chassisBody Rapier) */}
      <group ref={roverGroupRef} scale={ROVER_SCALE}>
        <primitive object={model} castShadow receiveShadow />
      </group>

      {/* Roues visuelles (seront bindées aux wheel bodies Rapier) */}
      <group ref={leftWheelRef} scale={ROVER_SCALE} />
      <group ref={rightWheelRef} scale={ROVER_SCALE} />

      {/* PhysicsBridge reçoit les refs via render props */}
      {children?.(roverGroupRef, leftWheelRef, rightWheelRef)}
    </group>
  );
}

/**
 * Dispose plusieurs éléments de la structure autour de la grille de jeu
 * pour créer un décor d'usine sans obstruer le centre.
 *
 * ⚠️ `scene.clone()` est appelé UNE SEULE FOIS via useMemo.
 */
function EnvElement({ src, x, z, rotY = 0 }: { src: string; x: number; z: number; rotY?: number }) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => scene?.clone() ?? null, [scene]);
  if (!model) return null;
  return (
    <primitive
      object={model}
      scale={[ENV_SCALE, ENV_SCALE, ENV_SCALE]}
      position={[x, 0, z]}
      rotation={[0, rotY, 0]}
      receiveShadow
    />
  );
}

/**
 * Charge et affiche l'environnement 3D (usine/structure) décalé du centre
 * pour laisser la place au rover.
 * 
 * La structure est dupliquée à 4 endroits autour de la grille pour créer
 * un décor d'usine cohérent sans que le rover soit dedans.
 */
export function EnvironmentModel() {
  const envPositions = useMemo(() => [
    // Mur d'usine au nord
    { x: 0, z: -10, rotY: 0 },
    // Mur d'usine au sud
    { x: 0, z: 10, rotY: Math.PI },
    // Mur d'usine à l'est
    { x: 12, z: 0, rotY: Math.PI / 2 },
    // Mur d'usine à l'ouest
    { x: -12, z: 0, rotY: -Math.PI / 2 },
  ], []);

  return (
    <group>
      {envPositions.map((pos, i) => (
        <EnvElement
          key={i}
          src="/models/structure.glb"
          x={pos.x}
          z={pos.z}
          rotY={pos.rotY}
        />
      ))}
    </group>
  );
}
