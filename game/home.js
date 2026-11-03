// Cheesecake Rush: the home screen (play with three save slots, how to play, settings, credits) and the pause menu.
// Loaded after game.html's own script, so it can use that script's globals (save, settings, kitchen, openKitchen...).
(() => {
  const css = document.createElement('style');
  css.textContent = `
  #home{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:16px;box-sizing:border-box;overflow:auto;
    background:radial-gradient(ellipse at 50% 38%,rgba(255,244,248,.45),rgba(253,222,236,.82));backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  #home[hidden]{display:none}
  .hbox{width:min(390px,100%);text-align:center}
  .hlogo{font:600 46px/1.02 'Fredoka',sans-serif;color:#c2406f;text-shadow:0 3px 0 #fff,0 10px 26px rgba(255,126,166,.45)}
  .hlogo i{display:block;font-style:normal;font-size:64px;margin-bottom:4px;animation:bob 2.6s ease-in-out infinite}
  .hlogo small{display:block;margin-top:8px;font:600 14px 'Nunito',sans-serif;color:#9a7f8c;text-shadow:none;letter-spacing:.3px}
  @keyframes bob{50%{transform:translateY(-8px) rotate(-4deg)}}
  .hmenu{display:flex;flex-direction:column;gap:10px;margin:26px auto 8px;width:min(270px,100%)}
  .hbtn{border:0;border-radius:18px;padding:13px 18px;font:600 18px 'Fredoka',sans-serif;cursor:pointer;color:#4b3442;background:rgba(255,255,255,.94);box-shadow:0 6px 18px rgba(160,80,115,.16);transition:transform .12s}
  .hbtn:hover{transform:translateY(-2px)}.hbtn:active{transform:scale(.97)}
  .hbtn.main{background:linear-gradient(140deg,#ff9fbf,#ff7ea6);color:#fff;box-shadow:0 8px 20px rgba(255,90,140,.38);font-size:21px;padding:15px 18px}
  .hver{margin-top:18px;font:600 12px 'Nunito',sans-serif;color:#b79aa8}
  .hcard{background:rgba(255,255,255,.95);border-radius:22px;box-shadow:0 10px 30px rgba(160,80,115,.2);padding:20px 20px 16px;text-align:center;max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box}
  .hcard h2{margin:0 0 10px;font:600 24px 'Fredoka',sans-serif}
  .hcard p{margin:6px 0;font-size:14px;line-height:1.5;color:#9a7f8c}
  .slot3{display:flex;align-items:center;gap:10px;text-align:left;background:#fff8fa;border:2px solid #ffe1ea;border-radius:16px;padding:10px 12px;margin:9px 0}
  .slot3 .n{width:34px;height:34px;border-radius:50%;background:#ffe1ea;display:grid;place-items:center;font:600 16px 'Fredoka',sans-serif;color:#c2406f;flex:none}
  .slot3 .t{flex:1;min-width:0}.slot3 b{display:block;font:600 15px 'Fredoka',sans-serif}.slot3 small{display:block;font-size:12px;color:#9a7f8c;line-height:1.35}
  .slot3 button{border:0;border-radius:12px;padding:8px 12px;font:600 13px 'Fredoka',sans-serif;cursor:pointer;background:linear-gradient(140deg,#ff9fbf,#ff7ea6);color:#fff;flex:none}
  .slot3 button.x{background:#f6e7ec;color:#9a7f8c;padding:8px 10px}
  .row3{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0;text-align:left;font:600 15px 'Fredoka',sans-serif}
  .seg{display:flex;background:#fbe3ea;border-radius:12px;padding:3px;gap:2px}
  .seg button{border:0;background:transparent;border-radius:9px;padding:6px 11px;font:600 13px 'Fredoka',sans-serif;cursor:pointer;color:#9a7f8c}
  .seg button.on{background:#fff;color:#c2406f;box-shadow:0 2px 6px rgba(160,80,115,.2)}
  .row3 input[type=range]{width:140px;accent-color:#ff7ea6}
  .back3{border:0;background:none;color:#9a7f8c;font:600 14px 'Nunito',sans-serif;margin-top:8px;padding:8px;cursor:pointer}
  .danger3{border:0;border-radius:12px;padding:9px 14px;font:600 13px 'Fredoka',sans-serif;cursor:pointer;background:#f6e7ec;color:#c2406f;margin-top:6px}
  .credit3{text-align:left;font-size:14px;line-height:1.5;color:#4b3442}.credit3 div{margin:9px 0}.credit3 b{display:block;font:600 13px 'Fredoka',sans-serif;color:#c2406f;letter-spacing:.4px}
  .hmenu2{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}
  .hmenu2 div{background:#fff8fa;border-radius:14px;padding:6px 2px;font:600 11px 'Nunito',sans-serif;line-height:1.2}
  .hmenu2 div i{display:grid;place-items:center;height:48px;font-style:normal;font-size:30px}.hmenu2 div i img{height:48px;width:48px;object-fit:contain}
  .hmenu2 div.locked{opacity:.45}.hmenu2 em{display:block;font:500 11px 'Fredoka',sans-serif;font-style:normal;color:#b07a0c}
  .quirks3{text-align:left;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin-top:8px}
  #menuBtn{font-size:20px}
  body.homing #top,body.homing #hands,body.homing #labels,body.homing #toast,body.homing #pay{visibility:hidden}
  `;
  document.head.appendChild(css);

  const home = document.createElement('div');
  home.id = 'home'; home.hidden = true; home.innerHTML = '<div class="hbox" id="hbox"></div>';
  document.body.appendChild(home);
  const box = home.querySelector('#hbox');

  // the menu button next to the sound button
  const menuBtn = document.createElement('button');
  menuBtn.id = 'menuBtn'; menuBtn.className = 'ibtn'; menuBtn.title = 'Menu'; menuBtn.textContent = '☰';
  $('mute').before(menuBtn);

  // ---------- saves ----------
  const readSlot = n => { try { return JSON.parse(localStorage.getItem(SLOT_KEY(n)) || 'null'); } catch { return null; } };
  const clearSlot = n => { try { localStorage.removeItem(SLOT_KEY(n)); } catch {} };
  // an old single save becomes slot 1
  try {
    const old = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (old && !readSlot(1)) { localStorage.setItem(SLOT_KEY(1), JSON.stringify({ day: old.day || 1, best: old.best || 0, total: 0, stock: {}, qual: {}, updated: Date.now() })); if (old.muted) { settings.muted = true; storeSettings(); } }
    if (old) localStorage.removeItem(SAVE_KEY);
  } catch {}

  function startSlot(n, fresh) {
    slot = n;
    if (fresh) { save = defaultSave(); resetKitchen(); }
    // a save from before the shop keeps the recipes it had already opened
    else { const d = readSlot(n) || {}; save = { ...defaultSave(), day: d.day || 1, best: d.best || 0, total: d.total || 0, wallet: d.wallet || 0, caseLv: d.caseLv || 0, decor: d.decor || {}, decorOwned: d.decorOwned || [], shelf: d.shelf || [], off: d.off || [], recipes: d.recipes || ['kittycupcake', 'pretzelcake', 'cocoa', 'lemonade'].filter(id => DESSERTS[id].day <= (d.day || 1)) }; kitchen.stock = d.stock || {}; kitchen.qual = d.qual || {}; kitchen.berries = d.berries ?? 6; plot.ready = d.ripe ?? 8; setPlotView(); updateBerryHud(); }
    store(); hideHome(); wakeAudio(); openKitchen(save.day);
  }

  // ---------- settings ----------
  const CAM_LOOKS = { low: [34, 37], mid: [48, 38], high: [62, 40] };
  function applySettings() {
    const [el, d] = CAM_LOOKS[settings.cam] || CAM_LOOKS.low;
    CAM.el = el * Math.PI / 180; CAM.d = d;
    renderer.setPixelRatio(basePixelRatio());
    ['vig', 'tsT', 'tsB'].forEach(id => { $(id).style.display = settings.fancy ? '' : 'none'; });
    if (typeof sparks !== 'undefined') sparks.p.visible = settings.fancy;
    $('mute').textContent = settings.muted ? '🔇' : '🔊'; setMusicLevel();
    if (!settings.lang) settings.lang = I18N.guess();
    I18N.set(settings.lang);
    resize();
    if (open) camBase = camera.position.clone();
  }

  // ---------- the screens ----------
  let view = 'main', open = false, camBase = null, from = 'main', wipe = false;
  const date = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const views = {
    main() {
      const resume = from === 'pause';
      return `<div class="hlogo"><i>🍰</i>Cheesecake<br>Rush<small>a cozy shop in Miw's Town</small></div>
        <div class="hmenu">
          <button class="hbtn main" data-go="slots">▶ Play</button>
          <button class="hbtn" data-go="how">🍓 How to play</button>
          <button class="hbtn" data-go="settings">⚙ Settings</button>
          <button class="hbtn" data-go="credits">💖 Credits</button>
          <a class="hbtn" href="../agent/town.html" style="text-decoration:none">🥨 Back to the town</a>
        </div><div class="hver">v0.1 · saved on this device</div>`;
    },
    pause() {
      return `<div class="hcard"><h2>⏸ Paused</h2>
        <div class="hmenu" style="margin-top:10px">
          <button class="hbtn main" data-act="resume">▶ Resume</button>
          <button class="hbtn" data-go="settings">⚙ Settings</button>
          <button class="hbtn" data-act="quit">💾 Save &amp; quit to title</button>
        </div></div>`;
    },
    slots() {
      const rows = [1, 2, 3].map(n => {
        const d = readSlot(n);
        return d ? `<div class="slot3"><span class="n">${n}</span><span class="t"><b>Day ${d.day}</b><small>⭐ best day ${d.best || 0} · 🪙 ${d.total || 0} earned · ${date(d.updated)}</small></span><button data-slot="${n}">Continue</button><button class="x" data-del="${n}" title="Delete">🗑</button></div>`
          : `<div class="slot3"><span class="n">${n}</span><span class="t"><b>Empty</b><small>Start a new shop</small></span><button data-new="${n}">New game</button></div>`;
      }).join('');
      return `<div class="hcard"><h2>💾 Choose a save</h2>${rows}<button class="back3" data-go="${from}">← Back</button></div>`;
    },
    how() {
      const d = save.day, menu = Object.keys(DESSERTS).map(id => { const x = DESSERTS[id]; return `<div class="${x.day <= 99 ? '' : 'locked'}"><i>${icon(id)}</i>${x.name}<em>${x.price} 🪙</em></div>`; }).join('');
      return `<div class="hcard"><h2>🍓 How to play</h2>
        <p><b>1. Bake.</b> Before opening, make desserts in the kitchen: drag the ingredients in, stir in circles, bake, then place toppings. Better baking sells for more.</p>
        <p><b>2. Serve.</b> Tap a dessert on the counter to pick it up (two at a time), then tap a friend's table. Quick service earns bigger tips.</p>
        <p><b>3. Cash up.</b> When they've eaten, friends queue at the cashier: tap the register and give the right change.</p>
        <div class="hmenu2">${menu}</div>
        <div class="quirks3">${Object.entries(SPECIES).map(([k, s]) => `<span>${EMOJI[k]} ${s.note}</span>`).join('')}</div>
        <button class="back3" data-go="${from}">← Back</button></div>`;
    },
    settings() {
      const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button data-set="${key}" data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
      return `<div class="hcard"><h2>⚙ Settings</h2>
        <div class="row3">Sound ${seg('muted', [[false, 'On'], [true, 'Off']])}</div>
        <div class="row3">Music ${seg('music', [[true, 'On'], [false, 'Off']])}</div>
        <div class="row3">Volume <input type="range" id="volume" min="0" max="1" step="0.05" value="${settings.vol}"></div>
        <div class="row3">Visual effects ${seg('fancy', [[true, 'Fancy'], [false, 'Simple']])}</div>
        <div class="row3">Camera ${seg('cam', [['low', 'Low'], ['mid', 'Mid'], ['high', 'High']])}</div>
        <div class="row3">Language ${seg('lang', [['en', 'English'], ['th', 'ไทย']])}</div>
        <p>Simple turns off the sparkles, the dark edges and the blur, which helps on slower devices.</p>
        <button class="danger3" data-act="wipe">${wipe ? 'Tap again to delete every save' : '🗑 Delete all saves'}</button><br>
        <button class="back3" data-go="${from}">← Back</button></div>`;
    },
    credits() {
      return `<div class="hcard"><h2>💖 Credits</h2><div class="credit3">
        <div><b>GAME</b>Cheesecake Rush, a cozy game from Miw's Town. Made by Miw, built together with Claude Code.</div>
        <div><b>3D MODELS</b>The friends, the desserts and the little props were sculpted in Blender, from Python scripts.</div>
        <div><b>ENGINE</b>three.js, running right in your browser.</div>
        <div><b>FONTS</b>Fredoka and Nunito, from Google Fonts.</div>
        <div><b>SOUND</b>The little blips are made live with the Web Audio API. The calm music is "Slow Stride" by isaiah658 (CC0, from OpenGameArt.org).</div>
        <div><b>THANKS</b>For stopping by the shop. Come back soon! 🍰</div></div>
        <button class="back3" data-go="${from}">← Back</button></div>`;
    },
  };

  function render(v) {
    view = v; box.innerHTML = views[v]();
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx.tap(); show(b.dataset.go); });
    box.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => startSlot(+b.dataset.slot, false));
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => startSlot(+b.dataset.new, true));
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (b.dataset.sure) { clearSlot(+b.dataset.del); render('slots'); } else { b.dataset.sure = 1; b.textContent = 'Sure?'; } });
    box.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
      const k = b.dataset.set, v2 = b.dataset.v;
      settings[k] = k === 'cam' || k === 'lang' ? v2 : v2 === 'true';
      storeSettings(); applySettings(); sfx.tap(); render('settings');
    });
    const vol = box.querySelector('#volume');
    if (vol) { vol.oninput = () => { settings.vol = +vol.value; storeSettings(); setMusicLevel(0.1); }; vol.onchange = () => sfx.pick(); }
    box.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'resume') closeMenu();
      else if (a === 'quit') saveAndQuit();
      else if (a === 'wipe') { if (wipe) { [1, 2, 3].forEach(clearSlot); wipe = false; toast('All saves deleted'); } else wipe = true; render('settings'); }
    });
  }
  function show(v) { if (v === 'main' || v === 'pause') from = v; wipe = false; render(v); }

  // ---------- opening and closing ----------
  window.showHome = (v = 'main') => {
    open = true; home.hidden = false; $('overlay').hidden = true; document.body.classList.add('homing');
    camBase = camBase || camera.position.clone(); from = v; show(v);
  };
  function hideHome() {
    open = false; home.hidden = true; document.body.classList.remove('homing');
    if (camBase) { camera.position.copy(camBase); camera.lookAt(CAM.at); camBase = null; }
  }
  let overlayWas = false;
  function openMenu() {
    if (open || !(game.running || kitchen.on || prep.on)) return;   // only while a day or the kitchen is going
    overlayWas = !$('overlay').hidden; menuOpen = true; window.showHome('pause');
  }
  function closeMenu() { menuOpen = false; hideHome(); $('overlay').hidden = !overlayWas; }
  function saveAndQuit() {
    hands.forEach(id => { if (!DESSERTS[id].drink) kitchen.stock[id] = (kitchen.stock[id] || 0) + 1; }); hands = [];
    closePay(); payQueue.length = 0;   // a checkout in progress goes away with the day
    miw.target = miw.path = miw.onArrive = null;
    customers.forEach(c => { removeActor(c.actor); c.bubble.remove(); });
    TABLES.forEach(t => { t.food.forEach(m => scene.remove(m)); t.food = []; t.customer = null; });
    queue.forEach(a => a.mark.remove());
    customers = []; queue = [];
    game.running = false; kitchen.on = false; prep.on = false; $('prepBar').hidden = true; menuOpen = false;
    renderHands(); dressStations(); updatePlates(); store();
    window.showHome('main');
  }
  menuBtn.onclick = () => { wakeAudio(); openMenu(); };
  addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (open) { if (from === 'pause') closeMenu(); } else openMenu(); });

  // a slow sway of the camera behind the menu
  window.homeTick = now => { if (open && camBase) { camera.position.x = camBase.x + Math.sin(now * 0.25) * 3; camera.lookAt(CAM.at); } };
  addEventListener('resize', () => { if (open) camBase = camera.position.clone(); });
  window.homeCamMoved = () => { if (open) camBase = camera.position.clone(); };

  applySettings();
  window.showHome('main');
})();
