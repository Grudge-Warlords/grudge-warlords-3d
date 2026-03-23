import css from '../MainPanel.module.css';

export function UpgradesTab() {
  return (
    <>
      <div className={css.sectionTitle}>Upgrades</div>
      <div className={css.upgradeGrid}>
        {['Armor Reinforcement', 'Weapon Sharpening', 'Mana Conduit', 'Swift Feet'].map(name => (
          <div key={name} className={css.upgradeCard}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#f5e2c1', marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 10, color: '#9b7d52' }}>Coming soon — upgrade your gear and abilities.</div>
          </div>
        ))}
      </div>
    </>
  );
}
