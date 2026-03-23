import css from '../MainPanel.module.css';

export function GuildTab() {
  return (
    <>
      <div className={css.guildHeader}>
        <div className={css.guildCrest}>⚔</div>
        <div>
          <div className={css.guildName}>Your Guild</div>
          <div style={{ fontSize: 11, color: '#9b7d52' }}>Create or join a guild to unlock features</div>
        </div>
      </div>
      <div className={css.sectionTitle}>Members</div>
      <div style={{ textAlign: 'center', padding: 20, color: '#6b5535', fontSize: 11 }}>
        Guild system coming soon. Form crews, claim territory, and compete for faction dominance.
      </div>
    </>
  );
}
