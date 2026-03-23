/**
 * GLB Sprite Loader — renders 3D GLB models to 2D sprite frames
 * using an offscreen Three.js WebGLRenderer.
 * Used for spell projectiles, shields, and effect overlays in the 2D canvas game.
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ── Types ──────────────────────────────────────────────────────

export interface GLBSprite {
  name: string;
  frames: ImageBitmap[];
  frameCount: number;
  width: number;
  height: number;
  loaded: boolean;
}

export interface GLBSpriteLibrary {
  sprites: Map<string, GLBSprite>;
  ready: boolean;
}

// ── GLB → Effect Mapping ───────────────────────────────────────

export const GLB_EFFECT_MAP: Record<string, { file: string; label: string }> = {
  fireball:       { file: 'Fireball.glb',              label: 'Fireball' },
  ice_lance:      { file: 'Ice Lance.glb',             label: 'Ice Lance' },
  ice_lance_2:    { file: 'Ice Lance 2.glb',           label: 'Ice Lance II' },
  ice_lance_3:    { file: 'Ice Lance 3.glb',           label: 'Ice Lance III' },
  ice_rock:       { file: 'Ice Rock.glb',              label: 'Ice Rock' },
  nature_shield:  { file: 'Nature_Shield.glb',         label: 'Nature Shield' },
  dark_shield:    { file: 'Dark_Shield.glb',           label: 'Dark Shield' },
  distortion:     { file: 'Distortion.glb',            label: 'Distortion' },
  crystal:        { file: 'Crystal.glb',               label: 'Crystal' },
  potion:         { file: 'Potion.glb',                label: 'Potion' },
  rock_icicle:    { file: 'Rock Icicle.glb',           label: 'Rock Icicle' },
  root:           { file: 'Root.glb',                  label: 'Root' },
  skull:          { file: 'Skull.glb',                  label: 'Skull' },
  tome:           { file: 'Tome.glb',                  label: 'Tome' },
  book:           { file: 'Book.glb',                  label: 'Book' },
};

// Class → spell sprite mapping
export const CLASS_PROJECTILE_SPRITE: Record<string, string> = {
  Mage: 'ice_lance',
  Warrior: 'fireball',
  Ranger: 'ice_rock',
  Worg: 'skull',
};

export const CLASS_SHIELD_SPRITE: Record<string, string> = {
  Mage: 'nature_shield',
  Warrior: 'dark_shield',
  Ranger: 'nature_shield',
  Worg: 'dark_shield',
};

/** Distortion/crystal used for special ability overlays */
export const CLASS_SPECIAL_SPRITE: Record<string, string> = {
  Mage: 'crystal',
  Warrior: 'distortion',
  Ranger: 'crystal',
  Worg: 'distortion',
};

// ── Offscreen Renderer ─────────────────────────────────────────

const SPRITE_SIZE = 64;
const FRAME_COUNT = 12;

let offscreenRenderer: THREE.WebGLRenderer | null = null;
let offscreenScene: THREE.Scene | null = null;
let offscreenCamera: THREE.PerspectiveCamera | null = null;
let gltfLoader: GLTFLoader | null = null;

function ensureOffscreenRenderer(): boolean {
  if (offscreenRenderer) return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    offscreenRenderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    offscreenRenderer.setSize(SPRITE_SIZE, SPRITE_SIZE);
    offscreenRenderer.setClearColor(0x000000, 0);

    offscreenScene = new THREE.Scene();

    offscreenCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    offscreenCamera.position.set(0, 1, 3);
    offscreenCamera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    offscreenScene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(2, 3, 2);
    offscreenScene.add(dir);

    gltfLoader = new GLTFLoader();
    return true;
  } catch (e) {
    console.warn('GLB sprite renderer init failed:', e);
    return false;
  }
}

// ── Load a single GLB and render frames ────────────────────────

async function renderGLBToFrames(filePath: string): Promise<ImageBitmap[]> {
  if (!ensureOffscreenRenderer() || !offscreenRenderer || !offscreenScene || !offscreenCamera || !gltfLoader) {
    return [];
  }

  return new Promise<ImageBitmap[]>((resolve) => {
    gltfLoader!.load(
      filePath,
      async (gltf: GLTF) => {
        const model = gltf.scene;

        // Auto-center and scale model to fit
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.5 / (maxDim || 1);
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        offscreenScene!.add(model);

        const frames: ImageBitmap[] = [];

        for (let i = 0; i < FRAME_COUNT; i++) {
          const angle = (i / FRAME_COUNT) * Math.PI * 2;
          model.rotation.y = angle;
          offscreenRenderer!.render(offscreenScene!, offscreenCamera!);

          try {
            const bitmap = await createImageBitmap(offscreenRenderer!.domElement);
            frames.push(bitmap);
          } catch {
            // Skip frame on failure
          }
        }

        offscreenScene!.remove(model);

        // Dispose geometry/materials
        model.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
          if ((child as THREE.Mesh).material) {
            const mat = (child as THREE.Mesh).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else mat.dispose();
          }
        });

        resolve(frames);
      },
      undefined,
      () => {
        resolve([]); // Load error
      }
    );
  });
}

// ── Public API ─────────────────────────────────────────────────

const globalLibrary: GLBSpriteLibrary = {
  sprites: new Map(),
  ready: false,
};

/**
 * Initialize the GLB sprite library by loading all effect models.
 * Call once at startup. Non-blocking — sprites become available as they load.
 */
export async function initGLBSprites(basePath: string = '/effects/'): Promise<GLBSpriteLibrary> {
  if (globalLibrary.ready) return globalLibrary;

  if (!ensureOffscreenRenderer()) {
    console.warn('WebGL not available for GLB sprite rendering');
    globalLibrary.ready = true;
    return globalLibrary;
  }

  const loadPromises: Promise<void>[] = [];

  for (const [key, info] of Object.entries(GLB_EFFECT_MAP)) {
    const placeholder: GLBSprite = {
      name: info.label,
      frames: [],
      frameCount: 0,
      width: SPRITE_SIZE,
      height: SPRITE_SIZE,
      loaded: false,
    };
    globalLibrary.sprites.set(key, placeholder);

    const promise = renderGLBToFrames(basePath + info.file).then((frames) => {
      placeholder.frames = frames;
      placeholder.frameCount = frames.length;
      placeholder.loaded = frames.length > 0;
    });
    loadPromises.push(promise);
  }

  // Don't await all — let them load in background
  Promise.allSettled(loadPromises).then(() => {
    globalLibrary.ready = true;
    const loaded = Array.from(globalLibrary.sprites.values()).filter(s => s.loaded).length;
    console.log(`GLB sprites loaded: ${loaded}/${globalLibrary.sprites.size}`);
  });

  return globalLibrary;
}

/**
 * Get the global sprite library (may still be loading).
 */
export function getGLBSpriteLibrary(): GLBSpriteLibrary {
  return globalLibrary;
}

/**
 * Get a specific sprite by key (returns null if not loaded yet).
 */
export function getGLBSprite(key: string): GLBSprite | null {
  const sprite = globalLibrary.sprites.get(key);
  return sprite?.loaded ? sprite : null;
}

/**
 * Draw a GLB sprite frame onto a 2D canvas context.
 * Automatically selects frame based on time for rotation animation.
 */
export function drawGLBSprite(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  x: number,
  y: number,
  time: number,
  scale: number = 1.0,
  alpha: number = 1.0,
  rotation: number = 0,
): boolean {
  const sprite = getGLBSprite(spriteKey);
  if (!sprite || sprite.frameCount === 0) return false;

  const frameIndex = Math.floor((time * 8) % sprite.frameCount);
  const frame = sprite.frames[frameIndex];
  if (!frame) return false;

  const w = sprite.width * scale;
  const h = sprite.height * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (rotation !== 0) ctx.rotate(rotation);
  ctx.drawImage(frame, -w / 2, -h / 2, w, h);
  ctx.restore();

  return true;
}

/**
 * Draw a GLB sprite as a projectile (with glow effect).
 */
export function drawGLBProjectile(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  x: number,
  y: number,
  time: number,
  scale: number = 0.6,
  glowColor: string = '#ffffff',
): boolean {
  // Glow behind
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  return drawGLBSprite(ctx, spriteKey, x, y, time, scale);
}
