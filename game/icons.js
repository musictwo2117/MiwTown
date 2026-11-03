// Cheesecake Rush: pictures instead of emoji. Everything the game and home.js put on screen may still be written with an
// emoji; this watches the page (like i18n.js does for Thai) and swaps each one for a small picture of a model sculpted in
// Blender (models/icons.py for the icons, models/menu.py for the desserts and drinks, the character models for the friends).
// Emoji that only decorate a sentence are dropped. Until a model has loaded, the emoji stays, so nothing is ever blank.
// To give a new emoji a picture: sculpt it in icons.py, add its name to ICONS and a line to MAP.
(() => {
  // the icons sculpted in models/icons.py (one .glb each)
  const ICONS = ['strawberry', 'egg', 'cheese', 'flour', 'cookie', 'milk', 'butter', 'chocolate', 'pretzel', 'sparkle', 'coin', 'banknote', 'moneybag', 'phone', 'receipt',
    'heart', 'star', 'flame', 'angry', 'thought', 'clock', 'bell', 'lock', 'pan', 'spoon', 'bowl', 'ribbon', 'chefhat', 'sprout', 'mallet', 'finger', 'showcase', 'shopbag', 'speaker', 'mute', 'gear', 'bin', 'disk'];
  // emoji -> picture. The desserts and drinks use their own models; 🥮 stands for the pretzel cake (🥨 is the pretzel itself).
  const MAP = {
    '🍓': 'strawberry', '🥚': 'egg', '🧀': 'cheese', '🌾': 'flour', '🍪': 'cookie', '🥛': 'milk', '🧈': 'butter', '🍫': 'chocolate', '🥨': 'pretzel', '✨': 'sparkle',
    '🪙': 'coin', '💵': 'banknote', '💰': 'moneybag', '📱': 'phone', '🧾': 'receipt', '💗': 'heart', '💖': 'heart', '⭐': 'star', '🔥': 'flame', '💢': 'angry', '💭': 'thought',
    '⏱': 'clock', '⏰': 'clock', '🔔': 'bell', '🔒': 'lock', '🍳': 'pan', '🥄': 'spoon', '🥣': 'bowl', '🎀': 'ribbon', '👩‍🍳': 'chefhat', '🌱': 'sprout', '🔨': 'mallet',
    '👆': 'finger', '🏪': 'showcase', '🛍': 'shopbag', '🔊': 'speaker', '🔇': 'mute', '⚙': 'gear', '🗑': 'bin', '💾': 'disk',
    '🍰': 'cheesecake', '🍩': 'donut', '🧁': 'kittycupcake', '🥮': 'pretzelcake', '🧋': 'milktea', '☕': 'cocoa', '🍋': 'lemonade',
    '🐱': 'face_cat', '🐰': 'face_bunny', '🐻': 'face_bear', '🐸': 'face_frog', '🐥': 'face_chick', '🐧': 'face_penguin',
  };
  // emoji that only decorate a sentence: the words say it already
  const DROP = ['🙈', '🙌', '💪', '🙂', '🙅', '💤', '🥺', '🎉', '😋', '😢', '🤔', '👍'];
  const FACES = { face_cat: 'cat', face_bunny: 'bunny', face_bear: 'bear', face_frog: 'frog', face_chick: 'chick', face_penguin: 'penguin' };

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(MAP).concat(DROP).sort((a, b) => b.length - a.length);
  const RE = new RegExp('(' + keys.map(esc).join('|') + ')\\uFE0F?', 'gu'), HAS = new RegExp('(' + keys.map(esc).join('|') + ')', 'u');

  const css = document.createElement('style');
  css.textContent = `img.ico{height:1.18em;width:auto;vertical-align:-.24em;display:inline-block;margin:0 .05em;pointer-events:none;-webkit-user-drag:none;filter:drop-shadow(0 1px 1px rgba(120,60,90,.18))}
    button img.ico{vertical-align:middle}`;
  document.head.appendChild(css);

  const skip = n => { const p = n.parentNode; return !p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE)$/.test(p.nodeName); };
  function swap(node) {
    if (node.nodeType !== 3 || skip(node) || !HAS.test(node.data)) return;
    const s = node.data, frag = document.createDocumentFragment();
    let last = 0, changed = false;
    for (const m of s.matchAll(RE)) {
      const name = MAP[m[1]];
      const src = name && typeof thumbs !== 'undefined' && thumbs[name];
      if (name && !src) continue;               // the picture isn't ready yet: leave the emoji for now
      frag.append(s.slice(last, m.index));
      if (name) { const img = document.createElement('img'); img.className = 'ico'; img.alt = name; img.src = src; img.draggable = false; frag.append(img); }
      last = m.index + m[0].length; changed = true;
    }
    if (!changed) return;
    frag.append(s.slice(last));
    node.replaceWith(frag);
  }
  function walk(root) {
    if (root.nodeType === 3) return swap(root);
    if (root.nodeType !== 1) return;
    const nodes = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push(n);
    nodes.forEach(swap);
  }
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') swap(m.target);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });

  // turn each model into its small picture, then go over the page for the emoji that were waiting
  let queued = false;
  const sweep = () => { if (queued) return; queued = true; setTimeout(() => { queued = false; walk(document.body); setIcon(); }, 30); };
  const setIcon = () => {
    if (typeof thumbs === 'undefined' || !thumbs.cheesecake) return;
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    if (link.href !== thumbs.cheesecake) link.href = thumbs.cheesecake;
  };
  // The pictures are drawn from the models, which takes a moment after every refresh. So each finished picture is kept in
  // this browser (bump V when an icon is re-sculpted) and put straight back next time: the page opens already dressed.
  const V = 'cr-icons-v1';
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(V) || '{}'); } catch (e) {}
  Object.assign(thumbs, cache);
  const keep = () => {
    let changed = false;
    new Set(Object.values(MAP)).forEach(n => { if (thumbs[n] && cache[n] !== thumbs[n]) { cache[n] = thumbs[n]; changed = true; } });
    if (changed) try { localStorage.setItem(V, JSON.stringify(cache)); } catch (e) {}   // full or blocked storage: just draw them again next time
  };
  walk(document.body); setIcon();
  const fresh = ICONS.filter(n => !cache[n]);
  fresh.forEach((n, i) => setTimeout(() => loadModel(n, () => { makeThumb(n, () => makeScenery(n).g); sweep(); }), i * 8));
  whenModelsLoaded(() => {
    // a friend's face: just the head of its model, lit like the rest
    Object.entries(FACES).filter(([key]) => !cache[key]).forEach(([key, sp]) => makeThumb(key, () => {
      const m = makeModel(sp, SPECIES[sp].color), head = m.head;
      head.parent.remove(head); head.position.set(0, 0, 0); head.rotation.set(0, 0, 0);
      const w = new THREE.Group(); w.add(head); return w;
    }));
    sweep();
  });
  // the desserts and drinks get their pictures as their own models load: look again for a little while
  let tries = 0; const again = setInterval(() => { sweep(); keep(); if (++tries > 16) clearInterval(again); }, 900);
  window.ICONS = { sweep, MAP };
})();
