/**
 * RTSSelection — Drag-rectangle unit selection via 2D canvas overlay.
 * Ported from Density Wars Game.ts selection logic.
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { RTSUnit } from './RTSUnit';
import { isPointInPoly } from './RTSFormations';

export class RTSSelection {
  public scene: Scene;
  public canvas2D: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  private _startPos: { x: number; y: number } | null = null;
  private _endPos: { x: number; y: number } | null = null;
  private _dragging = false;
  private _onMoveHandler: ((e: MouseEvent) => void) | null = null;

  /** Fired when a selection rectangle completes. Returns screen coords. */
  public onSelectionEnd: ((x: number, y: number, w: number, h: number) => void) | null = null;

  constructor(scene: Scene, overlayCanvas: HTMLCanvasElement) {
    this.scene = scene;
    this.canvas2D = overlayCanvas;
    this.ctx = overlayCanvas.getContext('2d')!;
    this._setupListeners();
  }

  private _setupListeners(): void {
    const onMove = (e: MouseEvent) => {
      if (!this._startPos) return;
      this._endPos = { x: this.scene.pointerX, y: this.scene.pointerY };

      const x = Math.min(this._startPos.x, this._endPos.x);
      const y = Math.min(this._startPos.y, this._endPos.y);
      const w = Math.abs(this._startPos.x - this._endPos.x);
      const h = Math.abs(this._startPos.y - this._endPos.y);

      // Clear and draw selection rect
      this.ctx.clearRect(0, 0, this.canvas2D.width, this.canvas2D.height);
      this.ctx.strokeStyle = '#28ff26';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, w, h);
      this.ctx.fillStyle = 'rgba(40, 255, 38, 0.1)';
      this.ctx.fillRect(x, y, w, h);

      if (w > 4 || h > 4) this._dragging = true;
    };
    this._onMoveHandler = onMove;

    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return; // left click only
      this._startPos = { x: this.scene.pointerX, y: this.scene.pointerY };
      this._dragging = false;
      window.addEventListener('mousemove', onMove);
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button !== 0) return;
      window.removeEventListener('mousemove', onMove);
      this.ctx.clearRect(0, 0, this.canvas2D.width, this.canvas2D.height);

      if (this._dragging && this._startPos && this._endPos) {
        const x = Math.min(this._startPos.x, this._endPos.x);
        const y = Math.min(this._startPos.y, this._endPos.y);
        const w = Math.abs(this._startPos.x - this._endPos.x);
        const h = Math.abs(this._startPos.y - this._endPos.y);
        if (w > 2 && h > 2 && this.onSelectionEnd) {
          this.onSelectionEnd(x, y, w, h);
        }
      }

      this._startPos = null;
      this._endPos = null;
      this._dragging = false;
    });
  }

  /** Was the user drag-selecting? (suppresses single-click actions) */
  get wasDragging(): boolean { return this._dragging; }

  /** Convert screen rect to world-space polygon and filter units. */
  selectUnitsInRect(
    x: number, y: number, w: number, h: number,
    units: RTSUnit[],
  ): RTSUnit[] {
    // Pick 4 corners to world
    const corners = [
      this.scene.pick(x, y)?.pickedPoint,
      this.scene.pick(x + w, y)?.pickedPoint,
      this.scene.pick(x + w, y + h)?.pickedPoint,
      this.scene.pick(x, y + h)?.pickedPoint,
    ].filter(Boolean) as Vector3[];

    if (corners.length < 4) return [];

    return units.filter(u => !u.isDead && isPointInPoly(corners, u.position));
  }

  /** Resize the 2D overlay canvas to match container. */
  resize(width: number, height: number): void {
    this.canvas2D.width = width;
    this.canvas2D.height = height;
  }

  dispose(): void {
    if (this._onMoveHandler) {
      window.removeEventListener('mousemove', this._onMoveHandler);
    }
  }
}
