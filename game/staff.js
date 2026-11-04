// ---------- staff: waiters you hire in the shop. They fetch what a waiting friend ordered and serve the table, so Miw can restock and run the cashier ----------
const STAFF_COST = [120, 300];
const STAFF_LOOKS = [['frog', '#8fd18a', '🐸', 'Waiter'], ['bear', '#c8916a', '🐻', 'Second waiter']];
const STAFF_HOME = [new THREE.Vector3(-2.6, 0, -2.0), new THREE.Vector3(2.6, 0, -2.0)];
const staff = [];

function renderStaffTray(s) {
  s.trayItems.clear(); s.tray3d.visible = s.tray.length > 0;
  s.tray.forEach((id, i) => { const m = dessertModel(id); m.scale.setScalar(0.55); m.position.x = (i - (s.tray.length - 1) / 2) * 0.34; s.trayItems.add(m); });
}
// a waiter lets go of the friend they were heading for, and whatever they were carrying goes back on the shelf
function releaseJob(s) {
  if (s.job && s.job.c && s.job.c.claim === s) s.job.c.claim = null;
  s.job = null;
  s.tray.forEach(id => { if (!DESSERTS[id].drink) kitchen.stock[id]++; });
  s.tray.length = 0; renderStaffTray(s); updatePlates();
}
// as many waiters as you have hired, standing by the counter (called when a day starts, and after the shop is visited mid-day)
function syncStaff(keepPlace) {
  const n = Math.min(STAFF_COST.length, save.staff || 0);
  while (staff.length > n) { const s = staff.pop(); releaseJob(s); removeActor(s.a); }
  while (staff.length < n) {
    const [species, color] = STAFF_LOOKS[staff.length], a = makeActor(species, color);
    a.grow = 1; a.root.scale.setScalar(1); a.staff = true; a.speed = 3.6; a.face = 0;
    const s = { a, tray: [], job: null, wait: 0, hat: false };
    s.tray3d = new THREE.Group(); s.tray3d.position.set(0, 0.95, 0.5); a.root.add(s.tray3d); s.tray3d.visible = false;
    s.tray3d.add(mesh(cyl(0.4, 0.36, 0.04, 24), '#ffffff'));
    s.trayItems = new THREE.Group(); s.trayItems.position.y = 0.02; s.tray3d.add(s.trayItems);
    staff.push(s);
  }
  staff.forEach((s, i) => {
    if (keepPlace && s.a.root.position.lengthSq() > 0) return;
    releaseJob(s); s.a.target = s.a.path = s.a.onArrive = null; s.a.root.position.copy(STAFF_HOME[i]); s.a.face = 0; s.wait = 0.5;
  });
}
// the friend a waiter should go to next: whoever has waited longest, whose whole order is on the shelf right now and that nobody else is on their way to
function pickJob(s) {
  const mine = new Set(queue.filter(a => a.kind === 'table').map(a => a.t));   // tables Miw is already about to serve
  const pending = {};
  staff.forEach(o => { if (o !== s && o.job) o.job.fetch.forEach(id => { pending[id] = (pending[id] || 0) + 1; }); });
  let best = null, urgency = 9;
  customers.forEach(c => {
    if (c.state !== 'wait' || c.claim || !c.t || c.t.customer !== c || mine.has(c.t)) return;
    const need = c.order.filter((id, i) => !c.served[i]);
    if (!need.length || need.length > HAND_MAX) return;
    const plates = need.filter(id => !DESSERTS[id].drink).length;
    if (dish.plates - staff.reduce((a, o) => a + (o !== s && o.job ? o.job.fetch.filter(id => !DESSERTS[id].drink).length : 0), 0) < plates) return;   // no clean plates for it yet
    const want = {}; need.forEach(id => { want[id] = (want[id] || 0) + 1; });
    if (!Object.keys(want).every(id => DESSERTS[id].drink || stockOf(id) >= want[id] + (pending[id] || 0))) return;   // never fetch what isn't there
    const u = c.patience / c.max;
    if (u < urgency) { urgency = u; best = { c, fetch: need.slice() }; }
  });
  return best;
}
function runJob(s) {
  const j = s.job, c = j.c;
  if (c.state !== 'wait' || !c.t || c.t.customer !== c) return releaseJob(s);   // the friend left, or somebody else served them
  if (j.fetch.length) {
    const id = j.fetch[0], st = STATIONS.find(q => q.id === id);
    walkTo(s.a, st.pick, () => {
      s.a.face = st.face ?? PI;
      if (!DESSERTS[id].drink && !stockOf(id)) return releaseJob(s);   // the last one went to somebody else
      if (!DESSERTS[id].drink) kitchen.stock[id]--;
      s.tray.push(id); j.fetch.shift(); openCase(st); renderStaffTray(s); updatePlates(); sfx.pick(); s.wait = 0.25;
    });
  } else {
    walkTo(s.a, c.t.serve, () => {
      s.a.face = Math.atan2(c.t.g.position.x + 0.2 - s.a.root.position.x, c.t.g.position.z - s.a.root.position.z);
      serve(c.t, s.tray); releaseJob(s); s.wait = 0.4;
    });
  }
}
function stepStaff(dt) {
  staff.forEach(s => {
    if (!s.hat && s.a.look && !s.a.fallback && s.a.look.head) {   // a little server's cap, once the model has arrived
      s.hat = true; const cap = new THREE.Group(); cap.add(mesh(cyl(0.2, 0.22, 0.09, 14), '#ffffff', { y: 0.45 }), mesh(cyl(0.24, 0.24, 0.02, 14), '#ff8fb1', { y: 0.41 })); s.a.look.head.add(cap);
    }
    if (s.wait > 0) { s.wait -= dt; return; }
    if (s.a.target) return;
    if (!s.job) {
      const j = pickJob(s);
      if (j) { s.job = j; j.c.claim = s; }
      else if (s.a.root.position.distanceTo(STAFF_HOME[staff.indexOf(s)]) > 0.3) walkTo(s.a, STAFF_HOME[staff.indexOf(s)]);   // nothing to do: wait by the counter
      return;
    }
    runJob(s);
  });
}
// the Staff tab of the shop
function staffCards() {
  const n = save.staff || 0;
  return STAFF_COST.map((cost, i) => {
    const [, , icon, name] = STAFF_LOOKS[i], has = i < n, next = i === n;
    return `<div class="shoprow"><i>${icon}</i><span><b>${name}</b><small>Fetches orders and serves the tables for you</small></span>${has ? '<em>✓ Hired</em>' : next ? `<button data-staff="${i}" ${save.wallet < cost ? 'disabled' : ''}>${cost} 🪙</button>` : '<em>Hire the first one first</em>'}</div>`;
  }).join('');
}
function staffBind(root, again) {
  root.querySelectorAll('button[data-staff]').forEach(b => b.onclick = () => {
    const i = +b.dataset.staff, cost = STAFF_COST[i];
    if ((save.staff || 0) !== i || save.wallet < cost) return;
    save.wallet -= cost; save.staff = i + 1; store(); sfx.fanfare(); again();
  });
}
