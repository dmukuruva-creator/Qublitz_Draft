// FE-14d — screenshot the game *inside* the running Streamlit fork page, not
// just file://. capture_responsive.js proves the standalone file is correct;
// it can never catch a bug that only exists because of the embed itself —
// e.g. the fork's fixed `_EMBED_HEIGHT` (pages/QuBlitz_Arena.py) clipping
// content the standalone page has room for, or a widget-triggered Streamlit
// rerun remounting the iframe and resetting live game state (the question
// IN-4 answered by hand, once, in a prior session — this makes that a
// standing regression check instead of a one-time finding in prose).
//
// Requires: a local checkout of the qublitz fork with `streamlit` installed
// (the fork's own venv/requirements — this script shells out to the fork's
// own `streamlit` binary, not a game-repo dependency) and `playwright`
// (already a game-repo devDependency, see CLAUDE.md).
//
// Run: node tests/capture_embedded.js [path-to-qublitz-fork-checkout]
//   Defaults to ../../qublitz (a sibling of this repo's parent dir) if no
//   path is given, matching this project's documented repo layout
//   (CLAUDE.md's "two repos in play" table). Skips cleanly (exit 0) if the
//   fork checkout or a `streamlit` binary can't be found — same pattern
//   scripts/sync_vendor.sh and the fork's scripts/check_vendor.sh already
//   use for "nothing to check yet," not a hard failure.
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const OUT_DIR = path.join(__dirname, '..', '_arena_screenshots');
const PORT = 8599;
const ARENA_PATH = 'pages/QuBlitz_Arena.py';
const WIDTH = 1440; // one width is enough to prove the embed mechanism itself

function forkDirFromArgOrDefault() {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  return path.join(__dirname, '..', '..', 'qublitz');
}

function readEmbedHeight(forkDir) {
  const src = fs.readFileSync(path.join(forkDir, ARENA_PATH), 'utf8');
  const m = src.match(/_EMBED_HEIGHT\s*=\s*(\d+)/);
  if (!m) throw new Error(`could not find _EMBED_HEIGHT in ${ARENA_PATH}`);
  return parseInt(m[1], 10);
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error(`server did not come up at ${url} within ${timeoutMs}ms`));
        else setTimeout(tryOnce, 400);
      });
      req.setTimeout(2000, () => req.destroy());
    };
    tryOnce();
  });
}

async function killProc(proc) {
  if (!proc || proc.killed) return;
  proc.kill('SIGTERM');
  await new Promise(resolve => {
    const t = setTimeout(() => { try { proc.kill('SIGKILL'); } catch (_) {} resolve(); }, 3000);
    proc.once('exit', () => { clearTimeout(t); resolve(); });
  });
}

(async () => {
  const forkDir = forkDirFromArgOrDefault();

  if (!fs.existsSync(path.join(forkDir, ARENA_PATH))) {
    console.log(`FE-14d: SKIPPED — no qublitz fork checkout found at ${forkDir}`
      + ` (pass its path as an argument: node tests/capture_embedded.js <path>)`);
    process.exit(0);
  }

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('playwright is not installed. Run:\n'
      + '  npm install --save-dev playwright && npx playwright install chromium\n'
      + 'then re-run this script.');
    process.exit(1);
  }

  const expectedHeight = readEmbedHeight(forkDir);
  console.log(`=== FE-14d embedded capture — fork: ${forkDir} | expected embed height: ${expectedHeight}px ===\n`);

  let streamlitProc;
  const errors = [];
  try {
    streamlitProc = spawn(
      'streamlit',
      ['run', 'home.py', '--server.headless', 'true', '--server.port', String(PORT)],
      { cwd: forkDir, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let startupLog = '';
    streamlitProc.stdout.on('data', d => { startupLog += d; });
    streamlitProc.stderr.on('data', d => { startupLog += d; });
    streamlitProc.on('error', e => errors.push(`streamlit process failed to start: ${e.message}`));

    try {
      await waitForServer(`http://localhost:${PORT}`, 30000);
    } catch (e) {
      console.error(e.message);
      console.error('--- streamlit output ---\n' + startupLog);
      process.exit(1);
    }

    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 1400 } });
    const page = await ctx.newPage();
    // Streamlit polls its own /_stcore/health and /_stcore/host-config
    // endpoints client-side and both 404 under `streamlit run` outside its
    // normal proxy setup — a pre-existing, already-documented (BE-4) noise
    // source unrelated to anything this script actually tests. Filtered by
    // response URL, not by swallowing all console errors, so a real embed
    // failure still fails the run.
    let benign404Count = 0;
    page.on('response', res => {
      if (res.status() === 404 && /\/_stcore\/(health|host-config)$/.test(res.url())) benign404Count++;
    });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const text = m.text();
      if (/Failed to load resource.*404/.test(text) && benign404Count > 0) { benign404Count--; return; }
      errors.push('console.error: ' + text);
    });

    await page.goto(`http://localhost:${PORT}/QuBlitz_Arena`, { waitUntil: 'networkidle' });
    // Streamlit renders after the websocket connects, so "networkidle" can arrive
    // before the iframe exists. Wait for it rather than guessing a delay.
    const iframeLocator = page.locator('iframe[data-testid="stIFrame"]');
    await iframeLocator.first().waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
    await page.waitForTimeout(1500);

    const iframeCount = await iframeLocator.count();
    if (iframeCount !== 1) errors.push(`expected exactly 1 embedded iframe, found ${iframeCount}`);

    const box = await iframeLocator.boundingBox();
    if (!box) {
      errors.push('embedded iframe has no bounding box (not rendered?)');
    } else if (Math.abs(box.height - expectedHeight) > 2) {
      errors.push(`iframe rendered height ${box.height}px does not match _EMBED_HEIGHT=${expectedHeight}px`);
    }

    // Drive the game *inside* the real Streamlit iframe (not file://) —
    // this is the whole point of FE-14d: the same interaction sequence
    // capture_responsive.js already trusts for the standalone file, but
    // now proving it inside the container the layout fixes actually ship in.
    const gameFrame = page.frameLocator('iframe[data-testid="stIFrame"]');
    await page.mouse.click(box ? box.x + 10 : 10, box ? box.y + 10 : 10).catch(() => {});
    await page.waitForTimeout(300);

    // Must enter Photon Duel through its real hub button; a missing button fails.
    const duelBtn     = gameFrame.locator('#modal-content button:has-text("PHOTON DUEL")');
    const isDuelBuild = (await duelBtn.count().catch(() => 0)) > 0;

    if (isDuelBuild) {
      await duelBtn.click({ timeout: 5000 })
        .catch(e => errors.push('could not enter Photon Duel inside embed: ' + e.message));
      await page.waitForTimeout(500);
    } else {
      errors.push('embedded game exposed no Photon Duel hub button'
        + ' — the iframe did not reach a usable game surface.');
    }

    const canvas = gameFrame.locator('#game-canvas');
    if (await canvas.count() > 0) {
      const cbox = await canvas.boundingBox();
      if (cbox) {
        await page.waitForTimeout(400);

        // BE-4/FE-10's own recurring concern, made a standing check: does
        // real gameplay content (the canvas) fit inside the
        // fork's fixed embed height, or does the iframe clip it? A clipped
        // bottom edge means cbox's own bottom exceeds the iframe's box.
        if (box && cbox.y + cbox.height > box.y + box.height + 2) {
          errors.push(`game canvas bottom (${(cbox.y + cbox.height).toFixed(0)}px) exceeds the`
            + ` iframe's own bottom (${(box.y + box.height).toFixed(0)}px) — content is clipped`
            + ' inside the real Streamlit embed.');
        }
      }
    } else {
      errors.push('#game-canvas not found inside the embedded iframe');
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const fullFile = path.join(OUT_DIR, `embedded-${WIDTH}px.png`);
    await page.screenshot({ path: fullFile, fullPage: true });

    // IN-4's rerun-persistence finding, made a standing regression guard
    // instead of a one-time prose note: trigger a real Streamlit rerun via
    // the page's own sidebar expander, then confirm the iframe's live game
    // state (the "Battle start" log line written when the match began)
    // survived — i.e. the iframe was not remounted.
    const logHadBattleStart = await gameFrame.locator('#log').evaluate(el => el.textContent.includes('Battle start')).catch(() => false);
    const expander = page.locator('[data-testid="stExpander"]').first();
    if (await expander.count() > 0) {
      await expander.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(800);
      const logStillHasBattleStart = await gameFrame.locator('#log').evaluate(el => el.textContent.includes('Battle start')).catch(() => false);
      if (logHadBattleStart && !logStillHasBattleStart) {
        errors.push('iframe game state (log) did not survive a Streamlit rerun — iframe was remounted');
      }
    }

    await browser.close();
  } finally {
    await killProc(streamlitProc);
  }

  const ok = errors.length === 0;
  console.log(`${ok ? '✓' : '✗'} embedded ${WIDTH}px -> ${path.join(OUT_DIR, `embedded-${WIDTH}px.png`)}`
    + (ok ? '' : `\n  ${errors.join('\n  ')}`));
  process.exit(ok ? 0 : 1);
})();
