import { useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type Group } from 'three';
import type { Rover3D } from '../../constants';

const ROVER_SCALE = 0.35;
const ENV_SCALE = 0.9;

/**
 * Charge et affiche le modèle 3D du rover téléchargé.
 * Modèle "Rover" par Quaternius — CC0 (domaine public).
 * 
 * Le rover se déplace sur la grille. rover.position.x et .z sont en "unités grille".
 * ROVER_SCALE convertit ces unités en unités Three.js pour la scène.
 *
 * ⚠️ `scene.clone()` est appelé UNE SEULE FOIS via useMemo pour éviter que
 *    le rover ne se réinitialise à (0,0,0) à chaque rendu React.
 */
export function Rover3DLoadedModel({
  rover,
  prevPositionRef,
}: {
  rover: Rover3D;
  prevPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF('/models/rover.glb');

  // Cloner le modèle UNE SEULE FOIS, pas à chaque render
  const model = useMemo(() => scene?.clone() ?? null, [scene]);

  useFrame((_, _delta) => {
    if (!groupRef.current) return;

    // Conversion unités grille → unités scène 3D
    const targetX = rover.position.x * ROVER_SCALE;
    const targetZ = rover.position.z * ROVER_SCALE;

    // Interpolation lissée vers la cible
    const lerpFactor = 0.15;
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * lerpFactor;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * lerpFactor;
    groupRef.current.position.y = 0;

    // Rotation Yaw — avec gestion du passage 0↔360°
    const targetYaw = (rover.rotation.y * Math.PI) / 180;
    let diff = targetYaw - groupRef.current.rotation.y;
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    groupRef.current.rotation.y += diff * lerpFactor;

    prevPositionRef.current = { x: rover.position.x, z: rover.position.z };
  });

  if (!model) return null;

  return (
    <primitive
      ref={groupRef}
      object={model}
      scale={[ROVER_SCALE, ROVER_SCALE, ROVER_SCALE]}
      position={[0, 0, 0]}
      castShadow
      receiveShadow
    />
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
