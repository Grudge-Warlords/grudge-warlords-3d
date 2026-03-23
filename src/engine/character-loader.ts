/**
 * Character Loader — loads the 12 DungeonCrawler voxel character models.
 * 
 * Each character shares:
 *   - Mixamo-compatible skeleton (same bone names)
 *   - Shared palette texture (DungeonCrawler_Character.png)
 *   - Same UV layout (palette-based coloring)
 * 
 * Returns a CharacterInstance with the Three.js group, skeleton reference,
 * and methods for race modifications and weapon attachment.
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// ── Character Definitions ──────────────────────────────────────

export interface CharacterDef {
  id: number;
  name: string;
  bodyType: 'heavy_male' | 'medium_male' | 'slim_male' | 'heavy_female' | 'medium_female' | 'slim_female';
  fbxFile: string;
  availableRaces: string[];
}

export const CHARACTER_DEFS: CharacterDef[] = [
  { id: 0,  name: 'Knight',       bodyType: 'heavy_male',    fbxFile: 'DungeonCrawler_Character.fbx',   availableRaces: ['Human', 'Barbarian', 'Orc', 'Dwarf', 'Undead'] },
  { id: 1,  name: 'Warrior',      bodyType: 'medium_male',   fbxFile: 'DungeonCrawler_Character1.fbx',  availableRaces: ['Human', 'Barbarian', 'Elf', 'Orc', 'Dwarf', 'Undead'] },
  { id: 2,  name: 'Rogue',        bodyType: 'slim_male',     fbxFile: 'DungeonCrawler_Character2.fbx',  availableRaces: ['Human', 'Elf', 'Undead'] },
  { id: 3,  name: 'Mage',         bodyType: 'medium_male',   fbxFile: 'DungeonCrawler_Character3.fbx',  availableRaces: ['Human', 'Barbarian', 'Elf', 'Orc', 'Dwarf', 'Undead'] },
  { id: 4,  name: 'Ranger',       bodyType: 'slim_male',     fbxFile: 'DungeonCrawler_Character4.fbx',  availableRaces: ['Human', 'Elf', 'Barbarian', 'Undead'] },
  { id: 5,  name: 'Berserker',    bodyType: 'heavy_male',    fbxFile: 'DungeonCrawler_Character5.fbx',  availableRaces: ['Human', 'Barbarian', 'Orc', 'Dwarf'] },
  { id: 6,  name: 'Huntress',     bodyType: 'slim_female',   fbxFile: 'DungeonCrawler_Character6.fbx',  availableRaces: ['Human', 'Elf', 'Undead'] },
  { id: 7,  name: 'Valkyrie',     bodyType: 'medium_female', fbxFile: 'DungeonCrawler_Character7.fbx',  availableRaces: ['Human', 'Barbarian', 'Elf', 'Orc', 'Dwarf', 'Undead'] },
  { id: 8,  name: 'Witch',        bodyType: 'medium_female', fbxFile: 'DungeonCrawler_Character8.fbx',  availableRaces: ['Human', 'Elf', 'Barbarian', 'Undead'] },
  { id: 9,  name: 'Brute',        bodyType: 'heavy_male',    fbxFile: 'DungeonCrawler_Character9.fbx',  availableRaces: ['Orc', 'Barbarian', 'Dwarf', 'Undead'] },
  { id: 10, name: 'Shadow',       bodyType: 'slim_female',   fbxFile: 'DungeonCrawler_Character10.fbx', availableRaces: ['Human', 'Elf', 'Undead'] },
  { id: 11, name: 'Shieldmaiden', bodyType: 'heavy_female',  fbxFile: 'DungeonCrawler_Character11.fbx', availableRaces: ['Human', 'Barbarian', 'Orc', 'Dwarf'] },
];

const BASE_PATH = '/assets/models/voxel-rpg/Content/Characters/';
const TEXTURE_PATH = '/assets/models/voxel-rpg/Content/Textures/DungeonCrawler_Character.png';

// ── Character Instance ─────────────────────────────────────────

export interface CharacterInstance {
  group: THREE.Group;
  skeleton: THREE.Skeleton | null;
  mixer: THREE.AnimationMixer;
  mesh: THREE.SkinnedMesh | null;
  def: CharacterDef;
  /** The palette texture (can be modified for race recoloring) */
  paletteTexture: THREE.Texture | null;
  /** Get a bone by name (searches skeleton) */
  getBone(name: string): THREE.Bone | null;
}

// ── Loader Cache ───────────────────────────────────────────────

const fbxLoader = new FBXLoader();
const textureLoader = new THREE.TextureLoader();
const modelCache = new Map<string, THREE.Group>();
let paletteTextureCache: THREE.Texture | null = null;

function loadPaletteTexture(): Promise<THREE.Texture> {
  if (paletteTextureCache) return Promise.resolve(paletteTextureCache.clone());
  return new Promise((resolve) => {
    textureLoader.load(TEXTURE_PATH, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      paletteTextureCache = tex;
      resolve(tex.clone());
    }, undefined, () => {
      // Fallback: create a simple colored texture
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#c4956a';
      ctx.fillRect(0, 0, 256, 1);
      const fallback = new THREE.CanvasTexture(canvas);
      fallback.magFilter = THREE.NearestFilter;
      paletteTextureCache = fallback;
      resolve(fallback.clone());
    });
  });
}

// ── Load Character ─────────────────────────────────────────────

export async function loadCharacter(characterId: number): Promise<CharacterInstance> {
  const def = CHARACTER_DEFS.find(d => d.id === characterId);
  if (!def) throw new Error(`Character ${characterId} not found`);

  const fbxPath = BASE_PATH + def.fbxFile;
  const palette = await loadPaletteTexture();

  const group = await new Promise<THREE.Group>((resolve, reject) => {
    // Check cache
    if (modelCache.has(fbxPath)) {
      resolve(modelCache.get(fbxPath)!.clone());
      return;
    }
    fbxLoader.load(fbxPath, (fbx) => {
      modelCache.set(fbxPath, fbx);
      resolve(fbx.clone());
    }, undefined, reject);
  });

  // Scale to world units
  group.scale.setScalar(0.01);

  // Find skinned mesh and apply palette texture
  let skeleton: THREE.Skeleton | null = null;
  let skinnedMesh: THREE.SkinnedMesh | null = null;

  group.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      skinnedMesh = child as THREE.SkinnedMesh;
      skeleton = skinnedMesh.skeleton;
      child.castShadow = true;
      child.receiveShadow = true;

      // FBXLoader produces MeshPhongMaterial — convert to MeshStandardMaterial
      // and apply palette texture to ALL material types
      const applyTex = (m: THREE.Material) => {
        (m as any).map = palette;
        (m as any).needsUpdate = true;
      };
      if (skinnedMesh.material) {
        if (Array.isArray(skinnedMesh.material)) {
          skinnedMesh.material.forEach(applyTex);
        } else {
          applyTex(skinnedMesh.material);
        }
      }
    }
  });

  const mixer = new THREE.AnimationMixer(group);

  const instance: CharacterInstance = {
    group,
    skeleton,
    mixer,
    mesh: skinnedMesh,
    def,
    paletteTexture: palette,
    getBone(name: string): THREE.Bone | null {
      if (!skeleton) return null;
      return skeleton.bones.find(b => b.name.includes(name)) || null;
    },
  };

  return instance;
}

/** Get character defs available for a given race */
export function getCharacterDefsForRace(race: string): CharacterDef[] {
  return CHARACTER_DEFS.filter(d => d.availableRaces.includes(race));
}

/** Get all character defs */
export function getAllCharacterDefs(): CharacterDef[] {
  return CHARACTER_DEFS;
}
