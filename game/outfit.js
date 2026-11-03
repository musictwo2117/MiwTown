// Cheesecake Rush: Miw's outfit. She wears one thing on her head and one round her neck (the same bows, crowns and scarf the town's
// friends unlock by levelling up, from shared/wear.js), and her sweater comes in a few colours. All of it is bought in the Shop's
// Outfit tab with the coins you keep, and she wears it in the café and in the kitchen.
const SWEATERS = [
  { key: 'yellow', name: 'Sunny yellow', color: '#fede7b', cost: 0 },
  { key: 'pink', name: 'Blossom pink', color: '#ffb7cd', cost: 30 },
  { key: 'mint', name: 'Mint', color: '#a9e5c9', cost: 30 },
  { key: 'sky', name: 'Sky blue', color: '#a9d4f7', cost: 30 },
  { key: 'lilac', name: 'Lilac', color: '#cdb9f5', cost: 30 },
];
const SWEATER_MESHES = /^(sweater|sleeve_[LR]|cuff_[LR]|hem)$/;
const wornIn = slot => ((save.wear || {})[slot]) || null;
const sweaterOf = () => SWEATERS.find(s => s.key === save.sweater) || SWEATERS[0];
// put Miw's things on any copy of her model (the café's, the kitchen's, the Shop's preview)
function applyOutfit(look) {
  if (!look || !look.head || !look.body || typeof makeWear !== 'function') return;
  (look.worn || []).forEach(p => p.parent && p.parent.remove(p)); look.worn = [];
  ['head', 'neck'].forEach(slot => { const k = wornIn(slot); if (k) look.worn.push(...makeWear(k, look, true)); });
  const col = sweaterOf().color;
  look.g.traverse(o => {
    if (!o.isMesh || !SWEATER_MESHES.test(o.name)) return;
    if (!o.userData.ownMat) { o.material = o.material.clone(); o.userData.ownMat = true; }   // the models share their materials, so copy it first
    o.material.color.set(col);
  });
}
const dressMiw = () => { if (typeof miw !== 'undefined' && miw.look && !miw.fallback) applyOutfit(miw.look); if (typeof kst !== 'undefined' && kst.dressChef) kst.dressChef(); };
// a picture of Miw in what she is wearing, for the Shop
function outfitPreview() {
  try {
    const m = makeModel('miw', '#ffd9c4'); if (!m) return '';
    if (!thumbRenderer) { thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbRenderer.setSize(128, 128); }
    applyOutfit(m); m.g.rotation.y = 0.45;
    const s = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 220 / 260, 0.1, 30);
    s.add(new THREE.HemisphereLight(0xfff4ea, 0xd9b0b4, 0.95)); const l = new THREE.DirectionalLight(0xfff3e6, 0.7); l.position.set(2, 4, 3); s.add(l); s.add(m.g);
    const bb = new THREE.Box3().setFromObject(m.g), c = bb.getCenter(new THREE.Vector3()), h = bb.getSize(new THREE.Vector3()).y;
    cam.position.set(c.x, c.y + h * 0.05, c.z + h * 2.1); cam.lookAt(c.x, c.y + h * 0.02, c.z);
    thumbRenderer.setSize(220, 260); thumbRenderer.render(s, cam); const url = thumbRenderer.domElement.toDataURL(); thumbRenderer.setSize(128, 128);
    return url;
  } catch (e) { console.warn('no outfit preview', e); return ''; }
}
function outfitCards() {
  const owned = save.wearOwned || [], sw = save.sweaterOwned || [];
  const slotRows = (slot, title) => `<h3 class="shopspot">${title}</h3>` + WEAR.filter(w => w.slot === slot).map(w => {
    const on = wornIn(slot) === w.key, has = owned.includes(w.key);
    const act = on ? `<button data-wear="${w.key}" class="on">✓ Wearing</button>` : has ? `<button data-wear="${w.key}">Wear</button>` : `<button data-wear="${w.key}" ${save.wallet < w.cost ? 'disabled' : ''}>${w.cost} 🪙</button>`;
    return `<div class="shoprow"><i>${w.icon}</i><span><b>${w.name}</b><small>Just pretty</small></span>${act}</div>`;
  }).join('');
  const sweaters = `<h3 class="shopspot">Sweater</h3>` + SWEATERS.map(s => {
    const on = sweaterOf().key === s.key, has = s.cost === 0 || sw.includes(s.key);
    const act = on ? `<button data-sweater="${s.key}" class="on">✓ Wearing</button>` : has ? `<button data-sweater="${s.key}">Wear</button>` : `<button data-sweater="${s.key}" ${save.wallet < s.cost ? 'disabled' : ''}>${s.cost} 🪙</button>`;
    return `<div class="shoprow"><i><u class="swatch" style="background:${s.color}"></u></i><span><b>${s.name}</b><small>Her sweater</small></span>${act}</div>`;
  }).join('');
  const pic = outfitPreview();
  return `<div class="outfitview">${pic ? `<img src="${pic}" alt="Miw">` : '<span>🧑‍🍳</span>'}</div>` + slotRows('head', 'Head') + slotRows('neck', 'Neck') + sweaters;
}
function outfitBind(root, rerender) {
  root.querySelectorAll('button[data-wear]').forEach(b => b.onclick = () => {
    const key = b.dataset.wear, w = WEAR.find(x => x.key === key); save.wear = save.wear || {}; save.wearOwned = save.wearOwned || [];
    if (wornIn(w.slot) === key) { save.wear[w.slot] = null; sfx.tap(); }   // tapping what she wears takes it off
    else if (save.wearOwned.includes(key)) { save.wear[w.slot] = key; sfx.pick(); }
    else { if (save.wallet < w.cost) return sfx.nope(); save.wallet -= w.cost; save.wearOwned.push(key); save.wear[w.slot] = key; sfx.fanfare(); }
    store(); dressMiw(); rerender();
  });
  root.querySelectorAll('button[data-sweater]').forEach(b => b.onclick = () => {
    const key = b.dataset.sweater, s = SWEATERS.find(x => x.key === key); save.sweaterOwned = save.sweaterOwned || [];
    if (s.cost && !save.sweaterOwned.includes(key)) { if (save.wallet < s.cost) return sfx.nope(); save.wallet -= s.cost; save.sweaterOwned.push(key); sfx.fanfare(); } else sfx.pick();
    save.sweater = key; store(); dressMiw(); rerender();
  });
}
