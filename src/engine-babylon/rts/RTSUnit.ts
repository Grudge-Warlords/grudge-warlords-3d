/**
 * RTSUnit — RTS game unit with KayKit GLB mesh, stats, selection, movement.
 * Reworked from Density Wars Core.ts.
 */

import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Animation } from '@babylonjs/core/Animations/animation';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/core/Animations/animatable';
import { distance2D } from './RTSFormations';

// ── Unit Type Definitions (KayKit characters) ────────────────

export interface UnitTypeDef {
  id: string;
  name: string;
  model: string;            // GLB path relative to /assets/models/characters/
  hp: number;
  damage: number;
  attackRange: number;       // melee ~2, ranged ~12
  speed: number;
  mass: number;
  scale: number;
  faction: 'player' | 'enemy';
  color: [number, number, number];
}

export const UNIT_TYPES: Record<string, UnitTypeDef> = {
  warrior:   { id: 'warrior',   name: 'Knight',     model: 'crusaders_knight.glb', hp: 150, damage: 18, attackRange: 2.5, speed: 3.0, mass: 2, scale: 0.5, faction: 'player', color: [0.9, 0.8, 0.3] },
  mage:      { id: 'mage',      name: 'Wizard',     model: 'Animated_Wizard.glb',  hp: 80,  damage: 30, attackRange: 12,  speed: 2.5, mass: 1, scale: 0.5, faction: 'player', color: [0.5, 0.3, 0.9] },
  ranger:    { id: 'ranger',    name: 'Ranger',     model: 'ElfRanger.glb',        hp: 100, damage: 22, attackRange: 14,  speed: 3.5, mass: 1, scale: 0.5, faction: 'player', color: [0.3, 0.8, 0.4] },
  berserker: { id: 'berserker', name: 'Berserker',  model: 'berserker.glb',        hp: 120, damage: 25, attackRange: 2.5, speed: 3.2, mass: 2, scale: 0.5, faction: 'player', color: [0.9, 0.5, 0.2] },
  skeleton:  { id: 'skeleton',  name: 'Skeleton',   model: 'Skeleton.glb',         hp: 50,  damage: 10, attackRange: 2.5, speed: 2.0, mass: 1, scale: 0.5, faction: 'enemy',  color: [0.7, 0.7, 0.6] },
  zombie:    { id: 'zombie',    name: 'Zombie',     model: 'Animated_Zombie.glb',  hp: 100, damage: 15, attackRange: 2.5, speed: 1.5, mass: 2, scale: 0.5, faction: 'enemy',  color: [0.4, 0.6, 0.3] },
  orc:       { id: 'orc',       name: 'Orc',        model: 'graatorc.glb',         hp: 130, damage: 20, attackRange: 2.5, speed: 2.5, mass: 2, scale: 0.5, faction: 'enemy',  color: [0.6, 0.3, 0.3] },
};

// ── Command types ────────────────────────────────────────────

export enum CommandType { Idle, Move, Attack, Defend }

// ── RTSUnit class ────────────────────────────────────────────

let _unitIdCounter = 0;

export class RTSUnit {
  public id: number;
  public typeDef: UnitTypeDef;
  public scene: Scene;

  // Mesh
  public root: TransformNode;
  public meshes: AbstractMesh[] = [];
  public animGroups: AnimationGroup[] = [];
  public loaded = false;

  // Selection ring
  public selectionRing: AbstractMesh | null = null;

  // Stats
  public hp: number;
  public maxHp: number;
  public isSelected = false;
  public isDead = false;
  public faction: 'player' | 'enemy';

  // Movement
  public command: CommandType = CommandType.Idle;
  public moveTarget: Vector3 | null = null;
  public attackTarget: RTSUnit | null = null;

  // Combat cooldown
  private _attackCooldown = 0;

  constructor(scene: Scene, typeDef: UnitTypeDef) {
    this.id = _unitIdCounter++;
    this.scene = scene;
    this.typeDef = typeDef;
    this.hp = typeDef.hp;
    this.maxHp = typeDef.hp;
    this.faction = typeDef.faction;

    this.root = new TransformNode(`unit_${this.id}_${typeDef.id}`, scene);
  }

  get position(): Vector3 { return this.root.position; }
  set position(v: Vector3) { this.root.position = v; }

  /** Load the GLB model asynchronously. */
  async load(): Promise<void> {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        '/assets/models/characters/', this.typeDef.model, this.scene,
      );
      container.addAllToScene();

      // Parent all meshes under root
      for (const mesh of container.meshes) {
        if (!mesh.parent || mesh.parent === container.rootNodes[0]) {
          mesh.parent = this.root;
        }
        mesh.isPickable = true;
        mesh.metadata = { type: 'unit', unitId: this.id, faction: this.faction };
      }
      this.meshes = container.meshes;
      this.animGroups = container.animationGroups;

      // Scale
      this.root.scaling.setAll(this.typeDef.scale);

      // Stop default anims, play idle if available
      for (const ag of this.animGroups) ag.stop();
      this._playAnim('idle', true) || this._playAnim('Idle', true) || this._playFirstAnim(true);

      this.loaded = true;
    } catch (e) {
      // Fallback: create a colored sphere
      console.warn(`[RTSUnit] Failed to load ${this.typeDef.model}, using fallback`, e);
      const sphere = MeshBuilder.CreateSphere(`unit_${this.id}_fallback`, { diameter: 1 }, this.scene);
      const mat = new StandardMaterial(`unit_${this.id}_mat`, this.scene);
      mat.diffuseColor = new Color3(...this.typeDef.color);
      sphere.material = mat;
      sphere.parent = this.root;
      sphere.position.y = 0.5;
      sphere.isPickable = true;
      sphere.metadata = { type: 'unit', unitId: this.id, faction: this.faction };
      this.meshes = [sphere];
      this.loaded = true;
    }

    // Create selection ring
    this.selectionRing = MeshBuilder.CreateTorus(`sel_${this.id}`, { diameter: 1.4, thickness: 0.06, tessellation: 24 }, this.scene);
    const ringMat = new StandardMaterial(`selMat_${this.id}`, this.scene);
    ringMat.diffuseColor = new Color3(0.2, 1, 0.2);
    ringMat.emissiveColor = new Color3(0.1, 0.6, 0.1);
    this.selectionRing.material = ringMat;
    this.selectionRing.parent = this.root;
    this.selectionRing.position.y = 0.05;
    this.selectionRing.isPickable = false;
    this.selectionRing.isVisible = false;
  }

  // ── Selection ─────────────────────────────────────────────

  select(): void {
    this.isSelected = true;
    if (this.selectionRing) this.selectionRing.isVisible = true;
  }

  deselect(): void {
    this.isSelected = false;
    if (this.selectionRing) this.selectionRing.isVisible = false;
  }

  // ── Commands ──────────────────────────────────────────────

  moveTo(target: Vector3): void {
    this.command = CommandType.Move;
    this.moveTarget = target.clone();
    this.moveTarget.y = 0;
    this.attackTarget = null;
  }

  attackUnit(target: RTSUnit): void {
    this.command = CommandType.Attack;
    this.attackTarget = target;
    this.moveTarget = null;
  }

  // ── Update (call each frame) ──────────────────────────────

  update(dt: number): void {
    if (this.isDead) return;
    this._attackCooldown = Math.max(0, this._attackCooldown - dt);

    switch (this.command) {
      case CommandType.Move:
        this._updateMove(dt);
        break;
      case CommandType.Attack:
        this._updateAttack(dt);
        break;
    }
  }

  private _updateMove(dt: number): void {
    if (!this.moveTarget) { this.command = CommandType.Idle; return; }
    const dir = this.moveTarget.subtract(this.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.3) {
      this.command = CommandType.Idle;
      this.moveTarget = null;
      return;
    }
    dir.normalize();
    this.position.addInPlace(dir.scale(this.typeDef.speed * dt));
    // Face direction
    this.root.rotation.y = Math.atan2(dir.x, dir.z);
  }

  private _updateAttack(dt: number): void {
    if (!this.attackTarget || this.attackTarget.isDead) {
      this.command = CommandType.Idle;
      this.attackTarget = null;
      return;
    }
    const dist = distance2D(this.position, this.attackTarget.position);
    if (dist > this.typeDef.attackRange) {
      // Move into range
      const dir = this.attackTarget.position.subtract(this.position);
      dir.y = 0;
      dir.normalize();
      this.position.addInPlace(dir.scale(this.typeDef.speed * dt));
      this.root.rotation.y = Math.atan2(dir.x, dir.z);
    } else if (this._attackCooldown <= 0) {
      // Attack!
      this.attackTarget.takeDamage(this.typeDef.damage);
      this._attackCooldown = 1; // 1 second between attacks
    }
  }

  // ── Damage ────────────────────────────────────────────────

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.die();
  }

  die(): void {
    this.isDead = true;
    this.command = CommandType.Idle;
    // Fade out and dispose after delay
    setTimeout(() => this.dispose(), 2000);
    // Scale down as death anim
    if (this.root) this.root.scaling.setAll(this.typeDef.scale * 0.3);
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    for (const ag of this.animGroups) ag.dispose();
    if (this.selectionRing) this.selectionRing.dispose();
    this.root.dispose();
  }

  // ── Animation helpers ─────────────────────────────────────

  private _playAnim(name: string, loop: boolean): boolean {
    const ag = this.animGroups.find(g => g.name.toLowerCase().includes(name.toLowerCase()));
    if (ag) { ag.start(loop); return true; }
    return false;
  }

  private _playFirstAnim(loop: boolean): void {
    if (this.animGroups.length > 0) this.animGroups[0].start(loop);
  }
}
