/**
 * RTSGame — Main RTS game class. Wires scene, units, camera, selection, combat.
 * Reworked from Density Wars Game.ts with KayKit units and Babylon.js 9.0.
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

import { RTSUnit, UNIT_TYPES } from './RTSUnit';
import { RTSCamera } from './RTSCamera';
import { RTSSelection } from './RTSSelection';
import { RTSHUD } from './RTSHUD';
import { circularFormation } from './RTSFormations';
import { fireLaser, meleeSlash } from './RTSWeapons';

// ── Spawn definitions ────────────────────────────────────────

const PLAYER_ARMY = [
  { type: 'warrior', count: 3 },
  { type: 'ranger', count: 2 },
  { type: 'mage', count: 2 },
];

const ENEMY_ARMY = [
  { type: 'skeleton', count: 4, pos: new Vector3(15, 0, 15) },
  { type: 'zombie', count: 2, pos: new Vector3(-12, 0, 18) },
  { type: 'orc', count: 3, pos: new Vector3(20, 0, -10) },
];

// ── RTSGame ──────────────────────────────────────────────────

export class RTSGame {
  public engine: Engine;
  public scene: Scene;
  public camera: RTSCamera;
  public selection: RTSSelection;
  public hud: RTSHUD;

  public playerUnits: RTSUnit[] = [];
  public enemyUnits: RTSUnit[] = [];
  public allUnits: RTSUnit[] = [];

  private _shadow: ShadowGenerator | null = null;

  constructor(canvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
    // Engine
    this.engine = new Engine(canvas, true, { adaptToDeviceRatio: true, antialias: true });

    // Scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.04, 0.1, 1);

    // Lights
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.9;
    hemi.groundColor = new Color3(0.1, 0.1, 0.15);

    const dirLight = new DirectionalLight('dir', new Vector3(-1, -3, -1), this.scene);
    dirLight.intensity = 1;
    dirLight.autoCalcShadowZBounds = true;
    this._shadow = new ShadowGenerator(1024, dirLight);
    this._shadow.useBlurExponentialShadowMap = true;

    // Ground
    const ground = MeshBuilder.CreateGround('ground', { width: 80, height: 80, subdivisions: 40 }, this.scene);
    const gMat = new StandardMaterial('gMat', this.scene);
    gMat.diffuseColor = new Color3(0.15, 0.2, 0.12);
    gMat.specularColor = new Color3(0.05, 0.05, 0.05);
    ground.material = gMat;
    ground.receiveShadows = true;
    ground.isPickable = true;
    ground.metadata = { type: 'ground' };

    // Grid overlay
    const grid = MeshBuilder.CreateGround('grid', { width: 80, height: 80, subdivisions: 40 }, this.scene);
    const gridMat = new StandardMaterial('gridMat', this.scene);
    gridMat.wireframe = true;
    gridMat.diffuseColor = new Color3(0.15, 0.15, 0.2);
    gridMat.alpha = 0.3;
    grid.material = gridMat;
    grid.position.y = 0.01;
    grid.isPickable = false;

    // Camera
    this.camera = new RTSCamera(this.scene, canvas);
    this.scene.activeCamera = this.camera.camera;

    // Selection
    this.selection = new RTSSelection(this.scene, overlayCanvas);
    this.selection.onSelectionEnd = (x, y, w, h) => {
      this._deselectAll();
      const selected = this.selection.selectUnitsInRect(x, y, w, h, this.playerUnits);
      selected.forEach(u => u.select());
      this._updateHUDSelection();
    };

    // HUD
    this.hud = new RTSHUD(this.scene);

    // Pointer events (click actions)
    this.scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERUP) return;
      if (this.selection.wasDragging) return;

      const pick = info.pickingInfo;
      if (!pick?.hit || !pick.pickedMesh) return;

      const meta = pick.pickedMesh.metadata;

      // Left click: select single unit
      if (info.event.button === 0 && meta?.type === 'unit' && meta.faction === 'player') {
        this._deselectAll();
        const unit = this.playerUnits.find(u => u.id === meta.unitId);
        if (unit) { unit.select(); this._updateHUDSelection(); }
        return;
      }

      // Right click: move selected units / attack enemy
      if (info.event.button === 2) {
        const selected = this.playerUnits.filter(u => u.isSelected);
        if (selected.length === 0) return;

        // Right-click on enemy → attack
        if (meta?.type === 'unit' && meta.faction === 'enemy') {
          const target = this.enemyUnits.find(u => u.id === meta.unitId);
          if (target && !target.isDead) {
            selected.forEach(u => u.attackUnit(target));
          }
          return;
        }

        // Right-click on ground → move
        if (pick.pickedPoint) {
          const positions = circularFormation(selected.length, pick.pickedPoint, 2);
          selected.forEach((u, i) => u.moveTo(positions[i] || pick.pickedPoint!));
        }
      }
    });

    // Disable context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Spawn units then start
    this._spawnUnits().then(() => {
      this._startGameLoop();
      this.engine.hideLoadingUI();
    });
  }

  // ── Spawn ─────────────────────────────────────────────────

  private async _spawnUnits(): Promise<void> {
    // Player units (spawn near origin)
    const playerPositions = circularFormation(
      PLAYER_ARMY.reduce((s, a) => s + a.count, 0),
      new Vector3(0, 0, -5), 2,
    );
    let idx = 0;
    for (const def of PLAYER_ARMY) {
      for (let i = 0; i < def.count; i++) {
        const unit = new RTSUnit(this.scene, UNIT_TYPES[def.type]);
        unit.position = playerPositions[idx++] || Vector3.Zero();
        await unit.load();
        this.playerUnits.push(unit);
        this.allUnits.push(unit);
      }
    }

    // Enemy units
    for (const def of ENEMY_ARMY) {
      const positions = circularFormation(def.count, def.pos, 2);
      for (let i = 0; i < def.count; i++) {
        const unit = new RTSUnit(this.scene, UNIT_TYPES[def.type]);
        unit.position = positions[i];
        await unit.load();
        this.enemyUnits.push(unit);
        this.allUnits.push(unit);
      }
    }
  }

  // ── Game Loop ─────────────────────────────────────────────

  private _startGameLoop(): void {
    let lastSlow = Date.now();

    this.scene.registerBeforeRender(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      const now = Date.now();

      // Camera
      this.camera.update(dt);

      // Units
      for (const unit of this.allUnits) {
        unit.update(dt);
      }

      // Slow tick (1s) — HUD, cleanup
      if (now - lastSlow > 1000) {
        lastSlow = now;
        const livePlayer = this.playerUnits.filter(u => !u.isDead).length;
        const liveEnemy = this.enemyUnits.filter(u => !u.isDead).length;
        this.hud.updateUnitCount(livePlayer, liveEnemy);
        this.hud.updateFPS(this.engine.getFps());
      }
    });

    this.engine.runRenderLoop(() => {
      if (this.scene.activeCamera) this.scene.render();
    });
  }

  // ── Helpers ───────────────────────────────────────────────

  private _deselectAll(): void {
    this.playerUnits.forEach(u => u.deselect());
  }

  private _updateHUDSelection(): void {
    const selected = this.playerUnits.filter(u => u.isSelected);
    const types = [...new Set(selected.map(u => u.typeDef.name))];
    this.hud.updateSelection(selected.length, types);
  }

  // ── Lifecycle ─────────────────────────────────────────────

  resize(): void {
    this.engine.resize();
  }

  dispose(): void {
    this.engine.stopRenderLoop();
    this.selection.dispose();
    this.hud.dispose();
    for (const u of this.allUnits) u.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
