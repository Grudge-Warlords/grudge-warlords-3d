/**
 * Zone Events System
 * Dynamic world events: invasions, bosses, resource surges, caravans, storms.
 * Integrates with SpawnerManager for event-linked spawners and
 * WorldState for announcements.
 */

import { SpawnerManager, SpawnerDef } from './spawner-system';

// ── Types ──────────────────────────────────────────────────────

export type ZoneEventType =
  | 'invasion'        // enemy faction attacks a safe zone
  | 'world_boss'      // boss spawns with global announcement
  | 'resource_surge'  // bonus resource nodes spawn temporarily
  | 'caravan'         // escort NPC caravan between zones
  | 'treasure_hunt'   // random chest spawns
  | 'storm';          // weather + empowered enemies

export type EventTrigger = 'timed' | 'level_threshold' | 'kill_count' | 'random';

export interface EventReward {
  xp: number;
  gold: number;
  equipTier?: number;  // generates random equipment of this tier
}

export interface ZoneEventDef {
  id: string;
  name: string;
  description: string;
  type: ZoneEventType;
  zoneIds: number[];         // which zones this event affects
  duration: number;          // seconds
  cooldown: number;          // seconds between occurrences
  trigger: EventTrigger;
  triggerValue?: number;     // for level_threshold or kill_count
  rewards: EventReward;
  spawnOverrides?: Partial<SpawnerDef>[]; // extra spawners during event
  announceColor: string;     // color for kill feed
  icon: string;              // emoji for UI
}

export interface ActiveEvent {
  def: ZoneEventDef;
  timeRemaining: number;
  killCount: number;         // kills during this event
  completed: boolean;
  rewardClaimed: boolean;
}

// ── Pre-Built Events ───────────────────────────────────────────

export const ZONE_EVENTS: ZoneEventDef[] = [
  {
    id: 'piglin_invasion',
    name: 'Piglin Invasion',
    description: 'Piglins are attacking Crusade Island! Defend the stronghold!',
    type: 'invasion',
    zoneIds: [8],  // Crusade Island
    duration: 300, // 5 minutes
    cooldown: 600,
    trigger: 'timed',
    rewards: { xp: 500, gold: 300, equipTier: 4 },
    spawnOverrides: [
      { id: 'evt-piglin-1', zoneId: 8, x: 9200, y: 2500, type: 'camp', enemyTypes: [{ type: 'Piglin Grunt', level: 12, count: 5, weight: 3 }, { type: 'Piglin Brute', level: 14, count: 2, weight: 1 }], respawnTime: 20, maxAlive: 7, aggroLink: true, eventId: 'piglin_invasion' },
      { id: 'evt-piglin-2', zoneId: 8, x: 11000, y: 4000, type: 'camp', enemyTypes: [{ type: 'Piglin Grunt', level: 13, count: 4, weight: 2 }, { type: 'Boar Dragon', level: 15, count: 1, weight: 1 }], respawnTime: 30, maxAlive: 5, aggroLink: true, eventId: 'piglin_invasion' },
    ],
    announceColor: '#ff4444',
    icon: '⚔️',
  },
  {
    id: 'sea_monster',
    name: 'Sea Monster Rising',
    description: 'A Sea Serpent has surfaced in Pirate Cove!',
    type: 'world_boss',
    zoneIds: [11], // Pirate Cove
    duration: 240,
    cooldown: 900,
    trigger: 'random',
    rewards: { xp: 800, gold: 500, equipTier: 5 },
    spawnOverrides: [
      { id: 'evt-serpent', zoneId: 11, x: 14000, y: 9000, type: 'boss_encounter', enemyTypes: [{ type: 'Sea Serpent', level: 20, count: 1, weight: 1 }], respawnTime: 999, maxAlive: 1, aggroLink: true, bossPhases: 2, eventId: 'sea_monster' },
    ],
    announceColor: '#0077be',
    icon: '🐉',
  },
  {
    id: 'volcanic_eruption',
    name: 'Volcanic Eruption',
    description: 'The volcano erupts! Fire drakes swarm the rim!',
    type: 'storm',
    zoneIds: [6], // Volcano Rim
    duration: 180,
    cooldown: 720,
    trigger: 'timed',
    rewards: { xp: 400, gold: 250, equipTier: 4 },
    spawnOverrides: [
      { id: 'evt-drake-1', zoneId: 6, x: 1000, y: 6200, type: 'single', enemyTypes: [{ type: 'Fire Drake', level: 17, count: 3, weight: 1 }], respawnTime: 15, maxAlive: 3, aggroLink: false, eventId: 'volcanic_eruption' },
      { id: 'evt-drake-2', zoneId: 6, x: 2200, y: 7000, type: 'single', enemyTypes: [{ type: 'Fire Drake', level: 18, count: 2, weight: 1 }], respawnTime: 20, maxAlive: 2, aggroLink: false, eventId: 'volcanic_eruption' },
    ],
    announceColor: '#ff6b2b',
    icon: '🌋',
  },
  {
    id: 'titan_awakening',
    name: "Titan's Awakening",
    description: 'An ancient titan stirs in the Graveyard! Defeat it before it fully awakens!',
    type: 'world_boss',
    zoneIds: [13], // Graveyard of Titans
    duration: 360,
    cooldown: 1200,
    trigger: 'level_threshold',
    triggerValue: 18,
    rewards: { xp: 1200, gold: 800, equipTier: 6 },
    spawnOverrides: [
      { id: 'evt-titan', zoneId: 13, x: 13750, y: 2250, type: 'boss_encounter', enemyTypes: [{ type: 'Infernal Colossus', level: 25, count: 1, weight: 1 }], respawnTime: 999, maxAlive: 1, aggroLink: true, bossPhases: 3, eventId: 'titan_awakening' },
    ],
    announceColor: '#ff3300',
    icon: '🗿',
  },
  {
    id: 'harvest_moon',
    name: 'Harvest Moon',
    description: 'The Harvest Moon rises! Resource nodes yield double!',
    type: 'resource_surge',
    zoneIds: [1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 15], // all non-safe combat zones
    duration: 180,
    cooldown: 480,
    trigger: 'timed',
    rewards: { xp: 100, gold: 50 },
    announceColor: '#ffd700',
    icon: '🌕',
  },
  {
    id: 'undead_siege',
    name: 'Undead Siege',
    description: 'Skeletons march from the Crypts toward the Forest!',
    type: 'invasion',
    zoneIds: [1], // Forest of Whispers
    duration: 240,
    cooldown: 600,
    trigger: 'kill_count',
    triggerValue: 50,
    rewards: { xp: 350, gold: 200, equipTier: 3 },
    spawnOverrides: [
      { id: 'evt-undead-1', zoneId: 1, x: 2800, y: 3200, type: 'camp', enemyTypes: [{ type: 'Skeleton', level: 6, count: 6, weight: 3 }, { type: 'Dark Mage', level: 7, count: 2, weight: 1 }], respawnTime: 15, maxAlive: 8, aggroLink: true, eventId: 'undead_siege' },
      { id: 'evt-undead-2', zoneId: 1, x: 1900, y: 4000, type: 'camp', enemyTypes: [{ type: 'Skeleton', level: 5, count: 5, weight: 3 }, { type: 'Wraith', level: 8, count: 1, weight: 1 }], respawnTime: 18, maxAlive: 6, aggroLink: true, eventId: 'undead_siege' },
    ],
    announceColor: '#b0b0d0',
    icon: '💀',
  },
];

// ── Zone Event Manager ─────────────────────────────────────────

export class ZoneEventManager {
  private cooldowns: Map<string, number> = new Map();
  private killCounter = 0;
  activeEvents: ActiveEvent[] = [];

  constructor() {
    // Initialize cooldowns so events don't all fire immediately
    for (const evt of ZONE_EVENTS) {
      this.cooldowns.set(evt.id, evt.cooldown * 0.3 + Math.random() * evt.cooldown * 0.7);
    }
  }

  /** Update event timers and trigger logic */
  update(
    dt: number,
    playerLevel: number,
    spawnerManager: SpawnerManager,
  ): EventUpdate[] {
    const updates: EventUpdate[] = [];

    // Update active events
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const active = this.activeEvents[i];
      active.timeRemaining -= dt;

      if (active.timeRemaining <= 0 && !active.completed) {
        active.completed = true;
        spawnerManager.deactivateEvent(active.def.id);
        updates.push({
          type: 'ended',
          event: active.def,
          message: `${active.def.name} has ended!`,
          color: active.def.announceColor,
        });
        // Reset cooldown
        this.cooldowns.set(active.def.id, active.def.cooldown);
        this.activeEvents.splice(i, 1);
      }
    }

    // Check for new event triggers
    for (const def of ZONE_EVENTS) {
      // Skip if already active
      if (this.activeEvents.some(a => a.def.id === def.id)) continue;

      // Check cooldown
      const cd = this.cooldowns.get(def.id) ?? 0;
      if (cd > 0) {
        this.cooldowns.set(def.id, cd - dt);
        continue;
      }

      // Check trigger conditions
      let shouldTrigger = false;

      switch (def.trigger) {
        case 'timed':
          shouldTrigger = true; // cooldown expired = trigger
          break;
        case 'random':
          shouldTrigger = Math.random() < 0.001 * dt; // ~0.1% per second
          break;
        case 'level_threshold':
          shouldTrigger = playerLevel >= (def.triggerValue ?? 1);
          break;
        case 'kill_count':
          shouldTrigger = this.killCounter >= (def.triggerValue ?? 50);
          if (shouldTrigger) this.killCounter = 0;
          break;
      }

      if (shouldTrigger) {
        this.startEvent(def, spawnerManager);
        updates.push({
          type: 'started',
          event: def,
          message: `${def.icon} ${def.name}: ${def.description}`,
          color: def.announceColor,
        });
      }
    }

    return updates;
  }

  /** Start an event */
  private startEvent(def: ZoneEventDef, spawnerManager: SpawnerManager): void {
    this.activeEvents.push({
      def,
      timeRemaining: def.duration,
      killCount: 0,
      completed: false,
      rewardClaimed: false,
    });

    // Activate event-linked spawners
    spawnerManager.activateEvent(def.id);
  }

  /** Notify a kill happened (for kill_count trigger) */
  onKill(): void {
    this.killCounter++;
    for (const active of this.activeEvents) {
      active.killCount++;
    }
  }

  /** Claim rewards for a completed event */
  claimReward(eventId: string): EventReward | null {
    const active = this.activeEvents.find(a => a.def.id === eventId && a.completed && !a.rewardClaimed);
    if (!active) return null;
    active.rewardClaimed = true;
    return active.def.rewards;
  }

  /** Check if resource surge is active (for double harvest) */
  isResourceSurgeActive(): boolean {
    return this.activeEvents.some(a => a.def.type === 'resource_surge' && !a.completed);
  }

  /** Get active event for a specific zone */
  getActiveEventForZone(zoneId: number): ActiveEvent | null {
    return this.activeEvents.find(a => a.def.zoneIds.includes(zoneId) && !a.completed) ?? null;
  }

  /** Get all active events */
  getActiveEvents(): ActiveEvent[] {
    return this.activeEvents.filter(a => !a.completed);
  }
}

export interface EventUpdate {
  type: 'started' | 'ended';
  event: ZoneEventDef;
  message: string;
  color: string;
}

// ── Factory ────────────────────────────────────────────────────

export function createZoneEventManager(): ZoneEventManager {
  return new ZoneEventManager();
}
