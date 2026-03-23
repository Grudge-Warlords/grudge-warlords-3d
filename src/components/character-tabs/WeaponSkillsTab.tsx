import css from '../MainPanel.module.css';
import { CharacterData } from '@/game/character-data';

export function WeaponSkillsTab({ data }: { data: CharacterData }) {
  return (
    <>
      <div className={css.sectionTitle}>
        Weapon Skills
        {data.weaponType && <span style={{ color: '#9b7d52', fontSize: 10, marginLeft: 8 }}>({data.weaponType})</span>}
      </div>
      {data.weaponLoadoutReady && data.abilityNames.length > 0 ? (
        <div className={css.skillGrid}>
          {data.abilityNames.map((name, i) => (
            <div key={i} className={css.skillNode}>
              <div className={css.skIcon}>
                <span style={{ color: '#d4a400', fontWeight: 700 }}>{i + 1}</span>
              </div>
              <div>
                <div className={css.skName}>{name}</div>
                <div className={css.skDesc}>{data.abilityDescs[i]}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b5535' }}>
          No weapon loadout active. Equip a weapon in Open World to unlock skills.
        </div>
      )}
    </>
  );
}
