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
import { CLASS_COLORS, RACE_COLORS, FACTION_COLORS } from './game/types';
import { ISLAND_ZONES } from './game/zones';
import CharacterCreation from './components/CharacterCreation';
import { loadCharacter } from './engine/character-loader';
import { applyRace, RACE_CONFIGS } from './engine/race-mods';
import { recolorPalette } from './engine/race-mods';
import { equipClassStartingWeapons } from './engine/weapon-attach';
import { setupCharacterAnimations } from './engine/animation-bind';
import { syncCharacterToBackend } from './game/grudge-api';

// ── Constants ──────────────────────────────────────────────────

const FACTIONS: Record<string, string> = {
  Human: 'Crusade', Barbarian: 'Crusade', Dwarf: 'Fabled', Elf: 'Fabled', Orc: 'Legion', Undead: 'Legion',
};
const FONT = "'Oxanium', sans-serif";

interface CharacterData {
  race: string; heroClass: string; name: string;
  bodyTypeId: number; skinColor: string;
}
type GamePhase = 'character-create' | 'loading' | 'playing';

// ══════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════

export default function App() {
  const [phase, setPhase] = useState<GamePhase>(() => {
    // Validate saved character has new format fields
    try {
      const raw = localStorage.getItem('grudge3d_character');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.bodyTypeId !== undefined && parsed.skinColor) return 'loading';
      }
    } catch { /* ignore */ }
    // Old or missing data — clear and start fresh
    localStorage.removeItem('grudge3d_character');
    return 'character-create';
  });
  const [character, setCharacter] = useState<CharacterData | null>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('grudge3d_character') || 'null');
      if (parsed && parsed.bodyTypeId !== undefined && parsed.skinColor) return parsed;
    } catch { /* ignore */ }
    return null;
  });

  const handleCreate = useCallback((char: CharacterData) => {
    setCharacter(char);
    localStorage.setItem('grudge3d_character', JSON.stringify(char));
    setPhase('loading');
    // Non-blocking backend sync (requires grudge_jwt in localStorage)
    syncCharacterToBackend(char).catch(() => {});
  }, []);

  if (phase === 'character-create') {
    return <CharacterCreation onCreate={handleCreate} />;
  }

  return <GameWorld character={character!} />;
}

// CharacterCreation component is now in ./components/CharacterCreation.tsx

// ══════════════════════════════════════════════════════════════
// GAME WORLD
// ══════════════════════════════════════════════════════════════

function GameWorld({ character }: { character: CharacterData }) {
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 1200, 2000);

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
    scene.add(sun.target);
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

    // Load voxel character model via new pipeline
    const charBodyId = character.bodyTypeId ?? 0;
    loadCharacter(charBodyId).then(async (charInstance) => {
      // Apply race proportions + skin
      applyRace(charInstance, character.race);
      if (character.skinColor && character.skinColor !== RACE_CONFIGS[character.race]?.skinColor) {
        recolorPalette(charInstance, character.skinColor, RACE_CONFIGS[character.race]?.accentColor || '#4a3020');
      }

      // Always add the voxel model first — weapons & animations are non-fatal enhancements
      renderComp.group.add(charInstance.group);
      renderComp.modelLoaded = true;
      setLoading(false);

      // Attach class starting weapons (non-fatal — capsule never shown if only this fails)
      if (!container.isConnected) return;
      try {
        await equipClassStartingWeapons(charInstance, character.heroClass);
      } catch (e) {
        console.warn('[GameWorld] Weapon equip failed (non-fatal):', e);
      }

      // Wire animations (non-fatal)
      if (!container.isConnected) return;
      try {
        const animComp = player.getComponent(AnimationComponent)!;
        await setupCharacterAnimations(charInstance, character.heroClass, animComp);
      } catch (e) {
        console.warn('[GameWorld] Animation setup failed (non-fatal):', e);
      }
    }).catch((e) => {
      // Only fall back if the character FBX itself failed to load
      console.error('[GameWorld] Character FBX load failed, using fallback capsule:', e);
      addFallbackCapsule(renderComp.group, character.heroClass);
      setLoading(false);
    });

    // Shadow decal
    const shadowGeo = new THREE.CircleGeometry(0.8, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    renderComp.group.add(new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.3, depthWrite: false })));

    // ── Game Loop ───────────────────────────────────────────
    const gameClock = new THREE.Clock();
    let animId = 0;

    const loop = () => {
      const dt = Math.min(gameClock.getDelta(), 0.05);
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

      {/* Arena mode shortcut */}
      <button onClick={() => {
        window.history.pushState({}, '', '/arena');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }} style={{
        position: 'absolute', top: 12, right: 12, padding: '5px 12px', borderRadius: 4,
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#ef4444', fontSize: 10, cursor: 'pointer', fontFamily: FONT,
        letterSpacing: '0.1em',
      }}>⚔ ARENA MODE</button>

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
