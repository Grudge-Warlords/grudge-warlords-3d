/**
 * Player Progress - ported from GRUDGE_PlayerIslandProgress
 * Tracks reputation, zone discovery, achievements, kill stats.
 * Persisted to localStorage.
 */

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Exploration
  { id: 'EXPLORER_NOVICE', title: 'Novice Explorer', description: 'Discover your first zone', icon: '🗺️' },
  { id: 'EXPLORER_ADEPT', title: 'Adept Explorer', description: 'Discover 5 zones', icon: '🧭' },
  { id: 'EXPLORER_MASTER', title: 'Master Explorer', description: 'Discover all 8 zones', icon: '🌍' },
  // Combat
  { id: 'SLAYER_100', title: 'Monster Slayer', description: 'Defeat 100 monsters', icon: '⚔️' },
  { id: 'SLAYER_1000', title: 'Monster Hunter', description: 'Defeat 1000 monsters', icon: '🗡️' },
  { id: 'SLAYER_5000', title: 'Legendary Warrior', description: 'Defeat 5000 monsters', icon: '🏆' },
  // Bosses
  { id: 'BOSS_SLAYER', title: 'Boss Slayer', description: 'Defeat your first boss', icon: '💀' },
  { id: 'BOSS_MASTER', title: 'Boss Master', description: 'Defeat 10 bosses', icon: '👑' },
  // Progression
  { id: 'LEVEL_10', title: 'Rising Power', description: 'Reach level 10', icon: '⬆️' },
  { id: 'LEVEL_20', title: 'Champion', description: 'Reach level 20', icon: '🌟' },
  { id: 'REP_1000', title: 'Respected Citizen', description: 'Reach 1000 reputation', icon: '🏛️' },
  { id: 'REP_5000', title: 'Honored Hero', description: 'Reach 5000 reputation', icon: '🎖️' },
  // Play time
  { id: 'PLAY_1H', title: 'Dedicated', description: 'Play for 1 hour', icon: '⏰' },
  { id: 'PLAY_10H', title: 'Veteran', description: 'Play for 10 hours', icon: '⌛' },
];

export interface PlayerProgress {
  reputation: number;
  zonesDiscovered: number[];
  monstersSlain: number;
  bossesDefeated: number;
  questsCompleted: number;
  totalPlayTimeSeconds: number;
  unlockedAchievements: string[];
  currentZoneName: string;
  highestLevel: number;
  totalGoldEarned: number;
  totalDeaths: number;
}

const STORAGE_KEY = 'grudge_player_progress';

export function createPlayerProgress(): PlayerProgress {
  return {
    reputation: 0,
    zonesDiscovered: [],
    monstersSlain: 0,
    bossesDefeated: 0,
    questsCompleted: 0,
    totalPlayTimeSeconds: 0,
    unlockedAchievements: [],
    currentZoneName: 'Unknown',
    highestLevel: 1,
    totalGoldEarned: 0,
    totalDeaths: 0,
  };
}

export function savePlayerProgress(p: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

export function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createPlayerProgress();
    const data = JSON.parse(raw) as Partial<PlayerProgress>;
    return { ...createPlayerProgress(), ...data };
  } catch {
    return createPlayerProgress();
  }
}

// --- Reputation ranks (from GRUDGE_PlayerIslandProgress.GetReputationRank) ---

export function getReputationRank(rep: number): string {
  if (rep < 0) return 'Outcast';
  if (rep < 100) return 'Newcomer';
  if (rep < 500) return 'Citizen';
  if (rep < 1000) return 'Trusted';
  if (rep < 2500) return 'Respected';
  if (rep < 5000) return 'Honored';
  if (rep < 7500) return 'Revered';
  return 'Exalted';
}

export function getReputationColor(rep: number): string {
  if (rep < 0) return '#ef4444';
  if (rep < 100) return '#9ca3af';
  if (rep < 500) return '#22c55e';
  if (rep < 1000) return '#3b82f6';
  if (rep < 2500) return '#a855f7';
  if (rep < 5000) return '#f59e0b';
  if (rep < 7500) return '#ff6b35';
  return '#ffd700';
}

// --- Progress events ---

export interface ProgressEvent {
  type: 'zone_discover' | 'achievement' | 'reputation' | 'level_up';
  title: string;
  description: string;
}

/** Called when player enters a new zone. Returns events triggered. */
export function onZoneDiscovered(progress: PlayerProgress, zoneId: number, zoneName: string): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  if (progress.zonesDiscovered.includes(zoneId)) return events;

  progress.zonesDiscovered.push(zoneId);
  progress.currentZoneName = zoneName;

  // Discovery XP bonus
  const bonus = 50 * progress.zonesDiscovered.length;
  events.push({
    type: 'zone_discover',
    title: `Zone Discovered: ${zoneName}`,
    description: `+${bonus} XP bonus`,
  });

  // Reputation gain
  progress.reputation += 25;
  events.push({ type: 'reputation', title: '+25 Reputation', description: `Now: ${getReputationRank(progress.reputation)}` });

  // Check exploration achievements
  events.push(...checkExplorationAchievements(progress));
  return events;
}

export function onMonsterKilled(progress: PlayerProgress, isBoss: boolean): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  progress.monstersSlain++;

  if (isBoss) {
    progress.bossesDefeated++;
    progress.reputation += 50;
    events.push(...checkBossAchievements(progress));
  }

  events.push(...checkCombatAchievements(progress));
  return events;
}

export function onPlayerLevelUp(progress: PlayerProgress, newLevel: number): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  if (newLevel > progress.highestLevel) {
    progress.highestLevel = newLevel;
  }

  if (newLevel >= 10) events.push(...tryUnlock(progress, 'LEVEL_10'));
  if (newLevel >= 20) events.push(...tryUnlock(progress, 'LEVEL_20'));
  return events;
}

export function onPlayerDeath(progress: PlayerProgress): void {
  progress.totalDeaths++;
}

export function updatePlayTime(progress: PlayerProgress, dt: number): ProgressEvent[] {
  progress.totalPlayTimeSeconds += dt;
  const events: ProgressEvent[] = [];
  const hours = progress.totalPlayTimeSeconds / 3600;
  if (hours >= 1) events.push(...tryUnlock(progress, 'PLAY_1H'));
  if (hours >= 10) events.push(...tryUnlock(progress, 'PLAY_10H'));
  if (progress.reputation >= 1000) events.push(...tryUnlock(progress, 'REP_1000'));
  if (progress.reputation >= 5000) events.push(...tryUnlock(progress, 'REP_5000'));
  return events;
}

// --- Achievement helpers ---

function checkExplorationAchievements(progress: PlayerProgress): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  const count = progress.zonesDiscovered.length;
  if (count >= 1) events.push(...tryUnlock(progress, 'EXPLORER_NOVICE'));
  if (count >= 5) events.push(...tryUnlock(progress, 'EXPLORER_ADEPT'));
  if (count >= 8) events.push(...tryUnlock(progress, 'EXPLORER_MASTER'));
  return events;
}

function checkCombatAchievements(progress: PlayerProgress): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  if (progress.monstersSlain >= 100) events.push(...tryUnlock(progress, 'SLAYER_100'));
  if (progress.monstersSlain >= 1000) events.push(...tryUnlock(progress, 'SLAYER_1000'));
  if (progress.monstersSlain >= 5000) events.push(...tryUnlock(progress, 'SLAYER_5000'));
  return events;
}

function checkBossAchievements(progress: PlayerProgress): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  if (progress.bossesDefeated >= 1) events.push(...tryUnlock(progress, 'BOSS_SLAYER'));
  if (progress.bossesDefeated >= 10) events.push(...tryUnlock(progress, 'BOSS_MASTER'));
  return events;
}

function tryUnlock(progress: PlayerProgress, achievementId: string): ProgressEvent[] {
  if (progress.unlockedAchievements.includes(achievementId)) return [];
  const def = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!def) return [];

  progress.unlockedAchievements.push(achievementId);
  progress.reputation += 25;

  return [{
    type: 'achievement',
    title: `Achievement: ${def.title}`,
    description: def.description,
  }];
}

// --- Queries ---

export function getFormattedPlayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function getDiscoveryProgress(progress: PlayerProgress): string {
  return `${progress.zonesDiscovered.length}/8 zones`;
}

export function getAchievementProgress(progress: PlayerProgress): string {
  return `${progress.unlockedAchievements.length}/${ACHIEVEMENTS.length}`;
}
