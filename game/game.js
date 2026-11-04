const $ = id => document.getElementById(id);
const PI = Math.PI;

// ---------- the menu and the friends who come to eat ----------
const DESSERTS = {
  cheesecake:   { name: 'Strawberry Cheesecake', emoji: '🍰', price: 10, day: 1, color: '#f48fa8' },
  donut:        { name: 'Strawberry Donut',      emoji: '🍩', price: 8,  day: 1, color: '#f6a5bd' },
  kittycupcake: { name: 'Kitty Cupcake',         emoji: '🧁', price: 12, day: 2, cost: 60, color: '#ffd1a6' },
  pretzelcake:  { name: 'Pretzel Cake',          emoji: '🥨', price: 14, day: 3, cost: 120, color: '#eda95e' },
  pancake:      { name: 'Strawberry Pancakes',   emoji: '🥞', price: 11, day: 3, cost: 90, color: '#e9b358' },
  macaron:      { name: 'Strawberry Macarons',   emoji: '🍬', price: 12, day: 4, cost: 110, color: '#f6a5bd' },
  // drinks: made at the juice bar, never baked, so they don't run out
  milktea:      { name: 'Pink Milk Tea',         emoji: '🧋', price: 6,  day: 1, color: '#f6b8c8', drink: true },
  cocoa:        { name: 'Marshmallow Cocoa',     emoji: '☕', price: 7,  day: 2, cost: 40, color: '#a8664a', drink: true },
  lemonade:     { name: 'Lemon Soda',            emoji: '🍋', price: 6,  day: 3, cost: 50, color: '#fff3a8', drink: true },
};
const SPECIES = {
  cat:     { color: '#f7a072', fav: 'kittycupcake', patience: 1,   tip: 1,   note: 'loves the Kitty Cupcake' },
  bunny:   { color: '#f3e3e6', fav: 'cheesecake',   patience: 1,   tip: 1,   note: 'loves cheesecake' },
  bear:    { color: '#c8916a', fav: 'pretzelcake',  patience: 1,   tip: 1.5, note: 'tips big' },
  frog:    { color: '#8fd18a', fav: 'donut',        patience: 1.2, tip: 1,   note: 'always orders two', two: true },
  chick:   { color: '#ffd54a', fav: 'donut',        patience: 0.7, tip: 1,   note: 'in a hurry' },
  penguin: { color: '#7d8db0', fav: 'cheesecake',   patience: 1.4, tip: 1,   note: 'happy to wait' },
};
const EMOJI = { cat: '🐱', bunny: '🐰', bear: '🐻', frog: '🐸', chick: '🐥', penguin: '🐧' };
const DAY_SECONDS = 90;
// the daily goal climbs steeply over the first five days (learning the shop), then slowly: a fast player keeps up for weeks, a steady one hits a wall around day 11
const goalFor = d => Math.round((d <= 5 ? 75 + (d - 1) * 26 : 179 + (d - 5) * 6) / 5) * 5;
const tablesFor = d => Math.min(5, d + 2);
// the basic menu opens by day; the others (they have a `cost`) must also be bought with coins in the shop
const owns = id => !DESSERTS[id].cost || (save.recipes || []).includes(id);
const unlocked = (id, d) => DESSERTS[id].day <= d && owns(id);
// the counter's display case holds 4, 6 or 8 plates (upgraded in the shop); you pick which of your desserts stand on them
const CASE_SLOTS = [4, 6, 8], CASE_COST = [0, 150, 300];
const caseSlots = () => CASE_SLOTS[Math.min(2, save.caseLv || 0)];
const dessertIds = () => Object.keys(DESSERTS).filter(id => !DESSERTS[id].drink);
function shelfIds() {   // the desserts on the counter: the ones you put there, then any other you can sell, until the plates run out
  const ok = id => unlocked(id, game.day) && !(save.off || []).includes(id), want = (save.shelf || []).filter(id => DESSERTS[id] && !DESSERTS[id].drink && ok(id));
  dessertIds().forEach(id => { if (ok(id) && !want.includes(id)) want.push(id); });
  return want.slice(0, caseSlots());
}
const onCounter = id => DESSERTS[id].drink ? unlocked(id, game.day) : shelfIds().includes(id);

// ---------- saved progress (this browser only) ----------
const SAVE_KEY = 'miw-cheesecake-rush';
const SLOT_KEY = n => `${SAVE_KEY}-slot-${n}`, SET_KEY = `${SAVE_KEY}-settings`;
const defaultSave = () => ({ day: 1, best: 0, total: 0, wallet: 0, recipes: [], caseLv: 0, shelf: [], off: [], decor: {}, decorOwned: [], wear: {}, wearOwned: [], sweater: 'yellow', sweaterOwned: [], staff: 0, dishwasher: false });   // wallet: coins kept from every day, spent in the shop
let save = defaultSave(), slot = 0, menuOpen = false;   // the slot is picked on the home screen (home.js)
let settings = { muted: false, music: true, vol: 0.8, fancy: true, cam: 'low' };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem(SET_KEY) || '{}') }; } catch {}
const storeSettings = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch {} };
// the current slot keeps the progress and what's left on the shelves
const SAVE_VERSION = 2;   // bump when the save's shape changes, and upgrade older saves (no v = version 0) where they are loaded
const store = () => { if (!slot) return; try { localStorage.setItem(SLOT_KEY(slot), JSON.stringify({ ...save, v: SAVE_VERSION, stock: kitchen.stock, qual: kitchen.qual, berries: kitchen.berries, ripe: plot.ready, updated: Date.now() })); } catch {} };

// ---------- renderer / camera / lights ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
// a phone's screen has three or four times the pixels of its size, and the café is drawn with a few hundred draw calls: on touch screens draw at most 1.5x, which is still sharp at arm's length
const PR_MAX = matchMedia('(pointer: coarse)').matches ? 1.5 : 2;
renderer.setPixelRatio(Math.min(devicePixelRatio, PR_MAX));
$('scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 300);
// a low, close-ish angle so the friends' faces show; the width always fits the whole café
// yaw, tilt and zoom are what the player does with the camera (drag, wheel, pinch or the buttons): turn round the café, tip up or down, move in or out
const CAM = { fov: 30, el: 34 * PI / 180, d: 37, at: new THREE.Vector3(0, 0.5, 0.6), yaw: 0, tilt: 0, zoom: 1, fit: 37 };
const CAM_LIMITS = { tilt: [-0.25, 0.75], zoom: [0.45, 1.3] };
function placeCamera() {
  const d = CAM.fit * CAM.zoom, el = Math.max(0.2, Math.min(1.35, CAM.el + CAM.tilt));
  camera.position.set(CAM.at.x + d * Math.cos(el) * Math.sin(CAM.yaw), CAM.at.y + d * Math.sin(el), CAM.at.z + d * Math.cos(el) * Math.cos(CAM.yaw));
  camera.lookAt(CAM.at);
  scene.fog = new THREE.Fog(0xcfe6f7, d * 0.85 + 14 * (1 - CAM.zoom), d * 1.9);   // a little haze into the distance
}
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  let d = CAM.d; const visH = 2 * d * Math.tan(CAM.fov * PI / 360);
  d *= Math.max(1, 19 / (visH * a)); CAM.fit = d;
  camera.fov = CAM.fov; camera.aspect = a;
  placeCamera(); camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
addEventListener('resize', resize); resize();
// soft, warm light with no hard shadows: everything gets a round blob shadow instead
scene.add(new THREE.HemisphereLight(0xfff4ea, 0xd9b0b4, 0.56));
const sun = new THREE.DirectionalLight(0xffe6c4, 0.6); sun.position.set(9, 16, 5); scene.add(sun);
const fill = new THREE.DirectionalLight(0xffeef2, 0.2); fill.position.set(0, 20, 20); scene.add(fill);

// ---------- helpers ----------
const mats = {};
const M = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
function mesh(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s, cast = true, recv = false, mat } = {}) {
  const m = new THREE.Mesh(geo, mat || M(color));
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (s) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  m.castShadow = cast; m.receiveShadow = recv;
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);
const sph = (r, seg = 16) => new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.75 | 0));
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hits = [];   // invisible boxes the pointer can tap
function hitBox(w, h, d, pos, data) {
  const m = new THREE.Mesh(box(w, h, d), hitMat);
  m.position.copy(pos); m.userData = data;
  scene.add(m); hits.push(m);
  return m;
}

// ---------- the world: stepped blocks, little details everywhere, blob shadows ----------
const FM = c => mats['f' + c] || (mats['f' + c] = new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// instanced meshes: lots of small things in one draw call
function inst(geo, mat, items) {
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromEuler(e.set(0, it.ry || 0, 0)); p.set(it.x, it.y, it.z);
    const sc = it.s || [1, 1, 1]; s.set(sc[0], sc[1], sc[2]);
    m.setMatrixAt(i, mt.compose(p, q, s));
    if (it.c) m.setColorAt(i, c.set(it.c));
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.frustumCulled = false;
  scene.add(m);
  return m;
}
// a sign's little picture (sculpted in Blender, see icons.js) is drawn on its canvas once it is ready
function signIcon(tex, name, size) {
  const t = setInterval(() => {
    if (!thumbs[name]) return;
    clearInterval(t);
    const c = tex.image, img = new Image();
    img.onload = () => { c.getContext('2d').drawImage(img, c.width / 2 - size * 2, (c.height - size) / 2, size, size); tex.needsUpdate = true; };
    img.src = thumbs[name];
  }, 400);
}
function canvasTex(w, h, draw, nearest) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; }   // crisp up close, smooth (no shimmer) far away
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// a soft round shadow under things, instead of real shadows
const blobTex = canvasTex(64, 64, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, color: '#7a4a63', transparent: true, opacity: 0.34, depthWrite: false });
const blobGeo = new THREE.PlaneGeometry(2, 2).rotateX(-PI / 2);
function blob(x, y, z, rx, rz = rx) {
  const b = new THREE.Mesh(blobGeo, blobMat);
  b.position.set(x, y + 0.06, z); b.scale.set(rx, 1, rz);
  scene.add(b);
  return b;
}

// the ground is a grid of blocks half a unit tall: the café on level 0, a wooded terrace behind it, a pond and a strawberry plot beside it
const POND = { x: -8, z: 4.4, r: 2.1 };
// the strawberry plot: how many ripe berries are on the plants, and how many are on show
const plot = { ready: 8, max: 24, timer: 0, mesh: null, per: 7 };
function setPlotView() { if (plot.mesh) plot.mesh.count = Math.min(plot.mesh.instanceMatrix.count, plot.ready * plot.per); }
const STEP = 0.5, GW = 22, GD = 16;
const cellInfo = (x, z) => {
  let lvl = 0, kind = 'grass';
  if (z <= -5.5) { lvl = 1; if (z <= -6.5 && Math.abs(x) >= 7) { lvl = 2; kind = 'rock'; } }
  if (x >= -9.5 && x <= -7.5 && z >= -3.5 && z <= 0.5) kind = 'path';   // sand under the juice bar
  else if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 0.9) kind = 'pondside';
  else if (x >= 7.5 && z >= -3.5 && z <= 2.5) kind = 'field';
  else if (z === 4.5 && x >= -5.5) kind = 'path';
  else if ((z >= 6.5 && x >= -1.5 && x <= 6.5) || (x === -10.5 && z >= -3.5 && z <= 0.5)) kind = 'bed';
  return { lvl, kind };
};
const CAP = { pondside: '#86cf6a', grass: '#86cf6a', path: '#f2dcab', field: '#9a6b45', pond: '#ecd9a6', bed: '#6fbf64', rock: '#d3d7e2' };
const topY = c => c.lvl * STEP;
const cells = [];
for (let j = 0; j < GD; j++) for (let i = 0; i < GW; i++) { const x = i - 10.5, z = j - 7.5; cells.push({ i, j, x, z, ...cellInfo(x, z) }); }
(() => {
  const speck = canvasTex(16, 16, (x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const v = 228 + rnd() * 27 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, j, 1, 1); } }, true);
  const items = [], tmp = new THREE.Color(), sand = new THREE.Color('#e8c690'), deep = new THREE.Color('#b07848');
  cells.forEach(c => {
    // the blocks hang lower towards the middle, so the whole thing narrows like a floating island
    const e = Math.min(c.i, GW - 1 - c.i, c.j, GD - 1 - c.j), n = Math.min(7, 1 + e);
    for (let k = 0; k < n; k++) {
      const l = c.lvl - k;
      items.push({ x: c.x, y: l * STEP - STEP / 2 - (k ? 0 : 0.08), z: c.z, s: [1, k ? STEP : STEP - 0.16, 1], c: '#' + (c.kind === 'rock' && l >= 1 ? tmp.set('#b9bdca') : tmp.copy(sand).lerp(deep, k / 6)).getHexString() });
    }
    items.push({ x: c.x, y: topY(c) - 0.08, z: c.z, s: [1, 0.16, 1], c: CAP[c.kind] });   // sits exactly on the block under it: nothing overlaps, so nothing can flicker
  });
  inst(box(1, 1, 1), new THREE.MeshLambertMaterial({ map: speck }), items);

  // grass tufts: two crossed cards each
  const tuftTex = canvasTex(64, 64, (x) => {
    ['#3f9f4f', '#5fbf5a', '#7fd36a', '#9be07f'].forEach(col => { x.fillStyle = col; for (let k = 0; k < 5; k++) { const bx = 6 + rnd() * 52, h = 28 + rnd() * 30, w = 4 + rnd() * 4; x.beginPath(); x.moveTo(bx - w, 64); x.lineTo(bx + (rnd() - 0.5) * 8, 64 - h); x.lineTo(bx + w, 64); x.fill(); } });
  });
  const tufts = [];
  cells.forEach(c => {
    if (c.kind !== 'grass') return;
    if (Math.abs(c.x) < 7.2 && c.z > -4.8 && c.z < 4.4) return;   // keep the café floor clear
    if (Math.abs(c.x) <= 6.5 && c.z <= -5.5) return;   // and the kitchen floor: no grass indoors
    for (let k = 0; k < 4; k++) {
      const x = c.x + (rnd() - 0.5) * 0.85, z = c.z + (rnd() - 0.5) * 0.85, s = 1.1 + rnd() * 0.6, ry = rnd() * PI;
      tufts.push({ x, y: topY(c), z, ry, s: [s, s, s] }, { x, y: topY(c), z, ry: ry + PI / 2, s: [s, s, s] });
    }
  });
  window.grassTufts = { items: tufts, mesh: inst(new THREE.PlaneGeometry(0.95, 0.75).translate(0, 0.37, 0), new THREE.MeshLambertMaterial({ map: tuftTex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide }), tufts) };   // kept, so decorations can clear the grass round their feet

  // flower beds
  const flowers = [];
  cells.filter(c => c.kind === 'bed').forEach(c => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) flowers.push({ x: c.x - 0.33 + a * 0.33 + (rnd() - 0.5) * 0.12, y: topY(c) + 0.13, z: c.z - 0.33 + b * 0.33 + (rnd() - 0.5) * 0.12, s: [1, 0.5, 1], c: ['#ffb3c8', '#ffffff', '#ff8fb0', '#ffffff'][rnd() * 4 | 0] }); });
  inst(sph(0.11, 8), new THREE.MeshLambertMaterial(), flowers);

  // strawberry plot: rows of leafy plants with red berries, behind a white fence
  const leaves = [], berries = [];
  cells.filter(c => c.kind === 'field').forEach(c => { [-0.28, 0.28].forEach(dz => [-0.3, 0, 0.3].forEach(dx => {
    const x = c.x + dx, z = c.z + dz; leaves.push({ x, y: topY(c) + 0.12, z, s: [1, 0.7, 1] });
    berries.push({ x: x + 0.08, y: topY(c) + 0.12, z: z + 0.1 });
  })); });
  inst(sph(0.15, 8), M('#5fbf5a'), leaves);
  berries.sort(() => rnd() - 0.5);   // so the ripe ones are scattered over the plot
  plot.mesh = inst(sph(0.085, 8), M('#ef3d5c'), berries); plot.per = Math.max(1, Math.floor(berries.length / plot.max)); setPlotView();
  hitBox(3.2, 1.8, 6.4, new THREE.Vector3(9.1, 0.9, -0.5), { kind: 'field' });
  const posts = []; for (let z = -3.5; z <= 2.5; z += 0.4) posts.push({ x: 7.02, y: 0.28, z });
  inst(box(0.08, 0.56, 0.08), M('#ffffff'), posts);
  scene.add(mesh(box(0.05, 0.05, 6.4), '#ffffff', { x: 7.02, y: 0.38, z: -0.5, cast: false }));

  // the pond: an irregular round shape lying on the grass: a sandy bank, a white foam edge, and water that is paler at the shore
  const wob = a => 1 + 0.07 * Math.sin(2 * a + 0.7) + 0.05 * Math.sin(3 * a + 2.1) + 0.03 * Math.sin(5 * a + 0.4);
  const blobShape = R => { const pts = []; for (let i = 0; i < 72; i++) { const a = i / 72 * 2 * PI; pts.push(new THREE.Vector2(Math.cos(a) * R * wob(a), Math.sin(a) * R * wob(a))); } return new THREE.Shape(pts); };
  const pondTex = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w / 2); g.addColorStop(0, '#4fb0e6'); g.addColorStop(0.7, '#7cc9f0'); g.addColorStop(1, '#c4ecfb'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const layer = (R, y, material) => {
    const geo = new THREE.ShapeGeometry(blobShape(R)), pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (R * 2.3) + 0.5, pos.getY(i) / (R * 2.3) + 0.5);
    const m = new THREE.Mesh(geo, material); m.rotation.x = -PI / 2; m.position.set(POND.x, y, POND.z); scene.add(m); return m;
  };
  layer(POND.r + 0.5, 0.03, M('#efe0b4')); layer(POND.r + 0.16, 0.045, M('#ffffff'));
  layer(POND.r, 0.06, new THREE.MeshLambertMaterial({ map: pondTex, transparent: true, opacity: 0.96 }));
  [[-0.7, -0.8, 0.28], [0.9, 0.5, 0.24], [-0.9, 0.7, 0.3]].forEach(([dx, dz, r]) => { scene.add(mesh(cyl(r, r, 0.03, 14), '#6fbf64', { x: POND.x + dx, y: 0.085, z: POND.z + dz, cast: false })); scene.add(mesh(sph(0.08, 8), '#ffb3c8', { x: POND.x + dx + 0.05, y: 0.12, z: POND.z + dz, cast: false })); });
  // reeds and rocks round the bank
  [0.4, 0.9, 1.4, 3.7, 4.3, 5.4].forEach((a, i) => {
    const rr = POND.r * wob(a) + 0.62, x = POND.x + Math.cos(a) * rr, z = POND.z + Math.sin(a) * rr, h = 0.8 + (i % 3) * 0.25;
    scene.add(mesh(cyl(0.025, 0.03, h, 6), '#7cc68a', { x, y: h / 2, z, rz: (i % 2 ? 1 : -1) * 0.12, cast: false }), mesh(cyl(0.065, 0.065, 0.22, 8), '#8a5a3c', { x, y: h + 0.05, z, cast: false }));
  });
  [[2.2, 0.3], [2.9, 0.22], [5.0, 0.34], [0.1, 0.2], [3.3, 0.26]].forEach(([a, r]) => { const rr = POND.r * wob(a) + 0.55; scene.add(mesh(sph(r, 9), '#b9bdca', { x: POND.x + Math.cos(a) * rr, y: r * 0.35, z: POND.z + Math.sin(a) * rr, s: [1.2, 0.65, 1], cast: false })); });

  // pine trees: stacked faceted tiers; a row behind the counter and a few framing the front corners
  const pine = (x, y, z, s, a, b) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g);
    g.add(mesh(cyl(0.1, 0.15, 0.5, 6), '', { y: 0.25, mat: FM('#8a6a52') }));
    [[1.0, 0.95, 0.65], [0.82, 0.85, 1.3], [0.62, 0.75, 1.9], [0.4, 0.65, 2.4]].forEach(([r, h, yy], k) => g.add(mesh(new THREE.ConeGeometry(r, h, 7), '', { y: yy, mat: FM(k % 2 ? b : a) })));
    blob(x, y, z, 1.05 * s);
  };
  const levelAt = (x, z) => { const c = cells.find(q => q.z === z && Math.abs(q.x - x) < 0.5); return c ? topY(c) : 0.5; };
  for (let x = -10.4; x <= 10.4; x += 1.45) if (Math.abs(x) >= 7.6) pine(x + rnd() * 0.4, levelAt(x, -7.5), -7.2 + rnd() * 0.4, 1.35 + rnd() * 0.3, '#2f8f6a', '#3aa57a');
  [-9.6, -7.9, 8.1].forEach(x => pine(x, levelAt(x, -5.5), -5.6 + rnd() * 0.3, 1.1 + rnd() * 0.2, '#2f8f6a', '#3aa57a'));
  [[-10.2, 7.4], [9.4, 7.3], [10.2, 6.2]].forEach(([x, z]) => pine(x, 0, z, 1.55, '#28707f', '#36899a'));
  // round trees from Blender, with a plain ball until they load
  [[-4.5, 6.9, '#9fd49a'], [9.3, 5.7, '#ffc4d6'], [-10.0, 1.0, '#ffd6a5']].forEach(([x, z, c]) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(1.6); scene.add(t);
    t.add(mesh(sph(0.6), c, { y: 1.2 }));
    loadModel('tree', () => { t.clear(); t.add(makeScenery('tree', {}, { leaf: c }).g); });
    blob(x, 0, z, 1.5);
  });
})();

// the kitchen behind the counter, on the terrace: tiled floor, three walls, an oven, a fridge, a prep table and shelves
(() => {
  const Y = 0.5, Z = -6.5;
  const tile = canvasTex(64, 64, (x) => { x.fillStyle = '#fffaf3'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#cdeee0'; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32); }, true);
  tile.repeat.set(13, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 2.9), new THREE.MeshLambertMaterial({ map: tile }));
  floor.rotation.x = -PI / 2; floor.position.set(0, Y + 0.03, Z); scene.add(floor);
  // walls: cream above, a pink band below
  scene.add(mesh(box(13.6, 3.4, 0.25), '#fff0e3', { y: Y + 1.7, z: -7.95 }), mesh(box(13.6, 0.9, 0.3), '#ffd3e0', { y: Y + 0.45, z: -7.93 }));
  [-6.75, 6.75].forEach(x => scene.add(mesh(box(0.25, 3.4, 2.95), '#fff0e3', { x, y: Y + 1.7, z: Z + 0.02 }), mesh(box(0.3, 0.9, 2.95), '#ffd3e0', { x: x * 0.998, y: Y + 0.45, z: Z + 0.02 })));
  // a window and a plaque on the back wall
  scene.add(mesh(box(2.8, 1.3, 0.08), '#ffffff', { x: 0.4, y: Y + 2.1, z: -7.8 }), mesh(box(2.5, 1.0, 0.1), '', { x: 0.4, y: Y + 2.1, z: -7.79, mat: new THREE.MeshBasicMaterial({ color: '#cfeaff' }) }));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffb3c8'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#4b3442'; x.font = '600 32px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Kitchen', w / 2 + 22, h / 2 + 2); }) }));
  plaque.position.set(-3.4, Y + 2.6, -7.8); scene.add(plaque); signIcon(plaque.material.map, 'pan', 40);
  // oven (left): pink with a glowing window
  scene.add(mesh(box(2.0, 1.75, 1.3), '#ffc4d6', { x: -4.4, y: Y + 0.88, z: -7.15 }), mesh(box(2.1, 0.1, 1.4), '#fffaf3', { x: -4.4, y: Y + 1.78, z: -7.15 }),
    mesh(box(1.4, 0.8, 0.05), '', { x: -4.4, y: Y + 0.85, z: -6.5, mat: new THREE.MeshBasicMaterial({ color: '#ffb36b' }) }), mesh(box(1.5, 0.06, 0.1), '#ffffff', { x: -4.4, y: Y + 1.3, z: -6.47 }));
  [-0.55, 0.55].forEach(dx => scene.add(mesh(sph(0.08, 8), '#ffffff', { x: -4.4 + dx, y: Y + 1.55, z: -6.5, cast: false })));
  // fridge (right): mint
  scene.add(mesh(box(1.4, 2.7, 1.2), '#c9ecdf', { x: 5.3, y: Y + 1.35, z: -7.2 }), mesh(box(1.3, 0.04, 0.03), '#a6d8c6', { x: 5.3, y: Y + 1.75, z: -6.6, cast: false }));
  [0.95, 2.1].forEach(y => scene.add(mesh(box(0.06, 0.5, 0.06), '#ffffff', { x: 4.8, y: Y + y, z: -6.58 })));
  // prep table with a bowl, a rolling pin and bags of flour
  scene.add(mesh(box(3.2, 0.12, 1.2), '#e8b886', { x: -0.9, y: Y + 1.0, z: -6.9 }), mesh(box(3.0, 0.9, 1.0), '#fff6ef', { x: -0.9, y: Y + 0.5, z: -6.9 }));
  scene.add(mesh(cyl(0.4, 0.28, 0.3, 20), '#ffe1ea', { x: -1.6, y: Y + 1.21, z: -6.9 }), mesh(cyl(0.05, 0.05, 0.9, 10), '#e2b088', { x: -0.4, y: Y + 1.1, z: -6.7, rz: PI / 2, ry: 0.3 }));
  [0.3, 0.75].forEach((dx, i) => scene.add(mesh(box(0.35, 0.45, 0.2), '#ffffff', { x: 0.5 + dx, y: Y + 1.28, z: -7.2, ry: i * 0.3 })));
  // shelves with jars, and a rack of pots under a lamp
  [1.4, 2.2].forEach(y => scene.add(mesh(box(2.4, 0.07, 0.4), '#e8b886', { x: 2.9, y: Y + y, z: -7.7 })));
  [0, 1].forEach(r => [-0.8, -0.3, 0.2, 0.7].forEach((dx, i) => scene.add(mesh(cyl(0.14, 0.14, 0.3, 12), ['#ffc4d6', '#cdeee0', '#ffe3a8', '#d9ccf5'][(i + r) % 4], { x: 2.9 + dx + 0.1, y: Y + 1.58 + r * 0.8, z: -7.7, cast: false }))));
  scene.add(mesh(box(3.0, 0.06, 0.06), '#8a7a80', { x: 0.4, y: Y + 3.0, z: -7.5 }));
  [-1.0, -0.5, 0, 0.5, 1.0].forEach((dx, i) => { scene.add(mesh(cyl(0.2, 0.17, 0.2, 14), '#d98a5a', { x: 0.4 + dx * 1.2, y: Y + 2.7, z: -7.5, cast: false })); scene.add(mesh(box(0.04, 0.3, 0.04), '#8a7a80', { x: 0.4 + dx * 1.2, y: Y + 2.9, z: -7.5, cast: false })); });
  scene.add(mesh(cyl(0.01, 0.01, 0.9, 6), '#8a7a80', { x: -0.9, y: Y + 3.1, z: -6.9, cast: false }), mesh(cyl(0.1, 0.4, 0.3, 16), '#ffc4d6', { x: -0.9, y: Y + 2.55, z: -6.9 }));
  scene.add(mesh(sph(0.15, 10), '', { x: -0.9, y: Y + 2.45, z: -6.9, cast: false, mat: new THREE.MeshBasicMaterial({ color: '#fff6d8' }) }));
  [[-4.4, -7.2, 1.3], [-0.9, -6.9, 1.9], [5.3, -7.2, 1.0]].forEach(([x, z, r]) => blob(x, Y, z, r, r * 0.9));
})();

// a pink and cream checkered floor under the tables
(() => {
  const tex = canvasTex(64, 64, (x) => { x.fillStyle = '#ffeedd'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#ffbfd2'; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32); }, true);
  tex.repeat.set(7, 4.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshLambertMaterial({ map: tex }));
  floor.rotation.x = -PI / 2; floor.position.set(0, 0.045, -0.2);
  scene.add(floor);
})();

// sparkles, a rainbow and ripples on the pond
const sparks = (() => {
  const tex = canvasTex(32, 32, (x, w) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, '#fff'); g.addColorStop(0.3, 'rgba(255,240,200,.9)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const N = 90, pos = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
  for (let i = 0; i < N; i++) pos.set([(rnd() - 0.5) * 22, 0.3 + rnd() * 5, (rnd() - 0.5) * 16], i * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, size: 0.9, transparent: true, depthWrite: false }));
  p.frustumCulled = false; scene.add(p);
  return { p, pos, N };
})();
// a soft, see-through rainbow with real thickness: six round tubes lit like everything else, a faint haze round them, and mist at both feet
const rainbow = new THREE.Group(); rainbow.position.set(POND.x, 0.05, POND.z - 0.35); rainbow.rotation.y = 0.25; scene.add(rainbow);
const rainbowBands = ['#ff8fa3', '#ffb86b', '#ffe58a', '#9fe3a8', '#8fd0ff', '#b9a6f5'].map((c, i) => {
  const m = new THREE.Mesh(new THREE.TorusGeometry(2.05 - i * 0.2, 0.125, 12, 56, PI), new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, transparent: true, opacity: 0.72, depthWrite: false }));
  m.renderOrder = 2; rainbow.add(m); return m;
});
const haze = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.62, 12, 56, PI), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.14, depthWrite: false }));
haze.renderOrder = 1; haze.scale.z = 1.6; rainbow.add(haze);
const rainbowMist = [-1, 1].flatMap(sd => [0, 1, 2].map(i => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.3 + i * 0.07, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
  m.position.set(sd * (1.55 + (i - 1) * 0.12), 0.18 + i * 0.1, (i - 1) * 0.2); m.scale.set(1.5, 0.7, 1.2); m.userData.base = m.position.y; m.renderOrder = 3; rainbow.add(m); return m;
}));
const rings = [0, 1].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 6, 36), new THREE.MeshBasicMaterial({ color: '#fff', transparent: true })); r.rotation.x = PI / 2; r.position.set(POND.x + 0.2, 0.1, POND.z + 0.2); scene.add(r); return r; });
function worldFx(now, dt) {
  const p = sparks.pos;
  for (let i = 0; i < sparks.N; i++) { p[i * 3 + 1] += dt * (0.25 + (i % 5) * 0.06); p[i * 3] += Math.sin(now + i) * dt * 0.15; if (p[i * 3 + 1] > 5.5) p[i * 3 + 1] = 0.3; }
  sparks.p.geometry.attributes.position.needsUpdate = true;
  rainbowBands.forEach((m, i) => { m.material.opacity = 0.66 + 0.08 * Math.sin(now * 0.9 + i * 0.7); });   // a gentle shimmer
  rainbowMist.forEach((m, i) => { m.position.y = m.userData.base + Math.sin(now * 0.7 + i) * 0.05; m.material.opacity = 0.42 + 0.1 * Math.sin(now * 0.6 + i * 1.3); });
  rings.forEach((r, i) => { const k = ((now * 0.5) + i * 0.5) % 1; r.scale.setScalar(0.5 + k * 2.2); r.material.opacity = 0.8 * (1 - k); });
}

// the counter along the back, under a striped awning
const COUNTER_Z = -4.1;
// the counter, with a gap in it (a little swing door) so Miw can walk through to the kitchen behind
const DOOR = { x: 3.1, hw: 0.75 };
[[-6.5, DOOR.x - DOOR.hw], [DOOR.x + DOOR.hw, 6.5]].forEach(([x0, x1]) => {
  scene.add(mesh(box(x1 - x0, 1.05, 1.2), '#fff6ef', { x: (x0 + x1) / 2, y: 0.53, z: COUNTER_Z, recv: true }));
  scene.add(mesh(box(x1 - x0 + 0.3, 0.14, 1.45), '#ffc4d6', { x: (x0 + x1) / 2 + (x0 < 0 ? -0.15 : 0.15) * 0 , y: 1.12, z: COUNTER_Z, recv: true }));
});
for (let i = 0; i < 26; i++) { const x = -6.25 + i * 0.5; if (x > DOOR.x - DOOR.hw - 0.1 && x < DOOR.x + DOOR.hw + 0.1) continue; scene.add(mesh(sph(0.14, 10), '#ffc4d6', { x, y: 0.98, z: COUNTER_Z + 0.68, s: [1, 0.7, 0.6], cast: false })); }
const swingDoor = new THREE.Group(); swingDoor.position.set(DOOR.x - DOOR.hw + 0.05, 0, COUNTER_Z); scene.add(swingDoor);
swingDoor.add(mesh(box(DOOR.hw * 2 - 0.1, 0.62, 0.07), '#fffaf3', { x: DOOR.hw - 0.05, y: 0.4 }), mesh(box(DOOR.hw * 2 - 0.1, 0.1, 0.09), '#ff9fbf', { x: DOOR.hw - 0.05, y: 0.76 }));
[-1, 1].forEach(sd => scene.add(mesh(cyl(0.07, 0.08, 1.0, 10), '#ff9fbf', { x: DOOR.x + sd * (DOOR.hw + 0.02), y: 0.5, z: COUNTER_Z })));
scene.add(mesh(box(DOOR.hw * 2 - 0.15, 0.07, 0.8), '#e8b886', { x: DOOR.x, y: 0.25, z: COUNTER_Z - 0.6, rx: 0.695 }));   // a wooden ramp up to the kitchen floor
scene.add(mesh(box(DOOR.hw * 2, 0.02, 1.0), '#ffd3e0', { x: DOOR.x, y: 0.03, z: COUNTER_Z + 0.1, cast: false }));            // a doormat in the gap
function floorY(x, z) { return z >= -4.4 ? 0 : z <= -5.0 ? 0.5 : 0.5 * (-4.4 - z) / 0.6; }   // the ramp: level 0 in the shop, level 0.5 in the kitchen
function updateDoor(dt) {
  const near = Math.abs(miw.root.position.x - DOOR.x) < 1.4 && miw.root.position.z < -2.7 && miw.root.position.z > -5.6;
  swingDoor.rotation.y += ((near ? 1.45 : 0) - swingDoor.rotation.y) * Math.min(1, dt * 9);
}
[-6.4, 6.4].forEach(x => scene.add(mesh(cyl(0.1, 0.12, 5.0, 12), '#e8b886', { x, y: 2.5, z: COUNTER_Z - 0.4 })));
for (let i = 0; i < 13; i++) {
  const strip = mesh(box(1.0, 0.08, 1.0), i % 2 ? '#fffaf3' : '#ff9fbf', { x: -6 + i * 1.0, y: 4.6, z: COUNTER_Z + 0.1, rx: 0.32 });
  scene.add(strip);
  scene.add(mesh(sph(0.5, 14), i % 2 ? '#fffaf3' : '#ff9fbf', { x: -6 + i * 1.0, y: 4.3, z: COUNTER_Z + 0.62, s: [1, 0.4, 0.15], cast: false }));
}
blob(0, 0, COUNTER_Z + 0.1, 7.2, 1.5);
const sign = makePretzel(); sign.scale.setScalar(0.7); sign.position.set(0, 5.5, COUNTER_Z - 0.2); scene.add(sign);

// a little gate the friends come in and go out through
const GATE = new THREE.Vector3(7.0, 0, 5.2);
[-0.85, 0.85].forEach(d => {
  scene.add(mesh(cyl(0.13, 0.16, 2.2, 12), '#fff6ef', { x: GATE.x + d * 0.7, y: 1.1, z: GATE.z - d * 0.7 }));
  scene.add(mesh(sph(0.2, 12), '#ff9fbf', { x: GATE.x + d * 0.7, y: 2.25, z: GATE.z - d * 0.7 }));
});
const arch = mesh(new THREE.TorusGeometry(0.84, 0.09, 8, 28, PI), '#ff9fbf', { x: GATE.x, y: 2.2, z: GATE.z, ry: PI / 4 });   // springs from the tops of the two posts (they stand 0.84 from the middle, along the same line)
scene.add(arch);

// lamp posts by the gate
const bulbMat = new THREE.MeshBasicMaterial({ color: '#fff6d8' });
const POSTS = [[GATE.x - 1.7, GATE.z + 0.2], [GATE.x + 0.4, GATE.z - 1.6]].map(([x, z]) => {
  const p = new THREE.Group(); p.position.set(x, 0, z); scene.add(p);
  p.add(mesh(cyl(0.05, 0.06, 1.5, 8), '#8a7a80', { y: 0.75 }), mesh(sph(0.17), '#fff6d8', { y: 1.55 }));
  return p;
});
loadModel('lamppost', () => POSTS.forEach(p => { p.clear(); p.add(makeScenery('lamppost', { bulb: bulbMat }).g); }));

// ---------- desserts ----------
function dessertModel(id) {
  if (DESSERTS[id].drink) return cupModel(id);
  const m = makeScenery(id);
  if (m) return m.g;
  const g = new THREE.Group();   // until the model loads: a little round cake in the right color
  g.add(mesh(cyl(0.24, 0.24, 0.2, 18), '#fff0cf', { y: 0.1 }), mesh(cyl(0.25, 0.25, 0.06, 18), DESSERTS[id].color, { y: 0.22 }));
  return g;
}
// a small picture of each dessert for the order bubbles and the hands, rendered once its model loads
const thumbs = {};
const icon = id => thumbs[id] ? `<img src="${thumbs[id]}" alt="${DESSERTS[id].name}">` : DESSERTS[id].emoji;
let thumbRenderer = null;
function makeThumb(id, build) {
  try {
    if (!thumbRenderer) { thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbRenderer.setSize(128, 128); }
    const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    s.add(new THREE.HemisphereLight(0xfff4ea, 0xd9b0b4, 0.75));
    const l = new THREE.DirectionalLight(0xfff3e6, 0.55); l.position.set(2, 4, 3); s.add(l);
    const g = build ? build() : dessertModel(id); s.add(g);
    const bb = new THREE.Box3().setFromObject(g), c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2;
    cam.position.set(c.x, c.y + r * 1.3, c.z + r * 3.4); cam.lookAt(c);
    thumbRenderer.render(s, cam);
    thumbs[id] = thumbRenderer.domElement.toDataURL();
  } catch (e) { console.warn('no thumbnail for', id, e); }
}

// the four stations on the counter, each with its dessert turning on a cake stand
const STATIONS = Object.keys(DESSERTS).filter(id => !DESSERTS[id].drink).map((id, i) => {
  const x = -4.65 + i * 3.1, st = { id, x, pick: new THREE.Vector3(x, 0, COUNTER_Z + 1.35) };
  st.stand = new THREE.Group(); st.stand.position.set(x, 1.19, COUNTER_Z); scene.add(st.stand);
  st.cab = new THREE.Group(); st.stand.add(st.cab);   // the glass compartment (showcase.js)
  st.show = new THREE.Group(); st.show.position.y = 0.14; st.stand.add(st.show);   // the desserts on its shelf
  st.label = label('plate', '');
  st.hit = hitBox(2.4, 3, 2.4, new THREE.Vector3(x, 1.3, COUNTER_Z + 0.4), { kind: 'station', st });
  return st;
});
// spread the plates along the counter: the chosen desserts first, then the ones still locked, up to however many plates the case holds
const counterOrder = () => [...shelfIds(), ...dessertIds().filter(id => !unlocked(id, game.day))].slice(0, caseSlots());
function layoutStations() {
  const order = counterOrder(), W = (CASE_X1 - CASE_X0) / Math.max(1, order.length);   // one compartment for each dessert on show, side by side along the counter
  STATIONS.filter(st => !DESSERTS[st.id].drink).forEach(st => {
    const i = order.indexOf(st.id); st.off = i < 0;
    st.stand.visible = st.hit.visible = !st.off; st.label.style.display = 'none';   // the counts are in the stock tab, which doesn't sway when the camera turns
    if (st.off) return;
    const x = CASE_X0 + (i + 0.5) * W; st.x = x; st.pick.x = x; st.stand.position.x = x; buildCase(st, W);
    st.hit.position.x = x; st.hit.scale.x = Math.min(1, W * 0.95 / 2.4);
  });
}
function dressStations() {
  layoutStations(); if (typeof dressDecor === 'function') dressDecor();
  STATIONS.forEach(st => {
    if (!DESSERTS[st.id].drink) showStock(st, true);   // (the drinks keep their cups on the bar)
    else { st.show.clear(); if (onCounter(st.id)) st.show.add(dessertModel(st.id)); }
  });
  updatePlates();
}
function updatePlates() {
  STATIONS.forEach(st => {
    const open = onCounter(st.id), d = DESSERTS[st.id], n = stockOf(st.id);
    st.label.className = 'plate' + (!open ? ' locked' : n ? '' : ' sold') + (caseSlots() > 4 ? ' tiny' : '');
    st.label.innerHTML = !open ? (game.day >= d.day ? '🔒 recipe' : `🔒 day ${d.day}`) : n ? `${d.emoji} ${priceOf(st.id)}🪙${d.drink ? '' : ` ×${n}`}` : `${d.emoji} sold out`;
    st.label.title = open ? d.name : game.day >= d.day ? `Buy the ${d.name} recipe in the shop` : `Opens on day ${d.day}`;
    if (!d.drink) showStock(st);   // the case shows what is really left
  });
  drawStockTab();
}
// the stock tab in the left corner: one row for each plate on the counter, with how many are left
function drawStockTab() {
  const el = $('stockTab'); if (!el) return;
  el.innerHTML = counterOrder().map(id => {
    const d = DESSERTS[id], open = onCounter(id), n = stockOf(id);
    return open ? `<button class="srow${n ? '' : ' sold'}" data-id="${id}" title="${d.name}"><i>${icon(id)}</i><b>×${n}</b><small>${priceOf(id)}🪙</small></button>`
      : `<button class="srow locked" data-id="${id}" title="${d.name}"><i>${icon(id)}</i><small>🔒 ${game.day >= d.day ? 'recipe' : 'day ' + d.day}</small></button>`;
  }).join('');
  el.querySelectorAll('.srow').forEach(b => b.onclick = () => tapStock(b.dataset.id));
}
function tapStock(id) {
  if (prep.on) return bakeFromCafe(id);   // before opening, tapping a dessert in the tab goes to bake it
  if (!game.running || game.paused || menuOpen) return;
  if (!unlocked(id, game.day)) return toast(game.day >= DESSERTS[id].day ? `Buy the ${DESSERTS[id].name} recipe in the shop after closing 🛒` : `${DESSERTS[id].name} opens on day ${DESSERTS[id].day}`);
  if (!stockOf(id)) return soldOutTap(id);
  toast(`${DESSERTS[id].name}: ${stockOf(id)} left`);
}

// ---------- the cashier: the register at the end of the counter, and a queue to pay in ----------
const REG = { x: 6.0, spot: new THREE.Vector3(6.0, 0, -2.75), back: new THREE.Vector3(5.6, 0.5, -5.3), q: i => new THREE.Vector3(6.45, 0, -1.85 + i * 0.9) };
(() => {
  const g = new THREE.Group(); g.position.set(REG.x, 1.19, COUNTER_Z + 0.05); scene.add(g);
  g.add(mesh(box(0.95, 0.35, 0.6), '#ffc4d6', { y: 0.18 }), mesh(box(0.55, 0.36, 0.06), '#4b3442', { y: 0.55, z: -0.12, rx: -0.3 }), mesh(box(0.7, 0.05, 0.3), '#fffaf3', { y: 0.37, z: 0.12 }));
  for (let i = 0; i < 6; i++) g.add(mesh(box(0.1, 0.04, 0.08), '#ffffff', { x: -0.24 + (i % 3) * 0.24, y: 0.39, z: 0.06 + (i / 3 | 0) * 0.12, cast: false }));
  g.add(mesh(cyl(0.12, 0.12, 0.03, 16), '#ffd27a', { x: 0.3, y: 0.01, z: 0.45 }));
  hitBox(1.0, 2.2, 1.6, new THREE.Vector3(6.35, 1.5, COUNTER_Z + 0.2), { kind: 'register' });
})();
const regLabel = label('plate', '💰 cashier');
const payQueue = [], pay = { c: null, give: 0 };
const FIELD_SPOT = new THREE.Vector3(6.5, 0, 1.8);   // where Miw stands to pick strawberries

// ---------- drinks: a juice bar on the left of the café ----------
function cupModel(id) {
  const g = new THREE.Group(), d = DESSERTS[id];
  if (id === 'cocoa') {   // a mug of cocoa with marshmallows
    g.add(mesh(cyl(0.2, 0.17, 0.34, 20), '#fffaf3', { y: 0.17, cast: false }), mesh(cyl(0.18, 0.18, 0.03, 20), '#8a4b32', { y: 0.33, cast: false }), mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), '#fffaf3', { x: 0.24, y: 0.18, cast: false }));
    [[-0.06, 0.04], [0.06, -0.03], [0, 0.07]].forEach(([x, z], i) => g.add(mesh(box(0.1, 0.08, 0.1), '#ffffff', { x, y: 0.4, z, ry: i, cast: false })));
  } else if (id === 'lemonade') {   // a tall cup with ice and a lemon slice
    g.add(mesh(cyl(0.18, 0.14, 0.5, 20), d.color, { y: 0.25, cast: false }), mesh(cyl(0.19, 0.19, 0.03, 20), '#ffffff', { y: 0.51, cast: false }), mesh(cyl(0.12, 0.12, 0.03, 16), '#ffe14d', { x: 0.17, y: 0.5, rz: 0.5, cast: false }), mesh(cyl(0.025, 0.025, 0.42, 6), '#5fbf5a', { x: -0.04, y: 0.68, rz: -0.12, cast: false }));
    [[-0.05, 0.02], [0.06, -0.04]].forEach(([x, z]) => g.add(mesh(box(0.09, 0.09, 0.09), '#ffffff', { x, y: 0.55, z, cast: false })));
  } else {   // pink milk tea with boba
    g.add(mesh(cyl(0.19, 0.14, 0.46, 20), d.color, { y: 0.23, cast: false }), mesh(cyl(0.2, 0.2, 0.05, 20), '#ffffff', { y: 0.48, cast: false }), mesh(cyl(0.025, 0.025, 0.45, 6), '#ff7ea6', { x: 0.03, y: 0.7, rz: -0.1, cast: false }));
    for (let k = 0; k < 6; k++) { const a = k / 6 * 2 * PI; g.add(mesh(sph(0.04, 6), '#4b3442', { x: Math.cos(a) * 0.15, y: 0.07, z: Math.sin(a) * 0.15, cast: false })); }
  }
  return g;
}
const BAR = { x: -8.4, zs: [-2.6, -1.4, -0.2] };
(() => {
  scene.add(mesh(box(1.1, 1.0, 3.7), '#fff6ef', { x: BAR.x, y: 0.5, z: -1.4 }), mesh(box(1.25, 0.1, 3.85), '#bfe8d3', { x: BAR.x, y: 1.05, z: -1.4 }));
  [-3.1, 0.3].forEach(z => scene.add(mesh(cyl(0.07, 0.08, 2.3, 10), '#e8b886', { x: BAR.x - 0.45, y: 2.25, z })));
  for (let i = 0; i < 6; i++) {   // a striped canopy sloping down towards the café
    const c = i % 2 ? '#ffffff' : '#7fcfa8';
    scene.add(mesh(box(1.5, 0.07, 0.65), c, { x: BAR.x, y: 3.35, z: -3.1 + i * 0.65 + 0.32, rz: -0.25 }), mesh(sph(0.33, 12), c, { x: BAR.x + 0.72, y: 3.15, z: -3.1 + i * 0.65 + 0.32, s: [0.35, 0.5, 1], cast: false }));
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7fcfa8'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#4b3442'; x.font = '600 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Drinks', w / 2 + 22, h / 2 + 2); }) }));
  sign.rotation.y = PI / 2; sign.position.set(BAR.x + 0.56, 0.52, -1.4); scene.add(sign); signIcon(sign.material.map, 'milktea', 40);
  blob(BAR.x, 0, -1.4, 1.2, 2.3);
  ['milktea', 'cocoa', 'lemonade'].forEach((id, i) => {
    const z = BAR.zs[i], st = { id, x: BAR.x, lx: BAR.x + 0.9, lz: z, mz: z, my: 1.9, pick: new THREE.Vector3(-7.0, 0, z), face: -PI / 2 };
    st.show = new THREE.Group(); st.show.position.set(BAR.x, 1.1, z); st.show.scale.setScalar(1.5); scene.add(st.show);
    st.label = label('plate', '');
    st.hit = hitBox(1.8, 2.4, 1.2, new THREE.Vector3(BAR.x, 1.4, z), { kind: 'station', st });
    STATIONS.push(st);
  });
})();

// ---------- tables ----------
const TABLE_SPOTS = [[-4.4, -0.3], [0, -0.3], [4.4, -0.3], [-2.2, 2.9], [2.2, 2.9]];
const TABLES = TABLE_SPOTS.map(([x, z]) => {
  const t = { g: new THREE.Group(), customer: null, food: [] };
  t.g.position.set(x, 0, z); scene.add(t.g);
  t.g.add(mesh(cyl(0.95, 0.95, 0.1, 28), '#fff6ef', { y: 1.0 }), mesh(cyl(0.08, 0.1, 0.95, 10), '#e2b088', { y: 0.5 }),
    mesh(cyl(0.45, 0.5, 0.06, 18), '#e2b088', { y: 0.06 }), mesh(cyl(0.3, 0.26, 0.04, 20), '#ffffff', { x: 0.2, y: 1.07 }),
    mesh(cyl(0.34, 0.34, 0.12, 18), '#ffd27a', { x: 1.15, y: 0.5 }), mesh(cyl(0.05, 0.05, 0.44, 8), '#e2b088', { x: 1.15, y: 0.22 }));
  t.blob = [blob(x, 0, z, 1.7, 1.5), blob(x + 1.15, 0, z, 0.8)];
  t.seat = new THREE.Vector3(x + 1.15, 0, z);
  t.serve = new THREE.Vector3(x - 0.15, 0, z + 1.25);
  t.hit = hitBox(3.2, 2.8, 2.4, new THREE.Vector3(x + 0.4, 1.1, z), { kind: 'table', t });
  return t;
});
const openTables = () => TABLES.slice(0, tablesFor(game.day));
function dressTables() { TABLES.forEach((t, i) => { const on = i < tablesFor(game.day); t.g.visible = on; t.hit.visible = on; t.blob.forEach(b => { b.visible = on; }); }); }

// ---------- characters ----------
const CHAR_SCALE = 1.25;
function fallbackLook(color) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(mesh(sph(0.32), color, { y: 0.38, s: [1, 1.05, 0.95] }));
  const head = new THREE.Group(); head.position.y = 0.86; body.add(head);
  head.add(mesh(sph(0.36), color, { s: [1.08, 0.95, 1] }));
  [-1, 1].forEach(sd => head.add(mesh(sph(0.045, 8), '#2b1d16', { x: sd * 0.12, z: 0.32, cast: false })));
  return { g, body, head, tail: null, feet: [], pose: null };
}
function makeActor(species, color) {
  const a = { species, color, root: new THREE.Group(), target: null, onArrive: null, speed: 3.2, face: 0, t: Math.random() * 9, grow: 0 };
  scene.add(a.root);
  a.blob = blob(0, 0, 0, 0.8);
  dress(a);
  return a;
}
function dress(a) {
  if (a.look) a.root.remove(a.look.g);
  const m = makeModel(a.species, a.color);
  a.look = m || fallbackLook(a.color); a.fallback = !m;
  a.look.g.scale.setScalar(CHAR_SCALE);
  a.root.add(a.look.g);
  a.slice = a.look.g.getObjectByName('slice');
  if (a.species === 'miw' && typeof applyOutfit === 'function') applyOutfit(a.look);   // she wears what you bought
}
const lerpAngle = (a, b, k) => a + (((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI) * k;
const tmp = new THREE.Vector3();
function stepActor(a, dt) {
  if (a.fallback && makeModel(a.species, a.color)) dress(a);   // the Blender model arrived
  let walking = false;
  if (a.target) {
    tmp.subVectors(a.target, a.root.position); tmp.y = 0;
    const d = tmp.length();
    if (d < 0.04) {
      a.root.position.x = a.target.x; a.root.position.z = a.target.z;
      if (a.path && a.path.length) a.target = a.path.shift();
      else { const cb = a.onArrive; a.target = a.onArrive = null; cb && cb(); }
    } else {
      a.root.position.addScaledVector(tmp.normalize(), Math.min(d, a.speed * dt));
      a.face = Math.atan2(tmp.x, tmp.z); walking = true;
    }
  }
  a.root.rotation.y = lerpAngle(a.root.rotation.y, a.face, Math.min(1, dt * 12));
  if (a === miw || a.kitchenWalker) a.root.position.y = floorY(a.root.position.x, a.root.position.z);
  { const g = a.root.scale.x; a.blob.position.set(a.root.position.x, 0.06 + (a === miw || a.kitchenWalker ? a.root.position.y : 0), a.root.position.z); a.blob.scale.set(0.8 * g, 1, 0.8 * g); }
  a.t += dt;
  const { body, head } = a.look;
  // happy hops and worried wobbles; sitting on a stool they're gentle (a small bob, a slow head-tilt) instead of jumping or trembling
  const seated = !!a.seated;
  body.position.set(0, walking ? Math.abs(Math.sin(a.t * 11)) * 0.06 : a.hop ? Math.abs(Math.sin(a.t * 7)) * (seated ? 0.025 : 0.12) : 0, 0);
  if (head) head.rotation.z = a.shake ? Math.sin(a.t * 9) * 0.1 : a.hop ? Math.sin(a.t * 7) * (seated ? 0.06 : 0.12) : 0;
  if (a.look.pose) a.look.pose(walking, dt);
  if (a.slice) a.slice.visible = false;   // in the shop, they don't bring their own cheesecake
  return walking;
}
function removeActor(a) { scene.remove(a.root); scene.remove(a.blob); }
// ---------- walking around the tables ----------
// a small grid search, then the corners are cut wherever a straight line is clear of every table
const NAV = { x0: -9.5, z0: -3.6, cs: 0.4, nx: 48, nz: 26, r: 1.2 };
const nearTable = (x, z) => TABLES.some(t => t.g.visible && Math.hypot(x - t.g.position.x, z - t.g.position.z) < NAV.r) || decorBlocks.some(b => Math.hypot(x - b.x, z - b.z) < b.r + 0.4);
function clearLine(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.15);
  for (let i = 1; i < n; i++) { const k = i / n; if (nearTable(ax + (bx - ax) * k, az + (bz - az) * k)) return false; }
  return true;
}
function findPath(from, to) {
  let gx = to.x, gz = to.z;
  TABLES.forEach(t => {   // a spot on a tabletop: stand beside it instead
    if (!t.g.visible) return;
    const dx = gx - t.g.position.x, dz = gz - t.g.position.z, d = Math.hypot(dx, dz);
    if (d < 0.9) { gx = t.g.position.x + dx / (d || 1) * NAV.r; gz = t.g.position.z + dz / (d || 1) * NAV.r; }
  });
  const goal = new THREE.Vector3(gx, 0, gz);
  if (clearLine(from.x, from.z, gx, gz)) return [goal];
  const { x0, z0, cs, nx, nz } = NAV;
  const cell = (x, z) => [Math.max(0, Math.min(nx - 1, Math.round((x - x0) / cs))), Math.max(0, Math.min(nz - 1, Math.round((z - z0) / cs)))];
  const [sx, sz] = cell(from.x, from.z), [ex, ez] = cell(gx, gz);
  const key = (i, j) => j * nx + i, h = (i, j) => Math.hypot(i - ex, j - ez);
  const g = new Map([[key(sx, sz), 0]]), prev = new Map(), open = [[sx, sz]], done = new Set();
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (g.get(key(...open[k])) + h(...open[k]) < g.get(key(...open[bi])) + h(...open[bi])) bi = k;
    const [i, j] = open.splice(bi, 1)[0];
    if (i === ex && j === ez) break;
    done.add(key(i, j));
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= nx || nj >= nz || done.has(key(ni, nj))) continue;
      if (!(ni === ex && nj === ez) && nearTable(x0 + ni * cs, z0 + nj * cs)) continue;
      const ng = g.get(key(i, j)) + Math.hypot(di, dj);
      if (g.has(key(ni, nj)) && ng >= g.get(key(ni, nj))) continue;
      g.set(key(ni, nj), ng); prev.set(key(ni, nj), [i, j]);
      if (!open.some(o => o[0] === ni && o[1] === nj)) open.push([ni, nj]);
    }
  }
  if (!prev.has(key(ex, ez))) return [goal];   // no way round: walk straight
  const cells = [];
  for (let c = [ex, ez]; c; c = prev.get(key(...c))) cells.unshift(c);
  const pts = cells.map(([i, j]) => [x0 + i * cs, z0 + j * cs]);
  pts[0] = [from.x, from.z]; pts[pts.length - 1] = [gx, gz];
  const out = []; let at = pts[0];
  for (let k = 1; k < pts.length; k++) {
    if (k === pts.length - 1 || !clearLine(at[0], at[1], pts[k + 1][0], pts[k + 1][1])) { out.push(new THREE.Vector3(pts[k][0], 0, pts[k][1])); at = pts[k]; }
  }
  return out;
}
const KITCHEN_Z = -4.85;                       // behind this line is the kitchen
function miwRoute(from, to) {
  const inK = from.z < KITCHEN_Z, toK = to.z < KITCHEN_Z;
  const front = new THREE.Vector3(DOOR.x, 0, -3.1), gap = new THREE.Vector3(DOOR.x, 0, COUNTER_Z), back = new THREE.Vector3(DOOR.x, 0.5, -5.35);
  if (!inK && !toK) return findPath(from, to);
  if (inK && toK) return [to.clone()];
  if (toK) return [...findPath(from, front), gap, back, to.clone()];
  return [back, gap, front, ...findPath(front, to)];
}
function walkTo(a, p, cb) { const pts = a === miw || a.kitchenWalker ? miwRoute(a.root.position, p) : findPath(a.root.position, p); a.target = pts.shift(); a.path = pts; a.onArrive = cb; }

// Miw runs the shop and carries up to two desserts on a tray
const miw = makeActor('miw', '#ffd9c4');
miw.speed = 4.6;
const HOME = new THREE.Vector3(0, 0, -2.0);
miw.root.position.copy(HOME);
miw.tray = new THREE.Group(); miw.tray.position.set(0, 0.36, 0.95);   // low and out in front: the big round head reaches to about 0.66 ahead and down to 0.43, so a tray at face height pokes into it miw.root.add(miw.tray);
miw.tray.add(mesh(cyl(0.42, 0.38, 0.04, 24), '#ffffff'));
miw.trayItems = new THREE.Group(); miw.trayItems.position.y = 0.02; miw.tray.add(miw.trayItems);

// a bunny baker in a tall white hat, working at the prep table in the kitchen (and bouncing when someone is ready to pay)
const baker = makeActor('bunny', '#f3e3e6'); baker.grow = 1; baker.root.scale.setScalar(1); baker.root.position.set(-0.6, 0.5, -5.8); baker.face = 0; baker.baker = true;
// the penguin splashes in the pond and the chick hops on the bank
const pond = [makeActor('penguin', '#7d8db0'), makeActor('chick', '#ffd54a')];
pond.forEach(a => { a.grow = 1; a.root.scale.setScalar(1); });
pond[0].root.position.set(POND.x + 0.2, -0.05, POND.z + 0.2); pond[0].face = 0.3;
pond[1].root.position.set(POND.x + 2.9, 0, POND.z - 1.0); pond[1].hop = true;

// ---------- the game ----------
const game = { day: save.day, running: false, open: false, time: DAY_SECONDS, coins: 0, shown: 0, combo: 0, served: 0, missed: 0, spawnIn: 0 };
let hands = [], queue = [], customers = [], miwPause = 0, soldOutArm = { id: null, until: 0 };
// sold out: a second tap within a few seconds goes back to the kitchen to bake more
function soldOutTap(id) {
  if (soldOutArm.id === id && performance.now() < soldOutArm.until) { soldOutArm.id = null; return restock(id); }
  soldOutArm = { id, until: performance.now() + 4000 };
  toast(`${DESSERTS[id].name} is sold out! Tap it again to bake more 🍳`);
}
const HAND_MAX = 4, QUEUE_MAX = 12;   // a tray of four, and as many steps queued ahead

function renderHands() {
  document.querySelectorAll('.slot').forEach((el, i) => {
    const id = hands[i];
    el.className = 'slot' + (id ? ' full' : '');
    el.innerHTML = id ? icon(id) : '';
    el.title = id ? `${DESSERTS[id].name} (tap to put back)` : 'Empty';
  });
  miw.trayItems.clear();
  miw.tray.visible = hands.length > 0;
  hands.forEach((id, i) => {
    const m = dessertModel(id);
    m.scale.setScalar(0.62); m.position.x = (i - (hands.length - 1) / 2) * 0.36;
    miw.trayItems.add(m);
  });
}
document.querySelectorAll('.slot').forEach(el => el.onclick = () => {
  const i = +el.dataset.i;
  if (!hands[i]) return;
  if (!DESSERTS[hands[i]].drink) kitchen.stock[hands[i]]++; hands.splice(i, 1); renderHands(); updatePlates(); sfx.toss();
});

// tapping the scene queues up what Miw does next: pick a dessert, serve a table, or just walk somewhere
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), kitchenFloor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5), counterTop = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.25);
function tapScene(e) {
  wakeAudio();
  if (prep.on) {   // in the café before opening: a tap on a dessert goes to bake it, anything else says what to do
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits.filter(x => x.visible))[0], d = h && h.object.userData;
    if (d && d.kind === 'station' && !DESSERTS[d.st.id].drink) return bakeFromCafe(d.st.id);
    return toast('Not open yet: tap Kitchen to bake more, or Open the shop');
  }
  if (!game.running || game.paused) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  // the register sits right behind the 4th dessert's tap area, so a tap on it used to land on that dessert: decide by where on the counter it was
  const all = ray.intersectObjects(hits.filter(h => h.visible));
  let hit = all[0];
  const regHit = all.find(h => h.object.userData.kind === 'register');
  if (hit && regHit && hit !== regHit) { const pc = ray.ray.intersectPlane(counterTop, new THREE.Vector3()); if (pc && pc.x > 5.55) hit = regHit; }
  // tapping the "pay" tag or a friend who's waiting to pay also sends Miw to the register
  const rl = regLabel.getBoundingClientRect(), onTag = e.clientX >= rl.left && e.clientX <= rl.right && e.clientY >= rl.top && e.clientY <= rl.bottom;
  const headDist = c => { const v = c.actor.root.position.clone(); v.y += 1.0; v.project(camera); return Math.hypot((v.x + 1) / 2 * innerWidth - e.clientX, (1 - v.y) / 2 * innerHeight - e.clientY); };
  const dPay = Math.min(1e9, ...payQueue.filter(c => c.state === 'pay').map(headDist));
  const dSeat = Math.min(1e9, ...customers.filter(c => c.t && c.t.customer === c && ['think', 'wait', 'eat'].includes(c.state)).map(headDist));
  if ((onTag || (dPay < 46 && dPay <= dSeat)) && queue.length < QUEUE_MAX) return enqueue({ kind: 'register', at: REG.back });
  if (queue.length >= QUEUE_MAX) return toast('One thing at a time! 🙈');
  if (hit) {
    const d = hit.object.userData;
    if (d.kind === 'field') return enqueue({ kind: 'field', at: FIELD_SPOT });
    if (d.kind === 'station' && !unlocked(d.st.id, game.day)) return toast(game.day >= DESSERTS[d.st.id].day ? `Buy the ${DESSERTS[d.st.id].name} recipe in the shop after closing 🛒` : `${DESSERTS[d.st.id].name} opens on day ${DESSERTS[d.st.id].day}`);
    if (d.kind === 'station' && !stockOf(d.st.id)) return soldOutTap(d.st.id);
    if (d.kind === 'table') return tapTable(d.t);
    return enqueue(d.kind === 'station' ? { kind: 'station', st: d.st, at: d.st.pick } : { kind: 'register', at: REG.back });
  }
  const pk = ray.ray.intersectPlane(kitchenFloor, new THREE.Vector3());
  if (pk && pk.z < -5.1 && pk.z > -5.9 && Math.abs(pk.x) < 6.2) return enqueue({ kind: 'walk', at: new THREE.Vector3(pk.x, 0.5, pk.z) });   // the kitchen floor
  const p = ray.ray.intersectPlane(ground, new THREE.Vector3());
  if (p && Math.abs(p.x) < 7.4 && p.z > COUNTER_Z + 0.9 && p.z < 4.3) enqueue({ kind: 'walk', at: p });
}
// looking around: drag to turn the café (sideways) or tip the view (up and down), wheel or pinch to zoom; a plain tap still sends Miw
const touches = new Map(); let press = null, pinchFrom = 0;
const clampTo = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
function moveCamera(dyaw, dtilt, zoomBy) {
  CAM.yaw += dyaw; CAM.tilt = clampTo(CAM.tilt + dtilt, CAM_LIMITS.tilt); CAM.zoom = clampTo(CAM.zoom * zoomBy, CAM_LIMITS.zoom);
  placeCamera(); if (typeof homeCamMoved === 'function') homeCamMoved();
}
const dom = renderer.domElement, pinchSpan = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
dom.style.touchAction = 'none';
dom.addEventListener('pointerdown', e => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { dom.setPointerCapture(e.pointerId); } catch {}
  if (touches.size === 1) press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  else { press = null; pinchFrom = pinchSpan(); }
});
dom.addEventListener('pointermove', e => {
  const t = touches.get(e.pointerId); if (!t) return;
  const dx = e.clientX - t.x, dy = e.clientY - t.y; t.x = e.clientX; t.y = e.clientY;
  if (touches.size >= 2) { const s = pinchSpan(); if (pinchFrom) moveCamera(0, 0, pinchFrom / s); pinchFrom = s; return; }
  if (!press || press.id !== e.pointerId) return;
  if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) press.moved = true;
  if (press.moved) moveCamera(-dx * 0.006, dy * 0.004, 1);
});
const endPress = e => {
  touches.delete(e.pointerId);
  if (press && press.id === e.pointerId) { const tap = !press.moved && e.type === 'pointerup'; press = null; if (tap) tapScene(e); }
  if (touches.size < 2) pinchFrom = 0;
};
dom.addEventListener('pointerup', endPress); dom.addEventListener('pointercancel', endPress);
dom.addEventListener('wheel', e => { e.preventDefault(); moveCamera(0, 0, Math.exp(e.deltaY * 0.0012)); }, { passive: false });
const resetCamera = () => { CAM.yaw = 0; CAM.tilt = 0; CAM.zoom = 1; placeCamera(); if (typeof homeCamMoved === 'function') homeCamMoved(); };
document.querySelectorAll('#camctl button').forEach(b => b.onclick = () => {
  const k = b.dataset.cam;
  if (k === 'left') moveCamera(-0.3, 0, 1); else if (k === 'right') moveCamera(0.3, 0, 1); else if (k === 'in') moveCamera(0, 0, 0.8); else if (k === 'out') moveCamera(0, 0, 1.25); else resetCamera();
});
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea,select') || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (k === 'q' || k === 'arrowleft') moveCamera(-0.15, 0, 1); else if (k === 'e' || k === 'arrowright') moveCamera(0.15, 0, 1); else if (k === '=' || k === '+') moveCamera(0, 0, 0.9); else if (k === '-') moveCamera(0, 0, 1.1); else if (k === '0') resetCamera();
});
// one tap on a table: Miw fetches whatever that friend ordered that isn't on the tray yet, then serves them
function tapTable(t) {
  const c = t.customer;
  if (c && c.state === 'think') return toast('Still deciding… 💭');
  if (c && c.state === 'wait') return autoServe(t);
  enqueue({ kind: 'table', t, at: t.serve });
}
// what the tray will hold once everything already queued has happened
function trayAfterQueue() {
  const v = hands.slice();
  queue.forEach(a => {
    if (a.kind === 'station') v.push(a.st.id);
    else if (a.kind === 'table' && a.t.customer) a.t.customer.order.forEach((id, i) => { if (!a.t.customer.served[i]) { const k = v.indexOf(id); if (k >= 0) v.splice(k, 1); } });
  });
  return v;
}
function autoServe(t) {
  const c = t.customer, v = trayAfterQueue(), free = HAND_MAX - v.length;
  const fetch = [];
  c.order.forEach((id, i) => { if (c.served[i]) return; const k = v.indexOf(id); if (k >= 0) v.splice(k, 1); else fetch.push(id); });
  if (fetch.length > free) fetch.length = Math.max(0, free);   // the rest on the next trip
  const reserved = {}, missing = [], covered = [];
  for (const id of fetch) {
    const pending = queue.filter(a => a.kind === 'station' && a.st.id === id).length + (reserved[id] || 0) + 1;
    if (stockOf(id) < pending) { if (!missing.includes(id)) missing.push(id); } else { reserved[id] = (reserved[id] || 0) + 1; covered.push(id); }
  }
  if (missing.length) toast(`${missing.map(id => DESSERTS[id].name).join(' + ')} sold out! Tap its plate twice to bake more 🍳`);
  fetch.length = 0; fetch.push(...covered);
  if (missing.length && !fetch.length && !c.order.some((id, i) => !c.served[i] && trayAfterQueue().includes(id))) return;   // nothing she can bring right now
  if (queue.length + fetch.length + 1 > QUEUE_MAX) return toast('One thing at a time! 🙈');
  if (!fetch.length && !c.order.some((id, i) => !c.served[i] && trayAfterQueue().includes(id))) return toast('Tray is full! Serve someone first 🙌');
  fetch.forEach(id => { const st = STATIONS.find(q => q.id === id); enqueue({ kind: 'station', st, at: st.pick }); });
  enqueue({ kind: 'table', t, at: t.serve, auto: true });
}
// the cashier shortcut: a big button for when friends queue at the register and the counter is hard to tap. Miw drops what she was doing and goes straight there.
function goCashier() {
  wakeAudio();
  if (!game.running || game.paused || menuOpen || pay.c) return;
  if (!payQueue.some(c => c.state === 'pay')) { toast('Nobody is waiting to pay yet 💤'); sfx.nope(); return; }
  if (queue[0] && queue[0].kind === 'register') return;
  miw.target = miw.path = miw.onArrive = null;
  const act = { kind: 'register', at: REG.back }; act.mark = label('mark', ''); queue.unshift(act); numberQueue(); sfx.tap();
}
$('cashBtn').onclick = goCashier;
function enqueue(act) {
  act.mark = label('mark', '');
  queue.push(act); numberQueue(); sfx.tap();
}
function numberQueue() { queue.forEach((a, i) => { a.mark.textContent = i + 1; }); }
function nextAction(dt) {
  if (miwPause > 0) { miwPause -= dt; return; }
  if (miw.target || !queue.length) return;
  const act = queue[0];
  walkTo(miw, act.at, () => {
    queue.shift(); act.mark.remove(); numberQueue();
    if (act.kind === 'station') {
      miw.face = act.st.face ?? PI;
      if (hands.length >= HAND_MAX) { toast('Tray is full! Serve something first 🙌'); sfx.nope(); }
      else if (!stockOf(act.st.id)) { toast(`${DESSERTS[act.st.id].name} ran out! Tap its plate twice to bake more 🍳`); sfx.nope(); }
      else if (DESSERTS[act.st.id].drink && typeof openDrink === 'function') { sfx.tap(); openCase(act.st); openDrink(act.st.id, () => { hands.push(act.st.id); renderHands(); updatePlates(); sfx.pick(); }); }   // a drink is made first: pour it, drop things in, shake it
      else { if (!DESSERTS[act.st.id].drink) kitchen.stock[act.st.id]--; hands.push(act.st.id); openCase(act.st); renderHands(); updatePlates(); sfx.pick(); miwPause = 0.15;
        if (!stockOf(act.st.id)) toast(`${DESSERTS[act.st.id].name} just sold out! Tap its plate twice to bake more 🍳`); }
    } else if (act.kind === 'table') {
      miw.face = Math.atan2(act.t.g.position.x + 0.2 - miw.root.position.x, act.t.g.position.z - miw.root.position.z);
      const cust = act.t.customer, before = cust ? cust.served.filter(Boolean).length : 0;
      serve(act.t);
      miwPause = 0.15;
      // a big order takes more than one trip: carry on with what's still missing
      if (act.auto && cust && cust.state === 'wait' && cust.served.filter(Boolean).length > before) autoServe(act.t);
    } else if (act.kind === 'field') {
      miw.face = PI / 2; harvest(4); miwPause = 0.3;
    } else if (act.kind === 'dish') {
      miw.face = Math.atan2(act.t.g.position.x - miw.root.position.x, act.t.g.position.z - miw.root.position.z); dishCollect(act.t); miwPause = 0.3;
    } else if (act.kind === 'wash') {
      dishWashStart();
    } else if (act.kind === 'register') {
      miw.face = 0; openPay();   // facing the customer across the counter
    }
  });
}

// customers
function spawn() {
  const free = openTables().filter(t => !t.customer && !t.dirtyN);   // a table with dirty plates on it is not ready for the next friend
  if (!free.length) return;
  const t = free[Math.random() * free.length | 0];
  const kinds = Object.keys(SPECIES), species = kinds[Math.random() * kinds.length | 0], sp = SPECIES[species];
  // only promise what can really be served: the shelf plus the tray, minus what friends already ordered and haven't been given
  const all = dessertIds().filter(id => onCounter(id)), avail = {};
  all.forEach(id => { avail[id] = stockOf(id) + hands.filter(h => h === id).length; });
  customers.forEach(c => { if (['in', 'think', 'wait'].includes(c.state)) c.order.forEach((id, i) => { if (!c.served[i] && avail[id] !== undefined) avail[id]--; }); });
  if (typeof staff !== 'undefined') staff.forEach(s => s.tray.forEach(id => { if (avail[id] !== undefined) avail[id]++; }));   // what the waiters are carrying is already taken off the shelf
  const have = () => all.filter(id => avail[id] > 0);
  if (!have().length) {   // nothing left to promise: they wait outside until there is, and the player is told
    if (performance.now() - (spawn.warnedAt || -1e9) > 12000) { spawn.warnedAt = performance.now(); toast('🍰 Nothing left to sell! Tap a sold-out plate twice to bake more'); }
    return;
  }
  const pick = () => { const s = have(); if (!s.length) return null; const id = s.includes(sp.fav) && Math.random() < 0.45 ? sp.fav : s[Math.random() * s.length | 0]; avail[id]--; return id; };
  const two = sp.two || (game.day >= 2 && Math.random() < 0.12 + game.day * 0.04);
  const order = [pick()];
  if (two) { const second = pick(); if (second) order.push(second); }
  const drinks = Object.keys(DESSERTS).filter(id => DESSERTS[id].drink && unlocked(id, game.day));
  if (drinks.length && Math.random() < 0.45 + game.day * 0.05) order.push(drinks[Math.random() * drinks.length | 0]);   // and a drink to go with it
  const patience = Math.max(26, 38 - (game.day - 1) * 0.8) * sp.patience * decorPerk('patience') * (order.length > 1 ? 1.3 : 1);
  const c = { species, t, order, served: order.map(() => false), state: 'in', patience, max: patience, timer: 0, actor: makeActor(species, sp.color) };
  c.actor.root.position.copy(GATE); c.actor.grow = 0.001; c.actor.speed = 2.6;
  c.bubble = label('bub think', '');
  c.bubble.style.display = 'none';
  t.customer = c;
  customers.push(c);
  walkTo(c.actor, t.seat, () => { c.state = 'think'; c.timer = 0.9; c.actor.face = -PI / 2; c.actor.root.position.y = 0.52; c.actor.seated = true; c.bubble.style.display = ''; c.bubble.textContent = '💭'; sfx.bell(); });
}
function drawBubble(c) {
  const p = c.patience / c.max, col = p > 0.5 ? '#6cc47a' : p > 0.25 ? '#f2b64a' : '#ef5f7e';
  c.bubble.className = 'bub' + (p < 0.25 ? ' shake' : '');
  c.bubble.innerHTML = `<i class="ring" style="--p:${p.toFixed(3)};--c:${col}"></i>` +
    c.order.map((id, i) => `<span class="it${c.served[i] ? ' done' : ''}">${icon(id)}${id === SPECIES[c.species].fav ? '<span class="fav">💗</span>' : ''}</span>`).join('');
}
function serve(t, tray = hands) {   // tray: Miw's hands, or a waiter's tray
  const c = t.customer;
  if (!c || c.state !== 'wait') return;
  let gave = false;
  let noPlate = false;
  c.order.forEach((id, i) => {
    if (c.served[i]) return;
    const k = tray.indexOf(id);
    if (k < 0) return;
    if (!DESSERTS[id].drink && dish.plates <= 0) { noPlate = true; return; }   // every dessert goes on a clean plate
    tray.splice(k, 1); c.served[i] = gave = true; if (!DESSERTS[id].drink) { dish.plates--; showRack(); }
    const m = dessertModel(id); m.scale.setScalar(0.85);
    m.position.set(t.g.position.x + 0.25 - i * 0.45, 1.09, t.g.position.z + (i ? 0.3 : 0));
    scene.add(m); t.food.push(m);
  });
  if (!gave) { if (tray !== hands) return; if (noPlate) { toast('No clean plates! Tap 🍽 Dishes to call the bunny'); sfx.nope(); return; } toast(`${EMOJI[c.species]} wants ${c.order.filter((_, i) => !c.served[i]).map(id => DESSERTS[id].name).join(' + ')}`); sfx.nope(); return; }
  if (tray === hands) renderHands();
  drawBubble(c); sfx.serve();
  if (!c.served.every(Boolean)) return;
  // paid in full: the dessert's price, a tip for being quick, more for a favorite or a bear, and a combo bonus
  const sp = SPECIES[c.species], base = c.order.reduce((s, id) => s + priceOf(id), 0);
  const fav = c.order.includes(sp.fav);
  let tip = Math.round(base * 0.6 * (c.patience / c.max) * sp.tip * decorPerk('tip') * (fav ? 1.5 : 1));
  game.combo++;
  const bonus = Math.min(game.combo - 1, 5) * 2;
  // they pay the bill at the register with a note or two; tips and the combo bonus come with a correct change
  c.bill = base; c.tip = tip; c.bonus = bonus; c.fav = fav;
  c.items = c.order.map(id => ({ id, price: priceOf(id) }));
  // some pay by QR (from day 2), some with the exact money, most with a note you give change for (a red 100 from day 3)
  const r = Math.random();
  c.kind = game.day >= 2 && r < 0.2 ? 'qr' : r < 0.35 ? 'exact' : 'cash';
  c.cash = c.kind !== 'cash' ? base : base <= 20 ? (Math.random() < 0.4 ? 50 : 20) : base <= 50 ? (game.day >= 3 && Math.random() < 0.3 ? 100 : 50) : 100;
  if (fav) setTimeout(() => popup(c.actor.root.position, '💗 favorite!'), 350);
  showCombo();
  c.state = 'eat'; c.timer = 2.4; c.actor.hop = true; c.actor.shake = false;
  c.bubble.className = 'bub think'; c.bubble.textContent = '😋';
}
// when they've eaten they get up, free the table, and queue at the register
function toRegister(c) {
  c.t.food.forEach(m => scene.remove(m)); c.t.food = []; c.t.customer = null; dirtyTable(c.t, c.order.filter(id => !DESSERTS[id].drink).length);   // the plates stay on the table
  c.actor.root.position.y = 0; c.actor.hop = false; c.actor.seated = false;
  c.state = 'walkpay'; c.payMax = c.payLeft = Math.max(24, 34 - (game.day - 1) * 0.8);
  payQueue.push(c); repackQueue();
}
function repackQueue() {
  payQueue.forEach((c, i) => {
    const p = REG.q(i);
    if (c.qdest && c.qdest.distanceTo(p) < 0.01) return;
    c.qdest = p;
    walkTo(c.actor, p, () => { c.actor.face = PI; if (c.state === 'walkpay') { c.state = 'pay'; sfx.bell(); } });
  });
}
function drawPayBubble(c) {
  const p = Math.max(0, c.payLeft / c.payMax), col = p > 0.5 ? '#6cc47a' : p > 0.25 ? '#f2b64a' : '#ef5f7e';
  c.bubble.style.display = '';
  c.bubble.className = 'bub' + (p < 0.25 ? ' shake' : '');
  c.bubble.innerHTML = `<i class="ring" style="--p:${p.toFixed(3)};--c:${col}"></i><span class="it">${c.kind === 'qr' ? '📱' : '💵'}</span><b style="font:600 15px 'Fredoka'">${c.bill}</b>`;
}
// the checkout card is a little calculator: the LCD shows the bill and what they handed over, you key in the change and press Enter
function openPay() {
  const c = payQueue.find(q => q.state === 'pay');
  if (!c) { toast('Nobody is waiting to pay yet 💤'); sfx.nope(); return; }
  pay.c = c; pay.entry = ''; pay.give = 0; pay.tries = 0; c.state = 'paying';
  const needs = c.kind === 'cash' && c.cash > c.bill;
  $('lBill').textContent = c.bill;
  $('lWho').textContent = c.kind === 'qr' ? 'Paid by QR' : 'Customer paid'; $('lPaid').textContent = c.kind === 'qr' ? '📱' : c.cash;
  $('payItems').innerHTML = c.items.map(i => `<div class="pitem"><i>${icon(i.id)}</i><span>${DESSERTS[i.id].name}</span><b class="lcdb">${i.price}</b></div>`).join('<div class="pplus">+</div>');
  $('payKeys').hidden = $('lInRow').hidden = !needs; $('payHead').textContent = needs ? 'Give the change' : c.kind === 'qr' ? 'QR payment' : 'Exact money';
  $('payMsg').textContent = needs ? `Paid ${c.cash} − bill ${c.bill}: key in the change` : c.kind === 'qr' ? 'Scan their code!' : 'Exact money, nothing to give back';
  $('payOk').textContent = needs ? 'OK' : c.kind === 'qr' ? 'Scan ✓' : 'Take ✓';
  showEntry(); $('pay').hidden = false;
}
function showEntry() { pay.give = +pay.entry || 0; $('lIn').textContent = pay.entry || '0'; }
function pressKey(k) {
  if (!pay.c || $('payKeys').hidden) return;
  if (k === 'C') pay.entry = ''; else if (k === 'B') pay.entry = pay.entry.slice(0, -1);
  else if (pay.entry.length < 3) pay.entry = pay.entry === '0' ? k : pay.entry + k;
  showEntry(); tone(k === 'C' || k === 'B' ? 360 : 520 + (+k) * 55, 0, 0.05, 'square', 0.035);
}
function closePay() { if (pay.c && pay.c.state === 'paying') pay.c.state = 'pay'; pay.c = null; $('pay').hidden = true; }
function finishPay() {
  const c = pay.c; if (!c) return;
  const diff = pay.give - (c.cash - c.bill), at = c.actor.root.position;
  if (diff !== 0 && pay.tries === 0) {   // they spot it: one chance to put it right
    pay.tries = 1; $('payMsg').textContent = diff < 0 ? `Not enough! Short by ${-diff} 🙅` : `Too much! ${diff} too many 🙅`;
    pay.entry = ''; showEntry();
    $('pay').classList.remove('shake'); void $('pay').offsetWidth; $('pay').classList.add('shake'); sfx.nope(); return;
  }
  const retried = pay.tries > 0; pay.c = null; $('pay').hidden = true;
  let payout;
  if (diff === 0) {
    // right first time: the bill, the tip, the combo bonus, and a bonus for being quick; after a fix-up: the bill and the tip
    const fast = retried ? 0 : Math.round(c.payLeft / c.payMax * 4);
    payout = c.bill + c.tip + (retried ? 0 : c.bonus + fast);
    popup(at, `+${payout} 🪙`); setTimeout(() => popup(at, retried ? 'Thanks 🙂' : fast >= 3 ? 'So fast! 💗' : 'Thank you! 💗'), 350); sfx.coin();
  } else {
    payout = Math.max(0, c.bill - Math.abs(diff)); game.combo = 0; showCombo();
    popup(at, diff < 0 ? `Short by ${-diff}! +${payout}` : `Too much! -${diff} · +${payout}`, true); sfx.sad();
  }
  game.coins += payout; game.served++;
  leave(c, true);
}
document.querySelectorAll('#pay .keys button').forEach(b => b.onclick = () => pressKey(b.dataset.k));
addEventListener('keydown', e => {
  if ($('pay').hidden || !pay.c || menuOpen || document.body.classList.contains('homing')) return;
  if (/^\d$/.test(e.key)) pressKey(e.key); else if (e.key === 'Backspace') pressKey('B'); else if (e.key === 'Enter') finishPay(); else return;
  e.preventDefault();
});
$('payOk').onclick = finishPay;
$('payX').onclick = closePay;
function leave(c, happy, why) {
  c.state = 'out'; c.claim = null; c.actor.hop = c.actor.shake = false;
  c.bubble.remove();
  c.actor.root.position.y = 0; c.actor.seated = false;
  if (c.t.customer === c) { const eaten = c.order.filter((id, i) => c.served[i] && !DESSERTS[id].drink).length; c.t.food.forEach(m => scene.remove(m)); c.t.food = []; c.t.customer = null; if (eaten) dirtyTable(c.t, eaten); }
  const qi = payQueue.indexOf(c); if (qi >= 0) { payQueue.splice(qi, 1); repackQueue(); }
  if (pay.c === c) { pay.c = null; $('pay').hidden = true; }
  if (!happy) {
    game.missed++; game.combo = 0; showCombo();
    popup(c.actor.root.position, why || '💢 too slow…', true); sfx.sad();
  }
  walkTo(c.actor, GATE, () => { c.state = 'gone'; });
}
function stepCustomers(dt) {
  customers.forEach(c => {
    const a = c.actor;
    // pop in at the gate, shrink away when leaving through it
    a.grow = c.state === 'gone' ? Math.max(0, a.grow - dt * 4) : Math.min(1, a.grow + dt * 3);
    a.root.scale.setScalar(Math.max(0.001, a.grow));
    stepActor(a, dt);
    if (c.state === 'think' && (c.timer -= dt) <= 0) { c.state = 'wait'; drawBubble(c); }
    else if (c.state === 'wait') {
      c.patience -= dt;
      a.shake = c.patience / c.max < 0.25;
      if (c.patience <= 0) leave(c, false); else drawBubble(c);
    } else if (c.state === 'eat' && (c.timer -= dt) <= 0) toRegister(c);
    else if (c.state === 'walkpay' || c.state === 'pay' || c.state === 'paying') {
      c.payLeft -= dt; a.shake = c.payLeft / c.payMax < 0.25;
      if (c.payLeft <= 0) leave(c, false, '💢 left without paying'); else drawPayBubble(c);
    }
  });
  customers = customers.filter(c => {
    if (c.state === 'gone' && c.actor.grow <= 0) { removeActor(c.actor); return false; }
    return true;
  });
}

// ---------- labels over the scene ----------
function label(cls, html) {
  const el = document.createElement('div');
  el.className = cls; el.innerHTML = html;
  $('labels').appendChild(el);
  return el;
}
const v3 = new THREE.Vector3();
function put(el, p, dy = 0, dx = 0) {
  v3.copy(p); v3.y += dy; v3.project(camera);
  el.style.transform = `translate(${(v3.x + 1) / 2 * innerWidth + dx}px,${(1 - v3.y) / 2 * innerHeight}px) translate(-50%,-100%)`;
}
function popup(p, text, sad) {
  const el = label('pop' + (sad ? ' sad' : ''), text);
  put(el, p, 2.4);
  setTimeout(() => el.remove(), 1300);
}
function placeLabels() {
  const waiting = payQueue.filter(c => c.state === 'pay' || c.state === 'paying').length;
  regLabel.innerHTML = waiting ? `💰 pay ×${waiting}` : '💰 cashier'; regLabel.classList.toggle('call', waiting > 0);
  customers.forEach(c => c.bubble.isConnected && put(c.bubble, c.actor.root.position, 2.25));
  const seen = new Map();
  queue.forEach(a => {
    const p = a.kind === 'station' ? tmp.set(a.st.x, a.st.my ?? 2.7, a.st.mz ?? COUNTER_Z) : a.kind === 'field' ? tmp.set(9, 1.0, -0.5) : a.kind === 'register' ? tmp.set(REG.x, 2.0, COUNTER_Z) : a.kind === 'table' ? tmp.copy(a.t.g.position).setY(1.3) : tmp.copy(a.at).setY(0.1);
    const key = a.kind === 'station' ? a.st.id : a.kind === 'field' ? 'field' : a.kind === 'register' ? 'reg' : a.kind === 'table' ? TABLES.indexOf(a.t) : a.mark;
    const n = seen.get(key) || 0; seen.set(key, n + 1);
    put(a.mark, p, 0, n * 24);
  });
}
let toastTimer = 0;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}
function showCombo() {
  const el = $('combo');
  el.classList.toggle('on', game.combo >= 2);
  if (game.combo >= 2) { el.textContent = `🔥 Combo ×${game.combo}`; el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; }
}

// ---------- sound: a few soft blips made on the spot ----------
let ac = null;
function wakeAudio() { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} ac && ac.state === 'suspended' && ac.resume(); startMusic(); }
// a tab nobody is looking at goes quiet (a second, forgotten tab used to keep playing the music)
document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else ac.resume(); });
// background music: a calm loop ("Slow Stride" by isaiah658, CC0), played through the same audio context so it loops without a gap
const MUSIC_GAIN = 0.3, music = { buf: null, src: null, gain: null, loading: false, failed: false };
const musicLevel = () => settings.muted || !settings.music ? 0 : settings.vol * MUSIC_GAIN;
function setMusicLevel(fade = 0.3) { if (music.gain) { const g = music.gain.gain, t = ac.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(musicLevel(), t + fade); } }
async function startMusic() {
  if (!ac || music.src || music.loading || music.failed) return;
  if (!music.buf) {
    music.loading = true;
    try {
      const file = document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'mp3';   // Safari doesn't play .ogg
      music.buf = await ac.decodeAudioData(await (await fetch(`music/slow-stride.${file}${window.BUILD_V || ''}`)).arrayBuffer());
    } catch (e) { console.warn('the music did not load', e); music.loading = false; music.failed = true; return; }   // tried once; a missing file isn't fetched again on every tap
    music.loading = false;
  }
  if (music.src) return;
  music.gain = ac.createGain(); music.gain.gain.value = 0; music.gain.connect(ac.destination);
  music.src = ac.createBufferSource(); music.src.buffer = music.buf; music.src.loop = true; music.src.connect(music.gain); music.src.start();
  setMusicLevel(2);
}
function tone(f, at = 0, dur = 0.12, type = 'sine', vol = 0.12) {
  if (!ac || settings.muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * settings.vol), t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  tap: () => tone(880, 0, 0.05, 'triangle', 0.05),
  pick: () => { tone(660, 0, 0.08, 'triangle'); tone(990, 0.06, 0.1, 'triangle'); },
  toss: () => tone(330, 0, 0.1, 'triangle', 0.08),
  serve: () => { tone(784, 0, 0.1); tone(1047, 0.08, 0.14); },
  coin: () => { tone(1319, 0, 0.08, 'square', 0.04); tone(1760, 0.07, 0.16, 'square', 0.04); },
  nope: () => tone(180, 0, 0.14, 'square', 0.04),
  sad: () => { tone(392, 0, 0.18); tone(294, 0.16, 0.3); },
  bell: () => tone(1568, 0, 0.25, 'sine', 0.05),
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle', 0.1)),
};
$('mute').onclick = () => { settings.muted = !settings.muted; storeSettings(); $('mute').textContent = settings.muted ? '🔇' : '🔊'; setMusicLevel(); };
$('mute').textContent = settings.muted ? '🔇' : '🔊';

