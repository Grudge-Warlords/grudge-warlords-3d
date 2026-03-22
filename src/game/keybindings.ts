/**
 * Keybind System — Single unified controller for ALL game modes
 *
 * WASD = Move
 * 1-5 = Weapon skills (from equipped weapon)
 * Q = Class skill
 * R = Class defensive (Warrior: invincible, Ranger: crit focus, Mage: shield, Worg: bear form)
 * Space = Dodge/Roll/Blink (class-specific)
 * Shift = Sprint
 * X = Quick backstep (face same direction)
 * E = Block/Parry
 * LMB = Auto-attack (melee)
 * RMB = Ranged attack (class-specific)
 * F = Interact
 * Tab = Target lock
 */

export enum KeybindAction {
  // Movement
  MoveUp = 'MoveUp',
  MoveDown = 'MoveDown',
  MoveLeft = 'MoveLeft',
  MoveRight = 'MoveRight',
  Sprint = 'Sprint',

  // Combat
  Attack = 'Attack',             // LMB — melee auto-attack
  RangedAttack = 'RangedAttack', // RMB — class ranged attack
  Dodge = 'Dodge',               // Space — dodge/roll/blink (class-specific)
  Backstep = 'Backstep',         // X — quick backstep, stay facing
  Block = 'Block',               // E — block/parry

  // Weapon Skills (1-5 from equipped weapon)
  Skill1 = 'Skill1',
  Skill2 = 'Skill2',
  Skill3 = 'Skill3',
  Skill4 = 'Skill4',
  Skill5 = 'Skill5',

  // Class Abilities
  ClassSkill = 'ClassSkill',         // Q — class skill
  ClassDefensive = 'ClassDefensive', // R — class defensive

  // Interaction
  Interact = 'Interact',         // F
  TargetLock = 'TargetLock',     // Tab

  // Consumables
  Consumable1 = 'Consumable1',  // 6
  Consumable2 = 'Consumable2',  // 7

  // UI
  ToggleInventory = 'ToggleInventory',
  ToggleCharPanel = 'ToggleCharPanel',
  ToggleMissions = 'ToggleMissions',
  ToggleSkillTree = 'ToggleSkillTree',
  ToggleShop = 'ToggleShop',
  Pause = 'Pause',

  // Camera
  ZoomIn = 'ZoomIn',
  ZoomOut = 'ZoomOut',
}

export const ACTION_CATEGORIES: Record<string, KeybindAction[]> = {
  Movement: [KeybindAction.MoveUp, KeybindAction.MoveDown, KeybindAction.MoveLeft, KeybindAction.MoveRight, KeybindAction.Sprint],
  Combat: [KeybindAction.Attack, KeybindAction.RangedAttack, KeybindAction.Dodge, KeybindAction.Backstep, KeybindAction.Block],
  'Weapon Skills': [KeybindAction.Skill1, KeybindAction.Skill2, KeybindAction.Skill3, KeybindAction.Skill4, KeybindAction.Skill5],
  'Class Abilities': [KeybindAction.ClassSkill, KeybindAction.ClassDefensive],
  Consumables: [KeybindAction.Consumable1, KeybindAction.Consumable2],
  Interaction: [KeybindAction.Interact, KeybindAction.TargetLock],
  UI: [KeybindAction.ToggleInventory, KeybindAction.ToggleCharPanel, KeybindAction.ToggleMissions, KeybindAction.ToggleSkillTree, KeybindAction.ToggleShop, KeybindAction.Pause],
  Camera: [KeybindAction.ZoomIn, KeybindAction.ZoomOut],
};

export const ACTION_LABELS: Record<KeybindAction, string> = {
  [KeybindAction.MoveUp]: 'Move Up (W)',
  [KeybindAction.MoveDown]: 'Move Down (S)',
  [KeybindAction.MoveLeft]: 'Move Left (A)',
  [KeybindAction.MoveRight]: 'Move Right (D)',
  [KeybindAction.Sprint]: 'Sprint (Shift)',
  [KeybindAction.Attack]: 'Attack (LMB)',
  [KeybindAction.RangedAttack]: 'Ranged Attack (RMB)',
  [KeybindAction.Dodge]: 'Dodge / Roll / Blink (Space)',
  [KeybindAction.Backstep]: 'Quick Backstep (X)',
  [KeybindAction.Block]: 'Block / Parry (E)',
  [KeybindAction.Skill1]: 'Weapon Skill 1',
  [KeybindAction.Skill2]: 'Weapon Skill 2',
  [KeybindAction.Skill3]: 'Weapon Skill 3',
  [KeybindAction.Skill4]: 'Weapon Skill 4',
  [KeybindAction.Skill5]: 'Weapon Skill 5',
  [KeybindAction.ClassSkill]: 'Class Skill (Q)',
  [KeybindAction.ClassDefensive]: 'Class Defensive (R)',
  [KeybindAction.Interact]: 'Interact (F)',
  [KeybindAction.TargetLock]: 'Target Lock (Tab)',
  [KeybindAction.Consumable1]: 'Potion / Food (6)',
  [KeybindAction.Consumable2]: 'Buff / Mana Pot (7)',
  [KeybindAction.ToggleInventory]: 'Inventory (I)',
  [KeybindAction.ToggleCharPanel]: 'Character (C)',
  [KeybindAction.ToggleMissions]: 'Missions (J)',
  [KeybindAction.ToggleSkillTree]: 'Skill Tree (N)',
  [KeybindAction.ToggleShop]: 'Shop (B)',
  [KeybindAction.Pause]: 'Menu (Esc)',
  [KeybindAction.ZoomIn]: 'Zoom In (+)',
  [KeybindAction.ZoomOut]: 'Zoom Out (-)',
};

export interface KeyBind {
  key: string;
  isMouseButton: boolean;
  mouseButton: number;
  modifiers: { shift: boolean; ctrl: boolean; alt: boolean };
}

export type KeybindConfig = Record<KeybindAction, KeyBind>;

export function makeKeyBind(key: string, shift = false, ctrl = false, alt = false): KeyBind {
  return { key: key.toLowerCase(), isMouseButton: false, mouseButton: -1, modifiers: { shift, ctrl, alt } };
}

export function makeMouseBind(button: number, shift = false, ctrl = false, alt = false): KeyBind {
  return { key: '', isMouseButton: true, mouseButton: button, modifiers: { shift, ctrl, alt } };
}

export function getDefaultBindings(): KeybindConfig {
  return {
    // Movement
    [KeybindAction.MoveUp]: makeKeyBind('w'),
    [KeybindAction.MoveDown]: makeKeyBind('s'),
    [KeybindAction.MoveLeft]: makeKeyBind('a'),
    [KeybindAction.MoveRight]: makeKeyBind('d'),
    [KeybindAction.Sprint]: makeKeyBind('shift'),

    // Combat
    [KeybindAction.Attack]: makeMouseBind(0),        // LMB
    [KeybindAction.RangedAttack]: makeMouseBind(2),  // RMB
    [KeybindAction.Dodge]: makeKeyBind(' '),          // Space
    [KeybindAction.Backstep]: makeKeyBind('x'),       // X
    [KeybindAction.Block]: makeKeyBind('e'),           // E

    // Weapon Skills 1-5
    [KeybindAction.Skill1]: makeKeyBind('1'),
    [KeybindAction.Skill2]: makeKeyBind('2'),
    [KeybindAction.Skill3]: makeKeyBind('3'),
    [KeybindAction.Skill4]: makeKeyBind('4'),
    [KeybindAction.Skill5]: makeKeyBind('5'),

    // Class Abilities
    [KeybindAction.ClassSkill]: makeKeyBind('q'),     // Q
    [KeybindAction.ClassDefensive]: makeKeyBind('r'),  // R

    // Interaction
    [KeybindAction.Interact]: makeKeyBind('f'),        // F
    [KeybindAction.TargetLock]: makeKeyBind('tab'),

    // Consumables
    [KeybindAction.Consumable1]: makeKeyBind('6'),
    [KeybindAction.Consumable2]: makeKeyBind('7'),

    // UI
    [KeybindAction.ToggleInventory]: makeKeyBind('i'),
    [KeybindAction.ToggleCharPanel]: makeKeyBind('c'),
    [KeybindAction.ToggleMissions]: makeKeyBind('j'),
    [KeybindAction.ToggleSkillTree]: makeKeyBind('n'),
    [KeybindAction.ToggleShop]: makeKeyBind('b'),
    [KeybindAction.Pause]: makeKeyBind('escape'),

    // Camera
    [KeybindAction.ZoomIn]: makeKeyBind('='),
    [KeybindAction.ZoomOut]: makeKeyBind('-'),
  };
}

const STORAGE_KEY = 'grudge_keybindings_v2';

export function loadKeybindings(): KeybindConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultBindings();
      for (const action of Object.values(KeybindAction)) {
        if (!parsed[action]) parsed[action] = defaults[action];
      }
      return parsed;
    }
  } catch {}
  return getDefaultBindings();
}

export function saveKeybindings(config: KeybindConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetKeybindings(): KeybindConfig {
  const defaults = getDefaultBindings();
  saveKeybindings(defaults);
  return defaults;
}

export function keyBindLabel(bind: KeyBind): string {
  const parts: string[] = [];
  if (bind.modifiers.ctrl) parts.push('Ctrl');
  if (bind.modifiers.shift) parts.push('Shift');
  if (bind.modifiers.alt) parts.push('Alt');
  if (bind.isMouseButton) {
    const mouseLabels: Record<number, string> = { 0: 'LMB', 1: 'MMB', 2: 'RMB' };
    parts.push(mouseLabels[bind.mouseButton] || `Mouse${bind.mouseButton}`);
  } else {
    const keyLabels: Record<string, string> = {
      ' ': 'Space', 'tab': 'Tab', 'escape': 'Esc', 'shift': 'Shift',
    };
    parts.push(keyLabels[bind.key] || bind.key.toUpperCase());
  }
  return parts.join('+');
}

export function matchesKeyDown(bind: KeyBind, e: KeyboardEvent): boolean {
  if (bind.isMouseButton) return false;
  if (bind.key !== e.key.toLowerCase()) return false;
  if (bind.modifiers.shift !== e.shiftKey) return false;
  if (bind.modifiers.ctrl !== e.ctrlKey) return false;
  if (bind.modifiers.alt !== e.altKey) return false;
  return true;
}

export function matchesMouseDown(bind: KeyBind, e: MouseEvent): boolean {
  if (!bind.isMouseButton) return false;
  if (bind.mouseButton !== e.button) return false;
  return true;
}
