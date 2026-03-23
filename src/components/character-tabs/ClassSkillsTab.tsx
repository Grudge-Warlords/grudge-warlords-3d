import { useState, useCallback } from 'react';
import css from '../MainPanel.module.css';
import { CharacterData } from '@/game/character-data';
import { CLASS_COLORS, ABILITY_ICONS } from '@/game/types';
import {
  SKILL_TREES, ClassSkillTree, SkillSlotPool, SkillTreeOption,
  createDefaultMobaLoadout, buildAbilitiesFromMobaLoadout,
  setMobaSlotSelection, saveMobaLoadout, loadMobaLoadout,
  MobaSkillLoadout,
} from '@/game/skill-trees';

const SLOT_COLORS: Record<string, string> = {
  attack: '#ef4444', core: '#3b82f6', defensive: '#22c55e',
  ultimate: '#ffd700', special: '#f97316', burst: '#a855f7',
};

export function ClassSkillsTab({ data }: { data: CharacterData }) {
  const tree = SKILL_TREES[data.heroClass];
  const [loadout, setLoadout] = useState<MobaSkillLoadout>(() => {
    return loadMobaLoadout() ?? createDefaultMobaLoadout(data.heroRace, data.heroClass);
  });

  const handleSelect = useCallback((slotIndex: number, optIndex: number) => {
    const updated = setMobaSlotSelection(loadout, slotIndex, optIndex);
    setLoadout(updated);
    saveMobaLoadout(updated);
  }, [loadout]);

  if (!tree) {
    return <div style={{ padding: 20, color: '#6b5535' }}>No skill tree for {data.heroClass}</div>;
  }

  const classColor = tree.color;

  return (
    <>
      <div className={css.sectionTitle} style={{ borderColor: classColor }}>
        <span style={{ color: classColor, fontWeight: 700 }}>{data.heroClass}</span> Skill Tree
        <span style={{ color: '#6b5535', fontSize: 10, marginLeft: 8 }}>Lv. {data.level}</span>
      </div>

      {tree.slots.map((pool, slotIdx) => {
        const selectedIdx = loadout.selections[slotIdx] || 0;
        const slotColor = SLOT_COLORS[pool.slotType] || '#888';
        const isUltimate = pool.slotType === 'ultimate';

        return (
          <div key={slotIdx} style={{
            marginBottom: 8,
            padding: '8px 10px',
            background: isUltimate ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.02)',
            borderRadius: 8,
            borderLeft: `3px solid ${slotColor}`,
          }}>
            {/* Slot header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                background: slotColor,
                color: '#000',
                padding: '1px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
              }}>
                {pool.slotLabel}
              </span>
              <span style={{ color: '#9b7d52', fontSize: 11, textTransform: 'uppercase' }}>
                {pool.slotType}
              </span>
              {isUltimate && (
                <span style={{ color: '#ffd700', fontSize: 9, marginLeft: 'auto' }}>CLASS ABILITY</span>
              )}
            </div>

            {/* Skill options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pool.options.length === 0 ? (
                <div style={{ color: '#4a3a2a', fontSize: 11, padding: '4px 0' }}>No skills available</div>
              ) : (
                pool.options.map((opt, optIdx) => {
                  const isSelected = optIdx === selectedIdx;
                  const locked = opt.requiredLevel > data.level;
                  const ab = opt.ability;

                  return (
                    <div
                      key={optIdx}
                      onClick={() => !locked && handleSelect(slotIdx, optIdx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 8px',
                        borderRadius: 6,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        background: isSelected ? 'rgba(212,168,75,0.12)' : 'transparent',
                        border: isSelected ? '1px solid #c5a059' : '1px solid transparent',
                        opacity: locked ? 0.4 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 6,
                        background: isSelected ? slotColor : '#2a2218',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: isSelected ? '2px solid #ffd700' : '1px solid #3a2a1a',
                        flexShrink: 0,
                      }}>
                        {ABILITY_ICONS[ab.name] ? (
                          <img src={ABILITY_ICONS[ab.name]} alt={ab.name} style={{ width: 24, height: 24, borderRadius: 4 }} draggable={false} />
                        ) : (
                          <span style={{ color: isSelected ? '#000' : slotColor, fontWeight: 700, fontSize: 12 }}>
                            {ab.name.substring(0, 2)}
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#e8d5b0', fontSize: 12, fontWeight: 600 }}>{ab.name}</span>
                          {locked && <span style={{ color: '#ef4444', fontSize: 9 }}>🔒 Lv.{opt.requiredLevel}</span>}
                          {isSelected && <span style={{ color: '#ffd700', fontSize: 9 }}>✓ ACTIVE</span>}
                        </div>
                        <div style={{ color: '#8a7a5a', fontSize: 10, lineHeight: 1.3 }}>{ab.description}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                          {ab.damage > 0 && <span className={`${css.chip} ${css.chipDmg}`}>{ab.damage}</span>}
                          <span className={`${css.chip} ${css.chipCd}`}>{ab.cooldown}s</span>
                          {ab.manaCost > 0 && <span className={`${css.chip} ${css.chipBuff}`}>{ab.manaCost}MP</span>}
                          {ab.effect && <span className={`${css.chip} ${css.chipCc}`}>{ab.effect}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
