/**
 * Effects Registry
 * Registers sprite sheet effects for combat VFX system.
 * Maps ability effectTypes (from open-world-types.ts) to sprite assets.
 *
 * Effect packs extracted to public/assets/packs/effects/
 */

const E = '/assets/packs/effects';

// ── Types ──────────────────────────────────────────────────────

export interface SpriteEffect {
  id: string;
  name: string;
  /** Path to directory containing numbered frames (Sek_00001.png, etc.) */
  framesDir: string;
  /** File prefix for frames */
  framePrefix: string;
  /** Number of frames in the animation */
  frameCount: number;
  /** Frames per second */
  fps: number;
  /** Whether the effect loops */
  loop: boolean;
  /** Optional light/glow overlay image */
  lightPath?: string;
  /** Scale multiplier */
  scale: number;
}

export interface EffectMapping {
  /** Maps to effectType in OpenWorldAbility */
  effectType: string;
  /** Primary sprite effect */
  primary: SpriteEffect;
  /** Optional secondary (e.g., impact) */
  impact?: SpriteEffect;
}

// ── Sprite Effects ─────────────────────────────────────────────

export const FLAME_EFFECT: SpriteEffect = {
  id: 'fx-flame-1',
  name: 'Flame Burst',
  framesDir: `${E}/flame/flame1/images`,
  framePrefix: 'Sek_',
  frameCount: 25,
  fps: 24,
  loop: false,
  lightPath: `${E}/flame/flame1/images/light2.png`,
  scale: 1.0,
};

export const SLASH_EFFECT: SpriteEffect = {
  id: 'fx-slash-1',
  name: 'Slash Arc',
  framesDir: `${E}/slash`,
  framePrefix: 'slash_',
  frameCount: 12,
  fps: 20,
  loop: false,
  scale: 1.0,
};

export const WATER_EFFECT: SpriteEffect = {
  id: 'fx-water-1',
  name: 'Water Splash',
  framesDir: `${E}/water`,
  framePrefix: 'water_',
  frameCount: 16,
  fps: 18,
  loop: false,
  scale: 1.0,
};

// ── Effect Type Mappings ───────────────────────────────────────
// Maps OpenWorldAbility.effectType → sprite assets

export const EFFECT_MAPPINGS: Record<string, EffectMapping> = {
  fire_ball: {
    effectType: 'fire_ball',
    primary: FLAME_EFFECT,
  },
  fire_wall: {
    effectType: 'fire_wall',
    primary: { ...FLAME_EFFECT, id: 'fx-flame-wall', loop: true, scale: 1.5 },
  },
  lightning: {
    effectType: 'lightning',
    primary: SLASH_EFFECT,
  },
  lightning_bolt: {
    effectType: 'lightning_bolt',
    primary: SLASH_EFFECT,
  },
  sun_strike: {
    effectType: 'sun_strike',
    primary: FLAME_EFFECT,
    impact: SLASH_EFFECT,
  },
  explosion: {
    effectType: 'explosion',
    primary: { ...FLAME_EFFECT, id: 'fx-explosion', scale: 2.0 },
  },
  spikes: {
    effectType: 'spikes',
    primary: SLASH_EFFECT,
  },
  black_hole: {
    effectType: 'black_hole',
    primary: { ...WATER_EFFECT, id: 'fx-vortex', scale: 2.5, loop: true },
  },
  shield_spell: {
    effectType: 'shield_spell',
    primary: WATER_EFFECT,
  },
  midas_touch: {
    effectType: 'midas_touch',
    primary: { ...FLAME_EFFECT, id: 'fx-gold-burst', scale: 0.8 },
  },
  physical: {
    effectType: 'physical',
    primary: SLASH_EFFECT,
  },
};

// ── Helpers ────────────────────────────────────────────────────

/** Get the effect mapping for an ability effectType */
export function getEffectMapping(effectType: string): EffectMapping | null {
  return EFFECT_MAPPINGS[effectType] || null;
}

/**
 * Build the frame path for a sprite effect at a given frame index.
 * Frames are 1-indexed and zero-padded to 5 digits.
 */
export function getFramePath(effect: SpriteEffect, frameIndex: number): string {
  const padded = String(frameIndex + 1).padStart(5, '0');
  return `${effect.framesDir}/${effect.framePrefix}${padded}.png`;
}

/** Get all frame paths for a sprite effect */
export function getAllFramePaths(effect: SpriteEffect): string[] {
  return Array.from({ length: effect.frameCount }, (_, i) => getFramePath(effect, i));
}
