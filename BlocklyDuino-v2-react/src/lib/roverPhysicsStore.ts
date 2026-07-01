/**
 * Store module-level pour partager la référence du RigidBody Rapier
 * entre le composant 3D et le runtime d'exécution.
 *
 * Le Rover3DLoadedModel setRef() au montage.
 * Le runtime (aiRuntime.ts) utilise applyForce() / applyImpulse() etc.
 * L'interface peut s'abonner aux mises à jour de position pour les trails.
 */

import type { RigidBodyApi } from '@react-three/rapier';

type PhysicsAction =
  | { type: 'applyImpulse'; x: number; y: number; z: number }
  | { type: 'applyTorque'; y: number }
  | { type: 'setLinvel'; x: number; y: number; z: number }
  | { type: 'setTranslation'; x: number; y: number; z: number }
  | { type: 'reset' }
  | { type: 'stop' };

const ROVER_SCALE = 0.35;

let rigidBodyRef: RigidBodyApi | null = null;
let lastGridPosition = { x: 0, z: 0 };
const subscribers = new Set<() => void>();

export const roverPhysics = {
  setRef(ref: RigidBodyApi | null) {
    rigidBodyRef = ref;
  },

  getRef() {
    return rigidBodyRef;
  },

  /** S'abonner aux changements de position (pour le trail) */
  subscribe(cb: () => void) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },

  /** Notifier les abonnés que la position a changé */
  notify() {
    subscribers.forEach((cb) => cb());
  },

  /** Applique une action différée (sera exécutée dans le prochain frame) */
  enqueue(action: PhysicsAction) {
    if (!rigidBodyRef) return;
    switch (action.type) {
      case 'applyImpulse':
        rigidBodyRef.applyImpulse({ x: action.x, y: action.y, z: action.z }, true);
        break;
      case 'applyTorque':
        rigidBodyRef.applyTorqueImpulse({ x: 0, y: action.y, z: 0 }, true);
        break;
      case 'setLinvel':
        rigidBodyRef.setLinvel({ x: action.x, y: action.y, z: action.z }, true);
        break;
      case 'setTranslation':
        rigidBodyRef.setTranslation({ x: action.x, y: action.y, z: action.z }, true);
        break;
      case 'reset':
        rigidBodyRef.setTranslation({ x: 0, y: 0.5, z: 0 }, true);
        rigidBodyRef.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.setAngvel({ x: 0, y: 0, z: 0 }, true);
        break;
      case 'stop':
        rigidBodyRef.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBodyRef.setAngvel({ x: 0, y: 0, z: 0 }, true);
        break;
    }
  },

  /** Met à jour la dernière position grille depuis useFrame */
  syncPosition(gridX: number, gridZ: number) {
    lastGridPosition = { x: gridX, z: gridZ };
    this.notify();
  },

  /** Lit la dernière position grille connue */
  getGridPosition(): { x: number; z: number } {
    return lastGridPosition;
  },

  /** Lit la position actuelle du corps physique */
  getPosition(): { x: number; z: number; y: number } | null {
    if (!rigidBodyRef) return null;
    const t = rigidBodyRef.translation();
    return { x: t.x, y: t.y, z: t.z };
  },

  /** Lit la rotation Yaw actuelle */
  getRotation(): { y: number } | null {
    if (!rigidBodyRef) return null;
    const r = rigidBodyRef.rotation();
    const yaw = 2 * Math.atan2(r.z, r.w);
    return { y: (yaw * 180) / Math.PI };
  },
};
