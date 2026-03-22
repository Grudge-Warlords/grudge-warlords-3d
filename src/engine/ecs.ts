/**
 * ECS Core — Entity Component System
 * Based on NotBlox pattern: entities are IDs with component maps,
 * systems iterate entities matching component queries.
 *
 * Lightweight, no external deps, AI-friendly API.
 */

// ── Component ──────────────────────────────────────────────────

export type ComponentClass<T extends Component = Component> = new (entityId: number, ...args: any[]) => T;

export abstract class Component {
  constructor(public entityId: number) {}
}

// ── Entity ─────────────────────────────────────────────────────

let _nextEntityId = 1;

export class Entity {
  public readonly id: number;
  private components = new Map<ComponentClass, Component>();

  constructor(id?: number) {
    this.id = id ?? _nextEntityId++;
    if (id && id >= _nextEntityId) _nextEntityId = id + 1;
  }

  addComponent<T extends Component>(component: T): T {
    this.components.set(component.constructor as ComponentClass, component);
    return component;
  }

  removeComponent<T extends Component>(cls: ComponentClass<T>): void {
    this.components.delete(cls);
  }

  getComponent<T extends Component>(cls: ComponentClass<T>): T | undefined {
    return this.components.get(cls) as T | undefined;
  }

  hasComponent<T extends Component>(cls: ComponentClass<T>): boolean {
    return this.components.has(cls);
  }

  hasAllComponents(...classes: ComponentClass[]): boolean {
    return classes.every(cls => this.components.has(cls));
  }
}

// ── World ──────────────────────────────────────────────────────

export class World {
  private entities = new Map<number, Entity>();
  private systems: System[] = [];

  addEntity(entity: Entity): Entity {
    this.entities.set(entity.id, entity);
    return entity;
  }

  removeEntity(id: number): void {
    this.entities.delete(id);
  }

  getEntity(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  /** Query all entities that have ALL of the given component types */
  query(...componentClasses: ComponentClass[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.hasAllComponents(...componentClasses)) {
        result.push(entity);
      }
    }
    return result;
  }

  /** Query single entity with component combo (first match) */
  queryOne(...componentClasses: ComponentClass[]): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.hasAllComponents(...componentClasses)) return entity;
    }
    return undefined;
  }

  get entityCount(): number { return this.entities.size; }

  addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
    system.world = this;
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(dt);
    }
  }

  createEntity(): Entity {
    const entity = new Entity();
    this.addEntity(entity);
    return entity;
  }
}

// ── System ─────────────────────────────────────────────────────

export abstract class System {
  public world!: World;
  /** Lower priority runs first */
  public priority: number = 0;

  abstract update(dt: number): void;
}
