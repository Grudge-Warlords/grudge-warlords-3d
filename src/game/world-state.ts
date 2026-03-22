/**
 * World State Manager - ported from GRUDGE_IslandWorldManager
 * Manages day/night cycle, weather, world boss timer.
 * Client-only singleton with localStorage persistence.
 */

export enum WeatherType {
  Clear = 'Clear',
  Cloudy = 'Cloudy',
  Rain = 'Rain',
  Storm = 'Storm',
  Snow = 'Snow',
  Fog = 'Fog',
}

export const WEATHER_INFO: Record<WeatherType, { label: string; icon: string; speedMod: number; ambientMod: number }> = {
  [WeatherType.Clear]:  { label: 'Clear Skies', icon: '☀️', speedMod: 1.0, ambientMod: 1.0 },
  [WeatherType.Cloudy]: { label: 'Cloudy',      icon: '☁️', speedMod: 1.0, ambientMod: 0.85 },
  [WeatherType.Rain]:   { label: 'Raining',     icon: '🌧️', speedMod: 0.9, ambientMod: 0.7 },
  [WeatherType.Storm]:  { label: 'Thunderstorm', icon: '⛈️', speedMod: 0.8, ambientMod: 0.5 },
  [WeatherType.Snow]:   { label: 'Snowing',     icon: '🌨️', speedMod: 0.85, ambientMod: 0.75 },
  [WeatherType.Fog]:    { label: 'Foggy',       icon: '🌫️', speedMod: 0.95, ambientMod: 0.6 },
};

export interface WorldBossState {
  active: boolean;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  spawnTimer: number;
}

export interface WorldEvent {
  type: 'zone_enter' | 'zone_discover' | 'achievement' | 'boss_spawn' | 'boss_defeat' | 'weather_change' | 'notification';
  title: string;
  description: string;
  timestamp: number;
  duration: number;
}

export interface WorldState {
  worldTime: number;          // 0-24 hours
  dayDurationMinutes: number; // real minutes per full day cycle
  sunriseHour: number;
  sunsetHour: number;

  weather: WeatherType;
  weatherTimer: number;
  weatherChangeInterval: number; // seconds between weather changes

  worldBoss: WorldBossState;
  worldBossSpawnInterval: number;

  events: WorldEvent[];       // active notification events
  totalPlayTime: number;      // seconds played this session
}

const STORAGE_KEY = 'grudge_world_state';

export function createWorldState(): WorldState {
  return {
    worldTime: 12.0,
    dayDurationMinutes: 22,   // 22 real min = 24 game hours (18 min day + 4 min night)
    sunriseHour: 5,            // sunrise at 5:00 (early morning light)
    sunsetHour: 19.5,          // sunset at 19:30 (long golden hour)
    weather: WeatherType.Clear,
    weatherTimer: 0,
    weatherChangeInterval: 300,
    worldBoss: {
      active: false,
      name: '',
      x: 0, y: 0,
      hp: 0, maxHp: 0,
      spawnTimer: 0,
    },
    worldBossSpawnInterval: 600,
    events: [],
    totalPlayTime: 0,
  };
}

export function saveWorldState(ws: WorldState): void {
  try {
    const save = { worldTime: ws.worldTime, weather: ws.weather, totalPlayTime: ws.totalPlayTime };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

export function loadWorldStatePersisted(ws: WorldState): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.worldTime === 'number') ws.worldTime = data.worldTime;
    if (data.weather && data.weather in WeatherType) ws.weather = data.weather;
    if (typeof data.totalPlayTime === 'number') ws.totalPlayTime = data.totalPlayTime;
  } catch {}
}

export function updateWorldState(ws: WorldState, dt: number): void {
  ws.totalPlayTime += dt;

  // Advance time of day
  const timePerSecond = 24 / (ws.dayDurationMinutes * 60);
  ws.worldTime += timePerSecond * dt;
  if (ws.worldTime >= 24) ws.worldTime -= 24;

  // Weather cycle
  ws.weatherTimer += dt;
  if (ws.weatherTimer >= ws.weatherChangeInterval) {
    ws.weatherTimer = 0;
    randomizeWeather(ws);
  }

  // World boss timer
  if (!ws.worldBoss.active) {
    ws.worldBoss.spawnTimer += dt;
    if (ws.worldBoss.spawnTimer >= ws.worldBossSpawnInterval) {
      ws.worldBoss.spawnTimer = 0;
      // Boss spawning is handled by the open-world engine which calls spawnWorldBoss()
    }
  }

  // Expire events
  const now = ws.totalPlayTime;
  ws.events = ws.events.filter(e => now - e.timestamp < e.duration);
}

function randomizeWeather(ws: WorldState): void {
  const types = Object.values(WeatherType);
  const prev = ws.weather;
  let next = types[Math.floor(Math.random() * types.length)];
  // Avoid same weather twice in a row
  if (next === prev && types.length > 1) {
    next = types[(types.indexOf(prev) + 1 + Math.floor(Math.random() * (types.length - 1))) % types.length];
  }
  ws.weather = next;
  pushWorldEvent(ws, 'weather_change', `Weather: ${WEATHER_INFO[next].label}`, WEATHER_INFO[next].icon, 4);
}

export function pushWorldEvent(ws: WorldState, type: WorldEvent['type'], title: string, description: string, duration: number): void {
  ws.events.push({ type, title, description, timestamp: ws.totalPlayTime, duration });
  // Cap at 8 visible events
  if (ws.events.length > 8) ws.events.shift();
}

// --- Queries ---

export function isDayTime(ws: WorldState): boolean {
  return ws.worldTime >= ws.sunriseHour && ws.worldTime < ws.sunsetHour;
}

export function getFormattedTime(ws: WorldState): string {
  const hours = Math.floor(ws.worldTime);
  const minutes = Math.floor((ws.worldTime - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/** Returns 0.0 (midnight) to 1.0 (noon), smoothed via sine curve
 * Night minimum is 0.25 (not pitch black — game must be playable) */
export function getSunIntensity(ws: WorldState): number {
  const t = ws.worldTime / 24;
  // Peak at noon (0.5), trough at midnight (0.0/1.0)
  const raw = (Math.sin((t - 0.25) * Math.PI * 2) + 1) / 2;
  // Night floor: never below 0.25 so game is always visible
  // Dawn/dusk: smooth transition with slight blue tint handled by renderer
  return Math.max(0.25, raw);
}

/** Ambient brightness factor combining sun + weather.
 * Night minimum 0.2 ensures terrain/enemies always visible. */
export function getAmbientBrightness(ws: WorldState): number {
  const sun = getSunIntensity(ws);
  const weather = WEATHER_INFO[ws.weather].ambientMod;
  // Floor at 0.2 — game must be playable even in storm + midnight
  return Math.max(0.2, sun * weather);
}

/** Movement speed multiplier from weather */
export function getWeatherSpeedMod(ws: WorldState): number {
  return WEATHER_INFO[ws.weather].speedMod;
}

export function getWeatherDescription(ws: WorldState): string {
  return WEATHER_INFO[ws.weather].label;
}

export function getWeatherIcon(ws: WorldState): string {
  return WEATHER_INFO[ws.weather].icon;
}

export function setWeather(ws: WorldState, weather: WeatherType): void {
  ws.weather = weather;
  ws.weatherTimer = 0;
}

export function setWorldTime(ws: WorldState, hour: number): void {
  ws.worldTime = Math.max(0, Math.min(24, hour));
}

export function spawnWorldBoss(ws: WorldState, name: string, x: number, y: number, hp: number): void {
  ws.worldBoss = { active: true, name, x, y, hp, maxHp: hp, spawnTimer: 0 };
  pushWorldEvent(ws, 'boss_spawn', `WORLD BOSS: ${name}`, 'A powerful enemy has appeared!', 10);
}

export function defeatWorldBoss(ws: WorldState): void {
  ws.worldBoss.active = false;
  ws.worldBoss.hp = 0;
  ws.worldBoss.spawnTimer = 0;
  pushWorldEvent(ws, 'boss_defeat', 'World Boss Defeated!', `${ws.worldBoss.name} has been vanquished.`, 8);
}
