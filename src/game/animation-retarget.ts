/**
 * Animation Retargeting System
 *
 * Problem: GLB files use different skeleton naming conventions:
 *   - Mixamo: "mixamorig:Hips", "mixamorig:Spine", etc.
 *   - CharacterArmature: "CharacterArmature/Hips", "CharacterArmature/Spine"
 *   - Human Armature: "Human Armature/Hips"
 *   - Custom rigs: "Bone.001", "Armature|Bone"
 *
 * Solution: Map all bone names to a canonical humanoid skeleton,
 * then remap AnimationClip track names to match the target skeleton.
 */

import * as THREE from 'three';

// ── Canonical Bone Names ───────────────────────────────────────
// Standard humanoid skeleton — every convention maps TO these names.

export const CANONICAL_BONES = [
  'Hips',
  'Spine', 'Spine1', 'Spine2',
  'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3',
  'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3',
  'LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3',
  'LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3',
  'LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3',
  'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3',
  'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3',
  'RightHandRing1', 'RightHandRing2', 'RightHandRing3',
  'RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
] as const;

export type CanonicalBone = typeof CANONICAL_BONES[number];

// ── Skeleton Convention Detection ──────────────────────────────

export type SkeletonConvention =
  | 'mixamo'              // "mixamorig:Hips"
  | 'character_armature'  // "CharacterArmature" prefix
  | 'human_armature'      // "Human Armature" prefix
  | 'animal_armature'     // "AnimalArmature" prefix
  | 'monster_armature'    // "MonsterArmature" prefix
  | 'blender_lr'          // Blender .L/.R suffix (KayKit, etc.)
  | 'custom'              // bare bone names, no prefix
  | 'unknown';

/** Detect which convention a skeleton uses by inspecting bone names */
export function detectConvention(boneNames: string[]): SkeletonConvention {
  for (const name of boneNames) {
    if (name.includes('mixamorig')) return 'mixamo';
    if (name.includes('CharacterArmature')) return 'character_armature';
    if (name.includes('Human Armature')) return 'human_armature';
    if (name.includes('AnimalArmature')) return 'animal_armature';
    if (name.includes('MonsterArmature')) return 'monster_armature';
  }
  // Check for Blender .L/.R suffix convention (Shoulder.L, UpperArm.R, etc.)
  if (boneNames.some(n => /\.(L|R)$/.test(n) && (n.includes('Arm') || n.includes('Leg') || n.includes('Shoulder')))) return 'blender_lr';
  // Check if bare canonical names exist
  if (boneNames.some(n => n === 'Hips' || n === 'Spine' || n === 'Head')) return 'custom';
  return 'unknown';
}

/** Detect convention from a Three.js skeleton */
export function detectSkeletonConvention(skeleton: THREE.Skeleton): SkeletonConvention {
  return detectConvention(skeleton.bones.map(b => b.name));
}

// ── Bone Name Extraction ───────────────────────────────────────
// Extract the canonical part from a fully-qualified bone name.

const BONE_ALIASES: Record<string, CanonicalBone> = {
  // Mixamo aliases (lowercase, no separators)
  'hips': 'Hips',
  'spine': 'Spine', 'spine1': 'Spine1', 'spine2': 'Spine2',
  'neck': 'Neck', 'head': 'Head',
  'leftshoulder': 'LeftShoulder', 'leftarm': 'LeftArm', 'leftforearm': 'LeftForeArm', 'lefthand': 'LeftHand',
  'rightshoulder': 'RightShoulder', 'rightarm': 'RightArm', 'rightforearm': 'RightForeArm', 'righthand': 'RightHand',
  'leftupleg': 'LeftUpLeg', 'leftleg': 'LeftLeg', 'leftfoot': 'LeftFoot', 'lefttoebase': 'LeftToeBase',
  'rightupleg': 'RightUpLeg', 'rightleg': 'RightLeg', 'rightfoot': 'RightFoot', 'righttoebase': 'RightToeBase',
  'lefthandthumb1': 'LeftHandThumb1', 'lefthandthumb2': 'LeftHandThumb2', 'lefthandthumb3': 'LeftHandThumb3',
  'lefthandindex1': 'LeftHandIndex1', 'lefthandindex2': 'LeftHandIndex2', 'lefthandindex3': 'LeftHandIndex3',
  'lefthandmiddle1': 'LeftHandMiddle1', 'lefthandmiddle2': 'LeftHandMiddle2', 'lefthandmiddle3': 'LeftHandMiddle3',
  'lefthandring1': 'LeftHandRing1', 'lefthandring2': 'LeftHandRing2', 'lefthandring3': 'LeftHandRing3',
  'lefthandpinky1': 'LeftHandPinky1', 'lefthandpinky2': 'LeftHandPinky2', 'lefthandpinky3': 'LeftHandPinky3',
  'righthandthumb1': 'RightHandThumb1', 'righthandthumb2': 'RightHandThumb2', 'righthandthumb3': 'RightHandThumb3',
  'righthandindex1': 'RightHandIndex1', 'righthandindex2': 'RightHandIndex2', 'righthandindex3': 'RightHandIndex3',
  'righthandmiddle1': 'RightHandMiddle1', 'righthandmiddle2': 'RightHandMiddle2', 'righthandmiddle3': 'RightHandMiddle3',
  'righthandring1': 'RightHandRing1', 'righthandring2': 'RightHandRing2', 'righthandring3': 'RightHandRing3',
  'righthandpinky1': 'RightHandPinky1', 'righthandpinky2': 'RightHandPinky2', 'righthandpinky3': 'RightHandPinky3',
  // Common underscore alternatives
  'left_shoulder': 'LeftShoulder', 'right_shoulder': 'RightShoulder',
  'left_arm': 'LeftArm', 'right_arm': 'RightArm',
  'left_forearm': 'LeftForeArm', 'right_forearm': 'RightForeArm',
  'left_hand': 'LeftHand', 'right_hand': 'RightHand',
  'left_upleg': 'LeftUpLeg', 'right_upleg': 'RightUpLeg',
  'left_leg': 'LeftLeg', 'right_leg': 'RightLeg',
  'left_foot': 'LeftFoot', 'right_foot': 'RightFoot',
  'upper_leg_l': 'LeftUpLeg', 'upper_leg_r': 'RightUpLeg',
  'lower_leg_l': 'LeftLeg', 'lower_leg_r': 'RightLeg',
  'foot_l': 'LeftFoot', 'foot_r': 'RightFoot',
};

/**
 * Blender / KayKit .L/.R suffix convention mapping.
 * These models use "Shoulder.L", "UpperArm.R" etc.
 * Must be checked BEFORE stripping dots since ".L"/".R" is meaningful.
 */
const BLENDER_LR_ALIASES: Record<string, CanonicalBone> = {
  // Spine chain
  'Abdomen': 'Spine1',
  'Torso': 'Spine2',
  'Chest': 'Spine2',
  'Body': 'Spine',
  // Left side
  'Shoulder.L': 'LeftShoulder',
  'UpperArm.L': 'LeftArm',
  'LowerArm.L': 'LeftForeArm',
  'Fist.L': 'LeftHand',
  'Wrist.L': 'LeftHand',
  'Hand.L': 'LeftHand',
  'UpperLeg.L': 'LeftUpLeg',
  'LowerLeg.L': 'LeftLeg',
  'Foot.L': 'LeftFoot',
  'Toe.L': 'LeftToeBase',
  'Thumb1.L': 'LeftHandThumb1', 'Thumb2.L': 'LeftHandThumb2', 'Thumb3.L': 'LeftHandThumb3',
  'Index1.L': 'LeftHandIndex1', 'Index2.L': 'LeftHandIndex2', 'Index3.L': 'LeftHandIndex3',
  'Middle1.L': 'LeftHandMiddle1', 'Middle2.L': 'LeftHandMiddle2', 'Middle3.L': 'LeftHandMiddle3',
  'Ring1.L': 'LeftHandRing1', 'Ring2.L': 'LeftHandRing2', 'Ring3.L': 'LeftHandRing3',
  'Pinky1.L': 'LeftHandPinky1', 'Pinky2.L': 'LeftHandPinky2', 'Pinky3.L': 'LeftHandPinky3',
  'Fist1.L': 'LeftHandIndex1', 'Fist2.L': 'LeftHandMiddle1',
  // Right side
  'Shoulder.R': 'RightShoulder',
  'UpperArm.R': 'RightArm',
  'LowerArm.R': 'RightForeArm',
  'Fist.R': 'RightHand',
  'Wrist.R': 'RightHand',
  'Hand.R': 'RightHand',
  'UpperLeg.R': 'RightUpLeg',
  'LowerLeg.R': 'RightLeg',
  'Foot.R': 'RightFoot',
  'Toe.R': 'RightToeBase',
  'Thumb1.R': 'RightHandThumb1', 'Thumb2.R': 'RightHandThumb2', 'Thumb3.R': 'RightHandThumb3',
  'Index1.R': 'RightHandIndex1', 'Index2.R': 'RightHandIndex2', 'Index3.R': 'RightHandIndex3',
  'Middle1.R': 'RightHandMiddle1', 'Middle2.R': 'RightHandMiddle2', 'Middle3.R': 'RightHandMiddle3',
  'Ring1.R': 'RightHandRing1', 'Ring2.R': 'RightHandRing2', 'Ring3.R': 'RightHandRing3',
  'Pinky1.R': 'RightHandPinky1', 'Pinky2.R': 'RightHandPinky2', 'Pinky3.R': 'RightHandPinky3',
  'Fist1.R': 'RightHandIndex1', 'Fist2.R': 'RightHandMiddle1',
};

/**
 * Extract the canonical bone name from a track/bone name string.
 * Handles: "mixamorig:Hips", "CharacterArmature/Hips", "Human Armature/Hips",
 *          "Armature|Bone", "Hips", etc.
 */
export function extractCanonicalBone(boneName: string): CanonicalBone | null {
  // Strip common prefixes
  let clean = boneName;

  // Remove path-style prefixes: "CharacterArmature/Root/Hips" → "Hips"
  if (clean.includes('/')) {
    const parts = clean.split('/');
    clean = parts[parts.length - 1];
  }

  // Remove mixamo prefix: "mixamorig:Hips" → "Hips"
  if (clean.includes(':')) {
    clean = clean.split(':').pop()!;
  }

  // Remove pipe prefix: "Armature|Hips" → "Hips"
  if (clean.includes('|')) {
    clean = clean.split('|').pop()!;
  }

  // Check Blender .L/.R convention BEFORE stripping dot suffixes
  // These use meaningful suffixes like "Shoulder.L", "UpperArm.R"
  if (BLENDER_LR_ALIASES[clean]) return BLENDER_LR_ALIASES[clean];

  // Remove numeric ".xxx" suffix: "Hips.001" → "Hips" (but NOT ".L"/".R")
  clean = clean.replace(/\.\d+$/, '');

  // Exact match to canonical names
  if (CANONICAL_BONES.includes(clean as CanonicalBone)) return clean as CanonicalBone;

  // Case-insensitive alias lookup (strips spaces, underscores, hyphens)
  const lower = clean.toLowerCase().replace(/[\s_-]/g, '');
  return BONE_ALIASES[lower] || null;
}

// ── Track Name Parsing ─────────────────────────────────────────

interface ParsedTrack {
  /** Full object path: "CharacterArmature/Root/Hips" */
  objectPath: string;
  /** Property: "position", "quaternion", "scale" */
  property: string;
  /** The bone part we identified */
  boneName: string;
}

function parseTrackName(trackName: string): ParsedTrack | null {
  // Track format: "objectPath.property"
  const lastDot = trackName.lastIndexOf('.');
  if (lastDot === -1) return null;

  const objectPath = trackName.substring(0, lastDot);
  const property = trackName.substring(lastDot + 1);

  // Extract the bone name (last segment of objectPath)
  const segments = objectPath.split('/');
  const boneName = segments[segments.length - 1];

  return { objectPath, property, boneName };
}

// ── Retarget a Clip ────────────────────────────────────────────

/**
 * Build a bone name mapping from source skeleton to target skeleton.
 * Both are mapped through canonical names as the intermediate.
 */
export function buildBoneMap(
  sourceNames: string[],
  targetNames: string[]
): Map<string, string> {
  const map = new Map<string, string>();

  // Build target lookup: canonical → target bone name
  const targetByCanonical = new Map<CanonicalBone, string>();
  for (const tName of targetNames) {
    const canonical = extractCanonicalBone(tName);
    if (canonical) targetByCanonical.set(canonical, tName);
  }

  // Map source → canonical → target
  for (const sName of sourceNames) {
    const canonical = extractCanonicalBone(sName);
    if (canonical && targetByCanonical.has(canonical)) {
      map.set(sName, targetByCanonical.get(canonical)!);
    }
  }

  return map;
}

/**
 * Retarget an AnimationClip from one skeleton naming convention to another.
 *
 * @param clip - The source animation clip
 * @param sourceBoneNames - Bone names from the source skeleton (or extracted from clip tracks)
 * @param targetBoneNames - Bone names from the target skeleton
 * @param targetArmaturePath - The object path prefix for the target (e.g. "Scene/Armature")
 * @returns A new AnimationClip with track names remapped
 */
export function retargetClip(
  clip: THREE.AnimationClip,
  sourceBoneNames: string[],
  targetBoneNames: string[],
  targetArmaturePath: string = '',
): THREE.AnimationClip {
  const boneMap = buildBoneMap(sourceBoneNames, targetBoneNames);
  if (boneMap.size === 0) {
    // No mapping possible — return clone as-is
    return clip.clone();
  }

  const newTracks: THREE.KeyframeTrack[] = [];

  for (const track of clip.tracks) {
    const parsed = parseTrackName(track.name);
    if (!parsed) {
      newTracks.push(track.clone());
      continue;
    }

    // Find the canonical bone from the source track's bone name
    const canonical = extractCanonicalBone(parsed.boneName);
    if (!canonical) {
      // Non-bone track (e.g. morph targets) — keep as-is
      newTracks.push(track.clone());
      continue;
    }

    // Find the target bone name
    const targetBone = boneMap.get(parsed.boneName);
    if (!targetBone) continue; // Skip unmapped bones

    // Reconstruct the track name with the target's naming
    const newObjectPath = targetArmaturePath
      ? `${targetArmaturePath}/${targetBone}`
      : targetBone;
    const newTrackName = `${newObjectPath}.${parsed.property}`;

    const newTrack = track.clone();
    newTrack.name = newTrackName;
    newTracks.push(newTrack);
  }

  const retargeted = new THREE.AnimationClip(
    clip.name,
    clip.duration,
    newTracks,
    clip.blendMode,
  );
  return retargeted;
}

/**
 * Extract all bone names referenced in a clip's tracks.
 */
export function extractBoneNamesFromClip(clip: THREE.AnimationClip): string[] {
  const names = new Set<string>();
  for (const track of clip.tracks) {
    const parsed = parseTrackName(track.name);
    if (parsed) names.add(parsed.boneName);
  }
  return Array.from(names);
}

/**
 * Extract bone names from a Three.js skeleton.
 */
export function extractBoneNamesFromSkeleton(skeleton: THREE.Skeleton): string[] {
  return skeleton.bones.map(b => b.name);
}

/**
 * Find the skeleton inside a loaded model group.
 */
export function findSkeleton(group: THREE.Group): THREE.Skeleton | null {
  let skeleton: THREE.Skeleton | null = null;
  group.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh && !skeleton) {
      skeleton = (child as THREE.SkinnedMesh).skeleton;
    }
  });
  return skeleton;
}

/**
 * Find the root bone path for track name construction.
 * Returns the path from the group root to the skeleton root bone.
 */
export function findArmaturePath(group: THREE.Group): string {
  const parts: string[] = [];
  group.traverse((child) => {
    if ((child as THREE.Bone).isBone && child.parent) {
      // Walk up to find the armature object
      let current: THREE.Object3D | null = child;
      while (current && !(current as THREE.Bone).isBone) {
        if (current.name) parts.unshift(current.name);
        current = current.parent;
      }
    }
  });
  return parts.join('/');
}

// ── High-level API ─────────────────────────────────────────────

/**
 * Apply a clip from any source skeleton to a target model, with automatic retargeting.
 * This is the main function you call from gameplay code.
 */
export function applyRetargetedClip(
  clip: THREE.AnimationClip,
  targetGroup: THREE.Group,
): THREE.AnimationClip {
  const targetSkeleton = findSkeleton(targetGroup);
  if (!targetSkeleton) return clip.clone();

  const sourceBones = extractBoneNamesFromClip(clip);
  const targetBones = extractBoneNamesFromSkeleton(targetSkeleton);

  // Check if track names already match (same skeleton convention)
  const firstTrack = clip.tracks[0];
  if (firstTrack) {
    const parsed = parseTrackName(firstTrack.name);
    if (parsed) {
      // Check if the track already references a target bone
      const matchesTarget = targetBones.some(tb => firstTrack.name.includes(tb));
      if (matchesTarget) return clip.clone(); // Already compatible
    }
  }

  return retargetClip(clip, sourceBones, targetBones);
}
