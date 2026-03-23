/**
 * Open-World Animation State Machine
 *
 * Replaces scattered `p.animState = '...'` writes with a priority-based FSM
 * that handles transitions, blend-out, interruptibility, and auto-return.
 */

// ── State Type ─────────────────────────────────────────────────

export type OWAnimState =
  | 'idle'
  | 'walk'
  | 'attack'
  | 'lunge_slash'
  | 'combo_finisher'
  | 'ability'
  | 'dodge'
  | 'block'
  | 'dash_attack'
  | 'death';

// ── Per-State Config ───────────────────────────────────────────

interface StateConfig {
  /** Higher number = harder to interrupt */
  priority: number;
  /** How long this state lasts before auto-transitioning (-1 = indefinite) */
  duration: number;
  /** Seconds into the state before lower-priority states can interrupt */
  interruptibleAfter: number;
  /** Blend-out seconds when leaving this state */
  blendOutDuration: number;
  /** Auto-transition target when duration expires (defaults to 'idle') */
  nextState: OWAnimState;
}

const STATE_CONFIG: Record<OWAnimState, StateConfig> = {
  idle: {
    priority: 0,
    duration: -1,
    interruptibleAfter: 0,
    blendOutDuration: 0.06,
    nextState: 'idle',
  },
  walk: {
    priority: 1,
    duration: -1,
    interruptibleAfter: 0,
    blendOutDuration: 0.08,
    nextState: 'idle',
  },
  attack: {
    priority: 3,
    duration: 0.25,
    interruptibleAfter: 0.15,
    blendOutDuration: 0.06,
    nextState: 'idle',
  },
  lunge_slash: {
    priority: 4,
    duration: 0.30,
    interruptibleAfter: 0.18,
    blendOutDuration: 0.06,
    nextState: 'idle',
  },
  combo_finisher: {
    priority: 4,
    duration: 0.40,
    interruptibleAfter: 0.25,
    blendOutDuration: 0.08,
    nextState: 'idle',
  },
  ability: {
    priority: 3,
    duration: 0.50,
    interruptibleAfter: 0.20,
    blendOutDuration: 0.08,
    nextState: 'idle',
  },
  dodge: {
    priority: 5,
    duration: 0.30,
    interruptibleAfter: 0.25,
    blendOutDuration: 0.04,
    nextState: 'idle',
  },
  block: {
    priority: 2,
    duration: -1,
    interruptibleAfter: 0,
    blendOutDuration: 0.06,
    nextState: 'idle',
  },
  dash_attack: {
    priority: 4,
    duration: 0.35,
    interruptibleAfter: 0.20,
    blendOutDuration: 0.06,
    nextState: 'idle',
  },
  death: {
    priority: 10,
    duration: -1,
    interruptibleAfter: 999,
    blendOutDuration: 0,
    nextState: 'death',
  },
};

// ── FSM Class ──────────────────────────────────────────────────

export class OWAnimFSM {
  private _state: OWAnimState = 'idle';
  private _timer: number = 0;
  private _blendTimer: number = 0;
  private _prevState: OWAnimState = 'idle';
  private _frozen: boolean = false;

  get state(): OWAnimState { return this._state; }
  get timer(): number { return this._timer; }
  get prevState(): OWAnimState { return this._prevState; }

  /** 0..1 blend factor from prevState to current state (1 = fully in current) */
  get blendFactor(): number {
    const cfg = STATE_CONFIG[this._state];
    if (cfg.blendOutDuration <= 0 || this._blendTimer <= 0) return 1;
    return 1 - (this._blendTimer / cfg.blendOutDuration);
  }

  /** Pause animation timer (used by hit-stop) */
  freeze(): void { this._frozen = true; }
  unfreeze(): void { this._frozen = false; }
  get frozen(): boolean { return this._frozen; }

  /**
   * Attempt a state transition.
   * Returns true if the transition was accepted.
   *
   * @param newState  Target state
   * @param force     Bypass priority/interruptibility checks
   */
  tryTransition(newState: OWAnimState, force = false): boolean {
    if (newState === this._state && newState !== 'attack') return false;

    if (!force) {
      const current = STATE_CONFIG[this._state];
      const next = STATE_CONFIG[newState];

      // Can't interrupt higher-priority state before its interruptible window
      if (next.priority < current.priority && this._timer < current.interruptibleAfter) {
        return false;
      }

      // Same priority: only allow if current is past interruptible point
      if (next.priority === current.priority &&
          next.priority >= 3 &&
          this._timer < current.interruptibleAfter) {
        return false;
      }
    }

    const prevCfg = STATE_CONFIG[this._state];
    this._prevState = this._state;
    this._blendTimer = prevCfg.blendOutDuration;
    this._state = newState;
    this._timer = 0;
    this._frozen = false;
    return true;
  }

  /**
   * Tick the FSM. Call once per frame.
   * Returns the state that was auto-transitioned to, or null.
   */
  update(dt: number): OWAnimState | null {
    // Blend timer always ticks even when frozen
    if (this._blendTimer > 0) {
      this._blendTimer = Math.max(0, this._blendTimer - dt);
    }

    if (this._frozen) return null;

    this._timer += dt;

    const cfg = STATE_CONFIG[this._state];
    if (cfg.duration > 0 && this._timer >= cfg.duration) {
      const next = cfg.nextState;
      this._prevState = this._state;
      this._blendTimer = cfg.blendOutDuration;
      this._state = next;
      this._timer = 0;
      return next;
    }

    return null;
  }

  /** Hard reset to idle */
  reset(): void {
    this._state = 'idle';
    this._timer = 0;
    this._blendTimer = 0;
    this._prevState = 'idle';
    this._frozen = false;
  }
}
