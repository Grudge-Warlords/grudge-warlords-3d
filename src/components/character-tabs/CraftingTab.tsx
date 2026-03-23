import css from '../MainPanel.module.css';
import { CharacterData } from '@/game/character-data';

export function CraftingTab({ data }: { data: CharacterData }) {
  return (
    <>
      <div className={css.sectionTitle}>Gathering Professions</div>
      {data.gatheringProfs.map(g => (
        <div key={g.id} className={css.profRow}>
          <span className={css.profIcon}>{g.icon}</span>
          <div className={css.profInfo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: g.color }}>{g.name}</span>
              <span style={{ color: '#9b7d52' }}>Lv{g.level}</span>
            </div>
            <div className={css.profBar}>
              <div className={css.profFill} style={{ width: `${(g.xp / g.xpToNext) * 100}%`, background: g.color }} />
            </div>
            <div style={{ fontSize: 9, color: '#6b5535', marginTop: 2 }}>Tier {g.tier} — <span style={{ color: g.tierColor }}>{g.tierName}</span></div>
          </div>
        </div>
      ))}

      <div className={css.sectionTitle}>Crafting Professions</div>
      {data.craftingProfs.map(c => (
        <div key={c.id} className={css.profRow}>
          <span className={css.profIcon}>{c.icon}</span>
          <div className={css.profInfo}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: c.color }}>{c.name}</span>
              <span style={{ color: '#9b7d52' }}>Lv{c.level}</span>
            </div>
            <div className={css.profBar}>
              <div className={css.profFill} style={{ width: `${(c.xp / c.xpToNext) * 100}%`, background: c.color }} />
            </div>
            <div style={{ fontSize: 9, color: '#6b5535', marginTop: 2 }}>Tier {c.tier} — <span style={{ color: c.tierColor }}>{c.tierName}</span></div>
          </div>
        </div>
      ))}

      <div className={css.sectionTitle}>Crafting Station</div>
      <div className={css.craftLayout}>
        <div className={css.craftSlots}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={css.craftSlot}>Slot {i + 1}</div>
          ))}
        </div>
        <div className={css.craftArrow}>⟹</div>
        <div className={css.craftResult}>Result</div>
        <button className={css.craftBtn}>Craft</button>
      </div>
    </>
  );
}
