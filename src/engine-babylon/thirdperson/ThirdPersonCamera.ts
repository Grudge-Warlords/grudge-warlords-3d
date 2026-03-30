/**
 * ThirdPersonCamera — Follows behind the character, mouse-drag to orbit.
 *
 * Matches the CedricGuillemet playground camera pattern:
 * - FreeCamera (not ArcRotate) for full manual control
 * - Smooth lerp to character position
 * - Distance spring (auto-adjusts if too close/far)
 * - Y height follows character with damping
 * - Left-click-drag to rotate around character
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';

export interface ThirdPersonCameraConfig {
  heightOffset: number;     // camera Y above character
  idealDistance: number;     // desired distance behind character
  minDistance: number;
  maxDistance: number;
  followLerp: number;       // 0-1 how fast camera follows target (per frame)
  heightLerp: number;       // 0-1 how fast Y adjusts
  distanceSpring: number;   // 0-1 how fast distance corrects
  orbitSensitivity: number; // mouse movement to rotation
}

const DEFAULTS: ThirdPersonCameraConfig = {
  heightOffset: 2,
  idealDistance: 7,
  minDistance: 3,
  maxDistance: 15,
  followLerp: 0.1,
  heightLerp: 0.04,
  distanceSpring: 0.04,
  orbitSensitivity: 0.02,
};

export class ThirdPersonCamera {
  public camera: FreeCamera;
  public config: ThirdPersonCameraConfig;
  private _scene: Scene;
  private _isMouseDown = false;
  private _targetPos: Vector3 = Vector3.Zero();

  constructor(scene: Scene, config?: Partial<ThirdPersonCameraConfig>) {
    this._scene = scene;
    this.config = { ...DEFAULTS, ...config };

    this.camera = new FreeCamera('tpsCam', new Vector3(0, 5, -8), scene);
    this.camera.setTarget(Vector3.Zero());
    this.camera.minZ = 0.1;

    // Disable default controls — we handle everything
    this.camera.inputs.clear();

    // Mouse orbit
    scene.onPointerObservable.add((info) => {
      if (info.type === PointerEventTypes.POINTERDOWN) {
        this._isMouseDown = true;
      }
      if (info.type === PointerEventTypes.POINTERUP) {
        this._isMouseDown = false;
      }
      if (info.type === PointerEventTypes.POINTERMOVE && this._isMouseDown) {
        // Orbit: slide camera around character target
        const tgt = this.camera.getTarget().clone();
        const right = this.camera.getDirection(Vector3.Right());
        this.camera.position.addInPlace(right.scale(info.event.movementX * -this.config.orbitSensitivity));
        this.camera.setTarget(tgt);
      }
    });

    // Scroll zoom
    scene.getEngine().getRenderingCanvas()?.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.5 : -0.5;
      this.config.idealDistance = Math.max(
        this.config.minDistance,
        Math.min(this.config.maxDistance, this.config.idealDistance + delta),
      );
    }, { passive: false });
  }

  /** Set the character position to follow. Call each frame. */
  setTarget(pos: Vector3): void {
    this._targetPos = pos;
  }

  /** Update camera position + target. Call in onBeforeRender. */
  update(): void {
    const { followLerp, heightLerp, heightOffset, distanceSpring, idealDistance } = this.config;

    // Smooth follow target
    const target = Vector3.Lerp(
      this.camera.getTarget(),
      this._targetPos,
      followLerp,
    );
    this.camera.setTarget(target);

    // Distance spring
    const dir = this.camera.getDirection(new Vector3(0, 0, 1));
    dir.y = 0;
    dir.normalize();
    const dist = Vector3.Distance(this.camera.position, this._targetPos);
    const correction = (Math.min(dist - idealDistance * 0.8, 0) + Math.max(dist - idealDistance * 1.2, 0)) * distanceSpring;
    dir.scaleAndAddToRef(correction, this.camera.position);

    // Height follow with damping
    const targetY = this._targetPos.y + heightOffset;
    this.camera.position.y += (targetY - this.camera.position.y) * heightLerp;
  }

  /** Get the camera's Y rotation for character orientation. */
  get rotationY(): number {
    return this.camera.rotation.y;
  }
}
