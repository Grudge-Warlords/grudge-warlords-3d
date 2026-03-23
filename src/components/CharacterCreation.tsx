/**
 * Character Creation — MMO-style with centered 3D model and arrow-based
 * body part customization.
 *
 * Flow: Faction → Race → Customize (arrow pickers) → Class → Name
 *
 * Customization uses bone scaling + palette recoloring on the voxel mesh
 * to simulate modular body part editing.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { loadCharacter, getCharacterDefsForRace, CHARACTER_DEFS, type CharacterDef, type CharacterInstance } from '../engine/character-loader';
import { applyRace, recolorPalette, RACE_CONFIGS, getRacesForFaction } from '../engine/race-mods';
import { equipClassStartingWeapons, detachAll } from '../engine/weapon-attach';
import { bindFallbackAnimations } from '../engine/animation-bind';

// ── Style Constants ────────────────────────────────────────────

const FONT = "'Oxanium', sans-serif";
const GOLD = '#c5a059';
const DIM = '#555';
const BG = '#08080f';
const PANEL = '#0c0c18';
const BORDER = '#1a1a2e';

// ── Data ───────────────────────────────────────────────────────

const FACTIONS = [
  { id: 'Crusade', name: 'THE CRUSADE', color: '#c5a059', desc: 'Honor-bound warriors and tacticians.' },
  { id: 'Fabled', name: 'THE FABLED', color: '#4fc3f7', desc: 'Ancient artisans and arcane scholars.' },
  { id: 'Legion', name: 'THE LEGION', color: '#ef5350', desc: 'Relentless conquerors and dark forces.' },
];

const CLASS_INFO: Record<string, { color: string; desc: string; icon: string }> = {
  Warrior: { color: '#ef5350', desc: 'Heavy armor, shields, devastating melee.', icon: '⚔' },
  Mage:    { color: '#7c4dff', desc: 'Arcane power, AoE spells, ranged devastation.', icon: '✦' },
  Ranger:  { color: '#66bb6a', desc: 'Bows, traps, daggers, high mobility.', icon: '🏹' },
  Worge:   { color: '#ff9800', desc: 'Shapeshifter: Bear, Raptor, Bird forms.', icon: '🐺' },
};
const CLASSES = ['Warrior', 'Mage', 'Ranger', 'Worge'];

// ── Customization Presets ──────────────────────────────────────

interface PartPreset {
  label: string;
  boneOverrides?: Record<string, THREE.Vector3>;
  paletteZone?: { start: number; end: number; color: string };
}

const BUILD_PRESETS: PartPreset[] = [
  { label: 'Average' },
  { label: 'Muscular', boneOverrides: { 'Spine': new THREE.Vector3(1.12, 1.0, 1.1), 'Arm': new THREE.Vector3(1.1, 1.0, 1.1) } },
  { label: 'Lean', boneOverrides: { 'Spine': new THREE.Vector3(0.92, 1.03, 0.92) } },
  { label: 'Heavy', boneOverrides: { 'Spine': new THREE.Vector3(1.15, 0.97, 1.15), 'UpLeg': new THREE.Vector3(1.08, 1.0, 1.08) } },
  { label: 'Tall', boneOverrides: { 'Spine': new THREE.Vector3(0.97, 1.06, 0.97), 'Leg': new THREE.Vector3(1.0, 1.08, 1.0) } },
  { label: 'Short', boneOverrides: { 'Spine': new THREE.Vector3(1.05, 0.92, 1.05), 'Leg': new THREE.Vector3(1.0, 0.9, 1.0) } },
];

const FACE_PRESETS: PartPreset[] = [
  { label: 'Standard' },
  { label: 'Broad', boneOverrides: { 'Head': new THREE.Vector3(1.1, 0.95, 1.05) } },
  { label: 'Narrow', boneOverrides: { 'Head': new THREE.Vector3(0.9, 1.05, 0.95) } },
  { label: 'Round', boneOverrides: { 'Head': new THREE.Vector3(1.08, 1.08, 1.08) } },
  { label: 'Angular', boneOverrides: { 'Head': new THREE.Vector3(0.95, 1.02, 0.9) } },
];

const SKIN_PRESETS: PartPreset[] = [
  { label: 'Light', paletteZone: { start: 0, end: 0.3, color: '#e8d5b8' } },
  { label: 'Fair', paletteZone: { start: 0, end: 0.3, color: '#d4b896' } },
  { label: 'Tan', paletteZone: { start: 0, end: 0.3, color: '#c4956a' } },
  { label: 'Bronze', paletteZone: { start: 0, end: 0.3, color: '#a57850' } },
  { label: 'Brown', paletteZone: { start: 0, end: 0.3, color: '#7a5a3a' } },
  { label: 'Dark', paletteZone: { start: 0, end: 0.3, color: '#5a3a2a' } },
  { label: 'Ash', paletteZone: { start: 0, end: 0.3, color: '#7a8a7a' } },
  { label: 'Jade', paletteZone: { start: 0, end: 0.3, color: '#5a8a3a' } },
];

const HAIR_PRESETS: PartPreset[] = [
  { label: 'Black', paletteZone: { start: 0.6, end: 0.8, color: '#1a1a1a' } },
  { label: 'Dark Brown', paletteZone: { start: 0.6, end: 0.8, color: '#3a2a1a' } },
  { label: 'Brown', paletteZone: { start: 0.6, end: 0.8, color: '#6a4a2a' } },
  { label: 'Auburn', paletteZone: { start: 0.6, end: 0.8, color: '#8a3a1a' } },
  { label: 'Red', paletteZone: { start: 0.6, end: 0.8, color: '#aa2a1a' } },
  { label: 'Blonde', paletteZone: { start: 0.6, end: 0.8, color: '#c5a059' } },
  { label: 'Platinum', paletteZone: { start: 0.6, end: 0.8, color: '#d8d0c0' } },
  { label: 'White', paletteZone: { start: 0.6, end: 0.8, color: '#e8e4e0' } },
  { label: 'Blue', paletteZone: { start: 0.6, end: 0.8, color: '#3a5a9a' } },
  { label: 'Green', paletteZone: { start: 0.6, end: 0.8, color: '#2a6a3a' } },
  { label: 'Purple', paletteZone: { start: 0.6, end: 0.8, color: '#6a2a8a' } },
];

const EYE_PRESETS: PartPreset[] = [
  { label: 'Brown', paletteZone: { start: 0.85, end: 0.92, color: '#5a3a1a' } },
  { label: 'Blue', paletteZone: { start: 0.85, end: 0.92, color: '#3a6aaa' } },
  { label: 'Green', paletteZone: { start: 0.85, end: 0.92, color: '#3a7a3a' } },
  { label: 'Amber', paletteZone: { start: 0.85, end: 0.92, color: '#aa7a2a' } },
  { label: 'Red', paletteZone: { start: 0.85, end: 0.92, color: '#aa2a2a' } },
  { label: 'Silver', paletteZone: { start: 0.85, end: 0.92, color: '#a8a8b8' } },
  { label: 'Gold', paletteZone: { start: 0.85, end: 0.92, color: '#c5a030' } },
  { label: 'Violet', paletteZone: { start: 0.85, end: 0.92, color: '#7a3aaa' } },
];

type Step = 'faction' | 'race' | 'customize' | 'class' | 'name';

interface CharacterCreationProps {
  onCreate: (char: { race: string; heroClass: string; name: string; bodyTypeId: number; skinColor: string }) => void;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function CharacterCreation({ onCreate }: CharacterCreationProps) {
  const [step, setStep] = useState<Step>('faction');
  const [faction, setFaction] = useState<string | null>(null);
  const [race, setRace] = useState<string | null>(null);
  const [heroClass, setHeroClass] = useState<string | null>(null);
  const [charName, setCharName] = useState('');

  // Customization indices
  const [bodyIdx, setBodyIdx] = useState(0);
  const [buildIdx, setBuildIdx] = useState(0);
  const [faceIdx, setFaceIdx] = useState(0);
  const [skinIdx, setSkinIdx] = useState(2);
  const [hairIdx, setHairIdx] = useState(0);
  const [eyeIdx, setEyeIdx] = useState(0);

  const previewRef = useRef<HTMLDivElement>(null);
  const sceneState = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    clock: THREE.Clock;
    animId: number;
    char: CharacterInstance | null;
    mixer: THREE.AnimationMixer | null;
  } | null>(null);

  // ── 3D Preview Setup ───────────────────────────────────────

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 700;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const key = new THREE.DirectionalLight(0xffeedd, 2.5);
    key.position.set(2, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4466aa, 0.8);
    fill.position.set(-3, 3, -2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc5a059, 1.2);
    rim.position.set(0, 2, -5);
    scene.add(rim);
    scene.add(new THREE.HemisphereLight(0x223344, 0x111122, 0.4));

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.98 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 1.85, 64),
      new THREE.MeshBasicMaterial({ color: 0xc5a059, transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    scene.add(ring);

    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100);
    camera.position.set(0, 1.1, 4.2);
    camera.lookAt(0, 0.7, 0);

    const clock = new THREE.Clock();
    const state = {
      renderer, scene, camera, clock, animId: 0,
      char: null as CharacterInstance | null,
      mixer: null as THREE.AnimationMixer | null,
    };
    sceneState.current = state;

    const loop = () => {
      const dt = clock.getDelta();
      if (state.mixer) state.mixer.update(dt);
      if (state.char) state.char.group.rotation.y += dt * 0.3;
      renderer.render(scene, camera);
      state.animId = requestAnimationFrame(loop);
    };
    state.animId = requestAnimationFrame(loop);

    const onResize = () => {
      const nw = container.clientWidth || 600;
      const nh = container.clientHeight || 700;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(state.animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // ── Available bodies for current race ──────────────────────

  const availableBodies = race ? getCharacterDefsForRace(race) : [];
  const currentBodyDef = availableBodies[bodyIdx % Math.max(availableBodies.length, 1)] || CHARACTER_DEFS[0];

  // ── Load / Rebuild Character ───────────────────────────────

  const rebuildCharacter = useCallback(async () => {
    const state = sceneState.current;
    if (!state || !race) return;

    if (state.char) {
      state.scene.remove(state.char.group);
      state.char = null;
      state.mixer = null;
    }

    try {
      const char = await loadCharacter(currentBodyDef.id);
      applyRace(char, race);

      // Build bones
      const build = BUILD_PRESETS[buildIdx];
      if (build.boneOverrides && char.skeleton) {
        for (const bone of char.skeleton.bones) {
          for (const [nameMatch, scale] of Object.entries(build.boneOverrides)) {
            if (bone.name.includes(nameMatch)) bone.scale.multiply(scale);
          }
        }
      }

      // Face bones
      const face = FACE_PRESETS[faceIdx];
      if (face.boneOverrides && char.skeleton) {
        for (const bone of char.skeleton.bones) {
          for (const [nameMatch, scale] of Object.entries(face.boneOverrides)) {
            if (bone.name.includes(nameMatch)) bone.scale.multiply(scale);
          }
        }
      }

      // Palette customizations
      applyPaletteZones(char, [SKIN_PRESETS[skinIdx], HAIR_PRESETS[hairIdx], EYE_PRESETS[eyeIdx]]);

      // Class weapons
      if (heroClass) await equipClassStartingWeapons(char, heroClass);

      // Idle animation
      try {
        const actions = await bindFallbackAnimations(char);
        const idle = actions.get('idle');
        if (idle) idle.play();
        state.mixer = char.mixer;
      } catch { /* no anim */ }

      state.scene.add(char.group);
      state.char = char;
    } catch (err) {
      console.warn('[CharCreate] Load failed:', err);
    }
  }, [race, currentBodyDef.id, buildIdx, faceIdx, skinIdx, hairIdx, eyeIdx, heroClass]);

  useEffect(() => { if (race) rebuildCharacter(); }, [rebuildCharacter, race]);

  useEffect(() => {
    if (race) {
      setBodyIdx(0);
      const idx = SKIN_PRESETS.findIndex(p => p.paletteZone?.color === RACE_CONFIGS[race]?.skinColor);
      setSkinIdx(idx >= 0 ? idx : 2);
    }
  }, [race]);

  // ── Derived ────────────────────────────────────────────────

  const factionColor = FACTIONS.find(f => f.id === faction)?.color || '#888';
  const raceConfig = race ? RACE_CONFIGS[race] : null;
  const availableRaces = faction ? getRacesForFaction(faction) : [];
  const showPreview = step !== 'faction';

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%', background: BG, fontFamily: FONT, color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top Bar */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${BORDER}`, gap: 32, flexShrink: 0 }}>
        {(['faction', 'race', 'customize', 'class', 'name'] as Step[]).map((s, i) => (
          <div key={s} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: step === s ? GOLD : '#333', textTransform: 'uppercase' }}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 3D Preview */}
        <div ref={previewRef} style={{
          flex: showPreview ? 1 : 0, minWidth: showPreview ? 400 : 0,
          background: 'radial-gradient(ellipse at 50% 80%, #12121f 0%, #08080f 70%)',
          transition: 'flex 0.3s', position: 'relative',
        }}>
          {race && (
            <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: GOLD, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                {charName || `${race}${heroClass ? ` ${heroClass}` : ''}`}
              </div>
              <div style={{ fontSize: 11, color: factionColor, marginTop: 2 }}>{faction} Faction</div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ width: step === 'customize' ? 420 : 380, overflowY: 'auto', padding: '24px 28px', borderLeft: `1px solid ${BORDER}`, background: PANEL, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

          {step === 'faction' && (
            <>
              <StepTitle>Choose Your Faction</StepTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {FACTIONS.map(f => (
                  <button key={f.id} onClick={() => { setFaction(f.id); setRace(null); setHeroClass(null); }}
                    style={cardStyle(faction === f.id, f.color)}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: f.color, letterSpacing: 2 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>{f.desc}</div>
                  </button>
                ))}
              </div>
              <NavButtons onNext={() => faction && setStep('race')} nextEnabled={!!faction} />
            </>
          )}

          {step === 'race' && (
            <>
              <StepTitle>Choose Your Race</StepTitle>
              <div style={{ fontSize: 11, color: factionColor, marginBottom: 12 }}>{faction} — select a race</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableRaces.map(r => {
                  const cfg = RACE_CONFIGS[r];
                  return (
                    <button key={r} onClick={() => { setRace(r); setHeroClass(null); }}
                      style={cardStyle(race === r, cfg?.skinColor || '#888')}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: cfg?.skinColor }}>{r}</div>
                      <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{cfg?.description}</div>
                    </button>
                  );
                })}
              </div>
              <NavButtons onBack={() => setStep('faction')} onNext={() => race && setStep('customize')} nextEnabled={!!race} />
            </>
          )}

          {step === 'customize' && (
            <>
              <StepTitle>Customize</StepTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                <ArrowPicker label="Body" value={availableBodies[bodyIdx % availableBodies.length]?.name || 'Default'}
                  onPrev={() => setBodyIdx((bodyIdx - 1 + availableBodies.length) % availableBodies.length)}
                  onNext={() => setBodyIdx((bodyIdx + 1) % availableBodies.length)}
                  count={availableBodies.length} current={bodyIdx % availableBodies.length} />

                <ArrowPicker label="Build" value={BUILD_PRESETS[buildIdx].label}
                  onPrev={() => setBuildIdx((buildIdx - 1 + BUILD_PRESETS.length) % BUILD_PRESETS.length)}
                  onNext={() => setBuildIdx((buildIdx + 1) % BUILD_PRESETS.length)}
                  count={BUILD_PRESETS.length} current={buildIdx} />

                <ArrowPicker label="Face" value={FACE_PRESETS[faceIdx].label}
                  onPrev={() => setFaceIdx((faceIdx - 1 + FACE_PRESETS.length) % FACE_PRESETS.length)}
                  onNext={() => setFaceIdx((faceIdx + 1) % FACE_PRESETS.length)}
                  count={FACE_PRESETS.length} current={faceIdx} />

                <ArrowPicker label="Skin" value={SKIN_PRESETS[skinIdx].label}
                  onPrev={() => setSkinIdx((skinIdx - 1 + SKIN_PRESETS.length) % SKIN_PRESETS.length)}
                  onNext={() => setSkinIdx((skinIdx + 1) % SKIN_PRESETS.length)}
                  count={SKIN_PRESETS.length} current={skinIdx}
                  color={SKIN_PRESETS[skinIdx].paletteZone?.color} />

                <ArrowPicker label="Hair" value={HAIR_PRESETS[hairIdx].label}
                  onPrev={() => setHairIdx((hairIdx - 1 + HAIR_PRESETS.length) % HAIR_PRESETS.length)}
                  onNext={() => setHairIdx((hairIdx + 1) % HAIR_PRESETS.length)}
                  count={HAIR_PRESETS.length} current={hairIdx}
                  color={HAIR_PRESETS[hairIdx].paletteZone?.color} />

                <ArrowPicker label="Eyes" value={EYE_PRESETS[eyeIdx].label}
                  onPrev={() => setEyeIdx((eyeIdx - 1 + EYE_PRESETS.length) % EYE_PRESETS.length)}
                  onNext={() => setEyeIdx((eyeIdx + 1) % EYE_PRESETS.length)}
                  count={EYE_PRESETS.length} current={eyeIdx}
                  color={EYE_PRESETS[eyeIdx].paletteZone?.color} />
              </div>
              <NavButtons onBack={() => setStep('race')} onNext={() => setStep('class')} nextEnabled />
            </>
          )}

          {step === 'class' && (
            <>
              <StepTitle>Choose Your Class</StepTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {CLASSES.map(c => {
                  const info = CLASS_INFO[c];
                  return (
                    <button key={c} onClick={() => setHeroClass(c)} style={cardStyle(heroClass === c, info.color)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{info.icon}</span>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: info.color }}>{c}</div>
                          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{info.desc}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <NavButtons onBack={() => setStep('customize')} onNext={() => heroClass && setStep('name')} nextEnabled={!!heroClass} />
            </>
          )}

          {step === 'name' && (
            <>
              <StepTitle>Name Your Character</StepTitle>
              <div style={{ fontSize: 11, color: DIM, marginBottom: 16 }}>
                <span style={{ color: raceConfig?.skinColor }}>{race}</span>{' '}
                <span style={{ color: CLASS_INFO[heroClass!]?.color }}>{heroClass}</span>
              </div>
              <input value={charName} onChange={e => setCharName(e.target.value)} maxLength={20}
                placeholder="Enter name..." autoFocus
                style={{ width: '100%', padding: '14px 16px', borderRadius: 8, fontSize: 20, textAlign: 'center', fontWeight: 700, background: '#0a0a16', border: `2px solid ${BORDER}`, color: '#fff', fontFamily: FONT, outline: 'none' }} />
              <div style={{ fontSize: 10, color: '#333', marginTop: 4, textAlign: 'center' }}>{charName.length}/20</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep('class')} style={btnStyle('#111', '#666')}>← Back</button>
                <button onClick={() => {
                  if (charName.trim().length >= 2 && race && heroClass) {
                    onCreate({ race, heroClass, name: charName.trim(), bodyTypeId: currentBodyDef.id, skinColor: SKIN_PRESETS[skinIdx].paletteZone?.color || '#c4956a' });
                  }
                }} disabled={charName.trim().length < 2} style={{
                  flex: 1, padding: '16px 24px', borderRadius: 10, fontSize: 18, fontWeight: 800,
                  background: charName.trim().length >= 2 ? `linear-gradient(135deg, ${GOLD}, #8b6914)` : '#222',
                  color: charName.trim().length >= 2 ? '#000' : '#444',
                  border: 'none', cursor: charName.trim().length >= 2 ? 'pointer' : 'default', fontFamily: FONT, letterSpacing: 2,
                }}>ENTER WORLD</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Arrow Picker ───────────────────────────────────────────────

function ArrowPicker({ label, value, onPrev, onNext, count, current, color }: {
  label: string; value: string; onPrev: () => void; onNext: () => void;
  count: number; current: number; color?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#555', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <button onClick={onPrev} style={arrowBtnStyle}>◀</button>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#0a0a16', border: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 600, color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {color && <span style={{ width: 14, height: 14, borderRadius: 3, background: color, display: 'inline-block', border: '1px solid #333' }} />}
          {value}
          <span style={{ fontSize: 9, color: '#444' }}>{current + 1}/{count}</span>
        </div>
        <button onClick={onNext} style={arrowBtnStyle}>▶</button>
      </div>
    </div>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 22, fontWeight: 800, color: GOLD, margin: 0, letterSpacing: 1 }}>{children}</h2>;
}

function NavButtons({ onBack, onNext, nextEnabled }: { onBack?: () => void; onNext?: () => void; nextEnabled?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 20 }}>
      {onBack && <button onClick={onBack} style={btnStyle('#111', '#666')}>← Back</button>}
      {onNext && <button onClick={() => nextEnabled && onNext()} disabled={!nextEnabled} style={btnStyle(nextEnabled ? GOLD : '#222', nextEnabled ? '#000' : '#444')}>Next →</button>}
    </div>
  );
}

// ── Palette Zone Application ───────────────────────────────────

function applyPaletteZones(char: CharacterInstance, presets: PartPreset[]): void {
  if (!char.paletteTexture) return;
  const img = char.paletteTexture.image;
  if (!img) return;

  const canvas = document.createElement('canvas');
  const w = img.width || 256;
  const h = img.height || 1;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  for (const preset of presets) {
    if (!preset.paletteZone) continue;
    const { start, end, color } = preset.paletteZone;
    const rgb = hexToRGB(color);
    for (let i = 0; i < data.length; i += 4) {
      const px = (i / 4) % w;
      const t = px / w;
      if (t >= start && t < end) {
        data[i]     = Math.floor(data[i] * rgb.r / 255);
        data[i + 1] = Math.floor(data[i + 1] * rgb.g / 255);
        data[i + 2] = Math.floor(data[i + 2] * rgb.b / 255);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const newTex = new THREE.CanvasTexture(canvas);
  newTex.magFilter = THREE.NearestFilter;
  newTex.minFilter = THREE.NearestFilter;
  newTex.colorSpace = THREE.SRGBColorSpace;

  if (char.mesh?.material) {
    const mat = Array.isArray(char.mesh.material) ? char.mesh.material[0] : char.mesh.material;
    if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      (mat as THREE.MeshStandardMaterial).map = newTex;
      (mat as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  }
  char.paletteTexture = newTex;
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace('#', '');
  return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}

// ── Style Helpers ──────────────────────────────────────────────

function cardStyle(active: boolean, accentColor: string): React.CSSProperties {
  return { padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', background: active ? `${accentColor}12` : '#0a0a16', border: `2px solid ${active ? accentColor : BORDER}`, fontFamily: FONT, transition: 'all 0.15s', width: '100%' };
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return { padding: '12px 28px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: bg, color, border: `1px solid ${BORDER}`, cursor: 'pointer', fontFamily: FONT };
}

const arrowBtnStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 6, cursor: 'pointer', background: '#0a0a16', border: `1px solid ${BORDER}`,
  color: GOLD, fontSize: 12, fontWeight: 700, fontFamily: FONT, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
