/**
 * OpenWorldThreeRenderer — WebGL renderer for the MMO open world.
 *
 * Purpose-built for 16000×16000 zone-based world with:
 *   - Heightmap terrain mesh per zone (PlaneGeometry + tiled texture)
 *   - Rapier WASM physics (character controller, raycasting)
 *   - InstancedMesh batches for trees, rocks, buildings
 *   - GLB skinned characters with animation library retargeting
 *   - Third-person camera with smooth follow
 *   - Day/night lighting tied to world state
 *
 * Coordinate system: Three.js Y-up (X=right, Y=up, Z=toward camera)
 * Scale: 1 game unit = 1 Three.js unit (no WORLD_SCALE conversion)
 * The 2D game state (x,y) maps to Three.js (x, 0, y) — Y is height.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ISLAND_ZONES, OPEN_WORLD_SIZE, getZoneAtPosition, type ZoneDef } from './zones';
import { loadGLB, loadFBX, type LoadedModel, createAnimatedEntity, playAnimation, type AnimatedEntity, loadAnimSetForEntity } from './model-loader';
import { HERO_PREFABS, getHeroPrefabKey } from './prefabs';
import { HEROES, CLASS_COLORS, RACE_COLORS } from './types';
import { getDefaultAnimSet } from './animation-library';

// ── Types ──────────────────────────────────────────────────────

interface OWEntity3D {
  group: THREE.Group;
  entity?: AnimatedEntity;
  mixer?: THREE.AnimationMixer;
  healthBar?: THREE.Sprite;
  nameSprite?: THREE.Sprite;
  shadow?: THREE.Mesh;
  lastAnimState?: string;
}

// ── Constants ──────────────────────────────────────────────────

const TERRAIN_SEGMENTS = 64;       // vertices per zone terrain mesh side
const VIEW_DISTANCE = 2000;        // fog far distance
const CAMERA_HEIGHT = 12;          // camera Y offset above player
const CAMERA_DISTANCE = 16;        // camera Z offset behind player
const CAMERA_LERP = 0.08;         // camera smooth follow speed

// Zone terrain colors (fallback when no texture)
const ZONE_COLORS: Record<string, number> = {
  grass:  0x3a6a2a,
  jungle: 0x2a5a1a,
  water:  0x1a3a5a,
  stone:  0x5a5a6a,
  dirt:   0x5a4a3a,
};

// ── Rapier Init ────────────────────────────────────────────────

let rapierReady = false;
let rapierWorld: RAPIER.World | null = null;

async function initRapier(): Promise<RAPIER.World> {
  if (rapierWorld) return rapierWorld;
  await RAPIER.init();
  rapierReady = true;
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  rapierWorld = new RAPIER.World(gravity);

  // Ground collider (infinite plane at y=0)
  const groundDesc = RAPIER.ColliderDesc.cuboid(10000, 0.1, 10000)
    .setTranslation(0, -0.1, 0);
  rapierWorld.createCollider(groundDesc);

  return rapierWorld;
}

// ── Main Renderer ──────────────────────────────────────────────

export class OpenWorldThreeRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  // Lighting
  private sunLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private hemiLight!: THREE.HemisphereLight;

  // Camera target
  private cameraTarget = new THREE.Vector3();
  private cameraPosition = new THREE.Vector3();

  // Terrain meshes per zone
  private terrainMeshes = new Map<number, THREE.Mesh>();
  private oceanMesh!: THREE.Mesh;

  // Player
  private playerEntity: OWEntity3D | null = null;
  private playerModelLoaded = false;

  // Enemies
  private enemyEntities = new Map<number, OWEntity3D>();

  // Environment instances (trees, rocks)
  private treeInstances: THREE.InstancedMesh | null = null;
  private rockInstances: THREE.InstancedMesh | null = null;
  private environmentBuilt = false;

  // Physics
  private physicsWorld: RAPIER.World | null = null;
  private characterController: RAPIER.KinematicCharacterController | null = null;

  // State
  private initialized = false;
  private disposed = false;

  constructor(private container: HTMLElement) {
    // WebGL renderer with quality settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // sky blue
    this.scene.fog = new THREE.Fog(0x87CEEB, VIEW_DISTANCE * 0.6, VIEW_DISTANCE);

    // Camera — isometric-style perspective
    this.camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.5,
      VIEW_DISTANCE * 1.5,
    );
    this.camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    this.setupLighting();

    // Ocean
    this.setupOcean();

    // Resize handler
    window.addEventListener('resize', this.onResize);

    // Init Rapier physics async
    initRapier().then(world => {
      this.physicsWorld = world;
      this.characterController = world.createCharacterController(0.1); // 0.1 offset
      this.characterController.enableAutostep(0.5, 0.2, true); // step up 0.5 units
      this.characterController.enableSnapToGround(0.5);
    });

    this.initialized = true;
  }

  // ── Lighting ─────────────────────────────────────────────────

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x445566, 0.5);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.6);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    this.sunLight.position.set(100, 150, 80);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Fill light
    const fill = new THREE.DirectionalLight(0x4466aa, 0.3);
    fill.position.set(-50, 60, -40);
    this.scene.add(fill);
  }

  // ── Ocean ────────────────────────────────────────────────────

  private setupOcean(): void {
    const oceanGeo = new THREE.PlaneGeometry(OPEN_WORLD_SIZE * 2, OPEN_WORLD_SIZE * 2);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a5a,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(OPEN_WORLD_SIZE / 2, -0.5, OPEN_WORLD_SIZE / 2);
    this.oceanMesh.receiveShadow = true;
    this.scene.add(this.oceanMesh);
  }

  // ── Zone Terrain ─────────────────────────────────────────────

  private buildZoneTerrain(zone: ZoneDef): THREE.Mesh {
    const b = zone.bounds;
    const geo = new THREE.PlaneGeometry(b.w, b.h, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    // Apply gentle height variation
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      // Gentle rolling hills
      const height = Math.sin(x * 0.01) * 0.3 + Math.cos(z * 0.015) * 0.2 + Math.random() * 0.05;
      positions.setY(i, height);
    }
    geo.computeVertexNormals();

    const color = ZONE_COLORS[zone.terrainType] || ZONE_COLORS.grass;
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  }

  private ensureZoneTerrain(playerX: number, playerZ: number): void {
    // Build terrain for nearby zones
    for (const zone of ISLAND_ZONES) {
      const b = zone.bounds;
      const cx = b.x + b.w / 2;
      const cz = b.y + b.h / 2;
      const dist = Math.sqrt((playerX - cx) ** 2 + (playerZ - cz) ** 2);

      if (dist < VIEW_DISTANCE && !this.terrainMeshes.has(zone.id)) {
        const mesh = this.buildZoneTerrain(zone);
        this.terrainMeshes.set(zone.id, mesh);
        this.scene.add(mesh);
      }
    }
  }

  // ── Player Character ─────────────────────────────────────────

  async loadPlayerModel(heroDataId: number, heroClass: string, race: string): Promise<void> {
    if (this.playerModelLoaded) return;

    const heroData = HEROES[heroDataId] || HEROES.find(h => h.heroClass === heroClass && h.race === race);
    if (!heroData) return;

    const prefabKey = getHeroPrefabKey(heroData.race, heroData.heroClass, heroData.name);
    const prefab = HERO_PREFABS[prefabKey] || HERO_PREFABS[`${race.toLowerCase()}_${heroClass.toLowerCase()}`];

    const group = new THREE.Group();
    let entity: AnimatedEntity | undefined;

    if (prefab) {
      try {
        const model = await loadGLB(prefab.modelPath);
        const clone = model.scene.clone();
        clone.scale.setScalar(prefab.scale * 125); // scale up from MOBA scale to world scale
        clone.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        group.add(clone);

        // Create animated entity and load class animations
        entity = createAnimatedEntity({ scene: clone, animations: model.animations });
        await loadAnimSetForEntity(entity, heroData.heroClass);

        // Start idle
        playAnimation(entity, 'idle');
      } catch (err) {
        console.warn('[OW3D] Failed to load player model:', err);
        this.buildFallbackPlayer(group, heroData);
      }
    } else {
      this.buildFallbackPlayer(group, heroData);
    }

    // Shadow decal
    const shadowGeo = new THREE.CircleGeometry(0.8, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    group.add(shadow);

    this.playerEntity = { group, entity, mixer: entity?.mixer, shadow };
    this.scene.add(group);
    this.playerModelLoaded = true;
  }

  private buildFallbackPlayer(group: THREE.Group, heroData: any): void {
    // Capsule fallback
    const color = new THREE.Color(CLASS_COLORS[heroData.heroClass] || '#888');
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 8, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }),
    );
    capsule.position.y = 0.9;
    capsule.castShadow = true;
    group.add(capsule);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.6 }),
    );
    head.position.y = 1.9;
    head.castShadow = true;
    group.add(head);
  }

  // ── Update + Render ──────────────────────────────────────────

  update(
    playerX: number, playerY: number,
    playerFacing: number, playerAnimState: string,
    gameTime: number, brightness: number,
  ): void {
    if (this.disposed || !this.initialized) return;
    const dt = this.clock.getDelta();

    // Physics step
    if (this.physicsWorld) {
      this.physicsWorld.step();
    }

    // Ensure terrain is built near player
    this.ensureZoneTerrain(playerX, playerY);

    // Update player position (2D x,y → 3D x,0,z)
    if (this.playerEntity) {
      const pe = this.playerEntity;
      pe.group.position.set(playerX, 0, playerY);
      pe.group.rotation.y = -playerFacing + Math.PI / 2; // face direction

      // Animation state
      if (pe.entity && pe.lastAnimState !== playerAnimState) {
        const animName = this.mapAnimState(playerAnimState);
        playAnimation(pe.entity, animName);
        pe.lastAnimState = playerAnimState;
      }

      // Update mixer
      if (pe.mixer) pe.mixer.update(dt);
    }

    // Camera follow
    const targetX = playerX;
    const targetZ = playerY;
    this.cameraTarget.set(targetX, 1, targetZ);

    const camX = targetX + Math.sin(playerFacing) * CAMERA_DISTANCE;
    const camZ = targetZ + Math.cos(playerFacing) * CAMERA_DISTANCE;
    this.cameraPosition.lerp(
      new THREE.Vector3(camX, CAMERA_HEIGHT, camZ),
      CAMERA_LERP,
    );
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraTarget);

    // Sun follows player (shadow map coverage)
    this.sunLight.position.set(targetX + 100, 150, targetZ + 80);
    this.sunLight.target.position.set(targetX, 0, targetZ);
    this.sunLight.target.updateMatrixWorld();

    // Day/night brightness
    this.ambientLight.intensity = 0.3 + brightness * 0.4;
    this.sunLight.intensity = 0.5 + brightness * 1.2;
    const skyColor = new THREE.Color().lerpColors(
      new THREE.Color(0x0a1628), // night
      new THREE.Color(0x87CEEB), // day
      brightness,
    );
    this.scene.background = skyColor;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(skyColor);
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  private mapAnimState(state: string): string {
    switch (state) {
      case 'walk': case 'walking': return 'walk';
      case 'run': case 'sprint': return 'run';
      case 'attack': case 'attacking': case 'combo_finisher': return 'attack';
      case 'dodge': return 'dodge';
      case 'block': return 'block';
      case 'hit': case 'hurt': return 'hit';
      case 'death': case 'dying': return 'death';
      case 'ability': return 'spell';
      default: return 'idle';
    }
  }

  // ── Resize ───────────────────────────────────────────────────

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // ── Cleanup ──────────────────────────────────────────────────

  dispose(): void {
    this.disposed = true;
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.scene.clear();
    // Rapier world persists (singleton)
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  isReady(): boolean {
    return this.initialized && rapierReady;
  }
}
