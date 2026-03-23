#!/usr/bin/env node
/**
 * Sprite Audit & Review Tool
 *
 * Fetches every effect sprite referenced in sprite-effects.ts,
 * inspects dimensions, validates spritesheet grids, and reports
 * sizing issues relative to in-game hero scale (~36px).
 *
 * Usage:  node scripts/sprite-audit.mjs [--fix]
 *   --fix  Resize oversized sprites into scripts/optimized/
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'optimized');

// ── ObjectStore CDN base ────────────────────────────────────────
const OS = 'https://molochdagod.github.io/ObjectStore';

// ── All sprites from sprite-effects.ts with their declared metadata ──
const SPRITES = {
  // Slashes
  os_slash_red_md:    { path: `${OS}/sprites/effects/slash/slash_red_md.png`, cols: 8, rows: 1, frameW: 64, frameH: 64, frames: 8 },
  os_slash_blue_md:   { path: `${OS}/sprites/effects/slash/slash_blue_md.png`, cols: 8, rows: 1, frameW: 64, frameH: 64, frames: 8 },
  os_slash_green_md:  { path: `${OS}/sprites/effects/slash/slash_green_md.png`, cols: 8, rows: 1, frameW: 64, frameH: 64, frames: 8 },
  os_slash_purple_md: { path: `${OS}/sprites/effects/slash/slash_purple_md.png`, cols: 8, rows: 1, frameW: 64, frameH: 64, frames: 8 },
  os_slash_orange_md: { path: `${OS}/sprites/effects/slash/slash_orange_md.png`, cols: 8, rows: 1, frameW: 64, frameH: 64, frames: 8 },
  os_slash_red_lg:    { path: `${OS}/sprites/effects/slash/slash_red_lg.png`, cols: 8, rows: 1, frameW: 96, frameH: 96, frames: 8 },
  os_slash_blue_lg:   { path: `${OS}/sprites/effects/slash/slash_blue_lg.png`, cols: 8, rows: 1, frameW: 96, frameH: 96, frames: 8 },
  os_slash_green_lg:  { path: `${OS}/sprites/effects/slash/slash_green_lg.png`, cols: 8, rows: 1, frameW: 96, frameH: 96, frames: 8 },
  os_demon_slash1:    { path: `${OS}/sprites/effects/demon_slash_1.png`, cols: 7, rows: 1, frameW: 48, frameH: 48, frames: 7 },
  os_demon_slash2:    { path: `${OS}/sprites/effects/demon_slash_2.png`, cols: 7, rows: 1, frameW: 48, frameH: 48, frames: 7 },
  os_demon_slash3:    { path: `${OS}/sprites/effects/demon_slash_3.png`, cols: 7, rows: 1, frameW: 48, frameH: 48, frames: 7 },
  os_arcane_slash:    { path: `${OS}/sprites/effects/custom/arcaneslash.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },

  // Impacts
  os_hit1:         { path: `${OS}/sprites/effects/hit_effect_1.png`, cols: 7, rows: 1, frameW: 48, frameH: 48, frames: 7 },
  os_hit2:         { path: `${OS}/sprites/effects/hit_effect_2.png`, cols: 7, rows: 1, frameW: 48, frameH: 48, frames: 7 },
  os_hit3:         { path: `${OS}/sprites/effects/hit_effect_3.png`, cols: 7, rows: 1, frameW: 48, frameH: 48, frames: 7 },
  os_hit_burst:    { path: `${OS}/sprites/effects/custom/hit.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_crit_slash:   { path: `${OS}/sprites/effects/custom/crit.png`, cols: 4, rows: 1, frameW: 384, frameH: 394, frames: 4 },
  os_thunder_hit:  { path: `${OS}/sprites/effects/thunder_hit.png`, cols: 6, rows: 1, frameW: 32, frameH: 32, frames: 6 },
  os_holy_impact:  { path: `${OS}/sprites/effects/holy_impact.png`, cols: 7, rows: 1, frameW: 32, frameH: 32, frames: 7 },
  os_ice_hit:      { path: `${OS}/sprites/effects/pixel/ice_hit.png`, cols: 8, rows: 1, frameW: 48, frameH: 32, frames: 8 },

  // Projectiles
  os_thunder_proj:  { path: `${OS}/sprites/effects/thunder_projectile.png`, cols: 5, rows: 1, frameW: 32, frameH: 32, frames: 5 },
  os_thunder_proj2: { path: `${OS}/sprites/effects/thunder_projectile_2.png`, cols: 16, rows: 1, frameW: 48, frameH: 48, frames: 16 },
  os_wind_proj:     { path: `${OS}/sprites/effects/wind_projectile.png`, cols: 3, rows: 2, frameW: 32, frameH: 32, frames: 6 },
  os_energy_proj:   { path: `${OS}/sprites/effects/general/energy_projectile.png`, cols: 4, rows: 1, frameW: 32, frameH: 32, frames: 4 },

  // Explosions / AOE
  os_fire_explosion:  { path: `${OS}/sprites/effects/fire_explosion.png`, cols: 4, rows: 4, frameW: 64, frameH: 64, frames: 16 },
  os_fire_explosion2: { path: `${OS}/sprites/effects/fire_explosion_2.png`, cols: 18, rows: 1, frameW: 48, frameH: 48, frames: 18 },
  os_earth_bump:      { path: `${OS}/sprites/effects/pixel/earth_bump.png`, cols: 4, rows: 4, frameW: 48, frameH: 48, frames: 16 },
  os_flamestrike:     { path: `${OS}/sprites/effects/custom/flamestrike.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_ice_vfx1:        { path: `${OS}/sprites/effects/pixel/ice_vfx1.png`, cols: 5, rows: 4, frameW: 192, frameH: 192, frames: 20 },
  os_ice_vfx2:        { path: `${OS}/sprites/effects/pixel/ice_vfx2.png`, cols: 5, rows: 7, frameW: 192, frameH: 192, frames: 35 },

  // Beams / Bolts
  os_beam_holy:        { path: `${OS}/sprites/effects/custom/beam.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_arcane_bolt:      { path: `${OS}/sprites/effects/custom/arcanebolt.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_arcane_lightning: { path: `${OS}/sprites/effects/custom/arcanelighting.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_frostbolt:        { path: `${OS}/sprites/effects/custom/frostbolt.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },

  // Buffs / Heals
  os_heal:          { path: `${OS}/sprites/effects/heal_spritesheet.png`, cols: 4, rows: 4, frameW: 128, frameH: 128, frames: 16 },
  os_healing_regen: { path: `${OS}/sprites/effects/custom/healingregen.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 4 },
  os_healing_wave:  { path: `${OS}/sprites/effects/custom/healingwave.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_holy_heal:     { path: `${OS}/sprites/effects/custom/holyheal.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 4 },
  os_holy_light:    { path: `${OS}/sprites/effects/custom/holylight.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_holy_vfx:      { path: `${OS}/sprites/effects/holy_vfx_02.png`, cols: 16, rows: 1, frameW: 48, frameH: 48, frames: 16 },
  os_resurrect:     { path: `${OS}/sprites/effects/resurrect_sprite.png`, cols: 6, rows: 4, frameW: 256, frameH: 256, frames: 24 },
  os_wind_breath:   { path: `${OS}/sprites/effects/wind_breath.png`, cols: 18, rows: 1, frameW: 32, frameH: 32, frames: 18 },

  // Debuffs / Dark
  os_arcane_mist: { path: `${OS}/sprites/effects/custom/arcanemist.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_frozen_ice:  { path: `${OS}/sprites/effects/custom/frozen.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },
  os_earth_wall:  { path: `${OS}/sprites/effects/pixel/earth_wall.png`, cols: 4, rows: 4, frameW: 48, frameH: 48, frames: 16 },

  // Special
  os_worge_tornado: { path: `${OS}/sprites/effects/worge_tornado.png`, cols: 4, rows: 2, frameW: 384, frameH: 512, frames: 8 },

  // Smears & Thrusts
  os_smear_h1:     { path: `${OS}/sprites/effects/pixel/smear_h1.png`, cols: 5, rows: 1, frameW: 48, frameH: 48, frames: 5 },
  os_smear_h2:     { path: `${OS}/sprites/effects/pixel/smear_h2.png`, cols: 5, rows: 1, frameW: 48, frameH: 48, frames: 5 },
  os_smear_h3:     { path: `${OS}/sprites/effects/pixel/smear_h3.png`, cols: 5, rows: 1, frameW: 48, frameH: 48, frames: 5 },
  os_smear_v1:     { path: `${OS}/sprites/effects/pixel/smear_v1.png`, cols: 6, rows: 1, frameW: 48, frameH: 48, frames: 6 },
  os_smear_v2:     { path: `${OS}/sprites/effects/pixel/smear_v2.png`, cols: 6, rows: 1, frameW: 48, frameH: 48, frames: 6 },
  os_smear_v3:     { path: `${OS}/sprites/effects/pixel/smear_v3.png`, cols: 6, rows: 1, frameW: 48, frameH: 48, frames: 6 },
  os_thrust1:      { path: `${OS}/sprites/effects/pixel/thrust_1.png`, cols: 5, rows: 1, frameW: 48, frameH: 48, frames: 5 },
  os_thrust2:      { path: `${OS}/sprites/effects/pixel/thrust_2.png`, cols: 5, rows: 1, frameW: 48, frameH: 48, frames: 5 },

  // Retro impacts (sample)
  os_retro_fire_a:   { path: `${OS}/sprites/effects/retro_impact/impactFireA.png`, cols: 9, rows: 6, frameW: 64, frameH: 64, frames: 54 },
  os_retro_purple_a: { path: `${OS}/sprites/effects/retro_impact/impactPurpleA.png`, cols: 9, rows: 6, frameW: 64, frameH: 64, frames: 54 },

  // Bullets (sample)
  os_bullet_blue: { path: `${OS}/sprites/effects/bullet_impact/bullet_blue.png`, cols: 20, rows: 16, frameW: 32, frameH: 32, frames: 320 },
};

// ── Size Categories ─────────────────────────────────────────────
const HERO_SIZE = 36;        // Hero body width in world units
const MAX_BASE = 64;         // Our normalization cap from sprite-effects.ts
const CATEGORIES = {
  tiny:      { max: 32,  label: 'Tiny (projectiles, small hits)' },
  small:     { max: 48,  label: 'Small (hits, smears, thrusts)' },
  medium:    { max: 64,  label: 'Medium (slashes, small explosions)' },
  large:     { max: 96,  label: 'Large (big slashes)' },
  xlarge:    { max: 192, label: 'XL (AoE zones, ice VFX)' },
  oversized: { max: 512, label: '⚠ OVERSIZED (custom 384×512 — normalized at runtime)' },
  huge:      { max: Infinity, label: '🚨 HUGE (exceeds 512, needs manual review)' },
};

function categorize(maxDim) {
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (maxDim <= cat.max) return { key, ...cat };
  }
  return { key: 'huge', ...CATEGORIES.huge };
}

// ── Fetch + Inspect ─────────────────────────────────────────────
async function fetchSprite(name, def) {
  try {
    const res = await fetch(def.path);
    if (!res.ok) return { name, error: `HTTP ${res.status}`, ...def };
    const buffer = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    return {
      name,
      url: def.path,
      actualW: meta.width,
      actualH: meta.height,
      declaredFrameW: def.frameW,
      declaredFrameH: def.frameH,
      cols: def.cols,
      rows: def.rows,
      frames: def.frames,
      maxFrameDim: Math.max(def.frameW, def.frameH),
      normalize: Math.max(def.frameW, def.frameH) > MAX_BASE
        ? (MAX_BASE / Math.max(def.frameW, def.frameH)).toFixed(3)
        : '1.000',
      renderAt1x: Math.max(def.frameW, def.frameH) > MAX_BASE
        ? `${Math.round(def.frameW * MAX_BASE / Math.max(def.frameW, def.frameH))}×${Math.round(def.frameH * MAX_BASE / Math.max(def.frameW, def.frameH))}`
        : `${def.frameW}×${def.frameH}`,
      format: meta.format,
      channels: meta.channels,
      hasAlpha: meta.hasAlpha,
      category: categorize(Math.max(def.frameW, def.frameH)),
      gridMatch: meta.width === def.frameW * def.cols && meta.height === def.frameH * def.rows,
      buffer,
    };
  } catch (e) {
    return { name, error: e.message, ...def };
  }
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  const doFix = process.argv.includes('--fix');
  const entries = Object.entries(SPRITES);

  console.log(`\n🎮 SPRITE AUDIT — ${entries.length} ObjectStore sprites`);
  console.log(`   Hero body: ~${HERO_SIZE}px | Render cap: ${MAX_BASE}px at scale 1.0\n`);

  // Fetch all in parallel batches of 8
  const results = [];
  for (let i = 0; i < entries.length; i += 8) {
    const batch = entries.slice(i, i + 8);
    const batchResults = await Promise.all(
      batch.map(([name, def]) => fetchSprite(name, def))
    );
    results.push(...batchResults);
    process.stdout.write(`   Fetched ${Math.min(i + 8, entries.length)}/${entries.length}...\r`);
  }
  console.log();

  // ── Report ──
  const errors = results.filter(r => r.error);
  const ok = results.filter(r => !r.error);
  const gridMismatches = ok.filter(r => !r.gridMatch);
  const oversized = ok.filter(r => r.maxFrameDim > MAX_BASE);
  const byCategory = {};
  for (const r of ok) {
    const cat = r.category.key;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Total sprites:    ${entries.length}`);
  console.log(`  Fetched OK:       ${ok.length}`);
  console.log(`  Fetch errors:     ${errors.length}`);
  console.log(`  Grid mismatches:  ${gridMismatches.length}`);
  console.log(`  Oversized (>${MAX_BASE}px): ${oversized.length} (normalized at runtime)`);
  console.log();

  // By category
  console.log('─── SIZE DISTRIBUTION ──────────────────────────────');
  for (const [cat, sprites] of Object.entries(byCategory)) {
    const catDef = CATEGORIES[cat];
    console.log(`  ${catDef.label}: ${sprites.length} sprites`);
    for (const s of sprites) {
      const flag = s.maxFrameDim > MAX_BASE ? ' → normalized' : '';
      console.log(`    ${s.name.padEnd(22)} ${s.declaredFrameW}×${s.declaredFrameH} → renders ${s.renderAt1x} at 1x${flag}`);
    }
  }
  console.log();

  // Errors
  if (errors.length > 0) {
    console.log('─── FETCH ERRORS ──────────────────────────────────');
    for (const e of errors) {
      console.log(`  ❌ ${e.name}: ${e.error}`);
    }
    console.log();
  }

  // Grid mismatches
  if (gridMismatches.length > 0) {
    console.log('─── GRID MISMATCHES ───────────────────────────────');
    for (const m of gridMismatches) {
      const expected = `${m.declaredFrameW * m.cols}×${m.declaredFrameH * m.rows}`;
      console.log(`  ⚠ ${m.name}: actual ${m.actualW}×${m.actualH}, expected ${expected}`);
    }
    console.log();
  }

  // Oversized detail
  if (oversized.length > 0) {
    console.log('─── OVERSIZED SPRITES (normalized at runtime) ─────');
    console.log(`  These have frame dims >${MAX_BASE}px and get normalized to ${MAX_BASE}px max.`);
    console.log(`  Factor = ${MAX_BASE} / max(frameW, frameH)\n`);
    for (const s of oversized) {
      const ratio = (s.maxFrameDim / HERO_SIZE).toFixed(1);
      console.log(`  ${s.name.padEnd(22)} ${s.declaredFrameW}×${s.declaredFrameH} (${ratio}× hero) → normalize=${s.normalize} → ${s.renderAt1x}`);
    }
    console.log();
  }

  // Scale reference table
  console.log('─── SCALE REFERENCE (after normalization) ──────────');
  console.log(`  Hero size: ~${HERO_SIZE}px body width`);
  console.log(`  At scale 1.0: max ${MAX_BASE}px (1.8× hero)`);
  console.log(`  At scale 1.5: max ${MAX_BASE * 1.5}px (${(MAX_BASE * 1.5 / HERO_SIZE).toFixed(1)}× hero) — casts`);
  console.log(`  At scale 2.5: max ${MAX_BASE * 2.5}px (${(MAX_BASE * 2.5 / HERO_SIZE).toFixed(1)}× hero) — AoE`);
  console.log(`  At scale 3.5: max ${MAX_BASE * 3.5}px (${(MAX_BASE * 3.5 / HERO_SIZE).toFixed(1)}× hero) — ultimates`);
  console.log();

  // --fix: generate optimized sprites
  if (doFix && oversized.length > 0) {
    console.log('─── GENERATING OPTIMIZED SPRITES ───────────────────');
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const s of oversized) {
      if (!s.buffer) continue;
      const targetFrameW = Math.round(s.declaredFrameW * parseFloat(s.normalize));
      const targetFrameH = Math.round(s.declaredFrameH * parseFloat(s.normalize));
      const targetW = targetFrameW * s.cols;
      const targetH = targetFrameH * s.rows;

      const outPath = path.join(OUT_DIR, `${s.name}.png`);
      await sharp(s.buffer)
        .resize(targetW, targetH, { kernel: 'nearest' })
        .png({ compressionLevel: 9 })
        .toFile(outPath);

      const stat = fs.statSync(outPath);
      console.log(`  ✅ ${s.name}: ${s.actualW}×${s.actualH} → ${targetW}×${targetH} (${(stat.size / 1024).toFixed(1)}KB)`);
    }
    console.log(`\n  Output: ${OUT_DIR}`);
  }

  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);
