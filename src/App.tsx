import { useEffect, useRef, useState } from 'react';
import { OpenWorldThreeRenderer } from './game/ow-three-renderer';

/**
 * Grudge Warlords 3D — Main Application
 * Single full-screen WebGL game. No 2D fallback.
 */
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<OpenWorldThreeRenderer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: OpenWorldThreeRenderer;
    try {
      renderer = new OpenWorldThreeRenderer(container);
      rendererRef.current = renderer;
    } catch (e: any) {
      setError(`WebGL initialization failed: ${e.message}`);
      setLoading(false);
      return;
    }

    // Load player model (default warrior for now)
    renderer.loadPlayerModel(0, 'Warrior', 'Human').then(() => {
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Game loop
    let animId = 0;
    let playerX = 4000;
    let playerY = 4000;
    let playerFacing = 0;
    let animState = 'idle';
    const keys = new Set<string>();

    const loop = () => {
      const speed = keys.has('shift') ? 160 : 80;
      const dt = 1 / 60;
      let mx = 0, my = 0;
      if (keys.has('w')) my = -1;
      if (keys.has('s')) my = 1;
      if (keys.has('a')) mx = -1;
      if (keys.has('d')) mx = 1;

      if (mx !== 0 || my !== 0) {
        const len = Math.sqrt(mx * mx + my * my);
        playerX += (mx / len) * speed * dt;
        playerY += (my / len) * speed * dt;
        playerFacing = Math.atan2(my, mx);
        animState = keys.has('shift') ? 'run' : 'walk';
      } else {
        animState = 'idle';
      }

      renderer.update(playerX, playerY, playerFacing, animState, performance.now() / 1000, 1.0);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    const onKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)', color: '#c5a059', fontFamily: "'Oxanium', sans-serif",
          fontSize: 24, fontWeight: 700,
        }}>
          LOADING WORLD...
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#000', color: '#ef4444', fontFamily: "'Oxanium', sans-serif",
          fontSize: 18, textAlign: 'center', padding: 40,
        }}>
          {error}<br /><br />
          <span style={{ fontSize: 14, color: '#888' }}>WebGL is required. Update your browser or enable hardware acceleration.</span>
        </div>
      )}
    </div>
  );
}
