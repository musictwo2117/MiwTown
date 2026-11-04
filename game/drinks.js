// Cheesecake Rush: making a drink. Tapping a drink on the juice bar pauses the shop and opens a little 3D scene (its own picture, with a
// sun, a lamp and soft shadows): pour it, drop things in, shake it. Each step is graded; the average is the drink's stars, and a good
// drink earns a few extra coins. A Skip button takes a plain drink straight away.
const DRINK_STEPS = {
  milktea: [
    { k: 'pour', target: 0.76, hint: 'Hold to pour the milk tea, let go at the line!', btn: 'Hold to pour' },
    { k: 'drop', item: 'pearl', n: 4, hint: 'Tap to drop in the tapioca pearls!', btn: 'Drop!' },
    { k: 'shake', n: 8, hint: 'Put the lid on and shake it up!', btn: 'Shake!' },
  ],
  cocoa: [
    { k: 'pour', target: 0.72, hint: 'Hold to pour the hot cocoa, let go at the line!', btn: 'Hold to pour' },
    { k: 'cream', target: 0.8, hint: 'Hold to swirl the whipped cream, let go at the line!', btn: 'Hold to swirl' },
    { k: 'drop', item: 'marsh', n: 3, hint: 'Tap to drop in the marshmallows!', btn: 'Drop!' },
  ],
  lemonade: [
    { k: 'drop', item: 'ice', n: 4, hint: 'Tap to drop in the ice!', btn: 'Drop!' },
    { k: 'pour', target: 0.84, hint: 'Hold to pour the soda, let go at the line!', btn: 'Hold to pour' },
    { k: 'garnish', n: 2, hint: 'Add a lemon slice, then a straw!', btn: 'Add!' },
  ],
};
const DRINK_LOOK = {   // the cup: how big, what the drink looks like, and what it is poured from
  milktea: { r: 0.42, h: 1.25, floor: 0.07, max: 1.1, liquid: '#f59dbb', jug: '#ffd6e2', name: 'Pink Milk Tea' },
  cocoa: { r: 0.46, h: 0.95, floor: 0.1, max: 0.8, liquid: '#7a4a32', jug: '#9a6a52', name: 'Marshmallow Cocoa' },
  lemonade: { r: 0.4, h: 1.3, floor: 0.06, max: 1.15, liquid: '#f7e36a', jug: '#9fd8b0', name: 'Lemon Soda' },
};
const dmk = (() => {
  const W = 560, H = 360, TOP = 0.6;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 1.75)); r.setSize(W, H);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.domElement.style.cssText = 'width:min(100%,calc(46vh * 560 / 360));aspect-ratio:560/360;height:auto;display:block;margin:0 auto;border-radius:18px;background:linear-gradient(#ffeef3,#fff3e6);touch-action:none;cursor:pointer';
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 40);
  cam.position.set(0, 2.35, 5.9); cam.lookAt(0, 1.5, 0);
  sc.add(new THREE.HemisphereLight(0xfff4ea, 0xd9b0b4, 0.66));
  const sun = new THREE.DirectionalLight(0xffe6c4, 0.72); sun.position.set(-3, 6, 4.5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -3.5; sun.shadow.camera.right = 3.5; sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -2; sun.shadow.camera.near = 1; sun.shadow.camera.far = 16;
  sun.shadow.bias = -0.0008; sun.shadow.radius = 3; sc.add(sun);
  const lamp = new THREE.PointLight('#ffd9a0', 0.35, 9, 2); lamp.position.set(2.4, 3, 2.6); sc.add(lamp);
  const mats = {};
  const dm = (geo, color, o = {}) => {
    const key = color + (o.op ?? 1) + (o.shin ?? 40) + (o.side ? 's' : '');
    const m = new THREE.Mesh(geo, o.own ? new THREE.MeshPhongMaterial({ color, shininess: o.shin ?? 40, specular: o.spec ?? 0x333333, transparent: o.op != null, opacity: o.op ?? 1, side: o.side }) : (mats[key] || (mats[key] = new THREE.MeshPhongMaterial({ color, shininess: o.shin ?? 40, specular: o.spec ?? 0x333333, transparent: o.op != null, opacity: o.op ?? 1, side: o.side }))));
    m.position.set(o.x || 0, o.y || 0, o.z || 0); m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0); if (o.s) m.scale.set(...o.s);
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; return m;
  };
  // the bar: a counter top, a pastel wall and a shelf with a few bottles
  sc.add(dm(new THREE.BoxGeometry(11, 0.5, 3.6), '#f0d4b4', { y: 0.35, z: 0.2 }), dm(new THREE.BoxGeometry(11.2, 0.1, 3.7), '#ffc4d6', { y: 0.55, z: 0.2 }),
    dm(new THREE.BoxGeometry(14, 7, 0.1), '#ffd0e1', { y: 3, z: -1.7, cast: false }), dm(new THREE.BoxGeometry(6, 0.1, 0.5), '#e8b886', { y: 2.7, z: -1.4 }));
  ['#f6a5bd', '#9fd8b0', '#f7e36a', '#b9a6f5', '#ffd6a5', '#a8dcf5'].forEach((c, i) => { const b = dm(new THREE.CylinderGeometry(0.16, 0.2, 0.7 + (i % 2) * 0.15, 14), c, { op: 0.9, shin: 80, x: -2.4 + i * 0.95, y: 3.1 + (i % 2) * 0.07, z: -1.4, cast: true }); sc.add(b); sc.add(dm(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 10), '#ffffff', { x: -2.4 + i * 0.95, y: 3.55 + (i % 2) * 0.15, z: -1.4 })); });
  const rig = new THREE.Group(); rig.position.y = TOP; sc.add(rig);

  // ----- state -----
  let on = false, id = null, look = null, cupG = null, liq = null, surf = null, jug = null, stream = null, marker = null, lidG = null, strawG = null, lemonG = null;
  let level = 0, holding = false, tilt = 0, mode = 'idle', t = 0, modeT = 0, shakeAmp = 0, shakeT = 0, creamH = 0, creamG = null, targetH = 0;
  const flying = [], settled = [], bits = [];
  const ease = k => k * k * (3 - 2 * k), V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  function build(drink) {
    while (rig.children.length) rig.remove(rig.children[0]);
    flying.length = settled.length = bits.length = 0;
    look = DRINK_LOOK[drink]; id = drink; level = 0; holding = false; tilt = 0; shakeAmp = 0; creamH = 0; mode = 'idle';
    cupG = new THREE.Group(); rig.add(cupG);
    const { r: cr, h, floor, liquid } = look;
    if (drink === 'cocoa') {   // a creamy ceramic mug with a handle
      const mug = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [cr - 0.06, 0], [cr + 0.04, 0.06], [cr + 0.06, h], [cr + 0.01, h], [cr - 0.01, floor + 0.04], [0.001, floor]].map(([x, y]) => new THREE.Vector2(x, y)), 36), new THREE.MeshPhongMaterial({ color: '#fffaf3', shininess: 70, specular: 0x555555, side: THREE.DoubleSide }));
      mug.castShadow = mug.receiveShadow = true; cupG.add(mug);
      cupG.add(dm(new THREE.TorusGeometry(0.26, 0.07, 10, 20, Math.PI * 1.2), '#fffaf3', { x: cr + 0.1, y: h * 0.5, rz: -Math.PI * 0.6, shin: 70 }));
      cupG.add(dm(new THREE.CylinderGeometry(cr + 0.075, cr + 0.075, 0.04, 36), '#ffc4d6', { y: h * 0.34 }));   // a pink band
    } else {   // a clear glass or plastic cup
      const rt = cr, rb = cr * 0.8;
      cupG.add(dm(new THREE.CylinderGeometry(rt, rb, h, 32, 1, true), '#e8f6ff', { op: 0.22, shin: 100, spec: 0xffffff, side: THREE.DoubleSide, y: h / 2, cast: false }));
      cupG.add(dm(new THREE.CylinderGeometry(rb, rb, 0.07, 32), '#e8f6ff', { op: 0.5, shin: 100, y: 0.035, cast: false }));
      cupG.add(dm(new THREE.TorusGeometry(rt, 0.018, 8, 36), '#ffffff', { rx: Math.PI / 2, y: h, shin: 90, cast: false }));
    }
    const lr = drink === 'cocoa' ? cr - 0.02 : cr * 0.86;
    liq = dm(new THREE.CylinderGeometry(lr, lr * 0.86, 1, 32), liquid, { op: drink === 'cocoa' ? null : 0.92, shin: 90, spec: 0xffffff, own: true, cast: false }); liq.visible = false; cupG.add(liq);
    surf = dm(new THREE.CircleGeometry(lr, 32).rotateX(-Math.PI / 2), liquid, { shin: 110, spec: 0xffffff, own: true, cast: false }); surf.visible = false; cupG.add(surf);
    // a ring that marks how full to pour, set per step
    marker = dm(new THREE.TorusGeometry(cr + 0.02, 0.016, 6, 40), '#ffffff', { rx: Math.PI / 2, own: true, cast: false }); marker.material.emissive = new THREE.Color('#ffffff'); marker.material.emissiveIntensity = 0.7; marker.visible = false; cupG.add(marker);
    // what it is poured from
    jug = new THREE.Group(); rig.add(jug);
    jug.add(dm(new THREE.CylinderGeometry(0.3, 0.34, 0.75, 24), look.jug, { y: 0.375, shin: 70 }), dm(new THREE.SphereGeometry(0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), look.jug, { y: 0.75, shin: 70 }), dm(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 14), look.jug, { x: 0.3, y: 0.7, rz: -0.9 }), dm(new THREE.TorusGeometry(0.2, 0.05, 8, 18, Math.PI), look.jug, { x: -0.34, y: 0.4, rz: Math.PI / 2 * 1 }));
    jug.visible = false; jug.scale.setScalar(0.8); jug.position.set(-2.3, look.h + 0.9, 0);
    stream = dm(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), liquid, { shin: 90, own: true, cast: false }); stream.visible = false; rig.add(stream);
    // later steps
    lidG = new THREE.Group(); lidG.add(dm(new THREE.SphereGeometry(cr * 1.02, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#ffffff', { op: 0.55, shin: 100, y: 0, cast: false }), dm(new THREE.TorusGeometry(cr * 1.01, 0.035, 8, 32), '#ffffff', { rx: Math.PI / 2, y: 0, shin: 80 })); lidG.visible = false; cupG.add(lidG);
    strawG = new THREE.Group(); strawG.add(dm(new THREE.CylinderGeometry(0.035, 0.035, h * 1.15, 8), '#ff7ea6', { y: 0.1, shin: 70 }), dm(new THREE.CylinderGeometry(0.0365, 0.0365, 0.16, 8), '#ffffff', { y: h * 0.45, shin: 70 }), dm(new THREE.CylinderGeometry(0.0365, 0.0365, 0.16, 8), '#ffffff', { y: h * 0.1, shin: 70 })); strawG.visible = false; strawG.rotation.z = -0.12; cupG.add(strawG);
    lemonG = new THREE.Group(); lemonG.add(dm(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 28), '#ffe14d', { shin: 50 }), dm(new THREE.CylinderGeometry(0.25, 0.25, 0.056, 28), '#fff6a8', { shin: 30 }));
    for (let i = 0; i < 6; i++) lemonG.add(dm(new THREE.BoxGeometry(0.02, 0.058, 0.25), '#ffe14d', { ry: i / 6 * Math.PI, x: 0, z: 0 })); lemonG.visible = false; cupG.add(lemonG);
    creamG = new THREE.Group(); creamG.visible = false; cupG.add(creamG);
    for (let i = 0; i < 6; i++) { const rr = 0.3 - i * 0.045; creamG.add(dm(new THREE.TorusGeometry(rr, 0.1 - i * 0.008, 10, 24), '#fffaf3', { rx: Math.PI / 2, y: i * 0.085, shin: 60 })); }
    creamG.add(dm(new THREE.SphereGeometry(0.075, 10, 8), '#fffaf3', { y: 6 * 0.085 }));
  }
  const surfY = () => look.floor + (look.max - look.floor) * Math.min(1, level) * (look.h > 1 ? 1 : 1);

  function toss(kind, at) {   // a thing falls into the cup and stays there
    const n = settled.filter(s => s.kind === kind).length;
    const rad = look.r * 0.45, a = Math.random() * Math.PI * 2; let x = Math.cos(a) * rad * Math.random(), z = Math.sin(a) * rad * Math.random();
    let m, y;
    if (kind === 'ice') { m = dm(new THREE.BoxGeometry(0.26, 0.26, 0.26), '#e3f5ff', { op: 0.72, shin: 100, spec: 0xffffff, own: true, rx: Math.random(), ry: Math.random(), cast: true }); y = look.floor + 0.18 + n * 0.2; }
    else if (kind === 'pearl') { m = dm(new THREE.SphereGeometry(0.095, 12, 10), '#2d1b14', { shin: 110, spec: 0xffffff }); y = look.floor + 0.1 + (n % 3) * 0.02 + Math.floor(n / 3) * 0.16; }
    else { m = dm(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 14), '#ffffff', { shin: 30, ry: Math.random() * 3 }); y = surfY() + 0.05; const ang = n * 2.2 + Math.random() * 0.3; x = Math.cos(ang) * look.r * 0.78; z = Math.sin(ang) * look.r * 0.78; }   // marshmallows float round the cream
    const from = V3(x * 1.2 + 0.7, look.h + 1.5, z), to = V3(x, y, z);
    m.position.copy(from); cupG.add(m); flying.push({ m, from, to, k: 0, dur: 0.5, kind }); settled.push({ m, kind }); return m;
  }
  function splash(at, n, color) {
    for (let i = 0; i < n; i++) { const m = dm(new THREE.SphereGeometry(0.04, 6, 5), color, { cast: false }); m.position.copy(at); rig.add(m); bits.push({ m, v: V3((Math.random() - 0.5) * 1.4, 1.2 + Math.random() * 1.4, (Math.random() - 0.5) * 1.4), life: 0.7 }); }
  }

  const api = {
    r, get on() { return on; }, set on(v) { on = v; },
    open(drink) { build(drink); on = true; t = 0; modeT = 0; },
    close() { on = false; },
    step(s) {   // set the scene up for a step
      mode = s.k; modeT = 0; holding = false; targetH = s.target || 0; shakeT = 0;
      jug.visible = s.k === 'pour'; marker.visible = s.k === 'pour' || s.k === 'cream';
      if (s.k === 'pour') { marker.position.y = look.floor + (look.max - look.floor) * s.target; }
      if (s.k === 'cream') { creamH = 0; creamG.visible = true; creamG.position.y = surfY(); marker.position.y = surfY() + 0.085 * 6 * s.target; creamG.children.forEach(c => { c.visible = false; }); }
      if (s.k === 'shake') { lidG.visible = true; lidG.position.y = look.h + 0.9; }
      if (s.k === 'garnish') { surf.visible = true; }
    },
    hold(v) { holding = v; },
    value() { return mode === 'cream' ? creamH : level; },
    drop(item) { toss(item); },
    garnish(i) { if (i === 0) { lemonG.visible = true; lemonG.userData = { k: 0 }; lemonG.position.set(look.r * 1.9, look.h * 0.6, 0); lemonG.rotation.set(0.2, 0, 0.9); } else { strawG.visible = true; strawG.userData = { k: 0 }; strawG.position.set(-look.r * 0.2, look.h * 1.9, 0); } },
    shakeHit() { shakeAmp = 1; shakeT = 0; for (let i = 0; i < 3; i++) splash(V3(0, look.h * 0.7, 0), 1, look.liquid); },
    finish() { mode = 'done'; modeT = 0; },
    update(dt, now) {
      t += dt; modeT += dt;
      const s = look; if (!s) return;
      // the cup's liquid
      if (mode === 'pour') {
        if (holding) level = Math.min(1.04, level + dt * (0.2 + 0.03 * Math.sin(t * 3)));
        tilt += ((holding ? 1 : 0) - tilt) * Math.min(1, dt * 5);
        const goal = V3(-0.72, look.h + 0.35, 0);
        jug.position.lerp(goal, Math.min(1, dt * 8)); jug.rotation.z = -tilt * 1.05;
        jug.updateMatrixWorld(true);
        const lip = rig.worldToLocal(jug.localToWorld(V3(0.4, 0.78, 0))), top = look.floor + (look.max - look.floor) * Math.min(1, level);
        stream.visible = holding && tilt > 0.55;
        stream.scale.set(1, Math.max(0.01, lip.y - top), 1); stream.position.set(lip.x, (lip.y + top) / 2, 0);
        if (stream.visible && Math.random() < 0.5) splash(V3(lip.x, top, 0), 1, look.liquid);
      } else { stream.visible = false; if (mode !== 'idle') jug.visible = false; }
      if (mode === 'cream') {
        if (holding) creamH = Math.min(1.25, creamH + dt * 0.55);
        creamG.children.forEach((c, i) => { c.visible = i < Math.ceil(Math.min(1, creamH) * 6) || (i === 6 && creamH > 0.9); });
      }
      if (level > 0.01) { const h = (look.max - look.floor) * Math.min(1, level); liq.visible = surf.visible = true; liq.scale.y = Math.max(0.001, h); liq.position.y = look.floor + h / 2; surf.position.y = look.floor + h; }
      // things in flight
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i]; f.k += dt / f.dur; const k = Math.min(1, f.k), e = k * k;
        f.m.position.set(f.from.x + (f.to.x - f.from.x) * k, f.from.y + (f.to.y - f.from.y) * e, f.from.z + (f.to.z - f.from.z) * k); f.m.rotation.y += dt * 6;
        if (k >= 1) { splash(V3(f.to.x, f.to.y, f.to.z), 3, look.liquid); flying.splice(i, 1); }
      }
      if (lemonG.visible && lemonG.userData && lemonG.userData.k != null) { const k = Math.min(1, (lemonG.userData.k += dt * 2.2)); lemonG.position.set(look.r * (1.9 - 0.9 * ease(k)), look.h * (0.62 + 0.38 * ease(k)) + Math.sin(k * Math.PI) * 0.4, 0); lemonG.rotation.z = 0.9 - 0.9 * ease(k) + 0.1; }
      if (strawG.visible && strawG.userData && strawG.userData.k != null) { const k = Math.min(1, (strawG.userData.k += dt * 2.0)); strawG.position.y = look.h * (1.9 - 1.35 * ease(k)); }
      if (mode === 'shake') { lidG.position.y += (look.h - lidG.position.y) * Math.min(1, dt * 8); shakeAmp = Math.max(0, shakeAmp - dt * 3); shakeT += dt; cupG.position.x = Math.sin(shakeT * 45) * 0.16 * shakeAmp; cupG.rotation.z = Math.sin(shakeT * 45 + 1) * 0.12 * shakeAmp; }
      else { cupG.position.x += (0 - cupG.position.x) * Math.min(1, dt * 8); cupG.rotation.z *= 0.8; }
      if (mode === 'done') { cupG.position.y = Math.abs(Math.sin(Math.min(modeT, 0.5) * 6)) * 0.25 * Math.max(0, 1 - modeT / 0.9); cupG.rotation.y += dt * 3; }
      for (let i = bits.length - 1; i >= 0; i--) { const b = bits[i]; b.life -= dt; b.v.y -= 7 * dt; b.m.position.addScaledVector(b.v, dt); b.m.material.transparent = true; b.m.material.opacity = Math.max(0, b.life * 1.6); if (b.life <= 0) { b.m.parent && b.m.parent.remove(b.m); bits.splice(i, 1); } }
      r.render(sc, cam);
    },
  };
  return api;
})();

// ---- the little window that runs a drink ----
let drinkRun = null;
const DRINK_BONUS = [0, 1, 2];   // extra coins for 1, 2 or 3 stars
function openDrink(drinkId, done) {
  if (drinkRun || !DRINK_STEPS[drinkId]) return false;
  const steps = DRINK_STEPS[drinkId], d = DESSERTS[drinkId];
  drinkRun = { id: drinkId, steps, idx: 0, grades: [], done, t0: 0 };
  game.paused = true; miwPause = 9999;
  $('panel').classList.remove('wide', 'shopwide');
  $('panel').innerHTML = `<h2>${d.emoji} ${d.name}</h2><p class="khint" id="dHint"></p><div id="dcanvas"></div><div id="dStage"></div><div class="acts" style="justify-content:center"><button class="alt" id="dSkip">Skip</button></div>`;
  $('dcanvas').style.position = 'relative'; $('dcanvas').appendChild(dmk.r.domElement);
  $('overlay').hidden = false; dmk.open(drinkId); dmk.r.domElement.onpointerdown = dmk.r.domElement.onpointerup = dmk.r.domElement.onpointercancel = null;
  $('dSkip').onclick = () => finishDrink(null);
  runDrinkStep();
  return true;
}
function praiseDrink(stars) {
  const h = $('dcanvas'); if (!h) return; const e = document.createElement('div');
  e.className = 'kpraise' + (stars === 3 ? ' big' : ''); e.textContent = ['Nice!', 'Great!', 'Perfect!'][stars - 1] + (stars === 3 ? ' ✨' : ''); h.appendChild(e); setTimeout(() => e.remove(), 1200);
  (stars === 3 ? sfx.bell : sfx.pick)();
}
function drinkGrade(g) { const run = drinkRun; if (!run) return; run.grades.push(g); praiseDrink(g); run.idx++; setTimeout(() => { if (drinkRun === run) runDrinkStep(); }, run.idx < run.steps.length ? 650 : 400); }
function runDrinkStep() {
  const run = drinkRun; if (!run) return;
  if (run.idx >= run.steps.length) return finishDrink(Math.max(1, Math.min(3, Math.round(run.grades.reduce((a, b) => a + b, 0) / run.grades.length))));
  const s = run.steps[run.idx], el = $('dStage'), cv = dmk.r.domElement; run.t0 = 0;
  cv.onpointerdown = cv.onpointerup = cv.onpointercancel = null;
  $('dHint').textContent = `${run.idx + 1}/${run.steps.length}  ${s.hint}`;
  dmk.step(s);
  if (s.k === 'pour' || s.k === 'cream') {
    const lo = Math.max(0, s.target - 0.1) * 100;
    el.innerHTML = `<div class="meter" id="dMeterWrap"><i class="z0" style="width:${lo}%"></i><i class="z1" style="width:20%"></i><i class="z2" style="width:${Math.max(0, 100 - lo - 20)}%"></i><b id="dMeter"></b></div><button class="go" id="dBtn" style="margin:0 auto;display:block;touch-action:none">${s.btn}</button>`;
    let held = false;
    const grab = () => { if (drinkRun !== run || run.idx >= run.steps.indexOf(s) + 1 || held) return; held = true; dmk.hold(true); };
    const letgo = () => {
      if (!held || drinkRun !== run) return; held = false; dmk.hold(false);
      const L = dmk.value(); if (L < 0.08) return;   // a tap by mistake
      run.watch = null; const dd = Math.abs(L - s.target); drinkGrade(dd <= 0.05 ? 3 : dd <= 0.12 ? 2 : 1);
    };
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} grab(); }; cv.onpointerup = cv.onpointercancel = letgo;
    const b = $('dBtn'); b.onpointerdown = e => { try { b.setPointerCapture(e.pointerId); } catch {} grab(); }; b.onpointerup = b.onpointercancel = letgo;
    run.watch = () => {   // the meter follows the level; too much pours over
      const L = dmk.value(), m = $('dMeter'); if (m) m.style.left = Math.min(100, L * 100) + '%';
      const w = $('dMeterWrap'); if (w) w.classList.toggle('warn', L > s.target + 0.12);
      if (L >= 1.0 && held) { held = false; dmk.hold(false); run.watch = null; sfx.nope(); drinkGrade(1); }
    };
  } else if (s.k === 'drop' || s.k === 'garnish' || s.k === 'shake') {
    el.innerHTML = `<div class="kpb"><i style="width:0%"></i></div><button class="go" id="dBtn" style="margin:0 auto;display:block">${s.btn}</button>`;
    const bar = el.querySelector('.kpb i'); let n = 0;
    const tap = () => {
      if (drinkRun !== run || run.steps[run.idx] !== s || n >= s.n) return;
      if (!run.t0) run.t0 = performance.now(); n++; bar.style.width = n / s.n * 100 + '%';
      if (s.k === 'drop') dmk.drop(s.item); else if (s.k === 'garnish') dmk.garnish(n - 1); else dmk.shakeHit();
      sfx.tap();
      if (n >= s.n) { const secs = (performance.now() - run.t0) / 1000, per = secs / s.n, lim = s.k === 'shake' ? [0.35, 0.6] : [0.7, 1.2]; drinkGrade(s.k === 'garnish' ? 3 : per < lim[0] ? 3 : per < lim[1] ? 2 : 1); }
    };
    cv.onpointerdown = tap; $('dBtn').onclick = tap;
  }
}
function finishDrink(stars) {
  const run = drinkRun; if (!run) return; drinkRun = null;
  dmk.finish(); const bonus = stars ? DRINK_BONUS[stars - 1] : 0;
  const end = () => {
    dmk.close(); $('overlay').hidden = true; game.paused = false; miwPause = 0.15;
    if (bonus > 0) { game.coins += bonus; popup(miw.root.position, `+${bonus} 🪙 ${stars === 3 ? 'Perfect drink!' : 'Nice drink!'}`); }
    run.done(stars);
  };
  if (stars) { sfx.fanfare(); setTimeout(end, 900); } else end();
}
