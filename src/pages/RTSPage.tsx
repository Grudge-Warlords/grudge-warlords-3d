/**
 * RTSPage — Grudge Warlords RTS mode.
 *
 * Density Wars reworked with KayKit units on Babylon.js 9.0.
 * Controls: WASD/arrows to pan, scroll to zoom, left-drag to select,
 * right-click to move/attack.
 *
 * Route: /rts
 */

import { useEffect, useRef } from 'react';
import { RTSGame } from '../engine-babylon/rts/RTSGame';

export default function RTSPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<RTSGame | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 3D canvas
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    container.appendChild(canvas);

    // 2D overlay canvas (for selection rectangle)
    const overlay = document.createElement('canvas');
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'block';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.pointerEvents = 'none';
    overlay.width = container.clientWidth;
    overlay.height = container.clientHeight;
    container.appendChild(overlay);

    // Create game
    const game = new RTSGame(canvas, overlay);
    gameRef.current = game;

    const onResize = () => {
      game.resize();
      overlay.width = container.clientWidth;
      overlay.height = container.clientHeight;
      game.selection.resize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      game.dispose();
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a1a',
        position: 'relative',
      }}
    >
      {/* Back button */}
      <button
        onClick={() => { window.location.href = '/'; }}
        style={{
          position: 'absolute', top: 10, right: 10, zIndex: 100,
          padding: '6px 14px', borderRadius: 6,
          background: 'rgba(10,10,26,0.9)', border: '1px solid #c5a05960',
          color: '#c5a059', fontFamily: "'Oxanium', sans-serif",
          fontSize: 12, cursor: 'pointer',
        }}
      >
        ← Back to 3D World
      </button>
    </div>
  );
}
