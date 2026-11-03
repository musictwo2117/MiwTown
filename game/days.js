// ---------- days ----------
function startDay(d) {
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
  save.total = (save.total || 0) + game.coins;
  if (won) { save.day = Math.max(save.day, game.day + 1); save.best = Math.max(save.best, game.day); sfx.fanfare(); } else sfx.sad();
  store();
  $('panel').innerHTML = `
    <h2>${won ? 'Shop closed! 🎉' : 'Not quite… 🥺'}</h2>
    <p>Day ${game.day} · goal ${goal} 🪙</p>
    <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.18}s">⭐</span>`).join('')}</div>
    <div class="stats"><div><b>${game.coins}</b><span>coins</span></div><div><b>${game.served}</b><span>happy friends</span></div><div><b>${game.missed}</b><span>left hungry</span></div></div>
    <button class="go" id="goBtn">${won ? `Open day ${game.day + 1} →` : `Try day ${game.day} again`}</button>
    ${won ? `<button class="alt" id="againBtn">Replay day ${game.day}</button>` : ''}`;
  $('overlay').hidden = false;
  $('goBtn').onclick = () => openKitchen(won ? game.day + 1 : game.day);
  if (won) $('againBtn').onclick = () => openKitchen(game.day);
}
// load every model, then refresh the pictures that use them
['cat', 'bunny', 'bear', 'frog', 'chick', 'penguin', 'miw', 'cheesefull', 'pretzelfull'].forEach(sp => loadModel(sp));
Object.keys(DESSERTS).filter(id => DESSERTS[id].drink).forEach(id => makeThumb(id));
Object.keys(DESSERTS).filter(id => !DESSERTS[id].drink).forEach(id => loadModel(id, () => {
  makeThumb(id); dressStations(); renderHands();
  customers.forEach(c => c.state === 'wait' && drawBubble(c));
}));

// ---------- loop ----------
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
  $('coins').textContent = `${Math.round(game.shown)} / ${goal} 🪙`;
  $('bar').firstElementChild.style.width = Math.min(100, game.shown / goal * 100) + '%';
  $('bar').classList.toggle('met', game.coins >= goal);
  const s = Math.ceil(game.time);
  $('time').textContent = `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`;
  $('clockNote').textContent = game.running && !game.open ? 'closing' : '';
  $('clock').classList.toggle('hurry', game.running && game.open && game.time < 10);
  placeLabels();
  renderer.render(scene, camera);
}
dressStations(); dressTables(); renderHands();
frame();
