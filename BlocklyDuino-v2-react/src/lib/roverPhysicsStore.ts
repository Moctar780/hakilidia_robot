/**
 * Store module-level reliant le runtime (aiRuntime.ts) au RobotPhysics.
 * Les actions sont converties en commandes moteur (setMotorSpeeds).
 * Les abonnés (trail, UI) recoivent la position synchro depuis Rapier.
 */
import { RobotPhysics } from './physics/RobotPhysics';
import { physicsManager } from './physics/PhysicsManager';

let robot: RobotPhysics | null = null;
let lastGridPosition = { x: 0, z: 0 };
const subscribers = new Set<() => void>();

const ROVER_SCALE = 0.35;
const SPEED_FACTOR = 0.8; // rad/s par unité de vitesse

export const roverPhysics = {
  /** Initialise la physique et crée le robot (appelé 1 fois au montage) */
  async init(startX = 0, startZ = 0) {
    if (physicsManager.isReady) return;
    await physicsManager.init(-9.81);
    physicsManager.createGround(100);
    robot = new RobotPhysics({
      x: startX * ROVER_SCALE,
      y: 0.5,
      z: startZ * ROVER_SCALE,
    });
    console.log('[roverPhysics] Robot physique créé.');
  },

  getRobot() {
    return robot;
  },

  getPhysicsManager() {
    return physicsManager;
  },

  /** S'abonner aux mises à jour de position (pour le trail) */
  subscribe(cb: () => void) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },

  /** Appelé à chaque frame pour synchroniser la position grille */
  sync() {
    if (!robot) return;
    const pos = robot.getPosition();
    lastGridPosition = {
      x: pos.x / ROVER_SCALE,
      z: pos.z / ROVER_SCALE,
    };
    subscribers.forEach((cb) => cb());
  },

  getGridPosition() {
    return lastGridPosition;
  },

  /** Avancer */
  forward(speed: number) {
    robot?.forward(speed);
  },

  /** Reculer */
  backward(speed: number) {
    robot?.backward(speed);
  },

  /** Translation latérale gauche */
  strafeLeft(speed: number) {
    robot?.strafeLeft(speed);
  },

  /** Translation latérale droite */
  strafeRight(speed: number) {
    robot?.strafeRight(speed);
  },

  /** Pivot à gauche */
  rotateLeft(speed: number) {
    robot?.rotateLeft(speed);
  },

  /** Pivot à droite */
  rotateRight(speed: number) {
    robot?.rotateRight(speed);
  },

  /** Arrêt */
  stop() {
    robot?.stop();
  },

  /** Réinitialiser la position */
  reset() {
    this.stop();
  },
};

