// ---------- dishes: every dessert is served on a clean plate; after eating, the plates stay on the table until the bunny collects them and washes them at the sink ----------
// the pager button calls the bunny out of the kitchen. If dirty plates pile up and the clean ones run out, nothing more can be served.
const dish = { plates: 8, total: 8, state: 'idle', queue: [], carried: 0, washT: 0, wait: 0 };
const platesTotal = () => 8 + 2 * (save.caseLv || 0);   // a bigger case comes with a bigger stack of plates
const SINK_SPOT = new THREE.Vector3(2.9, 0.5, -6.65), BAKER_HOME = new THREE.Vector3(-0.6, 0.5, -5.8);

// the sink, with its stack of clean plates beside it (the stack shows how many are clean)
const sinkG = new THREE.Group(); scene.add(sinkG);
sinkG.add(mesh(box(1.5, 0.9, 0.7), '#fff6ef', { x: 2.7, y: 0.95, z: -7.45 }), mesh(box(1.6, 0.06, 0.8), '#c9ecdf', { x: 2.7, y: 1.43, z: -7.45 }),
  mesh(box(0.85, 0.05, 0.45), '#9fd3d8', { x: 2.55, y: 1.45, z: -7.45, cast: false }), mesh(cyl(0.03, 0.03, 0.34, 8), '#aeb7bf', { x: 2.55, y: 1.62, z: -7.68 }), mesh(cyl(0.025, 0.025, 0.22, 8), '#aeb7bf', { x: 2.55, y: 1.78, z: -7.58, rx: PI / 2 }));
const rackPlates = Array.from({ length: 14 }, (_, i) => { const m = mesh(cyl(0.3, 0.27, 0.035, 20), i % 2 ? '#ffffff' : '#ffe3ec', { x: 3.4 + (i < 7 ? 0 : 0.0), y: 1.49 + (i % 7) * 0.04, z: -7.45, cast: false }); m.position.x = i < 7 ? 3.3 : 3.3; m.position.z = i < 7 ? -7.35 : -7.55; sinkG.add(m); return m; });
function showRack() { rackPlates.forEach((m, i) => { m.visible = i < dish.plates; }); }
// soap bubbles over the basin while the bunny washes
const suds = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshPhongMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, shininess: 100 })); m.visible = false; scene.add(m); return { m, age: 9, life: 1, x: 0, z: 0 }; });
// a little tray the bunny carries the dirty plates on
baker.tray3d = new THREE.Group(); baker.tray3d.position.set(0, 0.95, 0.5); baker.root.add(baker.tray3d); baker.tray3d.visible = false;
baker.tray3d.add(mesh(cyl(0.4, 0.36, 0.04, 24), '#ffffff'));
baker.stack = new THREE.Group(); baker.stack.position.y = 0.04; baker.tray3d.add(baker.stack);
function renderBakerStack() {
  baker.stack.clear(); baker.tray3d.visible = dish.carried > 0;
  for (let i = 0; i < Math.min(dish.carried, 8); i++) baker.stack.add(mesh(cyl(0.24, 0.21, 0.04, 16), '#ffffff', { y: i * 0.045, x: (i % 2) * 0.03, cast: false }), mesh(cyl(0.14, 0.14, 0.012, 12), '#d9b38c', { y: i * 0.045 + 0.025, cast: false }));
}

// dirty plates left on a table (one for each dessert that was served)
function clearDirty(t) { (t.dirtyMeshes || []).forEach(m => scene.remove(m)); t.dirtyMeshes = []; t.dirtyN = 0; }
function dirtyTable(t, n) {
  clearDirty(t); if (n <= 0) return;
  t.dirtyN = n;
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.26, 0.22, 0.05, 18), '#ffffff'), mesh(cyl(0.17, 0.17, 0.015, 14), '#d9b38c', { y: 0.03, cast: false }));
    [[0.08, 0.04], [-0.1, 0.06], [0.0, -0.1]].forEach(([x, z]) => g.add(mesh(box(0.05, 0.03, 0.04), '#8a5a36', { x, y: 0.05, z, ry: x * 9, cast: false })));
    g.position.set(t.g.position.x + 0.25 - i * 0.45, 1.09, t.g.position.z + (i ? 0.3 : 0)); scene.add(g); t.dirtyMeshes.push(g);
  }
}
const dirtyTables = () => TABLES.filter(t => t.g.visible && t.dirtyN);
// a new day: everything is clean again and the bunny is back at the prep table
function resetDishes() {
  TABLES.forEach(clearDirty); dish.total = platesTotal(); dish.plates = dish.total; dish.state = 'idle'; dish.queue = []; dish.carried = 0; dish.washT = 0; dish.wait = 0;
  baker.kitchenWalker = true; baker.target = baker.path = baker.onArrive = null; baker.root.position.copy(BAKER_HOME); baker.face = 0; renderBakerStack(); showRack();
}
// the pager: the bunny comes out, takes every dirty plate off the tables, and washes them
function callDishes() {
  wakeAudio();
  if (!game.running || game.paused || menuOpen) return;
  if (dish.state !== 'idle') { toast('The bunny is already on it 🐰'); return; }
  const dirty = dirtyTables(); if (!dirty.length) { toast('No dirty plates yet ✨'); sfx.nope(); return; }
  dish.queue = dirty.sort((a, b) => a.g.position.x - b.g.position.x); dish.state = 'collect'; dish.carried = 0; dish.wait = 0.2; sfx.bell();
}
function stepDishes(dt) {
  if (dish.wait > 0) { dish.wait -= dt; return; }
  suds.forEach(s => {   // soap bubbles drift up over the basin
    if (s.age >= s.life) { s.m.visible = false; return; }
    s.age += dt; const u = s.age / s.life; s.m.position.set(s.x + Math.sin(u * 6 + s.x * 9) * 0.05, 1.5 + u * 0.35, s.z); s.m.scale.setScalar(0.6 + 0.6 * Math.sin(u * PI)); s.m.material.opacity = 0.8 * (1 - u * u);
  });
  if (baker.target) return;
  if (dish.state === 'collect') {
    if (dish.queue.length) {
      const t = dish.queue.shift(); if (!t.dirtyN) return;
      walkTo(baker, t.serve, () => { dish.carried += t.dirtyN; clearDirty(t); renderBakerStack(); baker.face = Math.atan2(t.g.position.x - baker.root.position.x, t.g.position.z - baker.root.position.z); sfx.pick(); dish.wait = 0.3; });
    } else if (dish.carried > 0) {
      dish.state = 'return'; walkTo(baker, SINK_SPOT, () => { dish.state = 'wash'; dish.washT = 1.2 + 0.9 * dish.carried; baker.face = PI; });
    } else { dish.state = 'idle'; }
  } else if (dish.state === 'wash') {
    dish.washT -= dt; baker.hop = true;
    if (Math.random() < dt * 8) { const s = suds.find(q => q.age >= q.life); if (s) { s.age = 0; s.life = 0.9 + Math.random() * 0.6; s.x = 2.55 + (Math.random() - 0.5) * 0.6; s.z = -7.45 + (Math.random() - 0.5) * 0.25; s.m.visible = true; } }
    if (Math.random() < dt * 5) tone(1400 + Math.random() * 900, 0, 0.02, 'sine', 0.012);   // a splashing sound
    if (dish.washT <= 0) {
      dish.plates = Math.min(dish.total, dish.plates + dish.carried); dish.carried = 0; renderBakerStack(); showRack(); baker.hop = false;
      toast('🍽 Clean plates ready!'); sfx.coin(); dish.state = 'idle';
    }
  } else if (dish.state === 'idle' && baker.root.position.distanceTo(BAKER_HOME) > 0.3) { walkTo(baker, BAKER_HOME, () => { baker.face = 0; }); }
}
const bakerHops = () => dish.state === 'wash' || payQueue.some(c => c.state === 'pay');
$('dishBtn').onclick = callDishes;
