import css from '../MainPanel.module.css';
import { CharacterData } from '@/game/character-data';

export function QuestsTab({ data }: { data: CharacterData }) {
  return (
    <>
      <div className={css.sectionTitle}>Active Quests</div>
      {data.activeMissions.length > 0 ? (
        data.activeMissions.map(m => (
          <div key={m.id} className={css.questCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={css.qTitle}>{m.name}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: m.status === 'complete' ? 'rgba(110,201,110,.15)' : 'rgba(132,178,255,.15)',
                color: m.status === 'complete' ? '#6ec96e' : '#84b2ff',
              }}>{m.status === 'complete' ? 'COMPLETE' : 'ACTIVE'}</span>
            </div>
            {m.objectives.map((o, oi) => (
              <div key={oi} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className={css.qDesc} style={{ textTransform: 'capitalize' }}>{o.type}: {o.target}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: o.current >= o.required ? '#6ec96e' : '#d4a400' }}>{o.current}/{o.required}</span>
              </div>
            ))}
            {m.objectives.length > 0 && (
              <div className={css.qProgress}>
                <div className={css.qFill} style={{ width: `${(m.objectives.reduce((a, o) => a + Math.min(o.current, o.required), 0) / m.objectives.reduce((a, o) => a + o.required, 0)) * 100}%` }} />
              </div>
            )}
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b5535' }}>
          No active quests. Play Open World to pick up missions from NPCs.
        </div>
      )}
    </>
  );
}
