import { Vec2 } from './types';

export type CursorState = 'default' | 'target' | 'attack' | 'move' | 'attackmove' | 'ability' | 'aoe_target';

export interface AOEIndicator {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRange: number;
  color: string;
  abilityIndex: number;
  validPlacement: boolean;
}

export interface AreaDamageZone {
  id: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  team: number;
  sourceId: number;
  tickInterval: number;
  tickTimer: number;
  ticksRemaining: number;
  life: number;
  maxLife: number;
  stunChance: number;
  stunTime: number;
  color: string;
  hitEntities: Set<number>;
  zoneType: 'fire' | 'frost' | 'poison' | 'lightning' | 'holy' | 'shadow';
}

export class MouseTargetingManager {
  cursorState: CursorState = 'default';
  storedMousePosition: Vec2 = { x: 0, y: 0 };
  worldMousePosition: Vec2 = { x: 0, y: 0 };
  isTargeting: boolean = false;
  skillIndex: number = -1;

  aoeIndicator: AOEIndicator = {
    active: false,
    x: 0, y: 0,
    radius: 100,
    maxRange: 600,
    color: '#ef4444',
    abilityIndex: -1,
    validPlacement: true,
  };

  private heroPosition: Vec2 = { x: 0, y: 0 };

  updateHeroPosition(pos: Vec2) {
    this.heroPosition = { x: pos.x, y: pos.y };
  }

  updateMouseWorld(pos: Vec2) {
    this.worldMousePosition = { x: pos.x, y: pos.y };

    if (this.aoeIndicator.active) {
      const dx = pos.x - this.heroPosition.x;
      const dy = pos.y - this.heroPosition.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.aoeIndicator.maxRange) {
        const scale = this.aoeIndicator.maxRange / dist;
        this.aoeIndicator.x = this.heroPosition.x + dx * scale;
        this.aoeIndicator.y = this.heroPosition.y + dy * scale;
      } else {
        this.aoeIndicator.x = pos.x;
        this.aoeIndicator.y = pos.y;
      }

      this.aoeIndicator.validPlacement = dist <= this.aoeIndicator.maxRange * 1.1;
    }
  }

  startAOETargeting(abilityIndex: number, radius: number, maxRange: number, color: string) {
    this.isTargeting = true;
    this.skillIndex = abilityIndex;
    this.cursorState = 'aoe_target';
    this.aoeIndicator.active = true;
    this.aoeIndicator.radius = radius;
    this.aoeIndicator.maxRange = maxRange;
    this.aoeIndicator.color = color;
    this.aoeIndicator.abilityIndex = abilityIndex;
  }

  confirmAOETarget(): Vec2 | null {
    if (!this.aoeIndicator.active) return null;

    this.storedMousePosition = {
      x: this.aoeIndicator.x,
      y: this.aoeIndicator.y,
    };

    const pos = { ...this.storedMousePosition };
    this.cancelTargeting();
    return pos;
  }

  cancelTargeting() {
    this.isTargeting = false;
    this.skillIndex = -1;
    this.cursorState = 'default';
    this.aoeIndicator.active = false;
    this.aoeIndicator.abilityIndex = -1;
  }

  setAttackCursor() {
    this.cursorState = 'attack';
  }

  setDefaultCursor() {
    if (!this.isTargeting) {
      this.cursorState = 'default';
      this.skillIndex = -1;
    }
  }

  setMoveCursor() {
    if (!this.isTargeting) {
      this.cursorState = 'move';
    }
  }

  renderAOEIndicator(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, canvasW: number, canvasH: number) {
    if (!this.aoeIndicator.active) return;

    const sx = (this.aoeIndicator.x - camX) * zoom + canvasW / 2;
    const sy = (this.aoeIndicator.y - camY) * zoom + canvasH / 2;
    const sr = this.aoeIndicator.radius * zoom;

    const hsx = (this.heroPosition.x - camX) * zoom + canvasW / 2;
    const hsy = (this.heroPosition.y - camY) * zoom + canvasH / 2;
    const maxR = this.aoeIndicator.maxRange * zoom;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(hsx, hsy, maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const valid = this.aoeIndicator.validPlacement;
    const baseColor = valid ? this.aoeIndicator.color : '#ff0000';
    const pulse = 0.4 + Math.sin(Date.now() * 0.005) * 0.15;

    ctx.globalAlpha = pulse * 0.3;
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = pulse * 0.8;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = pulse * 0.6;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(sx - 8, sy);
    ctx.lineTo(sx + 8, sy);
    ctx.moveTo(sx, sy - 8);
    ctx.lineTo(sx, sy + 8);
    ctx.stroke();

    ctx.restore();
  }
}

export function createAreaDamageZone(
  id: number,
  x: number, y: number,
  radius: number,
  damage: number,
  team: number,
  sourceId: number,
  ticks: number,
  tickInterval: number,
  stunChance: number,
  stunTime: number,
  color: string,
  zoneType: AreaDamageZone['zoneType']
): AreaDamageZone {
  return {
    id, x, y, radius, damage, team, sourceId,
    tickInterval,
    tickTimer: 0,
    ticksRemaining: ticks,
    life: ticks * tickInterval,
    maxLife: ticks * tickInterval,
    stunChance, stunTime, color,
    hitEntities: new Set(),
    zoneType,
  };
}

export function renderAreaDamageZone(
  ctx: CanvasRenderingContext2D,
  zone: AreaDamageZone,
  camX: number, camY: number,
  zoom: number, canvasW: number, canvasH: number,
  time: number
) {
  const sx = (zone.x - camX) * zoom + canvasW / 2;
  const sy = (zone.y - camY) * zoom + canvasH / 2;
  const sr = zone.radius * zoom;
  const lifeRatio = zone.life / zone.maxLife;

  ctx.save();

  const zoneColors: Record<string, { fill: string; stroke: string; particle: string }> = {
    fire: { fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', particle: '#ff6600' },
    frost: { fill: 'rgba(96,165,250,0.15)', stroke: '#60a5fa', particle: '#93c5fd' },
    poison: { fill: 'rgba(34,197,94,0.12)', stroke: '#22c55e', particle: '#4ade80' },
    lightning: { fill: 'rgba(250,204,21,0.15)', stroke: '#facc15', particle: '#fef08a' },
    holy: { fill: 'rgba(251,191,36,0.15)', stroke: '#fbbf24', particle: '#fde68a' },
    shadow: { fill: 'rgba(139,92,246,0.15)', stroke: '#8b5cf6', particle: '#a78bfa' },
  };

  const colors = zoneColors[zone.zoneType] || zoneColors.fire;

  ctx.globalAlpha = lifeRatio * 0.5;
  ctx.fillStyle = colors.fill;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = lifeRatio * 0.8;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.stroke();

  const innerPulse = 0.3 + Math.sin(time * 4) * 0.2;
  ctx.globalAlpha = lifeRatio * innerPulse;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(sx, sy, sr * (0.5 + Math.sin(time * 3) * 0.15), 0, Math.PI * 2);
  ctx.stroke();

  if (zone.tickTimer < 0.15) {
    ctx.globalAlpha = (0.15 - zone.tickTimer) / 0.15 * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, sr * (zone.tickTimer / 0.15), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
