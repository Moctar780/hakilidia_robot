/**
 * PhysicsBridge — composant React qui initialise le monde Rapier,
 * crée les bindings meshes ↔ corps physiques, et boucle la physique
 * dans useFrame.
 *
 * À placer DANS le Canvas R3F, après les lumières.
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Group } from 'three';
import { roverPhysics } from '../../lib/roverPhysicsStore';
import { physicsManager } from '../../lib/physics/PhysicsManager';
import { RobotPhysics } from '../../lib/physics/RobotPhysics';

export function PhysicsBridge({
  roverGroupRef,
  leftWheelRef,
  rightWheelRef,
  children,
}: {
  roverGroupRef: React.RefObject<Group | null>;
  leftWheelRef: React.RefObject<Group | null>;
  rightWheelRef: React.RefObject<Group | null>;
  children?: React.ReactNode;
}) {
  const initialized = useRef(false);
  const robotRef = useRef<RobotPhysics | null>(null);

  // Initialisation unique
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initPhysics = async () => {
      await roverPhysics.init();
      const robot = roverPhysics.getRobot();
      const pm = roverPhysics.getPhysicsManager();
      robotRef.current = robot;
      if (!robot || !pm?.world) return;

      // Bindings : associer les meshes Three.js aux corps Rapier
      if (roverGroupRef.current) {
        pm.registerBinding(roverGroupRef.current, robot.chassisBody);
      }
      if (leftWheelRef.current && robot.joints.left) {
        pm.registerBinding(leftWheelRef.current, robot.joints.left.body);
      }
      if (rightWheelRef.current && robot.joints.right) {
        pm.registerBinding(rightWheelRef.current, robot.joints.right.body);
      }
    };

    initPhysics();

    return () => {
      // Nettoyage
      physicsManager.clearBindings();
    };
  }, []);

  // Boucle physique à chaque frame (après que R3F a rendu)
  useFrame(() => {
    physicsManager.update();
    roverPhysics.sync();
  });

  return <>{children}</>;
}
