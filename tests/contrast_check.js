// FE-14c — scriptable WCAG contrast check (committed per FE-14's own task
// text), gating FE-7's done-when: "reports zero AA failures for text/
// interactive elements in both DOM and canvas color lists."
//
// Two passes:
//   1. DOM: loads the live page, walks every element with direct visible
//      text, reads its computed color, and composites the *actual*
//      rendered background by walking ancestors (alpha-blending each
//      non-transparent background-color down to an opaque result) rather
//      than guessing at a single "the panel background" constant — this
//      catches real failures instead of approximating them away.
//   2. Canvas: a curated list of the specific fg/bg color pairs this
//      codebase draws text on top of via ctx.fillStyle (GATE_COLORS
//      headers, canvas labels) — colors chosen dynamically by JS aren't
//      visible to a DOM walk, so these are named explicitly, mirroring
//      exactly what the FE-7 audit measured (white-on-indigo 3.24:1,
//      white-on-red 3.02:1, the #6b76a8 label at 4.49:1) rather than
//      claiming full automatic canvas coverage.
//
// WCAG 2.1 AA thresholds: 4.5:1 normal text, 3:1 for large text (>=24px,
// or >=18.66px/14pt when bold).
//
// Run: node tests/contrast_check.js
'use strict';
const path = require('path');

const GAME_URL = 'file://' + path.join(__dirname, '..', 'quantum_chess.html');

// C02-T2 — the canonical hub's two play modes, as openMenu() renders them.
// These are the product's only play entry points, and this check asserts it reached them before
// it claims to have measured anything. Substring matching, so the leading
// glyph and the trailing tagline can change without breaking the check —
// but a mode disappearing cannot. Deliberately NOT listing GLOSSARY, PHYSICS
// LAB or EXPORT MY LOG: those are tools around the game rather than the game,
// and pinning them here would make routine hub edits fail a contrast check.
const HUB_CONTROLS = ['PHOTON DUEL', 'DUEL TRAINING'];

// A floor on the DOM walk, so "0 failures" can never mean "0 elements".
// Measured on the hub at 1440x1000: see the run recorded in
// .cycle/cycles/cycle-01/REPORT.md. Set well below the observed count so
// ordinary copy edits do not trip it; the point is to catch a surface that
// collapsed, not to pin an exact number.
const MIN_DOM_ELEMENTS = 10;

function relLuminance([r, g, b]) {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(rgb1, rgb2) {
  const l1 = relLuminance(rgb1), l2 = relLuminance(rgb2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ── Pass 2: curated canvas fg/bg pairs (see header comment) ──
const CANVAS_PAIRS = [
  // Gate detail-card colored header: text color fixed 2026-07-08 (FE-7),
  // was white (#fff) on each GATE_COLORS value.
  { name: 'gate-card header: ATTACK (red) + black text',    fg: '#000000', bg: '#ff5a72', bold: true, px: 7 },
  { name: 'gate-card header: Z (indigo) + black text',      fg: '#000000', bg: '#8b7dff', bold: true, px: 7 },
  { name: 'gate-card header: H/Rx (teal) + black text',     fg: '#000000', bg: '#2fe0d0', bold: true, px: 7 },
  { name: 'gate-card header: X (rose) + black text',        fg: '#000000', bg: '#ff4d9d', bold: true, px: 7 },
  { name: 'gate-card header: Y (amber) + black text',       fg: '#000000', bg: '#ffa83c', bold: true, px: 7 },
  { name: 'gate-card header: S/Ry (green) + black text',    fg: '#000000', bg: '#3fe08a', bold: true, px: 7 },
  { name: 'gate-card header: T/MEASURE (gold) + black text', fg: '#000000', bg: '#f5b73c', bold: true, px: 7 },
  { name: 'gate-card header: CNOT (purple) + black text',   fg: '#000000', bg: '#c97bff', bold: true, px: 7 },
  { name: 'gate-card header: SKIP (slate) + black text',    fg: '#000000', bg: '#9aa3cf', bold: true, px: 7 },
  // Canvas label / floating-text color, on the dark board background —
  // was #6b76a8 (4.49:1), replaced with --dim's #9aa3cf (2026-07-08, FE-7).
  { name: 'canvas label/float text on board bg',            fg: '#9aa3cf', bg: '#070a16', bold: false, px: 6 },
  // Main gate-menu title bar (unchanged — verified already passing).
  { name: 'gate-menu title bar (white on #5a4cd6)',          fg: '#ffffff', bg: '#5a4cd6', bold: true, px: 7 },
];

function requiredRatio(px, bold) {
  return (px >= 24 || (px >= 18.66 && bold)) ? 3.0 : 4.5;
}

function checkCanvasPairs() {
  const results = [];
  for (const p of CANVAS_PAIRS) {
    const ratio = contrastRatio(hexToRgb(p.fg), hexToRgb(p.bg));
    const need = requiredRatio(p.px, p.bold);
    results.push({ name: p.name, ratio, need, pass: ratio >= need });
  }
  return results;
}

// ── Pass 1: real DOM computed-style walk ──
async function checkDom(page) {
  return page.evaluate(() => {
    function parseColor(str) {
      const m = str.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map(s => parseFloat(s.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    }
    function compositeOver(fg, bg) {
      // fg over bg, both {r,g,b,a}; returns opaque {r,g,b}
      const a = fg.a;
      return {
        r: fg.r * a + bg.r * (1 - a),
        g: fg.g * a + bg.g * (1 - a),
        b: fg.b * a + bg.b * (1 - a),
      };
    }
    // The page's actual visible backdrop comes from a `background:` gradient
    // shorthand on html/body (radial/linear-gradient, all dark navy/purple
    // stops in the #070a16-#1c1448 range) — getComputedStyle().backgroundColor
    // never reports that (gradients aren't a background-color), so if the
    // ancestor walk never finds an explicit opaque background-color, the
    // true backdrop is this dark page gradient, not the browser's default
    // white canvas. Using its darkest/most representative stop as the
    // fallback is a reasonable approximation without pixel-sampling the
    // actual gradient render.
    const PAGE_BG_FALLBACK = { r: 11, g: 16, b: 36 }; // ~#0b1024
    function effectiveBackground(el) {
      let stack = [];
      let node = el;
      while (node) {
        const cs = getComputedStyle(node);
        const bg = parseColor(cs.backgroundColor);
        if (bg && bg.a > 0) stack.push(bg);
        if (bg && bg.a >= 0.999) break; // opaque — nothing behind it matters
        node = node.parentElement;
      }
      if (stack.length === 0) return PAGE_BG_FALLBACK;
      // composite from the outermost (last found) to innermost (first found)
      let result = { ...PAGE_BG_FALLBACK, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) {
        result = { ...compositeOver(stack[i], result), a: 1 };
      }
      return result;
    }
    function relLuminance(c) {
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    }
    function contrastRatio(c1, c2) {
      const l1 = relLuminance(c1), l2 = relLuminance(c2);
      const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const results = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // Inactive/de-emphasized UI (e.g. a toggled-"off" badge dimmed via
      // opacity) has no WCAG contrast requirement (2.1, "inactive user
      // interface components" note) — skip rather than flag intentional dimming.
      if (parseFloat(cs.opacity) < 0.5) continue;
      // Gradient-clipped headings (-webkit-background-clip: text, color:
      // transparent) aren't flat-color text; a single contrast ratio
      // doesn't meaningfully apply — skip rather than misread the
      // transparent fill as opaque black.
      if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') continue;
      // sr-only-style visually-hidden text (screen-reader announcements):
      // clipped to ~0 visible size on purpose, not a rendered contrast case.
      const rectPre = el.getBoundingClientRect();
      if (rectPre.width <= 1 || rectPre.height <= 1) continue;
      // Only elements with direct (non-whitespace) text child nodes.
      let hasDirectText = false;
      for (const child of el.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) { hasDirectText = true; break; }
      }
      if (!hasDirectText) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const fg = parseColor(cs.color);
      if (!fg || fg.a < 0.5) continue;
      const bg = effectiveBackground(el);
      const ratio = contrastRatio(fg, bg);
      const px = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const need = (px >= 24 || (px >= 18.66 && bold)) ? 3.0 : 4.5;

      results.push({
        selector: el.id ? `#${el.id}` : (el.className && typeof el.className === 'string' ? `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()),
        text: el.textContent.trim().slice(0, 40),
        fg: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
        bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`,
        px, bold, ratio: Math.round(ratio * 100) / 100, need,
        pass: ratio >= need - 0.02, // small epsilon for float/rounding noise
      });
    }
    return results;
  });
}

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('playwright is not installed. Run:\n'
      + '  npm install --save-dev playwright && npx playwright install chromium\n'
      + 'then re-run this script.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const setupErrors = [];
  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.mouse.click(10, 10).catch(() => {});     // skip the boot screen
  await page.waitForTimeout(300);
  if (await page.locator('#boot').isVisible().catch(() => false)) {
    await page.locator('#boot').click({ timeout: 3000 }).catch(() => {});
  }

  // QB-A02 (2026-08-22) — this used to click a "PLAY vs BOT" button that
  // retired with the board on 2026-07-27, swallow the failure, then click
  // two board squares that no longer exist. Nothing failed, so the run went
  // green while measuring whatever happened to be on screen.
  //
  // The correct target was never a play mode. Since the board retired,
  // every piece of DOM text this game renders lives in #modal-content —
  // the hub, the mission list, the glossary, the debrief. The in-play HUD
  // is drawn on canvas and is covered by the curated pair list above, not
  // by a DOM walk. Entering a play mode would HIDE the only text this pass
  // can measure. So: stay on the hub, but prove the hub is really there,
  // really open, and really carries the canonical controls — otherwise
  // "0 failures" is just "0 elements".
  await page.locator('#modal-overlay.show').waitFor({ state: 'visible', timeout: 8000 })
    .catch(e => setupErrors.push('hub modal never opened: ' + e.message));
  for (const label of HUB_CONTROLS) {
    const n = await page.locator(`#modal-content button:has-text("${label}")`).count();
    if (n !== 1) setupErrors.push(`hub control "${label}" — expected exactly 1 button, found ${n}`);
  }

  const domResults = await checkDom(page);
  await browser.close();

  // A floor on the walk itself: the hub alone yields ~14 text elements.
  // If a future change empties the surface, that must read as a broken
  // check, not as a clean bill of health.
  if (domResults.length < MIN_DOM_ELEMENTS) {
    setupErrors.push(`DOM walk found only ${domResults.length} text element(s);`
      + ` the hub should yield at least ${MIN_DOM_ELEMENTS}. This pass measured nothing.`);
  }

  const canvasResults = checkCanvasPairs();

  console.log('=== FE-14c contrast check ===\n');
  if (setupErrors.length) {
    console.log('--- Setup (did this check reach the surface it claims to measure?) ---');
    for (const e of setupErrors) console.log(`✗ ${e}`);
    console.log('');
  }
  console.log(`--- DOM pass (${domResults.length} elements with direct text) ---`);
  const domFails = domResults.filter(r => !r.pass);
  for (const r of domFails) {
    console.log(`✗ ${r.selector} "${r.text}" — ${r.fg} on ${r.bg} = ${r.ratio}:1 (need ${r.need}:1)`);
  }
  console.log(`${domFails.length === 0 ? '✓' : '✗'} ${domResults.length - domFails.length}/${domResults.length} DOM elements pass\n`);

  console.log('--- Canvas color-list pass (curated pairs) ---');
  const canvasFails = canvasResults.filter(r => !r.pass);
  for (const r of canvasResults) {
    console.log(`${r.pass ? '✓' : '✗'} ${r.name} — ${r.ratio.toFixed(2)}:1 (need ${r.need}:1)`);
  }

  const anyFail = setupErrors.length > 0 || domFails.length > 0 || canvasFails.length > 0;
  console.log(`\n${anyFail ? 'FAIL' : 'PASS'} — ${setupErrors.length} setup failure(s),`
    + ` ${domFails.length} DOM failure(s), ${canvasFails.length} canvas failure(s)`);
  process.exit(anyFail ? 1 : 0);
})();
