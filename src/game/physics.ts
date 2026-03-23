import * as CANNON from 'cannon-es';

export interface PhysicsBody {
  entityId: number;
  body: CANNON.Body;
  type: 'hero' | 'projectile' | 'zone';
}

export class PhysicsWorld {
  world: CANNON.World;
  bodies: Map<number, PhysicsBody> = new Map();
  private groundBody: CANNON.Body;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 5;

    this.groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(this.groundBody);
  }

  addHeroBody(entityId: number, x: number, y: number): PhysicsBody {
    const body = new CANNON.Body({
      mass: 80,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(x * 0.01, 1, y * 0.01),
      linearDamping: 0.9,
    });
    body.fixedRotation = true;
    this.world.addBody(body);
    const pb: PhysicsBody = { entityId, body, type: 'hero' };
    this.bodies.set(entityId, pb);
    return pb;
  }

  addProjectileBody(entityId: number, x: number, y: number, vx: number, vy: number, gravity: boolean = false): PhysicsBody {
    const body = new CANNON.Body({
      mass: gravity ? 1 : 0,
      shape: new CANNON.Sphere(0.15),
      position: new CANNON.Vec3(x * 0.01, 2, y * 0.01),
      velocity: new CANNON.Vec3(vx * 0.01, gravity ? 8 : 0, vy * 0.01),
    });
    if (!gravity) {
      body.type = CANNON.Body.KINEMATIC;
    }
    this.world.addBody(body);
    const pb: PhysicsBody = { entityId, body, type: 'projectile' };
    this.bodies.set(entityId, pb);
    return pb;
  }

  applyKnockback(entityId: number, dirX: number, dirY: number, force: number) {
    const pb = this.bodies.get(entityId);
    if (!pb) return;
    const impulse = new CANNON.Vec3(dirX * force * 0.01, force * 0.005, dirY * force * 0.01);
    pb.body.applyImpulse(impulse);
  }

  applyLaunch(entityId: number, upForce: number) {
    const pb = this.bodies.get(entityId);
    if (!pb) return;
    pb.body.applyImpulse(new CANNON.Vec3(0, upForce * 0.01, 0));
  }

  removeBody(entityId: number) {
    const pb = this.bodies.get(entityId);
    if (pb) {
      this.world.removeBody(pb.body);
      this.bodies.delete(entityId);
    }
  }

  step(dt: number) {
    this.world.step(1 / 60, dt, 3);
  }

  syncToGame(entityId: number): { x: number; y: number; airborne: boolean } | null {
    const pb = this.bodies.get(entityId);
    if (!pb) return null;
    const pos = pb.body.position;
    return {
      x: pos.x * 100,
      y: pos.z * 100,
      airborne: pos.y > 0.6,
    };
  }

  getBodyHeight(entityId: number): number {
    const pb = this.bodies.get(entityId);
    if (!pb) return 0;
    return Math.max(0, pb.body.position.y);
  }

  clear() {
    this.bodies.forEach((pb) => {
      this.world.removeBody(pb.body);
    });
    this.bodies.clear();
  }
}

export function createPhysicsWorld(): PhysicsWorld {
  return new PhysicsWorld();
}
