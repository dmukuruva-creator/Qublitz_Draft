// Lets the browser suites run on another engine without editing each one:
//   QB_BROWSER=webkit NODE_OPTIONS="-r ./tests/support/select_browser.js" node tests/<suite>.js
// Suites ask playwright for `chromium`; this hands them the selected engine.
const Module = require('module');
const load = Module._load;
const engine = process.env.QB_BROWSER;

Module._load = function (request, ...rest) {
  const mod = load.call(this, request, ...rest);
  if (request !== 'playwright' || !engine) return mod;
  if (!mod[engine]) throw new Error(`QB_BROWSER: unknown engine "${engine}"`);
  return new Proxy(mod, { get: (t, k) => (k === 'chromium' ? t[engine] : t[k]) });
};
