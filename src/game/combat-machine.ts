import { createMachine, createActor, assign } from 'xstate';

export interface CombatContext {
  comboCount: number;
  comboTimer: number;
  lastAttackTime: number;
  isShiftHeld: boolean;
  isRHeld: boolean;
  isRmbHeld: boolean;
  isLmbHeld: boolean;
  isSpaceHeld: boolean;
  jumpCount: number;
  dashCooldown: number;
  blockActive: boolean;
  wallContact: boolean;
  climbing: boolean;
  airborne: boolean;
  currentAction: string;
  actionTimer: number;
  damage: number;
  screenShake: number;
  animState: string;
  vfxQueue: CombatVFX[];
}

export interface CombatVFX {
  type: 'slash' | 'impact' | 'projectile' | 'ground_ring' | 'burst' | 'energy_wave' | 'uppercut_trail' | 'spin_trail' | 'earthquake_ring' | 'launch_trail';
  color: string;
  radius: number;
  duration: number;
  angle?: number;
  count?: number;
}

export type CombatEvent =
  | { type: 'LMB_DOWN' }
  | { type: 'LMB_UP' }
  | { type: 'RMB_DOWN' }
  | { type: 'RMB_UP' }
  | { type: 'SPACE_DOWN' }
  | { type: 'SPACE_UP' }
  | { type: 'SHIFT_DOWN' }
  | { type: 'SHIFT_UP' }
  | { type: 'R_DOWN' }
  | { type: 'R_UP' }
  | { type: 'E_DOWN' }
  | { type: 'E_UP' }
  | { type: 'KEY_1' }
  | { type: 'KEY_2' }
  | { type: 'KEY_3' }
  | { type: 'KEY_J' }
  | { type: 'KEY_K' }
  | { type: 'KEY_L' }
  | { type: 'TICK'; dt: number }
  | { type: 'WALL_CONTACT' }
  | { type: 'WALL_LEAVE' }
  | { type: 'LAND' }
  | { type: 'COMBO_TIMEOUT' }
  | { type: 'ACTION_COMPLETE' };

const COMBO_WINDOW = 0.6;
const DASH_COOLDOWN = 0.8;
const BLOCK_DRAIN = 0;

function spawnVFX(type: CombatVFX['type'], color: string, radius: number, duration: number, extra?: Partial<CombatVFX>): CombatVFX {
  return { type, color, radius, duration, ...extra };
}

export const combatMachine = createMachine({
  id: 'combat',
  initial: 'idle',
  context: {
    comboCount: 0,
    comboTimer: 0,
    lastAttackTime: 0,
    isShiftHeld: false as boolean,
    isRHeld: false as boolean,
    isRmbHeld: false as boolean,
    isLmbHeld: false as boolean,
    isSpaceHeld: false as boolean,
    jumpCount: 0,
    dashCooldown: 0,
    blockActive: false as boolean,
    wallContact: false as boolean,
    climbing: false as boolean,
    airborne: false as boolean,
    currentAction: 'idle',
    actionTimer: 0,
    damage: 0,
    screenShake: 0,
    animState: 'idle',
    vfxQueue: [] as CombatVFX[],
  } satisfies CombatContext,
  on: {
    SHIFT_DOWN: { actions: assign({ isShiftHeld: true }) },
    SHIFT_UP: { actions: assign({ isShiftHeld: false }) },
    R_DOWN: { actions: assign({ isRHeld: true }) },
    R_UP: { actions: assign({ isRHeld: false }) },
    RMB_DOWN: { actions: assign({ isRmbHeld: true }) },
    RMB_UP: { actions: assign({ isRmbHeld: false }) },
    LMB_DOWN: { actions: assign({ isLmbHeld: true }) },
    LMB_UP: { actions: assign({ isLmbHeld: false }) },
    SPACE_DOWN: { actions: assign({ isSpaceHeld: true }) },
    SPACE_UP: { actions: assign({ isSpaceHeld: false }) },
    WALL_CONTACT: { actions: assign({ wallContact: true }) },
    WALL_LEAVE: { actions: assign({ wallContact: false, climbing: false }) },
    TICK: {
      actions: assign({
        dashCooldown: ({ context, event }) => Math.max(0, context.dashCooldown - (event as { type: 'TICK'; dt: number }).dt),
        comboTimer: ({ context, event }) => Math.max(0, context.comboTimer - (event as { type: 'TICK'; dt: number }).dt),
        actionTimer: ({ context, event }) => Math.max(0, context.actionTimer - (event as { type: 'TICK'; dt: number }).dt),
        screenShake: ({ context, event }) => Math.max(0, context.screenShake - (event as { type: 'TICK'; dt: number }).dt),
      }),
    },
  },
  states: {
    idle: {
      entry: assign({
        animState: 'idle',
        currentAction: 'idle',
        damage: 0,
        vfxQueue: [] as CombatVFX[],
      }),
      on: {
        LMB_DOWN: [
          {
            guard: ({ context }) => context.isRHeld && context.isShiftHeld,
            target: 'swordBlaster',
          },
          {
            guard: ({ context }) => context.isRHeld,
            target: 'fastCombo',
          },
          {
            guard: ({ context }) => context.isShiftHeld && context.dashCooldown <= 0,
            target: 'dashAttack',
          },
          {
            guard: ({ context }) => context.airborne,
            target: 'jumpBash',
          },
          {
            target: 'attack',
          },
        ],
        RMB_DOWN: [
          {
            guard: ({ context }) => context.isShiftHeld,
            target: 'launch',
          },
          {
            target: 'whirlwind',
          },
        ],
        SPACE_DOWN: [
          {
            guard: ({ context }) => context.airborne && context.isRmbHeld,
            target: 'earthquake',
          },
          {
            guard: ({ context }) => context.airborne && context.jumpCount < 2,
            target: 'doubleJump',
          },
          {
            guard: ({ context }) => !context.airborne,
            target: 'jump',
          },
        ],
        E_DOWN: { target: 'block' },
        KEY_1: { target: 'hadouken' },
        KEY_2: { target: 'shoryuken' },
        KEY_3: { target: 'tatsumaki' },
        KEY_J: { target: 'popJ' },
        KEY_K: { target: 'popK' },
        KEY_L: { target: 'popL' },
      },
    },

    attack: {
      entry: assign({
        comboCount: ({ context }) => context.comboTimer > 0 ? context.comboCount + 1 : 1,
        comboTimer: COMBO_WINDOW,
        animState: 'attack',
        currentAction: 'attack',
        actionTimer: 0.25,
        damage: ({ context }) => {
          const base = 1.0;
          const combo = context.comboTimer > 0 ? context.comboCount : 0;
          return base + combo * 0.15;
        },
        vfxQueue: ({ context }) => {
          const count = context.comboTimer > 0 ? context.comboCount + 1 : 1;
          return [spawnVFX('slash', count >= 3 ? '#ffd700' : '#ef4444', 28, 0.2)];
        },
        screenShake: ({ context }) => {
          const count = context.comboTimer > 0 ? context.comboCount + 1 : 1;
          return count >= 3 ? 0.1 : 0.03;
        },
      }),
      on: {
        LMB_DOWN: [
          {
            guard: ({ context }) => context.comboCount >= 3,
            target: 'comboFinisher',
          },
          {
            guard: ({ context }) => context.comboTimer > 0,
            target: 'attack',
          },
        ],
        ACTION_COMPLETE: { target: 'idle' },
      },
      after: {
        250: { target: 'idle' },
      },
    },

    comboFinisher: {
      entry: assign({
        comboCount: 0,
        comboTimer: 0,
        animState: 'combo_finisher',
        currentAction: 'combo_finisher',
        actionTimer: 0.4,
        damage: 2.5,
        screenShake: 0.15,
        vfxQueue: [
          spawnVFX('slash', '#ffd700', 40, 0.3),
          spawnVFX('burst', '#ffd700', 50, 0.4, { count: 8 }),
          spawnVFX('impact', '#ffffff', 35, 0.2),
        ],
      }),
      after: {
        400: { target: 'idle' },
      },
    },

    fastCombo: {
      entry: assign({
        comboCount: ({ context }) => context.comboCount + 1,
        comboTimer: COMBO_WINDOW,
        animState: 'attack',
        currentAction: 'fast_combo',
        actionTimer: 0.15,
        damage: 0.8,
        screenShake: 0.02,
        vfxQueue: [spawnVFX('slash', '#f97316', 22, 0.15)],
      }),
      on: {
        LMB_DOWN: {
          guard: ({ context }) => context.comboTimer > 0,
          target: 'fastCombo',
        },
        ACTION_COMPLETE: { target: 'idle' },
      },
      after: {
        150: [
          {
            guard: ({ context }) => context.comboCount >= 5,
            target: 'comboFinisher',
          },
          { target: 'idle' },
        ],
      },
    },

    swordBlaster: {
      entry: assign({
        animState: 'ability',
        currentAction: 'sword_blaster',
        actionTimer: 0.35,
        damage: 2.0,
        screenShake: 0.12,
        comboCount: 0,
        vfxQueue: [
          spawnVFX('energy_wave', '#a855f7', 60, 0.5),
          spawnVFX('slash', '#a855f7', 35, 0.25),
          spawnVFX('burst', '#d946ef', 45, 0.3, { count: 12 }),
        ],
      }),
      after: {
        350: { target: 'idle' },
      },
    },

    jump: {
      entry: assign({
        airborne: true,
        jumpCount: 1,
        animState: 'dodge',
        currentAction: 'jump',
        actionTimer: 0.4,
        vfxQueue: [spawnVFX('ground_ring', '#888888', 20, 0.2)],
      }),
      on: {
        SPACE_DOWN: {
          guard: ({ context }) => context.jumpCount < 2,
          target: 'doubleJump',
        },
        LMB_DOWN: { target: 'jumpBash' },
        RMB_DOWN: { target: 'earthquake' },
        LAND: { target: 'idle', actions: assign({ airborne: false, jumpCount: 0 }) },
      },
      after: {
        600: { target: 'idle', actions: assign({ airborne: false, jumpCount: 0 }) },
      },
    },

    doubleJump: {
      entry: assign({
        jumpCount: 2,
        animState: 'dodge',
        currentAction: 'double_jump',
        actionTimer: 0.5,
        vfxQueue: [
          spawnVFX('ground_ring', '#60a5fa', 25, 0.25),
          spawnVFX('burst', '#93c5fd', 15, 0.2, { count: 6 }),
        ],
      }),
      on: {
        LMB_DOWN: { target: 'jumpBash' },
        RMB_DOWN: { target: 'earthquake' },
        LAND: { target: 'idle', actions: assign({ airborne: false, jumpCount: 0 }) },
      },
      after: {
        700: { target: 'idle', actions: assign({ airborne: false, jumpCount: 0 }) },
      },
    },

    jumpBash: {
      entry: assign({
        animState: 'dash_attack',
        currentAction: 'jump_bash',
        actionTimer: 0.3,
        damage: 1.8,
        airborne: false,
        jumpCount: 0,
        screenShake: 0.12,
        vfxQueue: [
          spawnVFX('impact', '#f59e0b', 40, 0.3),
          spawnVFX('ground_ring', '#f59e0b', 50, 0.4),
          spawnVFX('burst', '#fbbf24', 30, 0.3, { count: 10 }),
        ],
      }),
      after: {
        300: { target: 'idle' },
      },
    },

    earthquake: {
      entry: assign({
        animState: 'ability',
        currentAction: 'earthquake',
        actionTimer: 0.8,
        damage: 3.0,
        airborne: false,
        jumpCount: 0,
        screenShake: 0.4,
        vfxQueue: [
          spawnVFX('earthquake_ring', '#92400e', 80, 0.6),
          spawnVFX('earthquake_ring', '#78350f', 120, 0.8),
          spawnVFX('ground_ring', '#a16207', 60, 0.5),
          spawnVFX('burst', '#d97706', 40, 0.4, { count: 20 }),
          spawnVFX('impact', '#ffffff', 50, 0.3),
        ],
      }),
      after: {
        800: { target: 'idle' },
      },
    },

    block: {
      entry: assign({
        blockActive: true,
        animState: 'block',
        currentAction: 'block',
        damage: 0,
        vfxQueue: [spawnVFX('ground_ring', '#3b82f6', 30, 0.3)],
      }),
      on: {
        E_UP: {
          target: 'idle',
          actions: assign({ blockActive: false }),
        },
      },
    },

    hadouken: {
      entry: assign({
        animState: 'ability',
        currentAction: 'hadouken',
        actionTimer: 0.4,
        damage: 2.2,
        screenShake: 0.08,
        vfxQueue: [
          spawnVFX('projectile', '#3b82f6', 15, 0.8),
          spawnVFX('burst', '#60a5fa', 25, 0.3, { count: 8 }),
          spawnVFX('energy_wave', '#2563eb', 30, 0.4),
        ],
      }),
      after: {
        400: { target: 'idle' },
      },
    },

    shoryuken: {
      entry: assign({
        animState: 'dash_attack',
        currentAction: 'shoryuken',
        actionTimer: 0.5,
        damage: 2.8,
        airborne: true,
        jumpCount: 1,
        screenShake: 0.15,
        vfxQueue: [
          spawnVFX('uppercut_trail', '#ef4444', 35, 0.4),
          spawnVFX('burst', '#fca5a5', 30, 0.3, { count: 10 }),
          spawnVFX('impact', '#ffffff', 25, 0.2),
        ],
      }),
      after: {
        500: { target: 'idle', actions: assign({ airborne: false, jumpCount: 0 }) },
      },
    },

    tatsumaki: {
      entry: assign({
        animState: 'ability',
        currentAction: 'tatsumaki',
        actionTimer: 0.8,
        damage: 1.5,
        airborne: true,
        screenShake: 0.08,
        vfxQueue: [
          spawnVFX('spin_trail', '#22c55e', 45, 0.7),
          spawnVFX('slash', '#22c55e', 35, 0.15),
          spawnVFX('slash', '#22c55e', 35, 0.15, { angle: Math.PI * 0.5 }),
          spawnVFX('slash', '#22c55e', 35, 0.15, { angle: Math.PI }),
          spawnVFX('slash', '#22c55e', 35, 0.15, { angle: Math.PI * 1.5 }),
        ],
      }),
      after: {
        800: { target: 'idle', actions: assign({ airborne: false, jumpCount: 0 }) },
      },
    },

    whirlwind: {
      entry: assign({
        animState: 'ability',
        currentAction: 'whirlwind',
        actionTimer: 0.1,
        damage: 0.6,
        screenShake: 0.03,
        vfxQueue: [
          spawnVFX('spin_trail', '#ef4444', 40, 0.3),
          spawnVFX('slash', '#ef4444', 30, 0.2),
        ],
      }),
      on: {
        RMB_UP: { target: 'idle', actions: assign({ isRmbHeld: false }) },
        TICK: {
          actions: assign({
            vfxQueue: [spawnVFX('slash', '#ef4444', 30, 0.15, { angle: Math.random() * Math.PI * 2 })],
            damage: 0.3,
          }),
        },
      },
    },

    dashAttack: {
      entry: assign({
        animState: 'dash_attack',
        currentAction: 'dash_attack',
        actionTimer: 0.25,
        damage: 1.6,
        dashCooldown: DASH_COOLDOWN,
        screenShake: 0.08,
        vfxQueue: [
          spawnVFX('slash', '#f97316', 30, 0.2),
          spawnVFX('burst', '#fb923c', 20, 0.15, { count: 6 }),
        ],
      }),
      after: {
        250: { target: 'idle' },
      },
    },

    launch: {
      entry: assign({
        animState: 'dash_attack',
        currentAction: ({ context }) => context.isRmbHeld ? 'launch_jump' : 'launch',
        actionTimer: 0.35,
        damage: 1.4,
        airborne: ({ context }) => context.isRmbHeld,
        jumpCount: ({ context }) => context.isRmbHeld ? 1 : 0,
        dashCooldown: DASH_COOLDOWN,
        screenShake: 0.1,
        vfxQueue: ({ context }) => [
          spawnVFX('launch_trail', '#a855f7', 35, 0.3),
          spawnVFX('impact', '#d946ef', 30, 0.25),
          ...(context.isRmbHeld ? [spawnVFX('burst', '#c084fc', 25, 0.3, { count: 8 })] : []),
        ],
      }),
      after: {
        350: { target: 'idle' },
      },
    },

    popJ: {
      entry: assign({
        animState: 'attack',
        currentAction: 'pop_j',
        actionTimer: 0.2,
        damage: 0.5,
        vfxQueue: [spawnVFX('burst', '#ec4899', 20, 0.2, { count: 5 })],
      }),
      after: {
        200: { target: 'idle' },
      },
    },

    popK: {
      entry: assign({
        animState: 'attack',
        currentAction: 'pop_k',
        actionTimer: 0.2,
        damage: 0.7,
        vfxQueue: [spawnVFX('burst', '#f472b6', 25, 0.2, { count: 6 })],
      }),
      after: {
        200: { target: 'idle' },
      },
    },

    popL: {
      entry: assign({
        animState: 'attack',
        currentAction: 'pop_l',
        actionTimer: 0.2,
        damage: 1.0,
        screenShake: 0.05,
        vfxQueue: [
          spawnVFX('burst', '#f9a8d4', 30, 0.25, { count: 8 }),
          spawnVFX('impact', '#ec4899', 20, 0.15),
        ],
      }),
      after: {
        200: { target: 'idle' },
      },
    },

    climbing: {
      entry: assign({
        climbing: true,
        airborne: false,
        jumpCount: 0,
        animState: 'walk',
        currentAction: 'climbing',
      }),
      on: {
        WALL_LEAVE: {
          target: 'idle',
          actions: assign({ climbing: false }),
        },
        SPACE_DOWN: {
          target: 'jump',
          actions: assign({ climbing: false }),
        },
        LMB_DOWN: {
          target: 'attack',
          actions: assign({ climbing: false }),
        },
      },
    },
  },
});

export type CombatMachineState = ReturnType<typeof combatMachine.transition>;

export function createCombatActor() {
  return createActor(combatMachine);
}

export const COMBAT_ACTION_NAMES: Record<string, string> = {
  idle: 'Idle',
  attack: 'Attack',
  combo_finisher: 'Combo Finisher',
  fast_combo: 'Fast Combo',
  sword_blaster: 'Sword Blaster',
  jump: 'Jump',
  double_jump: 'Double Jump',
  jump_bash: 'Jump Bash',
  earthquake: 'Earthquake',
  block: 'Block',
  hadouken: 'Hadouken',
  shoryuken: 'Shoryuken',
  tatsumaki: 'Tatsumaki',
  whirlwind: 'Whirlwind',
  dash_attack: 'Dash Attack',
  launch: 'Launch',
  launch_jump: 'Launch + Jump',
  pop_j: 'Pop J',
  pop_k: 'Pop K',
  pop_l: 'Pop L',
  climbing: 'Climbing',
};

export const COMBAT_HOTKEY_LEGEND = [
  { keys: 'LMB', action: 'Attack' },
  { keys: 'LMB×3', action: 'Combo (3-hit)' },
  { keys: 'R + LMB×2', action: 'Fast Combo' },
  { keys: 'R + Shift + LMB×2', action: 'Sword Blaster' },
  { keys: 'J / K / L', action: 'Pop' },
  { keys: 'Space', action: 'Jump' },
  { keys: 'Space×2', action: 'Double Jump' },
  { keys: 'Space + LMB', action: 'Jump Bash' },
  { keys: 'Space + RMB hold', action: 'Earthquake' },
  { keys: 'E', action: 'Block' },
  { keys: '1', action: 'Hadouken' },
  { keys: '2', action: 'Shoryuken' },
  { keys: '3', action: 'Tatsumaki' },
  { keys: 'RMB hold', action: 'Whirlwind' },
  { keys: 'Shift', action: 'Dash' },
  { keys: 'Shift + LMB', action: 'Dash Attack' },
  { keys: 'Shift + RMB', action: 'Launch' },
  { keys: 'Shift + RMB hold', action: 'Launch + Jump' },
];
