/**
 * Multiplayer Client — Colyseus integration for real-time multiplayer
 * Manages server connection, room joining/leaving, state synchronization,
 * player movement sync, combat events, and chat messaging.
 *
 * Uses colyseus.js SDK connecting to a Colyseus game server.
 * Server can be self-hosted on Grudge backend or Colyseus Cloud.
 */

import { Client, Room } from 'colyseus.js';

// ── Config ─────────────────────────────────────────────────────

const STORAGE_KEY = 'grudge_multiplayer_settings';

export interface MultiplayerConfig {
  /** Server WebSocket URL (ws:// or wss://) */
  serverUrl: string;
  /** Player display name */
  playerName: string;
  /** Enable multiplayer */
  enabled: boolean;
}

/** Resolve server URL: env var → saved setting → localhost fallback */
const DEFAULT_SERVER_URL =
  (import.meta as any).env?.VITE_MULTIPLAYER_URL || 'ws://localhost:2567';

function loadConfig(): MultiplayerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    serverUrl: DEFAULT_SERVER_URL,
    playerName: 'Adventurer',
    enabled: false,
  };
}

export function saveMultiplayerConfig(config: MultiplayerConfig): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}
}

// ── Types ──────────────────────────────────────────────────────

export interface RemotePlayer {
  sessionId: string;
  name: string;
  race: string;
  heroClass: string;
  level: number;
  x: number;
  y: number;
  facing: number;
  animState: string;
  animTimer: number;
  hp: number;
  maxHp: number;
}

export interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'combat' | 'trade';
}

export type MultiplayerEvent =
  | { type: 'connected' }
  | { type: 'disconnected'; reason: string }
  | { type: 'player_joined'; player: RemotePlayer }
  | { type: 'player_left'; sessionId: string }
  | { type: 'player_moved'; sessionId: string; x: number; y: number; facing: number; animState: string }
  | { type: 'player_attacked'; sessionId: string; targetId: number; damage: number }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'zone_changed'; sessionId: string; zoneId: number }
  | { type: 'error'; message: string };

// ── Multiplayer Client ─────────────────────────────────────────

export class MultiplayerClient {
  private client: Client | null = null;
  private room: Room | null = null;
  private config: MultiplayerConfig;
  private eventListeners: ((event: MultiplayerEvent) => void)[] = [];
  private remotePlayers = new Map<string, RemotePlayer>();
  private connected = false;
  private reconnecting = false;
  private chatHistory: ChatMessage[] = [];
  private positionSendTimer = 0;
  private lastSentPos = { x: 0, y: 0, facing: 0 };

  constructor() {
    this.config = loadConfig();
  }

  /** Register an event listener */
  on(listener: (event: MultiplayerEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /** Remove an event listener */
  off(listener: (event: MultiplayerEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emit(event: MultiplayerEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  /** Get current config */
  getConfig(): MultiplayerConfig { return { ...this.config }; }

  /** Update config */
  setConfig(config: Partial<MultiplayerConfig>): void {
    this.config = { ...this.config, ...config };
    saveMultiplayerConfig(this.config);
  }

  /** Is multiplayer connected? */
  isConnected(): boolean { return this.connected; }

  /** Get all remote players */
  getRemotePlayers(): RemotePlayer[] { return Array.from(this.remotePlayers.values()); }

  /** Get chat history */
  getChatHistory(): ChatMessage[] { return [...this.chatHistory]; }

  // ── Connection ───────────────────────────────────────────────

  /** Connect to the game server */
  async connect(heroData: { name: string; race: string; heroClass: string; level: number }): Promise<boolean> {
    if (!this.config.enabled) return false;
    if (this.connected) return true;

    try {
      this.client = new Client(this.config.serverUrl);

      // Join or create the open world room
      this.room = await this.client.joinOrCreate('open_world', {
        name: this.config.playerName || heroData.name,
        race: heroData.race,
        heroClass: heroData.heroClass,
        level: heroData.level,
      });

      this.connected = true;
      this.setupRoomListeners();
      this.emit({ type: 'connected' });

      this.chatHistory.push({
        sender: 'System',
        text: `Connected to server. ${this.room.sessionId}`,
        timestamp: Date.now(),
        type: 'system',
      });

      return true;
    } catch (err: any) {
      this.emit({ type: 'error', message: err.message || 'Connection failed' });
      this.connected = false;
      return false;
    }
  }

  /** Disconnect from server */
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.connected = false;
    this.remotePlayers.clear();
    this.emit({ type: 'disconnected', reason: 'manual' });
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    // Player state changes
    this.room.onMessage('player_joined', (data: RemotePlayer) => {
      this.remotePlayers.set(data.sessionId, data);
      this.emit({ type: 'player_joined', player: data });
      this.chatHistory.push({
        sender: 'System',
        text: `${data.name} joined the world`,
        timestamp: Date.now(),
        type: 'system',
      });
    });

    this.room.onMessage('player_left', (data: { sessionId: string }) => {
      const player = this.remotePlayers.get(data.sessionId);
      this.remotePlayers.delete(data.sessionId);
      this.emit({ type: 'player_left', sessionId: data.sessionId });
      if (player) {
        this.chatHistory.push({
          sender: 'System',
          text: `${player.name} left the world`,
          timestamp: Date.now(),
          type: 'system',
        });
      }
    });

    this.room.onMessage('player_move', (data: { sessionId: string; x: number; y: number; facing: number; animState: string }) => {
      const player = this.remotePlayers.get(data.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.facing = data.facing;
        player.animState = data.animState;
      }
      this.emit({ type: 'player_moved', ...data });
    });

    this.room.onMessage('player_attack', (data: { sessionId: string; targetId: number; damage: number }) => {
      this.emit({ type: 'player_attacked', ...data });
    });

    this.room.onMessage('chat', (data: ChatMessage) => {
      this.chatHistory.push(data);
      if (this.chatHistory.length > 100) this.chatHistory.shift();
      this.emit({ type: 'chat_message', message: data });
    });

    this.room.onMessage('zone_change', (data: { sessionId: string; zoneId: number }) => {
      this.emit({ type: 'zone_changed', ...data });
    });

    // Room error/disconnect
    this.room.onError((code, message) => {
      this.emit({ type: 'error', message: `Room error ${code}: ${message}` });
    });

    this.room.onLeave((code) => {
      this.connected = false;
      this.remotePlayers.clear();
      this.emit({ type: 'disconnected', reason: `Room left (code ${code})` });

      // Auto-reconnect on unexpected disconnect
      if (code !== 1000 && !this.reconnecting) {
        this.reconnecting = true;
        setTimeout(() => {
          this.reconnecting = false;
          // Attempt reconnect silently
        }, 3000);
      }
    });
  }

  // ── Send Messages ────────────────────────────────────────────

  /** Send player position (throttled — call every frame, sends at 10Hz) */
  sendPosition(x: number, y: number, facing: number, animState: string, dt: number): void {
    if (!this.room || !this.connected) return;

    this.positionSendTimer += dt;
    if (this.positionSendTimer < 0.1) return; // 10Hz max
    this.positionSendTimer = 0;

    // Only send if position changed significantly
    const dx = x - this.lastSentPos.x;
    const dy = y - this.lastSentPos.y;
    if (dx * dx + dy * dy < 4 && Math.abs(facing - this.lastSentPos.facing) < 0.1) return;

    this.lastSentPos = { x, y, facing };
    this.room.send('move', { x, y, facing, animState });
  }

  /** Send an attack event */
  sendAttack(targetId: number, damage: number): void {
    if (!this.room || !this.connected) return;
    this.room.send('attack', { targetId, damage });
  }

  /** Send a chat message */
  sendChat(text: string): void {
    if (!this.room || !this.connected || !text.trim()) return;
    this.room.send('chat', { text: text.trim() });
  }

  /** Send zone change notification */
  sendZoneChange(zoneId: number): void {
    if (!this.room || !this.connected) return;
    this.room.send('zone_change', { zoneId });
  }

  /** Send ability use */
  sendAbilityUse(abilityIndex: number, targetX: number, targetY: number): void {
    if (!this.room || !this.connected) return;
    this.room.send('ability', { abilityIndex, targetX, targetY });
  }
}

// ── Singleton ──────────────────────────────────────────────────

let _mp: MultiplayerClient | null = null;

export function getMultiplayerClient(): MultiplayerClient {
  if (!_mp) _mp = new MultiplayerClient();
  return _mp;
}

// ── Convenience ────────────────────────────────────────────────

export function isMultiplayerEnabled(): boolean {
  return loadConfig().enabled;
}

export function setMultiplayerEnabled(enabled: boolean): void {
  const config = loadConfig();
  config.enabled = enabled;
  saveMultiplayerConfig(config);
}
