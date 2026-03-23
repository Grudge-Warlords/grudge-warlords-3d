/**
 * Animation Audit — scans all GLB/glTF files and lists their embedded animations.
 * Run: node scripts/audit-animations.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { NodeIO } from '@gltf-transform/core';

const MODELS_DIR = join(process.cwd(), 'public/assets/models');
const EFFECTS_DIR = join(process.cwd(), 'public/effects');
const OUTPUT_FILE = join(process.cwd(), 'scripts/animation-catalog.json');

function walkDir(dir, exts) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...walkDir(full, exts));
      } else if (exts.includes(extname(entry).toLowerCase())) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

async function main() {
  const io = new NodeIO();
  const files = [
    ...walkDir(MODELS_DIR, ['.glb']),
    ...walkDir(EFFECTS_DIR, ['.glb']),
  ];

  console.log(`Scanning ${files.length} GLB files...\n`);

  const catalog = {};
  let totalAnims = 0;
  let filesWithAnims = 0;

  for (const file of files) {
    try {
      const doc = await io.read(file);
      const root = doc.getRoot();
      const anims = root.listAnimations();
      const meshCount = root.listMeshes().length;
      const relPath = file.replace(process.cwd() + '\\', '').replace(/\\/g, '/');
      const sizeMB = (statSync(file).size / 1024 / 1024).toFixed(1);

      if (anims.length > 0) {
        filesWithAnims++;
        const animList = anims.map(a => {
          const channels = a.listChannels();
          const samplers = a.listSamplers();
          const duration = samplers.reduce((max, s) => {
            const input = s.getInput();
            if (input) {
              const arr = input.getArray();
              if (arr && arr.length > 0) return Math.max(max, arr[arr.length - 1]);
            }
            return max;
          }, 0);
          return {
            name: a.getName() || `anim_${totalAnims}`,
            channels: channels.length,
            duration: Math.round(duration * 100) / 100,
          };
        });

        totalAnims += anims.length;
        catalog[relPath] = {
          sizeMB: parseFloat(sizeMB),
          meshes: meshCount,
          animations: animList,
        };

        console.log(`✓ ${basename(file)} (${sizeMB}MB) — ${anims.length} animations, ${meshCount} meshes`);
        for (const a of animList) {
          console.log(`    ${a.name} (${a.duration}s, ${a.channels} channels)`);
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`Total: ${totalAnims} animations in ${filesWithAnims}/${files.length} files`);
  console.log(`════════════════════════════════════════`);

  writeFileSync(OUTPUT_FILE, JSON.stringify(catalog, null, 2));
  console.log(`\nCatalog written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
