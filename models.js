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
  // meshes with baked soft shadows (a per-vertex "ao" color from Blender) get a material that multiplies it in
  const mat = (c, ao) => mats[c + ao] || (mats[c + ao] = new THREE.MeshLambertMaterial({ color: c, vertexColors: ao }));
  const templates = {};

  // whenModelsLoaded(cb) runs cb once every model asked for so far has loaded (or failed), or after maxMs at most:
  // the pages wait for it before merging still scenery, so the Blender pieces get merged too
  let pending = 0;
  const waiters = [];
  const settle = () => { if (--pending === 0) waiters.splice(0).forEach(f => f()); };
  window.whenModelsLoaded = (cb, maxMs = 6000) => {
    if (!pending) return cb();
    let done = false;
    const go = () => { if (!done) { done = true; cb(); } };
    waiters.push(go); setTimeout(go, maxMs);
  };

  window.loadModel = (name, onReady) => {
    if (!THREE.GLTFLoader) return;
    pending++;
    new THREE.GLTFLoader().load(`models/${name}.glb`, gltf => {
      templates[name] = gltf;
      try { onReady && onReady(name); } finally { settle(); }
    }, undefined, err => { console.warn(`models/${name}.glb didn't load, keeping the built-in look`, err); settle(); });
  };

  window.makeModel = (name, color) => {
    const t = templates[name];
    if (!t) return null;
    const g = t.scene.clone(true), find = n => g.getObjectByName(n);
    g.traverse(o => {
      if (!o.isMesh) return;
      const n = o.material.name;
      o.material = mat(n === 'skin' ? color : n === 'stripe' ? shade(color) : own(o.material), !!o.geometry.attributes.color);
      o.castShadow = !SMALL.test(n); o.receiveShadow = false;
    });
    return { g, body: find('body'), head: find('head'), tail: find('tail'), feet: [find('foot_L'), find('foot_R')], pose: poser(g, t.animations) };
  };

  // Buildings, furniture and props: every material keeps its Blender color (with baked shadows), except the names
  // in `special` (window glass, glowing bulbs...) which the page supplies so they can light up at night, and the
  // names in `colors` (a tree's "leaf", a flower's "petal"), which take the color given for this copy.
  window.makeScenery = (name, special = {}, colors = {}) => {
    const t = templates[name];
    if (!t) return null;
    const g = t.scene.clone(true);
    g.traverse(o => {
      if (!o.isMesh) return;
      const n = o.material.name;
      o.material = special[n] || mat(colors[n] || own(o.material), !!o.geometry.attributes.color);
      o.castShadow = o.receiveShadow = true;
    });
    return { g, find: n => g.getObjectByName(n) };
  };

  // Clips from Blender: "walk" takes over body, head, tail, feet and limbs while walking; "idle" sways limbs and ears
  // the rest of the time (body and head stay with the page's state poses); "blink" always runs.
  // Call pose() after the page has posed the character, so a playing clip has the last word.
  function poser(g, clips) {
    if (!clips.length) return null;
    const mixer = new THREE.AnimationMixer(g);
    const act = name => { const c = clips.find(c => c.name === name); return c ? mixer.clipAction(c) : null; };
    const walk = act('walk'), idle = act('idle'), blink = act('blink');
    // start each character's loops somewhere different, so a crowd doesn't blink in unison
    [idle, blink].forEach(a => { if (a) { a.play(); a.time = Math.random() * a.getClip().duration; } });
    let walking = false;
    return (isWalking, dt) => {
      if (isWalking !== walking) {
        walking = isWalking;
        // stopping a clip puts the nodes it moved back to their rest pose
        if (walking) { idle && idle.stop(); walk && walk.play(); }
        else { walk && walk.stop(); idle && idle.play(); }
      }
      mixer.update(dt);
    };
  }
})();
