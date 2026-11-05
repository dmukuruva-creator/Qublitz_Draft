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
const watchPageErrors = require('./support/page_errors');
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
  const pageErrors = [];
  watchPageErrors(page, pageErrors);

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

  // Each probe names a font and a generic fallback. If the font did not load, the
  // browser draws the fallback and the two widths match exactly.
  const widths = await page.evaluate(async () => {
    const c = document.createElement('canvas').getContext('2d');
    const width = (font, text) => { c.font = font; return c.measureText(text).width; };
    const word = 'QuBlitz0123', digits = '0123456789:%';  // Rajdhani only carries digits
    // Embedded fonts load on first use, and the hub never uses Rajdhani. Request
    // each one; a font that is not embedded resolves to nothing and fails below.
    await Promise.all([
      document.fonts.load("16px 'Press Start 2P'", word),
      document.fonts.load("16px 'Space Grotesk'", word),
      document.fonts.load("600 16px 'Rajdhani'", digits),
    ]);
    return {
      gamePresent: typeof DUEL !== 'undefined' && !!document.getElementById('game-canvas'),
      pixelFont: width("16px 'Press Start 2P', monospace", word),
      pixelFallback: width('16px monospace', word),
      bodyFont: width("16px 'Space Grotesk', serif", word),
      bodyFallback: width('16px serif', word),
      numFont: width("600 16px 'Rajdhani', serif", digits),
      numFallback: width('600 16px serif', digits),
    };
  });

  const pixelFontLoaded = Math.abs(widths.pixelFont - widths.pixelFallback) > 1;
  const bodyFontLoaded = Math.abs(widths.bodyFont - widths.bodyFallback) > 1;
  const numFontLoaded = Math.abs(widths.numFont - widths.numFallback) > 1;

  await browser.close();

  const results = [
    { name: 'The game itself loaded', pass: widths.gamePresent, detail: `DUEL and #game-canvas present=${widths.gamePresent}` },
    { name: 'No uncaught page errors', pass: pageErrors.length === 0, detail: pageErrors.join(' | ') || 'none' },
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
