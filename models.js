// Miw's Town: characters sculpted in Blender (models/<name>.glb, built by models/<name>.py), shared by the town and the room.
// makeModel() returns null until the file has loaded, so pages fall back to their code-built look meanwhile.
// Each .glb has nodes named body, head, tail, foot_L and foot_R at the same pivots as makeCharacter(), so the same animations drive it.
(() => {
  // "skin" takes the agent's color and "stripe" a deeper, warmer shade of it; everything else keeps its Blender color
  const STRIPE_INK = new THREE.Color('#8a4a3a');
  const shade = c => '#' + new THREE.Color(c).lerp(STRIPE_INK, 0.35).getHexString();
  const own = m => '#' + m.color.clone().convertLinearToSRGB().getHexString();
  const SMALL = /^(eye|shine|mouth|nose|blush|stripe|dot|glasses|lips|tongue|button|frogspot)$/;
  const mats = {};
  const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const templates = {};

  window.loadModel = (name, onReady) => {
    if (!THREE.GLTFLoader) return;
    new THREE.GLTFLoader().load(`models/${name}.glb`, gltf => { templates[name] = gltf.scene; onReady && onReady(name); },
      undefined, err => console.warn(`models/${name}.glb didn't load, keeping the built-in look`, err));
  };

  window.makeModel = (name, color) => {
    const t = templates[name];
    if (!t) return null;
    const g = t.clone(true), find = n => g.getObjectByName(n);
    g.traverse(o => {
      if (!o.isMesh) return;
      const n = o.material.name;
      o.material = mat(n === 'skin' ? color : n === 'stripe' ? shade(color) : own(o.material));
      o.castShadow = !SMALL.test(n); o.receiveShadow = false;
    });
    return { g, body: find('body'), head: find('head'), tail: find('tail'), feet: [find('foot_L'), find('foot_R')] };
  };
})();
