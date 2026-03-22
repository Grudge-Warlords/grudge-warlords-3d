/**
 * Animation Library — master registry of every available animation clip.
 *
 * Each animation has:
 *   - A canonical name (e.g. 'combat.slash_combo')
 *   - The source GLB/FBX file it lives in
 *   - The original clip name inside that file
 *   - Category, tags, duration, loop flag
 *
 * The retarget system (animation-retarget.ts) can apply any clip from this
 * library to any humanoid skeleton regardless of bone naming convention.
 */

// ── Types ──────────────────────────────────────────────────────

export type AnimCategory =
  | 'idle'
  | 'movement'
  | 'combat_melee'
  | 'combat_ranged'
  | 'combat_magic'
  | 'combat_reaction'
  | 'dodge'
  | 'block'
  | 'death'
  | 'social'
  | 'harvesting'
  | 'swimming'
  | 'npc_idle'
  | 'mount'
  | 'misc';

export interface AnimEntry {
  /** Canonical name — unique key used in code */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Category for filtering */
  category: AnimCategory;
  /** Source file (relative to /assets/models/) */
  source: string;
  /** Original clip name inside the source file */
  clipName: string;
  /** Approximate duration in seconds */
  duration: number;
  /** Whether the animation should loop */
  loop: boolean;
  /** Tags for filtering/search */
  tags: string[];
  /** Which classes can use this (empty = all) */
  classes: string[];
}

// ── Registry ───────────────────────────────────────────────────

export const ANIM_LIBRARY: AnimEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // CC0 ESSENTIAL ANIMATIONS (universal — works on any humanoid)
  // These are animation-only FBX files, no mesh. CC0 licensed.
  // ═══════════════════════════════════════════════════════════════
  { id: 'cc0.idle', name: 'CC0 Idle', category: 'idle', source: 'animations/Idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'cc0', 'universal', 'default'], classes: [] },
  { id: 'cc0.run', name: 'CC0 Run', category: 'movement', source: 'animations/Run.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'cc0', 'universal', 'default'], classes: [] },
  { id: 'cc0.attack', name: 'CC0 Attack', category: 'combat_melee', source: 'animations/Attack.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['attack', 'cc0', 'universal', 'melee'], classes: [] },
  { id: 'cc0.hit', name: 'CC0 Hit React', category: 'combat_reaction', source: 'animations/Hit.fbx', clipName: 'mixamo.com', duration: 0.6, loop: false, tags: ['hit', 'cc0', 'universal', 'flinch'], classes: [] },
  { id: 'cc0.death', name: 'CC0 Death', category: 'death', source: 'animations/Death.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['death', 'cc0', 'universal'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // IDLE
  // ═══════════════════════════════════════════════════════════════
  { id: 'idle.basic', name: 'Idle', category: 'idle', source: 'characters/Animated_Human.glb', clipName: 'Human Armature|Idle', duration: 10, loop: true, tags: ['idle', 'default'], classes: [] },
  { id: 'idle.wizard', name: 'Wizard Idle', category: 'idle', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Idle', duration: 3.13, loop: true, tags: ['idle', 'mage'], classes: ['Mage'] },
  { id: 'idle.weapon', name: 'Idle (Weapon Ready)', category: 'idle', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Idle_Weapon', duration: 3.13, loop: true, tags: ['idle', 'weapon', 'combat'], classes: [] },
  { id: 'idle.neutral', name: 'Idle Neutral', category: 'idle', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Idle_Neutral', duration: 2.08, loop: true, tags: ['idle', 'neutral'], classes: [] },
  { id: 'idle.sword', name: 'Idle (Sword)', category: 'idle', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Idle_Sword', duration: 2.08, loop: true, tags: ['idle', 'sword', 'combat'], classes: ['Warrior'] },
  { id: 'idle.gun', name: 'Idle (Gun)', category: 'idle', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Idle_Gun', duration: 2.08, loop: true, tags: ['idle', 'ranged'], classes: ['Ranger'] },
  { id: 'idle.combat_02', name: 'Combat Idle 2', category: 'idle', source: 'characters/berserker.glb', clipName: 'Idle_02', duration: 3.67, loop: true, tags: ['idle', 'combat', 'berserker'], classes: ['Warrior'] },
  { id: 'idle.combat_03', name: 'Combat Idle 3', category: 'idle', source: 'characters/berserker.glb', clipName: 'Idle_03', duration: 2.03, loop: true, tags: ['idle', 'combat'], classes: [] },
  { id: 'idle.combat_toon', name: 'Toon Attack Idle', category: 'idle', source: 'characters/Character_Toon_Animated.glb', clipName: 'Attacking_Idle', duration: 1.67, loop: true, tags: ['idle', 'combat', 'toon'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // MOVEMENT
  // ═══════════════════════════════════════════════════════════════
  { id: 'move.walk', name: 'Walk', category: 'movement', source: 'characters/Animated_Human.glb', clipName: 'Human Armature|Walk', duration: 1.0, loop: true, tags: ['walk', 'default'], classes: [] },
  { id: 'move.run', name: 'Run', category: 'movement', source: 'characters/Animated_Human.glb', clipName: 'Human Armature|Run', duration: 0.63, loop: true, tags: ['run', 'default'], classes: [] },
  { id: 'move.run_fast', name: 'Run Fast', category: 'movement', source: 'characters/ElfRanger.glb', clipName: 'run_fast_2', duration: 1.63, loop: true, tags: ['run', 'fast', 'sprint'], classes: [] },
  { id: 'move.run_forward', name: 'Run Forward', category: 'movement', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Run', duration: 1.0, loop: true, tags: ['run'], classes: [] },
  { id: 'move.run_back', name: 'Run Backward', category: 'movement', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Run_Back', duration: 1.04, loop: true, tags: ['run', 'back', 'retreat'], classes: [] },
  { id: 'move.run_left', name: 'Run Strafe Left', category: 'movement', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Run_Left', duration: 1.0, loop: true, tags: ['run', 'strafe', 'left'], classes: [] },
  { id: 'move.run_right', name: 'Run Strafe Right', category: 'movement', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Run_Right', duration: 1.0, loop: true, tags: ['run', 'strafe', 'right'], classes: [] },
  { id: 'move.walk_wizard', name: 'Wizard Walk', category: 'movement', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Walk', duration: 1.25, loop: true, tags: ['walk', 'mage'], classes: ['Mage'] },
  { id: 'move.sneaky_walk', name: 'Sneaky Walk', category: 'movement', source: 'characters/fabledworker.glb', clipName: 'Sneaky_Walk', duration: 4.0, loop: true, tags: ['walk', 'stealth', 'sneak'], classes: ['Ranger'] },
  { id: 'move.sprint', name: 'Sprint', category: 'movement', source: 'characters/siegeman.glb', clipName: 'Lean_Forward_Sprint_inplace', duration: 2.6, loop: true, tags: ['run', 'sprint', 'charge'], classes: [] },
  { id: 'move.injured_walk', name: 'Injured Walk', category: 'movement', source: 'characters/undeadworker.glb', clipName: 'Injured_Walk', duration: 1.5, loop: true, tags: ['walk', 'injured', 'limp'], classes: [] },
  { id: 'move.limping', name: 'Limping Walk', category: 'movement', source: 'characters/siegeman.glb', clipName: 'Limping_Walk_3', duration: 2.27, loop: true, tags: ['walk', 'limp', 'injured'], classes: [] },
  { id: 'move.stumble', name: 'Stumble Walk', category: 'movement', source: 'characters/siegeman.glb', clipName: 'Stumble_Walk', duration: 2.53, loop: true, tags: ['walk', 'stumble', 'drunk'], classes: [] },
  { id: 'move.excited_walk', name: 'Excited Walk', category: 'movement', source: 'characters/dwarf_enforcer.glb', clipName: 'Excited_Walk_F', duration: 2.5, loop: true, tags: ['walk', 'excited', 'happy', 'npc'], classes: [] },
  { id: 'move.jump', name: 'Jump', category: 'movement', source: 'characters/Animated_Human.glb', clipName: 'Human Armature|Jump', duration: 1.0, loop: false, tags: ['jump'], classes: [] },
  { id: 'move.jump_run', name: 'Running Jump', category: 'movement', source: 'characters/siegeman.glb', clipName: 'Jump_Run', duration: 1.03, loop: false, tags: ['jump', 'run'], classes: [] },
  { id: 'move.slide_right', name: 'Slide Right', category: 'movement', source: 'characters/ElfRanger.glb', clipName: 'slide_right', duration: 2.1, loop: false, tags: ['slide', 'dodge'], classes: ['Ranger'] },

  // ═══════════════════════════════════════════════════════════════
  // COMBAT — MELEE
  // ═══════════════════════════════════════════════════════════════
  { id: 'combat.punch', name: 'Punch', category: 'combat_melee', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Punch', duration: 0.75, loop: false, tags: ['punch', 'melee', 'unarmed'], classes: [] },
  { id: 'combat.punch_left', name: 'Punch Left', category: 'combat_melee', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Punch_Left', duration: 1.04, loop: false, tags: ['punch', 'left'], classes: [] },
  { id: 'combat.punch_right', name: 'Punch Right', category: 'combat_melee', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Punch_Right', duration: 1.04, loop: false, tags: ['punch', 'right'], classes: [] },
  { id: 'combat.kick_left', name: 'Kick Left', category: 'combat_melee', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Kick_Left', duration: 1.17, loop: false, tags: ['kick', 'left'], classes: [] },
  { id: 'combat.kick_right', name: 'Kick Right', category: 'combat_melee', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Kick_Right', duration: 1.17, loop: false, tags: ['kick', 'right'], classes: [] },
  { id: 'combat.sword_slash', name: 'Sword Slash', category: 'combat_melee', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Sword_Slash', duration: 1.29, loop: false, tags: ['slash', 'sword', 'melee'], classes: ['Warrior'] },
  { id: 'combat.dagger_1', name: 'Dagger Attack', category: 'combat_melee', source: 'characters/Character_Toon_Animated.glb', clipName: 'Dagger_Attack', duration: 0.75, loop: false, tags: ['dagger', 'quick', 'melee'], classes: ['Ranger'] },
  { id: 'combat.dagger_2', name: 'Dagger Attack 2', category: 'combat_melee', source: 'characters/Character_Toon_Animated.glb', clipName: 'Dagger_Attack2', duration: 1.25, loop: false, tags: ['dagger', 'combo'], classes: ['Ranger'] },
  { id: 'combat.staff_attack', name: 'Staff Attack', category: 'combat_melee', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Staff_Attack', duration: 0.75, loop: false, tags: ['staff', 'melee', 'mage'], classes: ['Mage'] },
  { id: 'combat.charged_slash', name: 'Charged Upward Slash', category: 'combat_melee', source: 'characters/berserker.glb', clipName: 'Charged_Upward_Slash', duration: 1.03, loop: false, tags: ['slash', 'charged', 'heavy'], classes: ['Warrior'] },
  { id: 'combat.ground_slam', name: 'Ground Slam', category: 'combat_melee', source: 'characters/berserker.glb', clipName: 'Charged_Ground_Slam', duration: 2.5, loop: false, tags: ['slam', 'aoe', 'ground'], classes: ['Warrior'] },
  { id: 'combat.axe_spin', name: 'Axe Spin Attack', category: 'combat_melee', source: 'characters/berserker.glb', clipName: 'Axe_Spin_Attack', duration: 3.17, loop: false, tags: ['axe', 'spin', 'aoe'], classes: ['Warrior'] },
  { id: 'combat.double_blade_spin', name: 'Double Blade Spin', category: 'combat_melee', source: 'characters/berserker.glb', clipName: 'Double_Blade_Spin', duration: 7.0, loop: false, tags: ['spin', 'dual', 'channel'], classes: ['Warrior'] },
  { id: 'combat.punch_combo_1', name: 'Punch Combo 1', category: 'combat_melee', source: 'characters/BarbarianGlad.glb', clipName: 'Punch_Combo_1', duration: 3.0, loop: false, tags: ['combo', 'punch'], classes: [] },
  { id: 'combat.punch_combo_5', name: 'Punch Combo 5', category: 'combat_melee', source: 'characters/dwarf_enforcer.glb', clipName: 'Punch_Combo_5', duration: 0.9, loop: false, tags: ['combo', 'punch', 'fast'], classes: [] },
  { id: 'combat.right_sword_slash', name: 'Right Sword Slash', category: 'combat_melee', source: 'characters/ElfRanger.glb', clipName: 'Right_Hand_Sword_Slash', duration: 3.83, loop: false, tags: ['slash', 'sword', 'right'], classes: ['Warrior', 'Ranger'] },
  { id: 'combat.thrust_slash', name: 'Thrust Slash', category: 'combat_melee', source: 'characters/ElfRanger.glb', clipName: 'Thrust_Slash', duration: 7.03, loop: false, tags: ['thrust', 'spear', 'slash'], classes: [] },
  { id: 'combat.sweep_kick', name: 'Sweep Kick', category: 'combat_melee', source: 'characters/ElfRanger.glb', clipName: 'Sweep_Kick', duration: 2.3, loop: false, tags: ['kick', 'sweep', 'knockdown'], classes: [] },
  { id: 'combat.weapon_combo_2', name: 'Weapon Combo 2', category: 'combat_melee', source: 'characters/ElfRanger.glb', clipName: 'Weapon_Combo_2', duration: 2.33, loop: false, tags: ['combo', 'weapon'], classes: [] },
  { id: 'combat.hammer_swing', name: 'Heavy Hammer Swing', category: 'combat_melee', source: 'characters/fabledworker.glb', clipName: 'Heavy_Hammer_Swing', duration: 2.87, loop: false, tags: ['hammer', 'heavy', 'swing'], classes: ['Warrior'] },
  { id: 'combat.double_combo', name: 'Double Combo Attack', category: 'combat_melee', source: 'characters/humandeathgiver.glb', clipName: 'Double_Combo_Attack', duration: 3.17, loop: false, tags: ['combo', 'double', 'sword'], classes: ['Warrior'] },
  { id: 'combat.sword_judgment', name: 'Sword Judgment', category: 'combat_melee', source: 'characters/humandeathgiver.glb', clipName: 'Sword_Judgment', duration: 3.67, loop: false, tags: ['sword', 'judgment', 'finisher'], classes: ['Warrior'] },
  { id: 'combat.weapon_combo', name: 'Weapon Combo', category: 'combat_melee', source: 'characters/humandeathgiver.glb', clipName: 'Weapon_Combo', duration: 6.17, loop: false, tags: ['combo', 'weapon', 'long'], classes: [] },
  { id: 'combat.reaping_swing', name: 'Reaping Swing', category: 'combat_melee', source: 'creatures/GoblinCr3w.glb', clipName: 'Reaping_Swing', duration: 1.03, loop: false, tags: ['reap', 'swing', 'scythe'], classes: [] },
  { id: 'combat.lunge_spin_kick', name: 'Lunge Spin Kick', category: 'combat_melee', source: 'creatures/GoblinCr3w.glb', clipName: 'Lunge_Spin_Kick', duration: 3.0, loop: false, tags: ['lunge', 'spin', 'kick'], classes: [] },
  { id: 'combat.elbow_strike', name: 'Elbow Strike', category: 'combat_melee', source: 'characters/graatorc.glb', clipName: 'Elbow_Strike', duration: 2.47, loop: false, tags: ['elbow', 'close'], classes: [] },
  { id: 'combat.flying_fist_kick', name: 'Flying Fist Kick', category: 'combat_melee', source: 'characters/graatorc.glb', clipName: 'Flying_Fist_Kick', duration: 1.77, loop: false, tags: ['flying', 'kick', 'aerial'], classes: [] },
  { id: 'combat.rightward_spin', name: 'Rightward Spin', category: 'combat_melee', source: 'characters/berserker.glb', clipName: 'Rightward_Spin', duration: 0.53, loop: false, tags: ['spin', 'quick'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // COMBAT — RANGED
  // ═══════════════════════════════════════════════════════════════
  { id: 'combat.gun_shoot', name: 'Gun Shoot', category: 'combat_ranged', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Gun_Shoot', duration: 0.75, loop: false, tags: ['gun', 'shoot', 'ranged'], classes: ['Ranger'] },
  { id: 'combat.run_shoot', name: 'Run and Shoot', category: 'combat_ranged', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Run_Shoot', duration: 1.04, loop: true, tags: ['gun', 'run', 'shoot'], classes: ['Ranger'] },
  { id: 'combat.archery_shot', name: 'Archery Shot', category: 'combat_ranged', source: 'characters/orcpeon.glb', clipName: 'Archery_Shot_1', duration: 1.03, loop: false, tags: ['bow', 'archery', 'shot'], classes: ['Ranger'] },
  { id: 'combat.crouch_throw', name: 'Crouch Charge & Throw', category: 'combat_ranged', source: 'creatures/GoblinCr3w.glb', clipName: 'Crouch_Charge_and_Throw', duration: 4.53, loop: false, tags: ['throw', 'crouch', 'ranged'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // COMBAT — MAGIC
  // ═══════════════════════════════════════════════════════════════
  { id: 'combat.spell_1', name: 'Spell Cast 1', category: 'combat_magic', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Spell1', duration: 1.21, loop: false, tags: ['spell', 'cast', 'magic'], classes: ['Mage'] },
  { id: 'combat.spell_2', name: 'Spell Cast 2', category: 'combat_magic', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Spell2', duration: 1.46, loop: false, tags: ['spell', 'cast', 'magic'], classes: ['Mage'] },
  { id: 'combat.charged_spell', name: 'Charged Spell Cast', category: 'combat_magic', source: 'characters/graatorc.glb', clipName: 'Charged_Spell_Cast', duration: 3.2, loop: false, tags: ['spell', 'charged', 'channel'], classes: ['Mage'] },
  { id: 'combat.mage_cast_1', name: 'Mage Spell 1', category: 'combat_magic', source: 'characters/dwarf_enforcer.glb', clipName: 'mage_soell_cast_1', duration: 9.77, loop: false, tags: ['spell', 'long_cast'], classes: ['Mage'] },
  { id: 'combat.mage_cast_2', name: 'Mage Spell 2', category: 'combat_magic', source: 'characters/dwarf_enforcer.glb', clipName: 'mage_soell_cast_2', duration: 3.83, loop: false, tags: ['spell', 'medium_cast'], classes: ['Mage'] },
  { id: 'combat.mage_cast_4', name: 'Mage Spell 4', category: 'combat_magic', source: 'characters/dwarf_enforcer.glb', clipName: 'mage_soell_cast_4', duration: 2.4, loop: false, tags: ['spell', 'quick_cast'], classes: ['Mage'] },
  { id: 'combat.charged_spell_2', name: 'Charged Spell Cast 2', category: 'combat_magic', source: 'characters/orcpeon.glb', clipName: 'Charged_Spell_Cast_2', duration: 4.0, loop: false, tags: ['spell', 'charged', 'aoe'], classes: ['Mage'] },

  // ═══════════════════════════════════════════════════════════════
  // COMBAT — REACTIONS
  // ═══════════════════════════════════════════════════════════════
  { id: 'react.hit', name: 'Hit React', category: 'combat_reaction', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|RecieveHit', duration: 0.63, loop: false, tags: ['hit', 'flinch'], classes: [] },
  { id: 'react.hit_2', name: 'Hit React 2', category: 'combat_reaction', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|RecieveHit_2', duration: 0.63, loop: false, tags: ['hit', 'stagger'], classes: [] },
  { id: 'react.knockdown', name: 'Knock Down', category: 'combat_reaction', source: 'characters/berserker.glb', clipName: 'Knock_Down', duration: 2.8, loop: false, tags: ['knockdown', 'fall'], classes: [] },
  { id: 'react.slap', name: 'Slap Reaction', category: 'combat_reaction', source: 'characters/BarbarianGlad.glb', clipName: 'Slap_Reaction', duration: 0.63, loop: false, tags: ['slap', 'stun'], classes: [] },
  { id: 'react.face_punch', name: 'Face Punch Reaction', category: 'combat_reaction', source: 'characters/BarbarianGlad.glb', clipName: 'Face_Punch_Reaction', duration: 1.1, loop: false, tags: ['punch', 'face', 'stagger'], classes: [] },
  { id: 'react.waist_hit', name: 'Waist Hit Reaction', category: 'combat_reaction', source: 'characters/BarbarianGlad.glb', clipName: 'Hit_Reaction_to_Waist', duration: 2.83, loop: false, tags: ['hit', 'waist', 'bend'], classes: [] },
  { id: 'react.fly_up', name: 'Fly Up (Launched)', category: 'combat_reaction', source: 'characters/orcpeon.glb', clipName: 'BeHit_FlyUp', duration: 2.8, loop: false, tags: ['launch', 'fly', 'airborne'], classes: [] },
  { id: 'react.standup', name: 'Stand Up', category: 'combat_reaction', source: 'characters/berserker.glb', clipName: 'Stand_Up1', duration: 8.27, loop: false, tags: ['standup', 'recover'], classes: [] },
  { id: 'react.fall_dead', name: 'Fall Dead', category: 'combat_reaction', source: 'characters/berserker.glb', clipName: 'Fall_Dead_from_Abdominal_Injury', duration: 3.0, loop: false, tags: ['death', 'fall', 'abdominal'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // DODGE / BLOCK
  // ═══════════════════════════════════════════════════════════════
  { id: 'dodge.roll', name: 'Roll', category: 'dodge', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Roll', duration: 1.0, loop: false, tags: ['roll', 'dodge', 'evade'], classes: [] },
  { id: 'dodge.roll_woman', name: 'Roll (Alt)', category: 'dodge', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Roll', duration: 1.67, loop: false, tags: ['roll', 'dodge'], classes: [] },
  { id: 'dodge.roll_1', name: 'Roll Dodge 1', category: 'dodge', source: 'characters/berserker.glb', clipName: 'Roll_Dodge_2', duration: 3.2, loop: false, tags: ['roll', 'dodge', 'heavy'], classes: [] },
  { id: 'dodge.parkour_vault', name: 'Parkour Vault & Roll', category: 'dodge', source: 'characters/ElfRanger.glb', clipName: 'Parkour_Vault_with_Roll', duration: 0.57, loop: false, tags: ['vault', 'parkour', 'dodge'], classes: ['Ranger'] },
  { id: 'dodge.sliding_roll', name: 'Sliding Roll', category: 'dodge', source: 'characters/ElfRanger.glb', clipName: 'sliding_rool', duration: 4.07, loop: false, tags: ['slide', 'roll'], classes: [] },
  { id: 'dodge.counter', name: 'Dodge & Counter', category: 'dodge', source: 'characters/undeadworker.glb', clipName: 'Dodge_and_Counter', duration: 2.5, loop: false, tags: ['dodge', 'counter', 'parry'], classes: [] },
  { id: 'block.1', name: 'Block 1', category: 'block', source: 'characters/BarbarianGlad.glb', clipName: 'Block1', duration: 2.5, loop: false, tags: ['block', 'shield'], classes: ['Warrior'] },
  { id: 'block.2', name: 'Block 2', category: 'block', source: 'characters/BarbarianGlad.glb', clipName: 'Block2', duration: 3.5, loop: false, tags: ['block'], classes: ['Warrior'] },
  { id: 'block.3', name: 'Block 3', category: 'block', source: 'characters/BarbarianGlad.glb', clipName: 'Block3', duration: 1.6, loop: false, tags: ['block', 'quick'], classes: ['Warrior'] },
  { id: 'block.4', name: 'Block 4', category: 'block', source: 'characters/orcpeon.glb', clipName: 'Block4', duration: 1.53, loop: false, tags: ['block'], classes: [] },
  { id: 'block.shield_push', name: 'Shield Push', category: 'block', source: 'characters/dwarf_enforcer.glb', clipName: 'Shield_Push_Left', duration: 1.27, loop: false, tags: ['shield', 'push', 'bash'], classes: ['Warrior'] },
  { id: 'block.sword_parry_back', name: 'Sword Parry Backward', category: 'block', source: 'characters/humandeathgiver.glb', clipName: 'Sword_Parry_Backward_2', duration: 5.9, loop: false, tags: ['parry', 'sword', 'backstep'], classes: ['Warrior', 'Ranger'] },
  { id: 'block.two_handed_parry', name: 'Two Handed Parry', category: 'block', source: 'characters/graatorc.glb', clipName: 'Two_Handed_Parry', duration: 2.47, loop: false, tags: ['parry', 'two_hand'], classes: ['Warrior'] },

  // ═══════════════════════════════════════════════════════════════
  // DEATH
  // ═══════════════════════════════════════════════════════════════
  { id: 'death.basic', name: 'Death', category: 'death', source: 'characters/Animated_Human.glb', clipName: 'Human Armature|Death', duration: 3.5, loop: false, tags: ['death', 'default'], classes: [] },
  { id: 'death.wizard', name: 'Death (Wizard)', category: 'death', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|Death', duration: 1.17, loop: false, tags: ['death', 'mage'], classes: ['Mage'] },
  { id: 'death.shot_fall', name: 'Shot & Fall Backward', category: 'death', source: 'characters/BarbarianGlad.glb', clipName: 'Shot_and_Fall_Backward', duration: 2.5, loop: false, tags: ['death', 'shot', 'fall'], classes: [] },
  { id: 'death.falling', name: 'Falling Down', category: 'death', source: 'characters/siegeman.glb', clipName: 'falling_down', duration: 3.27, loop: false, tags: ['death', 'fall'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // SOCIAL / EMOTES
  // ═══════════════════════════════════════════════════════════════
  { id: 'social.wave', name: 'Wave', category: 'social', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Wave', duration: 2.08, loop: false, tags: ['wave', 'greet', 'emote'], classes: [] },
  { id: 'social.interact', name: 'Interact', category: 'social', source: 'characters/Animated_Woman.glb', clipName: 'CharacterArmature|Interact', duration: 1.58, loop: false, tags: ['interact', 'pickup', 'npc'], classes: [] },
  { id: 'social.agree', name: 'Agree Gesture', category: 'social', source: 'characters/fabledworker.glb', clipName: 'Agree_Gesture', duration: 1.83, loop: false, tags: ['agree', 'nod', 'yes'], classes: [] },
  { id: 'social.taunt', name: 'Chest Pound Taunt', category: 'social', source: 'characters/dwarf_enforcer.glb', clipName: 'Chest_Pound_Taunt', duration: 4.83, loop: false, tags: ['taunt', 'chest', 'emote'], classes: [] },
  { id: 'social.scream', name: 'Battle Cry', category: 'social', source: 'characters/dwarf_enforcer.glb', clipName: 'Zombie_Scream', duration: 2.23, loop: false, tags: ['scream', 'cry', 'battlecry'], classes: [] },
  { id: 'social.shout', name: 'Sword Shout', category: 'social', source: 'characters/humandeathgiver.glb', clipName: 'Sword_Shout', duration: 0.63, loop: false, tags: ['shout', 'sword', 'taunt'], classes: [] },
  { id: 'social.not_your_mom', name: 'Dismissive Gesture', category: 'social', source: 'characters/ElfRanger.glb', clipName: 'Not_Your_Mom', duration: 2.8, loop: false, tags: ['dismiss', 'rude', 'emote'], classes: [] },
  { id: 'social.yes', name: 'Yes (Nod)', category: 'social', source: 'characters/Anne.glb', clipName: 'CharacterArmature|CharacterArmature|CharacterArmature|Yes|CharacterArmature|Yes', duration: 1.67, loop: false, tags: ['yes', 'nod', 'agree'], classes: [] },
  { id: 'social.no', name: 'No (Head Shake)', category: 'social', source: 'characters/Anne.glb', clipName: 'CharacterArmature|CharacterArmature|CharacterArmature|No|CharacterArmature|No', duration: 1.67, loop: false, tags: ['no', 'shake', 'disagree'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // HARVESTING / WORK
  // ═══════════════════════════════════════════════════════════════
  { id: 'harvest.working', name: 'Working', category: 'harvesting', source: 'characters/Animated_Human.glb', clipName: 'Human Armature|Working', duration: 6.42, loop: true, tags: ['work', 'harvest', 'mining', 'chopping'], classes: [] },
  { id: 'harvest.pickup', name: 'Pick Up', category: 'harvesting', source: 'characters/Animated_Wizard.glb', clipName: 'CharacterArmature|PickUp', duration: 1.25, loop: false, tags: ['pickup', 'gather', 'loot'], classes: [] },
  { id: 'harvest.push_up', name: 'Push Up (Exercise)', category: 'harvesting', source: 'characters/dwarf_enforcer.glb', clipName: 'push_up', duration: 1.53, loop: true, tags: ['pushup', 'exercise', 'idle'], classes: [] },
  { id: 'harvest.jump_rope', name: 'Jump Rope', category: 'harvesting', source: 'characters/BarbarianGlad.glb', clipName: 'Jump_Rope', duration: 2.23, loop: true, tags: ['exercise', 'jump_rope', 'idle'], classes: [] },
  { id: 'harvest.jumping_jacks', name: 'Jumping Jacks', category: 'harvesting', source: 'characters/BarbarianGlad.glb', clipName: 'jumping_jacks', duration: 3.97, loop: true, tags: ['exercise', 'jacks', 'idle'], classes: [] },
  { id: 'harvest.catching_breath', name: 'Catching Breath', category: 'harvesting', source: 'characters/berserker.glb', clipName: 'Catching_Breath', duration: 5.33, loop: true, tags: ['rest', 'breathe', 'tired'], classes: [] },
  { id: 'harvest.burpee', name: 'Burpee Exercise', category: 'harvesting', source: 'characters/berserker.glb', clipName: 'Burpee_Exercise', duration: 2.33, loop: true, tags: ['exercise', 'burpee'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // SWIMMING
  // ═══════════════════════════════════════════════════════════════
  { id: 'swim.forward', name: 'Swim Forward', category: 'swimming', source: 'characters/undeadworker.glb', clipName: 'Swim_Forward', duration: 3.97, loop: true, tags: ['swim', 'forward'], classes: [] },
  { id: 'swim.idle', name: 'Swim Idle', category: 'swimming', source: 'creatures/GoblinCr3w.glb', clipName: 'Swim_Idle', duration: 2.27, loop: true, tags: ['swim', 'idle', 'tread'], classes: [] },
  { id: 'swim.to_edge', name: 'Swim to Edge', category: 'swimming', source: 'characters/undeadworker.glb', clipName: 'swimming_to_edge', duration: 3.5, loop: false, tags: ['swim', 'edge', 'exit'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // NPC IDLE BEHAVIORS
  // ═══════════════════════════════════════════════════════════════
  { id: 'npc.alert', name: 'Alert', category: 'npc_idle', source: 'characters/fabledworker.glb', clipName: 'Alert', duration: 1.3, loop: false, tags: ['alert', 'guard', 'npc'], classes: [] },
  { id: 'npc.arise', name: 'Arise', category: 'npc_idle', source: 'characters/fabledworker.glb', clipName: 'Arise', duration: 0.63, loop: false, tags: ['arise', 'wakeup', 'npc'], classes: [] },
  { id: 'npc.guard_turn', name: 'Alert Turn', category: 'npc_idle', source: 'characters/berserker.glb', clipName: 'Alert_Quick_Turn_Right', duration: 1.63, loop: false, tags: ['turn', 'alert', 'guard'], classes: [] },
  { id: 'npc.combat_turn', name: 'Combat Idle Turn', category: 'npc_idle', source: 'characters/graatorc.glb', clipName: 'Combat_Idle_Turn_Left', duration: 1.03, loop: false, tags: ['turn', 'combat', 'idle'], classes: [] },
  { id: 'npc.zombie_idle', name: 'Zombie Idle', category: 'npc_idle', source: 'characters/Animated_Zombie.glb', clipName: 'Zombie|ZombieIdle', duration: 5.54, loop: true, tags: ['zombie', 'idle', 'undead'], classes: [] },
  { id: 'npc.zombie_walk', name: 'Zombie Walk', category: 'npc_idle', source: 'characters/Animated_Zombie.glb', clipName: 'Zombie|ZombieWalk', duration: 4.0, loop: true, tags: ['zombie', 'walk', 'undead'], classes: [] },
  { id: 'npc.zombie_crawl', name: 'Zombie Crawl', category: 'npc_idle', source: 'characters/Animated_Zombie.glb', clipName: 'Zombie|ZombieCrawl', duration: 5.13, loop: true, tags: ['zombie', 'crawl'], classes: [] },
  { id: 'npc.zombie_bite', name: 'Zombie Bite', category: 'npc_idle', source: 'characters/Animated_Zombie.glb', clipName: 'Zombie|ZombieBite', duration: 5.04, loop: false, tags: ['zombie', 'bite', 'attack'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // CREATURE ANIMATIONS
  // ═══════════════════════════════════════════════════════════════
  { id: 'creature.wolf_idle', name: 'Wolf Idle', category: 'npc_idle', source: 'creatures/Wolf.glb', clipName: 'Idle', duration: 3.33, loop: true, tags: ['wolf', 'idle'], classes: [] },
  { id: 'creature.wolf_walk', name: 'Wolf Walk', category: 'npc_idle', source: 'creatures/Wolf.glb', clipName: 'Walk', duration: 1.04, loop: true, tags: ['wolf', 'walk'], classes: [] },
  { id: 'creature.wolf_attack', name: 'Wolf Attack', category: 'npc_idle', source: 'creatures/Wolf.glb', clipName: 'Attack', duration: 1.33, loop: false, tags: ['wolf', 'attack', 'bite'], classes: [] },
  { id: 'creature.wolf_eat', name: 'Wolf Eating', category: 'npc_idle', source: 'creatures/Wolf.glb', clipName: 'Eating', duration: 2.5, loop: true, tags: ['wolf', 'eat'], classes: [] },
  { id: 'creature.wolf_gallop', name: 'Wolf Gallop', category: 'npc_idle', source: 'creatures/Wolf.glb', clipName: 'Gallop', duration: 0.54, loop: true, tags: ['wolf', 'run', 'gallop'], classes: [] },
  { id: 'creature.raptor_idle', name: 'Raptor Idle', category: 'npc_idle', source: 'creatures/Velociraptor.glb', clipName: 'Armature|Velociraptor_Idle', duration: 2.5, loop: true, tags: ['raptor', 'idle'], classes: [] },
  { id: 'creature.raptor_attack', name: 'Raptor Attack', category: 'npc_idle', source: 'creatures/Velociraptor.glb', clipName: 'Armature|Velociraptor_Attack', duration: 0.83, loop: false, tags: ['raptor', 'attack'], classes: [] },
  { id: 'creature.raptor_run', name: 'Raptor Run', category: 'npc_idle', source: 'creatures/Velociraptor.glb', clipName: 'Armature|Velociraptor_Run', duration: 0.54, loop: true, tags: ['raptor', 'run'], classes: [] },
  { id: 'creature.dragon_fly', name: 'Dragon Flying', category: 'npc_idle', source: 'environment/Dragon.glb', clipName: 'DragonArmature|Dragon_Flying', duration: 1.67, loop: true, tags: ['dragon', 'fly'], classes: [] },
  { id: 'creature.dragon_attack', name: 'Dragon Attack', category: 'npc_idle', source: 'environment/Dragon.glb', clipName: 'DragonArmature|Dragon_Attack', duration: 0.88, loop: false, tags: ['dragon', 'attack', 'breath'], classes: [] },
  { id: 'creature.shark_swim', name: 'Shark Swim', category: 'swimming', source: 'creatures/Shark.glb', clipName: 'SharkArmature|SharkArmature|SharkArmature|Swim|SharkArmature|Swim', duration: 1.33, loop: true, tags: ['shark', 'swim'], classes: [] },
  { id: 'creature.slime_idle', name: 'Slime Idle', category: 'npc_idle', source: 'environment/SlimeEnemy.glb', clipName: 'MonsterArmature|Idle', duration: 2.5, loop: true, tags: ['slime', 'idle'], classes: [] },
  { id: 'creature.slime_dance', name: 'Slime Dance', category: 'npc_idle', source: 'environment/SlimeEnemy.glb', clipName: 'MonsterArmature|Dance', duration: 0.83, loop: true, tags: ['slime', 'dance'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // WEAPON: SWORD + SHIELD (Mixamo pack — Warrior only)
  // 49 animations covering full combat, movement, and utility
  // ═══════════════════════════════════════════════════════════════
  // -- Idle
  { id: 'sns.idle', name: 'SnS Idle', category: 'idle', source: 'animations/weapon-sword-shield/sns_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'sword', 'shield', 'sns', 'warrior'], classes: ['Warrior'] },
  { id: 'sns.idle_2', name: 'SnS Idle 2', category: 'idle', source: 'animations/weapon-sword-shield/sns_idle_(2).fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.idle_3', name: 'SnS Idle 3', category: 'idle', source: 'animations/weapon-sword-shield/sns_idle_(3).fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'sns', 'alt2'], classes: ['Warrior'] },
  { id: 'sns.idle_4', name: 'SnS Idle 4', category: 'idle', source: 'animations/weapon-sword-shield/sns_idle_(4).fbx', clipName: 'mixamo.com', duration: 2.5, loop: true, tags: ['idle', 'sns', 'alert'], classes: ['Warrior'] },
  // -- Movement
  { id: 'sns.walk', name: 'SnS Walk', category: 'movement', source: 'animations/weapon-sword-shield/sns_walk.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'sns', 'warrior'], classes: ['Warrior'] },
  { id: 'sns.walk_2', name: 'SnS Walk 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_walk_(2).fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.run', name: 'SnS Run', category: 'movement', source: 'animations/weapon-sword-shield/sns_run.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'sns', 'warrior'], classes: ['Warrior'] },
  { id: 'sns.run_2', name: 'SnS Run 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_run_(2).fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.strafe_1', name: 'SnS Strafe', category: 'movement', source: 'animations/weapon-sword-shield/sns_strafe.fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['strafe', 'sns'], classes: ['Warrior'] },
  { id: 'sns.strafe_2', name: 'SnS Strafe 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_strafe_(2).fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['strafe', 'sns', 'right'], classes: ['Warrior'] },
  { id: 'sns.strafe_3', name: 'SnS Strafe 3', category: 'movement', source: 'animations/weapon-sword-shield/sns_strafe_(3).fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['strafe', 'sns', 'left'], classes: ['Warrior'] },
  { id: 'sns.strafe_4', name: 'SnS Strafe 4', category: 'movement', source: 'animations/weapon-sword-shield/sns_strafe_(4).fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['strafe', 'sns', 'back'], classes: ['Warrior'] },
  { id: 'sns.turn', name: 'SnS Turn', category: 'movement', source: 'animations/weapon-sword-shield/sns_turn.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['turn', 'sns'], classes: ['Warrior'] },
  { id: 'sns.turn_2', name: 'SnS Turn 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_turn_(2).fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['turn', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.turn_180', name: 'SnS 180 Turn', category: 'movement', source: 'animations/weapon-sword-shield/sns_180_turn.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['turn', '180', 'sns'], classes: ['Warrior'] },
  { id: 'sns.turn_180_2', name: 'SnS 180 Turn 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_180_turn_(2).fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['turn', '180', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.jump', name: 'SnS Jump', category: 'movement', source: 'animations/weapon-sword-shield/sns_jump.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['jump', 'sns'], classes: ['Warrior'] },
  { id: 'sns.jump_2', name: 'SnS Jump 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_jump_(2).fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['jump', 'sns', 'alt'], classes: ['Warrior'] },
  // -- Crouch
  { id: 'sns.crouch', name: 'SnS Crouch Enter', category: 'movement', source: 'animations/weapon-sword-shield/sns_crouch.fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['crouch', 'sns', 'enter'], classes: ['Warrior'] },
  { id: 'sns.crouch_idle', name: 'SnS Crouch Idle', category: 'idle', source: 'animations/weapon-sword-shield/sns_crouch_idle.fbx', clipName: 'mixamo.com', duration: 2.5, loop: true, tags: ['crouch', 'idle', 'sns'], classes: ['Warrior'] },
  { id: 'sns.crouching', name: 'SnS Crouching Move', category: 'movement', source: 'animations/weapon-sword-shield/sns_crouching.fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['crouch', 'walk', 'sns'], classes: ['Warrior'] },
  { id: 'sns.crouching_2', name: 'SnS Crouching 2', category: 'movement', source: 'animations/weapon-sword-shield/sns_crouching_(2).fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['crouch', 'walk', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.crouching_3', name: 'SnS Crouching 3', category: 'movement', source: 'animations/weapon-sword-shield/sns_crouching_(3).fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['crouch', 'walk', 'sns', 'alt2'], classes: ['Warrior'] },
  // -- Attacks
  { id: 'sns.attack', name: 'SnS Attack', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_attack.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['attack', 'sns', 'sword', 'slash'], classes: ['Warrior'] },
  { id: 'sns.attack_2', name: 'SnS Attack 2', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_attack_(2).fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['attack', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.attack_3', name: 'SnS Attack 3', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_attack_(3).fbx', clipName: 'mixamo.com', duration: 1.2, loop: false, tags: ['attack', 'sns', 'heavy'], classes: ['Warrior'] },
  { id: 'sns.attack_4', name: 'SnS Attack 4', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_attack_(4).fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['attack', 'sns', 'quick'], classes: ['Warrior'] },
  { id: 'sns.slash', name: 'SnS Slash', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_slash.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['slash', 'sns', 'sword'], classes: ['Warrior'] },
  { id: 'sns.slash_2', name: 'SnS Slash 2', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_slash_(2).fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['slash', 'sns', 'wide'], classes: ['Warrior'] },
  { id: 'sns.slash_3', name: 'SnS Slash 3', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_slash_(3).fbx', clipName: 'mixamo.com', duration: 0.9, loop: false, tags: ['slash', 'sns', 'upward'], classes: ['Warrior'] },
  { id: 'sns.slash_4', name: 'SnS Slash 4', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_slash_(4).fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['slash', 'sns', 'combo'], classes: ['Warrior'] },
  { id: 'sns.slash_5', name: 'SnS Slash 5', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_slash_(5).fbx', clipName: 'mixamo.com', duration: 1.1, loop: false, tags: ['slash', 'sns', 'finisher'], classes: ['Warrior'] },
  { id: 'sns.kick', name: 'SnS Shield Kick', category: 'combat_melee', source: 'animations/weapon-sword-shield/sns_kick.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['kick', 'sns', 'stun'], classes: ['Warrior'] },
  { id: 'sns.power_up', name: 'SnS Power Up', category: 'social', source: 'animations/weapon-sword-shield/sns_power_up.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['powerup', 'buff', 'sns'], classes: ['Warrior'] },
  { id: 'sns.casting', name: 'SnS Casting', category: 'combat_magic', source: 'animations/weapon-sword-shield/sns_casting.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['cast', 'sns', 'ability'], classes: ['Warrior'] },
  { id: 'sns.casting_2', name: 'SnS Casting 2', category: 'combat_magic', source: 'animations/weapon-sword-shield/sns_casting_(2).fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['cast', 'sns', 'quick'], classes: ['Warrior'] },
  // -- Block
  { id: 'sns.block', name: 'SnS Block', category: 'block', source: 'animations/weapon-sword-shield/sns_block.fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['block', 'shield', 'sns', 'enter'], classes: ['Warrior'] },
  { id: 'sns.block_2', name: 'SnS Block 2', category: 'block', source: 'animations/weapon-sword-shield/sns_block_(2).fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['block', 'shield', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.block_idle', name: 'SnS Block Idle', category: 'block', source: 'animations/weapon-sword-shield/sns_block_idle.fbx', clipName: 'mixamo.com', duration: 2.5, loop: true, tags: ['block', 'idle', 'shield', 'sns'], classes: ['Warrior'] },
  { id: 'sns.crouch_block', name: 'SnS Crouch Block', category: 'block', source: 'animations/weapon-sword-shield/sns_crouch_block.fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['block', 'crouch', 'sns'], classes: ['Warrior'] },
  { id: 'sns.crouch_block_2', name: 'SnS Crouch Block 2', category: 'block', source: 'animations/weapon-sword-shield/sns_crouch_block_(2).fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['block', 'crouch', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.crouch_block_idle', name: 'SnS Crouch Block Idle', category: 'block', source: 'animations/weapon-sword-shield/sns_crouch_block_idle.fbx', clipName: 'mixamo.com', duration: 2.5, loop: true, tags: ['block', 'crouch', 'idle', 'sns'], classes: ['Warrior'] },
  // -- Reactions
  { id: 'sns.impact', name: 'SnS Impact', category: 'combat_reaction', source: 'animations/weapon-sword-shield/sns_impact.fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['hit', 'impact', 'sns'], classes: ['Warrior'] },
  { id: 'sns.impact_2', name: 'SnS Impact 2', category: 'combat_reaction', source: 'animations/weapon-sword-shield/sns_impact_(2).fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['hit', 'impact', 'sns', 'alt'], classes: ['Warrior'] },
  { id: 'sns.impact_3', name: 'SnS Impact 3', category: 'combat_reaction', source: 'animations/weapon-sword-shield/sns_impact_(3).fbx', clipName: 'mixamo.com', duration: 0.5, loop: false, tags: ['hit', 'impact', 'sns', 'heavy'], classes: ['Warrior'] },
  { id: 'sns.death', name: 'SnS Death', category: 'death', source: 'animations/weapon-sword-shield/sns_death.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['death', 'sns', 'warrior'], classes: ['Warrior'] },
  { id: 'sns.death_2', name: 'SnS Death 2', category: 'death', source: 'animations/weapon-sword-shield/sns_death_(2).fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['death', 'sns', 'alt'], classes: ['Warrior'] },
  // -- Utility
  { id: 'sns.sheath_1', name: 'Sheath Sword 1', category: 'misc', source: 'animations/weapon-sword-shield/sheath_sword_1.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['sheath', 'sword', 'holster'], classes: ['Warrior'] },
  { id: 'sns.sheath_2', name: 'Sheath Sword 2', category: 'misc', source: 'animations/weapon-sword-shield/sheath_sword_2.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['sheath', 'sword', 'holster', 'alt'], classes: ['Warrior'] },

  // ═══════════════════════════════════════════════════════════════
  // WEAPON: LONGBOW (Mixamo pack — Ranger)
  // 12 locomotion animations with bow equipped
  // ═══════════════════════════════════════════════════════════════
  { id: 'bow.idle', name: 'Bow Idle', category: 'idle', source: 'animations/weapon-longbow/standing_idle_01.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'bow', 'ranger', 'longbow'], classes: ['Ranger'] },
  { id: 'bow.walk_forward', name: 'Bow Walk Forward', category: 'movement', source: 'animations/weapon-longbow/standing_walk_forward.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'forward', 'bow'], classes: ['Ranger'] },
  { id: 'bow.walk_back', name: 'Bow Walk Back', category: 'movement', source: 'animations/weapon-longbow/standing_walk_back.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'back', 'bow'], classes: ['Ranger'] },
  { id: 'bow.walk_left', name: 'Bow Walk Left', category: 'movement', source: 'animations/weapon-longbow/standing_walk_left.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'left', 'strafe', 'bow'], classes: ['Ranger'] },
  { id: 'bow.walk_right', name: 'Bow Walk Right', category: 'movement', source: 'animations/weapon-longbow/standing_walk_right.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'right', 'strafe', 'bow'], classes: ['Ranger'] },
  { id: 'bow.run_forward', name: 'Bow Run Forward', category: 'movement', source: 'animations/weapon-longbow/standing_run_forward.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'forward', 'bow'], classes: ['Ranger'] },
  { id: 'bow.run_forward_stop', name: 'Bow Run Stop', category: 'movement', source: 'animations/weapon-longbow/standing_run_forward_stop.fbx', clipName: 'mixamo.com', duration: 0.6, loop: false, tags: ['run', 'stop', 'bow', 'brake'], classes: ['Ranger'] },
  { id: 'bow.run_back', name: 'Bow Run Back', category: 'movement', source: 'animations/weapon-longbow/standing_run_back.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'back', 'bow', 'kite'], classes: ['Ranger'] },
  { id: 'bow.run_left', name: 'Bow Run Left', category: 'movement', source: 'animations/weapon-longbow/standing_run_left.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'left', 'strafe', 'bow'], classes: ['Ranger'] },
  { id: 'bow.run_right', name: 'Bow Run Right', category: 'movement', source: 'animations/weapon-longbow/standing_run_right.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'right', 'strafe', 'bow'], classes: ['Ranger'] },
  { id: 'bow.turn_90_left', name: 'Bow Turn Left', category: 'movement', source: 'animations/weapon-longbow/standing_turn_90_left.fbx', clipName: 'mixamo.com', duration: 0.6, loop: false, tags: ['turn', 'left', 'bow'], classes: ['Ranger'] },
  { id: 'bow.turn_90_right', name: 'Bow Turn Right', category: 'movement', source: 'animations/weapon-longbow/standing_turn_90_right.fbx', clipName: 'mixamo.com', duration: 0.6, loop: false, tags: ['turn', 'right', 'bow'], classes: ['Ranger'] },

  // ═══════════════════════════════════════════════════════════════
  // MOUNT / VEHICLE
  // ═══════════════════════════════════════════════════════════════
  { id: 'mount.driving', name: 'Driving (Vehicle Mount)', category: 'mount', source: 'animations/action-adventure/driving.fbx', clipName: 'mixamo.com', duration: 2.0, loop: true, tags: ['driving', 'mount', 'vehicle', 'bike', 'seated'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // COMBAT REACTIONS — RECOVERY
  // ═══════════════════════════════════════════════════════════════
  { id: 'react.getting_up', name: 'Getting Up (Slow)', category: 'combat_reaction', source: 'animations/action-adventure/getting_up.fbx', clipName: 'mixamo.com', duration: 3.0, loop: false, tags: ['getup', 'recover', 'slow', 'knockdown'], classes: [] },
  { id: 'combat.side_kick', name: 'Side Kick', category: 'combat_melee', source: 'animations/action-adventure/side_kick.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['kick', 'side', 'melee', 'skill', 'enemy'], classes: [] },
  { id: 'idle.happy', name: 'Happy Idle', category: 'idle', source: 'animations/action-adventure/happy.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'happy', 'emote', 'town', 'npc', 'social'], classes: [] },
  { id: 'combat.run_and_throw', name: 'Run & Throw', category: 'combat_ranged', source: 'animations/action-adventure/run_and_throw.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['throw', 'run', 'axe', 'grenade', 'ranged', 'warrior'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // GESTURES (NPC dialogue, vendor interaction, social emotes)
  // ═══════════════════════════════════════════════════════════════
  { id: 'gesture.acknowledging', name: 'Acknowledging', category: 'social', source: 'animations/gestures/acknowledging.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['acknowledge', 'nod', 'npc', 'vendor', 'social'], classes: [] },
  { id: 'gesture.angry', name: 'Angry Gesture', category: 'social', source: 'animations/gestures/angry_gesture.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['angry', 'emote', 'npc', 'hostile'], classes: [] },
  { id: 'gesture.annoyed_shake', name: 'Annoyed Head Shake', category: 'social', source: 'animations/gestures/annoyed_head_shake.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['annoyed', 'shake', 'no', 'npc'], classes: [] },
  { id: 'gesture.cocky', name: 'Being Cocky', category: 'social', source: 'animations/gestures/being_cocky.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['cocky', 'taunt', 'npc', 'emote'], classes: [] },
  { id: 'gesture.dismissing', name: 'Dismissing Gesture', category: 'social', source: 'animations/gestures/dismissing_gesture.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['dismiss', 'wave_off', 'npc'], classes: [] },
  { id: 'gesture.happy_hand', name: 'Happy Hand Gesture', category: 'social', source: 'animations/gestures/happy_hand_gesture.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['happy', 'hand', 'greet', 'npc', 'vendor'], classes: [] },
  { id: 'gesture.hard_nod', name: 'Hard Head Nod', category: 'social', source: 'animations/gestures/hard_head_nod.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['nod', 'yes', 'strong', 'npc', 'agree'], classes: [] },
  { id: 'gesture.nod_yes', name: 'Head Nod Yes', category: 'social', source: 'animations/gestures/head_nod_yes.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['nod', 'yes', 'npc', 'agree'], classes: [] },
  { id: 'gesture.lengthy_nod', name: 'Lengthy Head Nod', category: 'social', source: 'animations/gestures/lengthy_head_nod.fbx', clipName: 'mixamo.com', duration: 3.0, loop: false, tags: ['nod', 'thinking', 'listen', 'npc'], classes: [] },
  { id: 'gesture.look_away', name: 'Look Away', category: 'social', source: 'animations/gestures/look_away_gesture.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['look_away', 'shy', 'npc', 'disinterest'], classes: [] },
  { id: 'gesture.relieved_sigh', name: 'Relieved Sigh', category: 'social', source: 'animations/gestures/relieved_sigh.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['sigh', 'relief', 'npc', 'idle'], classes: [] },
  { id: 'gesture.sarcastic_nod', name: 'Sarcastic Head Nod', category: 'social', source: 'animations/gestures/sarcastic_head_nod.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['sarcastic', 'nod', 'npc', 'personality'], classes: [] },
  { id: 'gesture.shake_no', name: 'Shaking Head No', category: 'social', source: 'animations/gestures/shaking_head_no.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['no', 'shake', 'disagree', 'npc'], classes: [] },
  { id: 'gesture.thoughtful_shake', name: 'Thoughtful Head Shake', category: 'social', source: 'animations/gestures/thoughtful_head_shake.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['thoughtful', 'thinking', 'npc', 'uncertain'], classes: [] },
  { id: 'gesture.weight_shift', name: 'Weight Shift', category: 'npc_idle', source: 'animations/gestures/weight_shift.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'subtle', 'weight', 'npc', 'vendor'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // HARVESTING / FARMING (all classes + NPCs)
  // ═══════════════════════════════════════════════════════════════
  { id: 'harvest.dig_plant', name: 'Dig & Plant Seeds', category: 'harvesting', source: 'animations/harvesting/dig_and_plant_seeds.fbx', clipName: 'mixamo.com', duration: 4.0, loop: false, tags: ['dig', 'plant', 'seeds', 'harvest', 'herb'], classes: [] },
  { id: 'harvest.pull_plant', name: 'Pull Plant', category: 'harvesting', source: 'animations/harvesting/pull_plant.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['pull', 'herb', 'harvest', 'gather'], classes: [] },
  { id: 'harvest.pull_plant_v2', name: 'Pull Plant (Alt)', category: 'harvesting', source: 'animations/harvesting/pull_plant_v2.fbx', clipName: 'mixamo.com', duration: 2.0, loop: false, tags: ['pull', 'herb', 'harvest', 'alt'], classes: [] },
  { id: 'harvest.pick_fruit', name: 'Pick Fruit', category: 'harvesting', source: 'animations/harvesting/pick_fruit.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['pick', 'fruit', 'tree', 'harvest'], classes: [] },
  { id: 'harvest.pick_fruit_v2', name: 'Pick Fruit (Alt)', category: 'harvesting', source: 'animations/harvesting/pick_fruit_v2.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['pick', 'fruit', 'harvest', 'alt'], classes: [] },
  { id: 'harvest.pick_fruit_v3', name: 'Pick Fruit (High)', category: 'harvesting', source: 'animations/harvesting/pick_fruit_v3.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['pick', 'fruit', 'harvest', 'high'], classes: [] },
  { id: 'harvest.plant', name: 'Plant a Plant', category: 'harvesting', source: 'animations/harvesting/plant_a_plant.fbx', clipName: 'mixamo.com', duration: 3.0, loop: false, tags: ['plant', 'herb', 'harvest'], classes: [] },
  { id: 'harvest.plant_tree', name: 'Plant Tree', category: 'harvesting', source: 'animations/harvesting/plant_tree.fbx', clipName: 'mixamo.com', duration: 4.0, loop: false, tags: ['plant', 'tree', 'harvest', 'wood'], classes: [] },
  { id: 'harvest.watering', name: 'Watering', category: 'harvesting', source: 'animations/harvesting/watering.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['water', 'harvest', 'farm'], classes: [] },
  { id: 'harvest.cow_milking', name: 'Cow Milking', category: 'harvesting', source: 'animations/harvesting/cow_milking.fbx', clipName: 'mixamo.com', duration: 4.0, loop: true, tags: ['milk', 'cow', 'farm', 'npc'], classes: [] },
  { id: 'harvest.kneel_idle', name: 'Kneeling Idle (Harvest)', category: 'harvesting', source: 'animations/harvesting/kneeling_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['kneel', 'idle', 'harvest', 'rest'], classes: [] },
  // -- Carrying / transport
  { id: 'harvest.hold_idle', name: 'Holding Idle', category: 'harvesting', source: 'animations/harvesting/holding_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['hold', 'carry', 'idle'], classes: [] },
  { id: 'harvest.hold_walk', name: 'Holding Walk', category: 'harvesting', source: 'animations/harvesting/holding_walk.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['hold', 'carry', 'walk'], classes: [] },
  { id: 'harvest.hold_turn_left', name: 'Holding Turn Left', category: 'harvesting', source: 'animations/harvesting/holding_turn_left.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['hold', 'carry', 'turn', 'left'], classes: [] },
  { id: 'harvest.hold_turn_right', name: 'Holding Turn Right', category: 'harvesting', source: 'animations/harvesting/holding_turn_right.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['hold', 'carry', 'turn', 'right'], classes: [] },
  { id: 'harvest.box_idle', name: 'Box Carry Idle', category: 'harvesting', source: 'animations/harvesting/box_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['box', 'carry', 'idle', 'crate'], classes: [] },
  { id: 'harvest.box_walk', name: 'Box Carry Walk', category: 'harvesting', source: 'animations/harvesting/box_walk_arc.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['box', 'carry', 'walk'], classes: [] },
  { id: 'harvest.box_turn', name: 'Box Turn', category: 'harvesting', source: 'animations/harvesting/box_turn.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['box', 'carry', 'turn'], classes: [] },
  { id: 'harvest.box_turn_v2', name: 'Box Turn (Alt)', category: 'harvesting', source: 'animations/harvesting/box_turn_v2.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['box', 'carry', 'turn', 'alt'], classes: [] },
  // -- Wheelbarrow
  { id: 'harvest.wheelbarrow_idle', name: 'Wheelbarrow Idle', category: 'harvesting', source: 'animations/harvesting/wheelbarrow_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['wheelbarrow', 'idle', 'transport'], classes: [] },
  { id: 'harvest.wheelbarrow_walk', name: 'Wheelbarrow Walk', category: 'harvesting', source: 'animations/harvesting/wheelbarrow_walk.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['wheelbarrow', 'walk', 'transport'], classes: [] },
  { id: 'harvest.wheelbarrow_walk_v2', name: 'Wheelbarrow Walk (Alt)', category: 'harvesting', source: 'animations/harvesting/wheelbarrow_walk_v2.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['wheelbarrow', 'walk', 'alt'], classes: [] },
  { id: 'harvest.wheelbarrow_turn', name: 'Wheelbarrow Turn', category: 'harvesting', source: 'animations/harvesting/wheelbarrow_walk_turn.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['wheelbarrow', 'turn'], classes: [] },
  { id: 'harvest.wheelbarrow_turn_v2', name: 'Wheelbarrow Turn (Alt)', category: 'harvesting', source: 'animations/harvesting/wheelbarrow_walk_turn_v2.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['wheelbarrow', 'turn', 'alt'], classes: [] },
  { id: 'harvest.wheelbarrow_dump', name: 'Wheelbarrow Dump', category: 'harvesting', source: 'animations/harvesting/wheelbarrow_dump.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['wheelbarrow', 'dump', 'deliver'], classes: [] },

  // ═══════════════════════════════════════════════════════════════
  // WEAPON: PISTOL / WAND (Mage wand + Ranger pistol locomotion)
  // ═══════════════════════════════════════════════════════════════
  { id: 'pistol.idle', name: 'Pistol Idle', category: 'idle', source: 'animations/weapon-pistol/pistol_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['idle', 'pistol', 'wand', 'gun'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.walk', name: 'Pistol Walk', category: 'movement', source: 'animations/weapon-pistol/pistol_walk.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.walk_back', name: 'Pistol Walk Back', category: 'movement', source: 'animations/weapon-pistol/pistol_walk_backward.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'back', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.walk_arc', name: 'Pistol Walk Arc', category: 'movement', source: 'animations/weapon-pistol/pistol_walk_arc.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'arc', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.walk_arc_v2', name: 'Pistol Walk Arc (Alt)', category: 'movement', source: 'animations/weapon-pistol/pistol_walk_arc_v2.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'arc', 'pistol', 'alt'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.walk_back_arc', name: 'Pistol Walk Back Arc', category: 'movement', source: 'animations/weapon-pistol/pistol_walk_backward_arc.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'back', 'arc', 'pistol'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.walk_back_arc_v2', name: 'Pistol Walk Back Arc (Alt)', category: 'movement', source: 'animations/weapon-pistol/pistol_walk_backward_arc_v2.fbx', clipName: 'mixamo.com', duration: 1.2, loop: true, tags: ['walk', 'back', 'arc', 'alt'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.run', name: 'Pistol Run', category: 'movement', source: 'animations/weapon-pistol/pistol_run.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.run_back', name: 'Pistol Run Back', category: 'movement', source: 'animations/weapon-pistol/pistol_run_backward.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'back', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.run_arc', name: 'Pistol Run Arc', category: 'movement', source: 'animations/weapon-pistol/pistol_run_arc.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'arc', 'pistol'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.run_arc_v2', name: 'Pistol Run Arc (Alt)', category: 'movement', source: 'animations/weapon-pistol/pistol_run_arc_v2.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'arc', 'pistol', 'alt'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.run_back_arc', name: 'Pistol Run Back Arc', category: 'movement', source: 'animations/weapon-pistol/pistol_run_backward_arc.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'back', 'arc', 'pistol'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.run_back_arc_v2', name: 'Pistol Run Back Arc (Alt)', category: 'movement', source: 'animations/weapon-pistol/pistol_run_backward_arc_v2.fbx', clipName: 'mixamo.com', duration: 0.8, loop: true, tags: ['run', 'back', 'arc', 'alt'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.strafe', name: 'Pistol Strafe', category: 'movement', source: 'animations/weapon-pistol/pistol_strafe.fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['strafe', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.strafe_v2', name: 'Pistol Strafe (Alt)', category: 'movement', source: 'animations/weapon-pistol/pistol_strafe_v2.fbx', clipName: 'mixamo.com', duration: 1.0, loop: true, tags: ['strafe', 'pistol', 'alt'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.jump', name: 'Pistol Jump', category: 'movement', source: 'animations/weapon-pistol/pistol_jump.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['jump', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.jump_v2', name: 'Pistol Jump (Alt)', category: 'movement', source: 'animations/weapon-pistol/pistol_jump_v2.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['jump', 'pistol', 'alt'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.kneel_enter', name: 'Pistol Stand to Kneel', category: 'movement', source: 'animations/weapon-pistol/pistol_stand_to_kneel.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['kneel', 'crouch', 'enter', 'pistol'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.kneel_idle', name: 'Pistol Kneeling Idle', category: 'idle', source: 'animations/weapon-pistol/pistol_kneeling_idle.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['kneel', 'idle', 'pistol', 'wand'], classes: ['Mage', 'Ranger'] },
  { id: 'pistol.kneel_exit', name: 'Pistol Kneel to Stand', category: 'movement', source: 'animations/weapon-pistol/pistol_kneel_to_stand.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['kneel', 'stand', 'exit', 'pistol'], classes: ['Mage', 'Ranger'] },

  // ═══════════════════════════════════════════════════════════════
  // BLOCKING / PARRY — Weapon-specific & generic
  // ═══════════════════════════════════════════════════════════════
  // -- Generic (any weapon / unarmed)
  { id: 'block.generic', name: 'Block (Generic)', category: 'block', source: 'animations/action-adventure/blocking_generic.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['block', 'generic', 'unarmed', 'any'], classes: [] },
  { id: 'block.standing', name: 'Standing Block', category: 'block', source: 'animations/action-adventure/standing_block.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['block', 'standing', 'generic'], classes: [] },
  { id: 'block.inward', name: 'Inward Block (Parry)', category: 'block', source: 'animations/action-adventure/inward_block.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['block', 'inward', 'parry', 'deflect'], classes: [] },
  // -- Block impact reactions (heavy hit while blocking)
  { id: 'block.react_large', name: 'Block React (Heavy Hit)', category: 'combat_reaction', source: 'animations/action-adventure/block_react_large.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['block', 'react', 'heavy', 'impact', 'stagger'], classes: [] },
  { id: 'block.react_large_v2', name: 'Block React (Heavy Hit Alt)', category: 'combat_reaction', source: 'animations/action-adventure/block_react_large_v2.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['block', 'react', 'heavy', 'impact', 'alt'], classes: [] },
  // -- Sword & Shield specific
  { id: 'block.sns_extra', name: 'Sword & Shield Block', category: 'block', source: 'animations/action-adventure/sns_block_extra.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['block', 'shield', 'sword', 'sns', 'warrior'], classes: ['Warrior'] },
  { id: 'block.sns_idle_extra', name: 'Sword & Shield Block Idle', category: 'block', source: 'animations/action-adventure/sns_block_idle_extra.fbx', clipName: 'mixamo.com', duration: 3.0, loop: true, tags: ['block', 'idle', 'shield', 'sns', 'warrior', 'hold'], classes: ['Warrior'] },
  // -- Great Sword / 2H weapons (greatsword, great axe, 2h hammer, spear)
  { id: 'block.greatsword', name: 'Great Sword Block', category: 'block', source: 'animations/action-adventure/greatsword_block.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['block', 'greatsword', '2h', 'heavy', 'parry'], classes: ['Warrior'] },
  { id: 'block.greatsword_v2', name: 'Great Sword Block (Hold)', category: 'block', source: 'animations/action-adventure/greatsword_block_v2.fbx', clipName: 'mixamo.com', duration: 2.0, loop: true, tags: ['block', 'greatsword', '2h', 'hold', 'sustained'], classes: ['Warrior'] },
  { id: 'block.greatsword_v3', name: 'Great Sword Block (Parry)', category: 'block', source: 'animations/action-adventure/greatsword_block_v3.fbx', clipName: 'mixamo.com', duration: 0.8, loop: false, tags: ['block', 'greatsword', '2h', 'parry', 'deflect'], classes: ['Warrior'] },
  { id: 'combat.jump_attack', name: 'Jump Attack', category: 'combat_melee', source: 'animations/action-adventure/jump_attack.fbx', clipName: 'mixamo.com', duration: 1.2, loop: false, tags: ['jump', 'attack', 'dash', 'gap_closer', 'combo', 'warrior', 'charge'], classes: ['Warrior'] },
  { id: 'combat.dual_combo', name: 'Dual Weapon Combo', category: 'combat_melee', source: 'animations/action-adventure/dual_weapon_combo.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['dual', 'dagger', 'combo', 'melee', 'fast', 'ranger'], classes: ['Ranger'] },
  { id: 'death.electrocuted', name: 'Electrocuted / Fire Death', category: 'death', source: 'animations/action-adventure/being_electrocuted.fbx', clipName: 'mixamo.com', duration: 2.5, loop: false, tags: ['death', 'electrocute', 'fire', 'lightning', 'elemental', 'magic'], classes: [] },
  { id: 'react.stunned', name: 'Stunned (Wobble)', category: 'combat_reaction', source: 'animations/action-adventure/wobbling.fbx', clipName: 'mixamo.com', duration: 2.0, loop: true, tags: ['stun', 'wobble', 'daze', 'cc', 'disabled'], classes: [] },
  { id: 'combat.dagger_stab', name: 'Double Dagger Stab', category: 'combat_melee', source: 'animations/action-adventure/double_dagger_stab.fbx', clipName: 'mixamo.com', duration: 1.0, loop: false, tags: ['dagger', 'stab', 'dual', 'burst', 'skill', 'finisher', 'ranger'], classes: ['Ranger'] },
  { id: 'combat.melee_run_jump', name: 'Melee Run Jump Attack', category: 'combat_melee', source: 'animations/action-adventure/melee_run_jump_attack.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['jump', 'attack', 'run', 'dash', 'gap_closer', 'melee', 'generic'], classes: [] },
  { id: 'combat.gs_jump_attack', name: 'Great Sword Jump Attack', category: 'combat_melee', source: 'animations/action-adventure/greatsword_jump_attack.fbx', clipName: 'mixamo.com', duration: 1.5, loop: false, tags: ['jump', 'attack', 'greatsword', '2h', 'dash', 'gap_closer', 'heavy'], classes: ['Warrior'] },
];

// ── Lookup helpers ─────────────────────────────────────────────

const _byId = new Map<string, AnimEntry>();
const _byCategory = new Map<AnimCategory, AnimEntry[]>();
const _byTag = new Map<string, AnimEntry[]>();

function buildIndex() {
  if (_byId.size > 0) return;
  for (const entry of ANIM_LIBRARY) {
    _byId.set(entry.id, entry);

    if (!_byCategory.has(entry.category)) _byCategory.set(entry.category, []);
    _byCategory.get(entry.category)!.push(entry);

    for (const tag of entry.tags) {
      if (!_byTag.has(tag)) _byTag.set(tag, []);
      _byTag.get(tag)!.push(entry);
    }
  }
}

export function getAnim(id: string): AnimEntry | undefined {
  buildIndex();
  return _byId.get(id);
}

export function getAnimsByCategory(category: AnimCategory): AnimEntry[] {
  buildIndex();
  return _byCategory.get(category) || [];
}

export function getAnimsByTag(tag: string): AnimEntry[] {
  buildIndex();
  return _byTag.get(tag) || [];
}

export function getAnimsForClass(heroClass: string): AnimEntry[] {
  buildIndex();
  return ANIM_LIBRARY.filter(a => a.classes.length === 0 || a.classes.includes(heroClass));
}

export function searchAnims(query: string): AnimEntry[] {
  buildIndex();
  const q = query.toLowerCase();
  return ANIM_LIBRARY.filter(a =>
    a.id.includes(q) || a.name.toLowerCase().includes(q) ||
    a.tags.some(t => t.includes(q))
  );
}

/**
 * CC0 universal fallback set — guaranteed to work on any humanoid skeleton.
 * These are animation-only FBX files from the CC0 Essential Animation pack.
 */
export const CC0_FALLBACK_SET: Record<string, string> = {
  idle: 'cc0.idle',
  run: 'cc0.run',
  attack: 'cc0.attack',
  hit: 'cc0.hit',
  death: 'cc0.death',
};

/** Get a default animation set for a class (idle, walk, run, attack, death, etc) */
export function getDefaultAnimSet(heroClass: string): Record<string, string> {
  const isMage = heroClass === 'Mage';
  const isRanger = heroClass === 'Ranger';
  const isWorg = heroClass === 'Worg';

  return {
    // CC0 universal fallbacks (always available, any skeleton)
    ...CC0_FALLBACK_SET,
    // Class-specific overrides (loaded on top of CC0 base)
    // Warriors use Sword+Shield weapon pack
    idle: isMage ? 'idle.wizard' : isRanger ? 'bow.idle' : isWorg ? 'idle.combat_02' : 'sns.idle',
    walk: isMage ? 'move.walk_wizard' : isRanger ? 'bow.walk_forward' : 'sns.walk',
    walk_back: isRanger ? 'bow.walk_back' : 'move.run_back',
    walk_left: isRanger ? 'bow.walk_left' : 'move.run_left',
    walk_right: isRanger ? 'bow.walk_right' : 'move.run_right',
    run: isMage ? 'move.run' : isRanger ? 'bow.run_forward' : isWorg ? 'move.run_fast' : 'sns.run',
    run_back: isRanger ? 'bow.run_back' : 'move.run_back',
    run_left: isRanger ? 'bow.run_left' : 'move.run_left',
    run_right: isRanger ? 'bow.run_right' : 'move.run_right',
    sprint: 'move.sprint',
    jump: isMage ? 'move.jump' : 'sns.jump',
    // Combat
    attack: isMage ? 'combat.staff_attack' : isRanger ? 'combat.archery_shot' : isWorg ? 'combat.dagger_1' : 'sns.attack',
    attack_2: isMage ? 'combat.spell_1' : isRanger ? 'combat.dagger_2' : 'sns.attack_2',
    attack_3: isMage ? 'combat.spell_2' : isRanger ? 'combat.gun_shoot' : 'sns.attack_3',
    slash: 'sns.slash',
    slash_2: 'sns.slash_2',
    slash_combo: 'sns.slash_4',
    slash_finisher: 'sns.slash_5',
    kick: 'sns.kick',
    jump_attack: 'combat.jump_attack',
    combo: isMage ? 'combat.spell_2' : 'combat.punch_combo_1',
    ranged: isRanger ? 'combat.archery_shot' : isMage ? 'combat.spell_1' : 'combat.crouch_throw',
    spell: isMage ? 'combat.charged_spell' : 'sns.casting',
    power_up: 'sns.power_up',
    // Block (Warriors get full shield block system)
    block: 'sns.block',
    block_idle: 'sns.block_idle',
    block_2: 'sns.block_2',
    crouch_block: 'sns.crouch_block',
    crouch_block_idle: 'sns.crouch_block_idle',
    parry: 'block.inward',
    block_react: 'block.react_large',
    block_generic: 'block.generic',
    block_2h: 'block.greatsword',
    block_2h_hold: 'block.greatsword_v2',
    block_2h_parry: 'block.greatsword_v3',
    // Crouch
    crouch: 'sns.crouch',
    crouch_idle: 'sns.crouch_idle',
    crouching: 'sns.crouching',
    // Dodge / reactions
    dodge: 'dodge.roll',
    hit: 'sns.impact',
    hit_2: 'sns.impact_2',
    knockdown: 'react.knockdown',
    getup: 'react.getting_up',
    stunned: 'react.stunned',
    death: 'sns.death',
    // Utility
    sheath: 'sns.sheath_1',
    harvest: 'harvest.working',
    pickup: 'harvest.pickup',
    swim: 'swim.forward',
    swim_idle: 'swim.idle',
    wave: 'social.wave',
    interact: 'social.interact',
    taunt: 'social.taunt',
    // Turns
    turn_left: isRanger ? 'bow.turn_90_left' : 'sns.turn',
    turn_right: isRanger ? 'bow.turn_90_right' : 'sns.turn_2',
    turn_180: 'sns.turn_180',
    // Mount / Vehicle
    mount_drive: 'mount.driving',
  };
}
