/**
 * Rig Audit Script — validates all character models for Mixamo animation compatibility.
 *
 * Checks:
 *  1. Skeleton presence (has bones)
 *  2. Bone count and naming convention
 *  3. Mixamo canonical bone coverage (how many of the 65 standard bones are present)
 *  4. Skinned mesh presence (needed for skeletal animation)
 *
 * Usage: node scripts/audit-rigs.mjs
 */

import { NodeIO } from '@gltf-transform/core';
import fs from 'fs';
import path from 'path';

// The 65-bone Mixamo humanoid standard (same as animation-retarget.ts CANONICAL_BONES)
const CANONICAL_BONES = [
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
];

// Core bones (minimum needed for retargeting to work at all)
const CORE_BONES = [
  'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot',
  'RightUpLeg', 'RightLeg', 'RightFoot',
];

function extractCanonical(boneName) {
  let clean = boneName;
  if (clean.includes('/')) clean = clean.split('/').pop();
  if (clean.includes(':')) clean = clean.split(':').pop();
  if (clean.includes('|')) clean = clean.split('|').pop();
  clean = clean.replace(/\.\d+$/, '');
  if (CANONICAL_BONES.includes(clean)) return clean;
  const lower = clean.toLowerCase().replace(/[\s_-]/g, '');
  const aliases = {
    hips: 'Hips', spine: 'Spine', spine1: 'Spine1', spine2: 'Spine2',
    neck: 'Neck', head: 'Head',
    leftshoulder: 'LeftShoulder', leftarm: 'LeftArm', leftforearm: 'LeftForeArm', lefthand: 'LeftHand',
    rightshoulder: 'RightShoulder', rightarm: 'RightArm', rightforearm: 'RightForeArm', righthand: 'RightHand',
    leftupleg: 'LeftUpLeg', leftleg: 'LeftLeg', leftfoot: 'LeftFoot', lefttoebase: 'LeftToeBase',
    rightupleg: 'RightUpLeg', rightleg: 'RightLeg', rightfoot: 'RightFoot', righttoebase: 'RightToeBase',
  };
  return aliases[lower] || null;
}

function detectConvention(names) {
  for (const n of names) {
    if (n.includes('mixamorig')) return 'mixamo';
    if (n.includes('CharacterArmature')) return 'character_armature';
    if (n.includes('Human Armature')) return 'human_armature';
    if (n.includes('AnimalArmature')) return 'animal_armature';
    if (n.includes('MonsterArmature')) return 'monster_armature';
  }
  if (names.some(n => n === 'Hips' || n === 'Spine')) return 'custom_humanoid';
  return 'unknown';
}

async function auditGLBFile(filePath) {
  const io = new NodeIO();
  try {
    const doc = await io.read(filePath);
    const root = doc.getRoot();
    
    // Collect all node names
    const allNodes = root.listNodes();
    const nodeNames = allNodes.map(n => n.getName());
    
    // Check for skins (skeletal animation binding)
    const skins = root.listSkins();
    const hasSkin = skins.length > 0;
    
    // Collect joint names from skins
    const jointNames = [];
    for (const skin of skins) {
      for (const joint of skin.listJoints()) {
        jointNames.push(joint.getName());
      }
    }
    
    // Check for animations
    const animations = root.listAnimations();
    const animNames = animations.map(a => a.getName());
    
    // Check for meshes
    const meshes = root.listMeshes();
    
    // Determine convention and bone mapping
    const boneSource = jointNames.length > 0 ? jointNames : nodeNames;
    const convention = detectConvention(boneSource);
    
    // Map to canonical and check coverage
    const canonicalFound = new Set();
    for (const name of boneSource) {
      const canonical = extractCanonical(name);
      if (canonical) canonicalFound.add(canonical);
    }
    
    const coreCoverage = CORE_BONES.filter(b => canonicalFound.has(b));
    const fullCoverage = CANONICAL_BONES.filter(b => canonicalFound.has(b));
    const missingCore = CORE_BONES.filter(b => !canonicalFound.has(b));
    
    return {
      file: path.basename(filePath),
      path: filePath,
      hasSkin,
      skinCount: skins.length,
      jointCount: jointNames.length,
      totalNodes: allNodes.length,
      meshCount: meshes.length,
      animCount: animations.length,
      animNames,
      convention,
      coreBones: coreCoverage.length,
      coreTotal: CORE_BONES.length,
      fullBones: fullCoverage.length,
      fullTotal: CANONICAL_BONES.length,
      missingCore,
      mixamoReady: coreCoverage.length >= 15, // At least major joints present
      status: !hasSkin ? 'NO_SKIN' :
              coreCoverage.length >= 18 ? 'FULL' :
              coreCoverage.length >= 15 ? 'GOOD' :
              coreCoverage.length >= 10 ? 'PARTIAL' :
              coreCoverage.length > 0 ? 'MINIMAL' : 'NO_BONES',
    };
  } catch (err) {
    return {
      file: path.basename(filePath),
      path: filePath,
      error: err.message,
      status: 'ERROR',
    };
  }
}

function findGLBFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGLBFiles(fullPath));
    } else if (entry.name.endsWith('.glb') || entry.name.endsWith('.gltf')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Main ───────────────────────────────────────────────────────

const assetsDir = path.resolve('public/assets/models');
const charDir = path.join(assetsDir, 'characters');
const creatureDir = path.join(assetsDir, 'creatures');
const envDir = path.join(assetsDir, 'environment');

console.log('🦴 Rig Audit — Scanning all character models for Mixamo compatibility\n');

const dirs = [charDir, creatureDir, envDir].filter(d => fs.existsSync(d));
const allFiles = dirs.flatMap(d => findGLBFiles(d));

console.log(`Found ${allFiles.length} GLB/glTF files to audit\n`);

const results = [];
for (const file of allFiles) {
  const result = await auditGLBFile(file);
  results.push(result);
}

// ── Report ─────────────────────────────────────────────────────

const byStatus = {};
for (const r of results) {
  if (!byStatus[r.status]) byStatus[r.status] = [];
  byStatus[r.status].push(r);
}

console.log('═══════════════════════════════════════════════════════');
console.log('  STATUS SUMMARY');
console.log('═══════════════════════════════════════════════════════');
console.log(`  FULL (18+ core bones):  ${(byStatus['FULL'] || []).length}`);
console.log(`  GOOD (15+ core bones):  ${(byStatus['GOOD'] || []).length}`);
console.log(`  PARTIAL (10+ bones):    ${(byStatus['PARTIAL'] || []).length}`);
console.log(`  MINIMAL (<10 bones):    ${(byStatus['MINIMAL'] || []).length}`);
console.log(`  NO_SKIN (no skeleton):  ${(byStatus['NO_SKIN'] || []).length}`);
console.log(`  NO_BONES:               ${(byStatus['NO_BONES'] || []).length}`);
console.log(`  ERROR:                  ${(byStatus['ERROR'] || []).length}`);
console.log('═══════════════════════════════════════════════════════\n');

// Detail for each character
for (const r of results) {
  if (r.error) {
    console.log(`❌ ${r.file} — ERROR: ${r.error}`);
    continue;
  }
  
  const icon = r.status === 'FULL' ? '✅' :
               r.status === 'GOOD' ? '🟢' :
               r.status === 'PARTIAL' ? '🟡' :
               r.status === 'NO_SKIN' ? '⚠️' : '🔴';
  
  console.log(`${icon} ${r.file}`);
  console.log(`   Convention: ${r.convention} | Skin: ${r.hasSkin ? 'YES' : 'NO'} | Joints: ${r.jointCount} | Meshes: ${r.meshCount}`);
  console.log(`   Core bones: ${r.coreBones}/${r.coreTotal} | Full bones: ${r.fullBones}/${r.fullTotal} | Anims: ${r.animCount}`);
  if (r.missingCore && r.missingCore.length > 0 && r.missingCore.length <= 8) {
    console.log(`   Missing core: ${r.missingCore.join(', ')}`);
  }
  if (r.animNames && r.animNames.length > 0 && r.animNames.length <= 10) {
    console.log(`   Animations: ${r.animNames.join(', ')}`);
  }
  console.log('');
}

// Mixamo T-pose characters specifically
console.log('\n═══════════════════════════════════════════════════════');
console.log('  MIXAMO T-POSE CHARACTERS (should all be FULL)');
console.log('═══════════════════════════════════════════════════════');
const tposeFiles = results.filter(r => r.file.includes('tpose'));
for (const r of tposeFiles) {
  console.log(`  ${r.status === 'FULL' ? '✅' : '❌'} ${r.file} — ${r.convention} — ${r.coreBones}/${r.coreTotal} core, ${r.fullBones}/${r.fullTotal} full`);
}

// Non-humanoid models (creatures, environment) that won't retarget
console.log('\n═══════════════════════════════════════════════════════');
console.log('  NON-HUMANOID / ENVIRONMENT (retargeting not expected)');
console.log('═══════════════════════════════════════════════════════');
const nonHumanoid = results.filter(r => 
  r.convention === 'animal_armature' || 
  r.convention === 'monster_armature' ||
  r.convention === 'unknown'
);
for (const r of nonHumanoid) {
  if (r.error) continue;
  console.log(`  ${r.file} — ${r.convention} — ${r.jointCount} joints, ${r.animCount} anims`);
}

console.log(`\n✨ Audit complete. ${results.filter(r => r.mixamoReady).length}/${results.length} models are Mixamo-ready.`);
