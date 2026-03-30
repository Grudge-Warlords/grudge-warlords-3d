/**
 * RetargetPage — Grudge Animation Retargeting Tool.
 *
 * Load a target avatar GLB, load source animation GLBs, retarget, preview, export.
 * Uses Babylon.js 9.0 AnimatorAvatar API under the hood.
 *
 * Route: /retarget
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GrudgeRetargetTool, type RetargetToolState } from '../engine-babylon/GrudgeRetargetTool';

const FONT = "'Oxanium', sans-serif";
const GOLD = '#c5a059';
const DARK = 'rgba(10,10,26,0.92)';

// Default avatar for quick testing
const DEFAULT_AVATARS = [
  { label: 'T-Pose 00', url: '/assets/models/characters/', file: 'tpose_character.glb' },
  { label: 'T-Pose 01', url: '/assets/models/characters/', file: 'tpose_character01.glb' },
];

export default function RetargetPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<GrudgeRetargetTool | null>(null);
  const [state, setState] = useState<RetargetToolState>({
    avatarLoaded: false,
    avatarName: '',
    sourceAnimations: [],
    retargetedAnimations: [],
    currentAnimation: '',
    showSkeleton: false,
  });
  const [status, setStatus] = useState('Ready. Load an avatar to begin.');

  // ── Init engine ─────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    container.querySelector('.viewport')?.appendChild(canvas);

    const tool = new GrudgeRetargetTool(canvas, setState);
    toolRef.current = tool;

    const onResize = () => tool.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      tool.dispose();
      canvas.remove();
    };
  }, []);

  // ── Load Avatar ─────────────────────────────────────────
  const loadAvatar = useCallback(async (url: string, file: string) => {
    const tool = toolRef.current;
    if (!tool) return;
    setStatus(`Loading avatar: ${file}...`);
    try {
      await tool.loadAvatar(url, file);
      setStatus(`Avatar loaded: ${file}`);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }, []);

  // ── Load Animation File ─────────────────────────────────
  const loadAnimFile = useCallback(async (files: FileList | null) => {
    const tool = toolRef.current;
    if (!tool || !files?.length) return;

    for (const file of Array.from(files)) {
      setStatus(`Loading animation: ${file.name}...`);
      const url = URL.createObjectURL(file);
      try {
        const loaded = await tool.loadAnimation(url + '#', file.name);
        setStatus(`Loaded ${loaded.length} animation(s) from ${file.name}`);
      } catch (e: any) {
        setStatus(`Error loading ${file.name}: ${e.message}`);
      }
    }
  }, []);

  // ── Retarget ────────────────────────────────────────────
  const retargetAll = useCallback(() => {
    const tool = toolRef.current;
    if (!tool) return;
    setStatus('Retargeting all animations...');
    const results = tool.retargetAll();
    setStatus(`Retargeted ${results.length} animation(s)`);
  }, []);

  const retargetOne = useCallback((name: string) => {
    const tool = toolRef.current;
    if (!tool) return;
    setStatus(`Retargeting: ${name}...`);
    const result = tool.retarget(name);
    setStatus(result ? `Retargeted: ${name}` : `Failed to retarget: ${name}`);
  }, []);

  // ── Playback ────────────────────────────────────────────
  const play = useCallback((name: string) => {
    toolRef.current?.playAnimation(name);
  }, []);

  const stop = useCallback(() => {
    toolRef.current?.stopAnimation();
  }, []);

  // ── Skeleton toggle ─────────────────────────────────────
  const toggleSkel = useCallback(() => {
    toolRef.current?.toggleSkeleton();
  }, []);

  // ── Custom avatar from file input ───────────────────────
  const loadAvatarFile = useCallback(async (files: FileList | null) => {
    const tool = toolRef.current;
    if (!tool || !files?.length) return;
    const file = files[0];
    const url = URL.createObjectURL(file);
    await loadAvatar(url + '#', file.name);
  }, [loadAvatar]);

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', fontFamily: FONT, color: '#ccc', background: '#0a0a1a' }}>
      {/* Sidebar */}
      <div style={{ width: 300, flexShrink: 0, background: DARK, borderRight: `1px solid ${GOLD}30`, overflowY: 'auto', padding: 12 }}>
        {/* Header */}
        <div style={{ color: GOLD, fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 12 }}>
          GRUDGE RETARGET TOOL
        </div>

        {/* Status */}
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
          {status}
        </div>

        {/* Avatar Section */}
        <Section title="TARGET AVATAR">
          {DEFAULT_AVATARS.map(a => (
            <Btn key={a.file} label={a.label} onClick={() => loadAvatar(a.url, a.file)} />
          ))}
          <label style={btnStyle}>
            📂 Load GLB File
            <input type="file" accept=".glb,.gltf" hidden onChange={e => loadAvatarFile(e.target.files)} />
          </label>
          {state.avatarLoaded && (
            <div style={{ fontSize: 11, color: '#66bb6a', marginTop: 4 }}>✓ {state.avatarName}</div>
          )}
          <Btn label={state.showSkeleton ? '🦴 Hide Skeleton' : '🦴 Show Skeleton'} onClick={toggleSkel} />
        </Section>

        {/* Animation Source */}
        <Section title="SOURCE ANIMATIONS">
          <label style={btnStyle}>
            📂 Load Animation GLB/FBX
            <input type="file" accept=".glb,.gltf,.fbx" multiple hidden onChange={e => loadAnimFile(e.target.files)} />
          </label>
          {state.sourceAnimations.map(name => (
            <div key={name} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              <SmallBtn label="▶" onClick={() => play(name)} />
              <SmallBtn label="🔀" onClick={() => retargetOne(name)} />
            </div>
          ))}
        </Section>

        {/* Retarget */}
        <Section title="RETARGET">
          <Btn
            label="🔀 Retarget All"
            onClick={retargetAll}
            disabled={!state.avatarLoaded || state.sourceAnimations.length === 0}
          />
          {state.retargetedAnimations.map(r => (
            <div key={r.name} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: state.currentAnimation === r.name ? GOLD : '#aaa',
              }}>
                {r.name}
              </span>
              <SmallBtn label="▶" onClick={() => play(r.name)} />
              <SmallBtn label="⏹" onClick={stop} />
            </div>
          ))}
        </Section>

        {/* Back */}
        <div style={{ marginTop: 20 }}>
          <Btn label="← Back to 3D World" onClick={() => { window.location.href = '/'; }} />
        </div>
      </div>

      {/* Viewport */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
        <div className="viewport" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ── UI Components ────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.2em', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px', marginTop: 4,
  borderRadius: 4, border: `1px solid ${GOLD}40`, background: 'rgba(197,160,89,0.08)',
  color: '#ccc', fontSize: 11, fontFamily: FONT, cursor: 'pointer', textAlign: 'center' as const,
};

function Btn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...btnStyle, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {label}
    </button>
  );
}

function SmallBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 6px', borderRadius: 3, border: `1px solid ${GOLD}30`,
        background: 'transparent', color: '#aaa', fontSize: 10, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
