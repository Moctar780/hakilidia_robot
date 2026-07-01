/**
 * RobotPhysics — crée le châssis + 2 roues motrices avec joints Revolute.
 * Permet de contrôler le robot par vitesse des moteurs (rad/s).
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { physicsManager } from './PhysicsManager';

export type WheelJoint = {
  body: RAPIER.RigidBody;
  joint: RAPIER.Joint;
};

export type WheelSides = 'left' | 'right';

export class RobotPhysics {
  chassisBody!: RAPIER.RigidBody;
  joints: Record<WheelSides, WheelJoint> = {} as Record<WheelSides, WheelJoint>;
  private maxTorque = 10.0;

  constructor(pos: { x: number; y: number; z: number }) {
    this.createRobot(pos);
  }

  private createRobot(pos: { x: number; y: number; z: number }) {
    const world = physicsManager.world;
    if (!world) throw new Error('PhysicsManager non initialisé.');

    // 1. CHÂSSIS
    const chassisDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setLinearDamping(0.3)
      .setAngularDamping(1.5);
    this.chassisBody = world.createRigidBody(chassisDesc);

    // Boîte de collision du châssis (largeur: 1, hauteur: 0.4, longueur: 1.6) * échelle
    const chassisCollider = RAPIER.ColliderDesc.cuboid(0.5 * 0.7, 0.2 * 0.7, 0.8 * 0.7);
    world.createCollider(chassisCollider, this.chassisBody);

    // 2. ROUES
    const wheelConfigs: { name: WheelSides; x: number; z: number }[] = [
      { name: 'left', x: -0.6, z: 0.5 },
      { name: 'right', x: 0.6, z: 0.5 },
    ];

    for (const config of wheelConfigs) {
      const wheelDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x + config.x, pos.y - 0.15, pos.z + config.z)
        .setLinearDamping(0.1)
        .setAngularDamping(0.5);
      const wheelBody = world.createRigidBody(wheelDesc);

      // Cylindre de collision (rayon: 0.3, hauteur: 0.15)
      const wheelCollider = RAPIER.ColliderDesc.cylinder(0.075, 0.3);
      world.createCollider(wheelCollider, wheelBody);

      // 3. JOINT REVOLUTE (pivot)
      const anchorChassis = { x: config.x, y: -0.15, z: config.z };
      const anchorWheel = { x: 0, y: 0, z: 0 };
      const axis = { x: 1, y: 0, z: 0 }; // Rotation axe X

      const jointData = RAPIER.JointData.revolute(anchorChassis, anchorWheel, axis);
      const joint = world.createJoint(jointData, this.chassisBody, wheelBody);

      // Moteur par défaut : vitesse 0, couple max
      joint.configureMotorVelocity(0, this.maxTorque);

      this.joints[config.name] = { body: wheelBody, joint };
    }
  }

  /** Définit la vitesse des deux moteurs (rad/s) */
  setMotorSpeeds(leftSpeed: number, rightSpeed: number) {
    if (this.joints.left) this.joints.left.joint.configureMotorVelocity(leftSpeed, this.maxTorque);
    if (this.joints.right) this.joints.right.joint.configureMotorVelocity(rightSpeed, this.maxTorque);
  }

  /** Arrêt immédiat des moteurs */
  stop() {
    this.setMotorSpeeds(0, 0);
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
