// ---------- dishes: every dessert is served on a clean plate; after eating, the plates stay on the table until the bunny collects them and washes them at the sink ----------
// the pager button calls the bunny out of the kitchen. If dirty plates pile up and the clean ones run out, nothing more can be served.
const dish = { plates: 8, total: 8, state: 'idle', queue: [], carried: 0, washT: 0, wait: 0 };
const platesTotal = () => 8 + 2 * (save.caseLv || 0);   // a bigger case comes with a bigger stack of plates
const SINK_SPOT = new THREE.Vector3(1.95, 0.5, -6.75), SINK_FACE = 2.36, BAKER_HOME = new THREE.Vector3(-0.6, 0.5, -5.8);

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
const bunnyWashes = () => !!save.dishwasher && game.day >= STAFF_FROM;   // from day 4 the bunny can be hired; until then Miw washes up herself
// Miw's own little stack of dirty plates, carried on a second tray beside the one for desserts
miw.dishTray = new THREE.Group(); miw.dishTray.position.set(0.5, 0.95, 0.35); miw.root.add(miw.dishTray); miw.dishTray.visible = false;
miw.dishTray.add(mesh(cyl(0.3, 0.27, 0.04, 20), '#ffffff'));
miw.dishStack = new THREE.Group(); miw.dishStack.position.y = 0.04; miw.dishTray.add(miw.dishStack);
function renderMiwStack() {
  miw.dishStack.clear(); miw.dishTray.visible = dish.carried > 0 && dish.state !== 'collect' && dish.state !== 'return' && dish.state !== 'wash';
  for (let i = 0; i < Math.min(dish.carried, 8); i++) miw.dishStack.add(mesh(cyl(0.22, 0.19, 0.04, 14), '#ffffff', { y: i * 0.045, cast: false }), mesh(cyl(0.13, 0.13, 0.012, 10), '#d9b38c', { y: i * 0.045 + 0.025, cast: false }));
}
// Miw's way of washing up: go to each dirty table, pick the plates up, carry them to the sink and wash them there
function dishCollect(t) { if (!t.dirtyN) return; dish.carried += t.dirtyN; clearDirty(t); renderMiwStack(); sfx.pick(); }
// Miw at the sink: both arms scrub, one plate at a time is lifted over the basin, scrubbed clean under the tap and set on the rack
const washPlate = new THREE.Group(); scene.add(washPlate); washPlate.visible = false;
washPlate.add(mesh(cyl(0.26, 0.22, 0.05, 18), '#ffffff', { cast: false }));
const washSmear = mesh(cyl(0.17, 0.17, 0.015, 14), '#d9b38c', { y: 0.03, cast: false }); washPlate.add(washSmear);
const faucetFlow = mesh(cyl(0.014, 0.014, 0.2, 6), '', { x: 2.55, y: 1.67, z: -7.5, cast: false, mat: new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.65 }) }); faucetFlow.visible = false; scene.add(faucetFlow);
const lerp = (a, b, k) => a + (b - a) * k; let washPosed = false;
// the wash card: the player scrubs each plate clean with a sponge. A canvas shows the plate with its crusts of food; rubbing wipes them away under a cloud of foam.
// ----- the wash card: a little 3D sink. The plate is held in a tub of foamy water and the player rubs a sponge over it to wipe the crusts away -----
const DW = 256, dirtC = document.createElement('canvas'), tinyC = document.createElement('canvas');
dirtC.width = dirtC.height = DW; tinyC.width = tinyC.height = 64;
const DX = dirtC.getContext('2d'), TX = tinyC.getContext('2d', { willReadFrequently: true });
const wash = { open: false, down: false, last: null, remain: 1, fly: 0, drop: 0, n: 0, tick: 0, spongeP: new THREE.Vector3(0.5, 0.9, 1.2) };
const w3 = (() => {
  const W = 380, H = 285, r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.setSize(W, H, false); r.setClearColor('#a3c9db'); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.domElement.id = 'washCv'; r.domElement.style.cssText = 'width:100%;aspect-ratio:4/3;height:auto;display:block;border-radius:14px;touch-action:none;cursor:none';
  const old = $('washCv'); if (old) old.replaceWith(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 40); cam.position.set(0.0, 5.6, 5.4); cam.lookAt(0.0, -0.1, 0.55);
  sc.add(new THREE.HemisphereLight(0xf6f9ff, 0x7894a6, 0.72)); const sun = new THREE.DirectionalLight(0xfff6e8, 0.62); sun.position.set(-3, 6, 4); sc.add(sun);
  const M = (c, o = {}) => new THREE.MeshPhongMaterial(Object.assign({ color: c, shininess: 60 }, o));
  // the counter and the tub
  const table = new THREE.Mesh(new THREE.PlaneGeometry(20, 14).rotateX(-PI / 2), M('#e6bccb', { shininess: 20 })); table.position.y = -1.0; sc.add(table);
  // a square tub: a floor and four thick walls of china
  const tub = new THREE.Group(); sc.add(tub); const tubM = M('#e9eff5', { shininess: 90, specular: 0x667788 });
  const wall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tubM); m.position.set(x, y, z); tub.add(m); };
  wall(7.0, 0.2, 5.4, 0, -0.9, 0.55);                                 // the floor
  wall(7.0, 1.7, 0.3, 0, -0.05, -2.1); wall(7.0, 1.7, 0.3, 0, -0.05, 3.2);   // back and front
  wall(0.3, 1.7, 5.4, -3.35, -0.05, 0.55); wall(0.3, 1.7, 5.4, 3.35, -0.05, 0.55);   // the sides
  const waterGeo = new THREE.PlaneGeometry(6.4, 5.0, 36, 28).rotateX(-PI / 2); waterGeo.translate(0, 0, 0.55); const waterBase = waterGeo.attributes.position.array.slice();
  const water = new THREE.Mesh(waterGeo, M('#58b4d6', { transparent: true, opacity: 0.85, shininess: 120, specular: 0xccddee })); water.position.y = 0.38; sc.add(water);
  const FOAMN = 150, foamGeo = new THREE.SphereGeometry(1, 10, 8), foam = new THREE.InstancedMesh(foamGeo, M('#f5f8fc', { shininess: 80, specular: 0xaabbcc, transparent: true, opacity: 0.92, emissive: 0x2a3340 }), FOAMN);
  const foamData = Array.from({ length: FOAMN }, () => { return { x: (Math.random() - 0.5) * 6.0, z: -1.6 + Math.random() * 4.4, s: 0.1 + Math.random() * 0.2, ph: Math.random() * 9 }; });
  sc.add(foam);
  // the plate: white china with a layer of crust on it, held up out of the water at a slant
  const plateG = new THREE.Group(); sc.add(plateG);
  const dishM = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [1.25, 0], [1.5, 0.12], [1.62, 0.2], [1.62, 0.26], [1.5, 0.22], [1.3, 0.1], [0.001, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)), 40), M('#ffffff', { shininess: 100, specular: 0xaaaaaa, side: THREE.DoubleSide })); plateG.add(dishM);
  const dirtTex = new THREE.CanvasTexture(dirtC); dirtTex.anisotropy = 4;
  const dirtMesh = new THREE.Mesh(new THREE.CircleGeometry(1.28, 40).rotateX(-PI / 2), new THREE.MeshPhongMaterial({ map: dirtTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, shininess: 30 })); dirtMesh.position.y = 0.075; plateG.add(dirtMesh);
  // the sponge
  const spongeG = new THREE.Group(); sc.add(spongeG);
  const spo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.65), M('#ffd84d', { shininess: 20 })); const scr = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.14, 0.67), M('#6fcf8f', { shininess: 10 })); scr.position.y = 0.3; spongeG.add(spo, scr);
  for (let k = 0; k < 6; k++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), M('#d9b43a')); h.position.set(-0.4 + k * 0.16, 0.05 + (k % 2) * 0.08, 0.34); spongeG.add(h); }
  // the tap, with its stream into the tub
  const tap = new THREE.Group(); sc.add(tap);
  { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.0, 14), M('#c9d2da', { shininess: 120, specular: 0xffffff })); post.position.set(0.8, 0.1, -2.35);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.2, 12).rotateX(PI / 2), M('#c9d2da', { shininess: 120, specular: 0xffffff })); spout.position.set(0.8, 1.05, -1.85); tap.add(post, spout); }
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1, 8), new THREE.MeshPhongMaterial({ color: '#cfeeff', transparent: true, opacity: 0.6, shininess: 100 })); stream.position.set(0.8, 0.72, -1.3); stream.scale.y = 0.65; sc.add(stream);
  // bubbles that rise where the sponge scrubs, and pop
  const bubbles = Array.from({ length: 50 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshPhongMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, shininess: 140, specular: 0xffffff, depthWrite: false })); m.visible = false; sc.add(m); return { m, age: 9, life: 1, v: new THREE.Vector3() }; });
  // the rack of clean plates, standing on the counter in front of the tub
  const rack = new THREE.Group(); rack.position.set(3.4, -0.95, 1.7); sc.add(rack); const rackPl = Array.from({ length: 14 }, (_, k) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 0.07, 22), M(k % 2 ? '#ffffff' : '#ffe3ec')); m.position.y = 0.04 + k * 0.085; rack.add(m); return m; });
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), slantQ = new THREE.Quaternion();
  return { r, sc, cam, water, waterBase, waterGeo, foam, foamData, plateG, dirtTex, dirtMesh, spongeG, stream, bubbles, rack, rackPl, tmpM, tmpV, tmpQ, tmpS, ray, ndc, slantQ, W, H };
})();
const wasHome = new THREE.Vector3(0.0, 0.62, 0.7);   // where the plate rests while it is scrubbed
function washBubble(at, n = 1) { for (let i = 0; i < n; i++) { const b = w3.bubbles.find(q => q.age >= q.life); if (!b) return; b.age = 0; b.life = 0.6 + Math.random() * 0.7; b.m.position.copy(at).add(w3.tmpV.set((Math.random() - 0.5) * 0.7, 0.1, (Math.random() - 0.5) * 0.5)); b.v.set((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4); b.size = 0.5 + Math.random() * 1.1; b.m.visible = true; } }
function dirtyPlateArt() {   // sauce smears, crumbs and crusts, all on the plate's flat middle
  DX.clearRect(0, 0, DW, DW); DX.lineCap = 'round';
  const cols = ['#a3652f', '#c98b4b', '#e07a8c', '#8a4f2a', '#d9a05f'], C = DW / 2;
  for (let k = 0; k < 9; k++) { const a = Math.random() * PI * 2, r = Math.random() * 60; let x = C + Math.cos(a) * r, y = C + Math.sin(a) * r; DX.strokeStyle = cols[k % 5]; DX.globalAlpha = 0.9; DX.lineWidth = 9 + Math.random() * 12; DX.beginPath(); DX.moveTo(x, y); for (let m = 0; m < 3; m++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 40; const d = Math.hypot(x - C, y - C); if (d > 94) { x = C + (x - C) * 94 / d; y = C + (y - C) * 94 / d; } DX.lineTo(x, y); } DX.stroke(); }
  for (let k = 0; k < 16; k++) { const a = Math.random() * PI * 2, r = Math.random() * 88; DX.globalAlpha = 0.95; DX.fillStyle = cols[(Math.random() * 5) | 0]; DX.beginPath(); DX.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 3 + Math.random() * 4, 0, PI * 2); DX.fill(); }
  DX.globalAlpha = 1; w3.dirtTex.needsUpdate = true; wash.total = Math.max(1, dirtLeft(true)); wash.remain = 1; dish.remain = 1;
}
function dirtLeft(raw) { TX.clearRect(0, 0, 64, 64); TX.drawImage(dirtC, 0, 0, 64, 64); const d = TX.getImageData(0, 0, 64, 64).data; let c = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 60) c++; return raw ? c : c / wash.total; }
function washBar() { $('washBar').style.width = Math.min(100, ((wash.n + (1 - Math.max(0, wash.remain))) / Math.max(1, dish.wTotal) * 100)) + '%'; }
function washHead() { $('washHead').textContent = `🧽 Scrub the plate clean! (${Math.min(dish.wTotal, wash.n + 1)}/${dish.wTotal})`; }
function nextWashPlate() {
  if (dish.carried <= 0) return closeWash(true);
  dirtyPlateArt(); wash.drop = 1; washHead(); washBar();
}
function plateDone() {   // it is spotless: out of the water and onto the rack, and the next one is dipped in
  wash.n++; dish.carried = Math.max(0, dish.carried - 1); dish.plates = Math.min(dish.total, dish.plates + 1); dish.flyT = 0.35; showRack(); renderMiwStack();
  wash.fly = 1; wash.remain = 1; dish.remain = 1; washBar(); sfx.coin(); tone(1200, 0.05, 0.1, 'triangle', 0.05);
  const f = document.createElement('div'); f.className = 'wflash'; f.textContent = '✨ Clean!'; $('wash').appendChild(f); setTimeout(() => f.remove(), 900);
}
// the pointer: the sponge follows it over the plate, and rubbing wipes the crust under it
function washAim(e) {
  const r = w3.r.domElement.getBoundingClientRect(); w3.ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)); w3.ray.setFromCamera(w3.ndc, w3.cam);
  w3.plateG.updateMatrixWorld(true); const hit = w3.ray.intersectObject(w3.dirtMesh)[0];
  if (hit) return { hit, p: hit.point.clone(), uv: hit.uv };
  const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9), p = w3.ray.ray.intersectPlane(pl, new THREE.Vector3());   // off the plate: just above the water
  return { hit: null, p: p || wash.spongeP, uv: null };
}
function scrubUV(uv) {
  const x = uv.x * DW, y = (1 - uv.y) * DW, l = wash.last || { x, y };
  DX.globalCompositeOperation = 'destination-out'; DX.lineCap = 'round'; DX.lineWidth = 40; DX.beginPath(); DX.moveTo(l.x, l.y); DX.lineTo(x, y); DX.stroke(); DX.globalCompositeOperation = 'source-over'; w3.dirtTex.needsUpdate = true;
  const d = Math.hypot(x - l.x, y - l.y); wash.last = { x, y };
  if (d > 0.5) {
    dish.scrub = Math.min(1, (dish.scrub || 0) + d / 50); if (Math.random() < Math.min(1, d / 10)) washBubble(w3.spongeG.position, 1 + (d > 20 ? 1 : 0));
    if ((wash.tick += d) > 22) { wash.tick = 0; tone(1500 + Math.random() * 900, 0, 0.025, 'sine', 0.02); wash.remain = dirtLeft(false); dish.remain = wash.remain; washBar(); if (wash.remain <= 0.07 && !wash.fly) plateDone(); }
  }
}
const WCV = w3.r.domElement;
WCV.onpointerdown = e => { try { WCV.setPointerCapture(e.pointerId); } catch {} wash.down = true; wash.last = null; const a = washAim(e); wash.spongeP.copy(a.p); if (a.uv && wash.open && !wash.fly) scrubUV(a.uv); };
WCV.onpointermove = e => { const a = washAim(e); wash.spongeP.copy(a.p); if (wash.down && a.uv && wash.open && !wash.fly) scrubUV(a.uv); else if (!a.uv) wash.last = null; };
WCV.onpointerup = WCV.onpointercancel = () => { wash.down = false; wash.last = null; };
let washRaf = 0, washLastT = 0;
function washTick(dt, now) {
  const { sc, plateG, water, waterBase, waterGeo, foam, foamData, spongeG, stream, bubbles, rack, rackPl, tmpM, tmpQ, tmpS, tmpV } = w3, t = now / 1000, sc1 = dish.scrub || 0;
  dish.scrub = Math.max(0, sc1 - dt * 3);
  // water ripples, swelling where the sponge works
  const pa = waterGeo.attributes.position; for (let i = 0; i < pa.count; i++) { const x = waterBase[i * 3], z = waterBase[i * 3 + 2], d = Math.hypot(x - 0.0, z - 0.7); pa.array[i * 3 + 1] = 0.03 * Math.sin(x * 2.4 + t * 1.8) + 0.025 * Math.sin(z * 3 - t * 1.4) + (0.06 + 0.1 * sc1) * Math.sin(d * 6 - t * 7) * Math.exp(-d * 0.9); }
  pa.needsUpdate = true; waterGeo.computeVertexNormals();
  // foam bobbing on the water; it parts around the plate and gathers where the sponge is
  for (let i = 0; i < foamData.length; i++) { const f = foamData[i]; const dx = f.x - wash.spongeP.x, dz = f.z - wash.spongeP.z, near = Math.exp(-(dx * dx + dz * dz) * 0.8) * sc1; const sw = 1 + near * 0.9 + 0.08 * Math.sin(t * 2.2 + f.ph); tmpS.set(f.s * sw, f.s * 0.8 * sw, f.s * sw); tmpV.set(f.x, 0.4 + f.s * 0.5 + near * 0.12 + 0.02 * Math.sin(t * 1.6 + f.ph), f.z); tmpM.compose(tmpV, tmpQ.identity(), tmpS); foam.setMatrixAt(i, tmpM); }
  foam.instanceMatrix.needsUpdate = true;
  // the plate rests slanted in the water; when it is done it flies to the rack, and the next one drops in
  const slant = -0.28 + 0.02 * Math.sin(t * 2);
  if (wash.fly > 0) {
    wash.fly -= dt * 2.6; const m = 1 - Math.max(0, wash.fly); plateG.position.set(lerp(wasHome.x, 3.4, m), lerp(wasHome.y, -0.4, m) + Math.sin(m * PI) * 1.1, lerp(wasHome.z, 1.7, m)); plateG.rotation.set(slant * (1 - m), m * 2.2, 0);
    if (wash.fly <= 0) { wash.fly = 0; nextWashPlate(); }
  } else if (wash.drop > 0) {
    wash.drop = Math.max(0, wash.drop - dt * 2.4); plateG.position.set(wasHome.x, wasHome.y + wash.drop * 2.6, wasHome.z); plateG.rotation.set(slant, 0, 0);
  } else { plateG.position.copy(wasHome); plateG.position.y += 0.03 * Math.sin(t * 1.8); plateG.rotation.set(slant, 0.15 * Math.sin(t * 0.9), 0); }
  plateG.visible = true; w3.dirtMesh.visible = !wash.fly;
  // the sponge follows the pointer, squashing when it presses
  const press = wash.down ? 1 : 0, aim = tmpV.copy(wash.spongeP); aim.y = Math.max(aim.y, 0.45) + 0.28 + (press ? 0 : 0.35);
  spongeG.position.lerp(aim, Math.min(1, dt * 18)); spongeG.rotation.set(slant, -0.35, 0.08 * Math.sin(t * 18) * sc1); spongeG.scale.set(0.7, 0.7 * (1 - 0.18 * press), 0.7);
  // the tap runs; rings and bubbles
  stream.scale.set(1 + 0.12 * Math.sin(t * 22), 0.65, 1 + 0.12 * Math.sin(t * 22 + 1));
  bubbles.forEach(b => { if (b.age >= b.life) { b.m.visible = false; return; } b.age += dt; const u = b.age / b.life; b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(b.size * (u < 0.8 ? 0.6 + 0.4 * u : 1.4 - (u - 0.8) * 2)); b.m.material.opacity = 0.7 * (u < 0.8 ? 1 : (1 - u) * 5); });
  rackPl.forEach((m, k) => { m.visible = k < Math.min(rackPl.length, dish.plates); });
  w3.r.render(sc, w3.cam);
}
function washLoop(now) {
  if (!wash.open) { washRaf = 0; return; }
  const dt = Math.min(0.05, (now - washLastT) / 1000 || 0.016); washLastT = now; washTick(dt, now); washRaf = requestAnimationFrame(washLoop);
}
function openWash() {
  wash.open = true; wash.n = 0; wash.fly = 0; wash.down = false; wash.last = null; dish.wTotal = dish.carried; dish.scrub = 0;
  $('wash').hidden = false; nextWashPlate(); washLastT = performance.now(); if (!washRaf) washRaf = requestAnimationFrame(washLoop);
}
// done, or "later": the card goes away and Miw is free again; plates she has not washed stay on her tray
function closeWash(done) {
  const was = wash.open; wash.open = false; $('wash').hidden = true; wash.down = false;
  if (dish.state === 'selfwash') { dish.state = 'idle'; miwPause = 0; renderMiwStack(); }
  if (was && done) { toast('🍽 Clean plates ready!'); sfx.fanfare(); }
}
$('washX').onclick = () => closeWash(false);

// Miw at the sink: while the card is open she leans over the basin and her arms scrub as hard as the player does; the plate she holds loses its crust as it is wiped clean
function miwWashPose() {
  const w = dish.state === 'selfwash' && wash.open && !game.paused, look = miw.look;
  if (!w || !look) {
    washPlate.visible = faucetFlow.visible = false;
    if (washPosed) { washPosed = false; if (look && look.body) look.body.rotation.set(0, 0, 0); }
    return;
  }
  washPosed = true;
  const t = performance.now() / 1000, sc = dish.scrub || 0, a = look.g.getObjectByName('arm_pivot_L'), b = look.g.getObjectByName('arm_pivot_R');
  if (look.body) look.body.rotation.set(0.12 + 0.05 * sc * Math.sin(t * 14), 0, Math.sin(t * 7) * 0.05 * (0.3 + sc));   // leaning over the basin
  if (a) a.rotation.x = -0.9 + Math.sin(t * 16) * (0.06 + 0.3 * sc); if (b) b.rotation.x = -0.9 + Math.sin(t * 16 + PI) * (0.06 + 0.3 * sc);   // both hands scrub with the player
  faucetFlow.visible = true; faucetFlow.scale.y = 0.9 + 0.1 * Math.sin(t * 25);
  if (dish.flyT > 0) { dish.flyT -= 1 / 60; const m = 1 - Math.max(0, dish.flyT) / 0.35; washPlate.visible = true; washPlate.position.set(lerp(2.32, 3.3, m), lerp(1.66, 1.58, m) + Math.sin(m * PI) * 0.15, lerp(-7.22, -7.35, m)); washSmear.scale.setScalar(0.01); return showRack(); }
  if (dish.carried > 0 && !wash.fly) {
    washPlate.visible = true; washPlate.position.set(2.32 + Math.sin(t * 16) * 0.06 * sc, 1.66 + Math.abs(Math.sin(t * 16)) * 0.03 * sc, -7.22); washPlate.rotation.set(0.35 + Math.sin(t * 16) * 0.1 * sc, t * 1.5, 0);
    washSmear.scale.setScalar(Math.max(0.01, dish.remain == null ? 1 : dish.remain)); washSmear.visible = (dish.remain == null || dish.remain > 0.05);
  } else washPlate.visible = false;
  showRack();
}
function dishWashStart() {
  if (dish.carried <= 0) { toast('No plates to wash ✨'); return; }
  dish.state = 'selfwash'; miwPause = 1e9; miw.face = SINK_FACE; miw.dishTray.visible = false; dish.remain = 1; dish.flyT = 0;
  openWash();
}
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
// the bunny only shows up once it is hired (from day 4): until then there is nobody in the kitchen to wash up
function syncBaker() { const on = bunnyWashes(); baker.root.visible = on; baker.blob.visible = on; }
function resetDishes() {
  if (typeof closeWash === 'function' && wash.open) closeWash(false);
  TABLES.forEach(clearDirty); renderMiwStack(); dish.total = platesTotal(); dish.plates = dish.total; dish.state = 'idle'; dish.queue = []; dish.carried = 0; dish.washT = 0; dish.wait = 0;
  syncBaker(); baker.kitchenWalker = true; baker.target = baker.path = baker.onArrive = null; baker.root.position.copy(BAKER_HOME); baker.face = 0; renderBakerStack(); showRack();
}
// the pager: the bunny comes out, takes every dirty plate off the tables, and washes them
function callDishes() {
  wakeAudio();
  if (!game.running || game.paused || menuOpen) return;
  if (dish.state !== 'idle') { toast('The bunny is already on it 🐰'); return; }
  const dirty = dirtyTables(); if (!dirty.length && !(dish.carried > 0 && !bunnyWashes())) { toast('No dirty plates yet ✨'); sfx.nope(); return; }
  if (!bunnyWashes()) {
    if (!dirty.length) { if (!queue.some(a => a.kind === 'wash')) enqueue({ kind: 'wash', at: SINK_SPOT.clone() }); return; }   // plates she is still carrying: straight back to the sink   // nobody hired: Miw does it, one table after another, then the sink
    if (queue.some(a => a.kind === 'dish' || a.kind === 'wash')) { toast('Already on your list 🍽'); return; }
    if (queue.length + dirty.length + 1 > QUEUE_MAX) { toast('One thing at a time! 🙈'); return; }
    dirty.sort((a, b) => a.g.position.x - b.g.position.x).forEach(t => enqueue({ kind: 'dish', t, at: t.serve })); enqueue({ kind: 'wash', at: SINK_SPOT.clone() });
    return;
  }
  dish.queue = dirty.sort((a, b) => a.g.position.x - b.g.position.x); dish.state = 'collect'; dish.carried = 0; dish.wait = 0.2; sfx.bell();
}
function stepDishes(dt) {
  if (dish.wait > 0) { dish.wait -= dt; return; }
  if (dish.state === 'selfwash') {   // Miw is at the sink while the player scrubs
    if (Math.random() < dt * 14 * (dish.scrub || 0)) { const s = suds.find(q => q.age >= q.life); if (s) { s.age = 0; s.life = 0.9 + Math.random() * 0.6; s.x = 2.55 + (Math.random() - 0.5) * 0.6; s.z = -7.45 + (Math.random() - 0.5) * 0.25; s.m.visible = true; } }
  }
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
      dish.state = 'return'; walkTo(baker, SINK_SPOT, () => { dish.state = 'wash'; dish.washT = 1.2 + 0.9 * dish.carried; baker.face = SINK_FACE; });
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
syncBaker();
