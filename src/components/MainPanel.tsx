import { useState, useRef, useEffect, useCallback } from 'react';
import css from './MainPanel.module.css';
import { OWHudState } from '@/game/open-world';
import { OpenWorldState } from '@/game/open-world';
import { allocateOWAttribute, claimOWMission, equipBagItemOW } from '@/game/open-world';
import { AttributeId } from '@/game/attributes';
import { HeroData, AbilityDef, CLASS_COLORS, ABILITY_ICONS, RACE_COLORS } from '@/game/types';
import { VoxelRenderer } from '@/game/voxel';

/* ── Emoji helpers for attributes ── */
const ATTR_EMOJI: Record<string, string> = {
  strength: '💪', intellect: '🧠', vitality: '❤️', dexterity: '🎯',
  endurance: '🛡️', wisdom: '📖', agility: '🏃', tactics: '⚔️',
};

/* ── Tab definitions ── */
type Tab = 'equip' | 'attrs' | 'class' | 'weapon' | 'upgrades' | 'crafting' | 'quests' | 'guild';
const TABS: { id: Tab; label: string }[] = [
  { id: 'equip', label: 'Equipment' },
  { id: 'attrs', label: 'Attributes' },
  { id: 'class', label: 'Class Skills' },
  { id: 'weapon', label: 'Weapon Skills' },
  { id: 'upgrades', label: 'Upgrades' },
  { id: 'crafting', label: 'Crafting' },
  { id: 'quests', label: 'Quests' },
  { id: 'guild', label: 'Guild' },
];

/* ── Equipment slot layout ── */
const LEFT_EQUIP = ['Helm', 'Chest', 'Legs', 'Boots'];
const RIGHT_EQUIP = ['Mainhand', 'Offhand', 'Ring', 'Cape'];
const EXTRA_EQUIP = ['Relic', 'Trinket'];

/* ── Weapon Mastery Trees ── */
const WEAPON_TREES: Record<string, { name: string; icon: string; tiers: { name: string; desc: string; level: number }[] }> = {
  sword: { name: 'Sword', icon: '⚔️', tiers: [
    { name: 'Basic Slash', desc: 'Standard sword combo attacks', level: 1 },
    { name: 'Parry Riposte', desc: 'Perfect parry deals counter damage', level: 5 },
    { name: 'Blade Dance', desc: 'AoE spin attack hitting all nearby', level: 10 },
    { name: 'Executioner', desc: 'Bonus damage to targets below 30% HP', level: 15 },
  ]},
  bow: { name: 'Bow', icon: '🏹', tiers: [
    { name: 'Steady Shot', desc: 'Basic ranged attack', level: 1 },
    { name: 'Multi-Shot', desc: 'Fire 3 arrows in a fan', level: 5 },
    { name: 'Rain of Arrows', desc: 'AoE barrage in target area', level: 10 },
    { name: 'Sniper\'s Mark', desc: 'Headshots deal 2x crit damage', level: 15 },
  ]},
  staff: { name: 'Staff', icon: '🪄', tiers: [
    { name: 'Arcane Bolt', desc: 'Basic magic projectile', level: 1 },
    { name: 'Mana Surge', desc: 'Abilities cost 20% less mana', level: 5 },
    { name: 'Elemental Mastery', desc: 'Spell damage increased by 15%', level: 10 },
    { name: 'Arcane Cataclysm', desc: 'Ultimate AoE spell unlocked', level: 15 },
  ]},
  dagger: { name: 'Dagger', icon: '🗡️', tiers: [
    { name: 'Quick Strike', desc: 'Fast melee attacks', level: 1 },
    { name: 'Poison Edge', desc: 'Attacks apply poison DoT', level: 5 },
    { name: 'Shadow Step', desc: 'Dash behind target on crit', level: 10 },
    { name: 'Death Mark', desc: 'Marked target takes 25% more damage', level: 15 },
  ]},
  mace: { name: 'Mace', icon: '🔨', tiers: [
    { name: 'Crushing Blow', desc: 'Slow but powerful strikes', level: 1 },
    { name: 'Armor Break', desc: 'Reduce target defense by 15%', level: 5 },
    { name: 'Stun Bash', desc: 'Chance to stun on hit', level: 10 },
    { name: 'Earthquake', desc: 'Ground slam AoE stun', level: 15 },
  ]},
  spear: { name: 'Spear', icon: '🔱', tiers: [
    { name: 'Thrust', desc: 'Extended reach attack', level: 1 },
    { name: 'Impale', desc: 'Pierce through multiple targets', level: 5 },
    { name: 'Whirlwind Sweep', desc: '360° AoE attack', level: 10 },
    { name: 'Dragon Lance', desc: 'Massive range charge attack', level: 15 },
  ]},
  shield: { name: 'Shield', icon: '🛡️', tiers: [
    { name: 'Block', desc: 'Reduce incoming damage', level: 1 },
    { name: 'Shield Bash', desc: 'Stun and push back enemies', level: 5 },
    { name: 'Phalanx', desc: 'Nearby allies gain block chance', level: 10 },
    { name: 'Invincible Wall', desc: 'Brief full damage immunity', level: 15 },
  ]},
  crossbow: { name: 'Crossbow', icon: '🎯', tiers: [
    { name: 'Bolt Shot', desc: 'Heavy single-target shot', level: 1 },
    { name: 'Explosive Bolt', desc: 'AoE damage on impact', level: 5 },
    { name: 'Rapid Fire', desc: 'Triple shot burst', level: 10 },
    { name: 'Siege Engine', desc: 'Massive damage to structures', level: 15 },
  ]},
};

/* ── Upgrade Definitions ── */
const UPGRADES = [
  { name: 'Armor Reinforcement', icon: '🛡️', desc: 'Increase base armor by 5 per level', maxLevel: 10, stat: 'DEF +5', cost: 200 },
  { name: 'Weapon Sharpening', icon: '⚔️', desc: 'Increase base attack by 3 per level', maxLevel: 10, stat: 'ATK +3', cost: 200 },
  { name: 'Mana Conduit', icon: '🔮', desc: 'Increase max mana by 20 per level', maxLevel: 10, stat: 'MP +20', cost: 150 },
  { name: 'Swift Feet', icon: '🏃', desc: 'Increase movement speed by 5% per level', maxLevel: 5, stat: 'SPD +5%', cost: 300 },
  { name: 'Vitality Boost', icon: '❤️', desc: 'Increase max HP by 50 per level', maxLevel: 10, stat: 'HP +50', cost: 175 },
  { name: 'Critical Eye', icon: '💥', desc: 'Increase crit chance by 2% per level', maxLevel: 5, stat: 'CRIT +2%', cost: 350 },
  { name: 'Lifesteal Rune', icon: '🩸', desc: 'Gain 1% lifesteal per level', maxLevel: 5, stat: 'DRAIN +1%', cost: 400 },
  { name: 'Cooldown Mastery', icon: '⏱️', desc: 'Reduce cooldowns by 3% per level', maxLevel: 5, stat: 'CDR +3%', cost: 350 },
];

/* ── Inline Voxel Hero Canvas ── */
function VoxelHeroCanvas({ race, heroClass, heroName }: { race: string; heroClass: string; heroName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const voxelRef = useRef<VoxelRenderer | null>(null);
  const animRef = useRef<number>(0);
  // Use performance.now() so idle breathing is visible from first frame
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!voxelRef.current) voxelRef.current = new VoxelRenderer();
    const voxel = voxelRef.current;
    const ctx = canvas.getContext('2d')!;
    let running = true;
    startRef.current = performance.now();

    function frame() {
      if (!running) return;
      const gt = (performance.now() - startRef.current) / 1000;
      // Slow oscillating rotation: sweeps ±30° around a base south-east facing
      const baseFacing = Math.PI * 0.45;
      const facing = baseFacing + Math.sin(gt * 0.6) * 0.5;

      ctx.clearRect(0, 0, 148, 160);
      // Background gradient
      const g = ctx.createRadialGradient(74, 85, 0, 74, 85, 90);
      g.addColorStop(0, '#2a2218');
      g.addColorStop(1, '#1a1410');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 148, 160);
      // Subtle floor reflection
      const fg = ctx.createLinearGradient(0, 110, 0, 140);
      fg.addColorStop(0, 'rgba(197,160,89,0.06)');
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.fillRect(20, 110, 108, 30);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(74, 125, 32, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hero
      voxel.drawHeroVoxel(
        ctx, 74, 112,
        RACE_COLORS[race] || '#c4956a',
        CLASS_COLORS[heroClass] || '#8b8b8b',
        heroClass,
        facing,
        'idle',
        gt, // FSM timer (reused as animTimer)
        race,
        heroName,
        undefined, undefined, undefined, undefined, undefined,
        gt, // gameTime — drives smooth idle breathing
      );
      animRef.current = requestAnimationFrame(frame);
    }
    frame();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [race, heroClass, heroName]);

  return (
    <canvas
      ref={canvasRef}
      width={148}
      height={160}
      style={{ width: 148, height: 160, borderRadius: 8, imageRendering: 'pixelated' }}
    />
  );
}

interface Props {
  hud: OWHudState;
  stateRef: React.MutableRefObject<OpenWorldState | null>;
  heroData: HeroData | undefined;
  abilities: AbilityDef[];
  abilityNames: string[];
  abilityDescs: string[];
  onClose: () => void;
}

export default function MainPanel({ hud, stateRef, heroData, abilities, abilityNames, abilityDescs, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('equip');

  const hpPct = hud.maxHp > 0 ? (hud.hp / hud.maxHp) * 100 : 0;
  const mpPct = hud.maxMp > 0 ? (hud.mp / hud.maxMp) * 100 : 0;
  const stPct = hud.maxStamina > 0 ? (hud.stamina / hud.maxStamina) * 100 : 0;

  /* ── Equipment slot lookup ── */
  const eqMap = new Map(hud.equipSlots.map(s => [s.label, s]));

  return (
    <div className={css.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* ═══ TOP BAR ═══ */}
      <div className={css.topBar}>
        <div className={css.logo}>
          <h1 className={css.logoTitle}>Grudge Warlords</h1>
          <span className={css.logoSub}>— {hud.heroClass} —</span>
        </div>

        <div className={css.resourceBars}>
          <div className={css.resBar}>
            <div className={`${css.resFill} ${css.hpFill}`} style={{ width: `${hpPct}%` }} />
            <span className={css.resLabel}>{hud.hp}/{hud.maxHp}</span>
          </div>
          <div className={css.resBar}>
            <div className={`${css.resFill} ${css.mpFill}`} style={{ width: `${mpPct}%` }} />
            <span className={css.resLabel}>{hud.mp}/{hud.maxMp}</span>
          </div>
          <div className={css.resBar}>
            <div className={`${css.resFill} ${css.spFill}`} style={{ width: `${stPct}%` }} />
            <span className={css.resLabel}>{Math.round(hud.stamina)}/{hud.maxStamina}</span>
          </div>
        </div>

        <div className={css.playerInfo}>
          <span className={css.playerName}>{hud.heroName}</span>
          <span className={css.playerLevel}>Lv{hud.level} {hud.heroRace} {hud.heroClass}</span>
        </div>

        <button className={css.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* ═══ MAIN BODY ═══ */}
      <div className={css.mainBody}>

        {/* ── Left Column: Character Preview + Stats ── */}
        <div className={css.leftCol}>
          <div className={css.charPreview}>
            <VoxelHeroCanvas race={hud.heroRace} heroClass={hud.heroClass} heroName={hud.heroName} />
          </div>

          {/* Core Stats */}
          <div className={css.statSection}>
            <h3>Core Stats</h3>
            <div className={css.statRow}><span className={css.statKey}>ATK</span><span className={css.statVal}>{hud.atk}</span></div>
            <div className={css.statRow}><span className={css.statKey}>DEF</span><span className={css.statVal}>{hud.def}</span></div>
            <div className={css.statRow}><span className={css.statKey}>SPD</span><span className={css.statVal}>{hud.spd}</span></div>
            <div className={css.statRow}><span className={css.statKey}>Level</span><span className={css.statVal}>{hud.level}</span></div>
            <div className={css.statRow}><span className={css.statKey}>XP</span><span className={css.statVal}>{hud.xp}/{hud.xpToNext}</span></div>
          </div>

          {/* Derived Stats */}
          {hud.attributeSummary && (
            <div className={css.statSection}>
              <h3>Derived Stats</h3>
              <div className={css.statRow}><span className={css.statKey}>Bonus HP</span><span className={css.statValGreen}>+{hud.attributeSummary.derived.bonusHp}</span></div>
              <div className={css.statRow}><span className={css.statKey}>Bonus MP</span><span className={css.statVal}>+{hud.attributeSummary.derived.bonusMp}</span></div>
              <div className={css.statRow}><span className={css.statKey}>Phys ATK</span><span className={css.statVal}>+{hud.attributeSummary.derived.bonusAtk}</span></div>
              <div className={css.statRow}><span className={css.statKey}>Mag ATK</span><span className={css.statVal}>+{hud.attributeSummary.derived.bonusMagicDmg}</span></div>
              <div className={css.statRow}><span className={css.statKey}>Crit</span><span className={css.statVal}>{hud.attributeSummary.derived.criticalChance.toFixed(1)}%</span></div>
              <div className={css.statRow}><span className={css.statKey}>Evasion</span><span className={css.statVal}>{hud.attributeSummary.derived.evasionChance.toFixed(1)}%</span></div>
            </div>
          )}

          {/* Reputation / Progress */}
          <div className={css.statSection}>
            <h3>Progress</h3>
            <div className={css.statRow}><span className={css.statKey}>Reputation</span><span className={css.statVal} style={{ color: hud.reputationColor }}>{hud.reputationRank}</span></div>
            <div className={css.statRow}><span className={css.statKey}>Zones</span><span className={css.statVal}>{hud.zonesDiscovered}</span></div>
            <div className={css.statRow}><span className={css.statKey}>Kills</span><span className={css.statVal}>{hud.monstersSlain}</span></div>
            <div className={css.statRow}><span className={css.statKey}>Bosses</span><span className={css.statVal}>{hud.bossesDefeated}</span></div>
          </div>
        </div>

        {/* ── Center Column: Tabs ── */}
        <div className={css.centerCol}>
          <div className={css.tabStrip}>
            {TABS.map(t => (
              <button
                key={t.id}
                className={tab === t.id ? css.tabBtnActive : css.tabBtn}
                onClick={() => setTab(t.id)}
              >{t.label}</button>
            ))}
          </div>
          <div className={css.contentArea}>

            {/* ── Equipment ── */}
            {tab === 'equip' && <EquipmentTab hud={hud} eqMap={eqMap} stateRef={stateRef} />}

            {/* ── Attributes ── */}
            {tab === 'attrs' && <AttributesTab hud={hud} stateRef={stateRef} />}

            {/* ── Class Skills ── */}
            {tab === 'class' && <ClassSkillsTab hud={hud} abilities={abilities} />}

            {/* ── Weapon Skills ── */}
            {tab === 'weapon' && <WeaponSkillsTab hud={hud} abilityNames={abilityNames} abilityDescs={abilityDescs} />}

            {/* ── Upgrades (placeholder) ── */}
            {tab === 'upgrades' && <UpgradesTab />}

            {/* ── Crafting / Professions ── */}
            {tab === 'crafting' && <CraftingTab hud={hud} />}

            {/* ── Quests ── */}
            {tab === 'quests' && <QuestsTab hud={hud} stateRef={stateRef} />}

            {/* ── Guild (placeholder) ── */}
            {tab === 'guild' && <GuildTab />}
          </div>
        </div>

        {/* ── Right Column: Inventory ── */}
        <InventoryPanel hud={hud} stateRef={stateRef} rerender={() => {}} />
      </div>

      {/* ═══ BOTTOM BAR — Hotbar ═══ */}
      <div className={css.bottomBar}>
        <div className={css.hotbar}>
          {/* Skill slots 1-4 — actual abilities with their key bindings */}
          {abilities.slice(0, 4).map((ab, i) => {
            const cd = hud.abilityCooldowns[i] || 0;
            const name = abilityNames[i] || ab.name;
            return (
              <div key={`ab-${i}`} className={css.hbSlot} title={`${name}: ${abilityDescs[i] || ab.description}`} style={cd > 0 ? { opacity: 0.5 } : undefined}>
                <span className={css.hbKey}>{ab.key}</span>
                {name && <span style={{ fontSize: 8, textAlign: 'center', color: '#f5e2c1', lineHeight: 1.1 }}>{name.slice(0, 6)}</span>}
                {cd > 0 && <span style={{ position: 'absolute', bottom: 2, fontSize: 8, color: '#d4a400' }}>{cd.toFixed(1)}</span>}
              </div>
            );
          })}
          {/* Slot 5 — empty spacer */}
          <div className={css.hbSlot} style={{ opacity: 0.3 }}>
            <span className={css.hbKey}>5</span>
          </div>
          {/* Consumable slots 6-8 */}
          {[6, 7, 8].map(key => (
            <div key={`con-${key}`} className={css.hbSlot} title="Consumable slot">
              <span className={css.hbKey}>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   SHARED: Item Tooltip
   ═════════════════════════════════════════════════════════════════ */

const SLOT_EMOJI: Record<string, string> = {
  helm: '🪖', shoulder: '🦺', chest: '👘', hands: '🧤',
  feet: '💟', ring: '💍', necklace: '💿', cape: '🧣',
  mainhand: '⚔️', offhand: '🛡️',
};

const TIER_COLORS: Record<number, string> = {
  1: '#9ca3af', 2: '#6ec96e', 3: '#60a5fa', 4: '#a855f7',
  5: '#f59e0b', 6: '#ef4444', 7: '#ff6bff', 8: '#ffd700',
};

interface BagItem { id: string; name: string; slot: string; tier: number; atk: number; def: number; hp: number; mp: number; iconUrl?: string; passive?: string; lore?: string; setName: string; }

function ItemTooltip({ item }: { item: BagItem }) {
  return (
    <div className={css.itemTooltip}>
      <div className={css.ttTitle} style={{ color: TIER_COLORS[item.tier] || '#d4a400' }}>
        {item.name}
      </div>
      <div className={css.ttMeta}>
        {SLOT_EMOJI[item.slot] || '•'} {item.slot} · <span style={{ color: TIER_COLORS[item.tier] }}>T{item.tier}</span>
        {item.setName && item.setName !== 'Unknown' && <span style={{ color: '#a855f7' }}> · {item.setName} Set</span>}
      </div>
      <div className={css.ttStats}>
        {item.atk > 0 && <span className={css.ttStat} style={{ color: '#ef4444' }}>⚔ ATK +{item.atk}</span>}
        {item.def > 0 && <span className={css.ttStat} style={{ color: '#60a5fa' }}>🛡 DEF +{item.def}</span>}
        {item.hp > 0 && <span className={css.ttStat} style={{ color: '#22c55e' }}>❤ HP +{item.hp}</span>}
        {item.mp > 0 && <span className={css.ttStat} style={{ color: '#818cf8' }}>🔮 MP +{item.mp}</span>}
      </div>
      {item.passive && <div className={css.ttPassive}>• {item.passive}</div>}
      {item.lore && <div className={css.ttLore}>&ldquo;{item.lore}&rdquo;</div>}
      <div className={css.ttHint}>Double-click or drag to equip</div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   INVENTORY PANEL (right column)
   ═════════════════════════════════════════════════════════════════ */

function InventoryPanel({ hud, stateRef, rerender }: { hud: OWHudState; stateRef: React.MutableRefObject<OpenWorldState | null>; rerender: () => void }) {
  const [, forceRender] = useState(0);
  const refresh = useCallback(() => forceRender(n => n + 1), []);
  const [hoveredItem, setHoveredItem] = useState<BagItem | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);

  const handleEquip = useCallback((itemId: string) => {
    if (!stateRef.current) return;
    equipBagItemOW(stateRef.current, itemId);
    refresh();
  }, [stateRef, refresh]);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('itemId', itemId);
    setDragging(itemId);
  };

  const handleDragEnd = () => setDragging(null);

  return (
    <div className={css.rightCol}>
      <div className={css.invHeader}>
        <h3>Inventory</h3>
        <span className={css.goldDisplay}>🪙 {hud.gold}g</span>
      </div>
      <div className={css.invGrid}>
        {Array.from({ length: 36 }).map((_, i) => {
          const item = hud.bagItems[i] as BagItem | undefined;
          return (
            <div
              key={i}
              className={`${css.invCell} ${item ? css.invCellFilled : ''} ${dragging === item?.id ? css.invCellDragging : ''}`}
              draggable={!!item}
              onDragStart={item ? (e) => handleDragStart(e, item.id) : undefined}
              onDragEnd={handleDragEnd}
              onDoubleClick={item ? () => handleEquip(item.id) : undefined}
              onMouseEnter={item ? (e) => { setHoveredItem(item); setHoverPos({ x: e.clientX, y: e.clientY }); } : undefined}
              onMouseMove={item ? (e) => setHoverPos({ x: e.clientX, y: e.clientY }) : undefined}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {item && (
                <>
                  {item.iconUrl
                    ? <img src={item.iconUrl} alt={item.name} className={css.invIcon} draggable={false} />
                    : <span className={css.invSlotEmoji}>{SLOT_EMOJI[item.slot] || '•'}</span>
                  }
                  <div className={css.invTierBadge} style={{ color: TIER_COLORS[item.tier] }}>T{item.tier}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Trash zone */}
      <div className={css.trashZone}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          const id = e.dataTransfer.getData('itemId');
          if (id && stateRef.current) {
            const { removeFromBag: removeFn, saveEquipmentBag: saveBag } = require('@/game/equipment');
            removeFn(stateRef.current.equipmentBag, id);
            saveBag(stateRef.current.equipmentBag);
            refresh();
          }
        }}
      >
        <div className={css.trashSlot}>🗑</div>
        <span className={css.trashLabel}>Drag to destroy</span>
      </div>

      {/* Floating tooltip */}
      {hoveredItem && (
        <div
          style={{ position: 'fixed', left: hoverPos.x + 14, top: hoverPos.y - 10, zIndex: 99999, pointerEvents: 'none' }}
        >
          <ItemTooltip item={hoveredItem} />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   TAB COMPONENTS
   ═════════════════════════════════════════════════════════════════ */

/* ── Equipment Tab ── */
function EquipmentTab({ hud, eqMap, stateRef }: { hud: OWHudState; eqMap: Map<string, typeof hud.equipSlots[0]>; stateRef: React.MutableRefObject<OpenWorldState | null> }) {
  const [, forceRender] = useState(0);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, slotLabel: string) => {
    e.preventDefault();
    setDragOver(null);
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId || !stateRef.current) return;
    // Only equip if the item matches the slot
    const item = stateRef.current.equipmentBag.items.find(i => i.id === itemId);
    if (!item) return;
    const targetSlot = eqMap.get(slotLabel);
    if (targetSlot && item.slot.toLowerCase() !== targetSlot.slot.toLowerCase()) {
      return; // Wrong slot type
    }
    equipBagItemOW(stateRef.current, itemId);
    forceRender(n => n + 1);
  };

  const renderSlot = (label: string) => {
    const slot = eqMap.get(label);
    const isDragOver = dragOver === label;
    return (
      <div
        key={label}
        className={`${css.eqSlot} ${isDragOver ? css.eqSlotOver : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(label); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => handleDrop(e, label)}
      >
        <span className={css.eqSlotLabel}>
          {slot?.icon || SLOT_EMOJI[slot?.slot || ''] || '·'} {label}
        </span>
        {slot?.item ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {slot.item.iconUrl && (
              <img
                src={slot.item.iconUrl}
                alt={slot.item.name}
                style={{ width: 20, height: 20, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
              />
            )}
            <div>
              <div style={{ fontSize: 8, color: TIER_COLORS[slot.item.tier], fontWeight: 700 }}>T{slot.item.tier} {slot.item.setName !== 'Unknown' ? slot.item.setName : ''}</div>
              <span className={css.eqSlotItem}>{slot.item.name}</span>
            </div>
          </div>
        ) : (
          <span className={css.eqSlotItem} style={{ color: isDragOver ? '#d4a400' : '#6b5535' }}>
            {isDragOver ? 'Drop here' : 'Empty'}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={css.sectionTitle}>Equipped Gear</div>
      <div className={css.equipLayout}>
        <div className={css.equipStack}>{LEFT_EQUIP.map(renderSlot)}</div>
        <div className={css.eqCenter}>{hud.heroRace}<br />{hud.heroClass}</div>
        <div className={css.equipStack}>{RIGHT_EQUIP.map(renderSlot)}</div>
      </div>
      <div className={css.sectionTitle}>Accessories</div>
      <div className={css.equipLayout}>
        <div className={css.equipStack}>{EXTRA_EQUIP.map(renderSlot)}</div>
      </div>

      {hud.setBonuses.length > 0 && (
        <>
          <div className={css.sectionTitle}>Set Bonuses</div>
          {hud.setBonuses.map((sb, i) => (
            <div key={i} style={{ fontSize: 12, color: '#a87ddb', marginBottom: 4 }}>{sb.setName} ({sb.pieces}pc active)</div>
          ))}
        </>
      )}

      <div style={{ marginTop: 10, fontSize: 10, color: '#6b5535', textAlign: 'center' }}>
        Drag items from inventory → slots · Double-click to auto-equip
      </div>
    </>
  );
}

/* ── Attributes Tab ── */
function AttributesTab({ hud, stateRef }: { hud: OWHudState; stateRef: React.MutableRefObject<OpenWorldState | null> }) {
  const summary = hud.attributeSummary;
  if (!summary) return null;

  return (
    <>
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
              <button className={css.attrBtn} onClick={() => stateRef.current && allocateOWAttribute(stateRef.current, attr.id as AttributeId)}>+</button>
            )}
          </div>
        ))}
      </div>

      <div className={css.sectionTitle}>Derived Bonuses</div>
      <div className={css.attrGrid}>
        {[
          { label: 'Heal Power', val: `×${summary.derived.healPower.toFixed(2)}`, icon: '💚' },
          { label: 'Ability Bonus', val: `×${summary.derived.abilityBonus.toFixed(2)}`, icon: '🔮' },
          { label: 'Crit Chance', val: `${summary.derived.criticalChance.toFixed(1)}%`, icon: '💥' },
          { label: 'Evasion', val: `${summary.derived.evasionChance.toFixed(1)}%`, icon: '🌀' },
        ].map(d => (
          <div key={d.label} className={css.attrCard}>
            <div className={css.attrIcon}>{d.icon}</div>
            <div>
              <div className={css.attrName}>{d.label}</div>
              <div className={css.attrVal}>{d.val}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Class Skills Tab ── */
function ClassSkillsTab({ hud, abilities }: { hud: OWHudState; abilities: AbilityDef[] }) {
  const tierMap: Record<string, AbilityDef[]> = {};
  abilities.forEach(ab => {
    const tier = ab.slot || 'core';
    (tierMap[tier] ||= []).push(ab);
  });

  return (
    <>
      <div className={css.sectionTitle}>{hud.heroClass} Class Abilities</div>
      {Object.entries(tierMap).map(([tier, abs]) => (
        <div key={tier} className={css.skillTier}>
          <div className={css.tierLabel}>{tier}</div>
          <div className={css.skillGrid}>
            {abs.map((ab, i) => (
              <div key={i} className={css.skillNode}>
                <div className={css.skIcon}>
                  {ABILITY_ICONS[ab.name] ? (
                    <img src={ABILITY_ICONS[ab.name]} alt={ab.name} style={{ width: 28, height: 28, borderRadius: 6 }} draggable={false} />
                  ) : (
                    <span style={{ color: CLASS_COLORS[hud.heroClass] || '#d4a400' }}>{ab.name.substring(0, 2)}</span>
                  )}
                </div>
                <div>
                  <div className={css.skName}>{ab.name} <span style={{ color: '#6b5535' }}>[{ab.key}]</span></div>
                  <div className={css.skDesc}>{ab.description}</div>
                  <div className={css.skMeta}>
                    {ab.damage > 0 && <span className={`${css.chip} ${css.chipDmg}`}>{ab.damage} DMG</span>}
                    <span className={`${css.chip} ${css.chipCd}`}>{ab.cooldown}s CD</span>
                    {ab.manaCost > 0 && <span className={`${css.chip} ${css.chipBuff}`}>{ab.manaCost} MP</span>}
                    {ab.type === 'heal' && <span className={`${css.chip} ${css.chipHeal}`}>HEAL</span>}
                    {ab.type === 'buff' && <span className={`${css.chip} ${css.chipBuff}`}>BUFF</span>}
                    {ab.effect && <span className={`${css.chip} ${css.chipCc}`}>{ab.effect}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Weapon Skills Tab ── */
function WeaponSkillsTab({ hud, abilityNames, abilityDescs }: { hud: OWHudState; abilityNames: string[]; abilityDescs: string[] }) {
  const [selectedWeapon, setSelectedWeapon] = useState<string>('sword');
  const tree = WEAPON_TREES[selectedWeapon];

  return (
    <>
      <div className={css.sectionTitle}>
        Weapon Mastery
        {hud.weaponType && <span style={{ color: '#9b7d52', fontSize: 10, marginLeft: 8 }}>(Equipped: {hud.weaponType})</span>}
      </div>

      {/* Weapon type selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
        {Object.entries(WEAPON_TREES).map(([id, wt]) => (
          <button key={id}
            className={selectedWeapon === id ? css.tabBtnActive : css.tabBtn}
            style={{ fontSize: 10, padding: '3px 8px' }}
            onClick={() => setSelectedWeapon(id)}
          >{wt.icon} {wt.name}</button>
        ))}
      </div>

      {/* Selected weapon tree */}
      {tree && (
        <div className={css.skillGrid}>
          {tree.tiers.map((tier, i) => (
            <div key={i} className={css.skillNode}>
              <div className={css.skIcon}>
                <span style={{ color: '#d4a400', fontWeight: 700, fontSize: 14 }}>{tree.icon}</span>
              </div>
              <div>
                <div className={css.skName}>{tier.name} <span style={{ color: '#6b5535', fontSize: 9 }}>Lv{tier.level}</span></div>
                <div className={css.skDesc}>{tier.desc}</div>
                <div style={{ fontSize: 9, color: i === 0 ? '#6ec96e' : '#6b5535', marginTop: 2 }}>
                  {i === 0 ? '✓ Unlocked' : `Requires Mastery Lv${tier.level}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active weapon abilities (from loadout) */}
      {hud.weaponLoadoutReady && abilityNames.length > 0 && (
        <>
          <div className={css.sectionTitle} style={{ marginTop: 16 }}>Active Weapon Skills</div>
          <div className={css.skillGrid}>
            {abilityNames.map((name, i) => (
              <div key={i} className={css.skillNode}>
                <div className={css.skIcon}>
                  <span style={{ color: '#d4a400', fontWeight: 700 }}>{i + 1}</span>
                </div>
                <div>
                  <div className={css.skName}>{name}</div>
                  <div className={css.skDesc}>{abilityDescs[i]}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Upgrades Tab ── */
function UpgradesTab() {
  const [levels] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    UPGRADES.forEach(u => m[u.name] = 0);
    return m;
  });

  return (
    <>
      <div className={css.sectionTitle}>Upgrades</div>
      <div className={css.upgradeGrid}>
        {UPGRADES.map(u => {
          const lv = levels[u.name] || 0;
          const pct = (lv / u.maxLevel) * 100;
          return (
            <div key={u.name} className={css.upgradeCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{u.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f5e2c1' }}>{u.name}</div>
                  <div style={{ fontSize: 9, color: '#9b7d52' }}>Lv {lv}/{u.maxLevel}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#b8a07a', marginBottom: 4 }}>{u.desc}</div>
              <div className={css.profBar}>
                <div className={css.profFill} style={{ width: `${pct}%`, background: '#d4a400' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#6ec96e' }}>{u.stat}</span>
                <button className={css.attrBtn} disabled={lv >= u.maxLevel} style={{ fontSize: 9, padding: '2px 8px' }}>
                  {lv >= u.maxLevel ? 'MAX' : `Upgrade (${u.cost} 🪙)`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Crafting / Professions Tab ── */
function CraftingTab({ hud }: { hud: OWHudState }) {
  return (
    <>
      <div className={css.sectionTitle}>Gathering Professions</div>
      {hud.gatheringProfs.map(g => (
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
      {hud.craftingProfs.map(c => (
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

/* ── Quests Tab ── */
function QuestsTab({ hud, stateRef }: { hud: OWHudState; stateRef: React.MutableRefObject<OpenWorldState | null> }) {
  return (
    <>
      <div className={css.sectionTitle}>Active Quests</div>
      {hud.activeMissions.length > 0 ? (
        hud.activeMissions.map(m => (
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
            {m.status === 'complete' && (
              <button className={css.craftBtn} style={{ marginTop: 8, width: '100%' }}
                onClick={() => stateRef.current && claimOWMission(stateRef.current, m.id)}
              >Claim Reward</button>
            )}
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b5535' }}>
          No active quests. Visit NPCs or press J to browse available missions.
        </div>
      )}
    </>
  );
}

/* ── Guild Tab ── */
function GuildTab() {
  const MOCK_MEMBERS = [
    { name: 'Warlord Grimjaw', rank: 'Leader', level: 25, cls: 'Warrior', online: true },
    { name: 'Shadowmeld', rank: 'Officer', level: 22, cls: 'Ranger', online: true },
    { name: 'Frostweaver', rank: 'Officer', level: 20, cls: 'Mage', online: false },
    { name: 'Bloodfang', rank: 'Member', level: 18, cls: 'Worg', online: true },
    { name: 'Ironclad', rank: 'Member', level: 15, cls: 'Warrior', online: false },
    { name: 'Nightwhisper', rank: 'Recruit', level: 8, cls: 'Ranger', online: false },
  ];

  return (
    <>
      <div className={css.guildHeader}>
        <div className={css.guildCrest}>⚔</div>
        <div>
          <div className={css.guildName}>The Grudge Warband</div>
          <div style={{ fontSize: 11, color: '#9b7d52' }}>Guild Level 5 — 6 Members — Territory: Crusade Island</div>
        </div>
      </div>

      <div className={css.sectionTitle}>Guild Perks</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {['🛡️ +5% DEF', '⚔️ +3% ATK', '💰 +10% Gold', '🏃 +5% XP'].map(p => (
          <span key={p} style={{ fontSize: 10, background: 'rgba(212,164,0,.1)', border: '1px solid rgba(212,164,0,.2)', borderRadius: 4, padding: '2px 8px', color: '#d4a400' }}>{p}</span>
        ))}
      </div>

      <div className={css.sectionTitle}>Members ({MOCK_MEMBERS.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {MOCK_MEMBERS.map(m => (
          <div key={m.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 10px', background: 'rgba(30,20,10,.4)', borderRadius: 4,
            border: '1px solid rgba(80,60,30,.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.online ? '#6ec96e' : '#6b5535', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: '#f5e2c1', fontWeight: m.rank === 'Leader' ? 700 : 400 }}>{m.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: m.rank === 'Leader' ? '#d4a400' : m.rank === 'Officer' ? '#84b2ff' : '#9b7d52' }}>{m.rank}</span>
              <span style={{ fontSize: 9, color: CLASS_COLORS[m.cls] || '#9b7d52' }}>{m.cls}</span>
              <span style={{ fontSize: 9, color: '#6b5535' }}>Lv{m.level}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={css.sectionTitle} style={{ marginTop: 12 }}>Guild Activities</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Territory War', 'Guild Dungeon', 'Resource Raid', 'Boss Hunt'].map(a => (
          <button key={a} className={css.craftBtn} style={{ fontSize: 10, padding: '4px 12px' }}>{a}</button>
        ))}
      </div>
    </>
  );
}
