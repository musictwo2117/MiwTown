const $ = id => document.getElementById(id);
const PI = Math.PI;

// ---------- the menu and the friends who come to eat ----------
const DESSERTS = {
  cheesecake:   { name: 'Strawberry Cheesecake', emoji: '🍰', price: 10, day: 1, color: '#f48fa8' },
  donut:        { name: 'Strawberry Donut',      emoji: '🍩', price: 8,  day: 1, color: '#f6a5bd' },
  kittycupcake: { name: 'Kitty Cupcake',         emoji: '🧁', price: 12, day: 2, color: '#ffd1a6' },
  pretzelcake:  { name: 'Pretzel Cake',          emoji: '🥨', price: 14, day: 3, color: '#eda95e' },
  // drinks: made at the juice bar, never baked, so they don't run out
  milktea:      { name: 'Pink Milk Tea',         emoji: '🧋', price: 6,  day: 1, color: '#f6b8c8', drink: true },
  cocoa:        { name: 'Marshmallow Cocoa',     emoji: '☕', price: 7,  day: 2, color: '#a8664a', drink: true },
  lemonade:     { name: 'Lemon Soda',            emoji: '🍋', price: 6,  day: 3, color: '#fff3a8', drink: true },
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
const unlocked = (id, d) => DESSERTS[id].day <= d;

// ---------- saved progress (this browser only) ----------
const SAVE_KEY = 'miw-cheesecake-rush';
const SLOT_KEY = n => `${SAVE_KEY}-slot-${n}`, SET_KEY = `${SAVE_KEY}-settings`;
const defaultSave = () => ({ day: 1, best: 0, total: 0 });
let save = defaultSave(), slot = 0, menuOpen = false;   // the slot is picked on the home screen (home.js)
let settings = { muted: false, vol: 0.8, fancy: true, cam: 'low' };
try { settings = { ...settings, ...JSON.parse(localStorage.getItem(SET_KEY) || '{}') }; } catch {}
const storeSettings = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch {} };
// the current slot keeps the progress and what's left on the shelves
const SAVE_VERSION = 1;   // bump when the save's shape changes, and upgrade older saves (no v = version 0) where they are loaded
const store = () => { if (!slot) return; try { localStorage.setItem(SLOT_KEY(slot), JSON.stringify({ ...save, v: SAVE_VERSION, stock: kitchen.stock, qual: kitchen.qual, berries: kitchen.berries, ripe: plot.ready, updated: Date.now() })); } catch {} };

// ---------- renderer / camera / lights ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$('scene').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 300);
// a low, close-ish angle so the friends' faces show; the width always fits the whole café
const CAM = { fov: 30, el: 34 * PI / 180, d: 37, at: new THREE.Vector3(0, 0.5, 0.6) };
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  let d = CAM.d; const visH = 2 * d * Math.tan(CAM.fov * PI / 360);
  d *= Math.max(1, 19 / (visH * a));
  camera.fov = CAM.fov; camera.aspect = a;
  camera.position.set(CAM.at.x, CAM.at.y + d * Math.sin(CAM.el), CAM.at.z + d * Math.cos(CAM.el));
  camera.lookAt(CAM.at); camera.updateProjectionMatrix();
  scene.fog = new THREE.Fog(0xcfe6f7, d * 0.85, d * 1.9);   // a little haze into the distance
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
  inst(new THREE.PlaneGeometry(0.95, 0.75).translate(0, 0.37, 0), new THREE.MeshLambertMaterial({ map: tuftTex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide }), tufts);

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
const arch = mesh(new THREE.TorusGeometry(1.2, 0.09, 8, 28, PI), '#ff9fbf', { x: GATE.x, y: 2.2, z: GATE.z, ry: -PI / 4 });
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
  st.stand = new THREE.Group(); st.stand.position.set(x, 1.19, COUNTER_Z + 0.05); scene.add(st.stand);
  st.stand.add(mesh(cyl(0.55, 0.5, 0.06, 28), '#ffffff', { y: 0.32 }), mesh(cyl(0.08, 0.2, 0.3, 12), '#ffffff', { y: 0.15 }));
  st.show = new THREE.Group(); st.show.position.y = 0.35; st.show.scale.setScalar(1.55); st.stand.add(st.show);
  st.label = label('plate', '');
  st.hit = hitBox(2.4, 3, 2.4, new THREE.Vector3(x, 1.3, COUNTER_Z + 0.4), { kind: 'station', st });
  return st;
});
function dressStations() {
  STATIONS.forEach(st => {
    const open = unlocked(st.id, game.day), d = DESSERTS[st.id];
    st.show.clear();
    if (open) st.show.add(dessertModel(st.id));
  });
  updatePlates();
}
function updatePlates() {
  STATIONS.forEach(st => {
    const open = unlocked(st.id, game.day), d = DESSERTS[st.id], n = stockOf(st.id);
    st.label.className = 'plate' + (!open ? ' locked' : n ? '' : ' sold');
    st.label.innerHTML = !open ? `🔒 day ${d.day}` : n ? `${d.emoji} ${priceOf(st.id)}🪙${d.drink ? '' : ` ×${n}`}` : `${d.emoji} sold out`;
    st.label.title = open ? d.name : `Opens on day ${d.day}`;
  });
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
  if (a === miw) a.root.position.y = floorY(a.root.position.x, a.root.position.z);
  { const g = a.root.scale.x; a.blob.position.set(a.root.position.x, 0.06 + (a === miw ? a.root.position.y : 0), a.root.position.z); a.blob.scale.set(0.8 * g, 1, 0.8 * g); }
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
const nearTable = (x, z) => TABLES.some(t => t.g.visible && Math.hypot(x - t.g.position.x, z - t.g.position.z) < NAV.r);
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
function walkTo(a, p, cb) { const pts = a === miw ? miwRoute(a.root.position, p) : findPath(a.root.position, p); a.target = pts.shift(); a.path = pts; a.onArrive = cb; }

// Miw runs the shop and carries up to two desserts on a tray
const miw = makeActor('miw', '#ffd9c4');
miw.speed = 4.6;
const HOME = new THREE.Vector3(0, 0, -2.0);
miw.root.position.copy(HOME);
miw.tray = new THREE.Group(); miw.tray.position.set(0, 0.95, 0.5); miw.root.add(miw.tray);
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
renderer.domElement.addEventListener('pointerdown', e => {
  wakeAudio();
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
    if (d.kind === 'station' && !unlocked(d.st.id, game.day)) return toast(`${DESSERTS[d.st.id].name} opens on day ${DESSERTS[d.st.id].day}`);
    if (d.kind === 'station' && !stockOf(d.st.id)) {   // sold out: a second tap within a few seconds goes back to the kitchen to bake more
      if (soldOutArm.id === d.st.id && performance.now() < soldOutArm.until) { soldOutArm.id = null; return restock(d.st.id); }
      soldOutArm = { id: d.st.id, until: performance.now() + 4000 };
      return toast(`${DESSERTS[d.st.id].name} is sold out! Tap it again to bake more 🍳`);
    }
    if (d.kind === 'table') return tapTable(d.t);
    return enqueue(d.kind === 'station' ? { kind: 'station', st: d.st, at: d.st.pick } : { kind: 'register', at: REG.back });
  }
  const pk = ray.ray.intersectPlane(kitchenFloor, new THREE.Vector3());
  if (pk && pk.z < -5.1 && pk.z > -5.9 && Math.abs(pk.x) < 6.2) return enqueue({ kind: 'walk', at: new THREE.Vector3(pk.x, 0.5, pk.z) });   // the kitchen floor
  const p = ray.ray.intersectPlane(ground, new THREE.Vector3());
  if (p && Math.abs(p.x) < 7.4 && p.z > COUNTER_Z + 0.9 && p.z < 4.3) enqueue({ kind: 'walk', at: p });
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
      else { if (!DESSERTS[act.st.id].drink) kitchen.stock[act.st.id]--; hands.push(act.st.id); renderHands(); updatePlates(); sfx.pick(); miwPause = 0.15;
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
    } else if (act.kind === 'register') {
      miw.face = 0; openPay();   // facing the customer across the counter
    }
  });
}

// customers
function spawn() {
  const free = openTables().filter(t => !t.customer);
  if (!free.length) return;
  const t = free[Math.random() * free.length | 0];
  const kinds = Object.keys(SPECIES), species = kinds[Math.random() * kinds.length | 0], sp = SPECIES[species];
  // only promise what can really be served: the shelf plus the tray, minus what friends already ordered and haven't been given
  const all = Object.keys(DESSERTS).filter(id => unlocked(id, game.day) && !DESSERTS[id].drink), avail = {};
  all.forEach(id => { avail[id] = stockOf(id) + hands.filter(h => h === id).length; });
  customers.forEach(c => { if (['in', 'think', 'wait'].includes(c.state)) c.order.forEach((id, i) => { if (!c.served[i] && avail[id] !== undefined) avail[id]--; }); });
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
  const patience = Math.max(26, 38 - (game.day - 1) * 0.8) * sp.patience * (order.length > 1 ? 1.3 : 1);
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
function serve(t) {
  const c = t.customer;
  if (!c || c.state !== 'wait') return;
  let gave = false;
  c.order.forEach((id, i) => {
    if (c.served[i]) return;
    const k = hands.indexOf(id);
    if (k < 0) return;
    hands.splice(k, 1); c.served[i] = gave = true;
    const m = dessertModel(id); m.scale.setScalar(0.85);
    m.position.set(t.g.position.x + 0.25 - i * 0.45, 1.09, t.g.position.z + (i ? 0.3 : 0));
    scene.add(m); t.food.push(m);
  });
  if (!gave) { toast(`${EMOJI[c.species]} wants ${c.order.filter((_, i) => !c.served[i]).map(id => DESSERTS[id].name).join(' + ')}`); sfx.nope(); return; }
  renderHands(); drawBubble(c); sfx.serve();
  if (!c.served.every(Boolean)) return;
  // paid in full: the dessert's price, a tip for being quick, more for a favorite or a bear, and a combo bonus
  const sp = SPECIES[c.species], base = c.order.reduce((s, id) => s + priceOf(id), 0);
  const fav = c.order.includes(sp.fav);
  let tip = Math.round(base * 0.6 * (c.patience / c.max) * sp.tip * (fav ? 1.5 : 1));
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
  c.t.food.forEach(m => scene.remove(m)); c.t.food = []; c.t.customer = null;
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
  $('lWho').textContent = `${EMOJI[c.species]} ${c.kind === 'qr' ? 'QR' : 'PAID'}`; $('lPaid').textContent = c.kind === 'qr' ? '📱' : c.cash;
  $('payReceipt').textContent = c.items.map(i => `${DESSERTS[i.id].emoji}${i.price}`).join(' + ');
  $('payKeys').hidden = $('lInRow').hidden = !needs;
  $('payMsg').textContent = needs ? 'Key in the change' : c.kind === 'qr' ? 'Scan their code!' : 'Exact money, nothing to give back';
  $('payOk').textContent = needs ? 'Enter ✓' : c.kind === 'qr' ? 'Scan ✓' : 'Take ✓';
  document.querySelector('#pay .lcd').classList.remove('ok');
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
  c.state = 'out'; c.actor.hop = c.actor.shake = false;
  c.bubble.remove();
  c.actor.root.position.y = 0; c.actor.seated = false;
  if (c.t.customer === c) { c.t.food.forEach(m => scene.remove(m)); c.t.food = []; c.t.customer = null; }
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
  STATIONS.forEach(st => put(st.label, tmp.set(st.lx ?? st.x, 0.25, st.lz ?? COUNTER_Z + 0.62)));
  const waiting = payQueue.filter(c => c.state === 'pay' || c.state === 'paying').length;
  regLabel.innerHTML = waiting ? `💰 pay ×${waiting}` : '💰 cashier'; regLabel.classList.toggle('call', waiting > 0);
  put(regLabel, tmp.set(REG.x, 0.25, COUNTER_Z + 0.62));
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
function wakeAudio() { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} ac && ac.state === 'suspended' && ac.resume(); }
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
$('mute').onclick = () => { settings.muted = !settings.muted; storeSettings(); $('mute').textContent = settings.muted ? '🔇' : '🔊'; };
$('mute').textContent = settings.muted ? '🔇' : '🔊';

// ---------- the kitchen: bake the day's desserts before opening ----------
// each batch is stir → bake (stop the marker in the green) → decorate, and makes BATCH desserts;
// how well it was baked sets the price, and what's left over carries into the next day
const BATCH = 4, PREP_SECONDS = 120, RESTOCK_SECONDS = 80, STAR_MUL = [0.9, 1, 1.2];
// each recipe has its own steps; the ones not listed yet use the classic four. The new ones make six pieces.
const FLOW = { cheesecake: ['crush', 'press', 'add', 'stir', 'pour', 'bake', 'deco'], donut: ['add', 'stir', 'knead', 'roll', 'cut', 'fry', 'glaze', 'sprinkle'] };
const TIMED_BAKE = { cheesecake: true };   // these bake in a pan against a heat meter (burnt = ruined) instead of stopping a swinging marker
const YIELD = { cheesecake: 6, donut: 6 };
const flowOf = id => FLOW[id] || ['add', 'stir', 'bake', 'deco'];
const yieldOf = id => YIELD[id] || BATCH;
const yieldRange = () => { const ys = Object.keys(DESSERTS).filter(id => unlocked(id, game.day) && !DESSERTS[id].drink).map(yieldOf); const lo = Math.min(...ys), hi = Math.max(...ys); return lo === hi ? lo : `${lo}–${hi}`; };
const kitchen = { stock: {}, qual: {}, berries: 6, left: 0, step: null, run: null, msg: '', on: false };
const stockOf = id => DESSERTS[id].drink ? 99 : (kitchen.stock[id] || 0);
const priceOf = id => Math.round(DESSERTS[id].price * (kitchen.qual[id] || 1));
function resetKitchen() { kitchen.stock = {}; kitchen.qual = {}; kitchen.berries = 6; plot.ready = 8; setPlotView(); updateBerryHud(); }
function updateBerryHud() { const el = $('berry'); if (el) el.textContent = `🍓 ${kitchen.berries}`; }
const pickLabel = () => `🌱 Pick from the garden (${plot.ready} ripe)`;
// pick ripe strawberries off the plot (up to max); they go in the basket for baking
function harvest(max = 4, silent = false) {
  const n = Math.min(plot.ready, max);
  if (!n) { toast('No ripe strawberries yet… they grow back soon 🌱'); sfx.nope(); return 0; }
  plot.ready -= n; kitchen.berries += n; setPlotView(); updateBerryHud(); sfx.coin();
  if (!silent) popup(miw.root.position, `+${n} 🍓`);
  if ($('pickBtn')) $('pickBtn').textContent = pickLabel();
  return n;
}
function addBatch(id, stars) {
  const n = stockOf(id), y = yieldOf(id);
  kitchen.qual[id] = (n * (kitchen.qual[id] || 1) + y * STAR_MUL[stars - 1]) / (n + y);
  kitchen.stock[id] = n + y;
}
// what goes in the oven: a whole cake that is cut into four slices, or a tray of four
const WHOLE = { cheesecake: 'cheesefull', pretzelcake: 'pretzelfull' };
function batchModel(id) {
  if (WHOLE[id]) { const m = makeScenery(WHOLE[id]); if (m) return m.g; return dessertModel(id); }
  const g = new THREE.Group();
  g.add(mesh(box(1.7, 0.06, 0.62), '#ffe1ea', { y: 0.03, cast: false }));
  [-0.6, -0.2, 0.2, 0.6].forEach(x => { const m = dessertModel(id); m.scale.setScalar(0.62); m.position.set(x, 0.06, 0); g.add(m); });
  return g;
}

// the little 3D kitchen above the buttons: drop the ingredients into the bowl, stir it round with the pointer,
// bake it, then place the toppings on the cake wherever you tap
const kst = (() => {
  const W = 720, H = 520;   // drawn at twice the old size so the kitchen is easy to see and to touch
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(W, H);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.2;
  r.domElement.style.cssText = 'width:min(100%,calc(50vh * 720 / 520));aspect-ratio:720/520;height:auto;display:block;margin:0 auto;border-radius:18px;background:linear-gradient(#f6ecdd,#ebdcc6);touch-action:none;cursor:pointer';
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
  const glossM = {};   // one glossy material per color, so ceramic, steel, plates and icing catch the light
  const mesh = (geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s, cast = true, mat } = {}) => {
    const m = new THREE.Mesh(geo, mat || (glossM[color] = glossM[color] || new THREE.MeshPhongMaterial({ color, shininess: 40, specular: 0x3d3830 })));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    if (s) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
    m.castShadow = cast; m.receiveShadow = true;
    return m;
  };
  const GOALS = { crush: [[0.5, 3.2, 4.2], [0.5, 0.8, 0.2]], pan: [[0.5, 3.6, 3.7], [0.5, 0.6, 0.2]], dn: [[0.5, 3.5, 3.9], [0.5, 0.85, 0.25]], idle: [[0, 2.3, 5.4], [0, 1.0, 0]], mix: [[0.5, 2.9, 4.3], [0.5, 1.25, 0.3]], bake: [[0.6, 2.5, 5.3], [0.6, 0.95, 0.45]], deco: [[0.5, 3.0, 3.4], [0.5, 0.8, 0.2]] };
  const look = new THREE.Vector3(0, 1, 0); cam.position.set(0, 2.3, 5.4);
  const goalOf = k => GOALS[k === 'add' || k === 'stir' ? 'mix' : k === 'bake' || k === 'bake-out' ? 'bake' : k === 'deco' || k === 'done' ? 'deco' : k === 'crush' ? 'crush' : k === 'press' || k === 'pour' ? 'pan' : DN_MODES.includes(k) ? 'dn' : 'idle'];
  sc.add(new THREE.HemisphereLight(0xfff6ea, 0x8f7c66, 0.5));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.0); sun.position.set(-3.4, 6.5, 4.4); sc.add(sun);   // a window's light from the upper left
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4, bottom: -2.5, near: 1, far: 18 }); sun.target.position.set(0.5, 0.6, 0); sc.add(sun.target);
  const fillL = new THREE.DirectionalLight(0xdfe8ff, 0.28); fillL.position.set(4.5, 2.5, 3.5); sc.add(fillL);
  const woodTex = canvasTex(512, 128, (x, w, h) => {
    x.fillStyle = '#d6b588'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(${95 + rnd() * 40 | 0},${62 + rnd() * 28 | 0},${28 + rnd() * 14 | 0},${0.07 + rnd() * 0.13})`; x.lineWidth = 0.8 + rnd() * 2.2; const y = rnd() * h; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + rnd() * 8 - 4, w * 0.62, y + rnd() * 8 - 4, w, y + rnd() * 5 - 2.5); x.stroke(); }
  });
  const tileTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#d8d1c4'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let c = -1; c < 4; c++) { const ox = (r % 2) * 32, v = 236 + (rnd() * 12 | 0); x.fillStyle = `rgb(${v},${v - 2},${v - 8})`; x.fillRect(c * 64 + ox + 2, r * 32 + 2, 60, 28); }
  });
  tileTex.repeat.set(5, 3);
  sc.add(mesh(box(8, 0.5, 2.8), '#e8dccb', { y: 0.25, z: -0.2 }),
    mesh(box(8.2, 0.12, 3), '', { y: 0.54, z: -0.2, mat: new THREE.MeshPhongMaterial({ map: woodTex, shininess: 45, specular: 0x403a30 }) }),
    mesh(box(15, 6, 0.1), '', { x: 0.5, y: 3.4, z: -1.95, mat: new THREE.MeshPhongMaterial({ map: tileTex, shininess: 60, specular: 0x444444 }) }));
  const TOP = 0.6, BATTER = { cheesecake: '#fff0cf', donut: '#f1dfb9', kittycupcake: '#f4e1b6', pretzelcake: '#ecd5a3' };
  let mode = null, id = null, t = 0, modeT = 0, chef = null, hop = 0, nextDeco = null, stirV = 0, cakeTop = 0.8, insideModel = null;
  const parts = [], placed3d = [], tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  let insideBase = 1, frameN = 0;

  // the bowl and spoon
  const mixG = new THREE.Group(); mixG.position.set(0.5, TOP, 0.2); sc.add(mixG);
  const bowlPts = [[0.001, 0], [0.6, 0], [0.64, 0.04], [0.9, 0.8], [0.9, 0.84], [0.85, 0.84], [0.84, 0.8], [0.56, 0.1], [0.001, 0.1]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowlM = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 56), new THREE.MeshPhongMaterial({ color: '#79afc8', shininess: 55, specular: 0x4a5a63, side: THREE.DoubleSide }));
  bowlM.castShadow = bowlM.receiveShadow = true; mixG.add(bowlM);   // hollow, so you can see how much batter is in it
  // the batter is a shallow glossy dome (many small triangles) so it can ripple, swirl and dip where the spoon goes
  const batterGeo = (() => {
    const R = 0.8 / Math.sin(0.5), g = new THREE.SphereGeometry(R, 56, 20, 0, PI * 2, 0, 0.5);
    g.translate(0, -R * Math.cos(0.5), 0); g.scale(1, 0.16, 1);   // rim at 0, a gentle crown in the middle
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
    return g;
  })();
  const batterBase = batterGeo.attributes.position.array.slice();
  const batter = new THREE.Mesh(batterGeo, new THREE.MeshPhongMaterial({ color: '#f1d996', shininess: 70, specular: new THREE.Color(0x888888), vertexColors: true }));
  batter.position.y = 0.2; mixG.add(batter);   // it sits low in the bowl and rises as things go in
  const rim = mesh(new THREE.TorusGeometry(0.8, 0.03, 8, 56), '#fff6dc', { rx: PI / 2, y: 0.817, cast: false }); mixG.add(rim);   // batter climbing the bowl wall
  let fill = 0, fillT = 0, batchTok = 0;   // how full the bowl is, now and heading to
  const lumps = new THREE.Group(); mixG.add(lumps);   // clumps of flour and cream cheese that stirring melts away
  const spoon = new THREE.Group(); spoon.position.y = 0.8; mixG.add(spoon);
  spoon.add(mesh(cyl(0.045, 0.045, 1.3, 8), '#e8b886', { x: 0.65, y: 0.55, rz: -0.5 }), mesh(sph(0.14, 10), '#e8b886', { x: 0.36, y: 0.02, s: [1, 0.5, 1] }));

  // the oven, with a glass door that swings down
  const ovenG = new THREE.Group(); ovenG.position.set(0.6, TOP, 0); sc.add(ovenG);
  // a real oven: a hollow steel box. The tray slides in on the open door, the door shuts, and the inside glows orange as it heats
  const OPEN = 1.45;
  let doorA = OPEN, trayK = 0, ovenHot = 0;
  const wallM = new THREE.MeshPhongMaterial({ color: '#7c5338', emissive: new THREE.Color('#ff5a14'), emissiveIntensity: 0, shininess: 20 });
  const floorM = new THREE.MeshPhongMaterial({ color: '#4d4038', emissive: new THREE.Color('#ff5a14'), emissiveIntensity: 0, shininess: 50, specular: 0x555555 });
  ovenG.add(mesh(box(0.3, 1.9, 1.5), '#cfc8bc', { x: -1.05, y: 0.95 }), mesh(box(0.3, 1.9, 1.5), '#cfc8bc', { x: 1.05, y: 0.95 }),
    mesh(box(1.8, 0.5, 1.5), '#cfc8bc', { y: 1.65 }), mesh(box(1.8, 0.3, 1.5), '#cfc8bc', { y: 0.15 }), mesh(box(2.5, 0.12, 1.6), '#b9b1a4', { y: 1.9 }));
  ovenG.add(mesh(box(1.8, 1.1, 0.05), '', { y: 0.85, z: -0.7, mat: wallM }), mesh(box(0.05, 1.1, 1.4), '', { x: -0.88, y: 0.85, mat: wallM }), mesh(box(0.05, 1.1, 1.4), '', { x: 0.88, y: 0.85, mat: wallM }),
    mesh(box(1.8, 0.05, 1.4), '', { y: 1.38, mat: wallM }), mesh(box(1.8, 0.04, 1.4), '', { y: 0.32, mat: floorM }));
  const rodM = new THREE.MeshBasicMaterial({ color: '#6b4a3a' });   // the heating elements: dull when cold, glowing when hot
  [1.32, 0.4].forEach(y => ovenG.add(mesh(cyl(0.025, 0.025, 1.6, 8), '', { y, z: 0.05, rz: PI / 2, mat: rodM, cast: false })));
  const ovenLight = new THREE.PointLight('#ff8a3c', 0, 3.6, 2); ovenLight.position.set(0, 0.85, 0.3); ovenG.add(ovenLight);
  [-0.6, 0.6].forEach(x => ovenG.add(mesh(sph(0.1, 10), '#ffffff', { x, y: 1.62, z: 0.78 })));
  const door = new THREE.Group(); door.position.set(0, 0.3, 0.78); door.rotation.x = OPEN; ovenG.add(door);   // hinged at the bottom of the opening
  const glass = new THREE.MeshBasicMaterial({ color: '#2a1c16', transparent: true, opacity: 0.4 });
  door.add(mesh(box(1.8, 1.1, 0.06), '', { y: 0.55, mat: glass, cast: false }), mesh(box(1.95, 0.08, 0.1), '#ffffff', { y: 1.12 }));
  const glowTex = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,175,80,.95)'); g.addColorStop(0.55, 'rgba(255,110,30,.5)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const glowM = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glowP = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), glowM); glowP.position.set(0, 0.55, 0.045); door.add(glowP);   // the orange glow seen through the glass
  const inside = new THREE.Group(); inside.position.set(0, 0.36, 1.55); ovenG.add(inside);
  const steam = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true })); ovenG.add(m); return m; });

  // the plate for decorating
  const decoG = new THREE.Group(); decoG.position.set(0.5, TOP, 0.2); sc.add(decoG);
  decoG.add(mesh(cyl(1.0, 0.85, 0.08, 32), '#ffffff', { y: 0.04 }));
  const hold = new THREE.Group(); hold.position.y = 0.08; decoG.add(hold);

  // ----- crushing cookies: a board, three cookies and a mallet -----
  const crushG = new THREE.Group(); crushG.position.set(0.5, TOP, 0.2); sc.add(crushG);
  crushG.add(mesh(box(2.5, 0.12, 1.5), '#e8b886', { y: 0.06 }));
  const cookies = [-0.7, 0, 0.7].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, 0.155, [0.12, -0.1, 0.1][i]); crushG.add(g);
    g.add(mesh(cyl(0.3, 0.3, 0.07, 24), '#c98b4b'));
    [[0.1, 0.05], [-0.12, 0.08], [0.02, -0.14], [-0.08, -0.06]].forEach(([dx, dz]) => g.add(mesh(sph(0.04, 6), '#5a3a22', { x: dx, y: 0.04, z: dz, cast: false })));
    return g;
  });
  const pile = mesh(sph(0.55, 14), '#b7773a', { y: 0.12, cast: false }); pile.scale.set(0.01, 0.01, 0.01); crushG.add(pile);
  const mallet = new THREE.Group(); mallet.position.set(0, 0.8, 0.05); crushG.add(mallet);
  mallet.add(mesh(box(0.5, 0.32, 0.34), '#ffd27a', { y: 0.16 }), mesh(cyl(0.055, 0.055, 0.6, 8), '#e2b088', { y: 0.62 }));
  let crushP = 0, swing = 0, swingHit = true;

  // ----- the springform pan: the crumbs lie on its bottom as a texture that is painted as you press -----
  const PAN_R = 0.95, panG = new THREE.Group(); panG.position.set(0.5, TOP, 0.2); sc.add(panG);
  panG.add(mesh(cyl(PAN_R + 0.04, PAN_R + 0.04, 0.06, 44), '#c9d0de', { y: 0.03 }));
  const panWall = new THREE.Mesh(new THREE.CylinderGeometry(PAN_R + 0.04, PAN_R + 0.04, 0.5, 48, 1, true), new THREE.MeshPhongMaterial({ color: '#dde3ee', side: THREE.DoubleSide, shininess: 70, specular: new THREE.Color(0x888888) }));
  panWall.position.y = 0.31; panG.add(panWall);
  panG.add(mesh(new THREE.TorusGeometry(PAN_R + 0.04, 0.025, 8, 48), '#b9c1d2', { rx: PI / 2, y: 0.56, cast: false }));
  const crustC = document.createElement('canvas'); crustC.width = crustC.height = 256;
  const crustX = crustC.getContext('2d'), crustTex = new THREE.CanvasTexture(crustC);
  const crust = new THREE.Mesh(new THREE.CircleGeometry(PAN_R, 48).rotateX(-PI / 2), new THREE.MeshLambertMaterial({ map: crustTex, transparent: true })); crust.position.y = 0.075; panG.add(crust);
  const mound = mesh(sph(0.4, 12), '#b7773a', { y: 0.1, cast: false }); mound.scale.set(1, 0.35, 1); panG.add(mound);
  const tool = mesh(cyl(0.26, 0.24, 0.4, 22), '#fff6ef', { y: 0.45 }); panG.add(tool);   // the glass you press with
  // ----- pouring the batter into the pan: a tilted bowl, a stream, and a level with a target line and an overflow line -----
  const POUR_T = 0.72, lvlY = L => 0.095 + L * 0.42;
  const fillM = new THREE.Mesh(new THREE.CylinderGeometry(PAN_R - 0.02, PAN_R - 0.02, 1, 40), new THREE.MeshPhongMaterial({ color: '#f1d996', shininess: 70, specular: new THREE.Color(0x888888) })); fillM.visible = false; panG.add(fillM);
  const ringAt = (y, color) => mesh(new THREE.TorusGeometry(PAN_R + 0.006, 0.014, 6, 56), color, { rx: PI / 2, y, cast: false });
  const tRing = ringAt(lvlY(POUR_T), '#4fb860'), oRing = ringAt(lvlY(1), '#ef5f7e');
  const pourG = new THREE.Group(); pourG.position.set(-0.35, 1.2, 0); pourG.scale.setScalar(0.55);
  pourG.add(mesh(cyl(0.9, 0.62, 0.8, 28), '#79afc8', { y: 0.4 }), mesh(cyl(0.8, 0.8, 0.05, 28), '#f1d996', { y: 0.8 }));
  const streamM = mesh(cyl(0.05, 0.05, 1, 10), '#f1d996', { cast: false }); streamM.visible = false;
  const pourOnly = [tRing, oRing, pourG, streamM]; pourOnly.forEach(o => { o.visible = false; panG.add(o); });
  let level = 0, pouring = false, tilt = 0;
  // ----- baking in the pan: the filling goes from pale to golden and, if forgotten, to dark brown -----
  const HEAT = [[0, '#fbf1d4'], [0.45, '#f1dcaa'], [0.69, '#dfb877'], [0.85, '#a9722f'], [1, '#3a1f0e']];
  const heatColor = p => { p = Math.max(0, Math.min(1, p)); let i = 0; while (i < HEAT.length - 2 && p > HEAT[i + 1][0]) i++; const [a, ca] = HEAT[i], [b, cb] = HEAT[i + 1]; return new THREE.Color(ca).lerp(new THREE.Color(cb), (p - a) / (b - a)); };
  const FRYC = [[0, '#ecd5a8'], [0.45, '#dcae66'], [0.69, '#c4843b'], [0.85, '#8a4f22'], [1, '#3a1f0e']];   // raw dough → golden brown → burnt
  const fryColor = p => { p = Math.max(0, Math.min(1, p)); let i = 0; while (i < FRYC.length - 2 && p > FRYC[i + 1][0]) i++; const [a, ca] = FRYC[i], [b, cb] = FRYC[i + 1]; return new THREE.Color(ca).lerp(new THREE.Color(cb), (p - a) / (b - a)); };
  let bakeHeat = 0, lastHeat = 0.69, ovenFill = null;
  function plainCake() {   // the baked cheesecake before it is decorated
    const g = new THREE.Group(), c = heatColor(lastHeat), hx = col => '#' + col.getHexString();
    g.add(mesh(cyl(0.42, 0.42, 0.07, 36), '#c98b4b', { y: 0.035 }), mesh(cyl(0.41, 0.41, 0.2, 36), hx(c), { y: 0.17 }), mesh(cyl(0.405, 0.405, 0.02, 36), hx(c.clone().multiplyScalar(0.92)), { y: 0.28 }));
    return g;
  }
  function panGroup() {   // a springform pan with its filling, for the oven
    const g = new THREE.Group();
    g.add(mesh(cyl(PAN_R + 0.04, PAN_R + 0.04, 0.06, 44), '#c9d0de', { y: 0.03 }), mesh(new THREE.TorusGeometry(PAN_R + 0.04, 0.025, 8, 48), '#b9c1d2', { rx: PI / 2, y: 0.56, cast: false }));
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(PAN_R + 0.04, PAN_R + 0.04, 0.5, 48, 1, true), new THREE.MeshPhongMaterial({ color: '#dde3ee', side: THREE.DoubleSide, shininess: 70 })); wall.position.y = 0.31; g.add(wall);
    g.add(mesh(cyl(PAN_R - 0.03, PAN_R - 0.03, 0.04, 40), '#c98b4b', { y: 0.08, cast: false }));
    ovenFill = new THREE.Mesh(new THREE.CylinderGeometry(PAN_R - 0.03, PAN_R - 0.03, 0.4, 40), new THREE.MeshPhongMaterial({ color: '#fff0cf', shininess: 40 })); ovenFill.position.y = 0.3; g.add(ovenFill);
    return g;
  }
  const GRID = 14, covered = new Uint8Array(GRID * GRID); let coverN = 0, cellsIn = 1, toolX = 0, toolZ = 0, toolDown = false;
  function crustReset() {
    crustX.clearRect(0, 0, 256, 256); covered.fill(0); coverN = 0; cellsIn = 0;
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) if (Math.hypot((i + 0.5) / GRID * 2 - 1, (j + 0.5) / GRID * 2 - 1) <= 0.92) cellsIn++;
    crustTex.needsUpdate = true; mound.visible = true; mound.scale.set(1, 0.35, 1);
  }
  function crustPaint(lx, lz) {   // lx, lz in the pan's own units; returns the share of the base that has been pressed
    const u = (lx / PAN_R * 0.5 + 0.5) * 256, v = (lz / PAN_R * 0.5 + 0.5) * 256, R = 0.2 / PAN_R * 128;
    for (let k = 0; k < 70; k++) {
      const a = Math.random() * PI * 2, d = Math.sqrt(Math.random()) * R;
      crustX.fillStyle = ['#c98b4b', '#b7773a', '#d9a05f', '#a8672f'][Math.random() * 4 | 0];
      crustX.beginPath(); crustX.arc(u + Math.cos(a) * d, v + Math.sin(a) * d, 2 + Math.random() * 2.6, 0, PI * 2); crustX.fill();
    }
    for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
      if (covered[i * GRID + j]) continue;
      const cx = ((i + 0.5) / GRID * 2 - 1) * PAN_R, cz = ((j + 0.5) / GRID * 2 - 1) * PAN_R;
      if (Math.hypot(cx / PAN_R, cz / PAN_R) <= 0.92 && Math.hypot(cx - lx, cz - lz) < 0.24) { covered[i * GRID + j] = 1; coverN++; }
    }
    crustTex.needsUpdate = true; return coverN / cellsIn;
  }

  // ----- donuts: knead, roll, cut, fry, glaze, sprinkles -----
  const dnG = new THREE.Group(); dnG.position.set(0.5, TOP, 0.2); sc.add(dnG);
  const DN_SPOTS = [[-0.62, -0.3], [0, -0.3], [0.62, -0.3], [-0.62, 0.3], [0, 0.3], [0.62, 0.3]], DN_GLAZE = '#f6a5bd';
  function makeDonut() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 12, 28), new THREE.MeshPhongMaterial({ color: '#f3d2a2', shininess: 20 })); body.rotation.x = PI / 2;
    const gl = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.094, 12, 28), new THREE.MeshPhongMaterial({ color: DN_GLAZE, shininess: 90, specular: new THREE.Color(0x999999) })); gl.rotation.x = PI / 2; gl.scale.set(1, 1, 0.6); gl.position.y = 0.06; gl.visible = false;
    g.add(body, gl); g.userData = { body, gl }; return g;
  }
  // the board: a ball of dough that is kneaded, rolled flat and cut into six rings
  const boardG = new THREE.Group(); dnG.add(boardG);
  boardG.add(mesh(box(2.5, 0.12, 1.5), '#e8b886', { y: 0.06 }));
  const dough = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshPhongMaterial({ color: '#f3d2a2', shininess: 15 })); boardG.add(dough);
  const pin = new THREE.Group(); pin.add(mesh(cyl(0.12, 0.12, 1.3, 16), '#e2b088', { rx: PI / 2 }), mesh(cyl(0.05, 0.05, 0.5, 8), '#c98b4b', { rx: PI / 2, z: 0.9 }), mesh(cyl(0.05, 0.05, 0.5, 8), '#c98b4b', { rx: PI / 2, z: -0.9 })); boardG.add(pin);
  const cutMarks = DN_SPOTS.map(([x, z]) => mesh(new THREE.TorusGeometry(0.2, 0.014, 6, 28), '#ffffff', { rx: PI / 2, x, y: 0.275, z, cast: false })); cutMarks.forEach(m => boardG.add(m));
  const cutRings = DN_SPOTS.map(([x, z]) => { const d = makeDonut(); d.position.set(x, 0.21, z); d.visible = false; boardG.add(d); return d; });
  let kneadK = 0, kneadP = 0, rollP = 0, rollX = 0, rollDown = false, cutN = 0; const cutAge = new Array(6).fill(1), cutDone = new Array(6).fill(false);
  // the pot of oil
  const potG = new THREE.Group(); dnG.add(potG);
  // a black iron frying pan on a gas hob, deep in hot oil: flames lick up round the base and the oil bubbles
  potG.add(mesh(box(3.9, 0.12, 2.9), '#2b2b30', { y: 0.06, s: [1, 1, 1] }), mesh(new THREE.TorusGeometry(0.82, 0.06, 8, 40), '#58585f', { rx: PI / 2, y: 0.14, s: [1, 0.75, 1] }));
  const flames = Array.from({ length: 16 }, (_, i) => {
    const a = i / 16 * PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 7), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff7a1c' : '#ffb03a', transparent: true, opacity: 0.92 }));
    f.position.set(Math.cos(a) * 1.02, 0.33, Math.sin(a) * 1.02 * 0.75); potG.add(f); return f;
  });
  const panM = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [1.0, 0], [1.05, 0.04], [1.42, 0.56], [1.42, 0.6], [1.36, 0.6], [1.34, 0.54], [0.98, 0.1], [0.001, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 56), new THREE.MeshPhongMaterial({ color: '#3b3b42', shininess: 70, specular: 0x777777, side: THREE.DoubleSide }));
  panM.position.y = 0.2; panM.scale.z = 0.75; panM.castShadow = panM.receiveShadow = true; potG.add(panM);
  potG.add(mesh(box(1.0, 0.07, 0.16), '#2a2a2f', { x: 1.9, y: 0.58 }), mesh(box(0.7, 0.1, 0.18), '#8a5a36', { x: 2.55, y: 0.58 }));   // a long handle with a wooden grip
  const oil = new THREE.Mesh(cyl(1.17, 1.17, 0.04, 36), new THREE.MeshPhongMaterial({ color: '#d99428', shininess: 90, specular: new THREE.Color(0xffffff), transparent: true, opacity: 0.93 })); oil.position.y = 0.55; oil.scale.z = 0.75; potG.add(oil);
  const fryLight = new THREE.PointLight('#ff9a40', 0, 3.4, 2); fryLight.position.set(0, 0.45, 0); potG.add(fryLight);
  const fryers = DN_SPOTS.map(([x, z]) => { const d = makeDonut(); d.position.set(x * 0.88, 1.6, z * 0.88); potG.add(d); return d; });
  let sideA = 0, flipT = 1, dipTime = 0;
  // the glaze bowl, with the tray of donuts held over it
  const glzG = new THREE.Group(); dnG.add(glzG);
  glzG.add(mesh(cyl(1.3, 1.15, 0.5, 36), '#fbf8f1', { y: 0.25, s: [1, 1, 0.75] }));
  const glazePool = new THREE.Mesh(cyl(1.22, 1.22, 0.04, 36), new THREE.MeshPhongMaterial({ color: DN_GLAZE, shininess: 90, specular: new THREE.Color(0xffffff) })); glazePool.position.y = 0.52; glazePool.scale.z = 0.75; glzG.add(glazePool);
  const tray = new THREE.Group(); glzG.add(tray); tray.add(mesh(box(2.1, 0.05, 1.0), '#fffaf3', { y: -0.025 }));
  const trayDonuts = DN_SPOTS.map(([x, z]) => { const d = makeDonut(); d.position.set(x * 0.92, 0.09, z * 0.9); tray.add(d); return d; });
  let trayY = 1.15, trayRot = PI, sprinkles = [];
  const DN_MODES = ['knead', 'roll', 'cut', 'fry', 'glaze', 'sprinkle'];

  const TOPS = [
    () => { const g = new THREE.Group(); g.add(mesh(sph(0.12, 10), '#ef5470', { s: [1, 1.1, 1] }), mesh(sph(0.06, 6), '#7cc68a', { y: 0.12, s: [1.4, 0.5, 1.4] })); return g; },
    () => mesh(sph(0.1, 10), '#4f2c1c', { s: [1.5, 0.5, 1.1] }),
    () => mesh(new THREE.OctahedronGeometry(0.11), '#ffe08a'),
  ];
  const INGS = {
    egg: () => mesh(sph(0.13, 10), '#fff6e8', { s: [1, 1.25, 1] }),
    flour: () => mesh(box(0.22, 0.3, 0.12), '#ffffff', { rz: 0.4 }),
    cheese: () => mesh(box(0.22, 0.18, 0.22), '#ffe9a8', { ry: 0.5 }),
    cookie: () => mesh(cyl(0.15, 0.15, 0.05, 16), '#c98b4b'),
    milk: () => mesh(cyl(0.1, 0.1, 0.3, 12), '#ffffff'),
    butter: () => mesh(box(0.26, 0.12, 0.17), '#f2d560'),
    choc: () => mesh(box(0.22, 0.06, 0.15), '#4f2c1c'),
    pretzel: () => { const p = makePretzel({ salt: false }); p.scale.setScalar(0.14); return p; },
    berry: () => { const g = new THREE.Group(); g.add(mesh(sph(0.12, 10), '#ef5470', { s: [1, 1.1, 1] }), mesh(sph(0.06, 6), '#7cc68a', { y: 0.12, s: [1.4, 0.5, 1.4] })); return g; },
  };
  const worldOf = (g, v) => v.clone().add(g.position);
  function burst(at, n, color = '#ffe08a') {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: i % 3 ? color : '#ffffff', transparent: true }));
      m.position.copy(at); sc.add(m);
      parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2.4, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 2.4), life: 0.7, g: 3 });
    }
  }
  function splash(n, fromTop = 0.85) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M(batter.material.color.getStyle ? '#' + batter.material.color.getHexString() : '#fff0cf'));
      m.position.set(mixG.position.x + (Math.random() - 0.5) * 0.7, TOP + fromTop, mixG.position.z + (Math.random() - 0.5) * 0.7); sc.add(m);
      parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 1.6, 2.2 + Math.random(), (Math.random() - 0.5) * 1.6), life: 0.9, g: 9, floor: TOP + 0.05 });
    }
  }
  function clearParts() { parts.splice(0).forEach(p => p.m.parent && p.m.parent.remove(p.m)); anims.splice(0).forEach(a => a.g.parent && a.g.parent.remove(a.g)); idleCb = null; }
  function enter(kind, newId) {
    const keep = mode === 'add' && kind === 'stir';
    mode = kind; id = newId; modeT = 0; nextDeco = null;
    if (!keep) clearParts();
    if (kind === 'add') { batter.material.color.set('#f1d996'); lumps.clear(); stirV = 0; fill = fillT = 0; batchTok++; }
    if (kind === 'stir') fillT = 1;
    if (kind === 'crush') { crushP = 0; swing = 0; swingHit = true; cookies.forEach(g => { g.visible = true; g.scale.set(1, 1, 1); }); pile.scale.set(0.01, 0.01, 0.01); mallet.position.set(0, 0.8, 0.05); }
    if (kind === 'press') { crustReset(); toolX = toolZ = 0; toolDown = false; }
    if (kind === 'pour' || kind === 'glaze') { level = 0; pouring = false; tilt = 0; }
    if (kind === 'knead') { kneadK = 0; kneadP = 0; rollP = 0; rollDown = false; cutN = 0; cutDone.fill(false); cutAge.fill(1); }
    if (kind === 'fry') { bakeHeat = 0; sideA = 0; flipT = 1; dipTime = 0; fryers.forEach(d => { d.rotation.set(0, 0, 0); d.position.y = 1.6; d.userData.splashed = false; d.userData.body.material.color.set('#f3d2a2'); }); }
    if (kind === 'glaze') { trayY = 1.15; trayRot = PI; sprinkles.splice(0).forEach(m => m.parent && m.parent.remove(m)); trayDonuts.forEach(d => { d.userData.gl.visible = false; }); }
    if (kind === 'bake') { bakeHeat = 0; ovenFill = null; }
    if (kind === 'bake' && id === 'cheesecake') { inside.clear(); insideModel = panGroup(); insideBase = 0.74; insideModel.scale.setScalar(insideBase); inside.add(insideModel); doorA = OPEN; trayK = 0; ovenHot = 0; door.rotation.x = OPEN; inside.position.set(0, 0.36, 1.55); }
    else if (kind === 'bake') { inside.clear(); insideModel = batchModel(id); insideBase = WHOLE[id] ? 1.0 : 0.85; insideModel.scale.setScalar(insideBase); inside.add(insideModel); doorA = OPEN; trayK = 0; ovenHot = 0; door.rotation.x = OPEN; inside.position.set(0, 0.36, 1.55); }
    if (kind === 'deco') {
      hold.clear(); placed3d.splice(0).forEach(o => decoG.remove(o)); hold.position.y = 0.08; const m = id === 'cheesecake' ? plainCake() : batchModel(id); m.scale.setScalar(WHOLE[id] ? 1.6 : 0.95); hold.add(m); decoG.rotation.y = 0;
      sc.updateMatrixWorld(true); cakeTop = new THREE.Box3().setFromObject(m).max.y - TOP;
    }
  }
  // ----- how each ingredient goes into the bowl: every one is a small animation { g, run(dt) → true when finished } -----
  const ease = k => k * k * (3 - 2 * k), lerp = (a, b, k) => a + (b - a) * k, k01 = k => Math.max(0, Math.min(1, k));
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  let SURF = 0.16;                                     // where the batter is, in the bowl's own coordinates (it rises as the bowl fills)
  let pulse = 0, swirlA = 0;
  const addLump = local => {
    for (let k = 0; k < 2; k++) {
      const a = Math.random() * PI * 2, r = 0.1 + Math.random() * 0.45, m = mesh(sph(0.07 + Math.random() * 0.05, 8), '#fffaf0', { x: Math.cos(a) * r, y: SURF + 0.01, z: Math.sin(a) * r, s: [1, 0.6, 1], cast: false });
      m.scale.multiplyScalar(0.01); m.userData.grow = 1; lumps.add(m);
    }
  };
  function ripple(time, dt) {
    swirlA += (0.4 + stirV * 2.2) * dt;
    const pos = batterGeo.attributes.position, col = batterGeo.attributes.color, sa = spoon.rotation.y, sx = 0.36 * Math.cos(sa), sz = -0.36 * Math.sin(sa);
    const amp = 0.005 + Math.min(1, stirV / 5) * 0.026, stirring = mode === 'stir', dip = 0.3 + Math.min(1, stirV / 4);
    for (let i = 0; i < pos.count; i++) {
      const x = batterBase[i * 3], z = batterBase[i * 3 + 2], r = Math.hypot(x, z) / 0.8, th = Math.atan2(z, x);
      let y = batterBase[i * 3 + 1] + amp * Math.sin(r * 15 - time * 7) * (1 - r * 0.4) + pulse * 0.03 * Math.sin(r * 18 - time * 14) * (1 - r);
      if (stirring) y -= 0.028 * Math.exp(-((x - sx) ** 2 + (z - sz) ** 2) / 0.05) * dip;   // the spoon dents the batter
      pos.array[i * 3 + 1] = y;
      const k = 1 + 0.05 * Math.sin(th * 5 + r * 9 - swirlA) * (1 - r * 0.3);              // streaks that wind round after the spoon
      col.array[i * 3] = col.array[i * 3 + 1] = col.array[i * 3 + 2] = k;
    }
    pos.needsUpdate = true; col.needsUpdate = true; batterGeo.computeVertexNormals();
    for (let i = lumps.children.length - 1; i >= 0; i--) {
      const m = lumps.children[i];
      if (m.userData.grow) { m.scale.multiplyScalar(1.18); if (m.scale.x >= 1) { m.scale.set(1, 0.6, 1); m.userData.grow = 0; } }
      else { m.scale.multiplyScalar(1 - Math.min(0.5, stirV * dt * 0.35)); if (m.scale.x < 0.12) lumps.remove(m); }
      m.position.y = SURF + 0.01 + 0.004 * Math.sin(time * 5 + i);
    }
  }
  const tint = (c, k) => batter.material.color.lerp(new THREE.Color(c), k01(k));
  const emit = (at, v, life, color, size = 0.05, g = 3, fade = 0.7) => {   // a speck: flour, crumbs, a drop
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 5), new THREE.MeshLambertMaterial({ color, transparent: true }));
    m.position.copy(at); sc.add(m); parts.push({ m, v, life, g, fade });
  };
  const plop = (local, color, n = 6) => {              // something lands in the batter: a ring of drops and a wobble
    pulse = 1; addLump(local); const w = mixG.localToWorld(local.clone());
    for (let i = 0; i < n; i++) emit(w, V3((Math.random() - 0.5) * 1.5, 1.5 + Math.random(), (Math.random() - 0.5) * 1.5), 0.8, color, 0.045, 9);
    tone(170, 0, 0.16, 'sine', 0.1); hop = 0.3;
  };
  const crackSound = (f = 330) => { tone(f, 0, 0.05, 'square', 0.06); tone(f * 1.7, 0.02, 0.04, 'square', 0.04); };
  // a flying thing that falls under gravity, bounces on the counter and fades away
  const tumble = (o, v, spin) => ({ o, v, spin, age: 0, run(dt) {
    this.age += dt; this.v.y -= 6 * dt; o.position.addScaledVector(this.v, dt); o.rotation.z += spin.z * dt; o.rotation.x += spin.x * dt;
    if (o.position.y < 0.05) { o.position.y = 0.05; this.v.y *= -0.3; this.v.x *= 0.6; this.v.z *= 0.6; spin.z *= 0.5; spin.x *= 0.5; }
    if (this.age > 1.2) o.traverse(c => { if (c.material && c.material.transparent !== undefined) { c.material = c.material.clone(); c.material.transparent = true; c.material.opacity = Math.max(0, 1 - (this.age - 1.2) / 0.5); } });
    return this.age > 1.7;
  } });

  function eggAnim() {
    const R = 0.18;
    const g = new THREE.Group(); mixG.add(g);
    const shell = M('#fff3e0'), dome = () => new THREE.SphereGeometry(R, 14, 8, 0, PI * 2, 0, PI / 2);
    const egg = new THREE.Group(); g.add(egg);
    egg.add(mesh(sph(R, 14), '', { mat: shell, s: [1, 1.25, 1], cast: false }));
    const crack = mesh(new THREE.TorusGeometry((R - 0.002), 0.009, 4, 18), '#8a6a50', { rx: PI / 2, y: 0.02, cast: false }); crack.scale.set(0.01, 0.01, 0.01); egg.add(crack);
    const topH = new THREE.Group(), botH = new THREE.Group(); topH.visible = botH.visible = false; g.add(topH, botH);
    topH.add(mesh(dome(), '', { mat: shell, s: [1, 1.25, 1], cast: false }));
    botH.add(mesh(dome(), '', { mat: shell, s: [1, 1.25, 1], rx: PI, cast: false }));
    const yolk = mesh(sph(0.108, 12), '#f3a51c', { cast: false }), white = mesh(sph(0.15, 12), '', { cast: false, mat: new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.92 }) });
    yolk.visible = white.visible = false; g.add(yolk, white);
    const start = V3(-1.7, 1.0, 0.8), hover = V3(0.05, 1.4, 0.98), c0 = V3(0.05, 1.1, 0.96), c1 = V3(-0.04, SURF + 0.07, 0.25);
    const chips = () => { for (let i = 0; i < 5; i++) emit(mixG.localToWorld(V3(0.05 + (Math.random() - 0.5) * 0.2, 0.9, 1.0)), V3((Math.random() - 0.5) * 1.2, 0.8 + Math.random() * 0.8, 0.3 + Math.random() * 0.6), 0.5, '#fff3e0', 0.02, 7); };
    let t = 0, tap1 = false, tap2 = false, opened = false, landed = false, shells = [];
    return { g, hold() { return t < 1.12 ? V3(egg.position.x - 0.26, egg.position.y - 0.02, egg.position.z + 0.04) : null; }, run(dt) {
      t += dt;
      if (t < 0.5) {                                                       // the egg swings in from the side
        const k = ease(t / 0.5); egg.position.set(lerp(start.x, hover.x, k), lerp(start.y, hover.y, k) + Math.sin(k * PI) * 0.25, lerp(start.z, hover.z, k)); egg.rotation.z = (1 - k) * 0.7;
      } else if (t < 1.1) {                                                // two taps on the rim of the bowl: the first cracks it, the second breaks it open
        const u = (t - 0.5) / 0.6, dip = Math.abs(Math.sin(u * PI * 2));
        egg.position.set(hover.x, hover.y - 0.39 * dip, hover.z); egg.rotation.z = Math.sin(u * PI * 2) * 0.12;
        egg.scale.set(1 + 0.05 * (dip > 0.9 ? 1 : 0), 1 - 0.07 * (dip > 0.9 ? 1 : 0), 1);
        if (u >= 0.25 && !tap1) { tap1 = true; crack.scale.setScalar(0.6); crackSound(300); chips(); }
        if (u >= 0.75 && !tap2) { tap2 = true; crack.scale.setScalar(1); crackSound(380); chips(); }
      } else {
        if (!opened) {                                                     // the shell comes apart
          opened = true; egg.visible = false; topH.visible = botH.visible = yolk.visible = white.visible = true; crackSound(240);
          topH.position.copy(egg.position); botH.position.copy(egg.position); yolk.position.copy(c0); white.position.copy(c0);
          shells = [tumble(topH, V3(0.9, 1.8, 0.5), { x: 2, z: -5 }), tumble(botH, V3(0.5, 0.6, 0.9), { x: 3, z: 3 })];
          shells.forEach(s => { s.age = 0; });
        }
        shells.forEach(s => s.run(dt));
        const k = k01((t - 1.12) / 0.5);                                   // the yolk slips out over the rim, trailing the white
        if (!landed) {
          yolk.position.set(lerp(c0.x, c1.x, k), lerp(c0.y, c1.y, k * k), lerp(c0.z, c1.z, k));
          const len = yolk.position.distanceTo(c0); white.position.lerpVectors(c0, yolk.position, 0.5); white.scale.set(0.8, 0.5, 1 + len * 6);
          yolk.scale.setScalar(1 + 0.15 * Math.sin(k * PI * 3));
          if (k >= 1) { landed = true; plop(c1, '#ffd966'); tint('#ffe9a8', 0.2); white.position.copy(c1).setY(SURF + 0.02); white.scale.set(2.4, 0.12, 2.4); }
        } else {
          const s = (t - 1.62);                                            // it settles, then sinks into the batter
          yolk.position.y = SURF + 0.07 - 0.06 * k01((s - 0.3) / 0.5); yolk.scale.setScalar(Math.max(0.01, 1 - 0.8 * k01((s - 0.3) / 0.5)));
          white.material.opacity = 0.92 * (1 - k01(s / 0.7)); white.scale.x = white.scale.z = 2.4 + s * 0.6;
          if (s > 0.9) yolk.visible = white.visible = false;
        }
      }
      return t > 2.4;
    } };
  }

  function bagAnim(body, band, lipAt, tiltTo, pourColor, spill) {   // flour or milk: a pack flies in, tips over the bowl and pours
    const g = new THREE.Group(); mixG.add(g); const bag = new THREE.Group(); g.add(bag); body(bag);
    const over = V3(0.55, 1.55, 0.35), away = V3(-1.7, 1.1, 0.5);
    let t = 0, said = false; const lipW = V3(0, 0, 0), stream = spill === 'stream' ? mesh(cyl(0.03, 0.03, 1, 8), '', { cast: false, mat: new THREE.MeshLambertMaterial({ color: pourColor, transparent: true, opacity: 0.95 }) }) : null;
    if (stream) { stream.visible = false; g.add(stream); }
    return { g, hold() { return t < 2.25 ? V3(bag.position.x - 0.2, bag.position.y + 0.06, bag.position.z + 0.04) : null; }, run(dt) {
      t += dt;
      const fly = ease(k01(t / 0.45)), tip = ease(k01((t - 0.45) / 0.45)) - ease(k01((t - 1.55) / 0.4)), out = ease(k01((t - 1.9) / 0.4));
      bag.position.set(lerp(lerp(away.x, over.x, fly), away.x, out), lerp(lerp(away.y, over.y, fly), away.y, out), over.z); bag.rotation.z = tip * tiltTo;
      bag.updateMatrixWorld(true); bag.localToWorld(lipW.copy(lipAt));
      if (tip > 0.8 && t < 1.6) {
        if (!said) { said = true; tone(520, 0, 0.1, 'triangle', 0.05); }
        if (spill === 'dust') {
          for (let i = 0; i < 3; i++) emit(lipW.clone().add(V3((Math.random() - 0.5) * 0.06, 0, (Math.random() - 0.5) * 0.06)), V3(-0.15 + Math.random() * 0.2, -1.0 - Math.random() * 0.5, (Math.random() - 0.5) * 0.2), 0.7, '#ffffff', 0.035, 2);
          if (Math.random() < 0.5) emit(mixG.localToWorld(V3(0.1, SURF + 0.03, 0.3)), V3((Math.random() - 0.5) * 0.4, 0.5, (Math.random() - 0.5) * 0.4), 0.6, '#f4f1ea', 0.07, -0.2, 0.5);
          tint('#f6ecd0', dt * 1.1);
        } else {
          const top = mixG.worldToLocal(lipW.clone()), len = Math.max(0.05, top.y - SURF);
          stream.visible = true; stream.position.set(top.x, top.y - len / 2, top.z); stream.scale.set(1, len, 1);
          if (Math.random() < 0.5) emit(mixG.localToWorld(V3(top.x, SURF + 0.03, top.z)), V3((Math.random() - 0.5) * 0.8, 1.0, (Math.random() - 0.5) * 0.8), 0.5, '#ffffff', 0.035, 7);
          pulse = Math.max(pulse, 0.5); tint('#f4e6bf', dt * 0.8);
        }
      } else if (stream) stream.visible = false;
      return t > 2.3;
    } };
  }
  const flourAnim = () => bagAnim(b => {
    b.add(mesh(box(0.3, 0.44, 0.15), '#ffffff', { y: 0.22, cast: false }), mesh(box(0.31, 0.12, 0.16), '#d9b98c', { y: 0.2, cast: false }), mesh(box(0.3, 0.07, 0.15), '#e9e4dc', { y: 0.46, cast: false }));
  }, null, V3(-0.15, 0.47, 0), 1.9, '#ffffff', 'dust');
  const milkAnim = () => bagAnim(b => {
    b.add(mesh(box(0.24, 0.34, 0.24), '#ffffff', { y: 0.17, cast: false }), mesh(box(0.25, 0.1, 0.25), '#9fd8f5', { y: 0.15, cast: false }), mesh(new THREE.CylinderGeometry(0, 0.17, 0.13, 4), '#ffffff', { y: 0.4, ry: PI / 4, cast: false }));
  }, null, V3(-0.1, 0.43, 0), 1.7, '#ffffff', 'stream');

  function slideAnim(color, size, plopColor) {     // cream cheese or butter: it slides off a tilted plate into the bowl
    const g = new THREE.Group(); mixG.add(g); const plate = new THREE.Group(); g.add(plate);
    plate.add(mesh(cyl(0.36, 0.3, 0.035, 22), '#ffffff', { cast: false }));
    const block = mesh(box(size[0], size[1], size[2]), color, { x: 0.12, y: size[1] / 2 + 0.02, cast: false }); plate.add(block);
    const over = V3(0.72, 1.3, 0.35), away = V3(-1.7, 1.0, 0.5);
    let t = 0, free = false, v = V3(0, 0, 0), sunk = 0, landed = false;
    return { g, hold() { return t < 2.0 ? V3(plate.position.x - 0.36, plate.position.y, plate.position.z + 0.04) : null; }, run(dt) {
      t += dt;
      const fly = ease(k01(t / 0.4)), tilt = ease(k01((t - 0.4) / 0.35)) - ease(k01((t - 1.3) / 0.35)), out = ease(k01((t - 1.55) / 0.35));
      plate.position.set(lerp(lerp(away.x, over.x, fly), away.x, out), lerp(lerp(away.y, over.y, fly), away.y, out), over.z); plate.rotation.z = tilt * 0.62;
      if (!free && t > 0.75) {                                              // it starts to slide, faster and faster
        block.position.x -= (0.3 + (t - 0.75) * 2.4) * dt;
        if (block.position.x < -0.3) { free = true; plate.updateMatrixWorld(true); const w = block.getWorldPosition(V3(0, 0, 0)); block.position.copy(g.worldToLocal(w)); g.add(block); block.rotation.z = plate.rotation.z; v.set(-0.5, -0.6, 0); }
      }
      if (free && !landed) {
        v.y -= 7 * dt; block.position.addScaledVector(v, dt); block.rotation.z *= 0.96;
        if (block.position.y < SURF + size[1] / 2) { landed = true; plop(block.position, plopColor, 7); tint(plopColor, 0.15); }
      }
      if (landed) { sunk += dt; const k = k01(sunk / 0.5); block.scale.set(1 + 0.3 * Math.sin(k * PI), 1 - 0.7 * k, 1 + 0.3 * Math.sin(k * PI)); block.position.y = SURF + size[1] / 2 * (1 - k) - 0.03 * k; if (k >= 1) block.visible = false; }
      return t > 2.0;
    } };
  }

  function breakAnim(kind) {                        // a cookie or a bar of chocolate: tap or snap it, the pieces fall in
    const g = new THREE.Group(); mixG.add(g); const item = new THREE.Group(); g.add(item);
    const cookie = kind === 'cookie', col = cookie ? '#c98b4b' : '#4f2c1c', crumb = cookie ? '#b7773a' : '#4a2a1e';
    const halves = [-1, 1].map(sd => { const h = new THREE.Group(); item.add(h); h.userData.sd = sd;
      if (cookie) { h.add(mesh(cyl(0.16, 0.16, 0.05, 18), col, { x: sd * 0.0, cast: false }), mesh(sph(0.025, 6), '#4a2a1e', { x: sd * 0.07, y: 0.03, z: 0.03, cast: false }), mesh(sph(0.025, 6), '#4a2a1e', { x: sd * 0.1, y: 0.03, z: -0.05, cast: false })); }
      else { h.add(mesh(box(0.16, 0.06, 0.2), col, { x: sd * 0.085, cast: false }), mesh(box(0.14, 0.015, 0.02), '#8a5a44', { x: sd * 0.085, y: 0.035, z: 0.04, cast: false }), mesh(box(0.14, 0.015, 0.02), '#8a5a44', { x: sd * 0.085, y: 0.035, z: -0.04, cast: false })); }
      return h; });
    if (cookie) halves[1].visible = false;           // the whole cookie is the left piece until it breaks
    const over = V3(0.4, cookie ? 1.2 : 1.4, 0.5), away = V3(-1.7, 1.0, 0.5);
    let t = 0, broken = false, falls = [];
    return { g, hold() { return !broken && t < 0.9 ? V3(item.position.x - 0.26, item.position.y, item.position.z + 0.04) : null; }, run(dt) {
      t += dt;
      if (t < 0.4) { const k = ease(t / 0.4); item.position.set(lerp(away.x, over.x, k), lerp(away.y, over.y, k) + Math.sin(k * PI) * 0.2, lerp(away.z, over.z, k)); }
      else if (!broken) {
        const u = k01((t - 0.4) / 0.4);
        if (cookie) item.position.set(over.x, over.y - 0.3 * Math.abs(Math.sin(u * PI)), over.z + 0.4 * u);   // it drops onto the rim
        else { halves.forEach(h => { h.rotation.z = -h.userData.sd * 0.55 * ease(u); h.position.y = 0.05 * u; }); }
        if (u >= 1) {
          broken = true; crackSound(cookie ? 260 : 420);
          if (cookie) { for (let i = 0; i < 3; i++) { const p = mesh(cyl(0.09, 0.09, 0.05, 10), col, { cast: false }); p.position.copy(item.position); g.add(p); falls.push({ p, v: V3(-0.5 + i * 0.35, 0.4 + i * 0.2, -0.9 + i * 0.1), landed: false }); } item.visible = false; for (let i = 0; i < 16; i++) emit(mixG.localToWorld(item.position.clone()), V3((Math.random() - 0.5) * 1.6, 0.6 + Math.random(), -0.4 - Math.random() * 0.8), 0.9, crumb, 0.03, 6); }
          else { halves.forEach(h => { const w = h.getWorldPosition(V3(0, 0, 0)); h.position.copy(g.worldToLocal(w)); h.rotation.z = -h.userData.sd * 0.55; g.add(h); falls.push({ p: h, v: V3(-h.userData.sd * 0.5 - 0.3, 0.3, 0), landed: false }); }); }
        }
      }
      falls.forEach(f => {
        if (f.landed) { f.p.scale.multiplyScalar(1 - dt * 3); return; }
        f.v.y -= 7 * dt; f.p.position.addScaledVector(f.v, dt); f.p.rotation.z += dt * 4;
        if (f.p.position.y < SURF + 0.03 && f.p.position.z < 0.85) { f.landed = true; f.p.position.y = SURF + 0.03; plop(f.p.position, crumb, 4); tint(crumb, 0.12); }
      });
      return t > 2.0;
    } };
  }

  function pretzelAnim() {                          // a pretzel bounces off the rim, tumbles in, and the salt falls after it
    const g = new THREE.Group(); mixG.add(g); const p = makePretzel({ salt: true }); p.scale.setScalar(0.17); g.add(p);
    const start = V3(-1.6, 1.0, 0.8), rim = V3(0.1, 1.0, 0.92), into = V3(-0.05, SURF + 0.03, 0.2);
    let t = 0, landed = false;
    return { g, hold() { return t < 0.45 ? V3(p.position.x - 0.22, p.position.y, p.position.z + 0.03) : null; }, run(dt) {
      t += dt;
      if (t < 0.45) { const k = ease(t / 0.45); p.position.set(lerp(start.x, rim.x, k), lerp(start.y, rim.y, k) + Math.sin(k * PI) * 0.3, lerp(start.z, rim.z, k)); p.rotation.z = k * 0.6; }
      else if (t < 1.0) {
        const k = k01((t - 0.45) / 0.55);
        p.position.set(lerp(rim.x, into.x, k), lerp(rim.y, into.y, k * k) + Math.sin(k * PI) * 0.18, lerp(rim.z, into.z, k)); p.rotation.z += dt * 6; p.rotation.y += dt * 3;
        if (Math.random() < 0.7) emit(mixG.localToWorld(p.position.clone()), V3((Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4), 0.7, '#ffffff', 0.022, 3);
        if (k >= 1 && !landed) { landed = true; plop(into, '#e8c48a'); tint('#e8c48a', 0.15); crackSound(350); }
      } else p.scale.multiplyScalar(Math.max(0, 1 - dt * 4));
      return t > 1.7;
    } };
  }
  function berryAnim() {                           // strawberries from the garden: three of them bounce off the rim and drop in, one after another
    const g = new THREE.Group(); mixG.add(g);
    const mk = () => {
      const b = new THREE.Group(); b.visible = false;
      b.add(mesh(sph(0.11, 12), '#d4324a', { s: [1, 1.15, 1], cast: false }), mesh(sph(0.055, 6), '#4f9d4c', { y: 0.12, s: [1.5, 0.5, 1.5], cast: false }));
      for (let i = 0; i < 5; i++) b.add(mesh(sph(0.012, 4), '#fff1a8', { x: Math.cos(i * 1.3) * 0.1, y: (i - 2) * 0.03, z: Math.sin(i * 1.3) * 0.1, cast: false }));
      g.add(b); return b;
    };
    const items = [0, 1, 2].map(i => ({ b: mk(), t0: i * 0.4, done: false, s: 0 }));
    const start = V3(-1.6, 1.0, 0.8);
    let time = 0;
    return { g, hold() { for (const it of items) { const u = time - it.t0; if (u >= 0 && u < 0.4) return V3(it.b.position.x - 0.2, it.b.position.y - 0.02, it.b.position.z + 0.03); } return null; }, run(dt) {
      time += dt;
      items.forEach((it, i) => {
        const u = time - it.t0, b = it.b; if (u < 0) return; b.visible = true;
        const rim = V3(-0.15 + i * 0.15, 1.0, 0.95), into = V3(-0.2 + i * 0.2, SURF + 0.06, 0.2 + i * 0.12);
        if (u < 0.4) { const k = ease(u / 0.4); b.position.set(lerp(start.x, rim.x, k), lerp(start.y, rim.y, k) + Math.sin(k * PI) * 0.25, lerp(start.z, rim.z, k)); b.rotation.z = k * 0.8; }
        else if (u < 0.85) {                       // a bounce off the rim, then in
          const k = k01((u - 0.4) / 0.45); b.position.set(lerp(rim.x, into.x, k), lerp(rim.y, into.y, k * k) + Math.sin(k * PI) * 0.28, lerp(rim.z, into.z, k)); b.rotation.z += dt * 5;
          if (k >= 1 && !it.done) { it.done = true; plop(into, '#ff8fa8', 5); tint('#ffb3c6', 0.12); }
        } else { it.s += dt; const k = k01(it.s / 0.5); b.scale.setScalar(Math.max(0.01, 1 - k)); b.position.y = SURF + 0.06 - 0.07 * k; }
      });
      return time > 2.1;
    } };
  }
  const ING_ANIM = { egg: eggAnim, flour: flourAnim, milk: milkAnim, cheese: () => slideAnim('#f6efd9', [0.3, 0.16, 0.24], '#f6efd9'), butter: () => slideAnim('#f2d560', [0.3, 0.13, 0.18], '#f2d560'), cookie: () => breakAnim('cookie'), choc: () => breakAnim('choc'), pretzel: pretzelAnim, berry: berryAnim };
  const anims = []; let idleCb = null;
  // ----- Miw's arm: it stretches from her shoulder to whatever she is holding, then goes back to her side -----
  const skin = M('#ffd9c4'), sleeveM = M('#ffd23f');
  const handG = new THREE.Group(); handG.visible = false; sc.add(handG);
  const armM = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 1, 10), skin), sleeveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.115, 0.24, 12), sleeveM);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), skin), thumb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin);
  fist.scale.set(1.15, 0.85, 1.05); armM.visible = false;   // just a hand with a cuff, no arm
  const fingers = [0, 1, 2, 3].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 6), skin));
  handG.add(armM, sleeveMesh, fist, thumb, ...fingers);
  let handP = null; const UP = V3(0, 1, 0);
  function placeArm(a, b) {                       // a: where the hand comes from (off-screen), b: where the hand is
    const d = b.clone().sub(a).normalize();
    fist.position.copy(b);
    sleeveMesh.position.copy(b).addScaledVector(d, -0.19); sleeveMesh.quaternion.setFromUnitVectors(UP, d);
    let side = d.clone().cross(UP); side = side.lengthSq() < 1e-4 ? V3(1, 0, 0) : side.normalize();   // across the palm
    fingers.forEach((f, i) => f.position.copy(b).addScaledVector(d, 0.13).addScaledVector(side, (i - 1.5) * 0.062).addScaledVector(UP, -0.015));
    thumb.position.copy(b).addScaledVector(UP, 0.105).addScaledVector(d, 0.04);
  }
  const px = (e) => { const rc = r.domElement.getBoundingClientRect(); return [(e.clientX - rc.left) / rc.width, (e.clientY - rc.top) / rc.height]; };
  return {
    r, cam,
    set(kind, newId) {
      if (mode === 'bake-out' && kind === 'deco') { nextDeco = newId; return; }
      if (kind === null && mode === 'done') return;
      if (kind === mode && newId === id) return;
      enter(kind, newId);
    },
    reset() { mode = null; id = null; clearParts(); },
    addIngredient(key) {
      if (mode !== 'add' && mode !== 'stir') return;
      anims.push((ING_ANIM[key] || ING_ANIM.egg)());
      const tok = batchTok; setTimeout(() => { if (tok === batchTok) fillT = Math.min(1, fillT + 0.28); }, 1200);   // the bowl fills as each one lands
    },
    busy() { return anims.length > 0; },
    afterAnims(cb) { idleCb = cb; },
    // the angle of the pointer round the middle of the bowl on screen, or null if it's right in the middle
    angleAt(e) {
      cam.updateMatrixWorld(); const [x, y] = px(e);
      const v = tmpA.set(mixG.position.x, TOP + 0.85, mixG.position.z).project(cam);
      const dx = (x - (v.x + 1) / 2) * W, dy = (y - (1 - v.y) / 2) * H;
      return Math.hypot(dx, dy) < 28 ? null : Math.atan2(dy, dx);
    },
    stirTo(a, d) {
      if (mode !== 'stir') return;
      spoon.rotation.y = -a; stirV = Math.min(9, stirV + d * 14);
      if (Math.random() < Math.min(1, d * 3)) splash(1);
    },
    // where on the plate a tap lands, in the plate's own coordinates, or null if it missed the cake
    setPouring(on) { if (mode === 'pour' || mode === 'glaze') pouring = on; },
    level() { return level; },
    setHeat(p) { bakeHeat = p; },
    puff() { for (let i = 0; i < 18; i++) emit(panG.localToWorld(V3((Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 1.2)), V3((Math.random() - 0.5) * 0.8, 0.9 + Math.random(), (Math.random() - 0.5) * 0.8), 1.1, ['#555', '#777', '#999'][i % 3], 0.1, -0.2, 0.9); tone(150, 0, 0.3, 'sawtooth', 0.05); hop = 0.6; },
    crushHit(p) { if (mode !== 'crush') return; crushP = p; swing = 1; swingHit = false; hop = 0.2; },
    // where on the pan a pointer is, in the pan's own units (null if off it); pressing paints crumbs and returns how much of the base is covered
    pressAt(e, down) {
      if (mode !== 'press') return null;
      cam.updateMatrixWorld(); const [x, y] = px(e);
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), cam);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP + 0.08)), tmpB.clone());
      if (!hit) return null;
      hit.sub(panG.position);
      if (Math.hypot(hit.x, hit.z) > PAN_R) return null;
      toolX = hit.x; toolZ = hit.z; toolDown = down;
      return down ? crustPaint(hit.x, hit.z) : null;
    },
    cakePoint(e) {
      if (mode !== 'deco') return null;
      cam.updateMatrixWorld(); const [x, y] = px(e);
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(y * 2 - 1)), cam);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP + cakeTop)), tmpB.clone());
      if (!hit) return null;
      hit.sub(decoG.position);
      return Math.hypot(hit.x, hit.z) <= 0.75 ? hit : null;
    },
    place(i, p) {
      if (mode !== 'deco') return;
      const m = TOPS[i](), to = new THREE.Vector3(p.x, cakeTop + 0.03, p.z), from = new THREE.Vector3(p.x * 1.6, 3.4, p.z + 1.0);
      m.position.copy(from); decoG.add(m); placed3d.push(m); hop = 0.3;
      parts.push({ m, from, to, k: 0, dur: 0.45, toss: true, parent: decoG });
    },
    // where the pointer is on the board, in the board's own units (null if the ray misses)
    boardAt(e, y) {
      cam.updateMatrixWorld(); const [x, yy] = px(e);
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(x * 2 - 1, -(yy * 2 - 1)), cam);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP + y)), tmpB.clone());
      return hit ? hit.sub(dnG.position) : null;
    },
    kneadHit(side, p) {
      if (mode !== 'knead') return;
      kneadK = 1; kneadP = p; hop = 0.2; dough.rotation.y += 0.5;
      for (let i = 0; i < 4; i++) emit(dnG.localToWorld(V3(side ? 0.5 : -0.5, 0.3, (Math.random() - 0.5) * 0.6)), V3((side ? 1 : -1) * Math.random(), 0.8 + Math.random(), (Math.random() - 0.5)), 0.5, '#ffffff', 0.03, 6);
    },
    rollAt(e, down) {   // drag the rolling pin over the dough; returns how flat it is (0 to 1), or null off the board
      if (mode !== 'roll') return null;
      const h = this.boardAt(e, 0.2); if (!h || Math.abs(h.x) > 1.25 || Math.abs(h.z) > 0.75) return null;
      if (down && rollDown) rollP = Math.min(1, rollP + Math.abs(h.x - rollX) / 4.2);
      rollX = h.x; rollDown = down; return rollP;
    },
    cutAt(e) {   // tap a ring on the sheet to cut it out; returns how many are cut, or -1 for a miss
      if (mode !== 'cut') return -1;
      const h = this.boardAt(e, 0.27); if (!h) return -1;
      let best = -1, bd = 0.34;
      DN_SPOTS.forEach(([x, z], i) => { const d = Math.hypot(h.x - x, h.z - z); if (!cutDone[i] && d < bd) { bd = d; best = i; } });
      if (best < 0) return -1;
      cutDone[best] = true; cutAge[best] = 0; cutN++; hop = 0.25;
      for (let i = 0; i < 6; i++) emit(dnG.localToWorld(V3(DN_SPOTS[best][0], 0.3, DN_SPOTS[best][1])), V3((Math.random() - 0.5) * 1.6, 1 + Math.random(), (Math.random() - 0.5) * 1.6), 0.5, '#fff3dc', 0.035, 7);
      return cutN;
    },
    flip() { sideA = bakeHeat; flipT = 0; hop = 0.5; },
    sprinkle(n) {
      if (mode !== 'sprinkle') return;
      const cols = ['#ff5d8f', '#ffd54a', '#6fd3ff', '#8be28b', '#ffffff'];
      trayDonuts.forEach(d => { for (let k = 0; k < 3; k++) { const a = Math.random() * PI * 2, m = mesh(box(0.055, 0.014, 0.014), cols[(Math.random() * cols.length) | 0], { x: Math.cos(a) * 0.2, y: 0.112, z: Math.sin(a) * 0.2, ry: Math.random() * PI, cast: false }); d.add(m); sprinkles.push(m); } });
      for (let i = 0; i < 14; i++) emit(tray.localToWorld(V3((Math.random() - 0.5) * 2, 0.9, (Math.random() - 0.5) * 0.8)), V3(0, 0, 0), 0.6, cols[i % 5], 0.03, 5);
      hop = 0.25; tone(500 + n * 80, 0, 0.08, 'triangle', 0.06);
    },
    takeOut(stars) {
      if (mode !== 'bake' && mode !== 'fry') return;
      lastHeat = bakeHeat;
      if (mode === 'fry') { hop = 0.9; burst(V3(0.6, TOP + 1.3, 1.1), stars * 4); return; }
      mode = 'bake-out'; modeT = 0; hop = 0.9;
      burst(new THREE.Vector3(0.6, TOP + 1.3, 1.1), stars * 4);
    },
    done() {
      mode = 'done'; modeT = 0; hop = 1.3;
      if (id === 'donut') {   // six glazed donuts on the plate
        placed3d.splice(0).forEach(o => decoG.remove(o)); hold.clear(); hold.position.y = 0.08; decoG.rotation.y = 0;
        const n = yieldOf(id);
        for (let k = 0; k < n; k++) { const a = k * 2 * PI / n, m = dessertModel(id); m.scale.setScalar(1.2); m.position.set(Math.sin(a) * 0.55, 0, Math.cos(a) * 0.55); m.rotation.y = a; hold.add(m); }
      } else if (WHOLE[id]) {   // cut the cake into slices, one for each piece the batch makes
        placed3d.splice(0).forEach(o => decoG.remove(o)); hold.clear();
        const n = yieldOf(id);
        for (let k = 0; k < n; k++) {
          const a = k * 2 * PI / n + PI / n, m = dessertModel(id), rad = n > 4 ? 0.42 : 0.5;
          m.scale.setScalar(n > 4 ? 1.3 : 1.5); m.position.set(Math.sin(a) * rad, 0, Math.cos(a) * rad); m.rotation.y = a + PI; hold.add(m);
        }
      }
      burst(worldOf(decoG, new THREE.Vector3(0, 0.9, 0)), 16);
    },
    update(dt, now) {
      t += dt; modeT += dt;
      if (frameN++ % 8 === 0) sc.traverse(o => { if (o.isMesh && o.material && !o.material.transparent && !o.userData.fx) { o.castShadow = true; o.receiveShadow = true; } });
      const g = goalOf(mode);
      cam.position.lerp(tmpA.set(...g[0]), Math.min(1, dt * 3)); look.lerp(tmpB.set(...g[1]), Math.min(1, dt * 3)); cam.lookAt(look);
      if (!chef) {
        const m = makeModel('miw', '#ffd9c4');
        if (m) { chef = m; m.g.scale.setScalar(1.2); m.g.position.set(-1.15, TOP, 0.5); m.g.rotation.y = 0.6; m.g.visible = false; sc.add(m.g); }
      }
      if (chef) {
        hop = Math.max(0, hop - dt);
        chef.g.position.y = TOP + (hop > 0 ? Math.abs(Math.sin(t * 12)) * 0.22 : 0);
        chef.g.rotation.y = 0.6 + (mode === 'stir' ? Math.sin(t * 6) * 0.12 * Math.min(1, stirV / 3) : 0);
        if (chef.pose) chef.pose(false, dt);
        const sl = chef.g.getObjectByName('slice'); if (sl) sl.visible = false;
      }
      // her free arm: out to the ingredient, to the spoon, or resting by her side
      if (mode === 'add' || mode === 'stir') {
        const S = V3(-3.4, 1.0, 0.75);      // the arm comes in from outside the picture
        let tgt = null;
        for (const a of anims) { const h = a.hold && a.hold(); if (h) { tgt = mixG.localToWorld(h); break; } }
        if (!tgt && mode === 'stir') tgt = spoon.localToWorld(V3(0.92, 1.08, 0));
        if (!tgt) tgt = V3(-2.7, 0.8, 0.7);          // resting, just out of sight
        if (!handP) handP = tgt.clone();
        handP.lerp(tgt, Math.min(1, dt * 14));
        placeArm(S, handP); handG.visible = true;
      } else { handG.visible = false; handP = null; }
      spoon.visible = mode === 'stir';
      crushG.visible = mode === 'crush'; panG.visible = mode === 'press' || mode === 'pour';
      tool.visible = mode === 'press'; if (mode !== 'press') mound.visible = false; pourOnly.forEach(o => { if (mode !== 'pour') o.visible = false; });
      if (mode === 'pour') {
        if (pouring) level = Math.min(1.05, level + dt * (0.2 + 0.035 * Math.sin(t * 3)));   // it flows a little unevenly
        tilt += ((pouring ? 1 : 0) - tilt) * Math.min(1, dt * 5);
        const h = 0.02 + level * 0.42; fillM.scale.y = h; fillM.position.y = 0.095 + h / 2; fillM.visible = level > 0.01;
        tRing.visible = oRing.visible = pourG.visible = true; pourG.rotation.z = -tilt;
        pourG.updateMatrixWorld(true); const lip = panG.worldToLocal(pourG.localToWorld(V3(0.9, 0.8, 0))), surf = 0.095 + h;
        streamM.visible = pouring && tilt > 0.55; streamM.scale.set(1, Math.max(0.01, lip.y - surf), 1); streamM.position.set(lip.x, (lip.y + surf) / 2, lip.z);
        if (streamM.visible && Math.random() < 0.5) emit(panG.localToWorld(V3(lip.x, surf, lip.z)), V3((Math.random() - 0.5) * 0.9, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.9), 0.45, '#f1d996', 0.03, 7);
      }
      if (mode === 'crush') {
        swing = Math.max(0, swing - dt * 5.5);
        const c = cookies[Math.min(2, Math.floor(crushP * 2.999))];
        mallet.position.set(mallet.position.x + (c.position.x - mallet.position.x) * Math.min(1, dt * 12), 0.2 + 0.6 * Math.pow(swing, 1.4), c.position.z);
        if (!swingHit && swing < 0.1) {   // the mallet lands: crumbs fly
          swingHit = true; tone(180, 0, 0.09, 'square', 0.07);
          for (let i = 0; i < 9; i++) emit(crushG.localToWorld(V3(c.position.x, 0.25, c.position.z)), V3((Math.random() - 0.5) * 2.2, 1 + Math.random() * 1.4, (Math.random() - 0.5) * 2.2), 0.7, '#b7773a', 0.035, 7);
        }
        cookies.forEach((g, i) => { const l = k01(crushP * 3 - i); g.visible = l < 1; g.scale.set(1 + 0.2 * l, 1 - 0.6 * l, 1 + 0.2 * l); });
        pile.scale.set(0.15 + 0.85 * crushP, 0.05 + 0.3 * crushP, 0.12 + 0.7 * crushP);
      }
      if (mode === 'press') {
        tool.position.x += (toolX - tool.position.x) * Math.min(1, dt * 14); tool.position.z += (toolZ - tool.position.z) * Math.min(1, dt * 14);
        tool.position.y += ((toolDown ? 0.2 : 0.46) - tool.position.y) * Math.min(1, dt * 16);
        const left = Math.max(0, 1 - coverN / cellsIn * 1.6); mound.scale.set(left, 0.35 * left, left); mound.visible = left > 0.05;
      }
      dnG.visible = DN_MODES.includes(mode); boardG.visible = mode === 'knead' || mode === 'roll' || mode === 'cut'; potG.visible = mode === 'fry'; glzG.visible = mode === 'glaze' || mode === 'sprinkle';
      if (boardG.visible) {
        kneadK = Math.max(0, kneadK - dt * 5);
        const e = mode === 'knead' ? 0 : mode === 'roll' ? ease(rollP) : 1;
        const sx = lerp(0.5 + 0.18 * kneadK, 1.15, e), sy = lerp(0.5 - 0.14 * kneadK, 0.07, e), sz = lerp(0.5 + 0.18 * kneadK, 0.72, e);
        dough.scale.set(sx, sy, sz); dough.position.y = 0.12 + sy; dough.visible = true;
        pin.visible = mode === 'roll'; pin.position.x += (rollX - pin.position.x) * Math.min(1, dt * 14); pin.position.y += ((rollDown ? 0.12 + sy + 0.12 : 0.12 + sy + 0.4) - pin.position.y) * Math.min(1, dt * 14);
        cutMarks.forEach((m, i) => { m.visible = mode === 'cut' && !cutDone[i]; m.scale.setScalar(1 + 0.08 * Math.sin(t * 6 + i)); });
        cutRings.forEach((d, i) => { cutAge[i] = Math.min(1, cutAge[i] + dt * 5); d.visible = mode === 'cut' && cutDone[i]; d.scale.setScalar(0.3 + 0.7 * ease(cutAge[i])); d.position.y = 0.22 + Math.sin(cutAge[i] * PI) * 0.15; });
      }
      if (mode === 'fry') {
        flames.forEach((f, i) => { f.scale.set(0.9 + 0.2 * Math.sin(t * 13 + i), 0.8 + 0.5 * Math.abs(Math.sin(t * 9 + i * 1.7)), 0.9 + 0.2 * Math.sin(t * 11 + i)); });
        fryLight.intensity = (0.9 + 0.3 * Math.sin(t * 17)) * (bakeHeat > 0.82 ? 1.5 : 1);
        flipT = Math.min(1, flipT + dt * 2.2);
        const h = bakeHeat, col = fryColor(sideA > 0 ? (sideA + h) / 2 : h);
        dipTime += dt;
        fryers.forEach((d, i) => {
          const k = k01((dipTime - i * 0.12) / 0.8), down = lerp(1.6, 0.56, ease(k)) - 0.07 * Math.sin(k01((k - 0.8) / 0.2) * PI);   // lowered in, dunked a little, then it floats
          d.position.y = down + (k >= 1 ? 0.012 * Math.sin(t * 3 + i) : 0) + Math.sin(flipT * PI) * 0.4; d.rotation.z = flipT < 1 ? flipT * PI * 2 : 0;
          d.userData.body.material.color.copy(col);
          if (k > 0.82 && !d.userData.splashed) { d.userData.splashed = true; for (let n = 0; n < 7; n++) emit(potG.localToWorld(V3(d.position.x + (Math.random() - 0.5) * 0.4, 0.58, d.position.z + (Math.random() - 0.5) * 0.3)), V3((Math.random() - 0.5) * 1.2, 1.4 + Math.random(), (Math.random() - 0.5) * 1.2), 0.7, '#f6c35a', 0.04, 9); tone(260 + i * 20, 0, 0.12, 'sawtooth', 0.03); }
          if (k >= 1 && Math.random() < 0.5) emit(potG.localToWorld(V3(d.position.x + (Math.random() - 0.5) * 0.55, 0.57, d.position.z + (Math.random() - 0.5) * 0.4)), V3(0, 0.3, 0), 0.5, '#fff1c4', 0.022, -0.1, 0.4);   // bubbles round the dough
        });
        if (dipTime > 0.9 && Math.random() < 0.35) tone(1800 + Math.random() * 2200, 0, 0.018, 'square', 0.012);   // the sizzle
        oil.material.color.set(h > 0.82 ? '#b9691d' : '#d99428');
        if (Math.random() < 0.6) emit(potG.localToWorld(V3((Math.random() - 0.5) * 2.2, 0.62, (Math.random() - 0.5) * 1.2)), V3(0, 0.5, 0), 0.5, '#fff6d8', 0.03, -0.1);
        if (h > 0.88 && Math.random() < 0.4) emit(potG.localToWorld(V3((Math.random() - 0.5) * 2, 0.8, 0)), V3((Math.random() - 0.5) * 0.4, 0.7, 0), 0.9, '#4a4a4a', 0.09, -0.3, 0.8);
      }
      if (mode === 'glaze' || mode === 'sprinkle') {
        if (mode === 'glaze') {
          if (pouring) level = Math.min(1.05, level + dt * (0.2 + 0.035 * Math.sin(t * 3)));
          trayY += ((1.15 - level * 0.7) - trayY) * Math.min(1, dt * 8); trayRot += (PI - trayRot) * Math.min(1, dt * 8);
        } else { trayY += (0.85 - trayY) * Math.min(1, dt * 5); trayRot += (0 - trayRot) * Math.min(1, dt * 5); }
        tray.position.y = trayY; tray.rotation.x = trayRot;
        const a = 0.55 + 0.45 * Math.min(1, level / POUR_T);
        trayDonuts.forEach(d => { d.userData.gl.visible = level > 0.3; d.userData.gl.scale.set(a, a, 0.6); });
        glazePool.position.y = 0.52 - 0.02 * level;
      }
      mixG.visible = mode === 'add' || mode === 'stir'; ovenG.visible = mode === 'bake' || mode === 'bake-out'; decoG.visible = mode === 'deco' || mode === 'done';
      if (mode === 'stir' || mode === 'add') {
        stirV = Math.max(0, stirV - dt * 4); fill += (fillT - fill) * Math.min(1, dt * 3);
        const lvl = 0.14 + 0.44 * Math.min(1, fill); SURF = lvl + 0.02;                        // the batter stays well below the rim
        const rin = 0.56 + 0.28 * Math.max(0, (lvl - 0.1) / 0.7), rad = rin * 0.97 / 0.8;     // as wide as the bowl is at that height
        batter.visible = fill > 0.03; batter.scale.set(rad, 1, rad);
        rim.visible = fill > 0.05; rim.position.y = lvl + 0.006; rim.scale.set(rad, rad, 1);   // the edge where the batter meets the bowl
        spoon.position.y = SURF - 0.02;
        ripple(t, dt);
      }
      if (mode === 'bake' || mode === 'bake-out') {
        if (ovenFill) {
          ovenFill.material.color.copy(heatColor(bakeHeat)); ovenFill.scale.y = 1 + 0.1 * Math.min(1, bakeHeat * 1.4);   // it puffs up as it bakes
          if (bakeHeat > 0.88 && Math.random() < 0.4) emit(ovenG.localToWorld(V3((Math.random() - 0.5) * 1.2, 1.5, 0.9)), V3((Math.random() - 0.5) * 0.4, 0.7, 0), 0.9, '#4a4a4a', 0.09, -0.3, 0.8);
        }
        steam.forEach((m, i) => { const k = ((t * 0.45) + i / 4) % 1; m.position.set(-0.6 + i * 0.4, 2.0 + k * 0.9, 0.2); m.scale.setScalar(0.6 + k); m.material.opacity = 0.55 * (1 - k); });
        // the door starts open: the tray slides in, the door shuts; to take it out the door opens and the tray slides back out
        let dT, tT;
        if (mode === 'bake') { tT = k01((modeT - 0.15) / 0.85); dT = modeT < 1.0 ? OPEN : OPEN * (1 - ease(k01((modeT - 1.0) / 0.55))); }
        else { tT = 1 - k01((modeT - 0.45) / 0.8); dT = OPEN * ease(k01(modeT / 0.5)); }
        doorA += (dT - doorA) * Math.min(1, dt * 12); trayK += (tT - trayK) * Math.min(1, dt * 9);
        door.rotation.x = doorA; inside.position.z = lerp(1.55, 0.05, ease(trayK));
        const closed = doorA < 0.35, fl = 0.86 + 0.14 * Math.sin(t * 23) + 0.07 * Math.sin(t * 7.3);   // a flicker
        ovenHot += ((mode === 'bake' && closed ? 1 : 0) - ovenHot) * Math.min(1, dt * 2.6);
        const over = bakeHeat > 0.82, hotC = over ? '#ff3b1a' : '#ff8a22';
        wallM.emissiveIntensity = floorM.emissiveIntensity = ovenHot * 0.6 * fl; wallM.emissive.set(over ? '#ff3b1a' : '#ff5a14'); floorM.emissive.copy(wallM.emissive);
        rodM.color.set('#6b4a3a').lerp(new THREE.Color(hotC), Math.min(1, ovenHot * fl));
        ovenLight.intensity = ovenHot * 2.8 * fl; ovenLight.color.set(over ? '#ff5a30' : '#ff8a3c');
        glowM.opacity = closed ? ovenHot * (0.4 + 0.18 * fl) : 0;
        if (mode === 'bake') insideModel.scale.setScalar(insideBase * (1 + (ovenFill ? 0.04 : WHOLE[id] ? 0.35 : 0.18) * Math.min(1, Math.max(0, modeT - 1.5) / 4)));   // it rises while it bakes
        else if (modeT > 1.5) { mode = null; if (nextDeco) enter('deco', nextDeco); }
      }
      if (mode === 'done') { decoG.rotation.y += dt * 4; hold.position.y = 0.08 + Math.abs(Math.sin(modeT * 6)) * 0.08 * Math.max(0, 1 - modeT / 1.2); if (modeT > 1.6) { mode = null; decoG.rotation.y = 0; hold.position.y = 0.08; } }
      for (let i = anims.length - 1; i >= 0; i--) if (anims[i].run(dt)) { anims[i].g.parent && anims[i].g.parent.remove(anims[i].g); anims.splice(i, 1); }
      if (!anims.length && idleCb) { const cb = idleCb; idleCb = null; cb(); }
      pulse = Math.max(0, pulse - dt * 3); batter.position.y = 0.14 + 0.44 * Math.min(1, fill) + pulse * 0.008 * Math.sin(t * 28);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.toss) {
          p.k += dt / p.dur; const k = Math.min(1, p.k);
          p.m.position.set(p.from.x + (p.to.x - p.from.x) * k, p.from.y + (p.to.y - p.from.y) * k + Math.sin(k * PI) * 0.7, p.from.z + (p.to.z - p.from.z) * k);
          p.m.rotation.y += dt * 8;
          if (k >= 1) {
            if (p.parent === mixG) { splash(5, 0.9); p.m.parent.remove(p.m); batter.material.color.lerp(new THREE.Color(BATTER[id] || '#fff0cf'), 0.4); }
            else burst(worldOf(decoG, p.to), 4);
            hop = 0.35; parts.splice(i, 1);
          }
        } else {
          p.life -= dt; p.v.y -= p.g * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.y += dt * 6;
          if (p.m.material.transparent) p.m.material.opacity = Math.max(0, Math.min(1, p.life / (p.fade || 0.7)));
          if (p.life <= 0 || (p.floor && p.m.position.y < p.floor)) { p.m.parent && p.m.parent.remove(p.m); parts.splice(i, 1); }
        }
      }
      r.render(sc, cam);
      if (window.__kstSnap) window.__kstSnap(r.domElement);   // a hook for taking pictures of the kitchen while testing
    },
  };
})();
// the shelf ran out in the middle of a day: pause the shop and go back to the kitchen for a quick extra batch
function restock(id) {
  if (game.paused || !game.running) return;
  if (INGR[id].includes('berry') && kitchen.berries < 1) { toast('🍓 Out of strawberries! Tap the garden to pick more'); sfx.nope(); return; }
  if (pay.c) closePay();   // put the checkout card away first
  miw.target = miw.path = miw.onArrive = null;   // she stops where she is; the rest of the queue waits and carries on afterwards
  openKitchen(game.day, { resume: true, pick: id });
}
function closeRestock() {
  kitchen.on = false; kitchen.resume = false; kitchen.overtime = false; game.paused = false;
  queue = queue.filter(a => { if (a.kind === 'station' && !stockOf(a.st.id)) { a.mark.remove(); return false; } return true; }); numberQueue();   // picks that still have nothing to pick would only come straight back
  $('overlay').hidden = true; updatePlates(); renderHands(); toast('Back to work! 💪'); sfx.bell();
  // draw every friend's order bubble afresh, in case anything was left half-way while the shop was paused
  customers.forEach(c => { if (c.state === 'wait') drawBubble(c); else if (c.state === 'walkpay' || c.state === 'pay' || c.state === 'paying') drawPayBubble(c); else if (c.state === 'think') { c.bubble.style.display = ''; c.bubble.textContent = '💭'; } });
}
function openKitchen(d, opts = {}) {
  game.day = d;
  if (opts.resume) game.paused = true; else game.running = false;
  const total = opts.resume ? RESTOCK_SECONDS : PREP_SECONDS;
  Object.assign(kitchen, { left: total, total, step: null, msg: '', on: true, warned: false, overtime: false, resume: !!opts.resume });
  kitchen.run = null;
  if (opts.resume) beginRecipe(opts.pick);
  dressStations(); dressTables();
  $('panel').classList.add('wide');   // the kitchen gets a wide panel with a big picture
  $('panel').innerHTML = `
    <h2>${opts.resume ? `🍳 ${DESSERTS[opts.pick].name} ran out!` : `👩‍🍳 Kitchen · Day ${d}`}</h2>
    <p>${opts.resume ? 'The shop is paused. Bake a quick extra batch, then get back to your friends.' : `Bake desserts before you open. Each batch makes ${yieldRange()}; the better you bake, the more each one sells for. What's left over keeps.`}</p>
    <div class="ktime"><div id="kbar"><i></i></div><span id="ksec"></span></div>
    <div id="kcanvas"></div><div id="kstage"></div>
    <div class="kfoot"><div class="kstock" id="kstock"></div><button class="alt" id="pickBtn"></button><button class="go" id="goBtn">${opts.resume ? 'Back to the shop →' : 'Open the shop →'}</button></div>`;
  $('overlay').hidden = false;
  $('goBtn').onclick = () => {
    if (opts.resume) return closeRestock();
    // nothing on the shelves: make sure that's what they meant
    if (!Object.values(kitchen.stock).some(n => n > 0) && !kitchen.warned) { kitchen.warned = true; $('goBtn').textContent = 'Nothing baked yet. Open anyway?'; sfx.nope(); return; }
    kitchen.on = false; startDay(d);
  };
  $('kcanvas').appendChild(kst.r.domElement); kst.reset();
  $('pickBtn').textContent = pickLabel(); $('pickBtn').onclick = () => { harvest(6, true); renderStock(); };
  renderStage(); renderStock();
}
function renderStock() {
  const el = $('kstock'); if (!el) return;
  el.innerHTML = Object.keys(DESSERTS).filter(id => unlocked(id, game.day) && !DESSERTS[id].drink).map(id => `<div>${icon(id)}×${stockOf(id)}</div>`).join('') + `<div>🍓×${kitchen.berries}</div>`;
}
const ING = { egg: ['🥚', 'Egg'], flour: ['🌾', 'Flour'], cheese: ['🧀', 'Cream cheese'], cookie: ['🍪', 'Cookie crust'], milk: ['🥛', 'Milk'], butter: ['🧈', 'Butter'], choc: ['🍫', 'Chocolate'], pretzel: ['🥨', 'Pretzel'], berry: ['🍓', 'Strawberry'] };
const INGR = { cheesecake: ['cheese', 'egg', 'berry'], donut: ['flour', 'egg', 'milk', 'berry'], kittycupcake: ['egg', 'flour', 'choc', 'berry'], pretzelcake: ['flour', 'butter', 'pretzel'] };
const PRAISE = ['Not bad!', 'Yummy!', 'Perfect!'];
// pick a chip up and drop it on the kitchen picture (a plain tap works too)
function dragChip(el, onDrop) {
  el.addEventListener('pointerdown', e => {
    if (el.disabled) return;
    const ghost = el.cloneNode(true); ghost.className = 'rec ghost'; document.body.appendChild(ghost);
    const x0 = e.clientX, y0 = e.clientY; let moved = 0;
    const over = ev => { const rc = kst.r.domElement.getBoundingClientRect(); return ev.clientX >= rc.left && ev.clientX <= rc.right && ev.clientY >= rc.top && ev.clientY <= rc.bottom; };
    const move = ev => { moved = Math.max(moved, Math.hypot(ev.clientX - x0, ev.clientY - y0)); ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; kst.r.domElement.classList.toggle('drop', over(ev)); };
    move(e);
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); ghost.remove();
      kst.r.domElement.classList.remove('drop');
      if (moved > 10 && over(ev)) onDrop();
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}
const STEP_PRAISE = ['Nice!', 'Great!', 'Perfect!'], POUR_TARGET = 0.72;
// after each graded step a short word of praise pops up over the picture
function sayStep(stars) {
  const holder = $('kcanvas'); if (!holder) return;
  const d = document.createElement('div'); d.className = 'kpraise' + (stars === 3 ? ' big' : ''); d.textContent = STEP_PRAISE[stars - 1] + (stars === 3 ? ' ✨' : '');
  holder.appendChild(d); setTimeout(() => d.remove(), 1200);
  (stars === 3 ? sfx.bell : sfx.pick)();
}
// the first time someone meets a gesture, a hand shows how it goes
const demoSeen = (() => { try { return JSON.parse(localStorage.getItem('miw-cheesecake-rush-demo') || '{}'); } catch { return {}; } })();
function showDemo(kind) {
  const holder = $('kcanvas'); if (!holder || demoSeen[kind]) return;
  demoSeen[kind] = 1; try { localStorage.setItem('miw-cheesecake-rush-demo', JSON.stringify(demoSeen)); } catch {}
  const d = document.createElement('div'); d.className = 'kdemo ' + kind; d.textContent = '👆'; holder.appendChild(d);
  setTimeout(() => d.remove(), 4200);
}
function newStep(kind, id) {
  const base = { kind, id, t0: 0 };
  if (kind === 'add') return { ...base, got: 0, used: INGR[id].map(() => false) };
  if (kind === 'stir') return { ...base, turn: 0 };
  if (kind === 'crush') return { ...base, hits: 0 };
  if (kind === 'press') return { ...base, cover: 0 };
  if (kind === 'deco') return { ...base, placed: [], type: 0 };
  if (kind === 'pour' || kind === 'glaze') return { ...base, holding: false };
  if (kind === 'knead') return { ...base, hits: 0, last: null };
  if (kind === 'roll') return { ...base, prog: 0 };
  if (kind === 'cut') return { ...base, n: 0, miss: 0 };
  if (kind === 'fry') return { ...base, phase: 0, secs: Math.max(6, 8.5 - game.day * 0.2) };
  if (kind === 'sprinkle') return { ...base, n: 0 };
  if (kind === 'bake') return { ...base, timed: !!TIMED_BAKE[id], secs: Math.max(6, 8.5 - game.day * 0.2) };
  return base;
}
function beginRecipe(id) { if (kitchen.overtime) return; kitchen.run = { id, grades: [], idx: 0 }; kitchen.step = newStep(flowOf(id)[0], id); }
// finish a step (with its stars, or null for one that isn't graded) and move on to the recipe's next one
function nextStep(stars) {
  const run = kitchen.run; if (!run) return;
  if (stars != null) { run.grades.push(stars); sayStep(stars); }
  run.idx++;
  kitchen.step = newStep(flowOf(run.id)[run.idx], run.id); renderStage();
}
// a batch can be ruined (overflowed, burnt): it is lost, with a puff of smoke, and you start again
function ruin(why) {
  const st = kitchen.step; if (!st || st.kind === 'ruined') return;
  kst.puff(); sfx.sad();
  kitchen.run = null; kitchen.step = { kind: 'ruined', id: st.id, why }; renderStage();
  if (kitchen.overtime) setTimeout(endKitchenTime, 2400);   // the time was already up: show what went wrong, then go
}
// the last step is done: the batch's stars are the average of every step's grade
function finishBatch(id, last) {
  const grades = [...kitchen.run.grades, last];
  const stars = Math.max(1, Math.min(3, Math.round(grades.reduce((a, b) => a + b, 0) / grades.length)));
  addBatch(id, stars); (stars === 3 ? sfx.fanfare : sfx.serve)(); kst.done();
  kitchen.msg = `${DESSERTS[id].emoji} +${yieldOf(id)} ${'⭐'.repeat(stars)} ${PRAISE[stars - 1]} Pick the next one!`;
  kitchen.run = null; kitchen.step = null; renderStock(); renderStage();
  if (kitchen.overtime) setTimeout(endKitchenTime, 2400);   // the time was already up: show the result, then go
}
// the kitchen time is over: back to the shop (a restock) or open for the day. A batch that is still under way gets to finish first.
function endKitchenTime() {
  if (!kitchen.on || !kitchen.overtime && kitchen.left > 0) return;
  kitchen.overtime = false;
  if (kitchen.resume) closeRestock(); else { kitchen.on = false; toast('⏰ Time to open!'); startDay(game.day); }
}
function tickKitchen(dt, now) {
  const st = kitchen.step; if (!st) return;
  const wrap = $('kmeterwrap'), mk = $('kmeter');
  if ((st.kind === 'bake' && st.timed) || st.kind === 'fry') {
    if (!st.start) st.start = now + (st.kind === 'fry' ? 0.8 : 1.4);   // let the door close and the camera settle first
    const p = Math.max(0, (now - st.start) / st.secs); st.p = p; kst.setHeat(p);
    if (mk) mk.style.left = Math.min(100, p * 100) + '%'; if (wrap) wrap.classList.toggle('warn', p > 0.8 && p < 1);
    if (p >= 1) ruin('burnt');
  } else if (st.kind === 'pour' || st.kind === 'glaze') {
    kst.setPouring(st.holding);
    const L = kst.level(); st.L = L;
    if (mk) mk.style.left = Math.min(100, L * 100) + '%'; if (wrap) { const w = L > 0.84; wrap.classList.toggle('warn', w); if (w && st.holding && Math.floor(now * 6) !== st.tickN) { st.tickN = Math.floor(now * 6); sfx.nope(); } }
    if (L >= 1) ruin(st.kind === 'glaze' ? 'glaze' : 'overflow');
  }
}
function renderStage() {
  const el = $('kstage'), st = kitchen.step; if (!el) return;
  const cv = kst.r.domElement;
  cv.onpointerdown = cv.onpointermove = cv.onpointerup = cv.onpointercancel = null;
  if (!st) {
    kst.set(null);
    const ids = Object.keys(DESSERTS).filter(id => unlocked(id, game.day) && !DESSERTS[id].drink);
    el.innerHTML = `<p class="khint">${kitchen.msg || 'Pick a dessert to bake'}</p><div class="recs">${ids.map(id => `<button class="rec" data-id="${id}"><i>${icon(id)}</i>${DESSERTS[id].name}</button>`).join('')}</div>`;
    el.querySelectorAll('.rec').forEach(b => b.onclick = () => { wakeAudio(); kitchen.msg = ''; const rid = b.dataset.id; if (INGR[rid].includes('berry') && kitchen.berries < 1) { toast('🍓 No strawberries left! Pick some from the garden first'); sfx.nope(); return; } beginRecipe(rid); sfx.tap(); renderStage(); });
  } else if (st.kind === 'ruined') {
    kst.set(null);
    el.innerHTML = `<p class="khint">${st.why === 'burnt' ? '🔥 Oh no, it burnt!' : st.why === 'glaze' ? '🍯 Oh no, way too much glaze!' : '💦 Oh no, it overflowed!'} The whole batch is ruined.</p><button class="go" id="actBtn" style="margin:0 auto">Try again</button>`;
    $('actBtn').onclick = () => { kitchen.msg = ''; kitchen.step = null; renderStage(); };
  } else if (st.kind === 'pour' || st.kind === 'glaze') {
    const gz = st.kind === 'glaze'; kst.set(st.kind, st.id); showDemo('hold');
    el.innerHTML = `<p class="khint">${gz ? '🍯 Hold to dip the donuts, let go in the green. Too deep and the glaze goes everywhere!' : '🫗 Hold to pour, let go in the green. Past the red it overflows!'}</p><div class="meter" id="kmeterwrap"><i class="z0" style="width:62%"></i><i class="z1" style="width:22%"></i><i class="z2" style="width:16%"></i><b id="kmeter"></b></div><button class="go" id="actBtn" style="margin:0 auto;touch-action:none">${gz ? 'Hold to dip' : 'Hold to pour'}</button>`;
    const grab = () => { if (kitchen.step === st && !st.done) { st.holding = true; } };
    const letgo = () => {
      if (!st.holding || kitchen.step !== st) return;
      st.holding = false; kst.setPouring(false);
      const L = kst.level(); if (L < 0.05) return;   // a tap by mistake
      st.done = true; const d = L - POUR_TARGET;
      nextStep(Math.abs(d) <= 0.05 ? 3 : Math.abs(d) <= 0.12 && d <= 0.12 ? 2 : 1);
    };
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} grab(); };
    cv.onpointerup = cv.onpointercancel = letgo;
    const b = $('actBtn'); b.onpointerdown = e => { try { b.setPointerCapture(e.pointerId); } catch {} grab(); }; b.onpointerup = b.onpointercancel = letgo;
  } else if (st.kind === 'crush') {
    kst.set('crush', st.id); showDemo('tap');
    const NEED = 14;
    el.innerHTML = `<p class="khint">🔨 Tap fast to crush the cookies!</p><div class="kpb"><i style="width:${st.hits / NEED * 100}%"></i></div><button class="go" id="actBtn" style="margin:0 auto">Smash!</button>`;
    const bar = el.querySelector('.kpb i');
    const hit = () => {
      if (kitchen.step !== st) return;
      if (!st.t0) st.t0 = performance.now();
      st.hits++; sfx.tap(); kst.crushHit(Math.min(1, st.hits / NEED)); bar.style.width = Math.min(100, st.hits / NEED * 100) + '%';
      if (st.hits >= NEED) { const secs = (performance.now() - st.t0) / 1000; setTimeout(() => { if (kitchen.step === st) nextStep(secs < 5 ? 3 : secs < 8 ? 2 : 1); }, 450); }
    };
    cv.onpointerdown = hit; $('actBtn').onclick = hit;
  } else if (st.kind === 'press') {
    kst.set('press', st.id); showDemo('drag');
    el.innerHTML = `<p class="khint">🥄 Press the crumbs flat: drag over the whole pan!</p><div class="kpb"><i style="width:${st.cover * 100}%"></i></div>`;
    const bar = el.querySelector('.kpb i'); let down = false;
    const act = (e, d) => {
      const c = kst.pressAt(e, d); if (c == null) return;
      if (!st.t0) st.t0 = performance.now();
      st.cover = c; bar.style.width = Math.min(100, c / 0.85 * 100) + '%';
      if (c >= 0.85 && kitchen.step === st) { const secs = (performance.now() - st.t0) / 1000; sfx.pick(); nextStep(secs < 10 ? 3 : secs < 18 ? 2 : 1); }
    };
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} down = true; act(e, true); };
    cv.onpointermove = e => act(e, down);
    cv.onpointerup = cv.onpointercancel = () => { down = false; };
  } else if (st.kind === 'knead') {
    kst.set('knead', st.id); showDemo('tap');
    const NEED = 12;
    el.innerHTML = `<p class="khint">👐 Knead the dough: press left, right, left, right!</p><div class="kpb"><i style="width:${st.hits / NEED * 100}%"></i></div><div class="recs"><button class="rec" data-s="0">👈 Left</button><button class="rec" data-s="1">Right 👉</button></div>`;
    const bar = el.querySelector('.kpb i');
    const press = side => {
      if (kitchen.step !== st || st.hits >= NEED) return;
      if (st.last === side) { sfx.nope(); return; }   // alternate!
      if (!st.t0) st.t0 = performance.now();
      st.last = side; st.hits++; sfx.tap(); kst.kneadHit(side, st.hits / NEED); bar.style.width = st.hits / NEED * 100 + '%';
      if (st.hits >= NEED) { const secs = (performance.now() - st.t0) / 1000; setTimeout(() => { if (kitchen.step === st) nextStep(secs < 6 ? 3 : secs < 10 ? 2 : 1); }, 450); }
    };
    el.querySelectorAll('.rec').forEach(b => b.onclick = () => press(+b.dataset.s));
    cv.onpointerdown = e => { const rc = cv.getBoundingClientRect(); press(e.clientX < rc.left + rc.width / 2 ? 0 : 1); };
  } else if (st.kind === 'roll') {
    kst.set('roll', st.id); showDemo('drag');
    el.innerHTML = `<p class="khint">🪵 Roll the dough flat: drag the rolling pin back and forth!</p><div class="kpb"><i style="width:${st.prog * 100}%"></i></div>`;
    const bar = el.querySelector('.kpb i'); let down = false;
    const act = (e, d) => {
      const c = kst.rollAt(e, d); if (c == null) return;
      if (!st.t0 && d) st.t0 = performance.now();
      st.prog = c; bar.style.width = c * 100 + '%';
      if (c >= 1 && kitchen.step === st) { const secs = (performance.now() - st.t0) / 1000; sfx.pick(); nextStep(secs < 9 ? 3 : secs < 16 ? 2 : 1); }
    };
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} down = true; act(e, true); };
    cv.onpointermove = e => act(e, down);
    cv.onpointerup = cv.onpointercancel = e => { down = false; act(e, false); };
  } else if (st.kind === 'cut') {
    kst.set('cut', st.id); showDemo('tap');
    el.innerHTML = `<p class="khint">⭕ Tap each ring to cut out a donut! (${st.n}/6)</p>`;
    cv.onpointerdown = e => {
      if (kitchen.step !== st || st.n >= 6) return;
      const n = kst.cutAt(e);
      if (n < 0) { st.miss++; sfx.nope(); return; }
      if (!st.t0) st.t0 = performance.now();
      st.n = n; sfx.tap(); el.querySelector('.khint').textContent = `⭕ Tap each ring to cut out a donut! (${n}/6)`;
      if (n >= 6) { const secs = (performance.now() - st.t0) / 1000; setTimeout(() => { if (kitchen.step === st) nextStep(Math.max(1, (secs < 7 ? 3 : secs < 12 ? 2 : 1) - (st.miss > 3 ? 1 : 0))); }, 600); }
    };
  } else if (st.kind === 'fry') {
    kst.set('fry', st.id);
    el.innerHTML = `<p class="khint">${st.phase ? '🍩 Now the other side! Take them out when golden.' : '🍩 Flip the donuts when the first side is golden!'}</p><div class="meter" id="kmeterwrap"><i class="z0" style="width:55%"></i><i class="z1" style="width:27%"></i><i class="z2" style="width:18%"></i><b id="kmeter"></b></div><button class="go" id="actBtn" style="margin:0 auto">${st.phase ? 'Take out!' : 'Flip!'}</button>`;
    $('actBtn').onclick = () => {
      if (kitchen.step !== st || !st.start || st.p == null || st.p < 0.02) return;
      const p = st.p, g = p >= 0.62 && p <= 0.76 ? 3 : p >= 0.55 && p <= 0.82 ? 2 : 1;
      if (!st.phase) { st.g1 = g; st.phase = 1; st.start = 0; st.p = null; kst.flip(); sfx.pick(); renderStage(); return; }
      kst.takeOut(g); nextStep(Math.max(1, Math.min(3, Math.round((st.g1 + g) / 2))));
    };
  } else if (st.kind === 'sprinkle') {
    kst.set('sprinkle', st.id); showDemo('tap');
    const NEED = 6;
    el.innerHTML = `<p class="khint">🌈 Shake the sprinkles over the donuts!</p><div class="kpb"><i style="width:${st.n / NEED * 100}%"></i></div><button class="go" id="actBtn" style="margin:0 auto">Shake!</button>`;
    const bar = el.querySelector('.kpb i');
    const shake = () => {
      if (kitchen.step !== st || st.n >= NEED) return;
      if (!st.t0) st.t0 = performance.now();
      st.n++; kst.sprinkle(st.n); bar.style.width = st.n / NEED * 100 + '%';
      if (st.n >= NEED) { const secs = (performance.now() - st.t0) / 1000; setTimeout(() => { if (kitchen.step === st) finishBatch(st.id, secs < 4 ? 3 : secs < 7 ? 2 : 1); }, 700); }
    };
    cv.onpointerdown = shake; $('actBtn').onclick = shake;
  } else if (st.kind === 'add') {
    kst.set('add', st.id);
    const ing = INGR[st.id];
    el.innerHTML = `<p class="khint">🥣 Drag the ingredients into the bowl! (${st.got}/${ing.length})</p><div class="recs">${ing.map((k, i) => `<button class="rec ing" data-i="${i}" ${st.used[i] ? 'disabled' : ''}>${ING[k][0]}<small>${ING[k][1]}</small></button>`).join('')}</div>`;
    el.querySelectorAll('.rec.ing').forEach(b => {
      const i = +b.dataset.i;
      const drop = () => {
        if (st.used[i]) return;
        if (kst.busy()) { sfx.nope(); return; }   // one at a time: wait for this one to go in
        st.used[i] = true; st.got++; sfx.pick(); kst.addIngredient(ing[i]);
        if (ing[i] === 'berry') { kitchen.berries--; updateBerryHud(); }
        if (st.got >= ing.length) kst.afterAnims(() => { if (kitchen.step === st) nextStep(null); });
        renderStage();
      };
      b.onclick = drop; dragChip(b, drop);
    });
  } else if (st.kind === 'stir') {
    kst.set('stir', st.id);
    el.innerHTML = `<p class="khint">🥄 Stir in circles around the bowl!</p><div class="kpb"><i style="width:${Math.min(100, st.turn / (6 * PI) * 100)}%"></i></div><button class="alt" id="actBtn" style="margin:0 auto">or tap here to stir</button>`;
    const bar = el.querySelector('.kpb i');
    const advance = d => {
      if (!st.t0) st.t0 = performance.now();
      st.turn += d; bar.style.width = Math.min(100, st.turn / (6 * PI) * 100) + '%';
      if (st.turn >= 6 * PI) { const secs = (performance.now() - st.t0) / 1000; nextStep(secs < 7 ? 3 : secs < 12 ? 2 : 1); }
    };
    let last = null, down = false;
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} down = true; last = kst.angleAt(e); };
    cv.onpointermove = e => {
      if (!down) return;
      const a = kst.angleAt(e); if (a === null) return;
      if (last === null) { last = a; return; }
      let d = a - last; if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI;
      last = a; kst.stirTo(a, Math.abs(d)); advance(Math.abs(d));
    };
    cv.onpointerup = cv.onpointercancel = () => { down = false; last = null; };
    let tapA = 0;
    $('actBtn').onclick = () => { tapA += 1.6; kst.stirTo(tapA, 1.6); sfx.tap(); advance(1.6); };
  } else if (st.kind === 'bake' && st.timed) {
    kst.set('bake', st.id);
    el.innerHTML = `<p class="khint">🔥 Take it out when it's golden. Don't let it burn!</p><div class="meter" id="kmeterwrap"><i class="z0" style="width:55%"></i><i class="z1" style="width:27%"></i><i class="z2" style="width:18%"></i><b id="kmeter"></b></div><button class="go" id="actBtn" style="margin:0 auto">Take out!</button>`;
    $('actBtn').onclick = () => {
      if (kitchen.step !== st || !st.start || st.p == null || st.p < 0.02) return;
      const p = st.p, stars = p >= 0.62 && p <= 0.76 ? 3 : p >= 0.55 && p <= 0.82 ? 2 : 1;
      kst.takeOut(stars); nextStep(stars);
    };
  } else if (st.kind === 'bake') {
    kst.set('bake', st.id);
    const c = 0.3 + Math.random() * 0.4;
    el.innerHTML = `<p class="khint">🔥 Take it out when the marker is in the green!</p><div class="oven"><i class="zone" style="left:${(c - 0.11) * 100}%;width:22%"></i><i class="inner" style="left:${(c - 0.05) * 100}%;width:10%"></i><b id="kmark"></b></div><button class="go" id="actBtn" style="margin-top:0">Take out!</button>`;
    $('actBtn').onclick = () => {
      const d = Math.abs((st.pos ?? 0.5) - c), stars = d <= 0.05 ? 3 : d <= 0.11 ? 2 : 1;
      kst.takeOut(stars); nextStep(stars);
    };
  } else if (st.kind === 'deco') {
    kst.set('deco', st.id);
    el.innerHTML = `<p class="khint">🎀 Tap the cake to place toppings! (${st.placed.length}/4)</p><div class="recs">${['🍓', '🍫', '✨'].map((t, i) => `<button class="rec top ${st.type === i ? 'sel' : ''}" data-i="${i}">${t}</button>`).join('')}</div>`;
    el.querySelectorAll('.rec.top').forEach(b => b.onclick = () => { st.type = +b.dataset.i; sfx.tap(); renderStage(); });
    cv.onpointerdown = e => {
      const p = kst.cakePoint(e);
      if (!p) { sfx.nope(); return; }
      st.placed.push([p.x, p.z]); kst.place(st.type, p); sfx.tap(); st.type = (st.type + 1) % 3;
      if (st.placed.length < 4) return renderStage();
      // neat, spread-out toppings score higher
      let gap = 9; st.placed.forEach((a, i) => st.placed.forEach((b, j) => { if (j > i) gap = Math.min(gap, Math.hypot(a[0] - b[0], a[1] - b[1])); }));
      finishBatch(st.id, gap >= 0.32 ? 3 : gap >= 0.2 ? 2 : 1);
    };
  }
}

// ---------- days ----------
function startDay(d) {
  customers.forEach(c => { removeActor(c.actor); c.bubble.remove(); });
  TABLES.forEach(t => { t.food.forEach(m => scene.remove(m)); t.food = []; t.customer = null; });
  queue.forEach(a => a.mark.remove());
  customers = []; queue = []; hands = []; payQueue.length = 0; pay.c = null; $('pay').hidden = true;
  Object.assign(game, { day: d, running: true, paused: false, open: true, time: DAY_SECONDS, coins: 0, shown: 0, combo: 0, served: 0, missed: 0, spawnIn: 1.2 });
  miw.root.position.copy(HOME); miw.target = null; miw.path = null; miw.face = 0;
  renderHands(); dressStations(); dressTables(); showCombo(); updateBerryHud();
  $('dayName').textContent = `Day ${d}`;
  $('overlay').hidden = true;
  const fresh = Object.keys(DESSERTS).find(id => DESSERTS[id].day === d && d > 1);
  toast(fresh ? `New on the menu: ${DESSERTS[fresh].name}! ${DESSERTS[fresh].emoji}` : `Day ${d}: earn ${goalFor(d)} 🪙`);
  sfx.fanfare();
}
function endDay() {
  game.running = false;
  $('panel').classList.remove('wide');
  hands.forEach(id => { if (!DESSERTS[id].drink) kitchen.stock[id]++; }); hands = []; renderHands();
  const goal = goalFor(game.day), won = game.coins >= goal;
  const stars = !won ? 0 : game.coins >= goal * 1.7 ? 3 : game.coins >= goal * 1.35 ? 2 : 1;
  save.total = (save.total || 0) + game.coins;
  if (won) { save.day = Math.max(save.day, game.day + 1); save.best = Math.max(save.best, game.day); sfx.fanfare(); } else sfx.sad();
  store();
  $('panel').innerHTML = `
    <h2>${won ? 'Shop closed! 🎉' : 'Not quite… 🥺'}</h2>
    <p>Day ${game.day} · goal ${goal} 🪙</p>
    <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s">⭐</span>`).join('')}</div>
    <div class="stats"><div><b>${game.coins}</b><span>coins</span></div><div><b>${game.served}</b><span>happy friends</span></div><div><b>${game.missed}</b><span>left hungry</span></div></div>
    <button class="go" id="goBtn">${won ? `Open day ${game.day + 1} →` : `Try day ${game.day} again`}</button>
    ${won ? `<button class="alt" id="againBtn">Replay day ${game.day}</button>` : ''}`;
  $('overlay').hidden = false;
  $('goBtn').onclick = () => openKitchen(won ? game.day + 1 : game.day);
  if (won) $('againBtn').onclick = () => openKitchen(game.day);
}
// load every model, then refresh the pictures that use them
['cat', 'bunny', 'bear', 'frog', 'chick', 'penguin', 'miw', 'cheesefull', 'pretzelfull'].forEach(sp => loadModel(sp));
Object.keys(DESSERTS).filter(id => DESSERTS[id].drink).forEach(id => makeThumb(id));
Object.keys(DESSERTS).filter(id => !DESSERTS[id].drink).forEach(id => loadModel(id, () => {
  makeThumb(id); dressStations(); renderHands();
  customers.forEach(c => c.state === 'wait' && drawBubble(c));
}));

// ---------- loop ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1), now = clock.elapsedTime;
  if (typeof homeTick === 'function') homeTick(now);
  if (kitchen.on && !menuOpen) {
    kst.update(dt, now); tickKitchen(dt, now);
    kitchen.left -= dt;
    const ks = $('ksec'), kb = $('kbar');
    if (ks) ks.textContent = kitchen.overtime ? 'finish it!' : Math.max(0, Math.ceil(kitchen.left)) + 's';
    if (kb) kb.firstElementChild.style.width = Math.max(0, kitchen.left / kitchen.total * 100) + '%';
    if (kitchen.step && kitchen.step.kind === 'bake') {
      kitchen.step.pos = 0.5 + 0.5 * Math.sin(now * (2.2 + game.day * 0.2));
      const m = $('kmark'); if (m) m.style.left = kitchen.step.pos * 100 + '%';
    }
    if (kitchen.left <= 0) {
      kitchen.left = 0;
      if (kitchen.run && kitchen.step && kitchen.step.kind !== 'ruined') { if (!kitchen.overtime) { kitchen.overtime = true; toast('⏰ Time is up: finish the batch you started! 🍰'); } }
      else if (!kitchen.overtime) endKitchenTime();
    }
  }
  if (game.running && !game.paused && !menuOpen) {
    if (game.open) {
      game.time -= dt;
      if ((game.spawnIn -= dt) <= 0) { spawn(); game.spawnIn = Math.max(6, 9.5 - (game.day - 1) * 0.25) * (0.7 + Math.random() * 0.6); }
      if (game.time <= 0) { game.time = 0; game.open = false; toast('🔔 Last orders! Serve the friends still here'); sfx.bell(); }
    } else if (!customers.length) endDay();
    nextAction(dt);
    stepCustomers(dt);
  }
  if (!game.paused && !menuOpen) stepActor(miw, dt);   // frozen while the shop is paused, so she can't finish a job behind the kitchen or the menu
  STATIONS.forEach((st, i) => { st.show.rotation.y = now * 0.6 + i; });
  updateDoor(dt);
  pond[1].face += dt * 0.6; baker.hop = payQueue.some(c => c.state === 'pay'); [...pond, baker].forEach(a => stepActor(a, dt)); worldFx(now, dt);
  plot.timer += dt; if (plot.timer >= 6) { plot.timer = 0; if (plot.ready < plot.max) { plot.ready++; setPlotView(); if ($('pickBtn')) $('pickBtn').textContent = pickLabel(); } }
  if (baker.look && !baker.fallback && !baker.hat) { baker.hat = true; const hat = new THREE.Group(); hat.add(mesh(cyl(0.2, 0.22, 0.2, 14), '#ffffff', { y: 0.44 }), mesh(sph(0.26, 12), '#ffffff', { y: 0.62, s: [1, 0.8, 1] })); baker.look.head.add(hat); }
  sign.rotation.y = Math.sin(now * 0.8) * 0.15;
  // the HUD
  game.shown += (game.coins - game.shown) * Math.min(1, dt * 8);
  const goal = goalFor(game.day);
  $('coins').textContent = `${Math.round(game.shown)} / ${goal} 🪙`;
  $('bar').firstElementChild.style.width = Math.min(100, game.shown / goal * 100) + '%';
  $('bar').classList.toggle('met', game.coins >= goal);
  const s = Math.ceil(game.time);
  $('time').textContent = `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`;
  $('clockNote').textContent = game.running && !game.open ? 'closing' : '';
  $('clock').classList.toggle('hurry', game.running && game.open && game.time < 10);
  placeLabels();
  renderer.render(scene, camera);
}
dressStations(); dressTables(); renderHands();
frame();
