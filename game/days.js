// ---------- days ----------
function startDay(d) {
  prep.on = false; $('prepBar').hidden = true;
  customers.forEach(c => { removeActor(c.actor); c.bubble.remove(); });
  TABLES.forEach(t => { t.food.forEach(m => scene.remove(m)); t.food = []; t.customer = null; });
  queue.forEach(a => a.mark.remove());
  customers = []; queue = []; hands = []; payQueue.length = 0; pay.c = null; $('pay').hidden = true;
  Object.assign(game, { day: d, running: true, paused: false, open: true, time: DAY_SECONDS, coins: 0, shown: 0, combo: 0, served: 0, missed: 0, spawnIn: 1.2 });
  miw.root.position.copy(HOME); miw.target = null; miw.path = null; miw.face = 0;
  renderHands(); dressStations(); dressTables(); showCombo(); updateBerryHud();
  $('dayName').textContent = `Day ${d}`;
  $('overlay').hidden = true;
  const fresh = Object.keys(DESSERTS).find(id => DESSERTS[id].day === d && d > 1);
  toast(fresh ? `New on the menu: ${DESSERTS[fresh].name}! ${DESSERTS[fresh].emoji}` : `Day ${d}: earn ${goalFor(d)} 🪙`);
  sfx.fanfare();
}
function endDay() {
  game.running = false;
  $('panel').classList.remove('wide');
  hands.forEach(id => { if (!DESSERTS[id].drink) kitchen.stock[id]++; }); hands = []; renderHands();
  const goal = goalFor(game.day), won = game.coins >= goal;
  const stars = !won ? 0 : game.coins >= goal * 1.7 ? 3 : game.coins >= goal * 1.35 ? 2 : 1;
  save.total = (save.total || 0) + game.coins; save.wallet = (save.wallet || 0) + game.coins;
  if (won) { save.day = Math.max(save.day, game.day + 1); save.best = Math.max(save.best, game.day); sfx.fanfare(); } else sfx.sad();
  store();
  daySummary(goal, won, stars);
}
function daySummary(goal, won, stars) {
  $('panel').classList.remove('shopwide');
  const next = won ? game.day + 1 : game.day, news = Object.keys(DESSERTS).some(id => DESSERTS[id].cost && !owns(id) && DESSERTS[id].day <= next && save.wallet >= DESSERTS[id].cost);
  $('panel').innerHTML = `
    <h2>${won ? 'Shop closed! 🎉' : 'Not quite… 🥺'}</h2>
    <p>Day ${game.day} · goal ${goal} 🪙</p>
    <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s">⭐</span>`).join('')}</div>
    <div class="stats"><div><b>${game.coins}</b><span>coins</span></div><div><b>${game.served}</b><span>happy friends</span></div><div><b>${game.missed}</b><span>left hungry</span></div></div>
    <div class="wallet">🪙 ${save.wallet} saved</div>
    <button class="go" id="goBtn">${won ? `Open day ${game.day + 1} →` : `Try day ${game.day} again`}</button>
    <button class="alt" id="shopBtn">🛒 Shop${news ? ' ✨' : ''}</button>
    ${won ? `<button class="alt" id="againBtn">Replay day ${game.day}</button>` : ''}`;
  $('overlay').hidden = false;
  $('shopBtn').onclick = () => openShop(next, () => daySummary(goal, won, stars));
  $('goBtn').onclick = () => openKitchen(won ? game.day + 1 : game.day);
  if (won) $('againBtn').onclick = () => openKitchen(game.day);
}
// the shop: spend the coins you have kept on dishes and drinks that are open by now
// the shop sells things by category: each tab is one category (add outfits, furniture... here as they come)
let shopTab = 'recipes';
const SHOP_TABS = [['recipes', 'Recipes'], ['counter', 'Counter'], ['decor', 'Decor'], ['outfit', 'Outfit']];
function openShop(day, back, tab) {
  if (tab) shopTab = tab;
  const ids = Object.keys(DESSERTS).filter(id => DESSERTS[id].cost);
  $('panel').classList.remove('wide'); $('panel').classList.add('shopwide');   // a wide, landscape window that scrolls, so a long menu is easy to browse
  const c = caseSection();
  $('panel').innerHTML = `
    <div class="shophead"><div><h2>🛒 Shop</h2><small>Spend the coins you keep.</small></div><div class="wallet">🪙 ${save.wallet}</div></div>
    <div class="shoptabs">${SHOP_TABS.map(([k, n]) => `<button data-tab="${k}" class="${k === shopTab ? 'on' : ''}">${n}</button>`).join('')}</div>
    ${shopTab === 'decor' ? `<div class="shopgrid">${decorCards()}</div>` : shopTab === 'outfit' ? `<div class="shopgrid">${outfitCards()}</div>` : shopTab === 'counter' ? `<div class="shopgrid">${c.upgrade}</div>${c.pick}` : `<div class="shopgrid">${ids.map(id => { const d = DESSERTS[id], has = owns(id), soon = d.day > day;
      return `<div class="shoprow"><i>${icon(id)}</i><span><b>${d.name}</b><small>${d.drink ? 'Drink' : 'Dessert'} · sells for ${d.price} 🪙</small></span>${has ? '<em>✓ Owned</em>' : soon ? `<em>Opens day ${d.day}</em>` : `<button data-id="${id}" ${save.wallet < d.cost ? 'disabled' : ''}>${d.cost} 🪙</button>`}</div>`; }).join('')}</div>`}
    <button class="go" id="backBtn">Back</button>`;
  if (shopTab === 'decor') decorBind($('panel'), () => openShop(day, back));
  if (shopTab === 'outfit') outfitBind($('panel'), () => openShop(day, back));
  $('panel').querySelectorAll('.shoptabs button').forEach(b => b.onclick = () => { sfx.tap(); openShop(day, back, b.dataset.tab); });
  $('panel').querySelectorAll('.shopgrid button[data-id]').forEach(b => b.onclick = () => {
    const id = b.dataset.id, d = DESSERTS[id]; if (owns(id) || save.wallet < d.cost) return;
    save.wallet -= d.cost; (save.recipes = save.recipes || []).push(id); store(); sfx.fanfare(); openShop(day, back);
  });
  const up = $('caseBtn');
  if (up) up.onclick = () => { const c = CASE_COST[(save.caseLv || 0) + 1]; if (save.wallet < c) return; save.wallet -= c; save.caseLv = (save.caseLv || 0) + 1; store(); sfx.fanfare(); openShop(day, back); };
  $('panel').querySelectorAll('.chips button').forEach(b => b.onclick = () => {
    const id = b.dataset.id, on = shelfIds().includes(id); save.shelf = save.shelf || []; save.off = save.off || [];
    if (on) { if (shelfIds().length <= 1) return sfx.nope(); const keep = shelfIds().filter(x => x !== id); save.shelf = keep; save.off = dessertIds().filter(x => unlocked(x, game.day) && !keep.includes(x)); }   // the freed plate stays free for the one you pick next
    else { if (shelfIds().length >= caseSlots()) { toast('The counter is full: take one off first'); return sfx.nope(); } save.off = save.off.filter(x => x !== id); save.shelf.push(id); }
    store(); sfx.pick(); openShop(day, back);
  });
  $('backBtn').onclick = back;
}
// the Shop button in the corner: pause the café, look round the shop, then carry on
function shopMidDay() {
  if (menuOpen || game.paused) return;
  if (!game.running || kitchen.on) return toast('The shop is open during the day, or after closing 🛍');
  game.paused = true; $('overlay').hidden = false;
  openShop(game.day, () => { $('panel').classList.remove('shopwide'); $('overlay').hidden = true; game.paused = false; dressStations(); updatePlates(); renderHands(); sfx.bell(); });
}
$('shopHud').onclick = shopMidDay;
$('prepKitchen').onclick = backToKitchen;
$('prepOpen').onclick = openTheShop;
// the display case: buy more plates for the counter, and choose which of your desserts stand on them
function caseSection() {
  const lv = save.caseLv || 0, next = CASE_COST[lv + 1], mine = dessertIds().filter(id => unlocked(id, game.day)), on = shelfIds();
  const upgrade = next === undefined ? `<div class="shoprow"><i>🏪</i><span><b>Display case</b><small>${caseSlots()} plates · full</small></span><em>✓ Max</em></div>`
    : `<div class="shoprow"><i>🏪</i><span><b>Bigger display case</b><small>${caseSlots()} → ${CASE_SLOTS[lv + 1]} plates on the counter</small></span><button id="caseBtn" ${save.wallet < next ? 'disabled' : ''}>${next} 🪙</button></div>`;
  const pick = mine.length > caseSlots() ? `<p class="hint">On the counter (${on.length}/${caseSlots()}): tap to swap</p><div class="chips">${mine.map(id => `<button data-id="${id}" class="${on.includes(id) ? 'on' : ''}">${DESSERTS[id].emoji} ${DESSERTS[id].name}</button>`).join('')}</div>` : '';
  return { upgrade, pick };
}
// load every model, then refresh the pictures that use them
['cat', 'bunny', 'bear', 'frog', 'chick', 'penguin', 'miw', 'cheesefull', 'pretzelfull'].forEach(sp => loadModel(sp));
Object.keys(DESSERTS).filter(id => DESSERTS[id].drink).forEach(id => makeThumb(id));
Object.keys(DESSERTS).filter(id => !DESSERTS[id].drink).forEach(id => loadModel(id, () => {
  makeThumb(id); dressStations(); renderHands();
  customers.forEach(c => c.state === 'wait' && drawBubble(c));
}));


// ---------- loop ----------
// the HUD only touches the page when a value changed: writing the same text every frame still makes the browser redo its layout
const hudCache = {};
function hud(id, text) { if (hudCache[id] !== text) { hudCache[id] = text; $(id).textContent = text; } }
function hudW(id, pct) { const w = pct.toFixed(1) + '%'; if (hudCache['w' + id] !== w) { hudCache['w' + id] = w; $(id).firstElementChild.style.width = w; } }
function hudClass(id, cls, on) { const k = 'c' + id + cls; if (hudCache[k] !== on) { hudCache[k] = on; $(id).classList.toggle(cls, on); } }
// keep the café smooth: when the frame rate sags, shed the costly extras one step at a time (blurred strips and vignette, then pixel count)
const PR_CAP = [2, 2, 1.5, 1.25, 1], perf = { ema: 16.7, tier: 0, since: 0, kitchenSince: 0, frames: 0, t: 0, calls: 0 };
const basePixelRatio = () => Math.min(settings.fancy ? Math.min(devicePixelRatio, PR_MAX) : 1, PR_CAP[perf.tier]);
// the quality this device settled on is kept for a few hours, so a reload starts there instead of lagging for ten seconds again; touch screens start at the middle step
const TIER_KEY = 'miw-cheesecake-rush-tier', TIER_HOURS = 6;
function rememberTier(ema) { if (ema > 30 && ema < 36) return;   // locked at 30 fps (iOS Low Power Mode): easing off won't help and shouldn't stick
  try { localStorage.setItem(TIER_KEY, JSON.stringify({ tier: perf.tier, at: Date.now() })); } catch {} }
(function startTier() {
  let t = PR_MAX < 2 ? 2 : 0;
  try { const s = JSON.parse(localStorage.getItem(TIER_KEY) || 'null'); if (s && Date.now() - s.at < TIER_HOURS * 36e5 && s.tier >= 0 && s.tier < PR_CAP.length) t = s.tier; } catch {}
  perf.tier = t;
})();
function applyQuality() {
  document.body.classList.toggle('lite', perf.tier >= 1);
  if (typeof sparks !== 'undefined') sparks.p.visible = settings.fancy && perf.tier < 3;
  renderer.setPixelRatio(basePixelRatio());
}
function keepSmooth(dt, now) {
  if (!document.hidden && dt < 0.25) perf.ema += (dt * 1000 - perf.ema) * 0.04;   // a hitch or a hidden tab says nothing about the machine
  if (perf.fps) {   // ?fps shows the frame rate on screen
    perf.frames++; if (now - perf.t > 0.5) { perf.fps.textContent = `${Math.round(perf.frames / (now - perf.t))} fps · ${perf.ema.toFixed(1)} ms · tier ${perf.tier} · ${renderer.info.render.calls} calls · ${renderer.getPixelRatio()}x`; perf.frames = 0; perf.t = now; }
  }
  if (kitchen.on && !menuOpen && perf.ema > 24 && now - perf.kitchenSince > 3 && kst.r.getPixelRatio() > 1) {   // the kitchen picture is the biggest thing on screen: draw it with fewer pixels, then at most 1x
    perf.kitchenSince = now; kst.r.setPixelRatio(Math.max(1, kst.r.getPixelRatio() - 0.25)); perf.ema = 16.7;
  }
  if (now - perf.since < 3 || perf.ema < 22 || perf.tier >= PR_CAP.length - 1 || game.paused || menuOpen || !$('overlay').hidden) return;
  const was = perf.ema; perf.since = now; perf.tier++; perf.ema = 16.7; applyQuality(); rememberTier(was);
}
applyQuality();   // start at the remembered (or the phone's) step
if (/[?&]fps\b/.test(location.search)) { perf.fps = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'fps' })); }
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1), now = clock.elapsedTime;
  if (typeof homeTick === 'function') homeTick(now);
  if (kitchen.on && !menuOpen) {
    kst.update(dt, now); tickKitchen(dt, now);
    kitchen.left -= dt;
    const ks = $('ksec'), kb = $('kbar');
    if (ks) ks.textContent = kitchen.overtime ? 'finish it!' : Math.max(0, Math.ceil(kitchen.left)) + 's';
    if (kb) kb.firstElementChild.style.width = Math.max(0, kitchen.left / kitchen.total * 100) + '%';
    if (kitchen.step && kitchen.step.kind === 'bake') {
      kitchen.step.pos = 0.5 + 0.5 * Math.sin(now * (2.2 + game.day * 0.2));
      const m = $('kmark'); if (m) m.style.left = kitchen.step.pos * 100 + '%';
    }
    if (kitchen.left <= 0) {
      kitchen.left = 0;
      if (kitchen.run && kitchen.step && kitchen.step.kind !== 'ruined') { if (!kitchen.overtime) { kitchen.overtime = true; toast('⏰ Time is up: finish the batch you started! 🍰'); } }
      else if (!kitchen.overtime) endKitchenTime();
    }
  }
  if (game.running && !game.paused && !menuOpen) {
    if (game.open) {
      game.time -= dt;
      if ((game.spawnIn -= dt) <= 0) { spawn(); game.spawnIn = Math.max(6, 9.5 - (game.day - 1) * 0.25) * (0.7 + Math.random() * 0.6); }
      if (game.time <= 0) { game.time = 0; game.open = false; toast('🔔 Last orders! Serve the friends still here'); sfx.bell(); }
    } else if (!customers.length) endDay();
    nextAction(dt);
    stepCustomers(dt);
  }
  if (!game.paused && !menuOpen) stepActor(miw, dt);   // frozen while the shop is paused, so she can't finish a job behind the kitchen or the menu
  STATIONS.forEach((st, i) => { st.show.rotation.y = now * 0.6 + i; });
  updateDoor(dt);
  pond[1].face += dt * 0.6; baker.hop = payQueue.some(c => c.state === 'pay'); [...pond, baker].forEach(a => stepActor(a, dt)); worldFx(now, dt);
  plot.timer += dt; if (plot.timer >= 6) { plot.timer = 0; if (plot.ready < plot.max) { plot.ready++; setPlotView(); if ($('pickBtn')) $('pickBtn').textContent = pickLabel(); } }
  if (baker.look && !baker.fallback && !baker.hat) { baker.hat = true; const hat = new THREE.Group(); hat.add(mesh(cyl(0.2, 0.22, 0.2, 14), '#ffffff', { y: 0.44 }), mesh(sph(0.26, 12), '#ffffff', { y: 0.62, s: [1, 0.8, 1] })); baker.look.head.add(hat); }
  sign.rotation.y = Math.sin(now * 0.8) * 0.15;
  // the HUD
  game.shown += (game.coins - game.shown) * Math.min(1, dt * 8);
  const goal = goalFor(game.day);
  hud('coins', `${Math.round(game.shown)} / ${goal} 🪙`);
  hudW('bar', Math.min(100, game.shown / goal * 100));
  hudClass('bar', 'met', game.coins >= goal);
  const s = Math.ceil(game.time);
  hud('time', `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`);
  hud('clockNote', game.running && !game.open ? 'closing' : '');
  hudClass('clock', 'hurry', game.running && game.open && game.time < 10);
  // a window (the kitchen, the shop) covers the café: don't draw what nobody can see
  if ($('overlay').hidden || document.body.classList.contains('homing')) { placeLabels(); renderer.render(scene, camera); }
  keepSmooth(dt, now);
}
dressStations(); dressTables(); renderHands();
frame();
