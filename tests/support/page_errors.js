// Records uncaught exceptions and console errors. The game's frame loop catches
// its own exceptions and logs them, so watching only one channel misses failures.
module.exports = function watchPageErrors(page, sink) {
  page.on('pageerror', e => sink.push(`uncaught: ${e.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const at = msg.location();
    // Firefox logs this around a reload with no script location. Source not
    // identified. Anything else, or this text from a real location, still fails.
    if (!at.url && msg.text().includes('Navigated away from page')) return;
    sink.push(`${msg.text()} @ ${at.url.split('/').pop()}:${at.lineNumber}:${at.columnNumber}`);
  });
};
