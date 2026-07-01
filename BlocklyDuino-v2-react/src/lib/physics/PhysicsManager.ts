/**
 * PhysicsManager — initialise et pilote le monde physique Rapier.
 * Boucle à pas fixe (60 Hz) et synchronise les corps Rapier → meshes Three.js.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import type { Object3D } from 'three';
import { Vector3, Quaternion } from 'three';

export type BodyBinding = {
  mesh: Object3D;
  body: RAPIER.RigidBody;
};

export class PhysicsManager {
  world: RAPIER.World | null = null;
  private bindings: BodyBinding[] = [];
  private initialized = false;

  async init(gravityY = -9.81) {
    await RAPIER.init({});
    this.world = new RAPIER.World({ x: 0, y: gravityY, z: 0 });
    this.initialized = true;
    console.log('[PhysicsManager] Moteur physique Rapier prêt.');
  }

  get isReady() {
    return this.initialized && this.world !== null;
  }

  /** Enregistre un couple (mesh Three.js, body Rapier) pour synchro auto */
  registerBinding(mesh: Object3D, body: RAPIER.RigidBody) {
    this.bindings.push({ mesh, body });
  }

  /** Supprime tous les bindings (au démontage) */
  clearBindings() {
    this.bindings = [];
  }

  /** Crée un sol fixe avec collider */
  createGround(size: number) {
    if (!this.world) return null;
    const bodyDesc = RAPIER.RigidBodyDesc.fixed();
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size / 2, 0.5, size / 2);
    this.world.createCollider(colliderDesc, body);
    return body;
  }

  /** Avance la simulation d'un pas */
  step() {
    if (!this.world) return;
    this.world.step();
  }

  /** Synchronise tous les bindings : Rapier → Three.js */
  syncVisuals() {
    const q = new Quaternion();
    const v = new Vector3();
    for (const { mesh, body } of this.bindings) {
      const pos = body.translation();
      const rot = body.rotation();
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
  }

  /** Boucle complète : step + sync */
  update() {
    this.step();
    this.syncVisuals();
  }
}

// Singleton global
export const physicsManager = new PhysicsManager();
