/**
 * babylon-imports.ts — Master side-effect import file.
 *
 * Import this ONCE at the top of any page that uses Babylon.js playground
 * patterns (BABYLON.ImportMeshAsync, BABYLON.CubeTexture, etc).
 *
 * These side-effect imports register loaders, physics, audio, shadows, etc.
 * into the Babylon.js module system so they work with ES6 tree-shaking.
 *
 * Without these, playground .js snippets will fail with "X is not a function"
 * because the subsystem was never registered.
 */

// ── Core scene components ────────────────────────────────────
import '@babylonjs/core/Animations/animatable';
import '@babylonjs/core/Culling/ray';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Rendering/outlineRenderer';

// ── Loaders (glTF, GLB) ─────────────────────────────────────
import '@babylonjs/loaders/glTF/2.0/glTFLoader';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_pbrSpecularGlossiness';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_draco_mesh_compression';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_unlit';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_clearcoat';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_transmission';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_volume';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_ior';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_specular';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_sheen';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_emissive_strength';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_iridescence';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_texture_transform';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_mesh_quantization';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_lights_punctual';
import '@babylonjs/loaders/glTF/2.0/Extensions/EXT_lights_image_based';

// ── Shadows ──────────────────────────────────────────────────
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

// ── Physics v2 (Havok) ──────────────────────────────────────
import '@babylonjs/core/Physics/v2/physicsEngineComponent';

// ── Audio ────────────────────────────────────────────────────
import '@babylonjs/core/Audio/audioSceneComponent';

// ── Loading screen ───────────────────────────────────────────
import '@babylonjs/core/Loading/loadingScreen';

// ── Mesh intersections / picking ─────────────────────────────
import '@babylonjs/core/Meshes/meshBuilder';

// ── Serializers (export GLB/glTF) ────────────────────────────
// Only imported when @babylonjs/serializers is installed
// import '@babylonjs/serializers/glTF/2.0/glTFSerializer';

// ── Re-export everything for playground compatibility ────────
// This lets you do: import * as BABYLON from './babylon-imports'
// and use BABYLON.Scene, BABYLON.Vector3, etc. like playground code.

export { Engine } from '@babylonjs/core/Engines/engine';
export { Scene } from '@babylonjs/core/scene';
export { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color';

// Cameras
export { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
export { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
export { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';

// Lights
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
export { PointLight } from '@babylonjs/core/Lights/pointLight';
export { SpotLight } from '@babylonjs/core/Lights/spotLight';

// Meshes
export { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
export { TransformNode } from '@babylonjs/core/Meshes/transformNode';
export { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';

// Materials
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
export { Texture } from '@babylonjs/core/Materials/Textures/texture';
export { CubeTexture } from '@babylonjs/core/Materials/Textures/cubeTexture';

// Animations
export { Animation } from '@babylonjs/core/Animations/animation';
export { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';

// Loading
export { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
export { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader';

// Physics v2
export { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
export { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
export { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
export { PhysicsCharacterController, CharacterSupportedState } from '@babylonjs/core/Physics/v2/characterController';

// Shadows
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';

// Events
export { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents';
export { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents';

// Actions
export { ActionManager } from '@babylonjs/core/Actions/actionManager';
export { ExecuteCodeAction } from '@babylonjs/core/Actions/directActions';
export { SetValueAction } from '@babylonjs/core/Actions/directActions';

// GUI (from @babylonjs/gui)
export { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
export { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
export { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
export { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
export { Control } from '@babylonjs/gui/2D/controls/control';
export { Button } from '@babylonjs/gui/2D/controls/button';
export { Image as GuiImage } from '@babylonjs/gui/2D/controls/image';

// Skeletons / Bones
export { Skeleton } from '@babylonjs/core/Bones/skeleton';
export { Bone } from '@babylonjs/core/Bones/bone';
export { SkeletonViewer } from '@babylonjs/core/Debug/skeletonViewer';

// AnimatorAvatar (9.0 retargeting)
export { AnimatorAvatar } from '@babylonjs/core/Animations/animatorAvatar';

// Particles
export { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';

// Observables
export { Observable } from '@babylonjs/core/Misc/observable';
