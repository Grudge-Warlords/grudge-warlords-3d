/**
 * Batch convert FBX files to GLB using gltf-pipeline.
 * Run: node scripts/convert-fbx-to-glb.mjs
 *
 * Converts attached_assets/assets/FreeContent TPose characters → public/assets/models/characters/
 */
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { execSync } from 'child_process';

const FREECONTENT_DIR = join(process.cwd(), 'attached_assets/assets/FreeContent');
const OUTPUT_DIR = join(process.cwd(), 'public/assets/models/characters');

// Ensure output dir exists
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

// npx fbx2gltf is the standard tool — check if available
let converter = null;
try {
  execSync('npx fbx2gltf --help', { stdio: 'pipe' });
  converter = 'fbx2gltf';
} catch {
  console.log('fbx2gltf not available. Trying Blender CLI...');
  try {
    execSync('blender --version', { stdio: 'pipe' });
    converter = 'blender';
  } catch {
    console.log('Neither fbx2gltf nor Blender found.');
    console.log('Install: npm install -g fbx2gltf');
    console.log('Or install Blender and add to PATH.');
    console.log('\nAlternative: Use the online converter at https://products.aspose.app/3d/conversion/fbx-to-glb');
    console.log('\nFiles to convert:');
  }
}

const files = readdirSync(FREECONTENT_DIR).filter(f => extname(f).toLowerCase() === '.fbx');

console.log(`Found ${files.length} FBX files in FreeContent:\n`);

for (const file of files) {
  const input = join(FREECONTENT_DIR, file);
  const outputName = basename(file, '.fbx')
    .replace(/\s+/g, '_')
    .toLowerCase() + '.glb';
  const output = join(OUTPUT_DIR, outputName);

  if (existsSync(output)) {
    console.log(`  ✓ ${outputName} (already exists)`);
    continue;
  }

  if (converter === 'fbx2gltf') {
    try {
      console.log(`  Converting ${file} → ${outputName}...`);
      execSync(`npx fbx2gltf -i "${input}" -o "${output}" --binary`, { stdio: 'pipe' });
      console.log(`  ✓ ${outputName}`);
    } catch (e) {
      console.log(`  ✗ ${file} — conversion failed`);
    }
  } else if (converter === 'blender') {
    try {
      console.log(`  Converting ${file} → ${outputName} (Blender)...`);
      const blenderScript = `
import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=sys.argv[-2])
bpy.ops.export_scene.gltf(filepath=sys.argv[-1], export_format='GLB')
`.trim();
      execSync(`blender --background --python-expr "${blenderScript}" -- "${input}" "${output}"`, { stdio: 'pipe' });
      console.log(`  ✓ ${outputName}`);
    } catch {
      console.log(`  ✗ ${file} — Blender conversion failed`);
    }
  } else {
    console.log(`  → ${file} → ${outputName}`);
  }
}

console.log('\nDone. Characters available for animation retargeting:');
const existing = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.glb'));
console.log(`${existing.length} GLB character models in ${OUTPUT_DIR}`);
