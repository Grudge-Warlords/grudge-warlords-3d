/**
 * Fishing System — Core catch mechanic.
 * State machine: idle → casting → waiting → bite → reeling → caught/missed
 * Ported from grudge-angeler concept: power bar cast, bobber wait, reaction-based bite,
 * reel slider minigame with LMB/Space/S controls, Verlet rope physics.
 *
 * Integrates with professions-system.ts fishing profession for tier-based drops.
 */

import { getTierForLevel, getBonusQuantity } from './professions-system';

// ── Fish Definitions ───────────────────────────────────────────

export interface FishDef {
  id: string;
  name: string;
  tier: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  /** Fight difficulty 0-1 (higher = harder to reel) */
  fightSpeed: number;
  /** How erratic the fish moves during reel (0-1) */
  burstChance: number;
  /** Material drops when caught */
  drops: { materialId: string; category: string; qty: number }[];
  /** XP granted on catch */
  xp: number;
  /** Weight range [min, max] in arbitrary units */
  weight: [number, number];
  /** Icon row/col in Icons.png atlas (16px grid) */
  iconCol: number;
  iconRow: number;
}

export const FISH_SPECIES: FishDef[] = [
  { id: 'bass',       name: 'River Bass',      tier: 1, rarity: 'common',    fightSpeed: 0.2, burstChance: 0.1, drops: [{ materialId: 'common_fish', category: 'food', qty: 1 }], xp: 10, weight: [1, 3],   iconCol: 0, iconRow: 0 },
  { id: 'salmon',     name: 'Silver Salmon',   tier: 1, rarity: 'common',    fightSpeed: 0.3, burstChance: 0.15, drops: [{ materialId: 'salmon', category: 'food', qty: 1 }], xp: 15, weight: [2, 5],   iconCol: 1, iconRow: 0 },
  { id: 'trout',      name: 'Spotted Trout',   tier: 2, rarity: 'uncommon',  fightSpeed: 0.35, burstChance: 0.2, drops: [{ materialId: 'tuna', category: 'food', qty: 1 }], xp: 25, weight: [3, 8],   iconCol: 2, iconRow: 0 },
  { id: 'catfish',    name: 'Swamp Catfish',    tier: 2, rarity: 'uncommon',  fightSpeed: 0.4, burstChance: 0.2, drops: [{ materialId: 'lobster', category: 'food', qty: 1 }], xp: 30, weight: [4, 12],  iconCol: 3, iconRow: 0 },
  { id: 'golden',     name: 'Golden Carp',      tier: 3, rarity: 'rare',      fightSpeed: 0.5, burstChance: 0.3, drops: [{ materialId: 'golden_fish', category: 'food', qty: 1 }], xp: 50, weight: [3, 10],  iconCol: 4, iconRow: 0 },
  { id: 'pearl_oys',  name: 'Pearl Oyster',     tier: 3, rarity: 'rare',      fightSpeed: 0.25, burstChance: 0.1, drops: [{ materialId: 'pearl_oyster', category: 'gem', qty: 1 }], xp: 60, weight: [1, 3],   iconCol: 5, iconRow: 0 },
  { id: 'moonfish',   name: 'Moonfish',         tier: 4, rarity: 'rare',      fightSpeed: 0.6, burstChance: 0.35, drops: [{ materialId: 'moonfish', category: 'food', qty: 1 }, { materialId: 'mana_essence', category: 'essence', qty: 1 }], xp: 80, weight: [5, 15], iconCol: 6, iconRow: 0 },
  { id: 'void_eel',   name: 'Void Eel',         tier: 5, rarity: 'epic',      fightSpeed: 0.75, burstChance: 0.45, drops: [{ materialId: 'void_fish', category: 'essence', qty: 1 }], xp: 120, weight: [8, 20], iconCol: 7, iconRow: 0 },
  { id: 'star_ray',   name: 'Starlight Ray',    tier: 6, rarity: 'epic',      fightSpeed: 0.8, burstChance: 0.5, drops: [{ materialId: 'celestial_koi', category: 'essence', qty: 1 }, { materialId: 'star_pearl', category: 'gem', qty: 1 }], xp: 180, weight: [12, 30], iconCol: 8, iconRow: 0 },
  { id: 'leviathan',  name: 'Baby Leviathan',   tier: 7, rarity: 'legendary', fightSpeed: 0.95, burstChance: 0.6, drops: [{ materialId: 'phoenix_fin', category: 'essence', qty: 1 }, { materialId: 'sun_pearl', category: 'gem', qty: 1 }], xp: 300, weight: [25, 60], iconCol: 9, iconRow: 0 },
];

// ── Fishing State Machine ──────────────────────────────────────

export type FishingState = 'idle' | 'casting' | 'waiting' | 'bite' | 'reeling' | 'caught' | 'missed';

export interface RopeSegment {
  x: number; y: number;
  ox: number; oy: number; // previous position (Verlet)
}

export interface FishingSession {
  state: FishingState;
  // Cast
  castPower: number;       // 0→1 power bar (oscillates while held)
  castDir: number;         // 1 or -1 for power bar oscillation
  hookX: number;           // world position of hook/bobber
  hookY: number;
  // Wait
  waitTimer: number;       // seconds until fish approaches
  biteTimer: number;       // reaction window (0 = no bite yet)
  biteReactionWindow: number; // how long player has to react (seconds)
  // Reel
  reelGauge: number;       // 0→1 fill to catch
  reelTarget: number;      // fish position on slider (0→1)
  reelCatchZone: number;   // center of catch zone on slider (0→1)
  reelCatchSize: number;   // half-width of catch zone
  hookedFish: FishDef | null;
  hookedFishWeight: number;
  fishVX: number;          // fish velocity for erratic movement
  resilience: number;      // line durability 0→1 (breaks at 0)
  tension: number;         // current line tension 0→1
  // Rope physics
  ropeSegments: RopeSegment[];
  // Anchor positions
  rodTipX: number;
  rodTipY: number;
  // Result
  caughtFish: FishDef | null;
  caughtWeight: number;
}

// ── Constants ──────────────────────────────────────────────────

const ROPE_SEGMENTS = 12;
const ROPE_GRAVITY = 300;
const ROPE_DAMPING = 0.98;
const ROPE_CONSTRAINT_ITERS = 3;
const CAST_POWER_SPEED = 1.8;       // oscillation speed
const WAIT_TIME_MIN = 2;
const WAIT_TIME_MAX = 8;
const BITE_REACTION_SEC = 1.2;
const REEL_FILL_RATE = 0.25;        // per second when fish in zone
const REEL_DRAIN_RATE = 0.15;       // per second when fish outside zone
const REEL_BOOST_MULT = 1.8;        // spacebar boost
const LETOUT_TENSION_REDUCE = 0.4;  // S key tension reduce per second
const FISH_MOVE_SPEED = 0.8;        // base fish slider speed

// ── Create Session ─────────────────────────────────────────────

export function createFishingSession(rodX: number, rodY: number): FishingSession {
  const segments: RopeSegment[] = [];
  for (let i = 0; i < ROPE_SEGMENTS; i++) {
    segments.push({ x: rodX, y: rodY, ox: rodX, oy: rodY });
  }
  return {
    state: 'idle',
    castPower: 0, castDir: 1,
    hookX: rodX, hookY: rodY,
    waitTimer: 0, biteTimer: 0, biteReactionWindow: BITE_REACTION_SEC,
    reelGauge: 0, reelTarget: 0.5, reelCatchZone: 0.5, reelCatchSize: 0.15,
    hookedFish: null, hookedFishWeight: 0,
    fishVX: 0, resilience: 1, tension: 0,
    ropeSegments: segments,
    rodTipX: rodX, rodTipY: rodY,
    caughtFish: null, caughtWeight: 0,
  };
}

// ── Input Actions ──────────────────────────────────────────────

/** Start or release cast (LMB press/release) */
export function castAction(session: FishingSession, pressed: boolean): void {
  if (pressed && session.state === 'idle') {
    session.state = 'casting';
    session.castPower = 0;
    session.castDir = 1;
  } else if (!pressed && session.state === 'casting') {
    // Release cast — launch bobber
    session.state = 'waiting';
    const dist = 60 + session.castPower * 200;
    session.hookX = session.rodTipX + dist;
    session.hookY = session.rodTipY;
    session.waitTimer = WAIT_TIME_MIN + Math.random() * (WAIT_TIME_MAX - WAIT_TIME_MIN);
    session.biteTimer = 0;
  }
}

/** React to bite (LMB press during bite state) */
export function biteReactAction(session: FishingSession): void {
  if (session.state !== 'bite') return;
  // Successful reaction — start reeling
  session.state = 'reeling';
  session.reelGauge = 0.1;
  session.reelTarget = 0.5;
  session.reelCatchZone = 0.5;
  session.tension = 0.3;
  session.resilience = 1;
}

// ── Main Update ────────────────────────────────────────────────

export interface FishingResult {
  type: 'caught' | 'missed' | 'broke';
  fish: FishDef | null;
  weight: number;
}

/**
 * Update the fishing session each frame.
 * @param keys - set of currently held keys (lowercase)
 * @param lmbHeld - left mouse button held
 * @param fishingLevel - player's fishing profession level
 * @returns FishingResult when a catch/miss occurs, null otherwise
 */
export function updateFishing(
  session: FishingSession,
  dt: number,
  keys: Set<string>,
  lmbHeld: boolean,
  fishingLevel: number,
): FishingResult | null {
  switch (session.state) {
    case 'casting': {
      // Oscillate power bar
      session.castPower += session.castDir * CAST_POWER_SPEED * dt;
      if (session.castPower >= 1) { session.castPower = 1; session.castDir = -1; }
      if (session.castPower <= 0) { session.castPower = 0; session.castDir = 1; }
      break;
    }

    case 'waiting': {
      session.waitTimer -= dt;
      if (session.waitTimer <= 0 && session.biteTimer <= 0) {
        // Fish bites! Pick a fish based on level
        session.state = 'bite';
        session.biteTimer = BITE_REACTION_SEC;
        session.hookedFish = pickFish(fishingLevel);
        session.hookedFishWeight = session.hookedFish
          ? session.hookedFish.weight[0] + Math.random() * (session.hookedFish.weight[1] - session.hookedFish.weight[0])
          : 0;
        // Adjust catch zone size based on fish rarity
        if (session.hookedFish) {
          session.reelCatchSize = 0.18 - session.hookedFish.fightSpeed * 0.08;
        }
      }
      break;
    }

    case 'bite': {
      session.biteTimer -= dt;
      if (session.biteTimer <= 0) {
        // Missed the bite
        session.state = 'missed';
        return { type: 'missed', fish: null, weight: 0 };
      }
      break;
    }

    case 'reeling': {
      if (!session.hookedFish) break;
      const fish = session.hookedFish;

      // Fish movement (erratic based on species)
      if (Math.random() < fish.burstChance * dt * 3) {
        session.fishVX = (Math.random() - 0.5) * fish.fightSpeed * 2;
      }
      session.reelTarget += session.fishVX * FISH_MOVE_SPEED * dt;
      session.reelTarget = Math.max(0, Math.min(1, session.reelTarget));
      session.fishVX *= 0.95; // drag

      // Player controls
      const reeling = lmbHeld;
      const boosting = keys.has(' ') || keys.has('space');
      const lettingOut = keys.has('s');

      // Move catch zone toward fish when reeling
      if (reeling) {
        const dir = session.reelTarget > session.reelCatchZone ? 1 : -1;
        const speed = boosting ? 0.6 * REEL_BOOST_MULT : 0.6;
        session.reelCatchZone += dir * speed * dt;
        session.reelCatchZone = Math.max(0, Math.min(1, session.reelCatchZone));
        session.tension = Math.min(1, session.tension + 0.3 * dt);
      }

      // Let out line (S key) — reduces tension
      if (lettingOut) {
        session.tension = Math.max(0, session.tension - LETOUT_TENSION_REDUCE * dt);
      }

      // Tension naturally increases when fish is outside catch zone
      const inZone = Math.abs(session.reelTarget - session.reelCatchZone) < session.reelCatchSize;
      if (!inZone) {
        session.tension = Math.min(1, session.tension + 0.15 * dt);
      } else {
        session.tension = Math.max(0, session.tension - 0.1 * dt);
      }

      // High tension damages resilience
      if (session.tension > 0.8) {
        session.resilience -= (session.tension - 0.7) * 0.4 * dt;
      }

      // Gauge fills when fish is in catch zone, drains otherwise
      if (inZone) {
        session.reelGauge += REEL_FILL_RATE * (boosting ? REEL_BOOST_MULT : 1) * dt;
      } else {
        session.reelGauge -= REEL_DRAIN_RATE * dt;
      }
      session.reelGauge = Math.max(0, Math.min(1, session.reelGauge));

      // Win condition
      if (session.reelGauge >= 1) {
        session.state = 'caught';
        session.caughtFish = fish;
        session.caughtWeight = session.hookedFishWeight;
        return { type: 'caught', fish, weight: session.hookedFishWeight };
      }

      // Lose conditions
      if (session.reelGauge <= 0) {
        session.state = 'missed';
        return { type: 'missed', fish, weight: 0 };
      }
      if (session.resilience <= 0) {
        session.state = 'missed';
        return { type: 'broke', fish, weight: 0 };
      }
      break;
    }
  }

  // Update rope physics
  updateRope(session, dt);

  return null;
}

// ── Fish Selection ─────────────────────────────────────────────

function pickFish(fishingLevel: number): FishDef {
  const maxTier = getTierForLevel(fishingLevel);
  const available = FISH_SPECIES.filter(f => f.tier <= maxTier);
  if (available.length === 0) return FISH_SPECIES[0];

  // Weighted selection favoring lower tiers
  const weights = available.map(f => 1 / (f.tier * 0.5 + 0.5));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r <= 0) return available[i];
  }
  return available[available.length - 1];
}

// ── Rope Physics (Verlet) ──────────────────────────────────────

function updateRope(session: FishingSession, dt: number): void {
  const segs = session.ropeSegments;
  if (segs.length === 0) return;

  // Anchor first segment to rod tip
  segs[0].x = session.rodTipX;
  segs[0].y = session.rodTipY;

  // Verlet integration for remaining segments
  for (let i = 1; i < segs.length; i++) {
    const s = segs[i];
    const vx = (s.x - s.ox) * ROPE_DAMPING;
    const vy = (s.y - s.oy) * ROPE_DAMPING;
    s.ox = s.x;
    s.oy = s.y;
    s.x += vx;
    s.y += vy + ROPE_GRAVITY * dt * dt;
  }

  // Anchor last segment to hook
  segs[segs.length - 1].x = session.hookX;
  segs[segs.length - 1].y = session.hookY;

  // Distance constraints
  const segLen = 8;
  for (let iter = 0; iter < ROPE_CONSTRAINT_ITERS; iter++) {
    for (let i = 0; i < segs.length - 1; i++) {
      const a = segs[i];
      const b = segs[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.01) continue;
      const diff = (d - segLen) / d * 0.5;
      if (i > 0) { // don't move anchored first segment
        a.x += dx * diff;
        a.y += dy * diff;
      }
      if (i < segs.length - 2) { // don't move anchored last segment
        b.x -= dx * diff;
        b.y -= dy * diff;
      }
    }
  }
}

// ── Render (canvas 2D) ─────────────────────────────────────────

export function renderFishing(
  ctx: CanvasRenderingContext2D,
  session: FishingSession,
  camera: { x: number; y: number; zoom: number },
): void {
  // Rope
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < session.ropeSegments.length; i++) {
    const s = session.ropeSegments[i];
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.stroke();

  // Bobber
  if (session.state === 'waiting' || session.state === 'bite') {
    const bob = session.state === 'bite' ? Math.sin(Date.now() * 0.02) * 4 : Math.sin(Date.now() * 0.003) * 1;
    ctx.fillStyle = session.state === 'bite' ? '#ef4444' : '#f59e0b';
    ctx.beginPath();
    ctx.arc(session.hookX, session.hookY + bob, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(session.hookX, session.hookY + bob - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cast power bar
  if (session.state === 'casting') {
    const bx = session.rodTipX - 20;
    const by = session.rodTipY - 40;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, 40, 6);
    ctx.fillStyle = session.castPower > 0.8 ? '#ef4444' : '#22c55e';
    ctx.fillRect(bx, by, 40 * session.castPower, 6);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, 40, 6);
  }

  // Bite indicator
  if (session.state === 'bite') {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('! BITE !', session.hookX, session.hookY - 20);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Click!', session.hookX, session.hookY - 8);
  }
}

/**
 * Render the reel minigame UI overlay (screen-space, not world-space).
 * Call separately from the world render.
 */
export function renderReelUI(
  ctx: CanvasRenderingContext2D,
  session: FishingSession,
  screenW: number, screenH: number,
): void {
  if (session.state !== 'reeling') return;

  const barW = 300, barH = 24;
  const bx = (screenW - barW) / 2;
  const by = screenH - 100;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(bx - 4, by - 4, barW + 8, barH + 8);

  // Slider track
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(bx, by, barW, barH);

  // Catch zone
  const czLeft = (session.reelCatchZone - session.reelCatchSize) * barW;
  const czRight = (session.reelCatchZone + session.reelCatchSize) * barW;
  ctx.fillStyle = 'rgba(34,197,94,0.4)';
  ctx.fillRect(bx + czLeft, by, czRight - czLeft, barH);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + czLeft, by, czRight - czLeft, barH);

  // Fish position marker
  const fishX = bx + session.reelTarget * barW;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(fishX, by + barH / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🐟', fishX, by + barH / 2 + 3);

  // Gauge fill
  const gaugeH = 8;
  const gy = by + barH + 6;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, gy, barW, gaugeH);
  const gaugePct = Math.max(0, Math.min(1, session.reelGauge));
  ctx.fillStyle = gaugePct > 0.7 ? '#22c55e' : gaugePct > 0.3 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(bx, gy, barW * gaugePct, gaugeH);

  // Tension bar
  const ty = by - 14;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, ty, barW, 6);
  const tensPct = Math.max(0, Math.min(1, session.tension));
  ctx.fillStyle = tensPct > 0.7 ? '#ef4444' : tensPct > 0.4 ? '#f59e0b' : '#3b82f6';
  ctx.fillRect(bx, ty, barW * tensPct, 6);

  // Labels
  ctx.fillStyle = '#aaa';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Tension`, bx, ty - 4);
  ctx.fillText(`Catch: ${Math.floor(gaugePct * 100)}%`, bx, gy + gaugeH + 12);

  // Fish name
  if (session.hookedFish) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(session.hookedFish.name, screenW / 2, by - 24);
  }

  // Controls hint
  ctx.fillStyle = '#666';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LMB: Reel | Space: Boost | S: Let Out', screenW / 2, gy + gaugeH + 26);
}

/** Reset session back to idle */
export function resetFishing(session: FishingSession): void {
  session.state = 'idle';
  session.castPower = 0;
  session.reelGauge = 0;
  session.hookedFish = null;
  session.caughtFish = null;
  session.tension = 0;
  session.resilience = 1;
}
