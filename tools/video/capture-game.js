// Films the real Cheesecake Rush for the vertical promo: node tools/video/capture-game.js [--from s --to s] [--max s] [--dry] [--q 92]
// It opens game.html in headless Chrome at 1080×1920 and runs the game's frame loop by hand (one frame per film frame, on a
// virtual clock, so every run is the same). The film itself is a script that runs inside the page (rushv-play.js: it plays
// the game, and says how fast time runs, where the camera is and which caption shows). This file only steps frames and saves
// a picture of each, until the script says it is finished. It also saves every sound the game made (cues.json) for the soundtrack.
//   needs the game served somewhere: `python3 -m http.server 19101` in the repo root, or GAME_URL=http://localhost:19100/game
const fs = require('fs');
const path = require('path');
const { launch } = require('./cdp');

const W = 1080, H = 1920, FPS = 30;
const GAME_URL = process.env.GAME_URL || 'http://localhost:19101/game.html';
const OUT = path.join(__dirname, 'out', 'rushv');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };

// the page's frame loop, run by hand; installed before the game's own scripts so it never starts a loop of its own
const BOOT = `
  window.__q = []; window.requestAnimationFrame = f => { window.__q.push(f); return 1; };
  // the game's clock is ours too: it moves by exactly one frame (times the film's speed) per step, whatever Chrome's clock does while it photographs
  window.__t = 0; performance.now = () => window.__t;
  window.__step = () => { const q = window.__q.splice(0), t = window.__t; q.forEach(f => f(t)); return q.length; };
`;

(async () => {
  const dry = !!arg('dry', false), quality = Number(arg('q', 92));
  const from = parseFloat(arg('from', 0)), to = parseFloat(arg('to', 1e9)), max = parseFloat(arg('max', 90));
  fs.rmSync(path.join(OUT, 'frames'), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
  const t0 = Date.now();
  const c = await launch({ width: W, height: H });
  await c.send('Page.addScriptToEvaluateOnNewDocument', { source: BOOT });
  const loaded = c.once('Page.loadEventFired');
  await c.send('Page.navigate', { url: GAME_URL });
  await loaded;
  for (let i = 0; i < 80; i++) { if (await c.evaluate("!!(typeof makeModel==='function' && makeModel('miw','#fff') && makeScenery('cheesecake') && makeScenery('cheesefull') && makeScenery('donut'))")) break; await new Promise(r => setTimeout(r, 500)); }
  if (process.env.NOOV) await c.evaluate('window.__noov = true'); await c.evaluate(fs.readFileSync(path.join(__dirname, 'rushv-play.js'), 'utf8'));
  // the camera is the script's while it wants it; the labels must be placed with the same camera
  await c.evaluate(`(() => {
    const orig = renderer.render.bind(renderer), pl = window.placeLabels;
    const put = () => { const o = window.__cam; if (o) { camera.fov = o.fov; camera.position.set(...o.pos); camera.lookAt(...o.look); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true); } };
    renderer.render = (s, cam) => { put(); orig(s, cam); };
    window.placeLabels = () => { put(); pl(); };
    if (!window.__noov) RV.overlayInit();
    game.day = 3; kitchen.stock = { cheesecake: 6, donut: 6, kittycupcake: 6, pretzelcake: 6 }; kitchen.berries = 8; plot.ready = 20; setPlotView(); updateBerryHud();
    RV.go(RV.scenes.film); return true; })()`);
  await c.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });

  let speed = 1, f = 0;
  while (f < max * FPS) {
    const film = f / FPS;
    if (process.env.DBG && f > 55) console.log('\nf', f, 'budget', speed);
    const e = c.once('Emulation.virtualTimeBudgetExpired');
    await c.send('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: (1000 / FPS) * speed });
    await e;
    const r = JSON.parse(await c.evaluate('JSON.stringify({ speed: RV.frame(), done: RV.finished })'));
    speed = r.speed; f++;
    if (!dry && film >= from && film <= to) {
      if (process.env.DBG && f > 55) console.log('shot', f);
      // Chrome only makes a frame to photograph while its clock runs, so let it run for the moment of the screenshot
      await c.send('Emulation.setVirtualTimePolicy', { policy: 'advance' });
      const shot = await Promise.race([c.send('Page.captureScreenshot', { format: 'jpeg', quality }), new Promise(r => setTimeout(() => r(null), 20000))]);
      await c.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
      if (!shot) throw new Error('screenshot kept stalling at frame ' + f + ' ' + await c.evaluate('JSON.stringify({ok: 1, on: kitchen.on, cam: window.__cam && 1, vis: document.visibilityState, canv: document.querySelectorAll("canvas").length})'));
      fs.writeFileSync(path.join(OUT, 'frames', String(f).padStart(4, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
    }
    if (f % 30 === 0) process.stdout.write(`\r${film.toFixed(0)} s of film  (${Math.round((Date.now() - t0) / 1000)} s elapsed)`);
    if (r.done) break;
  }
  console.log('\n' + (await c.evaluate('JSON.stringify(RV.marks)')));
  const sounds = await c.evaluate('JSON.stringify(RV.sounds)');
  fs.writeFileSync(path.join(OUT, 'cues.json'), sounds);
  console.log(`\n${f} frames (${(f / FPS).toFixed(1)} s), ${JSON.parse(sounds).length} game sounds saved; done in ${Math.round((Date.now() - t0) / 1000)} s`);
  await c.close();
})().catch(e => { console.error(e); process.exit(1); });
