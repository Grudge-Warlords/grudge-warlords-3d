/**
 * Audio Engine — Game sound system built on howler.js
 * Manages SFX, music, ambient loops, and combat audio with
 * volume control, sprite sheets, and positional audio support.
 *
 * Categories: combat, ui, ambient, music, voice
 * All sounds loaded lazily on first play.
 */

import { Howl, Howler } from 'howler';

// ── Types ──────────────────────────────────────────────────────

export type SoundCategory = 'combat' | 'ui' | 'ambient' | 'music' | 'voice';

export interface SoundDef {
  id: string;
  src: string[];          // URLs in priority order (webm first, mp3 fallback)
  category: SoundCategory;
  volume?: number;        // 0-1, default 1
  loop?: boolean;
  sprite?: Record<string, [number, number]>; // sprite name → [start_ms, duration_ms]
  pool?: number;          // max simultaneous instances (default 5)
  rate?: number;          // playback rate (default 1)
}

interface ActiveSound {
  howl: Howl;
  def: SoundDef;
}

// ── Volume Settings ────────────────────────────────────────────

export interface AudioSettings {
  masterVolume: number;   // 0-1
  sfxVolume: number;      // 0-1
  musicVolume: number;    // 0-1
  ambientVolume: number;  // 0-1
  voiceVolume: number;    // 0-1
  muted: boolean;
}

const SETTINGS_KEY = 'grudge_audio_settings';

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { masterVolume: 0.7, sfxVolume: 0.8, musicVolume: 0.5, ambientVolume: 0.6, voiceVolume: 0.8, muted: false };
}

function saveSettings(s: AudioSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
}

// ── Sound Registry ─────────────────────────────────────────────
// Define all game sounds here. Sources can be local or ObjectStore CDN.

const SFX_BASE = '/assets/audio/sfx';
const MUSIC_BASE = '/assets/audio/music';
const OS = 'https://molochdagod.github.io/ObjectStore';

export const SOUND_REGISTRY: SoundDef[] = [
  // ── Combat SFX ──
  { id: 'sword_hit',      src: [`${SFX_BASE}/sword_hit.webm`, `${SFX_BASE}/sword_hit.mp3`],      category: 'combat', volume: 0.7 },
  { id: 'sword_swing',    src: [`${SFX_BASE}/sword_swing.webm`, `${SFX_BASE}/sword_swing.mp3`],  category: 'combat', volume: 0.5 },
  { id: 'arrow_fire',     src: [`${SFX_BASE}/arrow_fire.webm`, `${SFX_BASE}/arrow_fire.mp3`],    category: 'combat', volume: 0.6 },
  { id: 'arrow_hit',      src: [`${SFX_BASE}/arrow_hit.webm`, `${SFX_BASE}/arrow_hit.mp3`],      category: 'combat', volume: 0.6 },
  { id: 'spell_cast',     src: [`${SFX_BASE}/spell_cast.webm`, `${SFX_BASE}/spell_cast.mp3`],    category: 'combat', volume: 0.6 },
  { id: 'spell_impact',   src: [`${SFX_BASE}/spell_impact.webm`, `${SFX_BASE}/spell_impact.mp3`],category: 'combat', volume: 0.7 },
  { id: 'fireball',       src: [`${SFX_BASE}/fireball.webm`, `${SFX_BASE}/fireball.mp3`],        category: 'combat', volume: 0.7 },
  { id: 'ice_shatter',    src: [`${SFX_BASE}/ice_shatter.webm`, `${SFX_BASE}/ice_shatter.mp3`],  category: 'combat', volume: 0.6 },
  { id: 'thunder',        src: [`${SFX_BASE}/thunder.webm`, `${SFX_BASE}/thunder.mp3`],          category: 'combat', volume: 0.8 },
  { id: 'critical_hit',   src: [`${SFX_BASE}/critical.webm`, `${SFX_BASE}/critical.mp3`],        category: 'combat', volume: 0.8 },
  { id: 'block',          src: [`${SFX_BASE}/block.webm`, `${SFX_BASE}/block.mp3`],              category: 'combat', volume: 0.6 },
  { id: 'dodge',          src: [`${SFX_BASE}/dodge.webm`, `${SFX_BASE}/dodge.mp3`],              category: 'combat', volume: 0.5 },
  { id: 'death',          src: [`${SFX_BASE}/death.webm`, `${SFX_BASE}/death.mp3`],              category: 'combat', volume: 0.7 },
  { id: 'level_up',       src: [`${SFX_BASE}/level_up.webm`, `${SFX_BASE}/level_up.mp3`],        category: 'combat', volume: 0.9 },
  { id: 'combo_hit',      src: [`${SFX_BASE}/combo.webm`, `${SFX_BASE}/combo.mp3`],              category: 'combat', volume: 0.7 },
  { id: 'heal',           src: [`${SFX_BASE}/heal.webm`, `${SFX_BASE}/heal.mp3`],                category: 'combat', volume: 0.6 },

  // ── UI SFX ──
  { id: 'button_click',   src: [`${SFX_BASE}/click.webm`, `${SFX_BASE}/click.mp3`],              category: 'ui', volume: 0.4 },
  { id: 'menu_open',      src: [`${SFX_BASE}/menu_open.webm`, `${SFX_BASE}/menu_open.mp3`],      category: 'ui', volume: 0.3 },
  { id: 'menu_close',     src: [`${SFX_BASE}/menu_close.webm`, `${SFX_BASE}/menu_close.mp3`],    category: 'ui', volume: 0.3 },
  { id: 'equip',          src: [`${SFX_BASE}/equip.webm`, `${SFX_BASE}/equip.mp3`],              category: 'ui', volume: 0.5 },
  { id: 'quest_complete',  src: [`${SFX_BASE}/quest.webm`, `${SFX_BASE}/quest.mp3`],             category: 'ui', volume: 0.7 },
  { id: 'gold_pickup',    src: [`${SFX_BASE}/gold.webm`, `${SFX_BASE}/gold.mp3`],                category: 'ui', volume: 0.4 },
  { id: 'item_pickup',    src: [`${SFX_BASE}/pickup.webm`, `${SFX_BASE}/pickup.mp3`],            category: 'ui', volume: 0.5 },
  { id: 'error',          src: [`${SFX_BASE}/error.webm`, `${SFX_BASE}/error.mp3`],              category: 'ui', volume: 0.4 },

  // ── Ambient ──
  { id: 'forest_ambient',  src: [`${SFX_BASE}/forest.webm`, `${SFX_BASE}/forest.mp3`],           category: 'ambient', volume: 0.3, loop: true },
  { id: 'swamp_ambient',   src: [`${SFX_BASE}/swamp.webm`, `${SFX_BASE}/swamp.mp3`],             category: 'ambient', volume: 0.3, loop: true },
  { id: 'mountain_ambient',src: [`${SFX_BASE}/mountain.webm`, `${SFX_BASE}/mountain.mp3`],       category: 'ambient', volume: 0.3, loop: true },
  { id: 'town_ambient',    src: [`${SFX_BASE}/town.webm`, `${SFX_BASE}/town.mp3`],               category: 'ambient', volume: 0.3, loop: true },
  { id: 'dungeon_ambient', src: [`${SFX_BASE}/dungeon.webm`, `${SFX_BASE}/dungeon.mp3`],         category: 'ambient', volume: 0.3, loop: true },
  { id: 'rain',            src: [`${SFX_BASE}/rain.webm`, `${SFX_BASE}/rain.mp3`],               category: 'ambient', volume: 0.4, loop: true },
  { id: 'wind',            src: [`${SFX_BASE}/wind.webm`, `${SFX_BASE}/wind.mp3`],               category: 'ambient', volume: 0.3, loop: true },

  // ── Music ──
  { id: 'main_theme',      src: [`${MUSIC_BASE}/main_theme.webm`, `${MUSIC_BASE}/main_theme.mp3`],     category: 'music', volume: 0.5, loop: true },
  { id: 'combat_theme',    src: [`${MUSIC_BASE}/combat.webm`, `${MUSIC_BASE}/combat.mp3`],             category: 'music', volume: 0.4, loop: true },
  { id: 'boss_theme',      src: [`${MUSIC_BASE}/boss.webm`, `${MUSIC_BASE}/boss.mp3`],                 category: 'music', volume: 0.5, loop: true },
  { id: 'town_theme',      src: [`${MUSIC_BASE}/town.webm`, `${MUSIC_BASE}/town.mp3`],                 category: 'music', volume: 0.4, loop: true },
  { id: 'victory',         src: [`${MUSIC_BASE}/victory.webm`, `${MUSIC_BASE}/victory.mp3`],           category: 'music', volume: 0.6 },
  { id: 'defeat',          src: [`${MUSIC_BASE}/defeat.webm`, `${MUSIC_BASE}/defeat.mp3`],             category: 'music', volume: 0.5 },
];

// ── Audio Engine ───────────────────────────────────────────────

export class AudioEngine {
  private sounds = new Map<string, ActiveSound>();
  private settings: AudioSettings;
  private currentMusic: string | null = null;
  private currentAmbient: string | null = null;

  constructor() {
    this.settings = loadSettings();
    Howler.volume(this.settings.masterVolume);
    if (this.settings.muted) Howler.mute(true);
  }

  /** Get or create a Howl for a sound ID */
  private getSound(id: string): ActiveSound | null {
    if (this.sounds.has(id)) return this.sounds.get(id)!;

    const def = SOUND_REGISTRY.find(s => s.id === id);
    if (!def) return null;

    const catVolume = this.getCategoryVolume(def.category);
    const howl = new Howl({
      src: def.src,
      volume: (def.volume ?? 1) * catVolume,
      loop: def.loop ?? false,
      pool: def.pool ?? 5,
      rate: def.rate ?? 1,
      sprite: def.sprite,
      preload: false, // lazy load
    });

    const active = { howl, def };
    this.sounds.set(id, active);
    return active;
  }

  private getCategoryVolume(cat: SoundCategory): number {
    switch (cat) {
      case 'combat': return this.settings.sfxVolume;
      case 'ui': return this.settings.sfxVolume;
      case 'ambient': return this.settings.ambientVolume;
      case 'music': return this.settings.musicVolume;
      case 'voice': return this.settings.voiceVolume;
    }
  }

  /** Play a sound by ID. Returns the howl instance ID for control. */
  play(id: string, sprite?: string): number | null {
    if (this.settings.muted) return null;
    const sound = this.getSound(id);
    if (!sound) return null;
    return sound.howl.play(sprite);
  }

  /** Play a combat SFX with slight pitch variation for variety */
  playCombat(id: string): number | null {
    if (this.settings.muted) return null;
    const sound = this.getSound(id);
    if (!sound) return null;
    const instanceId = sound.howl.play();
    // Slight random pitch variation for combat sounds
    sound.howl.rate(0.9 + Math.random() * 0.2, instanceId);
    return instanceId;
  }

  /** Stop a specific sound */
  stop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) sound.howl.stop();
  }

  /** Fade a sound's volume */
  fade(id: string, from: number, to: number, duration: number): void {
    const sound = this.sounds.get(id);
    if (sound) sound.howl.fade(from, to, duration);
  }

  /** Play music (stops previous music with crossfade) */
  playMusic(id: string, fadeDuration: number = 1000): void {
    if (this.currentMusic === id) return;

    // Fade out current music
    if (this.currentMusic) {
      const old = this.sounds.get(this.currentMusic);
      if (old) {
        old.howl.fade(old.howl.volume(), 0, fadeDuration);
        setTimeout(() => old.howl.stop(), fadeDuration);
      }
    }

    this.currentMusic = id;
    const sound = this.getSound(id);
    if (!sound) return;
    sound.howl.volume(0);
    sound.howl.play();
    sound.howl.fade(0, (sound.def.volume ?? 0.5) * this.settings.musicVolume, fadeDuration);
  }

  /** Stop current music */
  stopMusic(fadeDuration: number = 1000): void {
    if (!this.currentMusic) return;
    const sound = this.sounds.get(this.currentMusic);
    if (sound) {
      sound.howl.fade(sound.howl.volume(), 0, fadeDuration);
      setTimeout(() => sound.howl.stop(), fadeDuration);
    }
    this.currentMusic = null;
  }

  /** Play ambient loop (stops previous) */
  playAmbient(id: string, fadeDuration: number = 2000): void {
    if (this.currentAmbient === id) return;

    if (this.currentAmbient) {
      const old = this.sounds.get(this.currentAmbient);
      if (old) {
        old.howl.fade(old.howl.volume(), 0, fadeDuration);
        setTimeout(() => old.howl.stop(), fadeDuration);
      }
    }

    this.currentAmbient = id;
    const sound = this.getSound(id);
    if (!sound) return;
    sound.howl.volume(0);
    sound.howl.play();
    sound.howl.fade(0, (sound.def.volume ?? 0.3) * this.settings.ambientVolume, fadeDuration);
  }

  /** Stop ambient */
  stopAmbient(fadeDuration: number = 2000): void {
    if (!this.currentAmbient) return;
    const sound = this.sounds.get(this.currentAmbient);
    if (sound) {
      sound.howl.fade(sound.howl.volume(), 0, fadeDuration);
      setTimeout(() => sound.howl.stop(), fadeDuration);
    }
    this.currentAmbient = null;
  }

  // ── Settings ─────────────────────────────────────────────────

  getSettings(): AudioSettings { return { ...this.settings }; }

  setMasterVolume(v: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, v));
    Howler.volume(this.settings.masterVolume);
    saveSettings(this.settings);
  }

  setSfxVolume(v: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, v));
    this.updateCategoryVolumes('combat');
    this.updateCategoryVolumes('ui');
    saveSettings(this.settings);
  }

  setMusicVolume(v: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, v));
    this.updateCategoryVolumes('music');
    saveSettings(this.settings);
  }

  setAmbientVolume(v: number): void {
    this.settings.ambientVolume = Math.max(0, Math.min(1, v));
    this.updateCategoryVolumes('ambient');
    saveSettings(this.settings);
  }

  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;
    Howler.mute(this.settings.muted);
    saveSettings(this.settings);
    return this.settings.muted;
  }

  private updateCategoryVolumes(cat: SoundCategory): void {
    const catVol = this.getCategoryVolume(cat);
    for (const active of Array.from(this.sounds.values())) {
      if (active.def.category === cat) {
        active.howl.volume((active.def.volume ?? 1) * catVol);
      }
    }
  }

  /** Unload all sounds */
  dispose(): void {
    Howler.unload();
    this.sounds.clear();
    this.currentMusic = null;
    this.currentAmbient = null;
  }
}

// ── Singleton ──────────────────────────────────────────────────

let _engine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!_engine) _engine = new AudioEngine();
  return _engine;
}

// ── Convenience helpers for game code ──────────────────────────

export function playSFX(id: string): void { getAudioEngine().play(id); }
export function playCombatSFX(id: string): void { getAudioEngine().playCombat(id); }
export function playMusic(id: string): void { getAudioEngine().playMusic(id); }
export function playAmbient(id: string): void { getAudioEngine().playAmbient(id); }
export function stopMusic(): void { getAudioEngine().stopMusic(); }
export function stopAmbient(): void { getAudioEngine().stopAmbient(); }
