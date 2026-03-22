import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { World, Entity } from './engine/ecs';
import {
  TransformComponent, VelocityComponent, InputComponent,
  AnimationComponent, RenderComponent, NetworkComponent,
  HealthComponent, CombatComponent, PlayerTagComponent,
  PhysicsComponent,
} from './engine/components';
import {
  InputSystem, MovementSystem, AnimationSystem,
  RenderSystem, NetworkSendSystem, NetworkReceiveSystem,
  CameraSystem,
} from './engine/systems';

/**
 * Grudge Warlords 3D — ECS-driven game application.
 * No 2D fallback. WebGL required.
 */
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Three.js Setup ─────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
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
    scene.fog = new THREE.Fog(0x87CEEB, 1200, 2000);

    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.5, 3000);
    camera.position.set(4000, 12, 4016);

    // Lighting
    scene.add(new THREE.AmbientLight(0x445566, 0.5));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3a5a2a, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
    sun.position.set(100, 150, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);
    scene.add(new THREE.DirectionalLight(0x4466aa, 0.3));

    // Ocean
    const oceanGeo = new THREE.PlaneGeometry(32000, 32000);
    oceanGeo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshStandardMaterial({
      color: 0x1a3a5a, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85,
    }));
    ocean.position.set(8000, -0.5, 8000);
    ocean.receiveShadow = true;
    scene.add(ocean);

    // Terrain (starting zone)
    const terrainGeo = new THREE.PlaneGeometry(1000, 1000, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);
    const positions = terrainGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(i, Math.sin(x * 0.01) * 0.3 + Math.cos(z * 0.015) * 0.2);
    }
    terrainGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({
      color: 0x3a6a2a, roughness: 0.85,
    }));
    terrain.position.set(4000, 0, 4000);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // ── ECS World ──────────────────────────────────────────────
    const world = new World();

    // Register systems
    const inputSystem = new InputSystem();
    const movementSystem = new MovementSystem();
    const animationSystem = new AnimationSystem();
    const renderSystem = new RenderSystem(scene);
    const cameraSystem = new CameraSystem(camera);
    const networkSendSystem = new NetworkSendSystem();
    const networkReceiveSystem = new NetworkReceiveSystem();

    world.addSystem(inputSystem);
    world.addSystem(networkReceiveSystem);
    world.addSystem(movementSystem);
    world.addSystem(animationSystem);
    world.addSystem(renderSystem);
    world.addSystem(cameraSystem);
    world.addSystem(networkSendSystem);

    // ── Create Player Entity ───────────────────────────────────
    const player = world.createEntity();
    player.addComponent(new TransformComponent(player.id, 4000, 0, 4000));
    player.addComponent(new VelocityComponent(player.id));
    player.addComponent(new InputComponent(player.id));
    player.addComponent(new HealthComponent(player.id, 220));
    player.addComponent(new CombatComponent(player.id, 22, 18));
    player.addComponent(new AnimationComponent(player.id));
    player.addComponent(new PlayerTagComponent(player.id, 'Human', 'Warrior', 'Player'));

    const network = new NetworkComponent(player.id);
    network.isLocal = true;
    player.addComponent(network);

    // Player render — capsule placeholder (GLB loading added later)
    const renderComp = new RenderComponent(player.id);
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.0, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, metalness: 0.2 }),
    );
    capsule.position.y = 0.9;
    capsule.castShadow = true;
    renderComp.group.add(capsule);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xddbbaa, roughness: 0.6 }),
    );
    head.position.y = 1.9;
    head.castShadow = true;
    renderComp.group.add(head);

    // Shadow
    const shadowGeo = new THREE.CircleGeometry(0.8, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false,
    }));
    shadow.position.y = 0.02;
    renderComp.group.add(shadow);

    player.addComponent(renderComp);

    // ── Init Rapier (async) ────────────────────────────────────
    RAPIER.init().then(() => {
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // ── Game Loop ──────────────────────────────────────────────
    const clock = new THREE.Clock();
    let animId = 0;

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);

      // Update ECS world (all systems run in priority order)
      world.update(dt);

      // Move sun with player
      const pt = player.getComponent(TransformComponent)!;
      sun.position.set(pt.position.x + 100, 150, pt.position.z + 80);

      // Render
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

    setLoading(false);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
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
          {error}
        </div>
      )}
    </div>
  );
}
