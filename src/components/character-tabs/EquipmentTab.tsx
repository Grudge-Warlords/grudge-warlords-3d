import css from '../MainPanel.module.css';
import { CharacterData } from '@/game/character-data';
import { HeroPreview } from './HeroPreview';

const LEFT_EQUIP = ['Helm', 'Chest', 'Hands', 'Feet'];
const RIGHT_EQUIP = ['Main Hand', 'Off-Hand', 'Ring', 'Cape'];

export function EquipmentTab({ data }: { data: CharacterData }) {
  const eqMap = new Map(data.equipSlots.map(s => [s.label, s]));

  const renderSlot = (label: string) => {
    const slot = eqMap.get(label);
    return (
      <div className={css.eqSlot} key={label} title={slot?.item ? `${slot.item.name} (T${slot.item.tier})` : label}>
        <span className={css.eqSlotLabel}>{slot?.icon || '·'} {label}</span>
        {slot?.item ? (
          <span className={css.eqSlotItem}>{slot.item.name}</span>
        ) : (
          <span className={css.eqSlotItem} style={{ color: '#6b5535' }}>Empty</span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={css.sectionTitle}>Equipped Gear</div>
      <div className={css.equipLayout}>
        <div className={css.equipStack}>{LEFT_EQUIP.map(renderSlot)}</div>
        <div className={css.eqCenter}>
          <HeroPreview data={data} size={120} showName={false} showStats={false} animate={true} />
        </div>
        <div className={css.equipStack}>{RIGHT_EQUIP.map(renderSlot)}</div>
      </div>

      {data.setBonuses.length > 0 && (
        <>
          <div className={css.sectionTitle}>Set Bonuses</div>
          {data.setBonuses.map((sb, i) => (
            <div key={i} style={{ fontSize: 12, color: '#a87ddb', marginBottom: 4 }}>{sb.setName} ({sb.pieces}pc active)</div>
          ))}
        </>
      )}
    </>
  );
}
