/**
 * Arena.tsx — MOBA Arena mode entry point for 3dmmogrudge.
 *
 * Bridges the 3D open-world character data to the MOBA game hosted at
 * dungeon-crawler-quest.vercel.app. Syncs the grudge3d_character to
 * DCQ-compatible localStorage keys and embeds the arena in-app.
 *
 * Migration note: the full MOBA engine (engine.ts / types.ts) will be
 * migrated from DCQ into this repo. Until then, the iframe bridge below
 * provides a working arena experience from within 3dmmogrudge.
 */

import { useEffect, useRef, useState } from 'react';

// ── Constants ────────────────────────────────────────────────────

const FONT = "'Oxanium', sans-serif";
const GOLD = '#c5a059';
const DCQ_BASE = 'https://dungeon-crawler-quest.vercel.app';

const CLASS_COLORS: Record<string, string> = {
  Warrior: '#ef5350',
  Mage: '#7c4dff',
  Ranger: '#66bb6a',
  Worge: '#ff9800',
};

const RACE_COLORS: Record<string, string> = {
  Human: '#e8d4b0',
  Barbarian: '#c87941',
  Dwarf: '#b8a060',
  Elf: '#82c8a0',
  Orc: '#7cb87c',
  Undead: '#9090b8',
};

const FACTION_COLORS: Record<string, string> = {
  Crusade: GOLD,
  Fabled: '#4fc3f7',
  Legion: '#ef5350',
};

const FACTIONS: Record<string, string> = {
  Human: 'Crusade', Barbarian: 'Crusade',
  Dwarf: 'Fabled', Elf: 'Fabled',
  Orc: 'Legion', Undead: 'Legion',
};

// ── Class stat defaults for DCQ hero format ─────────────────────

const CLASS_BASE_STATS: Record<string, { hp: number; atk: number; def: number; spd: number; rng: number; mp: number }> = {
  Warrior: { hp: 800,  atk: 72,  def: 45,  spd: 295, rng: 115, mp: 200 },
  Mage:    { hp: 520,  atk: 90,  def: 22,  spd: 305, rng: 600, mp: 500 },
  Ranger:  { hp: 580,  atk: 85,  def: 28,  spd: 325, rng: 650, mp: 280 },
  Worge:   { hp: 700,  atk: 78,  def: 36,  spd: 315, rng: 120, mp: 320 },
};

// ── Helpers ──────────────────────────────────────────────────────

function syncCharacterToDCQ(char: {
  race: string; heroClass: string; name: string; bodyTypeId: number; skinColor: string;
}): void {
  /**
   * Bridge grudge3d_character → DCQ hero format so the arena can use
   * the same character without re-creating it on the DCQ side.
   *
   * DCQ expects:
   *   grudge_hero_id   — index into HEROES array (we use 999 = custom)
   *   grudge_custom_hero — serialised HeroData JSON
   *   grudge_mode      — 'arena'
   */
  const stats = CLASS_BASE_STATS[char.heroClass] || CLASS_BASE_STATS.Warrior;
  const hero = {
    id: 999,
    name: char.name,
    title: `${char.race} ${char.heroClass}`,
    race: char.race,
    heroClass: char.heroClass,
    faction: FACTIONS[char.race] || 'Crusade',
    rarity: 'Epic',
    ...stats,
    quote: 'For the Grudge!',
    bodyTypeId: char.bodyTypeId,
    skinColor: char.skinColor,
  };

  localStorage.setItem('grudge_hero_id', '999');
  localStorage.setItem('grudge_custom_hero', JSON.stringify(hero));
  localStorage.setItem('grudge_mode', 'arena');
}

// ══════════════════════════════════════════════════════════════
// ARENA PAGE
// ══════════════════════════════════════════════════════════════

export default function Arena() {
  const [mode, setMode] = useState<'lobby' | 'playing'>('lobby');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [char] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('grudge3d_character') || 'null');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!char) return;
    syncCharacterToDCQ(char);
  }, [char]);

  if (mode === 'playing') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
        <iframe
          ref={iframeRef}
          src={`${DCQ_BASE}/create-character`}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Grudge Warlords Arena"
          allow="autoplay; fullscreen"
        />
        <button
          onClick={() => setMode('lobby')}
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 9999,
            padding: '6px 14px', borderRadius: 6,
            background: 'rgba(10,10,26,0.9)', border: '1px solid #c5a05960',
            color: GOLD, fontFamily: FONT, fontSize: 12, cursor: 'pointer',
          }}
        >
          ← Back to 3D World
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, #1a0a0a 0%, #0a0a1a 60%, #050510 100%)',
        fontFamily: FONT, color: '#ccc',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: '#666', marginBottom: 6 }}>
          GRUDGE WARLORDS
        </div>
        <h1 style={{
          fontSize: 52, fontWeight: 900, letterSpacing: '0.15em',
          color: GOLD, margin: 0,
          textShadow: '0 0 40px rgba(197,160,89,0.4)',
        }}>
          ARENA
        </h1>
        <div style={{ fontSize: 13, color: '#888', marginTop: 6, letterSpacing: '0.2em' }}>
          5v5 · THREE LANES · DESTROY THE NEXUS
        </div>
      </div>

      {/* Character card */}
      {char ? (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(197,160,89,0.2)',
          borderRadius: 10, padding: '16px 28px', marginBottom: 28,
          textAlign: 'center', minWidth: 240,
        }}>
          <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.2em', marginBottom: 4 }}>
            ENTERING AS
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: CLASS_COLORS[char.heroClass] || GOLD }}>
            {char.name}
          </div>
          <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
            <span style={{ color: RACE_COLORS[char.race] }}>{char.race}</span>
            {' · '}
            <span style={{ color: CLASS_COLORS[char.heroClass] }}>{char.heroClass}</span>
            {' · '}
            <span style={{ color: FACTION_COLORS[FACTIONS[char.race]] }}>
              {FACTIONS[char.race]}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 8, padding: '12px 24px', marginBottom: 28, color: '#ef4444', fontSize: 13,
        }}>
          No character found. Create one in the 3D World first.
        </div>
      )}

      {/* Launch button */}
      <button
        disabled={!char}
        onClick={() => setMode('playing')}
        style={{
          padding: '14px 48px', borderRadius: 8, cursor: char ? 'pointer' : 'not-allowed',
          background: char ? 'rgba(197,160,89,0.12)' : 'rgba(255,255,255,0.04)',
          border: `2px solid ${char ? GOLD : '#333'}`,
          color: char ? GOLD : '#444',
          fontSize: 16, fontWeight: 700, letterSpacing: '0.2em',
          fontFamily: FONT, marginBottom: 16,
          boxShadow: char ? '0 0 24px rgba(197,160,89,0.15)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        ENTER ARENA
      </button>

      {/* Back to world */}
      <button
        onClick={() => {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        style={{
          background: 'none', border: 'none', color: '#555', fontSize: 12,
          cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.15em',
        }}
      >
        ← Return to Open World
      </button>

      {/* Migration note */}
      <div style={{
        position: 'absolute', bottom: 14, fontSize: 10, color: '#333',
        textAlign: 'center', letterSpacing: '0.1em',
      }}>
        ARENA ENGINE MIGRATION IN PROGRESS · FULL 3D ARENA COMING SOON
      </div>
    </div>
  );
}
