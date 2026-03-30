/**
 * ThirdPersonController — Havok physics character controller.
 *
 * Clean collision + movement following the official Babylon.js 9.0 pattern:
 * - PhysicsCharacterController with capsule shape
 * - State machine: IN_AIR → ON_GROUND → START_JUMP
 * - Gravity, ground support, surface velocity
 * - Camera-relative WASD input direction
 * - Jump with space
 *
 * Reference: CedricGuillemet CharController playground
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents';
import { PhysicsCharacterController, CharacterSupportedState } from '@babylonjs/core/Physics/v2/characterController';

// ── Character State ──────────────────────────────────────────

export type CharState = 'IN_AIR' | 'ON_GROUND' | 'START_JUMP';

// ── Config ───────────────────────────────────────────────────

export interface ThirdPersonConfig {
  capsuleHeight: number;
  capsuleRadius: number;
  inAirSpeed: number;
  onGroundSpeed: number;
  jumpHeight: number;
  gravity: Vector3;
  spawnPosition: Vector3;
}

const DEFAULTS: ThirdPersonConfig = {
  capsuleHeight: 1.8,
  capsuleRadius: 0.4,
  inAirSpeed: 8,
  onGroundSpeed: 10,
  jumpHeight: 1.5,
  gravity: new Vector3(0, -18, 0),
  spawnPosition: new Vector3(0, 2, 0),
};

// ── Controller ───────────────────────────────────────────────

export class ThirdPersonController {
  public scene: Scene;
  public config: ThirdPersonConfig;

  // Havok character controller
  public controller: PhysicsCharacterController;
  public displayCapsule: Mesh;

  // State
  public state: CharState = 'IN_AIR';
  public inputDirection = new Vector3(0, 0, 0);
  public wantJump = false;
  public characterOrientation = Quaternion.Identity();

  // Internal
  private _forwardLocal = new Vector3(0, 0, 1);

  constructor(scene: Scene, config?: Partial<ThirdPersonConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULTS, ...config };

    const { capsuleHeight: h, capsuleRadius: r, spawnPosition } = this.config;

    // Visual capsule
    this.displayCapsule = MeshBuilder.CreateCapsule('charDisplay', { height: h, radius: r }, scene);
    this.displayCapsule.isPickable = false;

    // Physics character controller (Havok)
    this.controller = new PhysicsCharacterController(
      spawnPosition.clone(),
      { capsuleHeight: h, capsuleRadius: r },
      scene,
    );
  }

  /** Get the character world position. */
  get position(): Vector3 {
    return this.controller.getPosition();
  }

  // ── State Machine ──────────────────────────────────────────

  private _getNextState(supportInfo: any): CharState {
    if (this.state === 'IN_AIR') {
      return supportInfo.supportedState === CharacterSupportedState.SUPPORTED
        ? 'ON_GROUND'
        : 'IN_AIR';
    }
    if (this.state === 'ON_GROUND') {
      if (supportInfo.supportedState !== CharacterSupportedState.SUPPORTED) return 'IN_AIR';
      if (this.wantJump) return 'START_JUMP';
      return 'ON_GROUND';
    }
    if (this.state === 'START_JUMP') {
      return 'IN_AIR';
    }
    return 'IN_AIR';
  }

  // ── Desired Velocity ───────────────────────────────────────

  getDesiredVelocity(dt: number, supportInfo: any, currentVelocity: Vector3): Vector3 {
    const nextState = this._getNextState(supportInfo);
    if (nextState !== this.state) this.state = nextState;

    const { gravity, inAirSpeed, onGroundSpeed, jumpHeight } = this.config;
    const upWorld = gravity.normalizeToNew().scale(-1);
    const forwardWorld = this._forwardLocal.applyRotationQuaternion(this.characterOrientation);

    if (this.state === 'IN_AIR') {
      const desired = this.inputDirection.scale(inAirSpeed).applyRotationQuaternion(this.characterOrientation);
      const out = this.controller.calculateMovement(dt, forwardWorld, upWorld, currentVelocity, Vector3.ZeroReadOnly, desired, upWorld);
      // Restore vertical component + add gravity
      out.addInPlace(upWorld.scale(-out.dot(upWorld)));
      out.addInPlace(upWorld.scale(currentVelocity.dot(upWorld)));
      out.addInPlace(gravity.scale(dt));
      return out;
    }

    if (this.state === 'ON_GROUND') {
      const desired = this.inputDirection.scale(onGroundSpeed).applyRotationQuaternion(this.characterOrientation);
      const out = this.controller.calculateMovement(
        dt, forwardWorld, supportInfo.averageSurfaceNormal,
        currentVelocity, supportInfo.averageSurfaceVelocity,
        desired, upWorld,
      );
      // Horizontal projection (prevents vertical drift on slopes)
      out.subtractInPlace(supportInfo.averageSurfaceVelocity);
      if (out.dot(upWorld) > 1e-3) {
        const len = out.length();
        out.normalizeFromLength(len);
        const horizLen = len / supportInfo.averageSurfaceNormal.dot(upWorld);
        const c = supportInfo.averageSurfaceNormal.cross(out);
        const projected = c.cross(upWorld).scale(horizLen);
        projected.addInPlace(supportInfo.averageSurfaceVelocity);
        return projected;
      }
      out.addInPlace(supportInfo.averageSurfaceVelocity);
      return out;
    }

    if (this.state === 'START_JUMP') {
      const u = Math.sqrt(2 * gravity.length() * jumpHeight);
      const curRelVel = currentVelocity.dot(upWorld);
      return currentVelocity.add(upWorld.scale(u - curRelVel));
    }

    return Vector3.Zero();
  }

  // ── Physics Tick ───────────────────────────────────────────

  /** Call in scene.onAfterPhysicsObservable. */
  physicsUpdate(dt: number, cameraRotationY: number): void {
    if (dt === 0) return;

    const down = new Vector3(0, -1, 0);
    const support = this.controller.checkSupport(dt, down);

    // Orient character to camera facing direction
    Quaternion.FromEulerAnglesToRef(0, cameraRotationY, 0, this.characterOrientation);

    const velocity = this.getDesiredVelocity(dt, support, this.controller.getVelocity());
    this.controller.setVelocity(velocity);
    this.controller.integrate(dt, support, this.config.gravity);
  }

  // ── Display Tick ───────────────────────────────────────────

  /** Call in scene.onBeforeRenderObservable. */
  displayUpdate(): void {
    this.displayCapsule.position.copyFrom(this.controller.getPosition());
  }

  // ── Input Binding ──────────────────────────────────────────

  /** Set up WASD + Space keyboard input. */
  bindInput(scene: Scene): void {
    scene.onKeyboardObservable.add((kbInfo) => {
      const down = kbInfo.type === KeyboardEventTypes.KEYDOWN;
      const key = kbInfo.event.key.toLowerCase();

      if (key === 'w' || key === 'arrowup') this.inputDirection.z = down ? 1 : 0;
      if (key === 's' || key === 'arrowdown') this.inputDirection.z = down ? -1 : 0;
      if (key === 'a' || key === 'arrowleft') this.inputDirection.x = down ? -1 : 0;
      if (key === 'd' || key === 'arrowright') this.inputDirection.x = down ? 1 : 0;
      if (key === ' ') this.wantJump = down;

      // Normalize diagonal
      if (this.inputDirection.length() > 1) this.inputDirection.normalize();
    });
  }

  dispose(): void {
    this.displayCapsule.dispose();
  }
}
