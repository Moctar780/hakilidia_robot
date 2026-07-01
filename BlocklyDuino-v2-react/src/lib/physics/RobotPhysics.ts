/**
 * RobotPhysics — châssis dynamique + roues suiveuses via ImpulseJoint.
 * Contrôle par vitesse linéaire/angulaire appliquée directement au châssis.
 * Les roues sont liées par des joints pour suivre le châssis visuellement.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { physicsManager } from './PhysicsManager';

export type WheelSides = 'left' | 'right';

export class RobotPhysics {
  chassisBody!: RAPIER.RigidBody;
  wheelBodies: Record<WheelSides, RAPIER.RigidBody> = {} as Record<WheelSides, RAPIER.RigidBody>;
  private speedFactor = 2.5; // m/s par unité de vitesse

  constructor(pos: { x: number; y: number; z: number }) {
    this.createRobot(pos);
  }

  private createRobot(pos: { x: number; y: number; z: number }) {
    const world = physicsManager.world;
    if (!world) throw new Error('PhysicsManager non initialisé.');

    // 1. CHÂSSIS
    const chassisDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setLinearDamping(0.5)
      .setAngularDamping(2.0);
    this.chassisBody = world.createRigidBody(chassisDesc);

    const chassisCollider = RAPIER.ColliderDesc.cuboid(0.5 * 0.7, 0.2 * 0.7, 0.8 * 0.7);
    world.createCollider(chassisCollider, this.chassisBody);

    // 2. ROUES (liées au châssis par ImpulseJoint pour suivre ses mouvements)
    const wheelConfigs: { name: WheelSides; x: number; z: number }[] = [
      { name: 'left', x: -0.6, z: 0.5 },
      { name: 'right', x: 0.6, z: 0.5 },
    ];

    for (const config of wheelConfigs) {
      const wheelDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x + config.x, pos.y - 0.15, pos.z + config.z)
        .setLinearDamping(5.0) // damping fort pour que la roue suive le châssis
        .setAngularDamping(0.3);
      const wheelBody = world.createRigidBody(wheelDesc);

      const wheelCollider = RAPIER.ColliderDesc.cylinder(0.075, 0.3);
      world.createCollider(wheelCollider, wheelBody);

      // Joint Revolute pour attacher la roue au châssis (pivot libre)
      const anchorChassis = { x: config.x, y: -0.15, z: config.z };
      const anchorWheel = { x: 0, y: 0, z: 0 };
      const axis = { x: 1, y: 0, z: 0 };
      const jointData = RAPIER.JointData.revolute(anchorChassis, anchorWheel, axis);
      world.createImpulseJoint(jointData, this.chassisBody, wheelBody, true);

      this.wheelBodies[config.name] = wheelBody;
    }
  }

  /** Applique une vélocité linéaire au châssis (dans le repère local) */
  setChassisVelocity(localX: number, localZ: number) {
    // Transformer la vélocité locale → monde en utilisant la rotation du châssis
    const rot = this.chassisBody.rotation();
    const sin = 2 * (rot.w * rot.y + rot.x * rot.z);
    const cos = 1 - 2 * (rot.y * rot.y + rot.z * rot.z);
    const worldX = localX * cos - localZ * sin;
    const worldZ = localX * sin + localZ * cos;

    this.chassisBody.setLinvel({ x: worldX * this.speedFactor, y: 0, z: worldZ * this.speedFactor }, true);
  }

  /** Applique une vélocité angulaire au châssis */
  setChassisAngularVelocity(yawSpeed: number) {
    this.chassisBody.setAngvel({ x: 0, y: yawSpeed * this.speedFactor * 0.5, z: 0 }, true);
  }

  /** Avancer */
  forward(speed: number) { this.setChassisVelocity(0, -speed); }

  /** Reculer */
  backward(speed: number) { this.setChassisVelocity(0, speed); }

  /** Translation latérale gauche */
  strafeLeft(speed: number) { this.setChassisVelocity(-speed, 0); }

  /** Translation latérale droite */
  strafeRight(speed: number) { this.setChassisVelocity(speed, 0); }

  /** Pivot à gauche */
  rotateLeft(speed: number) { this.setChassisAngularVelocity(speed); }

  /** Pivot à droite */
  rotateRight(speed: number) { this.setChassisAngularVelocity(-speed); }

  /** Arrêt */
  stop() {
    this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  /** Position actuelle du châssis */
  getPosition() {
    const t = this.chassisBody.translation();
    return { x: t.x, y: t.y, z: t.z };
  }

  /** Rotation Yaw actuelle (degrés) */
  getYaw(): number {
    const r = this.chassisBody.rotation();
    const yaw = 2 * Math.atan2(r.z, r.w);
    return (yaw * 180) / Math.PI;
  }
}
