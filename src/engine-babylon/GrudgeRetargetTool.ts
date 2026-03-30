/**
 * GrudgeRetargetTool — Animation retargeting tool for onboarding assets.
 *
 * Uses Babylon.js 9.0's built-in AnimatorAvatar retargeting system.
 * Pattern follows the official Playground (Avatar, Animation, Retarget, GUI).
 *
 * Usage:
 *   1. Load a target avatar (your Grudge character GLB)
 *   2. Load source animations (Mixamo FBX/GLB files)
 *   3. Retarget animations from source → target
 *   4. Preview and export retargeted animations
 */

import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { AnimatorAvatar, type IRetargetOptions } from '@babylonjs/core/Animations/animatorAvatar';
import { SkeletonViewer } from '@babylonjs/core/Debug/skeletonViewer';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/core/Animations/animatable';

// ── Types ────────────────────────────────────────────────────

export interface RetargetResult {
  name: string;
  group: AnimationGroup;
  sourceFile: string;
}

export interface RetargetToolState {
  avatarLoaded: boolean;
  avatarName: string;
  sourceAnimations: string[];
  retargetedAnimations: RetargetResult[];
  currentAnimation: string;
  showSkeleton: boolean;
}

// ── Tool ─────────────────────────────────────────────────────

export class GrudgeRetargetTool {
  public engine: Engine;
  public scene: Scene;
  public camera: ArcRotateCamera;
  public avatar: AnimatorAvatar | null = null;
  public state: RetargetToolState;

  private _skeletonViewer: SkeletonViewer | null = null;
  private _sourceAnimGroups: Map<string, AnimationGroup> = new Map();
  private _retargetedGroups: Map<string, AnimationGroup> = new Map();
  private _currentPlaying: AnimationGroup | null = null;
  private _onStateChange: ((state: RetargetToolState) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, onStateChange?: (state: RetargetToolState) => void) {
    this._onStateChange = onStateChange || null;

    this.state = {
      avatarLoaded: false,
      avatarName: '',
      sourceAnimations: [],
      retargetedAnimations: [],
      currentAnimation: '',
      showSkeleton: false,
    };

    // Engine
    this.engine = new Engine(canvas, true, { adaptToDeviceRatio: true, antialias: true });

    // Scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.06, 0.06, 0.12, 1);

    // Camera (2 viewports like the Playground pattern)
    this.camera = new ArcRotateCamera(
      'retargetCam', -Math.PI / 2, Math.PI / 3, 5,
      new Vector3(0, 1, 0), this.scene,
    );
    this.camera.attachControl(canvas, true);
    this.camera.wheelPrecision = 20;
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 20;

    // Lights
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.8;
    const dir = new DirectionalLight('dir', new Vector3(-0.5, -2, -0.5), this.scene);
    dir.intensity = 1;

    // Ground
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, this.scene);
    const gMat = new StandardMaterial('gMat', this.scene);
    gMat.diffuseColor = new Color3(0.12, 0.12, 0.18);
    ground.material = gMat;
    ground.isPickable = false;

    // Grid lines
    const grid = MeshBuilder.CreateGround('grid', { width: 10, height: 10, subdivisions: 10 }, this.scene);
    const gridMat = new StandardMaterial('gridMat', this.scene);
    gridMat.wireframe = true;
    gridMat.diffuseColor = new Color3(0.2, 0.2, 0.3);
    grid.material = gridMat;
    grid.position.y = 0.001;
    grid.isPickable = false;

    // Start render
    this.engine.runRenderLoop(() => {
      if (this.scene.activeCamera) this.scene.render();
    });
  }

  // ── Load Avatar (Target) ─────────────────────────────────

  async loadAvatar(url: string, fileName: string): Promise<void> {
    // Dispose previous
    if (this.avatar) {
      this.avatar.dispose();
      this.avatar = null;
    }
    this._disposeSkeletonViewer();

    const container = await SceneLoader.LoadAssetContainerAsync(url, fileName, this.scene);
    container.addAllToScene();

    // Find root
    const root = container.meshes[0]?.parent || container.meshes[0];
    if (!root) throw new Error('No meshes found in avatar file');

    // Create AnimatorAvatar (Babylon 9.0 API)
    this.avatar = new AnimatorAvatar(fileName, root as any);

    // Stop any built-in animations
    for (const group of container.animationGroups) {
      group.stop();
    }

    // Auto-frame camera
    this.scene.createDefaultCamera(true, true, true);
    this.camera.target = new Vector3(0, 1, 0);

    this.state.avatarLoaded = true;
    this.state.avatarName = fileName;
    this._emitState();
  }

  // ── Load Source Animations ───────────────────────────────

  async loadAnimation(url: string, fileName: string): Promise<string[]> {
    const container = await SceneLoader.LoadAssetContainerAsync(url, fileName, this.scene);

    const loaded: string[] = [];
    for (const group of container.animationGroups) {
      const name = `${fileName}::${group.name}`;
      this._sourceAnimGroups.set(name, group);
      loaded.push(name);
    }

    // Don't add meshes to scene — we only want the animations
    container.removeAllFromScene();

    this.state.sourceAnimations = [...this._sourceAnimGroups.keys()];
    this._emitState();
    return loaded;
  }

  // ── Retarget ─────────────────────────────────────────────

  retarget(
    sourceAnimName: string,
    options?: Partial<IRetargetOptions>,
  ): AnimationGroup | null {
    if (!this.avatar) {
      console.warn('[Retarget] No avatar loaded');
      return null;
    }

    const sourceGroup = this._sourceAnimGroups.get(sourceAnimName);
    if (!sourceGroup) {
      console.warn(`[Retarget] Source animation "${sourceAnimName}" not found`);
      return null;
    }

    const retargetOpts: IRetargetOptions = {
      animationGroupName: `retarget_${sourceAnimName}`,
      fixAnimations: true,
      retargetAnimationKeys: true,
      fixRootPosition: true,
      ...options,
    };

    try {
      const retargeted = this.avatar.retargetAnimationGroup(sourceGroup, retargetOpts);

      const result: RetargetResult = {
        name: retargetOpts.animationGroupName || sourceAnimName,
        group: retargeted,
        sourceFile: sourceAnimName,
      };

      this._retargetedGroups.set(result.name, retargeted);
      this.state.retargetedAnimations = [...this._retargetedGroups.entries()].map(([name, group]) => ({
        name,
        group,
        sourceFile: sourceAnimName,
      }));
      this._emitState();

      return retargeted;
    } catch (err) {
      console.error('[Retarget] Failed:', err);
      return null;
    }
  }

  /** Retarget all loaded source animations at once. */
  retargetAll(options?: Partial<IRetargetOptions>): RetargetResult[] {
    const results: RetargetResult[] = [];
    for (const name of this._sourceAnimGroups.keys()) {
      const group = this.retarget(name, options);
      if (group) {
        results.push({ name, group, sourceFile: name });
      }
    }
    return results;
  }

  // ── Playback ─────────────────────────────────────────────

  playAnimation(name: string, loop = true): void {
    this.stopAnimation();

    const group = this._retargetedGroups.get(name) || this._sourceAnimGroups.get(name);
    if (!group) return;

    group.start(loop);
    this._currentPlaying = group;
    this.state.currentAnimation = name;
    this._emitState();
  }

  stopAnimation(): void {
    if (this._currentPlaying) {
      this._currentPlaying.stop();
      this._currentPlaying = null;
    }
    this.state.currentAnimation = '';
    this._emitState();
  }

  // ── Skeleton Viewer ──────────────────────────────────────

  toggleSkeleton(): void {
    if (this._skeletonViewer) {
      this._disposeSkeletonViewer();
      this.state.showSkeleton = false;
    } else if (this.avatar) {
      for (const skeleton of this.avatar.skeletons) {
        this._skeletonViewer = new SkeletonViewer(
          skeleton, null as any, this.scene, false, 3,
          { displayMode: SkeletonViewer.DISPLAY_SPHERE_AND_SPURS },
        );
      }
      this.state.showSkeleton = true;
    }
    this._emitState();
  }

  private _disposeSkeletonViewer(): void {
    if (this._skeletonViewer) {
      this._skeletonViewer.dispose();
      this._skeletonViewer = null;
    }
  }

  // ── Resize / Dispose ─────────────────────────────────────

  resize(): void {
    this.engine.resize();
  }

  dispose(): void {
    this.engine.stopRenderLoop();
    this._disposeSkeletonViewer();
    if (this.avatar) this.avatar.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  // ── Internal ─────────────────────────────────────────────

  private _emitState(): void {
    if (this._onStateChange) this._onStateChange({ ...this.state });
  }
}
