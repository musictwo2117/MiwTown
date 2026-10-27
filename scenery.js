// Miw's Town: shared scenery for the town and the room — pretzels 🥨, floating-island undersides and icing drips.
// Loaded before each page's own script, so it only uses THREE.
(() => {
  const mats = {};
  const mat = (c, extra) => { const k = c + JSON.stringify(extra || {}); return mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ color: c, ...extra })); };
  const put = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  // ---------- 🥨 a pretzel, about 1.6 wide and 1.3 tall, standing in the XY plane, facing +z ----------
  // the rope starts at the lower-left end, crosses up through the middle, loops round, and crosses back to the lower-right end
  const PRETZEL_PATH = [
    [-0.55, -0.15, 0.02], [-0.3, 0.05, 0.05], [-0.06, 0.3, 0.08], [0.2, 0.56, 0.02], [0.5, 0.68, 0], [0.74, 0.5, 0], [0.8, 0.15, 0],
    [0.66, -0.26, 0], [0.36, -0.52, 0], [0, -0.6, 0], [-0.36, -0.52, 0], [-0.66, -0.26, 0], [-0.8, 0.15, 0], [-0.74, 0.5, 0],
    [-0.5, 0.68, 0], [-0.2, 0.56, 0.02], [0.06, 0.3, -0.08], [0.3, 0.05, -0.05], [0.55, -0.15, 0.02],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const pretzelCurve = new THREE.CatmullRomCurve3(PRETZEL_PATH);
  let pretzelGeo = null;
  window.makePretzel = ({ color = '#c98a4b', salt = true, material } = {}) => {
    const g = new THREE.Group();
    pretzelGeo = pretzelGeo || new THREE.TubeGeometry(pretzelCurve, 140, 0.13, 10, false);
    const m = material || mat(color);
    const body = put(g, pretzelGeo, m); body.castShadow = true;
    [PRETZEL_PATH[0], PRETZEL_PATH[PRETZEL_PATH.length - 1]].forEach(p => put(g, new THREE.SphereGeometry(0.13, 10, 8), m, p.x, p.y, p.z));
    if (salt) {
      const r = rng(7), saltMat = mat('#ffffff');
      for (let i = 0; i < 34; i++) {
        const p = pretzelCurve.getPointAt(r()), s = put(g, new THREE.BoxGeometry(0.045, 0.045, 0.045), saltMat, p.x + (r() - 0.5) * 0.08, p.y + (r() - 0.5) * 0.08, p.z + 0.11);
        s.rotation.set(r() * 3, r() * 3, 0);
      }
    }
    return g;
  };

  // ---------- floating-island underside: golden "baked" rock layers, salt crystals, pink gems and dangling roots ----------
  // rx/rz: radii at the top; top: the y it hangs from; depth: how far down the tip goes; bits: size of the crystals and roots (smaller for little islets)
  window.makeUnderside = ({ rx, rz, top, depth, seed = 3, bits = 1 }) => {
    const g = new THREE.Group(), r = rng(seed);
    const LAYERS = ['#e7b07c', '#dc9f69', '#d1925c', '#c4854f', '#b97a46'];
    const n = LAYERS.length;
    const radius = k => Math.pow(1 - k, 0.75);   // 1 at the top, 0 at the tip
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 1) / n, h = depth / n;
      const geo = new THREE.CylinderGeometry(Math.max(0.04, radius(k0)), Math.max(0.02, radius(k1) * 0.98), h, 28, 1);
      // nudge the rim so the layers look hand-made rather than perfectly round
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) { const w = 1 + (Math.sin(pos.getX(v) * 7 + i) + Math.cos(pos.getZ(v) * 5 - i)) * 0.03; pos.setX(v, pos.getX(v) * w); pos.setZ(v, pos.getZ(v) * w); }
      geo.computeVertexNormals();
      const m = put(g, geo, mat(LAYERS[i]), 0, top - h * (i + 0.5));
      m.scale.set(rx, 1, rz);
    }
    // white salt crystals and a few pink and lavender gems poking out of the sides
    const gem = [mat('#ffffff'), mat('#ffc4d6', { emissive: '#ff9fb5', emissiveIntensity: 0.25 }), mat('#d9ccf5', { emissive: '#b9a6f5', emissiveIntensity: 0.25 })];
    for (let i = 0; i < Math.max(6, Math.round(46 * bits)); i++) {
      const k = 0.08 + r() * 0.8, a = r() * Math.PI * 2, rad = radius(k) * 1.0, sz = Math.max(0.35, bits);
      const big = i % 3 === 0, geo = big ? new THREE.OctahedronGeometry((0.22 + r() * 0.25) * sz) : new THREE.BoxGeometry(0.16 * sz, 0.16 * sz, 0.16 * sz);
      const c = put(g, geo, big ? gem[1 + (i % 2)] : gem[0], Math.cos(a) * rad * rx, top - k * depth, Math.sin(a) * rad * rz);
      c.rotation.set(r() * 3, r() * 3, r() * 3);
      if (big) c.scale.y = 1.6;
    }
    // dangling roots with tiny leaves
    for (let i = 0; i < Math.max(3, Math.round(14 * bits)); i++) {
      const k = 0.2 + r() * 0.55, a = r() * Math.PI * 2, rad = radius(k) * 0.97, len = (0.8 + r() * 1.6) * Math.max(0.4, bits);
      const x = Math.cos(a) * rad * rx, z = Math.sin(a) * rad * rz, y = top - k * depth;
      const root = put(g, new THREE.CylinderGeometry(0.035, 0.015, len, 5), mat('#8a6a52'), x, y - len / 2, z);
      root.rotation.z = (r() - 0.5) * 0.3;
      if (r() > 0.4) put(g, new THREE.SphereGeometry(0.1, 6, 5), mat('#9fd49a'), x, y - len * (0.4 + r() * 0.4), z).scale.set(1.3, 0.6, 1);
    }
    return g;
  };

  // ---------- a rounded-rectangle floating island (for the Cat Room) ----------
  // grass on top, a pink icing lip with drips, golden dough sides, then soft rounded layers that narrow
  // down to a cluster of hanging tips, with gems, salt crystals and leafy vines on the way
  const rrect = (hw, hd, r) => {
    r = Math.min(r, hw * 0.99, hd * 0.99);
    const s = new THREE.Shape();
    s.moveTo(-hw + r, -hd); s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r);
    s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd); s.lineTo(-hw + r, hd);
    s.quadraticCurveTo(-hw, hd, -hw, hd - r); s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    return s;
  };
  // a slab of that shape whose top sits at y = top; the shape's y becomes world z
  const slab = (parent, hw, hd, r, h, m, top, bevel = 0, x = 0, z = 0) => {
    const geo = new THREE.ExtrudeGeometry(rrect(hw, hd, r), { depth: h, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
    geo.rotateX(Math.PI / 2);
    const o = put(parent, geo, m, x, top - bevel, z);
    return o;
  };
  window.makeFloatingIsland = ({ hw, hd, r = 2, depth = 9, seed = 21 }) => {
    const g = new THREE.Group(), rnd = rng(seed);
    const grass = slab(g, hw - 0.05, hd - 0.05, r, 0.12, mat('#bfe5a8'), 0.03); grass.receiveShadow = true;
    slab(g, hw + 0.22, hd + 0.22, r + 0.22, 0.2, mat('#f9cdd9'), -0.06, 0.07);
    slab(g, hw, hd, r, 1.3, mat('#e7b07c'), -0.25);
    // icing drips all the way round the lip
    rrect(hw + 0.3, hd + 0.3, r + 0.3).getSpacedPoints(Math.round((hw + hd) * 4)).forEach((p, i) => {
      const d = 0.25 + rnd() * 0.6;
      put(g, new THREE.SphereGeometry(0.17, 10, 8), mat('#f9cdd9'), p.x, -0.22 - d / 2, p.y).scale.set(0.8, d / 0.34, 0.8);
      put(g, new THREE.SphereGeometry(0.12, 8, 6), mat('#f9cdd9'), p.x, -0.22 - d, p.y);
    });
    // the underside: rounded layers, each a little smaller and rounder, nudged off-centre so it looks hand-made
    const LAYERS = ['#e0a571', '#d49863', '#c98b56', '#bd7f4b', '#b07443', '#a3693c'];
    const gem = [mat('#ffffff'), mat('#ffc4d6', { emissive: '#ff9fb5', emissiveIntensity: 0.3 }), mat('#d9ccf5', { emissive: '#b9a6f5', emissiveIntensity: 0.3 })];
    let y = -1.55, last = null;
    LAYERS.forEach((c, k) => {
      // stays wide near the top so the cliff shows below the rim, then narrows quickly toward the tip
      const s = 1 - Math.pow((k + 1) / LAYERS.length, 1.5) * 0.86, h = depth / LAYERS.length;
      const lw = hw * s, ld = hd * s, lr = r + (1 - s) * Math.min(hw, hd) * 0.7, ox = (rnd() - 0.5) * hw * 0.08, oz = (rnd() - 0.5) * hd * 0.08;
      const bev = Math.min(0.35, h * 0.15), bottom = y - h * 0.8;
      slab(g, lw, ld, lr, h * 0.8, mat(c), y, bev, ox, oz);
      // a cream band under each layer, like the filling in a layer cake
      slab(g, lw + bev + 0.06, ld + bev + 0.06, lr + bev + 0.06, 0.16, mat(k % 2 ? '#fff3e6' : '#ffe3ea'), bottom + 0.1, 0.05, ox, oz);
      // on the outside of this layer: moss draping off the band, crystal clusters and salt in the side, roots hanging below
      rrect(lw + bev + 0.1, ld + bev + 0.1, lr + bev + 0.1).getSpacedPoints(18 + k * 3).forEach((p, i) => {
        const x = ox + p.x, z = oz + p.y, roll = rnd();
        if (roll < 0.3 && k < 5) {
          put(g, new THREE.SphereGeometry(0.28 + rnd() * 0.2, 10, 8), mat(rnd() > 0.5 ? '#9fd49a' : '#8cc786'), x, bottom - 0.05, z).scale.set(1.4, 0.75, 1.4);
          if (rnd() > 0.6) put(g, new THREE.SphereGeometry(0.07, 6, 5), mat(['#ffb3c8', '#fff1b0', '#ffffff'][i % 3]), x, bottom - 0.32, z);
        } else if (roll < 0.5) {
          const cy = y - h * (0.25 + rnd() * 0.35), m = gem[1 + (i % 2)];
          for (let c = 0; c < 3; c++) {
            const o = put(g, new THREE.OctahedronGeometry(0.2 + rnd() * 0.25), m, x + (rnd() - 0.5) * 0.4, cy + (rnd() - 0.5) * 0.3, z + (rnd() - 0.5) * 0.4);
            o.rotation.set(rnd() * 0.8, rnd() * 3, (rnd() - 0.5) * 1.2); o.scale.y = 1.7;
          }
        } else if (roll < 0.65) {
          const o = put(g, new THREE.BoxGeometry(0.2, 0.2, 0.2), gem[0], x, y - h * (0.2 + rnd() * 0.5), z);
          o.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
        } else if (roll < 0.78 && k > 0) {
          const len = 1 + rnd() * 1.8;
          put(g, new THREE.CylinderGeometry(0.04, 0.015, len, 5), mat('#8a6a52'), x, bottom - len / 2, z).rotation.z = (rnd() - 0.5) * 0.25;
          put(g, new THREE.SphereGeometry(0.12, 6, 5), mat('#9fd49a'), x, bottom - len * (0.5 + rnd() * 0.3), z).scale.set(1.3, 0.6, 1);
        }
      });
      last = { lw, ld, ox, oz, y: y - h * 0.7 };
      y -= h * 0.8;
    });
    // a cluster of hanging tips at the very bottom
    for (let i = 0; i < 7; i++) {
      const len = 1 + rnd() * 2.4, w = 0.35 + rnd() * 0.5;
      const tip = put(g, new THREE.ConeGeometry(w, len, 7), mat(i % 2 ? '#a3693c' : '#b07443'), last.ox + (rnd() - 0.5) * last.lw * 1.4, last.y - len / 2 + 0.1, last.oz + (rnd() - 0.5) * last.ld * 1.4);
      tip.rotation.x = Math.PI;
    }
    // leafy vines with tiny flowers hanging off the lip
    rrect(hw + 0.15, hd + 0.15, r + 0.15).getSpacedPoints(26).forEach((p, i) => {
      if (rnd() > 0.6) return;
      const n = 3 + Math.floor(rnd() * 6);
      for (let k = 0; k < n; k++) put(g, new THREE.SphereGeometry(0.11 - k * 0.006, 7, 6), mat(k % 3 === 2 ? '#8cc786' : '#9fd49a'), p.x + Math.sin(k * 1.7 + i) * 0.06, -0.35 - k * 0.2, p.y).scale.set(1, 1.2, 0.8);
      if (rnd() > 0.5) put(g, new THREE.SphereGeometry(0.06, 6, 5), mat(['#ffb3c8', '#fff1b0', '#ffffff'][i % 3]), p.x, -0.35 - n * 0.1, p.y + 0.05);
    });
    return g;
  };

  // ---------- merge everything that never moves into a few big meshes (far fewer draw calls) ----------
  // It watches the scene for a few seconds first: anything whose position, size, visibility or material changes is
  // left alone. Mark things that change only now and then (a clock hand, something the weather or a festival
  // toggles) with userData.noMerge. Meshes are merged per material across the whole scene, except inside the groups
  // listed in `owners` (buildings you can tap, decorations that come off later), which keep their own merged meshes.
  // A group that moves as a whole (a bobbing islet, the balloon) gets its still parts merged inside it too.
  window.mergeStatic = (scene, { watchMs = 3000, skip = () => false, owners = new Set(), done } = {}) => {
    const blocked = o => { for (let p = o; p && p !== scene; p = p.parent) if (p.userData.noMerge || !p.visible || skip(p)) return true; return false; };
    const topOf = o => { while (o.parent && o.parent !== scene) o = o.parent; return o; };
    // each mesh is watched relative to its top group (the object sitting directly in the scene); tops are watched in the world
    const relTo = (o, top) => top === o ? o.matrixWorld.elements.slice() : new THREE.Matrix4().copy(top.matrixWorld).invert().multiply(o.matrixWorld).elements.slice();
    const same = (a, b) => { for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > 1e-6) return false; return true; };
    const cands = [], tops = new Map();
    scene.updateMatrixWorld(true);   // things built just now haven't been drawn yet, so their world positions aren't filled in
    scene.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
      if (o.material.transparent || o.material.isShaderMaterial || blocked(o)) return;
      const top = topOf(o);
      if (!tops.has(top)) tops.set(top, { start: top.matrixWorld.elements.slice() });
      cands.push({ o, top, mat: o.material, start: relTo(o, top) });
    });
    const t0 = performance.now();
    (function watch() {
      for (const [top, t] of tops) if (!t.moved && !same(top.matrixWorld.elements, t.start)) t.moved = true;
      for (const c of cands) {
        if (c.moved) continue;
        if (!c.o.parent || !c.o.visible || c.o.material !== c.mat || !same(relTo(c.o, c.top), c.start)) c.moved = true;
      }
      if (performance.now() - t0 < watchMs) { requestAnimationFrame(watch); return; }
      // a mesh sitting straight in the scene is still only if it never moved; one inside a group, if it never moved within it
      const still = cands.filter(c => !c.moved && !(c.top === c.o && tops.get(c.top).moved));
      still.forEach(c => { c.o.userData.mergeOwner = c.top !== c.o && (tops.get(c.top).moved || owners.has(c.top)) ? c.top : null; });
      const merged = merge(still.map(c => c.o));
      if (done) done(merged);
    })();

    function merge(list) {
      const buckets = new Map();
      for (const o of list) {
        const owner = o.userData.mergeOwner || scene, key = owner.uuid + '|' + o.material.uuid;
        if (!buckets.has(key)) buckets.set(key, { owner, mat: o.material, items: [] });
        buckets.get(key).items.push(o);
      }
      const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), dropped = new Set();
      let count = 0;
      for (const { owner, mat, items } of buckets.values()) {
        if (items.length < 2) continue;
        owner.updateMatrixWorld(true);
        inv.copy(owner.matrixWorld).invert();
        const parts = items.map(o => {
          const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
          rel.multiplyMatrices(inv, o.matrixWorld);
          g.applyMatrix4(rel);
          if (!g.attributes.normal) g.computeVertexNormals();
          return g;
        });
        const n = parts.reduce((s, g) => s + g.attributes.position.count, 0);
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
        let off = 0;
        for (const g of parts) { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; g.dispose(); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat);
        m.castShadow = items.some(o => o.castShadow); m.receiveShadow = items.some(o => o.receiveShadow);
        owner.add(m);
        items.forEach(o => { dropped.add(o.geometry); o.parent.remove(o); });
        count += items.length;
      }
      // free the originals' GPU copies unless something still on screen uses the same geometry
      const inUse = new Set();
      scene.traverse(o => o.geometry && inUse.add(o.geometry));
      dropped.forEach(g => inUse.has(g) || g.dispose());
      return count;
    }
  };

  // ---------- icing drips hanging along an edge from (x0, z0) to (x1, z1) at height y; (nx, nz) points outward ----------
  window.makeIcing = ({ x0, z0, x1, z1, y, nx, nz, color = '#fff3f6', seed = 5 }) => {
    const g = new THREE.Group(), r = rng(seed), m = mat(color);
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.55));
    for (let i = 0; i <= n; i++) {
      const u = i / n, d = 0.25 + r() * 0.55, x = x0 + (x1 - x0) * u + nx * 0.04, z = z0 + (z1 - z0) * u + nz * 0.04;
      put(g, new THREE.SphereGeometry(0.17, 10, 8), m, x, y - d / 2, z).scale.set(0.8, d / 0.34, 0.8);
      put(g, new THREE.SphereGeometry(0.12, 8, 6), m, x, y - d, z);
    }
    return g;
  };
})();
