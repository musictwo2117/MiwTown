// Cheesecake Rush, vertical promo: the page side. capture-game.js loads the real game (game.html) in headless Chrome,
// drives its frame loop by hand (one game frame per film frame) and calls RV.frame() once per frame.
// RV.scenes.film is the whole film as one script that plays the game for the camera (drags the ingredients in, stirs, times
// the bake, serves, gives change...) and directs it: how fast the game runs, where the camera is, which caption shows.
// It also records every sound the game makes, so the soundtrack is built from the real thing.
(() => {
  const RV = window.RV = { tasks: [], f: 0, film: 0, speed: 1, mul: 1, sounds: [], marks: [], scenes: {}, finished: false };
  const FPS = 30;

  // ---------- running the game by hand ----------
  RV.go = gen => RV.tasks.push({ it: gen(), wait: 0 });
  RV.busy = () => RV.tasks.length;
  RV.frame = () => {
    RV.film = RV.f / FPS;
    RV.tasks = RV.tasks.filter(t => {
      if (t.wait > 0) { t.wait--; return true; }
      const r = t.it.next();
      if (r.done) return false;
      t.wait = Math.max(0, (r.value | 0) - 1);
      return true;
    });
    tickCam(); tickOverlay();
    window.__t += (1000 / FPS) * RV.speed * RV.mul;
    window.__step();
    RV.f++;
    return RV.speed * RV.mul;   // how fast the game runs for the next film frame
  };
  // every sound the game makes, with the film time it happens at, so the soundtrack plays the same ones
  window.tone = (f, at = 0, dur = 0.12, type = 'sine', vol = 0.12) => { RV.sounds.push({ t: +(RV.film + at).toFixed(3), f, dur, type, vol: vol * (window.settings ? settings.vol : 0.8) }); };

  // ---------- helpers ----------
  const ptr = (type, x, y, el = window) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
  const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const key = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
  function* until(fn, max = 900) { for (let i = 0; i < max && !fn(); i++) yield 1; }
  const ease = k => k * k * (3 - 2 * k);
  const cv = () => kst.r.domElement;
  const canvasAt = (fx, fy) => { const r = cv().getBoundingClientRect(); return [r.left + r.width * fx, r.top + r.height * fy]; };
  // pick a chip up, carry it over the picture (the game draws the little ghost) and let go
  function* drag(el, to, frames = 14) {
    const [x0, y0] = center(el);
    ptr('pointerdown', x0, y0, el);
    for (let i = 1; i <= frames; i++) { const e = ease(i / frames); ptr('pointermove', x0 + (to[0] - x0) * e, y0 + (to[1] - y0) * e); yield 1; }
    ptr('pointerup', to[0], to[1]);
  }
  const stepIs = k => () => kitchen.step && kitchen.step.kind === k;
  const tapCanvas = (fx, fy) => { const [x, y] = canvasAt(fx, fy); ptr('pointerdown', x, y, cv()); ptr('pointerup', x, y, cv()); };
  // where on the picture is a spot on the dough board? (found by looking, not by guessing)
  const boardPixel = (lx, lz, y = 0.27) => {
    const r = cv().getBoundingClientRect(); let best = null, bd = 9;
    for (let py = 0.2; py <= 0.95; py += 0.012) for (let px = 0.1; px <= 0.9; px += 0.012) {
      const h = kst.boardAt({ clientX: r.left + r.width * px, clientY: r.top + r.height * py }, y); if (!h) continue;
      const d = Math.hypot(h.x - lx, h.z - lz); if (d < bd) { bd = d; best = [r.left + r.width * px, r.top + r.height * py]; }
    }
    return best;
  };
  // the game's own sculpted pictures, not emoji
  const ic = id => `<i>${typeof icon === 'function' && thumbs[id] ? icon(id) : ''}</i>`;
  const sayOnce = (html, frames) => { RV.say(html); return frames; };

  // ---------- the camera, captions, fades and the end card (all driven by the film script) ----------
  const cam = { cur: null, from: null, to: null, f0: 0, n: 0 };
  RV.camSet = (pos, look, fov) => { cam.cur = { pos, look, fov }; cam.to = null; };
  RV.camTo = (pos, look, fov, frames) => { cam.from = cam.cur; cam.to = { pos, look, fov }; cam.f0 = RV.f; cam.n = frames; };
  RV.camOff = () => { cam.cur = null; cam.to = null; window.__cam = null; };
  const lerp = (a, b, k) => a + (b - a) * k, lerpV = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  function tickCam() {
    if (cam.to) {
      const k = ease(Math.min(1, (RV.f - cam.f0) / cam.n));
      cam.cur = { pos: lerpV(cam.from.pos, cam.to.pos, k), look: lerpV(cam.from.look, cam.to.look, k), fov: lerp(cam.from.fov, cam.to.fov, k) };
      if (k >= 1) cam.to = null;
    }
    window.__cam = cam.cur;
  }
  const ov = { text: '', f0: 0, out: -1, fade: 0, fadeTo: 0, fadeF0: 0, fadeN: 1, endF0: -1, endN: 1 };
  RV.say = html => { ov.text = html; ov.f0 = RV.f; ov.out = -1; };
  RV.hush = () => { ov.out = RV.f; };
  RV.fadeTo = (v, frames) => { ov.fadeFrom = ov.fade; ov.fadeTo = v; ov.fadeF0 = RV.f; ov.fadeN = Math.max(1, frames); };
  RV.endCard = frames => { ov.endF0 = RV.f; ov.endN = frames; };
  function tickOverlay() {
    const cap = document.getElementById('rvcap'), fd = document.getElementById('rvfade'), end = document.getElementById('rvend');
    if (!cap) return;
    let k = Math.min(1, (RV.f - ov.f0) / 8);
    if (ov.out >= 0) k = Math.max(0, 1 - (RV.f - ov.out) / 7);
    if (!ov.text) k = 0;
    if (cap.dataset.text !== ov.text) { cap.dataset.text = ov.text; cap.innerHTML = ov.text; }
    const s = k <= 0 ? 0 : k >= 1 ? 1 : (ov.out >= 0 ? k : (k < 0.75 ? 1.12 * (k / 0.75) : 1.12 - 0.12 * ((k - 0.75) / 0.25)));
    cap.style.opacity = Math.min(1, k * 3); cap.style.transform = `translateX(-50%) scale(${Math.max(0, s)})`;
    const fk = ease(Math.min(1, (RV.f - ov.fadeF0) / ov.fadeN)); ov.fade = lerp(ov.fadeFrom ?? ov.fade, ov.fadeTo, fk);
    fd.style.opacity = ov.fade;
    const ek = ov.endF0 < 0 ? 0 : ease(Math.min(1, (RV.f - ov.endF0) / ov.endN));
    end.style.opacity = ek; end.firstChild.style.transform = `translateY(${(1 - ek) * 40}px) scale(${0.85 + 0.15 * ek})`;
  }
  RV.overlayInit = () => {
    const css = document.createElement('style');
    css.textContent = `
      #rvcap{position:fixed;left:50%;top:1478px;transform:translateX(-50%) scale(0);z-index:200;pointer-events:none;opacity:0;white-space:nowrap;
        font:600 64px 'Fredoka',sans-serif;color:#4b3442;background:#fff;border-radius:999px;padding:22px 50px;box-shadow:0 14px 40px rgba(160,70,110,.35),0 0 0 6px rgba(255,190,214,.85)}
      #rvcap i{font-style:normal;margin-right:16px;display:inline-block;vertical-align:middle}#rvcap i img{width:84px;height:84px;display:block;margin:-18px 0}
      #rvend .em img{width:260px;height:260px}
      #rvfade{position:fixed;inset:0;z-index:300;pointer-events:none;background:#fff;opacity:1}
      #rvend{position:fixed;inset:0;z-index:250;pointer-events:none;opacity:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;
        background:radial-gradient(ellipse at 50% 42%,rgba(255,236,244,.95),rgba(255,196,218,.9));font-family:'Fredoka',sans-serif;color:#c2406f;text-align:center}
      #rvend .big{font-size:168px;line-height:1;font-weight:600;text-shadow:0 6px 0 #fff,0 22px 50px rgba(255,100,150,.4)}
      #rvend .em{font-size:190px}
      #rvend .sub{font:600 52px 'Nunito',sans-serif;color:#9a5b73}
      #rvend .pill{font-size:58px;background:#fff;border-radius:999px;padding:20px 56px;color:#4b3442;box-shadow:0 0 0 6px rgba(255,160,196,.7)}`;
    document.head.appendChild(css);
    const mk = (id, extra = {}) => Object.assign(document.createElement('div'), { id, ...extra });
    document.body.append(mk('rvcap'), mk('rvfade'), mk('rvend', { innerHTML: '<div class="em">'+ic('cheesecake')+'</div><div class="big">Cheesecake<br>Rush</div><div class="sub">a cozy café game from Miw’s Town</div><div class="pill">play it in your browser</div>' }));
  };

  // the camera positions the film uses (world units; the café's middle is near 0, 0.5, 0.6)
  const CAM = {
    wide: [[0, 15, 22], [0, 0.4, -0.5], 34],
    tables: [[0, 10.5, 17.5], [0, 0.3, 0.2], 40],
    register: [[3.4, 8.8, 14.5], [3.6, 0.6, -1.4], 40],
  };
  const camJump = n => RV.camSet(...CAM[n].map((v, i) => i === 2 ? v : v.slice()));

  // ---------- the kitchen: a cheesecake, step by step ----------
  function* cheesecake() {
    kitchen.on = false; game.running = false;
    openKitchen(3); RV.speed = 1; yield 10;
    document.querySelector('.rec[data-id="cheesecake"]').click();
    RV.say(ic('cheesecake') + 'bake it step by step');
    // 1. crush the cookies: tap, tap, tap
    yield* until(stepIs('crush')); RV.speed = 1.3; yield 14;
    for (let i = 0; i < 14; i++) { tapCanvas(0.5, 0.55); yield 3; }
    // 2. press the crumbs flat: drag over the whole pan, back and forth
    yield* until(stepIs('press')); RV.speed = 2; yield 10;
    {
      const [x0, y0] = canvasAt(0.3, 0.3), [x1, y1] = canvasAt(0.7, 0.8);
      ptr('pointerdown', x0, y0, cv());
      for (let k = 0; stepIs('press')() && k < 600; k++) { const row = Math.floor(k / 9), t = (k % 9) / 8, x = row % 2 ? 1 - t : t; ptr('pointermove', x0 + (x1 - x0) * x, y0 + (y1 - y0) * ((row * 0.1) % 1), cv()); yield 1; }
      ptr('pointerup', x0, y0, cv());
    }
    // 3. the ingredients, dragged one after another into the bowl
    yield* until(stepIs('add')); RV.speed = 3.2; yield 6;
    for (let i = 0, n = document.querySelectorAll('.rec.ing').length; i < n; i++) {
      yield* until(() => !kst.busy());
      yield* drag(document.querySelector(`.rec.ing[data-i="${i}"]`), canvasAt(0.5, 0.45), 8);
      yield 1;
    }
    // 4. stir in circles
    yield* until(stepIs('stir')); RV.speed = 2; yield 6;
    {
      const [cx, cy] = canvasAt(0.5, 0.5);
      ptr('pointerdown', cx + 110, cy, cv());
      for (let a = 0; stepIs('stir')() && a < 400; a++) { const th = a * 0.5; ptr('pointermove', cx + 110 * Math.cos(th), cy + 110 * Math.sin(th), cv()); yield 1; }
      ptr('pointerup', cx, cy, cv());
    }
    // 5. pour into the pan: hold, and let go on the line
    yield* until(stepIs('pour')); RV.speed = 1; yield 14;
    ptr('pointerdown', ...canvasAt(0.5, 0.5), cv());
    yield* until(() => kst.level() >= POUR_TARGET - 0.03, 500);
    ptr('pointerup', ...canvasAt(0.5, 0.5), cv());
    // 6. bake against the heat meter, and take it out when it is golden
    yield* until(stepIs('bake')); RV.speed = 5; yield 6;
    yield* until(() => { if (RV.f % 6 === 0) RV.marks.push(['bake p', kitchen.step.p, RV.f, RV.speed * RV.mul]); return kitchen.step.p >= 0.67 || kitchen.step.kind !== 'bake'; }, 1200);
    RV.speed = 1; RV.marks.push(['click', kitchen.step.kind, kitchen.step.p]); $('actBtn').click();
    // 7. decorate: four toppings, then it is cut into slices
    yield* until(() => stepIs('deco')() || stepIs('ruined')());
    if (stepIs('ruined')()) throw new Error('the cheesecake was ruined at film frame ' + RV.f);
    {
      const r = cv().getBoundingClientRect();
      const find = () => { const spots = []; for (let y = 0.05; y < 1; y += 0.04) for (let x = 0.05; x < 1; x += 0.04) { const p = kst.cakePoint({ clientX: r.left + r.width * x, clientY: r.top + r.height * y }); if (p) spots.push([x, y, p.x, p.z]); } return spots; };
      let spots = find(); for (let i = 0; !spots.length && i < 240; i++) { yield 1; spots = find(); }
      yield 14;
      const far = f => spots.slice().sort((a, b) => f(a) - f(b))[0], picks = [far(h => h[2]), far(h => -h[2]), far(h => h[3]), far(h => -h[3])];
      for (let i = 0; stepIs('deco')() && i < 12; i++) { const s = picks[i % 4]; ptr('pointerdown', r.left + r.width * s[0], r.top + r.height * s[1], cv()); yield 10; }
    }
    yield* until(() => !kitchen.step, 200);
    yield 46;
  }

  // ---------- the kitchen: the middle of a donut (jump-cut in, since the film is short) ----------
  function* donut() {
    RV.say(ic('donut') + 'knead, roll, fry…');
    yield* until(() => document.querySelector('.rec[data-id="donut"]'), 300); yield 6;
    if (!document.querySelector('.rec[data-id="donut"]')) throw new Error('no donut chip; on=' + kitchen.on + ' step=' + JSON.stringify(kitchen.step && kitchen.step.kind) + ' html=' + document.getElementById('kstage').innerHTML.slice(0, 300));
    document.querySelector('.rec[data-id="donut"]').click();
    kitchen.run.idx = 2; kitchen.run.grades = [3, 3]; kitchen.step = newStep('knead', 'donut'); renderStage();   // skip the mixing: it is the same as before
    RV.speed = 1.5; yield 12;
    // knead: left, right, left, right
    for (let i = 0; i < 12; i++) { document.querySelector(`.rec[data-s="${i % 2}"]`).click(); yield 3; }
    yield* until(stepIs('roll')); RV.speed = 1.6; yield 12;
    {   // roll the dough flat: drag the pin to and fro across the board
      const a = boardPixel(-1.0, -0.45, 0.2), b = boardPixel(1.0, 0.45, 0.2);
      ptr('pointerdown', ...a, cv());
      for (let k = 0; stepIs('roll')() && k < 500; k++) { const row = Math.floor(k / 9), t = (k % 9) / 8, x = row % 2 ? 1 - t : t; ptr('pointermove', a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * ((row * 0.18) % 1), cv()); yield 1; }
      ptr('pointerup', ...a, cv());
    }
    // cut: tap each of the six rings
    yield* until(stepIs('cut')); RV.speed = 1.4; yield 14;
    for (const [x, z] of [[-0.62, -0.3], [0, -0.3], [0.62, -0.3], [-0.62, 0.3], [0, 0.3], [0.62, 0.3]]) { const [px, py] = boardPixel(x, z, 0.27); ptr('pointerdown', px, py, cv()); yield 7; }
    // fry: flip when golden, take out when golden
    yield* until(stepIs('fry')); RV.speed = 4.5; yield 8;
    yield* until(() => kitchen.step.p >= 0.67, 900); $('actBtn').click();
    yield* until(() => kitchen.step && kitchen.step.kind === 'fry' && kitchen.step.phase === 1 && kitchen.step.p >= 0.67, 900); RV.speed = 1; $('actBtn').click();
    // glaze: hold to dip, let go in the green
    yield* until(stepIs('glaze')); RV.speed = 1; yield 16;
    ptr('pointerdown', ...canvasAt(0.5, 0.5), cv());
    yield* until(() => kst.level() >= POUR_TARGET - 0.03, 500);
    ptr('pointerup', ...canvasAt(0.5, 0.5), cv());
    // sprinkle: shake, shake, shake
    yield* until(stepIs('sprinkle')); RV.speed = 1.4; yield 10;
    for (let i = 0; i < 6; i++) { tapCanvas(0.5, 0.5); yield 7; }
    yield* until(() => !kitchen.step, 200);
    yield 34;
  }

  // ---------- the café: friends order, Miw serves ----------
  function* serving() {
    RV.speed = 1;
    kitchen.on = false; $('overlay').hidden = true; $('panel').classList.remove('wide');
    kitchen.stock = { cheesecake: 6, donut: 6, kittycupcake: 6, pretzelcake: 6 };
    startDay(3); game.spawnIn = 1e9; game.time = 90;
    camJump('tables'); RV.hush(); yield 10;
    RV.say(ic('milktea') + 'serve your friends');
    const orders = [['cheesecake', 'milktea'], ['donut', 'lemonade'], ['pretzelcake', 'cocoa']];
    const guests = [];
    for (const o of orders) { spawn(); const c = customers[customers.length - 1]; c.order = o; c.served = o.map(() => false); guests.push(c); yield 22; }
    RV.speed = 1.5;
    yield* until(() => guests.every(c => c.state === 'wait'), 600); yield 12;
    RV.camTo(...CAM.tables.map((v, i) => i === 0 ? [0.6, 9.5, 16] : v), 120);
    for (const c of guests) { tapTable(c.t); yield 6; }
    for (const c of guests) { c.kind = 'cash'; c.cash = 50; }
    yield* until(() => guests.every(c => c.state !== 'wait'), 1500);
    yield 10;
  }

  // ---------- the cashier: a calculator for the change ----------
  function* cashing() {
    RV.speed = 1.5; RV.say('give the right change');
    RV.camTo(...CAM.register.map((v, i) => i === 2 ? v : v.slice()), 60);
    yield* until(() => customers.some(c => c.state === 'pay'), 900);
    for (let n = 0; n < 2; n++) {
      yield* until(() => customers.some(c => c.state === 'pay'), 900);
      RV.speed = 1; yield 20; openPay(); yield 18;
      const c = pay.c, change = String(c.cash - c.bill);
      for (const k of change) { key(k); yield 8; }
      yield 14; key('Enter'); RV.speed = 1.3; yield 36;
    }
  }

  // ---------- the garden, the juice bar and the pond ----------
  function* garden() {
    RV.speed = 1; RV.say('grow your own strawberries');
    RV.camTo([8.5, 8, 14], [8.8, 0.3, -0.4], 40, 40);
    enqueue({ kind: 'field', at: FIELD_SPOT });
    yield 55;
    RV.camTo([-3, 8, 15], [-6.6, 0.4, 0.5], 40, 70);
    yield 55;
    RV.camTo([-9.5, 8, 16], [-8.2, 0.3, 3.5], 40, 70);
    yield 50;
  }

  RV.scenes.film = function* () {
    // the real home screen opens the film
    RV.fadeTo(0, 12); yield 60;
    RV.fadeTo(0, 1);
    document.getElementById('home').hidden = true; document.body.classList.remove('homing');
    camJump('wide');
    RV.mul = 0.75; RV.marks.push(['cheesecake', RV.f / FPS]); yield* cheesecake();
    RV.mul = 0.75; RV.marks.push(['donut', RV.f / FPS]); yield* donut();
    RV.hush();
    RV.mul = 0.95; RV.marks.push(['serving', RV.f / FPS]); yield* serving();
    RV.mul = 0.75; RV.marks.push(['cashing', RV.f / FPS]); yield* cashing();
    RV.mul = 0.8; RV.marks.push(['garden', RV.f / FPS]); yield* garden();
    RV.hush(); RV.camTo([0, 15, 22], [0, 0.4, -0.5], 34, 70); RV.endCard(26); yield 70;
    RV.fadeTo(1, 14); yield 22;
    RV.finished = true;
  };
})();
