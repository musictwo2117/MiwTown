// Miw's Town: the things a character can wear (a bow, scarf, flower crown, party hat, crown), built from simple shapes.
// Shared by the town's wardrobe (unlocked by levelling up, panel.js) and Cheesecake Rush's Outfit shop (bought with coins, game/outfit.js).
// slot says where it goes (head or neck), lv is the town level that unlocks it, cost is its price in the game.
(() => {
  const WEAR = [
    { key: 'bow', icon: '🎀', name: 'Bow', lv: 2, slot: 'head', cost: 30 },
    { key: 'scarf', icon: '🧣', name: 'Scarf', lv: 3, slot: 'neck', cost: 40 },
    { key: 'flowers', icon: '🌸', name: 'Flower crown', lv: 5, slot: 'head', cost: 60 },
    { key: 'party', icon: '🥳', name: 'Party hat', lv: 7, slot: 'head', cost: 50 },
    { key: 'crown', icon: '👑', name: 'Crown', lv: 10, slot: 'head', cost: 120 },
  ];
  const wMats = {};
  const wMat = (c, extra) => { const k = c + JSON.stringify(extra || {}); return wMats[k] || (wMats[k] = new THREE.MeshLambertMaterial({ color: c, ...extra })); };
  function part(parent, geo, c, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = [], extra) {
    const m = new THREE.Mesh(geo, wMat(c, extra));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true;
    parent.add(m); return m;
  }
  // builds the item onto the character's head or body; returns the meshes so they can come off again
  function makeWear(key, cat, miw) {
    // heights fit the sculpted models' big round heads, which sit low on the body (models/kit.py chibi())
    const top = miw ? 0.42 : 0.36, made = [];
    const grp = parent => { const g = new THREE.Group(); parent.add(g); made.push(g); return g; };
    if (key === 'bow') {
      const b = grp(cat.head); b.position.set(miw ? 0.24 : 0.23, top - 0.03, 0.06); b.rotation.z = -0.45;
      [-1, 1].forEach(sd => part(b, new THREE.ConeGeometry(0.09, 0.17, 12), '#ff7b9c', [sd * 0.085, 0, 0], [0, 0, sd * Math.PI / 2]));
      part(b, new THREE.SphereGeometry(0.045, 10, 8), '#ff5c8a');
    }
    if (key === 'scarf') {
      const s = grp(cat.body), y = miw ? 0.62 : 0.47, r = miw ? 0.2 : 0.29;
      part(s, new THREE.TorusGeometry(r, 0.075, 10, 24), '#8fc1f0', [0, y, 0], [Math.PI / 2, 0, 0]);
      part(s, new THREE.BoxGeometry(0.13, 0.28, 0.06), '#8fc1f0', [0.1, y - 0.15, r + 0.03], [-0.15, 0, 0.12]);
      [-0.06, 0.03].forEach(dy => part(s, new THREE.BoxGeometry(0.135, 0.03, 0.065), '#ffffff', [0.1 + dy * 0.1, y - 0.15 + dy, r + 0.03], [-0.15, 0, 0.12]));
    }
    if (key === 'flowers') {
      const f = grp(cat.head); f.position.y = top - 0.03; f.rotation.x = -0.12;
      part(f, new THREE.TorusGeometry(miw ? 0.3 : 0.27, 0.03, 8, 28), '#9fd49a', [], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, r = miw ? 0.3 : 0.27;
        part(f, new THREE.SphereGeometry(0.065, 10, 8), ['#ff9fb5', '#ffffff', '#ffd27a'][i % 3], [Math.cos(a) * r, 0.02, Math.sin(a) * r]);
      }
    }
    if (key === 'party') {
      const h = grp(cat.head); h.position.set(0.06, top + 0.13, 0); h.rotation.z = -0.25;
      part(h, new THREE.ConeGeometry(0.13, 0.32, 16), '#b9a6f5');
      [-0.06, 0.04].forEach(y => part(h, new THREE.CylinderGeometry(0.09 - y * 0.4, 0.1 - y * 0.4, 0.035, 16), '#ffd27a', [0, y, 0]));
      part(h, new THREE.SphereGeometry(0.06, 10, 8), '#ff9fb5', [0, 0.18, 0]);
    }
    if (key === 'crown') {
      const c = grp(cat.head); c.position.y = top + 0.04;
      part(c, new THREE.CylinderGeometry(0.16, 0.15, 0.12, 20, 1, true), '#ffd23f', [], [], { side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(c, new THREE.ConeGeometry(0.045, 0.1, 6), '#ffd23f', [Math.sin(a) * 0.15, 0.1, Math.cos(a) * 0.15]); }
      part(c, new THREE.SphereGeometry(0.035, 8, 6), '#ff7b9c', [0, 0, 0.16]);
    }
    return made;
  }
  window.WEAR = WEAR;
  window.makeWear = makeWear;
})();
