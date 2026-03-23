/**
 * AI Hero Missions — allows AI heroes to autonomously accept and progress quests.
 * Uses the same MISSIONS data as players (missions.ts).
 */

import { MISSIONS, MissionDef, MissionObjective, MissionReward } from './missions';
import { AIHeroInstance } from './ai-hero-brain';
import { ISLAND_ZONES } from './zones';

/** Pick the best available mission for an AI hero */
export function pickMissionForHero(hero: AIHeroInstance): MissionDef | null {
  const candidates = MISSIONS.filter(m => {
    if (m.requiredLevel > hero.level) return false;
    // Prefer missions in patrol zones or current zone
    const heroZones = hero.heroData.patrolZoneIds || [];
    if (!heroZones.includes(m.zoneId) && m.zoneId !== hero.currentZoneId) return false;
    // Don't repeat non-repeatable missions we've already done
    if (!m.repeatable && hero.missionProgress[m.id] === -1) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Score missions: prefer kill/camp missions for combat heroes, collect for harvest-inclined
  const isCombatClass = hero.heroData.heroClass === 'Warrior' || hero.heroData.heroClass === 'Worg';
  const scored = candidates.map(m => {
    let score = 0;
    score += m.reward.xp * 0.01;
    score += m.reward.gold * 0.005;
    for (const obj of m.objectives) {
      if (obj.type === 'kill' || obj.type === 'boss') score += isCombatClass ? 10 : 5;
      if (obj.type === 'collect') score += isCombatClass ? 3 : 8;
      if (obj.type === 'explore') score += 5;
      if (obj.type === 'dungeon') score += 7;
    }
    // Prefer missions near current zone
    if (m.zoneId === hero.currentZoneId) score += 5;
    return { mission: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.mission ?? null;
}

/** Accept a mission for an AI hero */
export function acceptMissionForHero(hero: AIHeroInstance, mission: MissionDef): void {
  hero.activeMissionId = mission.id;
  hero.missionProgress = {};
  for (const obj of mission.objectives) {
    hero.missionProgress[obj.target] = 0;
  }
}

/** Report a kill/collect/explore event to the AI hero's active mission */
export function reportMissionEvent(
  hero: AIHeroInstance,
  eventType: 'kill' | 'collect' | 'explore' | 'boss' | 'dungeon',
  target: string,
): boolean {
  if (!hero.activeMissionId) return false;
  const mission = MISSIONS.find(m => m.id === hero.activeMissionId);
  if (!mission) return false;

  for (const obj of mission.objectives) {
    if (obj.type === eventType && obj.target === target) {
      const current = hero.missionProgress[target] ?? 0;
      if (current < obj.required) {
        hero.missionProgress[target] = current + 1;
        return true;
      }
    }
  }
  return false;
}

/** Check if AI hero's active mission is complete */
export function isMissionComplete(hero: AIHeroInstance): boolean {
  if (!hero.activeMissionId) return false;
  const mission = MISSIONS.find(m => m.id === hero.activeMissionId);
  if (!mission) return false;

  return mission.objectives.every(obj => {
    const current = hero.missionProgress[obj.target] ?? 0;
    return current >= obj.required;
  });
}

/** Claim mission rewards for an AI hero */
export function claimMissionReward(hero: AIHeroInstance): MissionReward | null {
  if (!isMissionComplete(hero)) return null;
  const mission = MISSIONS.find(m => m.id === hero.activeMissionId);
  if (!mission) return null;

  // Apply rewards
  hero.xp += mission.reward.xp;
  hero.gold += mission.reward.gold;

  // Level up check
  const xpNeeded = hero.level * 100 + hero.level * hero.level * 20;
  while (hero.xp >= xpNeeded) {
    hero.xp -= xpNeeded;
    hero.level++;
    hero.maxHp = Math.floor(hero.heroData.hp * (1 + hero.level * 0.12));
    hero.maxMp = Math.floor(hero.heroData.mp * (1 + hero.level * 0.08));
    hero.atk = Math.floor(hero.heroData.atk * (1 + hero.level * 0.1));
    hero.def = Math.floor(hero.heroData.def * (1 + hero.level * 0.08));
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
  }

  // Mark as done
  hero.missionProgress[mission.id] = -1; // -1 = claimed
  const reward = mission.reward;

  // Chain quest
  if (mission.chain) {
    const next = MISSIONS.find(m => m.id === mission.chain);
    if (next) {
      acceptMissionForHero(hero, next);
      return reward;
    }
  }

  hero.activeMissionId = null;
  return reward;
}

/** Full mission tick for an AI hero — call from brain take_mission state */
export function tickHeroMission(hero: AIHeroInstance): { shouldTravel: boolean; targetZoneId: number } | null {
  // If no mission, pick one
  if (!hero.activeMissionId) {
    const mission = pickMissionForHero(hero);
    if (mission) {
      acceptMissionForHero(hero, mission);
      return { shouldTravel: true, targetZoneId: mission.zoneId };
    }
    return null;
  }

  // Check completion
  if (isMissionComplete(hero)) {
    claimMissionReward(hero);
    return null;
  }

  // Need to travel to mission zone
  const mission = MISSIONS.find(m => m.id === hero.activeMissionId);
  if (mission && mission.zoneId !== hero.currentZoneId) {
    return { shouldTravel: true, targetZoneId: mission.zoneId };
  }

  return null;
}
