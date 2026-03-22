/**
 * Puter Cloud Integration
 * Wraps the Puter.js SDK for game services:
 * - AI: NPC dialogue, lore generation, text-to-voxel prompts
 * - KV Store: NoSQL player data persistence (replaces/supplements localStorage)
 * - Cloud Storage: Save files, screenshots, replays
 * - Auth: Puter account-based player identity
 * - Hosting: Deploy static game builds to *.puter.site
 *
 * Puter.js uses a "User-Pays" model — no API keys needed from the developer.
 * Include <script src="https://js.puter.com/v2/"></script> in your HTML.
 *
 * NPM alternative: npm install @heyputer/puter.js
 *   import { puter } from '@heyputer/puter.js';
 */

// ── Puter global type (injected by <script> tag or NPM import) ─

declare const puter: {
  ai: {
    chat(prompt: string, opts?: { model?: string; stream?: boolean }): Promise<any>;
    chat(prompt: string, imageUrl: string, opts?: { model?: string }): Promise<any>;
    txt2img(prompt: string, testMode?: boolean): Promise<HTMLImageElement>;
    txt2speech(text: string, opts?: { voice?: string; engine?: string; language?: string }): Promise<HTMLAudioElement>;
    img2txt(imageUrl: string): Promise<string>;
  };
  kv: {
    set(key: string, value: string): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    list(): Promise<{ key: string; value: string }[]>;
    incr(key: string, amount?: number): Promise<number>;
    decr(key: string, amount?: number): Promise<number>;
  };
  fs: {
    write(path: string, content: string | Blob): Promise<{ path: string }>;
    read(path: string): Promise<Blob>;
    mkdir(path: string): Promise<void>;
    readdir(path: string): Promise<{ name: string; is_dir: boolean }[]>;
    stat(path: string): Promise<{ name: string; size: number; modified: number }>;
    delete(path: string): Promise<void>;
  };
  auth: {
    signIn(): Promise<{ username: string; uuid: string }>;
    signOut(): Promise<void>;
    isSignedIn(): boolean;
    getUser(): Promise<{ username: string; uuid: string } | null>;
  };
  hosting: {
    create(subdomain: string, dirPath: string): Promise<{ subdomain: string }>;
    delete(subdomain: string): Promise<void>;
    list(): Promise<{ subdomain: string }[]>;
  };
  net: {
    fetch(url: string, opts?: RequestInit): Promise<Response>;
  };
  print(content: string, opts?: { code?: boolean }): void;
  randName(): string;
};

// ── Check if Puter.js is available ─────────────────────────────

export function isPuterAvailable(): boolean {
  return typeof puter !== 'undefined' && puter !== null;
}

// ── AI Services ────────────────────────────────────────────────

/** AI models recommended for game tasks */
export const AI_MODELS = {
  fast: 'gpt-4.1-nano',          // Fastest, cheapest — NPC barks, short prompts
  balanced: 'gpt-5-nano',        // Good balance — dialogue, descriptions
  creative: 'claude-sonnet-4-6',  // Best for lore, creative writing
  reasoning: 'o4-mini',           // Complex game logic, puzzle generation
  vision: 'gpt-5-nano',           // Image analysis
} as const;

/**
 * Generate NPC dialogue using AI.
 * Falls back to static text if Puter unavailable.
 */
export async function generateNPCDialogue(
  npcName: string,
  npcRole: string,
  playerContext: string,
  model = AI_MODELS.fast,
): Promise<string> {
  if (!isPuterAvailable()) return `${npcName}: Welcome, adventurer.`;
  try {
    const prompt = `You are ${npcName}, a ${npcRole} in a dark fantasy RPG. ` +
      `Respond in character with 1-2 sentences. Player context: ${playerContext}`;
    const resp = await puter.ai.chat(prompt, { model });
    return typeof resp === 'string' ? resp : resp?.message?.content || `${npcName}: ...`;
  } catch {
    return `${npcName}: Welcome, adventurer.`;
  }
}

/**
 * Generate lore text (item descriptions, zone lore, quest text).
 */
export async function generateLore(
  topic: string,
  maxWords = 50,
  model = AI_MODELS.creative,
): Promise<string> {
  if (!isPuterAvailable()) return '';
  try {
    const prompt = `Write dark fantasy lore about "${topic}" in ${maxWords} words or less. Be concise and evocative.`;
    const resp = await puter.ai.chat(prompt, { model });
    return typeof resp === 'string' ? resp : resp?.message?.content || '';
  } catch {
    return '';
  }
}

/**
 * Stream an AI response (for long-form content like quest narratives).
 */
export async function* streamAIResponse(
  prompt: string,
  model = AI_MODELS.balanced,
): AsyncGenerator<string> {
  if (!isPuterAvailable()) return;
  try {
    const resp = await puter.ai.chat(prompt, { model, stream: true });
    for await (const part of resp) {
      if (part?.text) yield part.text;
    }
  } catch {
    // Silently fail — AI is supplementary
  }
}

/**
 * Generate a voxel model prompt for text-to-3D workflows.
 */
export async function generateVoxelPrompt(
  description: string,
  model = AI_MODELS.balanced,
): Promise<string> {
  if (!isPuterAvailable()) return description;
  try {
    const prompt = `Convert this game asset description into a detailed prompt for voxel 3D model generation: "${description}". ` +
      `Include color palette, proportions, and style notes. Keep under 100 words.`;
    const resp = await puter.ai.chat(prompt, { model });
    return typeof resp === 'string' ? resp : resp?.message?.content || description;
  } catch {
    return description;
  }
}

// ── KV Store (NoSQL Persistence) ───────────────────────────────

const KV_PREFIX = 'grudge_';

/**
 * Save player data to Puter KV store.
 * Supplements localStorage — use as cloud backup.
 */
export async function kvSave(key: string, data: unknown): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    await puter.kv.set(`${KV_PREFIX}${key}`, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Load player data from Puter KV store.
 */
export async function kvLoad<T>(key: string): Promise<T | null> {
  if (!isPuterAvailable()) return null;
  try {
    const raw = await puter.kv.get(`${KV_PREFIX}${key}`);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

/**
 * Delete a key from Puter KV store.
 */
export async function kvDelete(key: string): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    await puter.kv.del(`${KV_PREFIX}${key}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Increment a numeric counter in KV (e.g. kill count, play time).
 */
export async function kvIncrement(key: string, amount = 1): Promise<number | null> {
  if (!isPuterAvailable()) return null;
  try {
    return await puter.kv.incr(`${KV_PREFIX}${key}`, amount);
  } catch {
    return null;
  }
}

/**
 * Save all player RPG systems to Puter cloud KV.
 * Call periodically (every 30s) or on meaningful events.
 */
export async function syncPlayerToCloud(playerData: {
  attributes?: unknown;
  equipment?: unknown;
  professions?: unknown;
  resources?: unknown;
  weaponLoadout?: unknown;
  equipmentBag?: unknown;
  settings?: unknown;
}): Promise<boolean> {
  if (!isPuterAvailable()) return false;
  try {
    const saves = Object.entries(playerData)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => puter.kv.set(`${KV_PREFIX}${k}`, JSON.stringify(v)));
    await Promise.allSettled(saves);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all player RPG systems from Puter cloud KV.
 * Call at game init — falls back to localStorage if unavailable.
 */
export async function loadPlayerFromCloud(): Promise<Record<string, unknown> | null> {
  if (!isPuterAvailable()) return null;
  try {
    const keys = ['attributes', 'equipment', 'professions', 'resources', 'weaponLoadout', 'equipmentBag'];
    const results: Record<string, unknown> = {};
    for (const key of keys) {
      const raw = await puter.kv.get(`${KV_PREFIX}${key}`);
      if (raw) results[key] = JSON.parse(raw);
    }
    return Object.keys(results).length > 0 ? results : null;
  } catch {
    return null;
  }
}

// ── Cloud Storage ──────────────────────────────────────────────

/**
 * Save a game file to Puter cloud storage.
 */
export async function cloudSaveFile(filename: string, content: string): Promise<string | null> {
  if (!isPuterAvailable()) return null;
  try {
    const dir = 'grudge-warlords';
    try { await puter.fs.mkdir(dir); } catch { /* exists */ }
    const result = await puter.fs.write(`${dir}/${filename}`, content);
    return result.path;
  } catch {
    return null;
  }
}

/**
 * Load a game file from Puter cloud storage.
 */
export async function cloudLoadFile(filename: string): Promise<string | null> {
  if (!isPuterAvailable()) return null;
  try {
    const blob = await puter.fs.read(`grudge-warlords/${filename}`);
    return await blob.text();
  } catch {
    return null;
  }
}

// ── Auth ───────────────────────────────────────────────────────

export interface PuterUser {
  username: string;
  uuid: string;
}

/**
 * Sign in with Puter account.
 * Returns user info or null if Puter unavailable.
 */
export async function puterSignIn(): Promise<PuterUser | null> {
  if (!isPuterAvailable()) return null;
  try {
    const user = await puter.auth.signIn();
    return { username: user.username, uuid: user.uuid };
  } catch {
    return null;
  }
}

/**
 * Get current Puter user (if already signed in).
 */
export async function getPuterUser(): Promise<PuterUser | null> {
  if (!isPuterAvailable()) return null;
  try {
    const user = await puter.auth.getUser();
    return user ? { username: user.username, uuid: user.uuid } : null;
  } catch {
    return null;
  }
}

// ── CORS-Free Networking ───────────────────────────────────────

/**
 * Fetch a URL without CORS restrictions via Puter proxy.
 * Useful for fetching ObjectStore data or external APIs.
 */
export async function puterFetch(url: string, opts?: RequestInit): Promise<Response | null> {
  if (!isPuterAvailable()) return null;
  try {
    return await puter.net.fetch(url, opts);
  } catch {
    return null;
  }
}

// ── Hosting ────────────────────────────────────────────────────

/**
 * Deploy a game build to Puter hosting (*.puter.site).
 * Requires files to be written to Puter cloud storage first.
 */
export async function deployToSite(subdomain: string, dirPath: string): Promise<string | null> {
  if (!isPuterAvailable()) return null;
  try {
    const site = await puter.hosting.create(subdomain, dirPath);
    return `https://${site.subdomain}.puter.site`;
  } catch {
    return null;
  }
}
