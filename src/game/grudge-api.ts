/**
 * Grudge API Client — ObjectStore + Backend Character Bridge
 *
 * Provides:
 *   - ObjectStore CDN access (weapon skills, items)
 *   - Character sync to Grudge backend game-api
 *
 * Backend URL priority: VITE_GRUDGE_GAME_API env var → known production URL
 * Auth token is read from localStorage key 'grudge_jwt' (set by Grudge ID login).
 */

const BASE_URL = 'https://molochdagod.github.io/ObjectStore';

// ── Backend Config ────────────────────────────────────────────

const GAME_API_BASE: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GRUDGE_GAME_API) ||
  'https://game-api.grudge-studio.com';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('grudge_jwt');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface OSWeaponSkillOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number;
  manaCost: number;
  damageMultiplier?: number;
  effect?: string;
  slot: string;
  slotLabel: string;
}

export interface OSWeaponSpecific {
  slot4: OSWeaponSkillOption[];
  slot5: OSWeaponSkillOption | OSWeaponSkillOption[];
}

export interface OSWeaponTypeSkills {
  name: string;
  emoji: string;
  sharedSkills: {
    slot1: OSWeaponSkillOption[];
    slot2: OSWeaponSkillOption[];
    slot3: OSWeaponSkillOption[];
  };
  weapons: Record<string, OSWeaponSpecific>;
}

interface WeaponSkillsData {
  version: string;
  weaponTypes: Record<string, OSWeaponTypeSkills>;
}

// Cache
let _skillsData: WeaponSkillsData | null = null;

async function fetchSkills(): Promise<WeaponSkillsData | null> {
  if (_skillsData) return _skillsData;
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/weaponSkills.json`);
    if (!resp.ok) return null;
    _skillsData = await resp.json();
    return _skillsData;
  } catch {
    return null;
  }
}

// ── Character types (3D format) ─────────────────────────────

export interface Grudge3DCharacter {
  race: string;
  heroClass: string;
  name: string;
  bodyTypeId: number;
  skinColor: string;
}

export interface BackendCharacter {
  id: number;
  grudge_id: string;
  name: string;
  race: string;
  class: string;
  faction: string;
  level: number;
  hp: number;
  max_hp: number;
  island: string | null;
  pos_x: number;
  pos_y: number;
  pos_z: number;
}

const FACTION_MAP: Record<string, string> = {
  Human: 'Crusade', Barbarian: 'Crusade',
  Dwarf: 'Fabled', Elf: 'Fabled',
  Orc: 'Legion', Undead: 'Legion',
};

/**
 * Sync a 3D character to the Grudge backend.
 * Requires the player to be logged in (grudge_jwt in localStorage).
 * Fails silently if offline or unauthenticated.
 */
export async function syncCharacterToBackend(char: Grudge3DCharacter): Promise<BackendCharacter | null> {
  const token = localStorage.getItem('grudge_jwt');
  if (!token) return null; // Not logged in — skip backend sync

  try {
    // Check if character already exists
    const listResp = await fetch(`${GAME_API_BASE}/characters`, {
      headers: getAuthHeaders(),
    });
    if (listResp.ok) {
      const existing: BackendCharacter[] = await listResp.json();
      const match = existing.find(
        c => c.name === char.name &&
             c.race.toLowerCase() === char.race.toLowerCase() &&
             c.class.toLowerCase() === char.heroClass.toLowerCase()
      );
      if (match) {
        // Already synced — store the backend ID for future updates
        localStorage.setItem('grudge_char_id', String(match.id));
        return match;
      }
    }

    // Create new character on backend
    const resp = await fetch(`${GAME_API_BASE}/characters`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: char.name,
        race: char.race.toLowerCase(),
        class: char.heroClass.toLowerCase(),
      }),
    });
    if (!resp.ok) return null;
    const created: BackendCharacter = await resp.json();
    localStorage.setItem('grudge_char_id', String(created.id));
    return created;
  } catch {
    return null; // Offline or backend unavailable
  }
}

/**
 * Load the player's most recent character from the backend.
 * Returns null if unauthenticated or no characters exist.
 */
export async function loadCharacterFromBackend(): Promise<BackendCharacter | null> {
  const token = localStorage.getItem('grudge_jwt');
  if (!token) return null;

  try {
    const resp = await fetch(`${GAME_API_BASE}/characters`, {
      headers: getAuthHeaders(),
    });
    if (!resp.ok) return null;
    const chars: BackendCharacter[] = await resp.json();
    if (!chars.length) return null;
    // Return the first character (or the one matching grudge_char_id)
    const savedId = localStorage.getItem('grudge_char_id');
    if (savedId) {
      const match = chars.find(c => String(c.id) === savedId);
      if (match) return match;
    }
    return chars.reduce((latest, current) => current.id > latest.id ? current : latest);
  } catch {
    return null;
  }
}

/**
 * Convert a backend character back to the 3D character format.
 * Preserves bodyTypeId and skinColor from localStorage if available.
 */
export function backendCharacterTo3D(bc: BackendCharacter): Grudge3DCharacter {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem('grudge3d_character') || 'null'); } catch { return null; }
  })();
  return {
    name: bc.name,
    race: bc.race.charAt(0).toUpperCase() + bc.race.slice(1),
    heroClass: bc.class.charAt(0).toUpperCase() + bc.class.slice(1),
    bodyTypeId: saved?.bodyTypeId ?? 0,
    skinColor: saved?.skinColor ?? '#c4956a',
  };
}

export const grudgeApi = {
  async getWeaponTypeSkills(weaponType: string): Promise<OSWeaponTypeSkills | null> {
    const data = await fetchSkills();
    if (!data) return null;
    return data.weaponTypes[weaponType] || null;
  },

  async getWeaponSpecificSkills(weaponType: string, weaponId: string): Promise<OSWeaponSpecific | null> {
    const data = await fetchSkills();
    if (!data) return null;
    const typeData = data.weaponTypes[weaponType];
    if (!typeData) return null;
    return typeData.weapons[weaponId] || null;
  },
};
