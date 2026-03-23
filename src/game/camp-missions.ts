/**
 * Camp Missions — Repeatable "Destroy Camp" missions.
 * NPCs give direction/distance hints to spawner camps.
 * Max 2 active missions, 5-minute cooldown between completions.
 */

import type { RuinCamp } from './ruin-camps';

// ── Types ──────────────────────────────────────────────────────

export interface CampMission {
  id: string;
  title: string;
  description: string;
  giverNpc: string;
  targetCampId: string;
  direction: string;
  distance: string;
  mapPin: { x: number; y: number };
  reward: { gold: number; xp: number; materials: { id: string; qty: number }[] };
  status: 'active' | 'completed' | 'expired';
  acceptedAt: number;
  expiresAt: number;
}

export interface CampMissionState {
  active: CampMission[];
  completedCount: number;
  lastCompletedAt: number;
  cooldownSec: number;
}

// ── Constants ──────────────────────────────────────────────────

const MAX_ACTIVE = 2;
const COOLDOWN_SEC = 300; // 5 minutes
const MISSION_EXPIRE_SEC = 1800; // 30 minutes
let nextMissionId = 1;

// ── Direction & Distance Helpers ───────────────────────────────

function getDirectionLabel(fromX: number, fromY: number, toX: number, toY: number): string {
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  if (angle >= -22.5 && angle < 22.5) return 'east';
  if (angle >= 22.5 && angle < 67.5) return 'southeast';
  if (angle >= 67.5 && angle < 112.5) return 'south';
  if (angle >= 112.5 && angle < 157.5) return 'southwest';
  if (angle >= 157.5 || angle < -157.5) return 'west';
  if (angle >= -157.5 && angle < -112.5) return 'northwest';
  if (angle >= -112.5 && angle < -67.5) return 'north';
  return 'northeast';
}

function getDistanceLabel(dist: number): string {
  if (dist < 1000) return 'nearby';
  if (dist < 3000) return 'a moderate distance';
  if (dist < 6000) return 'far';
  return 'very far';
}

// ── State Management ───────────────────────────────────────────

export function createCampMissionState(): CampMissionState {
  return { active: [], completedCount: 0, lastCompletedAt: 0, cooldownSec: COOLDOWN_SEC };
}

/** Check if player can accept a new mission. */
export function canAcceptMission(state: CampMissionState, gameTime: number): boolean {
  if (state.active.length >= MAX_ACTIVE) return false;
  if (gameTime - state.lastCompletedAt < state.cooldownSec) return false;
  return true;
}

// ── Mission Generation ─────────────────────────────────────────

const ENEMY_LABELS: Record<string, string> = {
  'Slime': 'slime',
  'Spider': 'spider',
  'Skeleton': 'skeleton',
  'Orc Grunt': 'orc',
  'Dark Mage': 'dark mage',
  'Golem': 'golem',
};

/**
 * Generate a destroy-camp mission targeting the given camp.
 */
export function generateCampMission(
  camp: RuinCamp,
  giverNpc: string,
  playerX: number, playerY: number,
  gameTime: number,
): CampMission {
  const dx = camp.worldX - playerX;
  const dy = camp.worldY - playerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const direction = getDirectionLabel(playerX, playerY, camp.worldX, camp.worldY);
  const distance = getDistanceLabel(dist);

  const enemyLabel = camp.spawner
    ? (ENEMY_LABELS[camp.spawner.enemyTypes[0]] || 'enemy')
    : 'enemy';

  // Map pin with slight offset for exploration feel
  const pinX = camp.worldX + (Math.random() - 0.5) * 200;
  const pinY = camp.worldY + (Math.random() - 0.5) * 200;

  const tier = camp.spawner?.tier || 1;
  const goldReward = 100 + tier * 50;
  const xpReward = 150 + tier * 80;

  return {
    id: `MISS-${nextMissionId++}`,
    title: `Destroy the ${enemyLabel.charAt(0).toUpperCase() + enemyLabel.slice(1)} Camp`,
    description: `A camp of ${enemyLabel}s has been spotted to the ${direction}, ${distance} from here. Destroy the heart of their camp to stop the spawning.`,
    giverNpc,
    targetCampId: camp.id,
    direction,
    distance,
    mapPin: { x: pinX, y: pinY },
    reward: {
      gold: goldReward,
      xp: xpReward,
      materials: [{ id: `tier_${tier}_essence`, qty: 2 + tier }],
    },
    status: 'active',
    acceptedAt: gameTime,
    expiresAt: gameTime + MISSION_EXPIRE_SEC,
  };
}

// ── Mission Flow ───────────────────────────────────────────────

/** Accept a mission. Returns false if can't accept. */
export function acceptMission(
  missionState: CampMissionState,
  mission: CampMission,
  gameTime: number,
): boolean {
  if (!canAcceptMission(missionState, gameTime)) return false;
  missionState.active.push(mission);
  return true;
}

/** Check if a mission's target camp has been destroyed. */
export function checkMissionComplete(
  missionState: CampMissionState,
  camps: RuinCamp[],
  gameTime: number,
): CampMission[] {
  const completed: CampMission[] = [];

  for (const mission of missionState.active) {
    if (mission.status !== 'active') continue;

    // Expired?
    if (gameTime > mission.expiresAt) {
      mission.status = 'expired';
      continue;
    }

    // Camp destroyed?
    const camp = camps.find(c => c.id === mission.targetCampId);
    if (camp && camp.destroyed) {
      mission.status = 'completed';
      missionState.completedCount++;
      missionState.lastCompletedAt = gameTime;
      completed.push(mission);
    }
  }

  // Remove completed/expired from active list
  missionState.active = missionState.active.filter(m => m.status === 'active');

  return completed;
}

// ── NPC Dialogue Templates ─────────────────────────────────────

export function getMissionOfferDialogue(mission: CampMission): string {
  return `Warriors! A ruin to the ${mission.direction}, ${mission.distance} from here, has become a ${mission.title.replace('Destroy the ', '').toLowerCase()}. Destroy the heart of their camp to stop the spawning. Reward: ${mission.reward.gold}g + ${mission.reward.xp}xp.`;
}

export function getMissionCompleteDialogue(mission: CampMission): string {
  return `Well done! The ${mission.title.replace('Destroy the ', '').toLowerCase()} has been cleared. Here is your reward.`;
}
