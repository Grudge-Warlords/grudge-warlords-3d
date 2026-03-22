/**
 * Game Components — all data containers for the ECS.
 * Components are pure data. No logic.
 */

import * as THREE from 'three';
import { Component } from './ecs';

// ── Transform ──────────────────────────────────────────────────

export class TransformComponent extends Component {
  position = new THREE.Vector3();
  rotation = new THREE.Quaternion();
  scale = new THREE.Vector3(1, 1, 1);
  facing: number = 0; // Y-axis rotation in radians

  constructor(entityId: number, x = 0, y = 0, z = 0) {
    super(entityId);
    this.position.set(x, y, z);
  }
}

// ── Velocity ───────────────────────────────────────────────────

export class VelocityComponent extends Component {
  velocity = new THREE.Vector3();
  speed: number = 80;       // units per second
  sprintMultiplier: number = 1.6;
  sprinting: boolean = false;

  constructor(entityId: number) {
    super(entityId);
  }
}

// ── Input ──────────────────────────────────────────────────────

export class InputComponent extends Component {
  moveX: number = 0;        // -1 to 1
  moveZ: number = 0;        // -1 to 1
  sprint: boolean = false;
  attack: boolean = false;
  dodge: boolean = false;
  block: boolean = false;
  interact: boolean = false;
  ability1: boolean = false;
  ability2: boolean = false;
  ability3: boolean = false;
  ability4: boolean = false;
  mouseX: number = 0;
  mouseY: number = 0;

  constructor(entityId: number) {
    super(entityId);
  }

  reset(): void {
    this.attack = false;
    this.dodge = false;
    this.interact = false;
    this.ability1 = false;
    this.ability2 = false;
    this.ability3 = false;
    this.ability4 = false;
  }
}

// ── Health ──────────────────────────────────────────────────────

export class HealthComponent extends Component {
  hp: number;
  maxHp: number;
  mp: number = 100;
  maxMp: number = 100;
  dead: boolean = false;

  constructor(entityId: number, maxHp: number = 100) {
    super(entityId);
    this.hp = maxHp;
    this.maxHp = maxHp;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.dead = true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}

// ── Combat ─────────────────────────────────────────────────────

export class CombatComponent extends Component {
  atk: number = 10;
  def: number = 5;
  attackCooldown: number = 1.0;
  attackTimer: number = 0;
  targetEntityId: number | null = null;
  attackRange: number = 2.0;
  comboStep: number = 0;
  comboTimer: number = 0;

  constructor(entityId: number, atk = 10, def = 5) {
    super(entityId);
    this.atk = atk;
    this.def = def;
  }
}

// ── Animation ──────────────────────────────────────────────────

export class AnimationComponent extends Component {
  currentState: string = 'idle';
  previousState: string = '';
  mixer: THREE.AnimationMixer | null = null;
  actions = new Map<string, THREE.AnimationAction>();
  blendTime: number = 0.2;

  constructor(entityId: number) {
    super(entityId);
  }
}

// ── Render (Three.js mesh/group reference) ─────────────────────

export class RenderComponent extends Component {
  group: THREE.Group;
  modelPath: string = '';
  modelLoaded: boolean = false;
  shadow: THREE.Mesh | null = null;
  visible: boolean = true;

  constructor(entityId: number) {
    super(entityId);
    this.group = new THREE.Group();
  }
}

// ── Network (identifies networked entities) ────────────────────

export class NetworkComponent extends Component {
  /** Session ID from Colyseus */
  sessionId: string = '';
  /** Is this the local player? */
  isLocal: boolean = false;
  /** Is this a remote player? */
  isRemote: boolean = false;
  /** Last position sent to server (for delta compression) */
  lastSentPosition = new THREE.Vector3();
  /** Interpolation target for remote entities */
  targetPosition = new THREE.Vector3();
  targetFacing: number = 0;
  /** Send rate limiter */
  sendTimer: number = 0;
  sendRate: number = 1 / 20; // 20 Hz over geckos UDP

  constructor(entityId: number) {
    super(entityId);
  }
}

// ── Physics (Rapier body reference) ────────────────────────────

export class PhysicsComponent extends Component {
  /** Rapier rigid body handle (set by PhysicsSystem) */
  bodyHandle: number = -1;
  /** Rapier collider handle */
  colliderHandle: number = -1;
  /** Is grounded? */
  grounded: boolean = true;
  /** Gravity scale */
  gravityScale: number = 1.0;

  constructor(entityId: number) {
    super(entityId);
  }
}

// ── Player Tag (marks the local player entity) ─────────────────

export class PlayerTagComponent extends Component {
  race: string = 'Human';
  heroClass: string = 'Warrior';
  name: string = 'Player';
  level: number = 1;
  weaponType: string = 'swords';

  constructor(entityId: number, race: string, heroClass: string, name: string) {
    super(entityId);
    this.race = race;
    this.heroClass = heroClass;
    this.name = name;
  }
}

// ── Enemy Tag ──────────────────────────────────────────────────

export class EnemyTagComponent extends Component {
  type: string = 'Slime';
  level: number = 1;
  xpValue: number = 10;
  goldValue: number = 5;
  isBoss: boolean = false;
  homeX: number = 0;
  homeZ: number = 0;
  leashRange: number = 800;
  aiState: 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat' = 'idle';

  constructor(entityId: number, type: string, level: number) {
    super(entityId);
    this.type = type;
    this.level = level;
  }
}

// ── NPC Tag ────────────────────────────────────────────────────

export class NPCTagComponent extends Component {
  name: string = 'NPC';
  role: 'merchant' | 'quest' | 'trainer' | 'crafter' | 'guard' = 'quest';
  dialogue: string[] = [];
  shopTier: number = 1;

  constructor(entityId: number, name: string, role: NPCTagComponent['role']) {
    super(entityId);
    this.name = name;
    this.role = role;
  }
}
