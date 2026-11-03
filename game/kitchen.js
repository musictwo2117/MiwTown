// ---------- the kitchen: bake the day's desserts before opening ----------
// each batch is stir → bake (stop the marker in the green) → decorate, and makes BATCH desserts;
// how well it was baked sets the price, and what's left over carries into the next day
const BATCH = 4, PREP_SECONDS = 120, RESTOCK_SECONDS = 80, STAR_MUL = [0.9, 1, 1.2];
// each recipe has its own steps; the ones not listed yet use the classic four. The new ones make six pieces.
const FLOW = { macaron: ['add', 'stir', 'pipe', 'bake', 'sandwich'], pancake: ['add', 'stir', 'griddle', 'deco'], cheesecake: ['crush', 'press', 'add', 'stir', 'pour', 'bake', 'deco'], donut: ['add', 'stir', 'knead', 'roll', 'cut', 'fry', 'glaze', 'sprinkle'],
  kittycupcake: ['add', 'stir', 'scoop', 'bake', 'frost', 'topping'], pretzelcake: ['add', 'stir', 'pour', 'lay', 'bake', 'drizzle'] };
const TIMED_BAKE = { macaron: true, cheesecake: true, kittycupcake: true, pretzelcake: true };   // these bake in a pan against a heat meter (burnt = ruined) instead of stopping a swinging marker
const YIELD = { macaron: 6, pancake: 6, cheesecake: 6, donut: 6, kittycupcake: 6, pretzelcake: 6 };
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
  const goalOf = k => GOALS[k === 'add' || k === 'stir' ? 'mix' : k === 'bake' || k === 'bake-out' ? 'bake' : k === 'deco' || k === 'done' ? 'deco' : k === 'crush' ? 'crush' : k === 'press' || k === 'pour' ? 'pan' : DN_MODES.includes(k) || TIN_MODES.includes(k) ? 'dn' : k === 'lay' ? 'pan' : k === 'drizzle' ? 'deco' : 'idle'];
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
  const TOP = 0.6, BATTER = { cheesecake: '#fff0cf', donut: '#f1dfb9', kittycupcake: '#f4e1b6', pretzelcake: '#ecd5a3', macaron: '#f6cdd8' };
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
  [[1.32, 0.025], [0.345, 0.012]].forEach(([y, r]) => ovenG.add(mesh(cyl(r, r, 1.6, 8), '', { y, z: 0, rz: PI / 2, mat: rodM, cast: false })));   // the lower element lies flush with the floor, under the tray, so nothing sits inside it
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
  const decoLamp = new THREE.PointLight('#ffe2b0', 0, 5, 2); decoLamp.position.set(-0.9, 1.3, 0.6); decoG.add(decoLamp);   // a warm light for the pancakes

  // ----- crushing cookies: a wooden board, three biscuits that crack into pieces, a wooden mallet and a heap of real crumbs -----
  const crushG = new THREE.Group(); crushG.position.set(0.5, TOP, 0.2); sc.add(crushG);
  crushG.add(mesh(box(2.5, 0.14, 1.5), '', { y: 0.07, mat: new THREE.MeshPhongMaterial({ map: woodTex, color: '#fff3df', shininess: 40, specular: 0x4a4034 }) }), mesh(box(2.54, 0.03, 1.54), '#a9733f', { y: 0.015, cast: false }));
  const CRUMBC = ['#c1823c', '#b0702d', '#d29a52', '#9a5e24', '#7d4519'], crumbM = CRUMBC.map(c => new THREE.MeshPhongMaterial({ color: c, shininess: 12 }));
  const BISC = 5, PIECE_C = ['#b9772f', '#cc8d44'];
  const cookies = [-0.7, 0, 0.7].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, 0.14, [0.12, -0.1, 0.1][i]); g.rotation.y = i * 0.9; crushG.add(g);
    g.userData.pieces = Array.from({ length: BISC }, (_, k) => {
      const a0 = k / BISC * PI * 2, da = PI * 2 / BISC, pc = new THREE.Group();
      pc.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 14, 1, false, a0, da), PIECE_C[0], { y: 0.025 }), mesh(new THREE.CylinderGeometry(0.285, 0.3, 0.035, 14, 1, false, a0, da), PIECE_C[1], { y: 0.0675 }));
      const am = a0 + da / 2; pc.add(mesh(sph(0.018, 6), '#4f2b12', { x: Math.sin(am) * 0.17, y: 0.085, z: Math.cos(am) * 0.17, s: [1, 0.4, 1], cast: false }));
      pc.userData = { am, dir: new THREE.Vector3(Math.sin(am), 0, Math.cos(am)), tilt: (Math.random() - 0.5) * 0.9, spin: (Math.random() - 0.5) * 1.5 };
      g.add(pc); return pc;
    });
    return g;
  });
  const crumbs = Array.from({ length: 90 }, (_, i) => {   // the heap of crumbs that grows as the biscuits go
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035 + Math.random() * 0.03, 0), crumbM[(Math.random() * crumbM.length) | 0]);
    const a = Math.random() * PI * 2, r = Math.sqrt(Math.random()), far = i > 62;
    m.position.set(Math.cos(a) * r * (far ? 1.0 : 0.62), 0.14 + (far ? 0.015 : (1 - r) * 0.1) + Math.random() * 0.02, Math.sin(a) * r * (far ? 0.55 : 0.34));
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); m.scale.set(1.2, 0.7 + Math.random() * 0.4, 1); m.castShadow = true; m.receiveShadow = true;
    m.userData = { at: i / 90 * 0.95, k: 0 }; m.visible = false; crushG.add(m); return m;
  });
  const mallet = new THREE.Group(); mallet.position.set(0, 0.8, 0.05); crushG.add(mallet);
  mallet.add(mesh(cyl(0.17, 0.17, 0.56, 22), '#c58a52', { rz: PI / 2, y: 0.17 }), mesh(cyl(0.185, 0.185, 0.05, 22), '#6e4426', { rz: PI / 2, x: 0.2, y: 0.17 }), mesh(cyl(0.185, 0.185, 0.05, 22), '#6e4426', { rz: PI / 2, x: -0.2, y: 0.17 }), mesh(cyl(0.04, 0.05, 0.75, 10), '#b47c48', { y: 0.7 }), mesh(sph(0.065, 10), '#a06a3a', { y: 1.08 }));
  let crushP = 0, swing = 0, swingHit = true, impact = 0;

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
  const batterMat = new THREE.MeshPhongMaterial({ color: '#f4dc9c', shininess: 55, specular: new THREE.Color(0x6e6650), side: THREE.DoubleSide });
  const fillM = new THREE.Mesh(new THREE.CylinderGeometry(PAN_R - 0.02, PAN_R - 0.02, 1, 40, 1, true), batterMat); fillM.visible = false; panG.add(fillM);
  // the surface of the batter: a soft glossy skin that rises, mounds up where the stream lands and ripples outward
  const surfGeo = new THREE.RingGeometry(0.001, PAN_R - 0.02, 40, 14).rotateX(-PI / 2), surfBase = surfGeo.attributes.position.array.slice();
  surfGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(surfGeo.attributes.position.count * 3).fill(1), 3));
  const surfM = new THREE.Mesh(surfGeo, new THREE.MeshPhongMaterial({ color: '#f6e0a6', vertexColors: true, shininess: 60, specular: new THREE.Color(0x77705a), side: THREE.DoubleSide })); surfM.visible = false; surfM.receiveShadow = true; panG.add(surfM);
  let impX = 0, impZ = 0, impAct = 0, strandT = 0;
  const ringAt = (y, color) => mesh(new THREE.TorusGeometry(PAN_R + 0.006, 0.014, 6, 56), color, { rx: PI / 2, y, cast: false });
  const tRing = ringAt(lvlY(POUR_T), '#4fb860'), oRing = ringAt(lvlY(1), '#ef5f7e');
  const pourG = new THREE.Group(); pourG.position.set(-0.35, 1.2, 0); pourG.scale.setScalar(0.55);
  // a hollow jug: you can see the batter inside it, and it sinks as it pours
  const jugM = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.55, 0], [0.6, 0.04], [0.88, 0.78], [0.9, 0.82], [0.84, 0.82], [0.82, 0.78], [0.53, 0.08], [0.001, 0.08]].map(([x, y]) => new THREE.Vector2(x, y)), 40), new THREE.MeshPhongMaterial({ color: '#79afc8', shininess: 55, specular: 0x4a5a63, side: THREE.DoubleSide })); jugM.castShadow = jugM.receiveShadow = true; pourG.add(jugM);
  pourG.add(mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 18, PI), '#79afc8', { x: -0.95, y: 0.45, rz: PI / 2 }));   // the handle
  const jugBatter = new THREE.Mesh(new THREE.CircleGeometry(0.8, 28).rotateX(-PI / 2), batterMat); pourG.add(jugBatter);
  // the stream: a ribbon of batter that leaves the lip, arcs down under gravity, thins out and widens where it lands
  const SN = 14, SM = 8, sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SN + 1) * SM * 3), 3));
  { const idx = []; for (let i = 0; i < SN; i++) for (let j = 0; j < SM; j++) { const a = i * SM + j, b = i * SM + (j + 1) % SM, c = (i + 1) * SM + j, d = (i + 1) * SM + (j + 1) % SM; idx.push(a, c, b, b, c, d); } sGeo.setIndex(idx); }
  const streamM = new THREE.Mesh(sGeo, new THREE.MeshPhongMaterial({ color: '#f7e2a8', shininess: 90, specular: new THREE.Color(0x998f70) })); streamM.visible = false; streamM.frustumCulled = false;
  const pourOnly = [tRing, oRing, pourG, streamM]; pourOnly.forEach(o => { o.visible = false; panG.add(o); });
  let level = 0, pouring = false, tilt = 0;
  // ----- baking in the pan: the filling goes from pale to golden and, if forgotten, to dark brown -----
  const HEAT = [[0, '#fbf1d4'], [0.45, '#f1dcaa'], [0.69, '#dfb877'], [0.85, '#a9722f'], [1, '#3a1f0e']];
  const heatColor = p => { p = Math.max(0, Math.min(1, p)); let i = 0; while (i < HEAT.length - 2 && p > HEAT[i + 1][0]) i++; const [a, ca] = HEAT[i], [b, cb] = HEAT[i + 1]; return new THREE.Color(ca).lerp(new THREE.Color(cb), (p - a) / (b - a)); };
  const FRYC = [[0, '#ecd5a8'], [0.45, '#dcae66'], [0.69, '#c4843b'], [0.85, '#8a4f22'], [1, '#3a1f0e']];   // raw dough → golden brown → burnt
  const fryColor = p => { p = Math.max(0, Math.min(1, p)); let i = 0; while (i < FRYC.length - 2 && p > FRYC[i + 1][0]) i++; const [a, ca] = FRYC[i], [b, cb] = FRYC[i + 1]; return new THREE.Color(ca).lerp(new THREE.Color(cb), (p - a) / (b - a)); };
  let bakeHeat = 0, lastHeat = 0.69, ovenFill = null, ovenMat = null, ovenColor = null;
  function plainCake() {   // the baked cheesecake before it is decorated
    const g = new THREE.Group(), c = heatColor(lastHeat), hx = col => '#' + col.getHexString();
    g.add(mesh(cyl(0.42, 0.42, 0.07, 36), '#c98b4b', { y: 0.035 }), mesh(cyl(0.41, 0.41, 0.2, 36), hx(c), { y: 0.17 }), mesh(cyl(0.405, 0.405, 0.02, 36), hx(c.clone().multiplyScalar(0.92)), { y: 0.28 }));
    return g;
  }
  function pancakeStack() {   // three cooked pancakes: golden-brown, a little uneven, with a mottled top, ready for toppings
    const g = new THREE.Group(), side = new THREE.MeshPhongMaterial({ color: '#a8692a', shininess: 35, specular: 0x4a3a2a });   // dark enough that the bright kitchen light leaves it golden-brown, not cream
    if (!pancakeStack.tex) { pancakeStack.cv = document.createElement('canvas'); pancakeStack.cv.width = pancakeStack.cv.height = 256; pancakeStack.tex = new THREE.CanvasTexture(pancakeStack.cv); }
    paintCake(pancakeStack.cv, pancakeStack.tex, 0.7, true);
    const shade = new THREE.Mesh(new THREE.CircleGeometry(0.78, 36).rotateX(-PI / 2), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false })); shade.position.y = 0.003; shade.userData.fx = true; g.add(shade);   // a soft shadow on the plate
    [0, 1, 2].forEach(i => {
      const lay = new THREE.Group(); lay.position.set((i - 1) * 0.015, 0.058 + i * 0.108, (1 - i) * 0.012); lay.rotation.y = i * 0.9; lay.scale.set(1 - i * 0.025, 1, 1 - i * 0.025);
      lay.add(new THREE.Mesh(gdBody.geometry, side));
      if (i === 2) { const top = new THREE.Mesh(new THREE.CircleGeometry(0.52, 40).rotateX(-PI / 2), new THREE.MeshPhongMaterial({ map: pancakeStack.tex, shininess: 20 })); top.position.y = 0.0635; lay.add(top); }
      g.add(lay);
    });
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
  const DN_SPOTS = [[-0.62, -0.3], [0, -0.3], [0.62, -0.3], [-0.62, 0.3], [0, 0.3], [0.62, 0.3]], DN_GLAZE = '#ee6f9b';
  function makeDonut() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 12, 28), new THREE.MeshPhongMaterial({ color: '#f3d2a2', shininess: 20 })); body.rotation.x = PI / 2;
    const gl = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.094, 16, 36), new THREE.MeshPhongMaterial({ color: '#f7a6c2', shininess: 45, specular: new THREE.Color(0x77666c), emissive: new THREE.Color('#5a1c33') })); gl.rotation.x = PI / 2; gl.scale.set(1, 1, 0.85); gl.position.y = 0.05; gl.visible = false;
    const dr = new THREE.Group(); dr.visible = false;   // thick drips of glaze running down the outside edge
    for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2 + 0.4, len = 0.025 + 0.03 * ((i * 37) % 5) / 4; dr.add(mesh(sph(0.03, 8), DN_GLAZE, { x: Math.cos(a) * 0.285, y: 0.03 - len * 0.5, z: Math.sin(a) * 0.285, s: [1, 1 + len * 28, 1], cast: false })); }
    g.add(body, gl, dr); g.userData = { body, gl, dr }; return g;
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
  // the glaze is a glossy, rippling surface: the donuts leave dimples in it and rings spread out from them
  const glazePool = new THREE.Mesh(new THREE.RingGeometry(0.001, 1.22, 48, 14).rotateX(-PI / 2), new THREE.MeshPhongMaterial({ color: '#ffffff', vertexColors: true, shininess: 38, specular: new THREE.Color(0x6a5a60), emissive: new THREE.Color('#33101f'), side: THREE.DoubleSide })); glazePool.position.y = 0.56; glazePool.scale.z = 0.75; glzG.add(glazePool);
  const poolBase = glazePool.geometry.attributes.position.array.slice(); glazePool.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(glazePool.geometry.attributes.position.count * 3), 3));   // soft streaks of lighter and deeper cream, painted per vertex
  const glazeLight = new THREE.PointLight('#fff4f0', 0, 7, 2); glazeLight.position.set(0.2, 1.5, 2.6); glzG.add(glazeLight);   // a bright light near the camera, so the wet glaze catches a highlight
  glzG.add(mesh(new THREE.TorusGeometry(1.2, 0.05, 10, 48), '#ffcadb', { rx: PI / 2, y: 0.55, s: [1, 0.75, 1], cast: false }));   // glaze climbing the bowl wall
  const tray = new THREE.Group(); glzG.add(tray); tray.add(mesh(box(2.1, 0.05, 1.0), '#fffaf3', { y: -0.025 }));
  const trayDonuts = DN_SPOTS.map(([x, z]) => { const d = makeDonut(); d.position.set(x * 0.92, 0.09, z * 0.9); tray.add(d); return d; });
  let trayY = 1.15, trayRot = PI, sprinkles = [], glazeK = 0;   // glazeK: how far the donuts have really been dipped into the glaze (it only coats what touched it)
  const DN_MODES = ['knead', 'roll', 'cut', 'fry', 'glaze', 'sprinkle', 'griddle', 'pipe', 'sandwich'];
  // ----- macarons: pipe six rounds of batter onto a parchment-lined tray, bake them pale, then sandwich them with cream -----
  const mcG = new THREE.Group(); dnG.add(mcG);
  mcG.add(mesh(box(2.7, 0.06, 1.75), '#c9d0de', { y: 0.03 }), mesh(box(2.5, 0.02, 1.6), '#f7f0e2', { y: 0.07, cast: false }));   // a baking sheet lined with parchment
  const MC_SPOTS = [[-0.8, -0.42], [0, -0.42], [0.8, -0.42], [-0.8, 0.42], [0, 0.42], [0.8, 0.42]], MC_R = 0.3;
  const MC_PALE = new THREE.Color('#f39ebc'), MC_BURNT = new THREE.Color('#8a5a3a'), macBaked = new THREE.Color();
  const mcRings = MC_SPOTS.map(([x, z]) => mesh(new THREE.TorusGeometry(MC_R, 0.014, 6, 36), '#ffffff', { rx: PI / 2, x, y: 0.09, z, cast: false })); mcRings.forEach(m => mcG.add(m));
  const mcShellM = new THREE.MeshPhongMaterial({ color: '#f39ebc', shininess: 60, specular: 0x666666 }), macBakeM = new THREE.MeshPhongMaterial({ color: '#f39ebc', shininess: 60, specular: 0x666666 });
  const dome = () => new THREE.SphereGeometry(1, 28, 14, 0, PI * 2, 0, PI / 2);
  const mcSpots = MC_SPOTS.map(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, 0.08, z); mcG.add(g);
    const shell = new THREE.Mesh(dome(), mcShellM); shell.scale.setScalar(0.001); g.add(shell);
    const feet = new THREE.Mesh(new THREE.TorusGeometry(MC_R * 0.97, 0.03, 6, 28), mcShellM); feet.rotation.x = PI / 2; feet.position.y = 0.02; feet.visible = false; g.add(feet);
    const cream = new THREE.Mesh(new THREE.CylinderGeometry(MC_R * 0.93, MC_R * 0.93, 0.07, 28), new THREE.MeshPhongMaterial({ color: '#fff1e6', shininess: 50 })); cream.position.y = 0.105; cream.visible = false; g.add(cream);
    const top = new THREE.Mesh(dome(), mcShellM); top.scale.set(MC_R, 0.12, MC_R); top.visible = false; g.add(top);
    return { g, shell, feet, cream, top, size: 0, done: false, fillT: 1, filled: false };
  });
  const mcBag = new THREE.Group(); mcBag.add(mesh(new THREE.ConeGeometry(0.18, 0.7, 14), '#fffaf3', { y: 0.35, rx: PI }), mesh(new THREE.ConeGeometry(0.05, 0.12, 10), '#f39ebc', { y: 0.02, rx: PI })); mcBag.visible = false; mcG.add(mcBag);
  let mcDown = -1, mcFilled = 0;
  function macTray() {   // the sheet of six pale shells for the oven
    const g = new THREE.Group(); g.add(mesh(box(2.5, 0.06, 1.6), '#c9d0de', { y: 0.03 }), mesh(box(2.3, 0.02, 1.45), '#f7f0e2', { y: 0.07, cast: false }));
    MC_SPOTS.forEach(([x, z]) => {
      const s = new THREE.Mesh(dome(), macBakeM); s.scale.set(MC_R * 0.95, 0.14, MC_R * 0.95); s.position.set(x * 0.95, 0.08, z * 0.95); g.add(s);
      const f = new THREE.Mesh(new THREE.TorusGeometry(MC_R * 0.92, 0.03, 6, 24), macBakeM); f.rotation.x = PI / 2; f.position.set(x * 0.95, 0.1, z * 0.95); g.add(f);
    });
    macBakeM.color.copy(MC_PALE); return g;
  }
  // ----- pancakes: a deep iron skillet on a gas hob. Each pancake is poured, browns on one side as it cooks, is flipped and plated -----
  const gdG = new THREE.Group(); gdG.position.x = -0.15; dnG.add(gdG);
  const GD_X = -0.55, GD_PAN = 0.3, GD_Y = GD_PAN + 0.075 + 0.055;   // the skillet's x, how high it sits above the hob, and where a pancake rests in it
  gdG.add(mesh(box(2.3, 0.12, 2.1), '#2b2b30', { x: GD_X, y: 0.06 }), mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 36), '#58585f', { rx: PI / 2, x: GD_X, y: 0.14 }), mesh(new THREE.TorusGeometry(0.98, 0.035, 8, 40), '#44444b', { rx: PI / 2, x: GD_X, y: GD_PAN - 0.04 }));
  const gdFlames = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * PI * 2, f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 7), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff8a2a' : '#7fb2ff', transparent: true, opacity: 0.9 })); f.position.set(GD_X + Math.cos(a) * 0.62, 0.25, Math.sin(a) * 0.62); gdG.add(f); return f; });
  const gdSkillet = new THREE.Group(); gdSkillet.position.set(GD_X, GD_PAN, 0); gdG.add(gdSkillet);
  const gdPan = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.7, 0], [0.78, 0.035], [1.1, 0.34], [1.12, 0.39], [1.05, 0.4], [1.02, 0.34], [0.73, 0.085], [0.001, 0.085]].map(([x, y]) => new THREE.Vector2(x, y)), 56), new THREE.MeshPhongMaterial({ color: '#3a3741', shininess: 90, specular: 0x9a98a4, side: THREE.DoubleSide }));
  gdPan.castShadow = gdPan.receiveShadow = true; gdSkillet.add(gdPan);
  gdSkillet.add(mesh(new THREE.TorusGeometry(1.085, 0.03, 8, 56), '#8d8a98', { rx: PI / 2, y: 0.395, cast: false }));            // the bright rim
  gdSkillet.add(mesh(new THREE.CircleGeometry(0.69, 40).rotateX(-PI / 2), '#1d1b22', { y: 0.088, cast: false }));                 // the dark non-stick floor
  gdSkillet.add(mesh(cyl(0.07, 0.09, 0.16, 12), '#2a2830', { x: 1.2, y: 0.3, rz: PI / 2 }), mesh(cyl(0.06, 0.06, 0.8, 12), '#2a2830', { x: 1.7, y: 0.4, rz: PI / 2 }), mesh(cyl(0.085, 0.075, 0.55, 12), '#8a5a36', { x: 2.3, y: 0.4, rz: PI / 2 }));   // neck, bar and a wooden grip
  [-0.2, 0.2].forEach(z => gdSkillet.add(mesh(sph(0.03, 8), '#6d6a78', { x: 1.09, y: 0.36, z: z * 0.5, cast: false })));
  gdG.add(mesh(cyl(0.62, 0.55, 0.05, 36), '#fffaf3', { x: 1.15, y: 0.025 }));   // the plate
  const gdLight = new THREE.PointLight('#ff9a40', 0, 3.2, 2); gdLight.position.set(GD_X, 0.75, 0); gdG.add(gdLight);
  // a pancake: a puffed body, a top that browns as it cooks (a canvas painted afresh as the heat climbs) and an underside for the flip
  const gdCake = new THREE.Group(); gdCake.position.set(GD_X, GD_Y, 0); gdG.add(gdCake);
  const gdSide = new THREE.MeshPhongMaterial({ color: '#f1d996', shininess: 25 });
  const gdBody = new THREE.Mesh(new THREE.LatheGeometry([[0.001, -0.055], [0.5, -0.055], [0.585, -0.03], [0.6, 0.0], [0.585, 0.035], [0.5, 0.058], [0.001, 0.062]].map(([x, y]) => new THREE.Vector2(x, y)), 40), gdSide); gdCake.add(gdBody);
  const gdCanvas = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; })(), gdUnder = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; return c; })();
  const gdTexTop = new THREE.CanvasTexture(gdCanvas), gdTexUnder = new THREE.CanvasTexture(gdUnder);
  const gdTop = new THREE.Mesh(new THREE.CircleGeometry(0.52, 40).rotateX(-PI / 2), new THREE.MeshPhongMaterial({ map: gdTexTop, shininess: 20 })); gdTop.position.y = 0.0635; gdCake.add(gdTop);
  const gdBot = new THREE.Mesh(new THREE.CircleGeometry(0.52, 40).rotateX(PI / 2), new THREE.MeshPhongMaterial({ map: gdTexUnder, shininess: 20 })); gdBot.position.y = -0.0565; gdCake.add(gdBot); gdBot.visible = false;
  const gdRnd = (() => { let q = 7; return () => (q = (q * 16807) % 2147483647) / 2147483647; })();
  const gdSpots = Array.from({ length: 70 }, () => { const a = gdRnd() * PI * 2, d = Math.sqrt(gdRnd()) * 0.92; return { x: 128 + Math.cos(a) * d * 120, y: 128 + Math.sin(a) * d * 120, r: 5 + gdRnd() * 17, a: 0.25 + gdRnd() * 0.6, t: gdRnd() }; });
  const gdHoles = Array.from({ length: 14 }, (_, i) => { const a = gdRnd() * PI * 2, d = Math.sqrt(gdRnd()) * 0.8; return { x: 128 + Math.cos(a) * d * 120, y: 128 + Math.sin(a) * d * 120, r: 3 + gdRnd() * 5, at: 0.1 + i * 0.035 }; });
  const gdHex = c => '#' + c.getHexString();
  function paintCake(cv, tex, h, holes) {   // h: how long this side has cooked (0 = pale batter, about 0.66 golden, 1 burnt)
    const x = cv.getContext('2d'), base = heatColor(Math.max(0, Math.min(1, h * 1.12))), dark = heatColor(Math.min(1, h * 1.12 + 0.18)), deep = heatColor(Math.min(1, h * 1.12 + 0.34));
    x.fillStyle = gdHex(base); x.fillRect(0, 0, 256, 256);
    gdSpots.forEach(s => { if (s.t > 0.2 + h * 0.9) return; x.globalAlpha = s.a * Math.min(1, 0.2 + h * 1.1); x.fillStyle = gdHex(s.t < 0.4 ? deep : dark); x.beginPath(); x.arc(s.x, s.y, s.r, 0, PI * 2); x.fill(); });
    x.globalAlpha = 1;
    const g = x.createRadialGradient(128, 128, 70, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(' + [((deep.r * 255) | 0), ((deep.g * 255) | 0), ((deep.b * 255) | 0)].join(',') + ',' + Math.min(0.85, 0.15 + h * 0.8) + ')');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);   // the edge crisps first
    if (holes) gdHoles.forEach(o => { if (h < o.at) return; x.fillStyle = gdHex(dark); x.beginPath(); x.arc(o.x, o.y, o.r, 0, PI * 2); x.fill(); x.fillStyle = 'rgba(255,240,200,.35)'; x.beginPath(); x.arc(o.x - 1, o.y - 1, o.r * 0.45, 0, PI * 2); x.fill(); });
    tex.needsUpdate = true;
  }
  let gdPhase = 'idle', gdT = 0, gdN = 0, gdSpread = 0, gdPaintH = -1;
  // the pancakes already on the plate: each one is a copy of the cooked pancake as it left the pan (same body, same browned top)
  const gdStack = [0, 1, 2].map(i => {
    const g = new THREE.Group(), cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const tex = new THREE.CanvasTexture(cv), side = new THREE.MeshPhongMaterial({ color: '#c08a3c', shininess: 25 });
    g.add(new THREE.Mesh(gdBody.geometry, side));
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.52, 40).rotateX(-PI / 2), new THREE.MeshPhongMaterial({ map: tex, shininess: 20 })); top.position.y = 0.0635; g.add(top);
    g.position.set(1.15 + (i - 1) * 0.012, 0.05 + 0.058 + i * 0.108, (1 - i) * 0.012); g.rotation.y = i * 0.9; g.userData = { cv, tex, side }; g.visible = false; gdG.add(g); return g;
  });

  // ----- cupcakes: scoop the batter into the tin, bake it, pipe the frosting, then put on the kitty ears -----
  const tinG = new THREE.Group(); tinG.position.set(0.5, TOP, 0.2); sc.add(tinG);
  const TIN_SPOTS = [[-0.78, -0.36], [0, -0.36], [0.78, -0.36], [-0.78, 0.36], [0, 0.36], [0.78, 0.36]], TIN_MODES = ['scoop', 'frost', 'topping'];
  const cupCakeM = new THREE.MeshPhongMaterial({ color: '#f1d996', shininess: 30 });   // one batter/sponge color shared by every cup, so the oven can tan them all together
  function makeCupcake() {
    const g = new THREE.Group(), cake = new THREE.Mesh(sph(0.27, 16), cupCakeM); cake.position.y = 0.34; cake.scale.y = 0.8; cake.castShadow = true; cake.receiveShadow = true;
    g.add(mesh(cyl(0.3, 0.22, 0.26, 20), '#f4a6c0', { y: 0.21 }), cake);
    const frost = new THREE.Group(); frost.position.y = 0.5; frost.visible = false;
    frost.add(mesh(sph(0.25, 14), '#ffd1e0', { s: [1, 0.5, 1] }), mesh(sph(0.19, 12), '#ffe3ec', { y: 0.1, s: [1, 0.55, 1] }), mesh(sph(0.12, 10), '#fff2f6', { y: 0.19, s: [1, 0.6, 1] }), mesh(sph(0.045, 8), '#ffd1e0', { y: 0.27 }));
    const ears = new THREE.Group(); ears.position.y = 0.76; ears.visible = false;
    [-1, 1].forEach(sd => ears.add(mesh(new THREE.ConeGeometry(0.075, 0.16, 4), '#5a3a2a', { x: sd * 0.12, y: 0.06, rz: -sd * 0.3 })));
    ears.add(mesh(sph(0.035, 8), '#ff7aa8', { y: -0.06, z: 0.16 }));
    g.add(frost, ears);
    return { g, cake, frost, ears, f: 0, ft: 0, fr: 0, frt: 0, tp: 0, tpt: 0 };
  }
  const tinCups = TIN_SPOTS.map(([x, z]) => { const c = makeCupcake(); c.g.position.set(x, 0.08, z); tinG.add(c.g); return c; });
  tinG.add(mesh(box(2.8, 0.08, 1.5), '#b9b1a4', { y: 0.04 }));
  function tinGroup() {   // the tin of six sponges for the oven
    const g = new THREE.Group(); g.add(mesh(box(2.8, 0.08, 1.5), '#b9b1a4', { y: 0.04 }));
    TIN_SPOTS.forEach(([x, z]) => { const c = makeCupcake(); c.g.position.set(x, 0.08, z); g.add(c.g); });
    return g;
  }
  const tinTool = new THREE.Group(); tinG.add(tinTool);   // the scoop for the batter, or the piping bag for the frosting
  const scoopT = new THREE.Group(); scoopT.add(mesh(sph(0.16, 10), '#cfd6df', { s: [1, 0.6, 1] }), mesh(cyl(0.03, 0.03, 0.8, 8), '#e2b088', { x: 0.42, y: 0.22, rz: -1.0 }), mesh(sph(0.12, 8), '#f1d996', { y: 0.05, s: [1, 0.4, 1], cast: false }));
  const bagT = new THREE.Group(); bagT.add(mesh(new THREE.ConeGeometry(0.17, 0.6, 14), '#ffffff', { y: 0.32, rx: PI }), mesh(new THREE.ConeGeometry(0.2, 0.55, 14), '#ffd1e0', { y: 0.78 }));
  bagT.rotation.z = 0.35; tinTool.add(scoopT, bagT);
  const cupDone = new Array(6).fill(false); let cupN = 0, toolI = 4, toolK = 1;

  // ----- pretzel cake: pretzels are laid on the batter in the pan, and caramel is drizzled over the baked cake -----
  const layMeshes = [], layPos = [];
  const bottleT = new THREE.Group(); bottleT.add(mesh(cyl(0.11, 0.13, 0.4, 12), '#fff6ef', { y: 0.35 }), mesh(new THREE.ConeGeometry(0.1, 0.18, 10), '#b5651d', { y: 0.06, rx: PI })); bottleT.visible = false; decoG.add(bottleT);
  let drzLast = null, drzN = 0;

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
    if (kind === 'crush') { crushP = 0; swing = 0; swingHit = true; impact = 0; cookies.forEach(g => { g.visible = true; g.scale.set(1, 1, 1); g.userData.pieces.forEach(pc => { pc.position.set(0, 0, 0); pc.rotation.set(0, 0, 0); pc.scale.set(1, 1, 1); }); }); crumbs.forEach(m => { m.visible = false; m.userData.k = 0; }); mallet.position.set(0, 0.8, 0.05); }
    if (kind === 'press') { crustReset(); toolX = toolZ = 0; toolDown = false; }
    if (kind === 'pour' || kind === 'glaze') { level = 0; pouring = false; tilt = 0; }
    if (kind === 'pour' || kind === 'lay') { impAct = 0; const fa = surfGeo.attributes.position.array; for (let i = 0; i < fa.length; i += 3) fa[i + 1] = -0.012 * (Math.hypot(surfBase[i], surfBase[i + 2]) / PAN_R) ** 4; surfGeo.attributes.position.needsUpdate = true; surfGeo.computeVertexNormals(); }   // a flat, still surface
    if (kind === 'knead') { kneadK = 0; kneadP = 0; rollP = 0; rollDown = false; cutN = 0; cutDone.fill(false); cutAge.fill(1); }
    if (kind === 'griddle') { gdPhase = 'idle'; gdT = 0; gdN = 0; bakeHeat = 0; sideA = 0; gdStack.forEach(m => { m.visible = false; }); }
    if (kind === 'fry') { bakeHeat = 0; sideA = 0; flipT = 1; dipTime = 0; fryers.forEach(d => { d.rotation.set(0, 0, 0); d.position.y = 1.6; d.userData.splashed = false; d.userData.body.material.color.set('#f3d2a2'); }); }
    if (kind === 'glaze') { trayY = 1.15; trayRot = PI; glazeK = 0; sprinkles.splice(0).forEach(m => m.parent && m.parent.remove(m)); trayDonuts.forEach(d => { d.userData.gl.visible = false; d.userData.dr.visible = false; }); }
    if (kind === 'bake') { bakeHeat = 0; ovenFill = null; ovenMat = null; ovenColor = null; }
    if (kind === 'pipe') { mcDown = -1; mcSpots.forEach(s => { s.size = 0; s.done = false; s.filled = false; s.cream.visible = s.top.visible = false; }); }
    if (kind === 'sandwich') { mcFilled = 0; mcSpots.forEach(s => { s.filled = false; s.fillT = 1; s.cream.visible = s.top.visible = false; }); }
    if (TIN_MODES.includes(kind)) {
      cupDone.fill(false); cupN = 0; toolI = 4; toolK = 1;
      if (kind === 'scoop') { cupCakeM.color.set('#f1d996'); tinCups.forEach(c => { c.f = c.ft = c.fr = c.frt = c.tp = c.tpt = 0; }); }
      if (kind === 'frost') tinCups.forEach(c => { c.f = c.ft = 1; c.fr = c.frt = c.tp = c.tpt = 0; });   // the baked sponges, ready for frosting
    }
    if (kind === 'lay') { layMeshes.splice(0).forEach(m => m.parent && m.parent.remove(m)); layPos.length = 0; }
    if (kind === 'bake' && (id === 'cheesecake' || id === 'pretzelcake')) { inside.clear(); insideModel = panGroup(); insideBase = 0.62;   // small enough to fit between the oven's walls and clear of its door and back
      if (id === 'pretzelcake') layPos.forEach(([x, z]) => { const w = new THREE.Group(), pz = makePretzel({ salt: false, color: '#b9733a' }); pz.rotation.x = -PI / 2; pz.scale.setScalar(0.22); w.add(pz); w.position.set(x, 0.5, z); w.rotation.y = x * 7 + z * 3; insideModel.add(w); });
      insideModel.scale.setScalar(insideBase); inside.add(insideModel); doorA = OPEN; trayK = 0; ovenHot = 0; door.rotation.x = OPEN; inside.position.set(0, 0.36, 1.55); }
    else if (kind === 'bake' && id === 'macaron') { inside.clear(); insideModel = macTray(); ovenMat = macBakeM; ovenColor = p => macBaked.copy(MC_PALE).lerp(MC_BURNT, Math.max(0, Math.min(1, (p - 0.6) / 0.4))); insideBase = 0.6; insideModel.scale.setScalar(insideBase); inside.add(insideModel); doorA = OPEN; trayK = 0; ovenHot = 0; door.rotation.x = OPEN; inside.position.set(0, 0.36, 1.55); }
    else if (kind === 'bake' && id === 'kittycupcake') { inside.clear(); insideModel = tinGroup(); ovenMat = cupCakeM; insideBase = 0.6; insideModel.scale.setScalar(insideBase); inside.add(insideModel); doorA = OPEN; trayK = 0; ovenHot = 0; door.rotation.x = OPEN; inside.position.set(0, 0.36, 1.55); }
    else if (kind === 'bake') { inside.clear(); insideModel = batchModel(id); insideBase = WHOLE[id] ? 1.0 : 0.85; insideModel.scale.setScalar(insideBase); inside.add(insideModel); doorA = OPEN; trayK = 0; ovenHot = 0; door.rotation.x = OPEN; inside.position.set(0, 0.36, 1.55); }
    if (kind === 'deco' || kind === 'drizzle') {
      hold.clear(); placed3d.splice(0).forEach(o => decoG.remove(o)); hold.position.y = 0.08; const m = id === 'cheesecake' || id === 'pretzelcake' ? plainCake() : id === 'pancake' ? pancakeStack() : batchModel(id);
      if (kind === 'drizzle') { layPos.forEach(([x, z]) => { const w = new THREE.Group(), pz = makePretzel({ salt: true, color: '#b9733a' }); pz.rotation.x = -PI / 2; pz.scale.setScalar(0.22); w.add(pz); w.position.set(x * 0.42, 0.3, z * 0.42); w.rotation.y = x * 7 + z * 3; w.scale.setScalar(0.62); m.add(w); }); drzLast = null; drzN = 0; bottleT.visible = false; } m.scale.setScalar(WHOLE[id] ? 1.6 : 0.95); hold.add(m); decoG.rotation.y = 0;
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
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 10), skin);   // the palm
  fist.scale.set(1.0, 0.7, 1.0); armM.visible = false;   // just a hand with a cuff, no arm
  // four rounded fingers of slightly different lengths, side by side and curled a little, and a thumb out to the side
  const FING = [0.15, 0.17, 0.15, 0.115], mkDigit = r => ({ s: new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, 1, 8), skin), tip: new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 8, 6), skin), r });
  const fingers = FING.map(() => mkDigit(0.036)), thumb = mkDigit(0.042);
  handG.add(armM, sleeveMesh, fist, ...fingers.flatMap(f => [f.s, f.tip]), thumb.s, thumb.tip);
  let handP = null; const UP = V3(0, 1, 0);
  function placeArm(a, b) {                       // a: where the hand comes from (off-screen), b: where the hand is
    const d = b.clone().sub(a).normalize();
    fist.position.copy(b);
    sleeveMesh.position.copy(b).addScaledVector(d, -0.19); sleeveMesh.quaternion.setFromUnitVectors(UP, d);
    let side = d.clone().cross(UP); side = side.lengthSq() < 1e-4 ? V3(1, 0, 0) : side.normalize();   // across the palm
    const digit = (dg, base, dir, len) => { dg.s.position.copy(base).addScaledVector(dir, len / 2); dg.s.scale.set(1, len, 1); dg.s.quaternion.setFromUnitVectors(UP, dir); dg.tip.position.copy(base).addScaledVector(dir, len); };
    const curl = d.clone().multiplyScalar(0.9).addScaledVector(UP, -0.42).normalize();   // the fingers point forward and bend down a little
    fingers.forEach((f, i) => digit(f, b.clone().addScaledVector(d, 0.1).addScaledVector(side, (i - 1.5) * 0.066).addScaledVector(UP, -0.012), curl, FING[i]));
    const tdir = d.clone().multiplyScalar(0.7).addScaledVector(side, -0.55).addScaledVector(UP, -0.3).normalize();
    digit(thumb, b.clone().addScaledVector(side, -0.1).addScaledVector(d, 0.03), tdir, 0.12);
  }
  const px = (e) => { const rc = r.domElement.getBoundingClientRect(); return [(e.clientX - rc.left) / rc.width, (e.clientY - rc.top) / rc.height]; };
  return {
    r, cam,
    set(kind, newId) {
      if (mode === 'bake-out' && (kind === 'deco' || kind === 'drizzle' || kind === 'frost' || kind === 'sandwich')) { nextDeco = { kind, id: newId }; return; }
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
      if (mode !== 'deco' && mode !== 'drizzle') return null;
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
    // tap a cup of the tin (to scoop batter into it, pipe frosting on it, or add the ears); returns how many are done, or -1 for a miss
    cupAt(e) {
      if (!TIN_MODES.includes(mode)) return -1;
      const h = this.boardAt(e, 0.4); if (!h) return -1;
      let best = -1, bd = 0.42;
      TIN_SPOTS.forEach(([x, z], i) => { const d = Math.hypot(h.x - x, h.z - z); if (!cupDone[i] && d < bd) { bd = d; best = i; } });
      if (best < 0) return -1;
      cupDone[best] = true; cupN++; hop = 0.25; toolI = best; toolK = 0;
      const c = tinCups[best], at = tinG.localToWorld(V3(TIN_SPOTS[best][0], 0.75, TIN_SPOTS[best][1]));
      if (mode === 'scoop') { c.ft = 1; for (let i = 0; i < 7; i++) emit(at, V3((Math.random() - 0.5) * 0.5, -0.4, (Math.random() - 0.5) * 0.5), 0.5, '#f1d996', 0.04, 6); tone(190, 0, 0.12, 'sine', 0.08); }
      else if (mode === 'frost') { c.frt = 1; for (let i = 0; i < 6; i++) emit(at, V3((Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8), 0.5, '#ffd1e0', 0.035, 5); tone(520, 0, 0.1, 'triangle', 0.06); }
      else { c.tpt = 1; burst(tinG.localToWorld(V3(TIN_SPOTS[best][0], 0.8, TIN_SPOTS[best][1])), 4); tone(700, 0, 0.08, 'triangle', 0.06); }
      return cupN;
    },
    // lay a pretzel on the batter where you tap (inside the pan); returns the spot or null
    layAt(e) {
      if (mode !== 'lay') return null;
      const h = this.boardAt(e, 0.4); if (!h || Math.hypot(h.x, h.z) > 0.78) return null;
      return h;
    },
    lay(p) {
      if (mode !== 'lay') return;
      const w = new THREE.Group(), pz = makePretzel({ salt: false, color: '#b9733a' }); pz.rotation.x = -PI / 2; pz.scale.setScalar(0.22); w.add(pz);
      const to = V3(p.x, 0.44, p.z), from = V3(p.x * 1.6, 3.4, p.z + 1.0); w.position.copy(from); panG.add(w); layMeshes.push(w); layPos.push([p.x, p.z]); hop = 0.3;
      parts.push({ m: w, from, to, k: 0, dur: 0.45, toss: true, parent: panG });
    },
    // drag a bottle of caramel over the cake; every stretch of the drag leaves a blob. Returns how many blobs, or null if the pointer is off the cake.
    drizzleAt(e, down) {
      if (mode !== 'drizzle') return null;
      const p = this.cakePoint(e); if (!p) { bottleT.visible = false; drzLast = null; return null; }
      bottleT.visible = true; bottleT.position.set(p.x + 0.08, cakeTop + 0.1 + (down ? 0 : 0.15), p.z);
      if (!down) { drzLast = null; return drzN; }
      if (drzLast && Math.hypot(p.x - drzLast.x, p.z - drzLast.z) < 0.07) return drzN;
      drzLast = p.clone();
      const d = mesh(sph(0.05, 8), '#b5651d', { x: p.x, y: cakeTop + 0.02, z: p.z, s: [1.5, 0.45, 1.5], cast: false }); decoG.add(d); placed3d.push(d); drzN++;
      if (drzN % 4 === 0) tone(600 + drzN * 6, 0, 0.05, 'triangle', 0.04);
      return drzN;
    },
    flip() { sideA = bakeHeat; flipT = 0; hop = 0.5; },
    pourBatter() { if (mode !== 'griddle') return; gdPhase = 'cooking'; gdT = 0; gdSpread = 0; bakeHeat = 0; sideA = 0; hop = 0.25; gdPaintH = -1; for (let i = 0; i < 8; i++) emit(gdG.localToWorld(V3(GD_X, 0.6, 0)), V3((Math.random() - 0.5) * 1.2, 0.5 + Math.random(), (Math.random() - 0.5) * 1.2), 0.5, '#f6e7c4', 0.035, 6); },
    flipCake() { if (mode !== 'griddle') return; gdPhase = 'flipping'; gdT = 0; sideA = bakeHeat; hop = 0.5; },
    plateCake() { if (mode !== 'griddle') return; gdPhase = 'plating'; gdT = 0; },
    // press and hold on a ring to pipe it, let go when the round fills the ring: returns the spot that was pressed, or -1
    pipeStart(e) {
      if (mode !== 'pipe') return -1;
      const h = this.boardAt(e, 0.09); if (!h) return -1;
      let best = -1, bd = 0.5; MC_SPOTS.forEach(([x, z], i) => { const d = Math.hypot(h.x - x, h.z - z); if (!mcSpots[i].done && d < bd) { bd = d; best = i; } });
      if (best >= 0) { mcDown = best; mcSpots[best].size = 0.02; }
      return best;
    },
    pipeEnd() {   // how big the round got compared with the ring (1 = exactly), or null for a tap that was too short
      if (mode !== 'pipe' || mcDown < 0) return null;
      const s = mcSpots[mcDown]; mcDown = -1;
      if (s.size < 0.3) { s.size = 0; return null; }
      s.done = true; hop = 0.2; tone(420, 0, 0.08, 'triangle', 0.06); return s.size;
    },
    fillAt(e) {   // tap a baked shell to cream it and put its top on: returns how many are done, or -1 for a miss
      if (mode !== 'sandwich') return -1;
      const h = this.boardAt(e, 0.15); if (!h) return -1;
      let best = -1, bd = 0.5; MC_SPOTS.forEach(([x, z], i) => { const d = Math.hypot(h.x - x, h.z - z); if (!mcSpots[i].filled && d < bd) { bd = d; best = i; } });
      if (best < 0) return -1;
      const s = mcSpots[best]; s.filled = true; s.fillT = 0; s.cream.visible = s.top.visible = true; mcFilled++; hop = 0.25;
      for (let i = 0; i < 5; i++) emit(mcG.localToWorld(V3(MC_SPOTS[best][0], 0.4, MC_SPOTS[best][1])), V3((Math.random() - 0.5) * 1.4, 0.8 + Math.random(), (Math.random() - 0.5) * 1.4), 0.5, '#fff1e6', 0.03, 7);
      return mcFilled;
    },
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
      if (id === 'donut' || id === 'kittycupcake' || id === 'pancake' || id === 'macaron') {   // six finished ones on the plate
        placed3d.splice(0).forEach(o => decoG.remove(o)); hold.clear(); hold.position.y = 0.08; decoG.rotation.y = 0;
        const n = yieldOf(id);
        for (let k = 0; k < n; k++) { const a = k * 2 * PI / n, m = dessertModel(id); const wide = id === 'pancake' || id === 'macaron'; m.scale.setScalar(wide ? 1.05 : 1.2); m.position.set(Math.sin(a) * (wide ? 0.72 : 0.55), 0, Math.cos(a) * (wide ? 0.72 : 0.55)); m.rotation.y = a; hold.add(m); }
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
      crushG.visible = mode === 'crush'; panG.visible = mode === 'press' || mode === 'pour' || mode === 'lay';
      if (mode === 'lay') { const h = 0.02 + POUR_T * 0.42; fillM.scale.y = h; fillM.position.y = 0.095 + h / 2; fillM.visible = true; } else if (mode !== 'pour') fillM.visible = false;
      layMeshes.forEach(m => { m.visible = mode === 'lay'; });
      if (mode !== 'drizzle') bottleT.visible = false;
      tool.visible = mode === 'press'; if (mode !== 'press') mound.visible = false; pourOnly.forEach(o => { if (mode !== 'pour') o.visible = false; });
      if (mode === 'pour') {
        if (pouring) level = Math.min(1.05, level + dt * (0.2 + 0.035 * Math.sin(t * 3)));   // it flows a little unevenly
        tilt += ((pouring ? 1 : 0) - tilt) * Math.min(1, dt * 5);
        const h = 0.02 + level * 0.42; fillM.scale.y = h; fillM.position.y = 0.095 + h / 2; fillM.visible = level > 0.01;
        tRing.visible = oRing.visible = pourG.visible = true; pourG.rotation.z = -tilt;
        jugBatter.position.y = 0.2 + 0.5 * Math.max(0, 1 - level / 1.05); jugBatter.rotation.z = tilt; jugBatter.scale.setScalar(0.5 + 0.5 * Math.max(0, 1 - level / 1.05)); jugBatter.visible = level < 1.04;   // the batter inside stays level and sinks
        pourG.updateMatrixWorld(true); const lip = panG.worldToLocal(pourG.localToWorld(V3(0.88, 0.8, 0))), surf = 0.095 + h;
        const flowing = pouring && tilt > 0.55; streamM.visible = flowing; impAct += ((flowing ? 1 : 0) - impAct) * Math.min(1, dt * (flowing ? 6 : 2.5));
        if (flowing) {
          const H = Math.max(0.05, lip.y - surf), T = Math.sqrt(2 * H / 6), vx = 0.22 + 0.1 * Math.sin(t * 2.1), sp = streamM.geometry.attributes.position.array;
          impX = lip.x + vx * T; impZ = lip.z + 0.03 * Math.sin(t * 1.7); strandT += dt;
          for (let i = 0; i <= SN; i++) {
            const u = i / SN, px = lip.x + (impX - lip.x) * u * (0.6 + 0.4 * u), py = lip.y - H * u * u, pz = lip.z + (impZ - lip.z) * u;
            const tx = (impX - lip.x) * (0.6 + 0.8 * u), ty = -2 * H * u, tl = Math.hypot(tx, ty) || 1, nx = ty / tl, ny = -tx / tl;   // across the stream, in the x-y plane
            const rad = (0.075 - 0.04 * Math.sqrt(u) + (u > 0.88 ? 0.05 * (u - 0.88) / 0.12 : 0)) * (1 + 0.12 * Math.sin(strandT * 11 - u * 16)) * (0.7 + 0.3 * Math.min(1, tilt));   // thick at the lip, thin in the fall, wide again as it lands
            for (let j = 0; j < SM; j++) { const a = j / SM * PI * 2, ca = Math.cos(a) * rad, sa = Math.sin(a) * rad; const k = (i * SM + j) * 3; sp[k] = px + nx * ca; sp[k + 1] = py + ny * ca; sp[k + 2] = pz + sa; }
          }
          streamM.geometry.attributes.position.needsUpdate = true; streamM.geometry.computeVertexNormals();
          if (Math.random() < 0.8) emit(panG.localToWorld(V3(impX, surf + 0.02, impZ)), V3((Math.random() - 0.5) * 1.1, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 1.1), 0.5, ['#f4dc9c', '#fff0c4', '#e9cf8a'][(Math.random() * 3) | 0], 0.015 + Math.random() * 0.03, 8);
        }
        // the surface: a heap where the stream lands (batter folds over itself before it spreads), rings running out from it
        const sp2 = surfGeo.attributes.position, sc2 = surfGeo.attributes.color;
        for (let i = 0; i < sp2.count; i++) {
          const x = surfBase[i * 3], z = surfBase[i * 3 + 2], dx = x - impX, dz = z - impZ, d2 = dx * dx + dz * dz, d = Math.sqrt(d2), r = Math.hypot(x, z);
          const y = impAct * (0.085 * Math.exp(-d2 / 0.035) + 0.022 * Math.sin(d * 20 - t * 9) * Math.exp(-d * 2.4)) + 0.004 * Math.sin(x * 6 + t * 1.3) * Math.sin(z * 5 - t * 1.1) - 0.012 * (r / PAN_R) ** 4;   // it also climbs the wall a little at the edge
          sp2.array[i * 3 + 1] = y; const k = 0.95 + 0.05 * Math.sin(Math.atan2(dz, dx) * 4 + d * 12 - t * 2) * impAct + 0.07 * Math.exp(-d2 / 0.035) * impAct - 0.06 * Math.sin(d * 20 - t * 9) * Math.exp(-d * 2.4) * impAct; sc2.array[i * 3] = sc2.array[i * 3 + 1] = sc2.array[i * 3 + 2] = k;
        }
        sp2.needsUpdate = true; sc2.needsUpdate = true; surfGeo.computeVertexNormals();
      }
      if (mode === 'pour' || mode === 'lay') { surfM.visible = fillM.visible; surfM.position.y = fillM.position.y + fillM.scale.y / 2; if (mode === 'lay') { impAct = 0; } } else surfM.visible = false;
      if (mode === 'crush') {
        swing = Math.max(0, swing - dt * 5.5); impact = Math.max(0, impact - dt * 6);
        const ci = Math.min(2, Math.floor(crushP * 2.999)), c = cookies[ci];
        mallet.position.set(mallet.position.x + (c.position.x - mallet.position.x) * Math.min(1, dt * 12), 0.2 + 0.6 * Math.pow(swing, 1.4), c.position.z);
        mallet.rotation.z = 0.3 * swing;
        if (!swingHit && swing < 0.1) {   // the mallet lands: the biscuit cracks and crumbs fly
          swingHit = true; impact = 1; tone(150, 0, 0.1, 'square', 0.07); tone(420, 0.01, 0.05, 'square', 0.04);
          for (let i = 0; i < 12; i++) emit(crushG.localToWorld(V3(c.position.x, 0.25, c.position.z)), V3((Math.random() - 0.5) * 2.4, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2.4), 0.8, CRUMBC[i % 5], 0.02 + Math.random() * 0.025, 8);
          for (let i = 0; i < 4; i++) emit(crushG.localToWorld(V3(c.position.x, 0.25, c.position.z)), V3((Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.9), 0.9, '#f3e1c4', 0.04, -0.3, 0.9);   // a little dust
        }
        cookies.forEach((g, i) => {
          const l = k01(crushP * 3 - i), e = ease(l); g.visible = l < 1;
          g.scale.y = 1 - (i === ci ? 0.35 * impact : 0);
          g.userData.pieces.forEach(pc => {
            const u = pc.userData, out = 0.015 + 0.16 * e;                     // first it cracks along its lines, then the pieces break up and shrink to crumbs
            pc.position.copy(u.dir).multiplyScalar(out); pc.position.y = -0.03 * e;
            pc.rotation.set(u.tilt * e, u.spin * e, -u.tilt * 0.7 * e); pc.scale.setScalar(1 - 0.8 * e);
          });
        });
        crumbs.forEach(m => { if (crushP >= m.userData.at && crushP > 0.02) { m.visible = true; m.userData.k = Math.min(1, m.userData.k + dt * 5); m.scale.setScalar(1.0 * (0.3 + 0.7 * ease(m.userData.k))); } });
      }
      if (mode === 'press') {
        tool.position.x += (toolX - tool.position.x) * Math.min(1, dt * 14); tool.position.z += (toolZ - tool.position.z) * Math.min(1, dt * 14);
        tool.position.y += ((toolDown ? 0.2 : 0.46) - tool.position.y) * Math.min(1, dt * 16);
        const left = Math.max(0, 1 - coverN / cellsIn * 1.6); mound.scale.set(left, 0.35 * left, left); mound.visible = left > 0.05;
      }
      tinG.visible = TIN_MODES.includes(mode);
      if (tinG.visible) {
        const k = Math.min(1, dt * 7);
        tinCups.forEach((c, i) => {
          c.f += (c.ft - c.f) * k; c.fr += (c.frt - c.fr) * k; c.tp += (c.tpt - c.tp) * Math.min(1, dt * 6);
          c.cake.visible = c.f > 0.03; c.cake.scale.y = 0.04 + 0.76 * c.f;
          c.frost.visible = c.fr > 0.04; c.frost.scale.setScalar(0.15 + 0.85 * c.fr); c.frost.rotation.y = (1 - c.fr) * 5;
          c.ears.visible = c.tp > 0.04; c.ears.position.y = 0.76 + (1 - c.tp) * 0.7; c.ears.scale.setScalar(0.3 + 0.7 * c.tp);
        });
        toolK = Math.min(1, toolK + dt * 2.2);
        const sp = TIN_SPOTS[toolI], hov = 1.0 - 0.45 * Math.sin(toolK * PI);
        tinTool.position.x += (sp[0] - tinTool.position.x) * Math.min(1, dt * 9); tinTool.position.z += (sp[1] - tinTool.position.z) * Math.min(1, dt * 9); tinTool.position.y += (hov - tinTool.position.y) * Math.min(1, dt * 12);
        tinTool.visible = mode !== 'topping'; scoopT.visible = mode === 'scoop'; bagT.visible = mode === 'frost';
        scoopT.rotation.z = -0.7 * Math.sin(toolK * PI); bagT.rotation.z = 0.35 + 0.2 * Math.sin(toolK * PI * 3);
      }
      dnG.visible = DN_MODES.includes(mode); boardG.visible = mode === 'knead' || mode === 'roll' || mode === 'cut'; potG.visible = mode === 'fry'; glzG.visible = mode === 'glaze' || mode === 'sprinkle';
      if (boardG.visible) {
        kneadK = Math.max(0, kneadK - dt * 5);
        const e = mode === 'knead' ? 0 : mode === 'roll' ? ease(rollP) : 1;
        const sx = lerp(0.5 + 0.18 * kneadK, 1.15, e), sy = lerp(0.5 - 0.14 * kneadK, 0.07, e), sz = lerp(0.5 + 0.18 * kneadK, 0.72, e);
        dough.scale.set(sx, sy, sz); dough.position.y = 0.12 + sy; dough.visible = true;
        pin.visible = mode === 'roll'; pin.position.x += (rollX - pin.position.x) * Math.min(1, dt * 14); pin.position.y += ((rollDown ? 0.12 + 2 * sy + 0.12 : 0.12 + 2 * sy + 0.4) - pin.position.y) * Math.min(1, dt * 14);
        cutMarks.forEach((m, i) => { m.visible = mode === 'cut' && !cutDone[i]; m.scale.setScalar(1 + 0.08 * Math.sin(t * 6 + i)); });
        cutRings.forEach((d, i) => { cutAge[i] = Math.min(1, cutAge[i] + dt * 5); d.visible = mode === 'cut' && cutDone[i]; d.scale.setScalar(0.3 + 0.7 * ease(cutAge[i])); d.position.y = 0.22 + Math.sin(cutAge[i] * PI) * 0.15; });
      }
      mcG.visible = mode === 'pipe' || mode === 'sandwich';
      if (mcG.visible) {
        const piping = mode === 'pipe';
        mcShellM.color.copy(piping ? MC_PALE : macBaked.copy(MC_PALE).multiplyScalar(0.97));
        if (piping && mcDown >= 0) mcSpots[mcDown].size = Math.min(1.8, mcSpots[mcDown].size + dt * 0.9);
        mcRings.forEach((r, i) => { r.visible = piping && !mcSpots[i].done; r.scale.setScalar(1 + 0.05 * Math.sin(t * 5 + i)); });
        mcSpots.forEach(s => {
          const sz = piping ? s.size : 1; s.shell.visible = sz > 0.01; s.shell.scale.set(MC_R * Math.max(sz, 0.001), (piping ? 0.14 * Math.min(1.15, 0.5 + sz * 0.5) : 0.14 - 0.07 * (s.filled ? Math.min(1, s.fillT * 3) : 0)), MC_R * Math.max(sz, 0.001));   // once it is filled the bottom shell settles flatter
          s.feet.visible = !piping; s.feet.scale.setScalar(1);
          if (!piping) { s.fillT = Math.min(1, s.fillT + dt * 2.4); const e = s.fillT * s.fillT * (3 - 2 * s.fillT); s.top.position.y = s.filled ? 0.7 + (0.14 - 0.7) * e : 0.7; s.cream.scale.y = 0.2 + 0.8 * e; }
        });
        mcBag.visible = piping && mcDown >= 0;
        if (mcBag.visible) { const [x, z] = MC_SPOTS[mcDown]; mcBag.position.set(x + 0.04, 0.28, z); mcBag.rotation.z = 0.25; }
      }
      decoLamp.intensity = (mode === 'deco' || mode === 'done') && id === 'pancake' ? 0.45 : 0;
      gdG.visible = mode === 'griddle';
      if (mode === 'griddle') {
        gdT += dt;
        const e = k => k * k * (3 - 2 * k), h = bakeHeat;
        gdCake.visible = gdPhase !== 'idle';
        gdFlames.forEach((f, i) => { const k = 0.5 + 0.5 * Math.min(1, h * 1.4); f.scale.set(1, k * (0.8 + 0.5 * Math.abs(Math.sin(t * 11 + i * 1.7))), 1); });
        gdLight.intensity = gdPhase === 'idle' ? 0.5 : 0.7 + Math.min(1, h * 1.3) * 1.3;
        if (gdPhase === 'cooking') {
          gdSpread = Math.min(1, gdSpread + dt * 2.6); const s = 0.15 + 0.85 * e(gdSpread);
          gdCake.scale.set(s, 0.5 + 0.5 * s + 0.12 * Math.min(1, h * 1.5), s); gdCake.position.set(GD_X, GD_Y, 0); gdCake.rotation.set(0, 0, 0); gdBot.visible = false;
          if (Math.abs(h - gdPaintH) > 0.025 || gdPaintH < 0) { gdPaintH = h; paintCake(gdCanvas, gdTexTop, h, true); }
          gdSide.color.copy(heatColor(Math.min(1, h * 1.24)));   // the edge is darker than it looks under the bright light
        } else if (gdPhase === 'flipping') {
          const k = Math.min(1, gdT / 0.55);
          gdCake.position.set(GD_X, GD_Y + Math.sin(k * PI) * 0.9, 0); gdCake.rotation.x = k * PI;
          if (!gdBot.visible) { paintCake(gdUnder, gdTexUnder, sideA, false); gdBot.visible = true; }
          if (k >= 1) { paintCake(gdCanvas, gdTexTop, sideA, false); gdBot.visible = false; gdPhase = 'cooking2'; gdT = 0; gdCake.rotation.x = 0; gdPaintH = -1; }
        } else if (gdPhase === 'cooking2') { gdCake.position.y = GD_Y; }
        else if (gdPhase === 'plating') {
          const k = Math.min(1, gdT / 0.5), y1 = 0.108 + gdN * 0.108;
          gdCake.position.set(GD_X + 1.7 * e(k), GD_Y + (y1 - GD_Y) * e(k) + Math.sin(k * PI) * 0.5, 0); gdCake.rotation.set(0, 0, 0);
          if (k >= 1) { if (gdN < 3) { const sl = gdStack[gdN], u = sl.userData; u.cv.getContext('2d').drawImage(gdCanvas, 0, 0); u.tex.needsUpdate = true; u.side.color.copy(gdSide.color); sl.scale.copy(gdCake.scale); sl.visible = true; } gdN++; gdPhase = 'idle'; hop = 0.3; for (let i = 0; i < 6; i++) emit(gdG.localToWorld(V3(1.15, 0.5, 0)), V3((Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5), 0.5, '#ffd27a', 0.03, 7); }
        }
        if (gdPhase === 'cooking' || gdPhase === 'cooking2') {
          if (h > 0.88 && Math.random() < 0.4) emit(gdG.localToWorld(V3(GD_X + (Math.random() - 0.5) * 0.8, 0.8, (Math.random() - 0.5) * 0.8)), V3(0, 0.7, 0), 0.9, '#4a4a4a', 0.09, -0.3, 0.8);
          else if (Math.random() < 0.3) emit(gdG.localToWorld(V3(GD_X + (Math.random() - 0.5) * 0.8, 0.6, (Math.random() - 0.5) * 0.8)), V3(0, 0.5, 0), 0.5, '#fff6d8', 0.025, -0.1);
        }
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
        const contact = k01((0.76 - trayY) / 0.12); glazeK = Math.max(glazeK, contact); const a = 0.5 + 0.5 * glazeK;
        trayDonuts.forEach(d => { d.userData.gl.visible = glazeK > 0.03; d.userData.gl.scale.set(a, a, 0.85); d.userData.dr.visible = glazeK > 0.6 && contact < 0.6; });
        glazePool.position.y = 0.56 - 0.02 * level; glazeLight.intensity = 1.3;
        // ripples: a dimple under each dipped donut, and rings spreading out of it; the pool also heaves gently
        const pp = glazePool.geometry.attributes.position, glazeCol = glazePool.geometry.attributes.color, dip = mode === 'glaze' ? contact : 0;
        for (let i = 0; i < pp.count; i++) {
          const x = poolBase[i * 3], z = poolBase[i * 3 + 2]; let y = 0.012 * Math.sin(x * 4 + t * 1.6) + 0.01 * Math.sin(z * 5 - t * 1.3);
          if (dip > 0) for (let k = 0; k < 6; k++) { const dx = x - DN_SPOTS[k][0] * 0.92, dz = z + DN_SPOTS[k][1] * 0.9 / 0.75, d2 = dx * dx + dz * dz, d = Math.sqrt(d2); y += dip * (-0.06 * Math.exp(-d2 / 0.07) + 0.045 * Math.exp(-((d - 0.34) ** 2) / 0.012) + 0.012 * Math.sin(d * 14 - t * 7) * Math.exp(-d * 3)); }   // a dimple with a thick fold of cream pushed up round it
          pp.array[i * 3 + 1] = Math.max(y, -0.04);
          const r = Math.hypot(x, z), th = Math.atan2(z, x), sw = 0.5 + 0.5 * Math.sin(th * 3 + r * 7 - t * 0.5) * Math.cos(r * 5 + t * 0.3), cc = glazeCol.array;   // creamy swirls, lighter on the folds
          cc[i * 3] = 0.95 + 0.05 * sw; cc[i * 3 + 1] = 0.4 + 0.17 * sw + Math.max(0, y) * 4; cc[i * 3 + 2] = 0.58 + 0.14 * sw + Math.max(0, y) * 3;
        }
        pp.needsUpdate = true; glazeCol.needsUpdate = true; glazePool.geometry.computeVertexNormals();
        if (mode === 'glaze' && glazeK > 0.6 && contact < 0.5 && Math.random() < 0.3) { const d = trayDonuts[(Math.random() * 6) | 0]; emit(tray.localToWorld(d.position.clone().add(V3((Math.random() - 0.5) * 0.4, -0.02, (Math.random() - 0.5) * 0.3))), V3(0, -0.2, 0), 0.55, DN_GLAZE, 0.03, 4, 0.5); }
      }
      mixG.visible = mode === 'add' || mode === 'stir'; ovenG.visible = mode === 'bake' || mode === 'bake-out'; decoG.visible = mode === 'deco' || mode === 'drizzle' || mode === 'done';
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
        if (ovenFill || ovenMat) {
          if (ovenMat) ovenMat.color.copy(ovenColor ? ovenColor(bakeHeat) : heatColor(bakeHeat)); else { ovenFill.material.color.copy(heatColor(bakeHeat)); ovenFill.scale.y = 1 + 0.1 * Math.min(1, bakeHeat * 1.4); }   // it puffs up as it bakes
          if (bakeHeat > 0.88 && Math.random() < 0.4) emit(ovenG.localToWorld(V3((Math.random() - 0.5) * 1.2, 1.5, 0.9)), V3((Math.random() - 0.5) * 0.4, 0.7, 0), 0.9, '#4a4a4a', 0.09, -0.3, 0.8);
        }
        steam.forEach((m, i) => { const k = ((t * 0.45) + i / 4) % 1; m.position.set(-0.6 + i * 0.4, 2.0 + k * 0.9, 0.2); m.scale.setScalar(0.6 + k); m.material.opacity = 0.55 * (1 - k); });
        // the door starts open: the tray slides in, the door shuts; to take it out the door opens and the tray slides back out
        let dT, tT;
        if (mode === 'bake') { tT = k01((modeT - 0.15) / 0.85); dT = modeT < 1.0 ? OPEN : OPEN * (1 - ease(k01((modeT - 1.0) / 0.55))); }
        else { tT = 1 - k01((modeT - 0.45) / 0.8); dT = OPEN * ease(k01(modeT / 0.5)); }
        doorA += (dT - doorA) * Math.min(1, dt * 12); trayK += (tT - trayK) * Math.min(1, dt * 9);
        door.rotation.x = doorA; inside.position.z = lerp(1.55, 0, ease(trayK));
        const closed = doorA < 0.35, fl = 0.86 + 0.14 * Math.sin(t * 23) + 0.07 * Math.sin(t * 7.3);   // a flicker
        ovenHot += ((mode === 'bake' && closed ? 1 : 0) - ovenHot) * Math.min(1, dt * 2.6);
        const over = bakeHeat > 0.82, hotC = over ? '#ff3b1a' : '#ff8a22';
        wallM.emissiveIntensity = floorM.emissiveIntensity = ovenHot * 0.6 * fl; wallM.emissive.set(over ? '#ff3b1a' : '#ff5a14'); floorM.emissive.copy(wallM.emissive);
        rodM.color.set('#6b4a3a').lerp(new THREE.Color(hotC), Math.min(1, ovenHot * fl));
        ovenLight.intensity = ovenHot * 2.8 * fl; ovenLight.color.set(over ? '#ff5a30' : '#ff8a3c');
        glowM.opacity = closed ? ovenHot * (0.4 + 0.18 * fl) : 0;
        if (mode === 'bake') insideModel.scale.setScalar(insideBase * (1 + (ovenFill ? 0.04 : ovenMat ? 0.08 : WHOLE[id] ? 0.35 : 0.18) * Math.min(1, Math.max(0, modeT - 1.5) / 4)));   // it rises while it bakes
        else if (modeT > 1.5) { mode = null; if (nextDeco) { const nd = nextDeco; enter(nd.kind, nd.id); } }
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
// between the kitchen and the day: back in the café with the shelves in view, ready to open when you are
const prep = { on: false };
function leaveKitchen() {
  if (kitchen.run) { toast('Finish this batch first 🍰'); return sfx.nope(); }   // a bake under way keeps time, so it can't wait in the café
  kitchen.on = false; prep.on = true; $('overlay').hidden = true; $('prepBar').hidden = false;
  updatePlates(); renderHands(); sfx.pick();
}
// tapping a dessert in the café before opening: back to the kitchen, ready to bake that one
function bakeFromCafe(id) {
  if (!prep.on || menuOpen) return;
  if (!unlocked(id, game.day)) return toast(game.day >= DESSERTS[id].day ? `Buy the ${DESSERTS[id].name} recipe in the shop after closing 🛒` : `${DESSERTS[id].name} opens on day ${DESSERTS[id].day}`);
  backToKitchen();
  if (INGR[id].includes('berry') && kitchen.berries < 1) { kitchen.step = null; return renderStage(); }   // the picker says what's missing
  beginRecipe(id); renderStage(); sfx.tap();
}
function backToKitchen() { prep.on = false; $('prepBar').hidden = true; kitchen.on = true; $('overlay').hidden = false; sfx.tap(); }
function openTheShop() {
  // nothing on the shelves: make sure that's what they meant
  if (!Object.values(kitchen.stock).some(n => n > 0) && !kitchen.warned) { kitchen.warned = true; toast('Nothing baked yet. Tap Open again to open anyway'); return sfx.nope(); }
  prep.on = false; $('prepBar').hidden = true; startDay(game.day);
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
    <div class="kfoot"><div class="kstock" id="kstock"></div><button class="alt" id="pickBtn"></button><button class="go" id="goBtn">${opts.resume ? 'Back to the shop →' : 'To the café →'}</button></div>`;
  $('overlay').hidden = false;
  $('goBtn').onclick = () => {
    if (opts.resume) return closeRestock();
    leaveKitchen();
  };
  $('kcanvas').appendChild(kst.r.domElement); kst.reset();
  $('pickBtn').textContent = pickLabel(); $('pickBtn').onclick = () => { harvest(6, true); renderStock(); if (!kitchen.step) renderStage(); };
  renderStage(); renderStock();
}
function renderStock() {
  const el = $('kstock'); if (!el) return;
  el.innerHTML = Object.keys(DESSERTS).filter(id => unlocked(id, game.day) && !DESSERTS[id].drink).map(id => `<div>${icon(id)}×${stockOf(id)}</div>`).join('') + `<div>🍓×${kitchen.berries}</div><div>🪙${save.wallet || 0}</div>`;
}
const ING = { egg: ['🥚', 'Egg'], flour: ['🌾', 'Flour'], cheese: ['🧀', 'Cream cheese'], cookie: ['🍪', 'Cookie crust'], milk: ['🥛', 'Milk'], butter: ['🧈', 'Butter'], choc: ['🍫', 'Chocolate'], pretzel: ['🥨', 'Pretzel'], berry: ['🍓', 'Strawberry'] };
const INGR = { macaron: ['egg', 'flour', 'berry'], pancake: ['flour', 'egg', 'milk', 'berry'], cheesecake: ['cheese', 'egg', 'berry'], donut: ['flour', 'egg', 'milk', 'berry'], kittycupcake: ['egg', 'flour', 'choc', 'berry'], pretzelcake: ['flour', 'butter', 'choc'] };
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
  if (kind === 'pipe') return { ...base, n: 0, gr: [] };
  if (kind === 'sandwich') return { ...base, n: 0, miss: 0 };
  if (kind === 'griddle') return { ...base, n: 0, phase: 'pour', gr: [], secs: Math.max(4.5, 6.5 - game.day * 0.2) };
  if (kind === 'scoop' || kind === 'frost' || kind === 'topping') return { ...base, n: 0, miss: 0 };
  if (kind === 'lay') return { ...base, placed: [] };
  if (kind === 'drizzle') return { ...base, n: 0 };
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
  if ((st.kind === 'bake' && st.timed) || st.kind === 'fry' || (st.kind === 'griddle' && st.phase === 'cook')) {
    if (!st.start) st.start = now + (st.kind === 'bake' ? 1.4 : 0.8);   // let the door close and the camera settle first
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
    // a dessert that needs strawberries can't be started without any: say so here, on the card and on the garden button, not in a toast the window covers
    const noBerry = kitchen.berries < 1, needs = id => noBerry && INGR[id].includes('berry');
    el.innerHTML = `<p class="khint">${kitchen.msg || (noBerry ? '🍓 Out of strawberries! Pick some from the garden first' : 'Pick a dessert to bake')}</p><div class="recs">${ids.map(id => `<button class="rec${needs(id) ? ' need' : ''}" data-id="${id}"><i>${icon(id)}</i>${DESSERTS[id].name}${needs(id) ? '<small>🍓 needs strawberries</small>' : ''}</button>`).join('')}</div>`;
    if ($('pickBtn')) $('pickBtn').classList.toggle('pulse', noBerry);
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
  } else if (st.kind === 'griddle') {
    kst.set('griddle', st.id); if (st.phase === 'pour') showDemo('tap');
    const NEED = 3;
    if (st.phase === 'pour') {
      el.innerHTML = `<p class="khint">🥞 Pour batter into the pan! (${st.n}/${NEED})</p><button class="go" id="actBtn" style="margin:0 auto">Pour</button>`;
      const pour = () => { if (kitchen.step !== st || st.phase !== 'pour') return; sfx.tap(); kst.pourBatter(); st.phase = 'cook'; st.start = 0; st.p = null; renderStage(); };
      $('actBtn').onclick = pour; cv.onpointerdown = pour;
    } else {
      el.innerHTML = `<p class="khint">🥞 Flip it when the bubbles pop and it's golden! (${st.n + 1}/${NEED})</p><div class="meter" id="kmeterwrap"><i class="z0" style="width:55%"></i><i class="z1" style="width:27%"></i><i class="z2" style="width:18%"></i><b id="kmeter"></b></div><button class="go" id="actBtn" style="margin:0 auto">Flip!</button>`;
      const flip = () => {
        if (kitchen.step !== st || st.phase !== 'cook' || !st.start || st.p == null || st.p < 0.05) return;
        const p = st.p, g = p >= 0.62 && p <= 0.76 ? 3 : p >= 0.55 && p <= 0.82 ? 2 : 1;
        st.gr.push(g); st.phase = 'plate'; st.p = null; sfx.pick(); kst.flipCake(); el.querySelector('.khint').textContent = g === 3 ? '✨ Perfect flip!' : g === 2 ? '👍 Nice flip' : '😅 A bit off';
        setTimeout(() => {
          if (kitchen.step !== st) return;
          kst.plateCake(); st.n++;
          setTimeout(() => { if (kitchen.step !== st) return; if (st.n >= NEED) nextStep(Math.max(1, Math.min(3, Math.round(st.gr.reduce((a, b) => a + b, 0) / st.gr.length)))); else { st.phase = 'pour'; renderStage(); } }, 700);
        }, 1100);
      };
      $('actBtn').onclick = flip; cv.onpointerdown = flip;
    }
  } else if (st.kind === 'pipe') {
    kst.set('pipe', st.id); showDemo('hold');
    const NEED = 6;
    el.innerHTML = `<p class="khint">🎀 Press and hold to pipe a round, let go when it fills the ring! (${st.n}/${NEED})</p><div class="kpb"><i style="width:${st.n / NEED * 100}%"></i></div>`;
    const bar = el.querySelector('.kpb i'), hint = el.querySelector('.khint'); let active = false;
    cv.onpointerdown = e => { if (kitchen.step !== st || st.n >= NEED) return; try { cv.setPointerCapture(e.pointerId); } catch {} if (kst.pipeStart(e) < 0) { sfx.nope(); return; } active = true; };
    cv.onpointerup = cv.onpointercancel = () => {
      if (!active || kitchen.step !== st) return; active = false;
      const r = kst.pipeEnd(); if (r == null) return;
      const d = Math.abs(r - 1), g = d <= 0.17 ? 3 : d <= 0.38 ? 2 : 1; st.gr.push(g); st.n++; bar.style.width = st.n / NEED * 100 + '%';
      hint.textContent = `🎀 ${g === 3 ? 'Perfect round!' : r > 1 ? 'A bit big' : 'A bit small'} (${st.n}/${NEED})`; (g === 3 ? sfx.pick : sfx.tap)();
      if (st.n >= NEED) setTimeout(() => { if (kitchen.step === st) nextStep(Math.max(1, Math.min(3, Math.round(st.gr.reduce((a, b) => a + b, 0) / st.gr.length)))); }, 600);
    };
  } else if (st.kind === 'sandwich') {
    kst.set('sandwich', st.id); showDemo('tap');
    el.innerHTML = `<p class="khint">💗 Tap each macaron to add cream and its top shell! (${st.n}/6)</p>`;
    cv.onpointerdown = e => {
      if (kitchen.step !== st || st.n >= 6) return;
      if (!st.t0) st.t0 = performance.now();
      const n = kst.fillAt(e); if (n < 0) { st.miss++; sfx.nope(); return; }
      st.n = n; sfx.tap(); el.querySelector('.khint').textContent = `💗 Tap each macaron to add cream and its top shell! (${n}/6)`;
      if (n >= 6) { const secs = (performance.now() - st.t0) / 1000; setTimeout(() => { if (kitchen.step === st) finishBatch(st.id, Math.max(1, (secs < 6 ? 3 : secs < 10 ? 2 : 1) - (st.miss > 3 ? 1 : 0))); }, 900); }
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
  } else if (st.kind === 'scoop' || st.kind === 'frost' || st.kind === 'topping') {
    kst.set(st.kind, st.id); showDemo('tap');
    const HINT = { scoop: '🥄 Tap each paper cup to scoop batter into it!', frost: '🎂 Tap each cupcake to pipe the frosting!', topping: '🐱 Tap each cupcake to add the kitty ears!' };
    const last = st.kind === 'topping', LIM = { scoop: [8, 14], frost: [8, 14], topping: [6, 11] }[st.kind];
    el.innerHTML = `<p class="khint">${HINT[st.kind]} (${st.n}/6)</p><div class="kpb"><i style="width:${st.n / 6 * 100}%"></i></div>`;
    cv.onpointerdown = e => {
      if (kitchen.step !== st || st.n >= 6) return;
      const n = kst.cupAt(e);
      if (n < 0) { st.miss++; sfx.nope(); return; }
      if (!st.t0) st.t0 = performance.now();
      st.n = n; sfx.tap(); el.querySelector('.khint').textContent = `${HINT[st.kind]} (${n}/6)`; el.querySelector('.kpb i').style.width = n / 6 * 100 + '%';
      if (n >= 6) { const secs = (performance.now() - st.t0) / 1000, g = Math.max(1, (secs < LIM[0] ? 3 : secs < LIM[1] ? 2 : 1) - (st.miss > 3 ? 1 : 0)); setTimeout(() => { if (kitchen.step === st) last ? finishBatch(st.id, g) : nextStep(g); }, 650); }
    };
  } else if (st.kind === 'lay') {
    kst.set('lay', st.id); showDemo('tap');
    el.innerHTML = `<p class="khint">🥨 Tap the batter to lay the pretzels, nice and spread out! (${st.placed.length}/6)</p>`;
    cv.onpointerdown = e => {
      if (kitchen.step !== st || st.placed.length >= 6) return;
      const p = kst.layAt(e); if (!p) { sfx.nope(); return; }
      st.placed.push([p.x, p.z]); kst.lay(p); sfx.tap(); el.querySelector('.khint').textContent = `🥨 Tap the batter to lay the pretzels, nice and spread out! (${st.placed.length}/6)`;
      if (st.placed.length >= 6) {
        let gap = 9; st.placed.forEach((a, i) => st.placed.forEach((b, j) => { if (j > i) gap = Math.min(gap, Math.hypot(a[0] - b[0], a[1] - b[1])); }));
        setTimeout(() => { if (kitchen.step === st) nextStep(gap >= 0.34 ? 3 : gap >= 0.22 ? 2 : 1); }, 700);
      }
    };
  } else if (st.kind === 'drizzle') {
    kst.set('drizzle', st.id); showDemo('drag');
    const NEED = 50;
    el.innerHTML = `<p class="khint">🍯 Drag over the cake to drizzle the caramel!</p><div class="kpb"><i style="width:0%"></i></div>`;
    const bar = el.querySelector('.kpb i'); let down = false;
    const act = (e, d) => {
      const n = kst.drizzleAt(e, d); if (n == null) return;
      if (d && !st.t0) st.t0 = performance.now();
      st.n = n; bar.style.width = Math.min(100, n / NEED * 100) + '%';
      if (n >= NEED && kitchen.step === st) { const secs = (performance.now() - st.t0) / 1000; sfx.pick(); finishBatch(st.id, secs < 9 ? 3 : secs < 16 ? 2 : 1); }
    };
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch {} down = true; act(e, true); };
    cv.onpointermove = e => act(e, down);
    cv.onpointerup = cv.onpointercancel = e => { down = false; act(e, false); };
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
    el.innerHTML = `<p class="khint">🔥 ${st.id === 'macaron' ? "Take them out when the shells are set. Don't let them brown!" : "Take it out when it's golden. Don't let it burn!"}</p><div class="meter" id="kmeterwrap"><i class="z0" style="width:55%"></i><i class="z1" style="width:27%"></i><i class="z2" style="width:18%"></i><b id="kmeter"></b></div><button class="go" id="actBtn" style="margin:0 auto">Take out!</button>`;
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

