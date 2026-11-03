// A very small Chrome DevTools Protocol client, with no dependencies: it launches the headless Chrome that
// Playwright or Remotion has already downloaded, and lets a script drive a page (Node 22+ has WebSocket built in).
// Used by capture-game.js to film the real game frame by frame.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// any headless Chrome that is already on the machine
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  // the Chrome app, if it is there: in its new headless mode it renders with the real GPU, which is about 15x faster here
  const app = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'darwin' && fs.existsSync(app)) return app;
  const home = os.homedir(), hits = [];
  const walk = (dir, depth) => {
    if (depth < 0 || !fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isFile() && f.name === 'chrome-headless-shell') hits.push(p);
      else if (f.isDirectory()) walk(p, depth - 1);
    }
  };
  walk(path.join(home, 'Library/Caches/ms-playwright'), 3);
  walk(path.join(__dirname, 'remotion/node_modules/.remotion'), 4);
  walk(path.join(home, '.cache/ms-playwright'), 3);
  if (process.env.CHROME) hits.unshift(process.env.CHROME);
  if (!hits.length) throw new Error('No headless Chrome found. Run `npx playwright install chromium-headless-shell`, or set CHROME to a binary.');
  return hits[0];
}

async function launch({ width, height, port = 19222 + Math.floor(Math.random() * 500) }) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'miw-chrome-'));
  const bin = findChrome(), full = /Google Chrome|Chromium\.app/.test(bin);
  // the full Chrome app in its new headless mode can use the machine's real GPU, which is far faster than the
  // software renderer (SwiftShader) the stripped-down headless shell falls back on
  const proc = spawn(bin, [
    full ? '--headless=new' : '--headless', '--no-sandbox', '--hide-scrollbars', '--mute-audio', '--disable-gpu-vsync',
    ...(full ? ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']),
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    await new Promise(r => setTimeout(r, 150));
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
  }
  if (!target) { proc.kill(); throw new Error('Chrome did not start'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(), waiters = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method) waiters.splice(0).filter(w => { if (w.method === m.method) { w.res(m.params); return false; } return true; }).forEach(w => waiters.push(w));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = method => new Promise(res => waiters.push({ method, res }));
  // run a snippet in the page and give back its (JSON-able) value; the snippet may await
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const close = async () => { try { ws.close(); } catch {} proc.kill(); await new Promise(r => setTimeout(r, 400)); try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} };
  return { send, once, evaluate, close };
}

module.exports = { launch };
