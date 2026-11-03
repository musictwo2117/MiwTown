// Cheesecake Rush: decorating the café. The café has a few fixed spots; each holds one thing you have bought, and you swap
// them in the Shop's Decor tab. A few things come with a small perk (a lamp for tips, cushions for patient friends).
const DECOR_SPOTS = [
  { id: 'entrance', name: 'Left corner', at: [-6.4, 0, 1.2] },
  { id: 'lamp', name: 'Counter side', at: [-6.7, 0, -2.6] },
  { id: 'wall', name: 'Wall', at: [-1.6, 1.9, -4.78] },
  { id: 'cozy', name: 'Cozy corner', at: [6.5, 0, 3.4] },
  { id: 'rug', name: 'Floor', at: [0, 0.03, 1.4] },
  { id: 'garden', name: 'Front garden', at: [3.6, 0, 5.3] },
];
// model: a Blender model from shared/models, s: its scale, ry: turn, block: how much floor it takes (so nobody walks through it)
const DECOR_ITEMS = {
  plant:    { spot: 'entrance', name: 'Potted plant', emoji: '🪴', cost: 40, model: 'cornerplant', s: 0.75, block: 0.6 },
  flowers:  { spot: 'entrance', name: 'Flower box', emoji: '🌷', cost: 60, model: 'planters', s: 0.3, block: 0.5 },
  tree:     { spot: 'entrance', name: 'Little tree', emoji: '🌳', cost: 80, model: 'tree', s: 0.8, block: 0.6 },
  lamp:     { spot: 'lamp', name: 'Floor lamp', emoji: '💡', cost: 90, model: 'floorlamp', s: 0.6, block: 0.5, perk: { tip: 0.1 } },
  pine:     { spot: 'lamp', name: 'Tall tree', emoji: '🌲', cost: 60, model: 'treetall', s: 0.85, block: 0.6 },
  post:     { spot: 'lamp', name: 'Lamp post', emoji: '🏮', cost: 50, model: 'lamppost', s: 1.0, block: 0.3 },
  board:    { spot: 'wall', name: 'Menu board', emoji: '📋', cost: 70, model: 'whiteboard', s: 0.55 },
  sign:     { spot: 'wall', name: 'Café sign', emoji: '🪧', cost: 100, model: 'sign', s: 0.4 },
  beanbags: { spot: 'cozy', name: 'Bean bags', emoji: '🧸', cost: 80, model: 'beanbags', s: 0.55, block: 0.9, perk: { patience: 0.1 } },
  catbed:   { spot: 'cozy', name: 'Cat bed', emoji: '🐾', cost: 50, model: 'catbed', s: 0.6, block: 0.6 },
  sofa:     { spot: 'cozy', name: 'Sofa', emoji: '🛋', cost: 140, model: 'sofa', s: 0.55, ry: -Math.PI / 2, block: 1.0, perk: { patience: 0.15 } },
  rugpink:  { spot: 'rug', name: 'Pink rug', emoji: '🌸', cost: 50, rug: ['#ffc4d6', '#ffe1ea'] },
  rugmint:  { spot: 'rug', name: 'Mint rug', emoji: '🍃', cost: 50, rug: ['#bfe8d3', '#e3f6ec'] },
  rugstripe:{ spot: 'rug', name: 'Rainbow rug', emoji: '🎨', cost: 80, rug: ['#ffb3c1', '#ffd6a5', '#fdf3a7', '#caffbf', '#a6ecf5'] },
  planters: { spot: 'garden', name: 'Flower boxes', emoji: '🌼', cost: 60, model: 'planters', s: 0.5 },
  gardenlamp:{ spot: 'garden', name: 'Garden lamp', emoji: '🏮', cost: 50, model: 'lamppost', s: 1.1 },
  oak:      { spot: 'garden', name: 'Garden tree', emoji: '🌳', cost: 90, model: 'tree', s: 1.1 },
};
const PERK_TEXT = { tip: pct => `Tips +${pct}%`, patience: pct => `Friends wait ${pct}% longer` };
const decorG = new THREE.Group(); scene.add(decorG);
const decorBlocks = [];   // { x, z, r }: floor the walking friends keep out of
const decorOf = spotId => { const id = (save.decor || {})[spotId]; return id && DECOR_ITEMS[id] ? id : null; };
// the sum of the perks of everything that is out on show: decorPerk('tip') is 1.1 with the floor lamp
const decorPerk = kind => 1 + DECOR_SPOTS.reduce((a, sp) => a + (((DECOR_ITEMS[decorOf(sp.id)] || {}).perk || {})[kind] || 0), 0);
function decorBuild(it) {
  if (it.rug) {   // flat discs, the biggest first
    const g = new THREE.Group();
    it.rug.forEach((c, i) => { const r = 1.6 - i * (1.15 / it.rug.length); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03 + i * 0.004, 44), new THREE.MeshLambertMaterial({ color: c })); m.position.y = 0.012 + i * 0.002; m.scale.z = 0.72; g.add(m); });
    return g;
  }
  const m = makeScenery(it.model); if (!m) return null;
  const g = new THREE.Group(); m.g.scale.setScalar(it.s || 1); m.g.rotation.y = it.ry || 0; g.add(m.g);
  g.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m.g), c = b.getCenter(new THREE.Vector3());
  m.g.position.set(-c.x, -b.min.y, -c.z);   // put it right on its spot, whatever its model's own origin (room furniture sits where it stands in the room)
  return g;
}
function dressDecor() {
  decorG.clear(); decorBlocks.length = 0;
  DECOR_SPOTS.forEach(sp => {
    const id = decorOf(sp.id); if (!id) return;
    const it = DECOR_ITEMS[id], g = decorBuild(it); if (!g) return;
    g.position.set(...sp.at); decorG.add(g);
    if (it.block) decorBlocks.push({ x: sp.at[0], z: sp.at[2], r: it.block });
  });
}
Object.values(DECOR_ITEMS).forEach(it => { if (it.model) loadModel(it.model, dressDecor); });
// ---------- the Shop's Decor tab ----------
function decorCards() {
  const owned = save.decorOwned || [];
  return DECOR_SPOTS.map(sp => `<h3 class="shopspot">${sp.name}</h3>` + Object.keys(DECOR_ITEMS).filter(id => DECOR_ITEMS[id].spot === sp.id).map(id => {
    const it = DECOR_ITEMS[id], on = decorOf(sp.id) === id, has = owned.includes(id), perk = Object.entries(it.perk || {}).map(([k, v]) => PERK_TEXT[k](Math.round(v * 100))).join(' · ');
    const act = on ? '<button data-decor="' + id + '" class="on">✓ Placed</button>' : has ? '<button data-decor="' + id + '">Place</button>' : `<button data-decor="${id}" ${save.wallet < it.cost ? 'disabled' : ''}>${it.cost} 🪙</button>`;
    return `<div class="shoprow"><i>${it.emoji}</i><span><b>${it.name}</b><small>${perk || 'Just pretty'}</small></span>${act}</div>`;
  }).join('')).join('');
}
function decorBind(root, rerender) {
  root.querySelectorAll('button[data-decor]').forEach(b => b.onclick = () => {
    const id = b.dataset.decor, it = DECOR_ITEMS[id]; save.decor = save.decor || {}; save.decorOwned = save.decorOwned || [];
    if (decorOf(it.spot) === id) { delete save.decor[it.spot]; sfx.tap(); }   // tapping what is placed takes it away
    else if (save.decorOwned.includes(id)) { save.decor[it.spot] = id; sfx.pick(); }
    else { if (save.wallet < it.cost) return sfx.nope(); save.wallet -= it.cost; save.decorOwned.push(id); save.decor[it.spot] = id; sfx.fanfare(); }
    store(); dressDecor(); rerender();
  });
}
