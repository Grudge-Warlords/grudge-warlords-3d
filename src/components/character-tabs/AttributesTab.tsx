import { useState, useRef, useEffect } from 'react';
import css from '../MainPanel.module.css';
import { CharacterData } from '@/game/character-data';
import { AttributeId } from '@/game/attributes';
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';

// Register Chart.js components for radar chart
Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

// Build power tiers from the character builder
const BUILD_TIERS = [
  { name: 'Unclassified', minPower: 0,     color: '#4b5563', border: '#4b5563' },
  { name: 'Normal',       minPower: 1000,  color: '#9ca3af', border: '#9ca3af' },
  { name: 'Hero',         minPower: 2500,  color: '#3b82f6', border: '#3b82f6' },
  { name: 'Epic',         minPower: 4000,  color: '#a855f7', border: '#a855f7' },
  { name: 'Warlord',      minPower: 6000,  color: '#f97316', border: '#f97316' },
  { name: 'Mystic Diamond',minPower: 8000, color: '#89f7fe', border: '#89f7fe' },
];

function getBuildTier(power: number) {
  for (let i = BUILD_TIERS.length - 1; i >= 0; i--) {
    if (power >= BUILD_TIERS[i].minPower) return BUILD_TIERS[i];
  }
  return BUILD_TIERS[0];
}

function getBuildRating(power: number): string {
  if (power >= 8000) return 'S';
  if (power >= 6000) return 'A';
  if (power >= 4000) return 'B';
  if (power >= 2500) return 'C';
  if (power >= 1000) return 'D';
  return 'F';
}

const ATTR_EMOJI: Record<string, string> = {
  strength: '💪', intellect: '🧠', vitality: '❤️', dexterity: '🎯',
  endurance: '🛡️', wisdom: '📖', agility: '🏃', tactics: '⚔️',
};

interface DerivedRow { label: string; val: string; icon: string; color?: string }

export function AttributesTab({ data }: { data: CharacterData }) {
  const [, forceUpdate] = useState(0);
  const summary = data.attributeSummary;
  if (!summary) return null;
  const d = summary.derived;

  const handleAllocate = (id: AttributeId) => {
    data.allocateAttribute(id);
    forceUpdate(n => n + 1);
  };

  const fmt = (n: number, dec = 1) => n.toFixed(dec);
  const pct = (n: number) => `${fmt(n)}%`;

  const resources: DerivedRow[] = [
    { label: 'Bonus HP',      val: `+${Math.floor(d.health)}`,  icon: '❤️', color: '#ef4444' },
    { label: 'Bonus MP',      val: `+${Math.floor(d.mana)}`,    icon: '💧', color: '#3b82f6' },
    { label: 'Bonus Stamina',  val: `+${Math.floor(d.stamina)}`, icon: '⚡', color: '#f59e0b' },
  ];

  const offense: DerivedRow[] = [
    { label: 'Damage',         val: `+${fmt(d.damage)}`,         icon: '⚔️' },
    { label: 'Crit Chance',    val: pct(d.criticalChance),        icon: '💥', color: '#f59e0b' },
    { label: 'Crit Damage',    val: `×${fmt(d.criticalDamage, 2)}`, icon: '🔥' },
    { label: 'Attack Speed',   val: `+${pct(d.attackSpeed)}`,     icon: '⚡' },
    { label: 'Accuracy',       val: pct(d.accuracy),              icon: '🎯' },
    { label: 'Spell Accuracy', val: pct(d.spellAccuracy),         icon: '✨' },
    { label: 'Armor Pen',      val: pct(d.armorPenetration),      icon: '🗡️' },
    { label: 'Block Pen',      val: pct(d.blockPenetration),      icon: '🔓' },
    { label: 'Def Break',      val: pct(d.defenseBreak),          icon: '💔' },
    { label: 'Stagger',        val: pct(d.stagger),               icon: '🌀' },
    { label: 'Lifesteal',      val: pct(d.drainHealth),           icon: '🧛', color: '#be123c' },
  ];

  const defense: DerivedRow[] = [
    { label: 'Defense',        val: `+${Math.floor(d.defense)}`,  icon: '🛡️' },
    { label: 'Block Chance',   val: pct(d.block),                 icon: '🪨', color: '#6366f1' },
    { label: 'Block Effect',   val: pct(d.blockEffect),           icon: '🛡️' },
    { label: 'Evasion',        val: pct(d.evasion),               icon: '💨', color: '#10b981' },
    { label: 'Resistance',     val: pct(d.resistance),            icon: '🔮' },
    { label: 'Armor',          val: `+${fmt(d.armor)}`,           icon: '🪖' },
    { label: 'CC Resist',      val: pct(d.ccResistance),          icon: '⛓️' },
    { label: 'Crit Evasion',   val: pct(d.criticalEvasion),       icon: '🌀' },
    { label: 'Bleed Resist',   val: pct(d.bleedResist),           icon: '🩸' },
  ];

  const utility: DerivedRow[] = [
    { label: 'Move Speed',     val: `+${pct(d.movementSpeed)}`,   icon: '🏃', color: '#10b981' },
    { label: 'CDR',            val: pct(d.cooldownReduction),     icon: '⏱️' },
    { label: 'HP Regen',       val: `${fmt(d.healthRegen, 2)}/s`, icon: '💚' },
    { label: 'MP Regen',       val: `${fmt(d.manaRegen, 2)}/s`,   icon: '💧' },
    { label: 'Dodge CDR',      val: pct(d.dodge),                 icon: '💨' },
    { label: 'Ability Cost',   val: `-${pct(d.abilityCost)}`,     icon: '📘' },
    { label: 'Heal Power',     val: `×${fmt(d.healPower, 2)}`,    icon: '💚' },
    { label: 'Fall Dmg Reduce', val: pct(d.fallDamage),            icon: '🪂' },
  ];

  const renderSection = (title: string, rows: DerivedRow[]) => (
    <>
      <div className={css.sectionTitle} style={{ fontSize: 11, opacity: 0.75, marginTop: 10, marginBottom: 4 }}>{title}</div>
      <div className={css.attrGrid}>
        {rows.map(r => (
          <div key={r.label} className={css.attrCard} style={{ padding: '6px 10px' }}>
            <div className={css.attrIcon} style={{ fontSize: 13 }}>{r.icon}</div>
            <div style={{ flex: 1 }}>
              <div className={css.attrName} style={{ fontSize: 10 }}>{r.label}</div>
            </div>
            <div className={css.attrVal} style={{ fontSize: 11, color: r.color || '#f5e2c1' }}>{r.val}</div>
          </div>
        ))}
      </div>
    </>
  );

  // Combat power calculation (from character builder)
  const combatPower = Math.floor(
    d.health * 0.5 + d.mana * 0.3 + d.stamina * 0.2 +
    d.damage * 8 + d.defense * 2 + d.block * 20 +
    d.criticalChance * 30 + d.criticalDamage * 15 +
    d.evasion * 25 + d.resistance * 20 +
    d.armorPenetration * 18 + d.cooldownReduction * 12 +
    d.movementSpeed * 10 + d.drainHealth * 40
  );
  const tier = getBuildTier(combatPower);
  const rating = getBuildRating(combatPower);

  // Spider graph data
  const radarRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!radarRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const attrValues = summary.attrs.map(a => a.total);
    const attrLabels = summary.attrs.map(a => a.name);
    const maxVal = Math.max(40, ...attrValues);

    chartRef.current = new Chart(radarRef.current, {
      type: 'radar',
      data: {
        labels: attrLabels,
        datasets: [{
          label: 'Attributes',
          data: attrValues,
          backgroundColor: `${tier.color}20`,
          borderColor: tier.color,
          borderWidth: 2,
          pointBackgroundColor: tier.color,
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: maxVal + 5,
            ticks: { display: false },
            grid: { color: 'rgba(255,255,255,0.08)' },
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { color: '#9b8a6a', font: { size: 10 } },
          },
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
      },
    });

    return () => { chartRef.current?.destroy(); };
  }, [summary.attrs.map(a => a.total).join(',')]);

  return (
    <>
      {/* Build Power Card */}
      <div style={{
        textAlign: 'center', padding: 12, marginBottom: 12, borderRadius: 10,
        border: `2px solid ${tier.color}`, background: `${tier.color}08`,
        boxShadow: `0 0 20px ${tier.color}22`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: tier.color }}>{tier.name}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#e8d5b0', margin: '2px 0' }}>Combat Power</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24' }}>{combatPower.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: '#8a7a5a' }}>Build Rating: <span style={{ fontWeight: 800, fontSize: 16, color: tier.color }}>{rating}</span></div>
      </div>

      {/* Spider Graph */}
      <div style={{ height: 200, marginBottom: 12 }}>
        <canvas ref={radarRef} />
      </div>

      {/* Attributes with + buttons */}
      <div className={css.sectionTitle}>
        Attributes
        {summary.unspentPoints > 0 && <span style={{ color: '#6ec96e', fontSize: 11, marginLeft: 8 }}>({summary.unspentPoints} pts)</span>}
      </div>
      <div className={css.attrGrid}>
        {summary.attrs.map(attr => (
          <div key={attr.id} className={css.attrCard}>
            <div className={css.attrIcon}>{ATTR_EMOJI[attr.id] || '✦'}</div>
            <div>
              <div className={css.attrName}>{attr.name}</div>
              <div className={css.attrVal}>{attr.total}</div>
              <div className={css.attrDesc}>{attr.short} — base {attr.base} +{attr.bonus}</div>
            </div>
            {summary.unspentPoints > 0 && (
              <button className={css.attrBtn} onClick={() => handleAllocate(attr.id)}>+</button>
            )}
          </div>
        ))}
      </div>

      {renderSection('⚔️ Resources', resources)}
      {renderSection('⚔️ Offense', offense)}
      {renderSection('🛡️ Defense', defense)}
      {renderSection('🔧 Utility', utility)}
    </>
  );
}
