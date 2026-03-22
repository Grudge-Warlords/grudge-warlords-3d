/**
 * Player Interaction System
 * Manages proximity detection of other players (remote + AI heroes),
 * interaction menu state, and social action dispatch.
 *
 * Used by open-world.ts handleOWInteract() and rendered by open-world.tsx.
 */

import { getMultiplayerClient, type RemotePlayer } from './multiplayer';

// ── Interaction Menu State ─────────────────────────────────────

export type InteractOption = 'trade' | 'party_invite' | 'guild_invite' | 'duel' | 'inspect';

export interface InteractTarget {
  sessionId: string;
  name: string;
  race: string;
  heroClass: string;
  level: number;
  x: number;
  y: number;
  isAI: boolean;
}

export interface InteractMenuState {
  open: boolean;
  target: InteractTarget | null;
  options: InteractOption[];
}

export function createInteractMenuState(): InteractMenuState {
  return { open: false, target: null, options: [] };
}

// ── Proximity Detection ────────────────────────────────────────

const INTERACT_RANGE = 80;

/**
 * Find the nearest interactable player within range.
 * Checks remote multiplayer players and AI heroes.
 */
export function getNearbyPlayer(
  px: number, py: number,
  aiHeroes: { id: number; name: string; race: string; heroClass: string; level: number; x: number; y: number; dead: boolean }[],
): InteractTarget | null {
  let nearest: InteractTarget | null = null;
  let nearestDist = INTERACT_RANGE;

  // Check remote multiplayer players
  const mp = getMultiplayerClient();
  if (mp.isConnected()) {
    for (const rp of mp.getRemotePlayers()) {
      const dx = px - rp.x, dy = py - rp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = {
          sessionId: rp.sessionId,
          name: rp.name,
          race: rp.race,
          heroClass: rp.heroClass,
          level: rp.level,
          x: rp.x, y: rp.y,
          isAI: false,
        };
      }
    }
  }

  // Check AI heroes
  for (const ai of aiHeroes) {
    if (ai.dead) continue;
    const dx = px - ai.x, dy = py - ai.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = {
        sessionId: `ai-${ai.id}`,
        name: ai.name,
        race: ai.race,
        heroClass: ai.heroClass,
        level: ai.level,
        x: ai.x, y: ai.y,
        isAI: true,
      };
    }
  }

  return nearest;
}

/**
 * Build available interaction options based on context.
 */
export function getInteractOptions(target: InteractTarget, partyState: any, guildState: any): InteractOption[] {
  const options: InteractOption[] = ['inspect'];

  if (!target.isAI) {
    // Real player interactions
    options.push('trade');
    options.push('duel');
    if (!partyState || partyState.members?.length < 5) {
      options.push('party_invite');
    }
    if (!guildState || guildState.memberCount < 50) {
      options.push('guild_invite');
    }
  } else {
    // AI hero interactions (limited)
    options.push('party_invite'); // Can invite AI to party
    options.push('duel');         // Can challenge AI
  }

  return options;
}

/**
 * Open the interaction menu for a target player.
 */
export function openInteractMenu(
  menu: InteractMenuState,
  target: InteractTarget,
  partyState: any,
  guildState: any,
): void {
  menu.open = true;
  menu.target = target;
  menu.options = getInteractOptions(target, partyState, guildState);
}

/**
 * Close the interaction menu.
 */
export function closeInteractMenu(menu: InteractMenuState): void {
  menu.open = false;
  menu.target = null;
  menu.options = [];
}

// ── Social Actions ─────────────────────────────────────────────

export function sendPartyInvite(targetSessionId: string): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('party_invite', { targetSessionId });
}

export function sendGuildInvite(targetSessionId: string): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('guild_invite', { targetSessionId });
}

export function sendTradeRequest(targetSessionId: string): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('trade_request', { targetSessionId });
}

export function sendDuelRequest(targetSessionId: string): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('duel_request', { targetSessionId });
}

export function sendInspectRequest(targetSessionId: string): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('inspect_request', { targetSessionId });
}

export function sendPartyAccept(partyId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('party_accept', { partyId });
}

export function sendPartyLeave(): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('party_leave', {});
}

export function sendGuildCreate(name: string, tag: string): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('guild_create', { name, tag });
}

export function sendGuildAccept(guildId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('guild_accept', { guildId });
}

export function sendGuildLeave(): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('guild_leave', {});
}

export function sendTradeAcceptRequest(tradeId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('trade_accept_request', { tradeId });
}

export function sendTradeOffer(tradeId: number, items: any[], gold: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('trade_offer', { tradeId, items, gold });
}

export function sendTradeAccept(tradeId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('trade_accept', { tradeId });
}

export function sendTradeCancel(tradeId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('trade_cancel', { tradeId });
}

export function sendDuelAccept(duelId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('duel_accept', { duelId });
}

export function sendDuelDecline(duelId: number): void {
  const mp = getMultiplayerClient();
  if (!mp.isConnected()) return;
  (mp as any).room?.send('duel_decline', { duelId });
}

// ── Option Labels ──────────────────────────────────────────────

export const INTERACT_OPTION_META: Record<InteractOption, { label: string; icon: string; color: string }> = {
  trade:        { label: 'Trade',        icon: '💰', color: '#fbbf24' },
  party_invite: { label: 'Invite Party', icon: '👥', color: '#60a5fa' },
  guild_invite: { label: 'Invite Guild', icon: '⚔',  color: '#a78bfa' },
  duel:         { label: 'Duel',         icon: '🗡️', color: '#ef4444' },
  inspect:      { label: 'Inspect',      icon: '🔍', color: '#94a3b8' },
};
