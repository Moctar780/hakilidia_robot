import { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';
import { type RigidBodyApi } from '@react-three/rapier';
import type { Rover3D } from '../../constants';
import { roverPhysics } from '../../lib/roverPhysicsStore';

const ROVER_SCALE = 0.35;
const ENV_SCALE = 0.9;

/**
 * Charge et affiche le modèle 3D du rover avec physique Rapier.
 * Le corps est dynamique : il réagit aux forces, impulsions et collisions.
 * La position/rotation lue depuis Rapier remplace l'ancien lerp manuel.
 */
export function Rover3DLoadedModel({
  rover,
  prevPositionRef,
}: {
  rover: Rover3D;
  prevPositionRef: React.MutableRefObject<{ x: number; z: number }>;
}) {
  const rigidBodyRef = useRef<RigidBodyApi>(null);
  const { scene } = useGLTF('/models/rover.glb');
  const model = useMemo(() => scene?.clone() ?? null, [scene]);
  const initialPosition = useMemo(() => ({
    x: rover.position.x * ROVER_SCALE,
    z: rover.position.z * ROVER_SCALE,
  }), []);

  // Exposer le ref au store pour que le runtime puisse appliquer des forces
  useEffect(() => {
    roverPhysics.setRef(rigidBodyRef.current);
    return () => roverPhysics.setRef(null);
  }, []);

  // Synchroniser la position initiale au premier frame
  const initialSync = useRef(true);
  useFrame(() => {
    if (!rigidBodyRef.current) return;
    if (initialSync.current) {
      rigidBodyRef.current.setTranslation(
        { x: initialPosition.x, y: 0.5, z: initialPosition.z },
        true
      );
      initialSync.current = false;
    }

    // Lire la position réelle depuis Rapier pour le trail et le store
    const t = rigidBodyRef.current.translation();
    const r = rigidBodyRef.current.rotation();
    const yaw = 2 * Math.atan2(r.z, r.w);
    const gridX = t.x / ROVER_SCALE;
    const gridZ = t.z / ROVER_SCALE;
    prevPositionRef.current = { x: gridX, z: gridZ };
    roverPhysics.syncPosition(gridX, gridZ);
  });

  if (!model) return null;

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      position={[initialPosition.x, 0.5, initialPosition.z]}
      colliders="hull"
      mass={2}
      linearDamping={0.3}
      angularDamping={0.5}
      enabledRotations={[false, true, false]}
      canSleep={false}
    >
      <primitive
        object={model}
        scale={[ROVER_SCALE, ROVER_SCALE, ROVER_SCALE]}
        castShadow
        receiveShadow
      />
    </RigidBody>
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
