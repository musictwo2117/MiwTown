// ---------- the dessert case: a glass display fridge along the counter, with one compartment for each dessert on sale ----------
// the desserts stand on its shelf (as many as are left, up to six), a card stands in an empty or locked one, and the glass front lifts when somebody takes one
const CASE_X0 = -6.15, CASE_X1 = 2.25;   // the left slab of the counter: the swing door to the kitchen leaves a gap further along, so the case stops before it
const glassM = new THREE.MeshPhongMaterial({ color: '#e6f6ff', transparent: true, opacity: 0.2, shininess: 140, specular: new THREE.Color(0xffffff), depthWrite: false, side: THREE.DoubleSide });
const caseLightM = new THREE.MeshBasicMaterial({ color: '#fff1c2' });
const cardTex = {
  sold: canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ff9fbf'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = '#ef5f7e'; x.font = '700 40px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('×0', w / 2, h / 2 + 2); }),
  lock: canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9c1cf'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.font = '40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🔒', w / 2, h / 2 + 2); }),
};
// the compartment itself: tray, back, curved end plates, a lit lid and a curved glass front that bows over the desserts like a bakery case (rebuilt only when its width changes)
const CASE_D = 1.25, CASE_H = 1.15, CASE_R = 0.55;
// the glass: up the front, then round the bend and back along the top, as one ribbon of the given width; its hinge is the top edge, where the bend ends
function curvedGlass(w) {
  const pts = [[0.14, CASE_D / 2]];                                    // [y, z], from the bottom of the front
  pts.push([CASE_H - CASE_R, CASE_D / 2]);
  for (let k = 1; k <= 10; k++) { const a = k / 10 * PI / 2; pts.push([CASE_H - CASE_R + CASE_R * Math.sin(a), CASE_D / 2 - CASE_R + CASE_R * Math.cos(a)]); }
  const pos = [], idx = [];
  pts.forEach(([y, z]) => { pos.push(-w / 2, y - CASE_H, z - (CASE_D / 2 - CASE_R), w / 2, y - CASE_H, z - (CASE_D / 2 - CASE_R)); });   // relative to the hinge
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const endPlateGeo = (() => {   // the side of the case: flat back and bottom, a quarter-round bend at the top front
  const sh = new THREE.Shape(); sh.moveTo(-CASE_D / 2, 0); sh.lineTo(CASE_D / 2, 0); sh.lineTo(CASE_D / 2, CASE_H - CASE_R);
  for (let k = 1; k <= 10; k++) { const a = k / 10 * PI / 2; sh.lineTo(CASE_D / 2 - CASE_R + CASE_R * Math.cos(a), CASE_H - CASE_R + CASE_R * Math.sin(a)); }
  sh.lineTo(-CASE_D / 2, CASE_H); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false }); g.translate(0, 0, -0.035); g.rotateY(-PI / 2); return g;   // extruded along x
})();
function buildCase(st, W) {
  if (st.caseW === W) return;
  st.caseW = W; st.showKey = null; st.cab.clear();
  const c = st.cab, D = CASE_D, H = CASE_H, R = CASE_R;
  c.add(mesh(box(W, 0.1, D), '#fff6ef', { y: 0.05 }), mesh(box(W - 0.1, 0.04, D - 0.15), '#ffe3ec', { y: 0.12, cast: false }),
    mesh(box(W, H - 0.07, 0.06), '#ffd3e0', { y: (H + 0.07) / 2, z: -D / 2 + 0.03 }),
    mesh(box(W + 0.02, 0.1, D - R + 0.06), '#ff9fbf', { y: H + 0.04, z: -R / 2, cast: false }),
    mesh(box(W - 0.12, 0.03, D - R - 0.2), '', { y: H - 0.03, z: -R / 2 - 0.05, cast: false, mat: caseLightM }));
  [-1, 1].forEach(sd => { const e = mesh(endPlateGeo, '#ffc4d6', { x: sd * (W / 2 - 0.035) }); c.add(e); });
  const door = new THREE.Group(); door.position.set(0, H, D / 2 - R); c.add(door); st.door = door;   // the whole bowed glass hinges at the top and lifts up and out
  door.add(new THREE.Mesh(curvedGlass(W - 0.1), glassM), mesh(box(W * 0.45, 0.04, 0.05), '#ff9fbf', { y: 0.2 - H, z: R + 0.0, cast: false }));
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.28), new THREE.MeshBasicMaterial({ map: cardTex.sold, transparent: true })); card.position.set(0, 0.32, D / 2 - 0.3); card.rotation.x = -0.3; card.visible = false; c.add(card); st.card = card;
}
// the desserts on the shelf: one for each left in stock (up to six), packed to fit the compartment
function showStock(st, force) {
  const d = DESSERTS[st.id], open = onCounter(st.id), W = st.caseW || 2, maxN = W < 1.2 ? 4 : 6;
  const n = open ? Math.min(stockOf(st.id), maxN) : 0, key = `${st.id}|${n}|${open}|${W.toFixed(2)}`;
  if (!force && st.showKey === key) return;
  st.showKey = key; st.show.clear();
  const cols = W >= 1.7 ? 3 : 2, rowsMax = Math.ceil(maxN / cols), sc = Math.min(1.45, (W - 0.2) / cols * 0.95 / 0.65, 0.95 / rowsMax / 0.65);
  for (let k = 0; k < n; k++) {
    const m = dessertModel(st.id), r = (k / cols) | 0, c = k % cols;
    m.scale.setScalar(sc); m.position.set((c - (cols - 1) / 2) * (W - 0.15) / cols, 0, 0.32 - r * (0.95 / rowsMax)); st.show.add(m);
  }
  if (st.card) { st.card.visible = !n; st.card.material.map = open ? cardTex.sold : cardTex.lock; st.card.material.needsUpdate = true; }
}
const openCase = st => { if (st && st.door) st.doorT = 1; };
function stepCases(dt) {
  STATIONS.forEach(st => { if (!st.door || !st.stand.visible) return; st.doorT = Math.max(0, (st.doorT || 0) - dt * 1.5); st.door.rotation.x = -1.25 * Math.sin(Math.min(1, st.doorT) * PI); });
}
