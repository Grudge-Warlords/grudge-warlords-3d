/**
 * HeroPreview — Renders a voxel hero model on a canvas for the character panel.
 * Shows the hero with currently equipped armor/weapon visuals.
 * Used in the top-left of the panel and centered in the Equipment tab.
 */

import { useRef, useEffect, useState } from 'react';
import { VoxelRenderer } from '@/game/voxel';
import { CharacterData } from '@/game/character-data';
import { buildEquipmentAppearance } from '@/game/voxel-equipment';
import { CLASS_COLORS } from '@/game/types';

interface HeroPreviewProps {
  data: CharacterData;
  size?: number;
  showName?: boolean;
  showStats?: boolean;
  animate?: boolean;
}

export function HeroPreview({ data, size = 128, showName = true, showStats = false, animate = true }: HeroPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const voxelRef = useRef<VoxelRenderer | null>(null);
  const animRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!voxelRef.current) {
      voxelRef.current = new VoxelRenderer();
    }
    const voxel = voxelRef.current;
    const ctx = canvas.getContext('2d')!;

    let running = true;
    let lastTime = performance.now();

    function draw() {
      if (!running) return;
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      timerRef.current += dt;

      ctx.clearRect(0, 0, size, size);

      // Dark background with subtle gradient
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
      grad.addColorStop(0, '#2a2218');
      grad.addColorStop(1, '#1a1410');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(size / 2, size * 0.82, size * 0.25, size * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw hero voxel model
      const heroName = data.heroName;
      const race = data.heroRace;
      const heroClass = data.heroClass;
      const animState = animate ? 'idle' : 'idle';
      const animTimer = animate ? timerRef.current : 0;

      // Use the voxel renderer's drawHeroVoxel which handles all the model building
      ctx.save();
      // drawHeroVoxel(ctx, x, y, raceColor, classColor, heroClass, facing, animState, animTimer, race, heroName?, ...)
      const raceColors: Record<string, string> = { Human: '#c4956a', Barbarian: '#a57850', Dwarf: '#d4a574', Elf: '#e8d5b8', Orc: '#5a8a3a', Undead: '#7a8a7a' };
      const classColors: Record<string, string> = { Warrior: '#ef4444', Mage: '#8b5cf6', Ranger: '#22c55e', Worg: '#f97316' };
      voxel.drawHeroVoxel(
        ctx,
        size / 2,
        size * 0.7,
        raceColors[race] || '#c4956a',
        classColors[heroClass] || '#888',
        heroClass,
        Math.PI * 0.5,
        animState,
        animTimer,
        race,
        heroName,
      );
      ctx.restore();

      if (animate) {
        animRef.current = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [data.heroName, data.heroRace, data.heroClass, size, animate]);

  const classColor = CLASS_COLORS[data.heroClass] || '#c5a059';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          border: `2px solid ${classColor}40`,
          imageRendering: 'pixelated',
        }}
      />
      {showName && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#e8d5b0', fontSize: 11, fontWeight: 600 }}>{data.heroName}</div>
          <div style={{ color: classColor, fontSize: 9 }}>
            {data.heroRace} {data.heroClass}
          </div>
        </div>
      )}
      {showStats && (
        <div style={{
          display: 'flex',
          gap: 8,
          fontSize: 9,
          color: '#8a7a5a',
        }}>
          <span>ATK {data.atk}</span>
          <span>DEF {data.def}</span>
          <span>SPD {data.spd}</span>
        </div>
      )}
    </div>
  );
}
