/**
 * ThirdPersonPage — Third-person character controller with Havok physics.
 *
 * Follows the CedricGuillemet CharController playground pattern:
 * - Havok physics plugin
 * - PhysicsCharacterController (capsule)
 * - State machine: IN_AIR / ON_GROUND / START_JUMP
 * - Camera-relative WASD movement + Space jump
 * - Mouse-drag camera orbit
 * - Physics ground + obstacles with PhysicsAggregate
 *
 * Route: /thirdperson
 */

import { useEffect, useRef } from 'react';

// ES6 Babylon imports (tree-shakeable)
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import '@babylonjs/core/Physics/v2/physicsEngineComponent';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Culling/ray';

import { ThirdPersonController } from '../engine-babylon/thirdperson/ThirdPersonController';
import { ThirdPersonCamera } from '../engine-babylon/thirdperson/ThirdPersonCamera';
import { GrudgeHUD } from '../engine-babylon/GrudgeHUD';

export default function ThirdPersonPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    container.appendChild(canvas);

    let engine: Engine;
    let scene: Scene;
    let disposed = false;

    // Async init (Havok WASM needs async)
    (async () => {
      // Engine
      engine = new Engine(canvas, true, { adaptToDeviceRatio: true, antialias: true });

      // Scene
      scene = new Scene(engine);
      scene.clearColor = new Color4(0.05, 0.05, 0.12, 1);

      // ── Havok Physics ──────────────────────────────────
      const hk = new HavokPlugin(false);
      scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

      // ── Lights ─────────────────────────────────────────
      const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
      hemi.intensity = 0.7;
      const dirLight = new DirectionalLight('dir', new Vector3(-0.5, -5, -0.5), scene);
      dirLight.intensity = 1;
      dirLight.autoCalcShadowZBounds = true;
      const shadow = new ShadowGenerator(2048, dirLight);
      shadow.useBlurExponentialShadowMap = true;

      // ── Ground (physics static) ────────────────────────
      const ground = MeshBuilder.CreateGround('ground', { width: 60, height: 60, subdivisions: 2 }, scene);
      const gMat = new StandardMaterial('gMat', scene);
      gMat.diffuseColor = new Color3(0.2, 0.25, 0.15);
      gMat.specularColor = new Color3(0.05, 0.05, 0.05);
      ground.material = gMat;
      ground.receiveShadows = true;
      new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);

      // ── Obstacles (physics boxes) ──────────────────────
      const obsMat = new StandardMaterial('obsMat', scene);
      obsMat.diffuseColor = new Color3(0.4, 0.35, 0.3);

      const obstacles = [
        { pos: [5, 1, 5], size: [2, 2, 2] },
        { pos: [-4, 0.5, 3], size: [3, 1, 1] },
        { pos: [0, 1.5, 8], size: [1, 3, 1] },
        { pos: [-6, 0.75, -5], size: [4, 1.5, 2] },
        { pos: [8, 0.5, -3], size: [2, 1, 4] },
      ];
      for (const obs of obstacles) {
        const box = MeshBuilder.CreateBox('obs', { width: obs.size[0], height: obs.size[1], depth: obs.size[2] }, scene);
        box.position = new Vector3(obs.pos[0], obs.pos[1], obs.pos[2]);
        box.material = obsMat;
        box.receiveShadows = true;
        shadow.addShadowCaster(box);
        new PhysicsAggregate(box, PhysicsShapeType.BOX, { mass: 0 }, scene);
      }

      // ── Ramp ───────────────────────────────────────────
      const ramp = MeshBuilder.CreateBox('ramp', { width: 4, height: 0.2, depth: 8 }, scene);
      ramp.position = new Vector3(10, 1, 0);
      ramp.rotation.x = -Math.PI / 8; // ~22° incline
      ramp.material = obsMat;
      ramp.receiveShadows = true;
      shadow.addShadowCaster(ramp);
      new PhysicsAggregate(ramp, PhysicsShapeType.BOX, { mass: 0 }, scene);

      // ── Platform ───────────────────────────────────────
      const platform = MeshBuilder.CreateBox('platform', { width: 5, height: 0.3, depth: 5 }, scene);
      platform.position = new Vector3(10, 3, 6);
      platform.material = obsMat;
      platform.receiveShadows = true;
      shadow.addShadowCaster(platform);
      new PhysicsAggregate(platform, PhysicsShapeType.BOX, { mass: 0 }, scene);

      // ── Character Controller ───────────────────────────
      const charCtrl = new ThirdPersonController(scene, {
        spawnPosition: new Vector3(0, 2, -5),
      });
      charCtrl.bindInput(scene);
      shadow.addShadowCaster(charCtrl.displayCapsule);

      // ── Camera ─────────────────────────────────────────
      const tpsCam = new ThirdPersonCamera(scene);
      scene.activeCamera = tpsCam.camera;

      // ── HUD ────────────────────────────────────────────
      const hud = new GrudgeHUD(scene);
      hud.updateHealth(800, 800);
      hud.updateMana(200, 200);

      // ── Display tick (before render) ───────────────────
      scene.onBeforeRenderObservable.add(() => {
        charCtrl.displayUpdate();
        tpsCam.setTarget(charCtrl.position);
        tpsCam.update();
      });

      // ── Physics tick (after physics step) ──────────────
      scene.onAfterPhysicsObservable.add(() => {
        if (scene.deltaTime === undefined) return;
        const dt = scene.deltaTime / 1000;
        charCtrl.physicsUpdate(dt, tpsCam.rotationY);
      });

      // ── Slow HUD update ────────────────────────────────
      let lastSlow = Date.now();
      scene.registerBeforeRender(() => {
        const now = Date.now();
        if (now - lastSlow > 1000) {
          lastSlow = now;
          hud.updateDebug(
            engine.getFps(),
            1,
            `State: ${charCtrl.state}\nPos: ${charCtrl.position.x.toFixed(1)}, ${charCtrl.position.y.toFixed(1)}, ${charCtrl.position.z.toFixed(1)}`,
          );
        }
      });

      // ── Start ──────────────────────────────────────────
      engine.runRenderLoop(() => {
        if (scene.activeCamera) scene.render();
      });

      // Resize
      const onResize = () => engine.resize();
      window.addEventListener('resize', onResize);

      // Cleanup ref
      if (disposed) {
        engine.dispose();
        return;
      }
      (container as any).__cleanup = () => {
        window.removeEventListener('resize', onResize);
        hud.dispose();
        charCtrl.dispose();
        engine.stopRenderLoop();
        scene.dispose();
        engine.dispose();
      };
    })();

    return () => {
      disposed = true;
      if ((container as any).__cleanup) (container as any).__cleanup();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a1a', position: 'relative' }}
    >
      <button
        onClick={() => { window.location.href = '/'; }}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 100,
          padding: '6px 14px', borderRadius: 6,
          background: 'rgba(10,10,26,0.9)', border: '1px solid #c5a05960',
          color: '#c5a059', fontFamily: "'Oxanium', sans-serif", fontSize: 12, cursor: 'pointer',
        }}
      >
        ← Back to 3D World
      </button>
      <div style={{
        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        padding: '6px 16px', borderRadius: 6, background: 'rgba(10,10,26,0.8)', color: '#888',
        fontFamily: "'Oxanium', sans-serif", fontSize: 11, textAlign: 'center',
      }}>
        WASD / Arrows: Move · Space: Jump · Mouse drag: Orbit · Scroll: Zoom
      </div>
    </div>
  );
}
