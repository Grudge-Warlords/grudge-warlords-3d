/**
 * IntroSequence — 4-page new player tutorial + weapon selection
 * Shown on first game load when grudge_intro_complete is not set.
 * Pages: 1) World Lore, 2) Controls, 3) Weapons & Skills, 4) Weapon Selection
 */

import { useState, useCallback } from 'react';
import { HEROES, CLASS_COLORS } from '@/game/types';

const STORAGE_KEY = 'grudge_intro_complete';
const WEAPON_STORAGE_KEY = 'grudge_starting_weapons';

/** Check if intro should be shown */
export function shouldShowIntro(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

/** Mark intro as complete */
function completeIntro(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

// ── Starting Weapon Options per Class ──────────────────────────

interface WeaponOption {
  id: string;
  name: string;
  type: string;
  hand: 'main' | 'off';
  icon: string;
  description: string;
}

const CLASS_WEAPONS: Record<string, WeaponOption[]> = {
  Warrior: [
    { id: 'w-sword', name: 'Iron Sword', type: 'swords', hand: 'main', icon: '⚔️', description: 'Balanced speed and damage. Best for combos.' },
    { id: 'w-axe', name: 'Battle Axe', type: '2h-weapons', hand: 'main', icon: '🪓', description: 'Slow but devastating cleave attacks.' },
    { id: 'w-hammer', name: 'War Hammer', type: 'hammers', hand: 'main', icon: '🔨', description: 'Stun enemies with crushing blows.' },
    { id: 'w-spear', name: 'Iron Spear', type: 'spears', hand: 'main', icon: '🔱', description: 'Extended reach, piercing thrust attacks.' },
    { id: 'w-shield', name: 'Wooden Shield', type: 'shields', hand: 'off', icon: '🛡️', description: 'Block attacks, bash enemies.' },
    { id: 'w-greatsword', name: 'Greatsword', type: '2h-swords', hand: 'main', icon: '⚔️', description: 'Massive two-handed sweeping strikes.' },
  ],
  Mage: [
    { id: 'm-fire', name: 'Fire Staff', type: 'fireStaves', hand: 'main', icon: '🔥', description: 'Fireball and flame wall spells.' },
    { id: 'm-frost', name: 'Frost Staff', type: 'frostStaves', hand: 'main', icon: '❄️', description: 'Frostbolt and freeze AoE spells.' },
    { id: 'm-arcane', name: 'Arcane Staff', type: 'arcaneStaves', hand: 'main', icon: '🔮', description: 'Arcane missiles and mana manipulation.' },
    { id: 'm-nature', name: 'Nature Staff', type: 'natureStaves', hand: 'main', icon: '🌿', description: 'Healing and thorny vine attacks.' },
    { id: 'm-lightning', name: 'Lightning Staff', type: 'lightningStaves', hand: 'main', icon: '⚡', description: 'Chain lightning and thunder strikes.' },
    { id: 'm-tome', name: 'Tome of Wisdom', type: 'tomes', hand: 'off', icon: '📖', description: 'Boosts spell power and mana regen.' },
  ],
  Ranger: [
    { id: 'r-bow', name: 'Hunting Bow', type: 'bows', hand: 'main', icon: '🏹', description: 'Precise long-range shots.' },
    { id: 'r-crossbow', name: 'Crossbow', type: 'crossbows', hand: 'main', icon: '🎯', description: 'Heavy bolts with explosive impact.' },
    { id: 'r-daggers', name: 'Twin Daggers', type: 'daggers', hand: 'main', icon: '🗡️', description: 'Fast dual-wield close combat.' },
    { id: 'r-spear', name: 'Javelin', type: 'spears', hand: 'main', icon: '🔱', description: 'Throwable spear with reach.' },
    { id: 'r-gun', name: 'Flintlock Pistol', type: 'guns', hand: 'main', icon: '🔫', description: 'Slow but powerful ranged burst.' },
  ],
  Worg: [
    { id: 'o-daggers', name: 'Bone Daggers', type: 'daggers', hand: 'main', icon: '🗡️', description: 'Fast shadow-step attacks.' },
    { id: 'o-axe', name: 'Tribal Axe', type: '2h-weapons', hand: 'main', icon: '🪓', description: 'Feral cleaving strikes.' },
    { id: 'o-staff', name: 'Shaman Staff', type: 'staffs', hand: 'main', icon: '🪄', description: 'Spirit magic and totems.' },
    { id: 'o-bow', name: 'Shortbow', type: 'bows', hand: 'main', icon: '🏹', description: 'Quick-draw ranged attacks.' },
    { id: 'o-hammer', name: 'Stone Maul', type: 'hammers', hand: 'main', icon: '🔨', description: 'Earthquake slam attacks.' },
  ],
};

// ── Component ──────────────────────────────────────────────────

interface Props {
  heroClass: string;
  heroRace: string;
  onComplete: () => void;
}

export function IntroSequence({ heroClass, heroRace, onComplete }: Props) {
  const [page, setPage] = useState(0);
  const [mainWeapon, setMainWeapon] = useState<string | null>(null);
  const [offWeapon, setOffWeapon] = useState<string | null>(null);

  const classColor = CLASS_COLORS[heroClass] || '#c5a059';
  const weapons = CLASS_WEAPONS[heroClass] || CLASS_WEAPONS.Warrior;
  const mainOptions = weapons.filter(w => w.hand === 'main');
  const offOptions = weapons.filter(w => w.hand === 'off');

  const handleComplete = useCallback(() => {
    // Save weapon selections
    if (mainWeapon) {
      const mw = weapons.find(w => w.id === mainWeapon);
      const ow = offWeapon ? weapons.find(w => w.id === offWeapon) : null;
      localStorage.setItem(WEAPON_STORAGE_KEY, JSON.stringify({
        mainHand: mw ? { id: mw.id, name: mw.name, type: mw.type } : null,
        offHand: ow ? { id: ow.id, name: ow.name, type: ow.type } : null,
      }));
    }
    completeIntro();
    onComplete();
  }, [mainWeapon, offWeapon, weapons, onComplete]);

  const pageStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'linear-gradient(180deg, #0a0a14 0%, #1a0a0a 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, fontFamily: "'Oxanium', sans-serif", color: '#e8d5b0',
    overflow: 'auto',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 700, width: '90%', padding: 32, borderRadius: 16,
    background: 'linear-gradient(135deg, rgba(20,15,10,0.95), rgba(30,20,15,0.9))',
    border: `2px solid ${classColor}40`, boxShadow: `0 0 60px ${classColor}15`,
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, color: classColor, margin: 0, fontWeight: 800 }}>GRUDGE WARLORDS</h1>
          <div style={{ fontSize: 12, color: '#6b5535', marginTop: 4 }}>
            Page {page + 1} of 4 — {heroRace} {heroClass}
          </div>
        </div>

        {/* Page Content */}
        {page === 0 && (
          <div>
            <h2 style={{ color: '#c5a059', fontSize: 18, marginBottom: 12 }}>Welcome to the World of Grudge</h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#9a8a6a' }}>
              You awaken in the <strong style={{ color: '#c5a059' }}>Heroes Guild</strong> — a haven for adventurers in a world torn by war.
              Six races struggle for dominance across treacherous lands: forests teeming with ancient ents,
              swamps harboring the undead, mountains ruled by dragons, and seas patrolled by pirates.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
              {['Human', 'Barbarian', 'Dwarf', 'Elf', 'Orc', 'Undead'].map(race => (
                <div key={race} style={{
                  padding: '8px 12px', borderRadius: 8, textAlign: 'center', fontSize: 11,
                  background: race === heroRace ? `${classColor}20` : 'rgba(255,255,255,0.03)',
                  border: race === heroRace ? `1px solid ${classColor}` : '1px solid #2a2218',
                  color: race === heroRace ? classColor : '#6b5535',
                  fontWeight: race === heroRace ? 700 : 400,
                }}>
                  {race}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#6b5535', marginTop: 12, textAlign: 'center' }}>
              Your class: <strong style={{ color: classColor }}>{heroClass}</strong> — master your weapons, level your skills, explore the world.
            </p>
          </div>
        )}

        {page === 1 && (
          <div>
            <h2 style={{ color: '#c5a059', fontSize: 18, marginBottom: 12 }}>Controls</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
              {[
                ['WASD', 'Move'],
                ['LMB', 'Attack (3-hit combo)'],
                ['RMB', 'Ranged Attack (class-specific)'],
                ['1-5', 'Weapon Skills'],
                ['R', 'Class Ultimate Ability'],
                ['Shift', 'Sprint'],
                ['Space', 'Dodge Roll (i-frames)'],
                ['E', 'Interact (NPCs, chests, harvest)'],
                ['Tab', 'Target Lock'],
                ['C', 'Character Panel'],
                ['I', 'Inventory'],
                ['J', 'Missions'],
              ].map(([key, action]) => (
                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                  <span style={{
                    background: '#2a2218', border: '1px solid #4a3a2a', borderRadius: 4,
                    padding: '2px 8px', fontWeight: 700, color: '#c5a059', minWidth: 50, textAlign: 'center',
                    fontSize: 11,
                  }}>{key}</span>
                  <span style={{ color: '#8a7a5a' }}>{action}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#6b5535', marginTop: 12, textAlign: 'center' }}>
              RMB fires: {heroClass === 'Warrior' ? 'spinning axe throw' : heroClass === 'Mage' ? 'magic bolt (element-colored)' : heroClass === 'Ranger' ? 'arrow shot' : 'thrown dagger'}
            </p>
          </div>
        )}

        {page === 2 && (
          <div>
            <h2 style={{ color: '#c5a059', fontSize: 18, marginBottom: 12 }}>Weapons & Skills</h2>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#9a8a6a' }}>
              <p><strong style={{ color: '#c5a059' }}>Weapon Skills (1-5):</strong> Change based on your equipped weapon type. Equip a sword — get sword skills. Equip a bow — get bow skills.</p>
              <p><strong style={{ color: classColor }}>Class Ability (R):</strong> Your class ultimate never changes. It's always your most powerful ability.</p>
              <p><strong style={{ color: '#22c55e' }}>Class Skill Tree (C → Class Skills):</strong> 6 skill slots (Q/W/E/D/F/R) with 2-3 options each. Select which skills you want active.</p>
            </div>
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ fontWeight: 700, color: '#c5a059', marginBottom: 6 }}>Equipment Tiers</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['T1 Ragged', 'T2 Iron', 'T3 Steel', 'T4 Cobalt', 'T5 Mystic', 'T6 Crimson', 'T7 Emerald', 'T8 Gold'].map((t, i) => (
                  <span key={i} style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10,
                    background: i < 3 ? '#2a2218' : i < 5 ? '#1a2a3a' : i < 7 ? '#2a1a2a' : '#2a2a1a',
                    color: i < 3 ? '#888' : i < 5 ? '#4488cc' : i < 7 ? '#aa44cc' : '#ffd700',
                    border: `1px solid ${i < 3 ? '#3a2a1a' : i < 5 ? '#2a3a5a' : i < 7 ? '#3a1a3a' : '#5a5a2a'}`,
                  }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {page === 3 && (
          <div>
            <h2 style={{ color: '#c5a059', fontSize: 18, marginBottom: 12 }}>Choose Your Starting Weapons</h2>
            <p style={{ fontSize: 11, color: '#6b5535', marginBottom: 12 }}>
              Select a main-hand weapon{offOptions.length > 0 ? ' and optionally an off-hand' : ''}. These determine your starting skills.
            </p>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#c5a059', marginBottom: 6 }}>Main Hand</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 16 }}>
              {mainOptions.map(w => (
                <div
                  key={w.id}
                  onClick={() => setMainWeapon(w.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    background: mainWeapon === w.id ? `${classColor}15` : 'rgba(255,255,255,0.02)',
                    border: mainWeapon === w.id ? `2px solid ${classColor}` : '1px solid #2a2218',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{w.icon} <span style={{ fontSize: 12, fontWeight: 600, color: mainWeapon === w.id ? classColor : '#e8d5b0' }}>{w.name}</span></div>
                  <div style={{ fontSize: 10, color: '#6b5535' }}>{w.description}</div>
                </div>
              ))}
            </div>

            {offOptions.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#c5a059', marginBottom: 6 }}>Off-Hand (Optional)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {offOptions.map(w => (
                    <div
                      key={w.id}
                      onClick={() => setOffWeapon(offWeapon === w.id ? null : w.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        background: offWeapon === w.id ? `${classColor}15` : 'rgba(255,255,255,0.02)',
                        border: offWeapon === w.id ? `2px solid ${classColor}` : '1px solid #2a2218',
                      }}
                    >
                      <div>{w.icon} <span style={{ fontSize: 12, fontWeight: 600 }}>{w.name}</span></div>
                      <div style={{ fontSize: 10, color: '#6b5535' }}>{w.description}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button
            onClick={() => page > 0 && setPage(page - 1)}
            disabled={page === 0}
            style={{
              padding: '8px 20px', borderRadius: 6, cursor: page > 0 ? 'pointer' : 'default',
              background: 'rgba(255,255,255,0.05)', border: '1px solid #3a2a1a',
              color: page > 0 ? '#c5a059' : '#3a2a1a', fontWeight: 600, fontSize: 12,
            }}
          >← Back</button>

          <button
            onClick={() => { completeIntro(); onComplete(); }}
            style={{
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', border: '1px solid #3a2a1a',
              color: '#4a3a2a', fontSize: 10,
            }}
          >Skip</button>

          {page < 3 ? (
            <button
              onClick={() => setPage(page + 1)}
              style={{
                padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
                background: classColor, border: 'none',
                color: '#000', fontWeight: 700, fontSize: 12,
              }}
            >Next →</button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!mainWeapon}
              style={{
                padding: '8px 24px', borderRadius: 6, cursor: mainWeapon ? 'pointer' : 'default',
                background: mainWeapon ? classColor : '#3a2a1a', border: 'none',
                color: mainWeapon ? '#000' : '#6b5535', fontWeight: 700, fontSize: 12,
              }}
            >⚔ Begin Adventure</button>
          )}
        </div>
      </div>
    </div>
  );
}
