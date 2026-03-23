/**
 * Race Modifications — applied at runtime to voxel characters.
 * 
 * Modifies:
 *   1. Bone scales for race-specific proportions (height, width, limb ratios)
 *   2. Palette texture recoloring for skin tones
 *   3. Feature attachments (elf ears, undead glow)
 */

import * as THREE from 'three';
import type { CharacterInstance } from './character-loader';

// ── Race Proportion Configs ────────────────────────────────────

export interface RaceConfig {
  name: string;
  faction: string;
  /** Overall scale multiplier */
  scale: number;
  /** Bone-specific scale overrides (bone name substring → scale vector) */
  boneScales: Record<string, THREE.Vector3>;
  /** Skin color (hex) — applied to palette texture */
  skinColor: string;
  /** Secondary color (hair/accent) */
  accentColor: string;
  /** Description shown in character creation */
  description: string;
}

export const RACE_CONFIGS: Record<string, RaceConfig> = {
  Human: {
    name: 'Human', faction: 'Crusade',
    scale: 1.0,
    boneScales: {},
    skinColor: '#c4956a',
    accentColor: '#4a3020',
    description: 'Versatile and balanced. No proportion modifiers.',
  },
  Barbarian: {
    name: 'Barbarian', faction: 'Crusade',
    scale: 1.05,
    boneScales: {
      'Shoulder': new THREE.Vector3(1.1, 1.0, 1.1),  // broader shoulders
      'Spine': new THREE.Vector3(1.05, 1.0, 1.05),    // thicker torso
    },
    skinColor: '#a57850',
    accentColor: '#5a3a1a',
    description: 'Larger build, broader shoulders. Northern warriors.',
  },
  Dwarf: {
    name: 'Dwarf', faction: 'Fabled',
    scale: 0.78,
    boneScales: {
      'Spine': new THREE.Vector3(1.2, 0.9, 1.2),     // wider, shorter torso
      'UpLeg': new THREE.Vector3(1.0, 0.85, 1.0),    // shorter legs
      'Leg': new THREE.Vector3(1.0, 0.85, 1.0),       // shorter lower legs
      'Arm': new THREE.Vector3(1.1, 0.95, 1.1),       // thicker arms
    },
    skinColor: '#d4a574',
    accentColor: '#8b4513',
    description: 'Short and stout. Exceptional defense and crafting.',
  },
  Elf: {
    name: 'Elf', faction: 'Fabled',
    scale: 1.08,
    boneScales: {
      'UpLeg': new THREE.Vector3(0.95, 1.05, 0.95),  // longer, slimmer legs
      'Leg': new THREE.Vector3(0.95, 1.05, 0.95),
      'Spine': new THREE.Vector3(0.95, 1.02, 0.95),   // slimmer torso
    },
    skinColor: '#e8d5b8',
    accentColor: '#c5a059',
    description: 'Tall and graceful. Magical affinity and precision.',
  },
  Orc: {
    name: 'Orc', faction: 'Legion',
    scale: 1.05,
    boneScales: {
      'Spine': new THREE.Vector3(1.15, 1.0, 1.1),    // wide torso
      'Shoulder': new THREE.Vector3(1.12, 1.0, 1.1),  // big shoulders
      'Arm': new THREE.Vector3(1.1, 1.0, 1.1),        // thick arms
      'Hand': new THREE.Vector3(1.15, 1.15, 1.15),    // big hands
    },
    skinColor: '#5a8a3a',
    accentColor: '#2a4a1a',
    description: 'Massive and brutal. Green-skinned warriors.',
  },
  Undead: {
    name: 'Undead', faction: 'Legion',
    scale: 0.98,
    boneScales: {
      'Spine': new THREE.Vector3(0.95, 1.0, 0.95),   // gaunt
      'Arm': new THREE.Vector3(0.92, 1.02, 0.92),     // thin arms
    },
    skinColor: '#7a8a7a',
    accentColor: '#3a4a3a',
    description: 'Risen warriors. Gaunt, pale, relentless.',
  },
};

// ── Apply Race to Character ────────────────────────────────────

/**
 * Apply race modifications to a loaded character instance.
 * Modifies bone scales and recolors the palette texture.
 */
export function applyRace(character: CharacterInstance, race: string): void {
  const config = RACE_CONFIGS[race];
  if (!config) return;

  // 1. Overall scale — multiply the auto-calculated scale, don't override it
  character.group.scale.multiplyScalar(config.scale);

  // 2. Bone-specific scaling
  if (character.skeleton) {
    for (const bone of character.skeleton.bones) {
      for (const [nameMatch, scale] of Object.entries(config.boneScales)) {
        if (bone.name.includes(nameMatch)) {
          bone.scale.copy(scale);
        }
      }
    }
  }

  // 3. Palette recolor
  recolorPalette(character, config.skinColor, config.accentColor);
}

/**
 * Recolor the character's palette texture.
 * The DungeonCrawler palette is a 256×1 strip where different regions
 * map to skin, clothing, hair, etc. via UV coordinates.
 * 
 * For race modification, we tint the skin-region pixels.
 */
export function recolorPalette(
  character: CharacterInstance,
  skinColor: string,
  accentColor: string,
): void {
  if (!character.paletteTexture) return;

  const img = character.paletteTexture.image;
  if (!img) return;

  // Create a canvas to manipulate pixels
  const canvas = document.createElement('canvas');
  const w = img.width || 256;
  const h = img.height || 1;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Draw original
  ctx.drawImage(img, 0, 0);

  // Apply skin tint (blend mode: multiply the target color over the skin region)
  const skinRGB = hexToRGB(skinColor);
  const accentRGB = hexToRGB(accentColor);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % w;
    const r = data[i], g = data[i + 1], b = data[i + 2];

    // Skin region: first ~30% of palette (approximate — varies by character)
    if (px < w * 0.3) {
      data[i]     = Math.floor(r * skinRGB.r / 255);
      data[i + 1] = Math.floor(g * skinRGB.g / 255);
      data[i + 2] = Math.floor(b * skinRGB.b / 255);
    }
    // Accent region: ~60-80% of palette (hair, details)
    else if (px > w * 0.6 && px < w * 0.8) {
      data[i]     = Math.floor(r * accentRGB.r / 255);
      data[i + 1] = Math.floor(g * accentRGB.g / 255);
      data[i + 2] = Math.floor(b * accentRGB.b / 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Update texture
  const newTex = new THREE.CanvasTexture(canvas);
  newTex.magFilter = THREE.NearestFilter;
  newTex.minFilter = THREE.NearestFilter;
  newTex.colorSpace = THREE.SRGBColorSpace;

  // Apply to mesh material — works with MeshPhongMaterial (FBXLoader) and MeshStandardMaterial
  if (character.mesh?.material) {
    const applyTex = (m: THREE.Material) => {
      (m as any).map = newTex;
      (m as any).needsUpdate = true;
    };
    if (Array.isArray(character.mesh.material)) {
      character.mesh.material.forEach(applyTex);
    } else {
      applyTex(character.mesh.material);
    }
  }
  character.paletteTexture = newTex;
}

/**
 * Apply custom skin color (for character creation slider)
 */
export function applySkinColor(character: CharacterInstance, hexColor: string): void {
  const race = Object.values(RACE_CONFIGS).find(r => r.skinColor === hexColor);
  const accent = race?.accentColor || '#4a3020';
  recolorPalette(character, hexColor, accent);
}

// ── Helpers ────────────────────────────────────────────────────

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/** Get all race names */
export function getRaceNames(): string[] {
  return Object.keys(RACE_CONFIGS);
}

/** Get races for a faction */
export function getRacesForFaction(faction: string): string[] {
  return Object.entries(RACE_CONFIGS)
    .filter(([_, cfg]) => cfg.faction === faction)
    .map(([name]) => name);
}

/** Get faction for a race */
export function getFactionForRace(race: string): string {
  return RACE_CONFIGS[race]?.faction || 'Crusade';
}
