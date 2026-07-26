// FE-14b — offline/self-contained check (guards FE-5 + hard constraint 3:
// "quantum_chess.html stays a single file openable standalone in Chrome —
// which after FE-5 means genuinely zero network deps, fonts included.").
//
// Loads the standalone file with the browser context offline (no network
// stack at all — context.setOffline(true) — a stricter test than blocking
// specific origins, since it also catches any other accidental external
// dependency, not just Google Fonts), then asserts:
//   1. Zero failed requests to any external (non-file://) origin.
//   2. Both custom fonts actually rendered — measured by comparing a known
//      glyph's rendered width against the browser's generic fallback
//      (monospace / sans-serif) at the same pixel size. A CDN-@import
//      regression would silently fall back to those generics offline; this
//      catches that even though the page "loads" either way.
//
// Run: node tests/offline_check.js
'use strict';
const path = require('path');

const GAME_URL = 'file://' + path.join(__dirname, '..', 'quantum_chess.html');

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
  const ctx = await browser.newContext();
  await ctx.setOffline(true);
  const page = await ctx.newPage();

  const externalRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('file://') && !url.startsWith('data:') && !url.startsWith('about:')) {
      externalRequests.push(url);
    }
  });
  const failedRequests = [];
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.url()} — ${req.failure() ? req.failure().errorText : 'unknown'}`);
  });

  await page.goto(GAME_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Measure a known glyph's width in each custom font vs the browser's
  // generic fallback at the same size — if the embed silently failed and
  // fell back, the two widths would match (fallback == fallback).
  const widths = await page.evaluate(() => {
    function widthOf(fontFamily) {
      const c = document.createElement('canvas');
      const ctx2 = c.getContext('2d');
      ctx2.font = `16px ${fontFamily}`;
      return ctx2.measureText('QuBlitz0123').width;
    }
    // TY-2 — Rajdhani is digits-only, so its probe string must be numeric
    // (letters would fall through to the next face and measure as fallback).
    function numWidthOf(fontFamily) {
      const c = document.createElement('canvas');
      const ctx2 = c.getContext('2d');
      ctx2.font = `600 16px ${fontFamily}`;
      return ctx2.measureText('0123456789:%').width;
    }
    return {
      pixelFont: widthOf("'Press Start 2P'"),
      pixelFallback: widthOf('monospace'),
      bodyFont: widthOf("'Space Grotesk'"),
      bodyFallback: widthOf('sans-serif'),
      numFont: numWidthOf("'Rajdhani'"),
      numFallback: numWidthOf('sans-serif'),
    };
  });

  const pixelFontLoaded = Math.abs(widths.pixelFont - widths.pixelFallback) > 1;
  const bodyFontLoaded = Math.abs(widths.bodyFont - widths.bodyFallback) > 1;
  const numFontLoaded = Math.abs(widths.numFont - widths.numFallback) > 1;

  await browser.close();

  const results = [
    { name: 'Zero external requests while offline', pass: externalRequests.length === 0, detail: externalRequests.join(', ') || '(none)' },
    { name: 'Zero failed requests while offline', pass: failedRequests.length === 0, detail: failedRequests.join(', ') || '(none)' },
    { name: 'Press Start 2P actually rendered (not fallback)', pass: pixelFontLoaded, detail: `custom=${widths.pixelFont.toFixed(2)}px vs fallback=${widths.pixelFallback.toFixed(2)}px` },
    { name: 'Space Grotesk actually rendered (not fallback)', pass: bodyFontLoaded, detail: `custom=${widths.bodyFont.toFixed(2)}px vs fallback=${widths.bodyFallback.toFixed(2)}px` },
    { name: 'Rajdhani (HUD numerals) actually rendered (not fallback)', pass: numFontLoaded, detail: `custom=${widths.numFont.toFixed(2)}px vs fallback=${widths.numFallback.toFixed(2)}px` },
  ];

  console.log('=== FE-14b offline/self-contained check ===\n');
  let anyFail = false;
  for (const r of results) {
    if (!r.pass) anyFail = true;
    console.log(`${r.pass ? '✓' : '✗'} ${r.name}\n  ${r.detail}`);
  }
  process.exit(anyFail ? 1 : 0);
})();
