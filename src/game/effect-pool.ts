/**
 * Pre-allocated Effect Pool
 *
 * Replaces the dynamic `spellEffects: OWSpellEffect[]` with a fixed-size pool
 * that avoids GC pressure from per-frame allocations. Each slot is reused on
 * spawn; the oldest active effect is overwritten when the pool is full.
 */

// ── Effect Type ────────────────────────────────────────────────

export type EffectType =
  | 'cast_circle'
  | 'impact_ring'
  | 'aoe_blast'
  | 'skillshot_trail'
  | 'cone_sweep'
  | 'dash_trail'
  | 'melee_slash'
  | 'melee_lunge'
  | 'heavy_slash'
  | 'enemy_slash'
  | 'enemy_aoe_telegraph'
  | 'enemy_aoe_blast';

// ── Per-Type Visual Curves ─────────────────────────────────────

interface EffectCurves {
  /** Opacity as a function of normalised progress (0→1) */
  opacity(t: number): number;
  /** Scale multiplier as a function of normalised progress */
  scale(t: number): number;
}

/** Fast fade-out curve */
const fadeOut: EffectCurves = {
  opacity: (t) => 1 - t,
  scale: () => 1,
};

/** Expand-then-fade (rings, blasts) */
const expandFade: EffectCurves = {
  opacity: (t) => Math.max(0, 1 - t * t),
  scale: (t) => 0.6 + t * 0.4,
};

/** Quick pop (melee slash, impacts) */
const popFade: EffectCurves = {
  opacity: (t) => t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.7),
  scale: (t) => t < 0.2 ? 0.5 + t * 2.5 : 1,
};

/** Slow pulse for telegraphs */
const pulseFade: EffectCurves = {
  opacity: (t) => 0.3 + Math.sin(t * Math.PI * 4) * 0.15 + (1 - t) * 0.5,
  scale: (t) => 0.9 + Math.sin(t * Math.PI * 2) * 0.1,
};

const TYPE_CURVES: Record<EffectType, EffectCurves> = {
  cast_circle:         expandFade,
  impact_ring:         expandFade,
  aoe_blast:           expandFade,
  skillshot_trail:     fadeOut,
  cone_sweep:          popFade,
  dash_trail:          fadeOut,
  melee_slash:         popFade,
  melee_lunge:         popFade,
  heavy_slash:         popFade,
  enemy_slash:         popFade,
  enemy_aoe_telegraph: pulseFade,
  enemy_aoe_blast:     expandFade,
};

// ── Slot ───────────────────────────────────────────────────────

export interface EffectSlot {
  active: boolean;
  x: number;
  y: number;
  type: EffectType;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  angle: number;
  data: any;
  /** Derived each tick — no need to compute in render loop */
  opacity: number;
  scaleMul: number;
}

function resetSlot(s: EffectSlot): void {
  s.active = false;
  s.x = 0; s.y = 0;
  s.type = 'cast_circle';
  s.life = 0; s.maxLife = 0;
  s.radius = 0;
  s.color = '#fff';
  s.angle = 0;
  s.data = undefined;
  s.opacity = 0;
  s.scaleMul = 1;
}

// ── Pool ───────────────────────────────────────────────────────

const DEFAULT_POOL_SIZE = 128;

export class EffectPool {
  private slots: EffectSlot[];
  private _activeCount = 0;

  constructor(size = DEFAULT_POOL_SIZE) {
    this.slots = [];
    for (let i = 0; i < size; i++) {
      this.slots.push({
        active: false, x: 0, y: 0,
        type: 'cast_circle',
        life: 0, maxLife: 0, radius: 0,
        color: '#fff', angle: 0, data: undefined,
        opacity: 0, scaleMul: 1,
      });
    }
  }

  get activeCount(): number { return this._activeCount; }

  /**
   * Spawn a new effect. If the pool is full the oldest slot is overwritten.
   */
  spawn(
    x: number, y: number,
    type: EffectType,
    radius: number,
    color: string,
    duration: number,
    angle = 0,
    data?: any,
  ): void {
    // Find first inactive slot
    let slot: EffectSlot | null = null;
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i].active) { slot = this.slots[i]; break; }
    }
    // Pool full — overwrite the slot with the lowest remaining life
    if (!slot) {
      let minLife = Infinity;
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i].life < minLife) { minLife = this.slots[i].life; slot = this.slots[i]; }
      }
    }
    if (!slot) return; // should never happen

    if (!slot.active) this._activeCount++;
    slot.active = true;
    slot.x = x; slot.y = y;
    slot.type = type;
    slot.life = duration;
    slot.maxLife = duration;
    slot.radius = radius;
    slot.color = color;
    slot.angle = angle;
    slot.data = data;
    slot.opacity = 1;
    slot.scaleMul = 1;
  }

  /** Tick all active effects. Call once per frame. */
  update(dt: number): void {
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        resetSlot(s);
        this._activeCount--;
        continue;
      }
      const progress = 1 - s.life / s.maxLife; // 0→1
      const curves = TYPE_CURVES[s.type] || fadeOut;
      s.opacity = curves.opacity(progress);
      s.scaleMul = curves.scale(progress);
    }
  }

  /** Iterate all active effects. */
  forEach(fn: (slot: EffectSlot) => void): void {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].active) fn(this.slots[i]);
    }
  }

  /** Clear all effects. */
  clear(): void {
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].active) resetSlot(this.slots[i]);
    }
    this._activeCount = 0;
  }
}
