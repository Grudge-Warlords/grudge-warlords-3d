/**
 * RTSCamera — Top-down RTS camera with pan, zoom, and edge-scroll.
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents';

export class RTSCamera {
  public camera: FreeCamera;
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;

  // Pan state
  private _keys = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false };
  private _panSpeed = 20;
  private _zoomSpeed = 2;
  private _minY = 8;
  private _maxY = 50;
  private _edgeScrollMargin = 30; // px from edge to start scrolling

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this._canvas = canvas;

    this.camera = new FreeCamera('rtsCam', new Vector3(0, 20, -25), scene);
    this.camera.setTarget(new Vector3(0, 0, 5));
    this.camera.fov = 0.8;

    // Detach default controls — we handle everything manually
    this.camera.inputs.clear();

    this._setupKeyboard();
    this._setupWheel();
  }

  private _setupKeyboard(): void {
    this._scene.onKeyboardObservable.add((kbInfo) => {
      const pressed = kbInfo.type === KeyboardEventTypes.KEYDOWN;
      switch (kbInfo.event.code) {
        case 'KeyW': this._keys.w = pressed; break;
        case 'KeyA': this._keys.a = pressed; break;
        case 'KeyS': this._keys.s = pressed; break;
        case 'KeyD': this._keys.d = pressed; break;
        case 'ArrowUp': this._keys.up = pressed; break;
        case 'ArrowDown': this._keys.down = pressed; break;
        case 'ArrowLeft': this._keys.left = pressed; break;
        case 'ArrowRight': this._keys.right = pressed; break;
      }
    });
  }

  private _setupWheel(): void {
    this._canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? this._zoomSpeed : -this._zoomSpeed;
      this.camera.position.y = Math.max(this._minY, Math.min(this._maxY, this.camera.position.y + delta));
    }, { passive: false });
  }

  /** Call each frame with delta time in seconds. */
  update(dt: number): void {
    let dx = 0;
    let dz = 0;

    // WASD / Arrow keys
    if (this._keys.w || this._keys.up) dz += 1;
    if (this._keys.s || this._keys.down) dz -= 1;
    if (this._keys.a || this._keys.left) dx -= 1;
    if (this._keys.d || this._keys.right) dx += 1;

    // Edge scroll
    const mx = this._scene.pointerX;
    const my = this._scene.pointerY;
    const cw = this._canvas.width;
    const ch = this._canvas.height;
    if (mx < this._edgeScrollMargin) dx -= 1;
    if (mx > cw - this._edgeScrollMargin) dx += 1;
    if (my < this._edgeScrollMargin) dz += 1;
    if (my > ch - this._edgeScrollMargin) dz -= 1;

    // Apply
    const speed = this._panSpeed * dt * (this.camera.position.y / 20); // scale with zoom
    this.camera.position.x += dx * speed;
    this.camera.position.z += dz * speed;

    // Keep camera looking ahead
    this.camera.setTarget(new Vector3(
      this.camera.position.x,
      0,
      this.camera.position.z + this.camera.position.y * 0.6,
    ));
  }
}
