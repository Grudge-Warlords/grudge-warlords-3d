/**
 * Game Systems — all logic lives here.
 * Systems query the World for entities with specific components and update them.
 */

import * as THREE from 'three';
import { System } from './ecs';
import {
  TransformComponent, VelocityComponent, InputComponent,
  AnimationComponent, RenderComponent, NetworkComponent,
  HealthComponent, CombatComponent, PlayerTagComponent,
  PhysicsComponent,
} from './components';

// ── Input System (priority 0 — runs first) ─────────────────────

export class InputSystem extends System {
  priority = 0;
  private keys = new Set<string>();

  constructor() {
    super();
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  update(_dt: number): void {
    const entities = this.world.query(InputComponent, PlayerTagComponent);
    for (const entity of entities) {
      const input = entity.getComponent(InputComponent)!;
      input.moveX = 0;
      input.moveZ = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) input.moveZ = -1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) input.moveZ = 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) input.moveX = -1;
      if (this.keys.has('d') || this.keys.has('arrowright')) input.moveX = 1;
      input.sprint = this.keys.has('shift');
      if (this.keys.has(' ')) { input.dodge = true; this.keys.delete(' '); }
      if (this.keys.has('e')) { input.interact = true; this.keys.delete('e'); }
    }
  }
}

// ── Movement System (priority 10) ──────────────────────────────

export class MovementSystem extends System {
  priority = 10;

  update(dt: number): void {
    const entities = this.world.query(TransformComponent, VelocityComponent, InputComponent);
    for (const entity of entities) {
      const transform = entity.getComponent(TransformComponent)!;
      const velocity = entity.getComponent(VelocityComponent)!;
      const input = entity.getComponent(InputComponent)!;

      let mx = input.moveX;
      let mz = input.moveZ;

      if (mx !== 0 || mz !== 0) {
        const len = Math.sqrt(mx * mx + mz * mz);
        mx /= len;
        mz /= len;
        const spd = velocity.speed * (input.sprint ? velocity.sprintMultiplier : 1) * dt;
        transform.position.x += mx * spd;
        transform.position.z += mz * spd;
        transform.facing = Math.atan2(mx, mz);
      }

      velocity.velocity.set(mx, 0, mz);
      velocity.sprinting = input.sprint;
    }
  }
}

// ── Animation System (priority 20) ─────────────────────────────

export class AnimationSystem extends System {
  priority = 20;

  update(dt: number): void {
    const entities = this.world.query(AnimationComponent, VelocityComponent);
    for (const entity of entities) {
      const anim = entity.getComponent(AnimationComponent)!;
      const vel = entity.getComponent(VelocityComponent)!;
      const health = entity.getComponent(HealthComponent);

      // Determine desired animation state
      let desired = 'idle';
      if (health?.dead) {
        desired = 'death';
      } else if (vel.velocity.lengthSq() > 0.01) {
        desired = vel.sprinting ? 'run' : 'walk';
      }

      // Transition animation if state changed
      if (desired !== anim.currentState) {
        anim.previousState = anim.currentState;
        anim.currentState = desired;

        const action = anim.actions.get(desired);
        const prev = anim.actions.get(anim.previousState);
        if (action) {
          action.reset().play();
          if (prev) prev.crossFadeTo(action, anim.blendTime, true);
        }
      }

      // Tick mixer
      if (anim.mixer) anim.mixer.update(dt);
    }
  }
}

// ── Render System (priority 50) ────────────────────────────────

export class RenderSystem extends System {
  priority = 50;
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    super();
    this.scene = scene;
  }

  update(_dt: number): void {
    const entities = this.world.query(TransformComponent, RenderComponent);
    for (const entity of entities) {
      const transform = entity.getComponent(TransformComponent)!;
      const render = entity.getComponent(RenderComponent)!;

      // Sync Three.js group to transform
      render.group.position.copy(transform.position);
      render.group.rotation.y = -transform.facing + Math.PI / 2;
      render.group.visible = render.visible;

      // Add to scene if not already
      if (!render.group.parent) {
        this.scene.add(render.group);
      }
    }
  }
}

// ── Network Send System (priority 90 — geckos.io UDP) ──────────

export class NetworkSendSystem extends System {
  priority = 90;
  private sendFn: ((data: ArrayBuffer) => void) | null = null;

  setSendFunction(fn: (data: ArrayBuffer) => void): void {
    this.sendFn = fn;
  }

  update(dt: number): void {
    if (!this.sendFn) return;

    const entities = this.world.query(TransformComponent, NetworkComponent, PlayerTagComponent);
    for (const entity of entities) {
      const transform = entity.getComponent(TransformComponent)!;
      const network = entity.getComponent(NetworkComponent)!;
      if (!network.isLocal) continue;

      network.sendTimer += dt;
      if (network.sendTimer < network.sendRate) continue;
      network.sendTimer = 0;

      // Delta check — only send if moved
      const dx = transform.position.x - network.lastSentPosition.x;
      const dz = transform.position.z - network.lastSentPosition.z;
      if (dx * dx + dz * dz < 0.5) continue;

      network.lastSentPosition.copy(transform.position);

      // Pack position into Float32Array (12 bytes: x, z, facing)
      const buf = new Float32Array([transform.position.x, transform.position.z, transform.facing]);
      this.sendFn(buf.buffer);
    }
  }
}

// ── Network Receive System (priority 5 — interpolates remotes) ─

export class NetworkReceiveSystem extends System {
  priority = 5;
  private lerpSpeed = 10;

  update(dt: number): void {
    const entities = this.world.query(TransformComponent, NetworkComponent);
    for (const entity of entities) {
      const network = entity.getComponent(NetworkComponent)!;
      if (!network.isRemote) continue;

      const transform = entity.getComponent(TransformComponent)!;
      // Smooth interpolation toward network target
      transform.position.lerp(network.targetPosition, this.lerpSpeed * dt);
      // Smooth facing rotation
      const diff = network.targetFacing - transform.facing;
      transform.facing += diff * this.lerpSpeed * dt;
    }
  }
}

// ── Camera System (priority 60 — after render) ─────────────────

export class CameraSystem extends System {
  priority = 60;
  camera: THREE.PerspectiveCamera;
  private height = 12;
  private distance = 16;
  private lerpSpeed = 0.08;
  private targetPos = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
  }

  update(_dt: number): void {
    const player = this.world.queryOne(TransformComponent, PlayerTagComponent);
    if (!player) return;

    const transform = player.getComponent(TransformComponent)!;
    this.targetPos.set(transform.position.x, 1, transform.position.z);

    const camX = transform.position.x + Math.sin(transform.facing) * this.distance;
    const camZ = transform.position.z + Math.cos(transform.facing) * this.distance;

    this.camera.position.lerp(
      new THREE.Vector3(camX, this.height, camZ),
      this.lerpSpeed,
    );
    this.camera.lookAt(this.targetPos);
  }
}
