import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { World } from './engine/ecs';
import {
  TransformComponent, VelocityComponent, InputComponent,
  AnimationComponent, RenderComponent, NetworkComponent,
  HealthComponent, CombatComponent, PlayerTagComponent,
} from './engine/components';
import {
  InputSystem, MovementSystem, AnimationSystem,
  RenderSystem, CameraSystem, NetworkSendSystem, NetworkReceiveSystem,
} from './engine/systems';
import { HERO_PREFABS, getHeroPrefabKey } from './game/prefabs';
import { HEROES, CLASS_COLORS, RACE_COLORS, FACTION_COLORS } from './game/types';
import { loadGLB, createAnimatedEntity, playAnimation, loadAnimSetForEntity, type AnimatedEntity } from './game/model-loader';
import { ISLAND_ZONES } from './game/zones';

// ── Constants ──────────────────────────────────────────────────

const RACES = ['Human', 'Barbarian', 'Dwarf', 'Elf', 'Orc', 'Undead'] as const;
const CLASSES = ['Warrior', 'Mage', 'Ranger', 'Worg'] as const;
const FACTIONS: Record<string, string> = {
  Human: 'Crusade', Barbarian: 'Crusade', Dwarf: 'Fabled', Elf: 'Fabled', Orc: 'Legion', Undead: 'Legion',
};
const FONT = "'Oxanium', sans-serif";

type GamePhase = 'character-create' | 'loading' | 'playing';

// ══════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(() => {
    const saved = localStorage.getItem('grudge3d_character');
    return saved ? 'loading' : 'character-create';
  });
  const [character, setCharacter] = useState<{
    race: string; heroClass: string; name: string; weapon: string;
  } | null>(() => {
    try { return JSON.parse(localStorage.getItem('grudge3d_character') || 'null'); } catch { return null; }
  });

  const handleCreate = useCallback((char: typeof character) => {
    setCharacter(char);
    localStorage.setItem('grudge3d_character', JSON.stringify(char));
    setPhase('loading');
  }, []);

  if (phase === 'character-create') {
    return <CharacterCreation onCreate={handleCreate} />;
  }

  return <GameWorld character={character!} />;
}

// ══════════════════════════════════════════════════════════════
// CHARACTER CREATION
// ══════════════════════════════════════════════════════════════

function CharacterCreation({ onCreate }: { onCreate: (char: { race: string; heroClass: string; name: string; weapon: string }) => void }) {
  const [step, setStep] = useState<'race' | 'class' | 'name'>('race');
  const [race, setRace] = useState<string | null>(null);
  const [heroClass, setHeroClass] = useState<string | null>(null);
  const [name, setName] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; model: THREE.Group | null; mixer: THREE.AnimationMixer | null; clock: THREE.Clock; animId: number } | null>(null);

  // 3D Preview
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(300, 400);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0x666666, 1));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 2);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.5));

    // Ground disc
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(35, 300 / 400, 0.1, 100);
    camera.position.set(0, 1.2, 3.5);
    camera.lookAt(0, 0.8, 0);

    const clock = new THREE.Clock();
    const state = { renderer, scene, camera, model: null as THREE.Group | null, mixer: null as THREE.AnimationMixer | null, clock, animId: 0 };
    sceneRef.current = state;

    const loop = () => {
      const dt = clock.getDelta();
      if (state.mixer) state.mixer.update(dt);
      if (state.model) state.model.rotation.y += dt * 0.5;
      renderer.render(scene, camera);
      state.animId = requestAnimationFrame(loop);
    };
    state.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(state.animId);
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  // Load model when race+class changes
  useEffect(() => {
    if (!race || !heroClass || !sceneRef.current) return;
    const state = sceneRef.current;

    // Remove old model
    if (state.model) { state.scene.remove(state.model); state.model = null; state.mixer = null; }

    const prefabKey = `${race.toLowerCase()}_${heroClass.toLowerCase()}`;
    const prefab = HERO_PREFABS[prefabKey];
    if (!prefab) return;

    loadGLB(prefab.modelPath).then(model => {
      const clone = model.scene.clone();
      clone.scale.setScalar(prefab.scale * 125);
      clone.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; } });
      state.scene.add(clone);
      state.model = clone;

      // Animation
      if (model.animations.length > 0) {
        state.mixer = new THREE.AnimationMixer(clone);
        const idle = model.animations.find(a => a.name.toLowerCase().includes('idle')) || model.animations[0];
        if (idle) state.mixer.clipAction(idle).play();
      }
    }).catch(() => {});
  }, [race, heroClass]);

  const faction = race ? FACTIONS[race] : null;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a', display: 'flex', fontFamily: FONT, color: '#fff' }}>
      {/* Left: 3D Preview */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #222' }}>
        <div ref={previewRef} style={{ width: 300, height: 400, borderRadius: 12, overflow: 'hidden' }} />
        {race && heroClass && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: CLASS_COLORS[heroClass] || '#fff' }}>{name || `${race} ${heroClass}`}</div>
            {faction && <div style={{ fontSize: 12, color: FACTION_COLORS[faction] || '#888', marginTop: 2 }}>{faction} Faction</div>}
          </div>
        )}
      </div>

      {/* Right: Selection UI */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Step: Race */}
        {step === 'race' && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#c5a059', marginBottom: 4 }}>CHOOSE YOUR RACE</h1>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Each race belongs to a faction and provides unique stat bonuses.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {RACES.map(r => (
                <button key={r} onClick={() => { setRace(r); setHeroClass(null); }} style={{
                  padding: '16px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  background: race === r ? `${RACE_COLORS[r]}15` : '#111',
                  border: `2px solid ${race === r ? RACE_COLORS[r] : '#222'}`,
                  color: RACE_COLORS[r] || '#ddd', fontFamily: FONT, fontSize: 15, fontWeight: 700,
                  transition: 'all 0.15s',
                }}>
                  {r}
                  <div style={{ fontSize: 10, color: FACTION_COLORS[FACTIONS[r]], marginTop: 4 }}>{FACTIONS[r]}</div>
                </button>
              ))}
            </div>
            <button onClick={() => race && setStep('class')} disabled={!race} style={{
              marginTop: 20, padding: '12px 40px', borderRadius: 8, fontSize: 16, fontWeight: 700,
              background: race ? '#c5a059' : '#333', color: '#000', border: 'none', cursor: race ? 'pointer' : 'default',
              fontFamily: FONT,
            }}>Continue</button>
          </div>
        )}

        {/* Step: Class */}
        {step === 'class' && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#c5a059', marginBottom: 4 }}>CHOOSE YOUR CLASS</h1>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Your class determines your combat style, abilities, and weapon proficiencies.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {CLASSES.map(c => (
                <button key={c} onClick={() => setHeroClass(c)} style={{
                  padding: 16, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  background: heroClass === c ? `${CLASS_COLORS[c]}15` : '#111',
                  border: `2px solid ${heroClass === c ? CLASS_COLORS[c] : '#222'}`,
                  fontFamily: FONT, transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: CLASS_COLORS[c] }}>{c}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {c === 'Warrior' ? 'Heavy armor, shields, devastating strikes' :
                     c === 'Mage' ? 'Ranged spellcaster, AoE damage, arcane power' :
                     c === 'Ranger' ? 'Bows, crossbows, traps, mobility' :
                     'Agile shapeshifter, lifesteal, stealth'}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep('race')} style={{ padding: '10px 24px', borderRadius: 8, background: '#222', color: '#888', border: 'none', cursor: 'pointer', fontFamily: FONT }}>Back</button>
              <button onClick={() => heroClass && setStep('name')} disabled={!heroClass} style={{
                padding: '12px 40px', borderRadius: 8, fontSize: 16, fontWeight: 700,
                background: heroClass ? '#c5a059' : '#333', color: '#000', border: 'none', cursor: heroClass ? 'pointer' : 'default',
                fontFamily: FONT,
              }}>Continue</button>
            </div>
          </div>
        )}

        {/* Step: Name + Start */}
        {step === 'name' && (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#c5a059', marginBottom: 4 }}>NAME YOUR CHARACTER</h1>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
              <span style={{ color: RACE_COLORS[race!] }}>{race}</span>{' '}
              <span style={{ color: CLASS_COLORS[heroClass!] }}>{heroClass}</span>{' — '}
              <span style={{ color: FACTION_COLORS[FACTIONS[race!]] }}>{FACTIONS[race!]}</span>
            </p>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={20} placeholder="Enter name..." autoFocus
              style={{ width: '100%', maxWidth: 400, padding: '14px 18px', borderRadius: 8, fontSize: 20, textAlign: 'center',
                background: '#111', border: '2px solid #333', color: '#fff', fontFamily: FONT, outline: 'none' }} />
            <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>{name.length}/20</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setStep('class')} style={{ padding: '10px 24px', borderRadius: 8, background: '#222', color: '#888', border: 'none', cursor: 'pointer', fontFamily: FONT }}>Back</button>
              <button onClick={() => {
                if (name.trim().length >= 2 && race && heroClass) {
                  onCreate({ race, heroClass, name: name.trim(), weapon: 'swords' });
                }
              }} disabled={name.trim().length < 2} style={{
                padding: '14px 48px', borderRadius: 8, fontSize: 18, fontWeight: 800,
                background: name.trim().length >= 2 ? 'linear-gradient(135deg, #c5a059, #8b6914)' : '#333',
                color: '#000', border: 'none', cursor: name.trim().length >= 2 ? 'pointer' : 'default',
                fontFamily: FONT,
              }}>BEGIN ADVENTURE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GAME WORLD
// ══════════════════════════════════════════════════════════════

function GameWorld({ character }: { character: { race: string; heroClass: string; name: string; weapon: string } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Three.js ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 800, 2000);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.5, 3000);

    // Lighting
    scene.add(new THREE.AmbientLight(0x445566, 0.5));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
    sun.position.set(100, 150, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
    scene.add(sun);
    scene.add(new THREE.DirectionalLight(0x4466aa, 0.3));

    // Ocean
    const oceanGeo = new THREE.PlaneGeometry(32000, 32000);
    oceanGeo.rotateX(-Math.PI / 2);
    scene.add(new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({ color: 0x1a3a5a, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85 })));

    // Terrain — build for all nearby zones
    for (const zone of ISLAND_ZONES.slice(0, 8)) {
      const b = zone.bounds;
      const geo = new THREE.PlaneGeometry(b.w, b.h, 32, 32);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, Math.sin(pos.getX(i) * 0.01) * 0.3 + Math.cos(pos.getZ(i) * 0.015) * 0.2);
      }
      geo.computeVertexNormals();
      const colors: Record<string, number> = { grass: 0x3a6a2a, jungle: 0x2a5a1a, water: 0x1a3a5a, stone: 0x5a5a6a, dirt: 0x5a4a3a };
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colors[zone.terrainType] || 0x3a6a2a, roughness: 0.85 }));
      mesh.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // ── ECS World ───────────────────────────────────────────
    const world = new World();
    world.addSystem(new InputSystem());
    world.addSystem(new NetworkReceiveSystem());
    world.addSystem(new MovementSystem());
    world.addSystem(new AnimationSystem());
    world.addSystem(new RenderSystem(scene));
    world.addSystem(new CameraSystem(camera));
    world.addSystem(new NetworkSendSystem());

    // ── Player Entity ───────────────────────────────────────
    const player = world.createEntity();
    const spawnX = 4000, spawnZ = 4000;
    player.addComponent(new TransformComponent(player.id, spawnX, 0, spawnZ));
    player.addComponent(new VelocityComponent(player.id));
    player.addComponent(new InputComponent(player.id));
    player.addComponent(new HealthComponent(player.id, 220));
    player.addComponent(new CombatComponent(player.id, 22, 18));
    player.addComponent(new AnimationComponent(player.id));
    player.addComponent(new PlayerTagComponent(player.id, character.race, character.heroClass, character.name));
    const net = new NetworkComponent(player.id);
    net.isLocal = true;
    player.addComponent(net);

    const renderComp = new RenderComponent(player.id);
    player.addComponent(renderComp);

    // Load GLB character model
    const prefabKey = `${character.race.toLowerCase()}_${character.heroClass.toLowerCase()}`;
    const prefab = HERO_PREFABS[prefabKey];

    if (prefab) {
      loadGLB(prefab.modelPath).then(async model => {
        const clone = model.scene.clone();
        clone.scale.setScalar(prefab.scale * 125);
        clone.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        renderComp.group.add(clone);

        // Load animations
        const entity = createAnimatedEntity({ scene: clone, animations: model.animations });
        await loadAnimSetForEntity(entity, character.heroClass);
        playAnimation(entity, 'idle');

        const animComp = player.getComponent(AnimationComponent)!;
        animComp.mixer = entity.mixer;
        animComp.actions = entity.actions;

        renderComp.modelLoaded = true;
        setLoading(false);
      }).catch(() => {
        // Fallback capsule
        addFallbackCapsule(renderComp.group, character.heroClass);
        setLoading(false);
      });
    } else {
      addFallbackCapsule(renderComp.group, character.heroClass);
      setLoading(false);
    }

    // Shadow decal
    const shadowGeo = new THREE.CircleGeometry(0.8, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    renderComp.group.add(new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false })));

    // ── Game Loop ───────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId = 0;

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      world.update(dt);

      const pt = player.getComponent(TransformComponent)!;
      sun.position.set(pt.position.x + 100, 150, pt.position.z + 80);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    // Resize
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Init Rapier in background
    RAPIER.init().catch(() => {});

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [character]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* HUD: character name + class */}
      <div style={{
        position: 'absolute', top: 12, left: 12, padding: '8px 16px', borderRadius: 8,
        background: 'rgba(10,10,26,0.85)', border: '1px solid #c5a05940',
        fontFamily: FONT,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: CLASS_COLORS[character.heroClass] }}>{character.name}</div>
        <div style={{ fontSize: 10, color: '#888' }}>
          <span style={{ color: RACE_COLORS[character.race] }}>{character.race}</span>
          {' '}
          <span style={{ color: CLASS_COLORS[character.heroClass] }}>{character.heroClass}</span>
          {' — '}
          <span style={{ color: FACTION_COLORS[FACTIONS[character.race]] }}>{FACTIONS[character.race]}</span>
        </div>
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12, padding: '6px 12px', borderRadius: 6,
        background: 'rgba(10,10,26,0.7)', fontFamily: FONT, fontSize: 10, color: '#555',
      }}>
        WASD Move · Shift Sprint · Space Dodge
      </div>

      {/* New character button */}
      <button onClick={() => { localStorage.removeItem('grudge3d_character'); window.location.reload(); }} style={{
        position: 'absolute', bottom: 12, left: 12, padding: '4px 10px', borderRadius: 4,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#ef4444', fontSize: 10, cursor: 'pointer', fontFamily: FONT,
      }}>New Character</button>

      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)', color: '#c5a059', fontFamily: FONT, fontSize: 24, fontWeight: 700,
        }}>
          LOADING {character.race.toUpperCase()} {character.heroClass.toUpperCase()}...
        </div>
      )}
    </div>
  );
}

// ── Fallback capsule when GLB fails ────────────────────────────

function addFallbackCapsule(group: THREE.Group, heroClass: string): void {
  const color = new THREE.Color(CLASS_COLORS[heroClass] || '#888');
  const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 8, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 }));
  capsule.position.y = 0.9;
  capsule.castShadow = true;
  group.add(capsule);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.6 }));
  head.position.y = 1.9;
  head.castShadow = true;
  group.add(head);
}
