// Miw's Town: send new tasks, message agents, and play with them. Shared by the town and the room.
(() => {
  const TOKEN = document.querySelector('meta[name="miw-token"]')?.content || '';
  const api = (url, body) => fetch(url, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { 'content-type': 'application/json', 'x-miw-token': TOKEN },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong. Try again.'); return j; });

  // small DOM helper: el('div', { className: 'x' }, child, 'text', ...)
  function el(tag, props = {}, ...kids) {
    const n = Object.assign(document.createElement(tag), props);
    kids.flat().forEach(k => k != null && n.append(k.nodeType ? k : String(k)));
    return n;
  }
  const ago = ts => { const s = Math.max(0, (Date.now() - ts) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`; };

  // nicknames live in this browser only
  const NICK_KEY = 'miw-town-names';
  const readNicks = () => { try { return JSON.parse(localStorage.getItem(NICK_KEY) || '{}'); } catch { return {}; } };
  window.nickOf = id => readNicks()[id] || '';
  const setNick = (id, name) => { const m = readNicks(); if (name) m[id] = name; else delete m[id]; try { localStorage.setItem(NICK_KEY, JSON.stringify(m)); } catch {} };

  document.head.append(el('style', { textContent: `
    #tools .primary{background:linear-gradient(140deg,#ff9fb5,#ffb38a);color:#fff;box-shadow:0 3px 10px rgba(255,126,166,.35)}
    #tools .primary:hover{background:linear-gradient(140deg,#ff8fab,#ffa577)}
    #tools .badge{font:600 10px 'Fredoka';background:#fff;color:#ff7ea6;border-radius:99px;padding:1px 6px;margin-left:2px}
    #drawer{top:16px;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));display:flex;flex-direction:column;padding:0;overflow:hidden;z-index:5;animation:slide .22s ease-out}
    @keyframes slide{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
    #drawer .dh{display:flex;gap:12px;align-items:center;padding:16px 16px 12px;border-bottom:1px dashed rgba(75,52,66,.12)}
    #drawer .dh .face{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;font-size:26px;flex:none;position:relative}
    #drawer .dh .face::after{content:'';position:absolute;right:-3px;bottom:-3px;width:13px;height:13px;border-radius:50%;background:var(--s);border:2.5px solid #fff}
    #drawer .dh h2{font:600 18px 'Fredoka';margin:0;display:flex;gap:6px;align-items:center}
    #drawer .dh h2 em{font:600 11px 'Fredoka';font-style:normal;background:#fff0c2;color:#9a6c06;border-radius:6px;padding:1px 6px}
    #drawer .dh small{font-size:12.5px;color:var(--soft);display:block;margin-top:2px}
    #drawer .x{margin-left:auto;align-self:flex-start;border:0;background:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;color:var(--soft);flex:none}
    #drawer .db{padding:12px 16px 16px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px}
    #drawer h3{font:500 13px 'Fredoka';margin:0 0 6px;color:var(--soft);letter-spacing:.3px}
    .xp{height:6px;background:#fff;border-radius:99px;overflow:hidden;margin-top:6px}.xp i{display:block;height:100%;background:linear-gradient(90deg,#ffd27a,#ff9fb5);border-radius:99px}
    .acts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .act{font:600 12.5px 'Nunito';color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 4px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform .15s}
    .act span{font-size:20px}.act:hover{transform:translateY(-2px)}
    .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:12px}
    .field{width:100%;font:14px 'Nunito';color:var(--ink);border:1.5px solid #f3d6e0;border-radius:12px;padding:9px 11px;background:#fffafc;outline:none;resize:vertical}
    .field:focus{border-color:#ff9fb5;background:#fff}
    textarea.field{min-height:84px}
    .lbl2{font-size:12.5px;font-weight:700;margin:0 0 5px;display:block}
    .hint{font-size:12px;color:var(--soft);margin:6px 0 0;line-height:1.45}
    .lock{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#5b7a52;background:#eef9e9;border-radius:10px;padding:8px 10px;margin-top:10px;line-height:1.45}
    .err{font-size:12.5px;color:#d0435f;margin:6px 0 0}
    .go{margin-top:10px;width:100%;font:600 14px 'Nunito';color:#fff;border:0;border-radius:12px;padding:10px;cursor:pointer;background:linear-gradient(140deg,#ff9fb5,#ffb38a)}
    .go:disabled{opacity:.6;cursor:default}
    .hist{display:flex;flex-direction:column;gap:2px;max-height:220px;overflow-y:auto}
    .hrow{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:center;font-size:12.5px;padding:5px 4px;border-radius:8px}
    .hrow:hover{background:#fff7fa}.hrow small{color:var(--soft);font-size:11px}
    .hrow span:nth-child(2){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .job{border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:#fff}
    .job+.job{margin-top:8px}
    .jt{display:flex;gap:8px;align-items:center;font-size:13px;font-weight:700}
    .jt .pill{font:600 10.5px 'Fredoka';border-radius:99px;padding:2px 8px;margin-left:auto;white-space:nowrap}
    .pill.running{background:#e2f0ff;color:#3f6fa8}.pill.done{background:#dcf6e2;color:#2f7a45}.pill.error{background:#ffe1de;color:#c4453a}
    .jp{font-size:12.5px;color:var(--soft);margin:4px 0 0;white-space:pre-wrap;word-break:break-word}
    .jl{font:11.5px ui-monospace,Menlo,monospace;background:#faf6fb;border-radius:8px;padding:6px 8px;margin-top:6px;max-height:110px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;color:#6b5260}
    .jr{font-size:13px;background:#fffaf0;border-radius:10px;padding:8px 10px;margin-top:6px;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto}
    .stop{font:600 11.5px 'Nunito';border:1px solid #f3c2c2;color:#c4453a;background:#fff;border-radius:99px;padding:3px 10px;cursor:pointer;margin-top:8px}
    .rename{display:flex;gap:6px}.rename .field{padding:6px 9px;font-size:14px}
    .rename button{font:600 12px 'Nunito';border:0;border-radius:10px;padding:0 12px;cursor:pointer;background:#ff9fb5;color:#fff}
    .wear{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
    .wi{font:600 11.5px 'Nunito';color:var(--ink);background:#fffafc;border:1.5px solid #f6e4ea;border-radius:12px;padding:7px 4px 5px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px}
    .wi span{font-size:18px}.wi.on{border-color:#ff9fb5;background:#fff0f5}
    .wi:disabled{cursor:default;opacity:.55;background:#faf7f8}
    #drawer .dh .face{width:64px;height:64px;border-radius:18px;font-size:30px}
    #drawer .dh .face.nodot::after{display:none}
    .portrait{width:64px!important;height:64px!important;border-radius:18px;cursor:grab;display:block}
    .portrait:active{cursor:grabbing}
    .tl{position:relative;height:4px;border-radius:99px;background:#f3e9ee;margin-top:5px;overflow:hidden}
    .tl.big{height:12px;margin-top:2px}
    .tl i{position:absolute;top:0;bottom:0}
    .tlx{display:flex;justify-content:space-between;font-size:11px;color:var(--soft);margin-top:4px}
    .tlk{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:12px}
    .tlk i{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:5px}
    .lbl.place{pointer-events:auto;cursor:pointer;transition:box-shadow .15s}
    .lbl.place:hover{box-shadow:0 4px 14px rgba(255,126,166,.4)}
    .who{display:flex;flex-direction:column;gap:6px}
    .whorow{display:flex;gap:10px;align-items:center;text-align:left;font:inherit;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:14px;padding:8px 12px 8px 8px;cursor:pointer}
    .whorow:hover{border-color:#ffc4d6}
    .whorow .wf{width:34px;height:34px;border-radius:12px;display:grid;place-items:center;font-size:17px;flex:none}
    .whorow b{font-size:13.5px;display:flex;gap:6px;align-items:center}
    .whorow b em{font:600 10px 'Fredoka';font-style:normal;background:#fff0c2;color:#9a6c06;border-radius:6px;padding:1px 5px}
    .whorow small{font-size:12px;color:var(--soft);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .whorow>span:last-child{margin-left:auto;color:var(--soft);font-size:18px}
    .wi .tag{font:600 9.5px 'Fredoka';color:#c25a12;background:#ffe7cf;border-radius:6px;padding:0 5px}
    .bubble .ic{display:inline-block}
    .bubble .fx{display:inline-block}
    .bubble[data-st="thinking"] .fx::after,.bubble[data-st="syncing"] .fx::after{content:'...';display:inline-block;overflow:hidden;vertical-align:bottom;width:0;animation:dots 1.4s steps(4) infinite}
    .bubble[data-st="writing"] .fx::after{content:'';display:inline-block;width:2px;height:12px;background:var(--s);margin-left:3px;vertical-align:-1px;animation:blink 1s steps(2,start) infinite}
    .bubble[data-st="thinking"] .ic{animation:bob 1.6s ease-in-out infinite}
    .bubble[data-st="syncing"] .ic{animation:bob .9s ease-in-out infinite}
    .bubble[data-st="writing"] .ic{animation:wiggle .45s ease-in-out infinite alternate}
    .bubble[data-st="researching"] .ic{animation:peek 1.3s ease-in-out infinite alternate}
    .bubble[data-st="executing"] .ic{animation:spin 1.8s linear infinite}
    .bubble[data-st="swim"] .ic,.bubble[data-st="cafe"] .ic{animation:bob 1.4s ease-in-out infinite}
    .bubble[data-st="error"]{animation:shake .8s ease-in-out infinite}
    @keyframes dots{to{width:1.25em}}
    @keyframes blink{to{visibility:hidden}}
    @keyframes bob{50%{transform:translateY(-3px)}}
    @keyframes wiggle{from{transform:rotate(-14deg) translateX(-1px)}to{transform:rotate(10deg) translateX(1px)}}
    @keyframes peek{from{transform:translateX(-2px)}to{transform:translateX(2px) scale(1.12)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shake{0%,100%{rotate:0deg}15%{rotate:-4deg}30%{rotate:4deg}45%{rotate:-2deg}60%{rotate:2deg}75%{rotate:0deg}}
    .heart{position:absolute;pointer-events:none;font-size:22px;animation:float 1.2s ease-out forwards}
    @keyframes float{from{opacity:1;transform:translate(-50%,0) scale(.6)}to{opacity:0;transform:translate(calc(-50% + var(--dx)),-90px) scale(1.2)}}
    .toast{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);background:#4b3442;color:#fff;font:600 13px 'Nunito';border-radius:99px;padding:8px 16px;z-index:9;animation:pop .2s ease-out}
    @media (max-width:1180px){#tools button:not(.primary) .txt,#tools a .txt{display:none}}
    @media (max-width:760px){#drawer{top:auto;height:72vh;bottom:0;right:0;left:0;width:auto;border-radius:20px 20px 0 0}}
  ` }));

  // ---------- toolbar: new task button ----------
  const tools = document.getElementById('tools');
  const runBadge = el('span', { className: 'badge', hidden: true });
  const newBtn = el('button', { id: 'tTask', className: 'primary', title: 'Send a new task' }, '✨', el('span', { className: 'txt' }, 'New task'), runBadge);
  tools.insertBefore(newBtn, tools.children[1]);
  newBtn.onclick = () => openNewTask();

  const drawer = el('div', { className: 'panel', id: 'drawer', hidden: true });
  document.body.append(drawer);
  let view = null; // { kind: 'agent', id } | { kind: 'task' }
  const close = () => { drawer.hidden = true; view = null; shown = ''; };
  const toast = t => { const n = el('div', { className: 'toast' }, t); document.body.append(n); setTimeout(() => n.remove(), 2600); };

  // ---------- jobs ----------
  let jobs = [];
  async function refreshJobs() {
    try { jobs = await api('jobs'); } catch { return; }
    const running = jobs.filter(j => j.status === 'running').length;
    runBadge.hidden = !running; runBadge.textContent = `${running} running`;
    if (view) render();
  }
  setInterval(refreshJobs, 2000); refreshJobs();

  function jobCard(j) {
    const pill = el('span', { className: `pill ${j.status}` }, j.status === 'running' ? '⏳ Working' : j.status === 'done' ? '✅ Done' : '⚠️ Problem');
    const card = el('div', { className: 'job' },
      el('div', { className: 'jt' }, j.resumeOf ? '💬 ' : '📁 ', j.label || 'Task', pill),
      el('p', { className: 'jp' }, j.prompt),
    );
    if (j.log.length && j.status === 'running') { const l = el('div', { className: 'jl' }, j.log.slice(-8).join('\n')); card.append(l); setTimeout(() => { l.scrollTop = l.scrollHeight; }); }
    if (j.result) card.append(el('div', { className: 'jr' }, j.result));
    card.append(el('small', { className: 'hint', style: 'display:block' }, `${j.cwd} · ${ago(j.startedAt)}`));
    if (j.status === 'running') {
      const b = el('button', { className: 'stop' }, '✋ Stop');
      b.onclick = async () => { b.disabled = true; try { await api(`jobs/${j.id}/stop`, {}); } catch (e) { toast(e.message); } refreshJobs(); };
      card.append(b);
    }
    return card;
  }

  // ---------- new task ----------
  const draft = { cwd: '', prompt: '' };
  let folders = [];
  async function openNewTask() {
    view = { kind: 'task' }; drawer.hidden = false;
    try { folders = await api('folders'); } catch {}
    if (!draft.cwd && folders.length) draft.cwd = folders[0];
    render();
  }

  function renderTask() {
    const head = el('div', { className: 'dh' },
      el('div', { className: 'face', style: 'background:linear-gradient(140deg,#ffd6e0,#ffe9c9);--s:#ffd27a' }, '✨'),
      el('div', {}, el('h2', {}, 'New task'), el('small', {}, 'A new friend moves in and gets to work')),
      closeBtn());
    const list = el('datalist', { id: 'miwFolders' }, folders.map(f => el('option', { value: f })));
    const cwd = el('input', { className: 'field', value: draft.cwd, placeholder: '~/projects/my-app', autocomplete: 'off' });
    cwd.setAttribute('list', 'miwFolders');
    const prompt = el('textarea', { className: 'field', value: draft.prompt, placeholder: 'Fix the typo in README.md' });
    const err = el('p', { className: 'err', hidden: true });
    cwd.oninput = () => { draft.cwd = cwd.value; err.hidden = true; };
    prompt.oninput = () => { draft.prompt = prompt.value; err.hidden = true; };
    const go = el('button', { className: 'go' }, '✨ Start task');
    go.onclick = async () => {
      if (!draft.cwd.trim()) { err.textContent = 'Pick a folder for the task.'; err.hidden = false; return; }
      if (!draft.prompt.trim()) { err.textContent = 'Write what you want done first.'; err.hidden = false; return; }
      go.disabled = true; go.textContent = 'Starting…';
      try { await api('task', { cwd: draft.cwd.trim(), prompt: draft.prompt.trim() }); draft.prompt = ''; toast('Task started. Watch for a new friend in town!'); await refreshJobs(); }
      catch (e) { err.textContent = e.message; err.hidden = false; }
      go.disabled = false; go.textContent = '✨ Start task'; render();
    };
    const form = el('div', { className: 'card' },
      el('label', { className: 'lbl2' }, '📁 Project folder'), cwd, list,
      el('p', { className: 'hint' }, 'Any folder inside your home folder.'),
      el('label', { className: 'lbl2', style: 'margin-top:12px' }, '📝 What should they do?'), prompt,
      el('div', { className: 'lock' }, '🔒', el('span', {}, 'Can read and edit files in this folder only. Can’t run commands or browse the web.')),
      err, go);
    const recent = jobs.filter(j => !j.resumeOf);
    return [head, el('div', { className: 'db' }, form,
      el('div', {}, el('h3', {}, 'Your tasks'), recent.length ? recent.map(jobCard) : el('p', { className: 'hint' }, 'Tasks you start show up here with their results.')))];
  }

  // ---------- agent panel ----------
  window.openAgent = id => { view = { kind: 'agent', id, renaming: false }; drawer.hidden = false; render(); };
  const msgDraft = {};

  function renderAgent() {
    const me = agents.get(view.id);
    if (!me) { close(); return []; }
    const xp = xpStore[me.id] || 0, lv = lvl(xp), next = 20 * lv * lv, prev = 20 * (lv - 1) * (lv - 1);
    const face = el('div', { className: 'face', title: 'Drag to spin', style: `background:${me.color};--s:${STATE_COLOR[me.state]}` }, SPECIES[me.species].emoji);
    if (portrait) { portrait.show(me); face.replaceChildren(portrait.el); }
    const title = view.renaming ? renameBox(me) : el('h2', {}, me.name, el('em', {}, 'Lv ' + lv));
    const head = el('div', { className: 'dh' }, face,
      el('div', { style: 'flex:1;min-width:0' }, title,
        el('small', {}, `${STATE_ICON[me.state]} ${STATE_LABEL[me.state]}${me.msg ? ' · ' + me.msg : ''}`),
        el('div', { className: 'xp', title: `${xp} XP` }, el('i', { style: `width:${Math.min(100, (xp - prev) / Math.max(1, next - prev) * 100)}%` }))),
      closeBtn());

    const pet = el('button', { className: 'act' }, el('span', {}, '🤚'), 'Pet');
    pet.onclick = () => petAgent(me);
    const look = el('button', { className: 'act' }, el('span', {}, '🎨'), 'Look');
    look.onclick = () => openPicker(me.id);
    const ren = el('button', { className: 'act' }, el('span', {}, '✏️'), 'Rename');
    ren.onclick = () => { view.renaming = true; render(); };

    // message box
    const canTalk = me.sessionId && me.cwd;
    const msg = el('textarea', { className: 'field', value: msgDraft[me.id] || '', placeholder: 'Also add a test for the new button' });
    const err = el('p', { className: 'err', hidden: true });
    msg.oninput = () => { msgDraft[me.id] = msg.value; err.hidden = true; };
    const go = el('button', { className: 'go' }, '💬 Send message');
    go.onclick = async () => {
      if (!msg.value.trim()) { err.textContent = 'Write a message first.'; err.hidden = false; return; }
      go.disabled = true; go.textContent = 'Sending…';
      try { await api('task', { agentId: me.id, prompt: msg.value.trim() }); msgDraft[me.id] = ''; toast(`Sent! A copy of ${me.name} picks it up.`); await refreshJobs(); }
      catch (e) { err.textContent = e.message; err.hidden = false; }
      go.disabled = false; go.textContent = '💬 Send message'; render();
    };
    const talk = el('div', { className: 'card' },
      el('label', { className: 'lbl2' }, `💬 Message ${me.name}`),
      canTalk ? [msg, el('div', { className: 'lock' }, '🔒', el('span', {}, `A copy of this conversation picks up your message and can read and edit files in ${me.cwd.replace(/^\/Users\/[^/]+/, '~')}. Your open Claude Code window isn’t changed.`)), err, go]
        : el('p', { className: 'hint' }, 'This friend can take messages after its next step in Claude Code.'));

    const hist = (me.history || []).slice().reverse();
    const mine = jobs.filter(j => (j.sessionId && j.sessionId.startsWith(me.id)) || (me.sessionId && j.resumeOf === me.sessionId));
    const worn = wearOf(me);
    const wardrobe = el('div', { className: 'card' },
      el('label', { className: 'lbl2' }, '👗 Wardrobe'),
      el('div', { className: 'wear' }, [{ key: 'none', icon: '🙅', name: 'Nothing', lv: 1 }, ...WEAR.filter(w => !w.festival || w.festival === festival())].map(w => {
        const open = w.lv <= lv;
        const b = el('button', { className: 'wi' + (worn === w.key ? ' on' : ''), disabled: !open, title: w.festival ? `${w.name}: this week only` : open ? w.name : `Unlocks at Lv ${w.lv}` },
          el('span', {}, open ? w.icon : '🔒'), open ? w.name : `Lv ${w.lv}`, w.festival ? el('span', { className: 'tag' }, 'This week') : null);
        b.onclick = () => { setWear(me.id, w.key); dressUp(me); render(); };
        return b;
      })),
      el('p', { className: 'hint' }, 'Level up by working and resting. New things unlock at Lv 2, 3, 5, 7 and 10.'));
    return [head, el('div', { className: 'db' },
      el('div', { className: 'acts' }, pet, look, ren),
      todayCard(me),
      wardrobe,
      talk,
      mine.length ? el('div', {}, el('h3', {}, 'Tasks from Miw’s Town'), mine.map(jobCard)) : null,
      el('div', {}, el('h3', {}, 'Recent activity'), hist.length
        ? el('div', { className: 'hist' }, hist.map(h => el('div', { className: 'hrow' }, el('span', {}, STATE_ICON[h.state] || '•'), el('span', { title: h.msg }, h.msg || STATE_LABEL[h.state] || h.state), el('small', {}, ago(h.ts)))))
        : el('p', { className: 'hint' }, 'Nothing yet.')))];
  }

  function renameBox(me) {
    const inp = el('input', { className: 'field', value: me.name, maxLength: 24 });
    const save = () => { setNick(me.id, inp.value.trim()); me.name = inp.value.trim() || me.realName || me.id; view.renaming = false; renderHud(); render(); };
    inp.onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { view.renaming = false; render(); } };
    setTimeout(() => { inp.focus(); inp.select(); });
    return el('div', { className: 'rename' }, inp, Object.assign(el('button', {}, 'Save'), { onclick: save }));
  }

  function petAgent(me) {
    me.petAt = performance.now();
    xpStore[me.id] = (xpStore[me.id] || 0) + 5; saveXp(); renderHud(); render();
    burst(me, ['💖', '💕', '✨', '💗']);
  }
  // little emojis that float up from an agent's head
  function burst(me, icons, n = 6) {
    const p = me.cat.g.position, [x, y] = toScreen(new THREE.Vector3(p.x, p.y + 1.6, p.z));
    for (let i = 0; i < n; i++) {
      const h = el('div', { className: 'heart' }, icons[i % icons.length]);
      h.style.left = x + 'px'; h.style.top = y + 'px'; h.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`); h.style.animationDelay = `${i * 80}ms`;
      document.getElementById('labels').append(h); setTimeout(() => h.remove(), 1500 + i * 80);
    }
  }

  function closeBtn() { const b = el('button', { className: 'x', title: 'Close' }, '✕'); b.onclick = close; return b; }

  // what the drawer shows; it only rebuilds when this changes
  function signature() {
    if (view.kind === 'task') return JSON.stringify(['task', jobs, folders]);
    if (view.kind === 'place') return JSON.stringify([view, whoIsAt(places[view.i]).map(a => [a.id, a.name, a.state, a.msg, a.walking, a.species, xpStore[a.id]])]);
    const me = agents.get(view.id);
    if (!me) return 'gone';
    return JSON.stringify([view, me.name, me.state, me.msg, me.species, me.history?.length, xpStore[me.id], me.sessionId, wearOf(me), Math.floor(Date.now() / 60000),
      jobs.filter(j => (j.sessionId && j.sessionId.startsWith(me.id)) || (me.sessionId && j.resumeOf === me.sessionId))]);
  }
  let shown = '';
  function render() {
    if (!view) return;
    const active = document.activeElement;
    // don't rebuild while someone is typing in the drawer
    if (active && drawer.contains(active) && /INPUT|TEXTAREA/.test(active.tagName)) return;
    const sig = signature();
    if (sig === shown && drawer.childElementCount) return;
    shown = sig;
    drawer.replaceChildren(...(view.kind === 'task' ? renderTask() : view.kind === 'place' ? renderPlace() : renderAgent()));
  }
  setInterval(() => { if (view && view.kind !== 'task') render(); }, 1500);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && view && !view.renaming) close(); });

  // ---------- wardrobe: things to wear unlock as an agent levels up ----------
  const WEAR = [
    { key: 'bow', icon: '🎀', name: 'Bow', lv: 2 },
    { key: 'scarf', icon: '🧣', name: 'Scarf', lv: 3 },
    { key: 'flowers', icon: '🌸', name: 'Flower crown', lv: 5 },
    { key: 'party', icon: '🥳', name: 'Party hat', lv: 7 },
    { key: 'crown', icon: '👑', name: 'Crown', lv: 10 },
    { key: 'witch', icon: '🧙', name: 'Witch hat', lv: 1, festival: 'halloween' },
  ];
  const WEAR_KEY = 'miw-town-wear';
  const readWear = () => { try { return JSON.parse(localStorage.getItem(WEAR_KEY) || '{}'); } catch { return {}; } };
  const setWear = (id, key) => { const m = readWear(); m[id] = key; try { localStorage.setItem(WEAR_KEY, JSON.stringify(m)); } catch {} };
  // an agent wears what you picked while it's unlocked, otherwise the newest thing it has unlocked
  // during a festival everyone gets its special item, unless you picked something else
  function wearOf(me) {
    const pick = readWear()[me.id], lv = lvl(xpStore[me.id] || 0), f = festival();
    const ok = WEAR.filter(w => w.lv <= lv && (!w.festival || w.festival === f));
    if (pick === 'none') return 'none';
    if (ok.some(w => w.key === pick)) return pick;
    const special = ok.find(w => w.festival);
    if (special) return special.key;
    return ([...ok].reverse().find(w => !w.festival) || { key: 'none' }).key;
  }
  const wMats = {};
  const wMat = (c, extra) => { const k = c + JSON.stringify(extra || {}); return wMats[k] || (wMats[k] = new THREE.MeshLambertMaterial({ color: c, ...extra })); };
  function part(parent, geo, c, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = [], extra) {
    const m = new THREE.Mesh(geo, wMat(c, extra));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true;
    parent.add(m); return m;
  }
  // builds the item onto the character's head or body; returns the meshes so they can come off again
  function makeWear(key, cat, miw) {
    const top = miw ? 0.42 : 0.3, made = [];
    const grp = parent => { const g = new THREE.Group(); parent.add(g); made.push(g); return g; };
    if (key === 'bow') {
      const b = grp(cat.head); b.position.set(miw ? 0.24 : 0.19, top - 0.03, 0.06); b.rotation.z = -0.45;
      [-1, 1].forEach(sd => part(b, new THREE.ConeGeometry(0.09, 0.17, 12), '#ff7b9c', [sd * 0.085, 0, 0], [0, 0, sd * Math.PI / 2]));
      part(b, new THREE.SphereGeometry(0.045, 10, 8), '#ff5c8a');
    }
    if (key === 'scarf') {
      const s = grp(cat.body), y = miw ? 0.74 : 0.6, r = miw ? 0.2 : 0.23;
      part(s, new THREE.TorusGeometry(r, 0.075, 10, 24), '#8fc1f0', [0, y, 0], [Math.PI / 2, 0, 0]);
      part(s, new THREE.BoxGeometry(0.13, 0.28, 0.06), '#8fc1f0', [0.1, y - 0.15, r + 0.03], [-0.15, 0, 0.12]);
      [-0.06, 0.03].forEach(dy => part(s, new THREE.BoxGeometry(0.135, 0.03, 0.065), '#ffffff', [0.1 + dy * 0.1, y - 0.15 + dy, r + 0.03], [-0.15, 0, 0.12]));
    }
    if (key === 'flowers') {
      const f = grp(cat.head); f.position.y = top - 0.05; f.rotation.x = -0.12;
      part(f, new THREE.TorusGeometry(miw ? 0.3 : 0.24, 0.03, 8, 28), '#9fd49a', [], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, r = miw ? 0.3 : 0.24;
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
    if (key === 'witch') {
      const h = grp(cat.head); h.position.set(0.02, top + 0.02, -0.02); h.rotation.set(-0.08, 0, -0.12);
      part(h, new THREE.CylinderGeometry(0.34, 0.34, 0.03, 24), '#5b3f8c');
      part(h, new THREE.CylinderGeometry(0.19, 0.2, 0.06, 20), '#ff9a3c', [0, 0.04, 0]);
      part(h, new THREE.BoxGeometry(0.08, 0.06, 0.02), '#ffd23f', [0, 0.04, 0.19]);
      const tip = new THREE.Group(); tip.position.y = 0.06; h.add(tip);
      part(tip, new THREE.ConeGeometry(0.18, 0.3, 20), '#6a4a9c', [0, 0.15, 0]);
      part(tip, new THREE.ConeGeometry(0.09, 0.2, 14), '#6a4a9c', [0.05, 0.36, -0.02], [0, 0, -0.5]);
    }
    return made;
  }
  function dressUp(me) {
    const key = wearOf(me);
    if (me.wornOn === me.cat && me.wornKey === key) return;
    if (me.wornOn === me.cat) (me.wornParts || []).forEach(p => p.parent && p.parent.remove(p));
    me.wornParts = makeWear(key, me.cat, me.species === 'miw');
    me.wornOn = me.cat; me.wornKey = key;
  }
  // level ups: a little party, and the new thing goes straight on
  setInterval(() => {
    for (const me of agents.values()) {
      const lv = lvl(xpStore[me.id] || 0);
      if (me.seenLv && lv > me.seenLv) {
        const item = WEAR.find(w => !w.festival && w.lv > me.seenLv && w.lv <= lv);
        burst(me, ['🎉', '✨', '⭐', '🎊']);
        toast(item ? `🎉 ${me.name} reached Lv ${lv} and unlocked a ${item.name.toLowerCase()} ${item.icon}` : `🎉 ${me.name} reached Lv ${lv}!`);
        if (item) setWear(me.id, item.key);
      }
      me.seenLv = lv;
      dressUp(me);
    }
  }, 700);

  // ---------- friends say hi when one walks up to another resting friend ----------
  setInterval(() => {
    const list = [...agents.values()];
    for (const me of list) {
      const arrived = me.wasWalking && !me.walking;
      me.wasWalking = me.walking;
      if (!arrived || me.state !== 'idle') continue;
      const p = me.cat.g.position;
      const pal = list.find(o => o !== me && o.state === 'idle' && !o.walking && o.cat.g.position.distanceTo(p) < 2.6);
      if (!pal) continue;
      me.petAt = performance.now(); burst(me, ['👋'], 1);
      setTimeout(() => { pal.petAt = performance.now(); burst(pal, ['💕', '👋'], 2); }, 450);
    }
  }, 200);

  // ---------- weather: real Bangkok weather (or try ?weather=rain, cloudy, storm or clear) ----------
  window.weather = { kind: 'clear', temp: null };
  const WET = { clear: 0, cloudy: 0.45, rain: 0.75, storm: 1 };
  window.wetness = () => WET[window.weather.kind] || 0;
  window.isRaining = () => window.weather.kind === 'rain' || window.weather.kind === 'storm';
  window.weatherIcon = dayIcon => ({ cloudy: '☁️', rain: '🌧️', storm: '⛈️' })[window.weather.kind] || dayIcon;
  window.weatherTemp = () => window.weather.temp != null ? ` · ${window.weather.temp}°` : '';
  async function refreshWeather() {
    const q = new URLSearchParams(location.search).get('weather');
    if (q in WET) { window.weather.kind = q; return; }
    try { const r = await fetch('weather', { cache: 'no-store' }); if (r.ok) Object.assign(window.weather, await r.json()); } catch {}
  }
  refreshWeather(); setInterval(refreshWeather, 10 * 60 * 1000);

  // ---------- 3D portrait in the agent card (drag to spin) ----------
  const portrait = (() => {
    let r;
    try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return null; }
    r.setPixelRatio(Math.min(2, devicePixelRatio)); r.setSize(64, 64);
    r.domElement.className = 'portrait';
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfff4ea, 0xd9b0b4, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.5); sun.position.set(2, 4, 5); sc.add(sun);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50); cam.position.set(0, 1.0, 4.4); cam.lookAt(0, 0.74, 0);
    let model = null, key = '', spin = 0.5, drag = null;
    r.domElement.addEventListener('pointerdown', e => { drag = e.clientX; r.domElement.setPointerCapture(e.pointerId); });
    r.domElement.addEventListener('pointermove', e => { if (drag != null) { spin += (e.clientX - drag) * 0.035; drag = e.clientX; } });
    r.domElement.addEventListener('pointerup', () => { drag = null; });
    function show(me) {
      const k = [me.species, me.color, wearOf(me)].join();
      if (k === key) return;
      key = k;
      if (model) {
        const inScene = new Set();
        scene.traverse(o => o.geometry && inScene.add(o.geometry));
        model.g.traverse(o => { if (o.geometry && !inScene.has(o.geometry)) o.geometry.dispose(); });
        sc.remove(model.g);
      }
      model = makeCharacter(me.species, me.color);
      makeWear(wearOf(me), model, me.species === 'miw');
      sc.add(model.g);
    }
    (function frame(t) {
      requestAnimationFrame(frame);
      if (!model || !r.domElement.isConnected) return;
      if (drag == null) spin += 0.01;
      model.g.rotation.y = spin;
      model.body.position.y = Math.max(0, Math.sin(t / 380)) * 0.04;
      r.render(sc, cam);
    })(0);
    return { el: r.domElement, show };
  })();

  // ---------- timelines: what each agent did today (Bangkok time) ----------
  const bkk = opts => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hourCycle: 'h23', ...opts });
  const hhmm = ts => bkk({ hour: '2-digit', minute: '2-digit' }).format(ts);
  function dayStart() {
    const p = bkk({ hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date()), g = t => +p.find(x => x.type === t).value;
    return Date.now() - ((g('hour') * 60 + g('minute')) * 60 + g('second')) * 1000;
  }
  function segments(me) {
    const now = Date.now(), from = dayStart(), h = (me.history || []).filter(e => e.ts < now), out = [];
    h.forEach((e, i) => { const a = Math.max(e.ts, from), b = i + 1 < h.length ? h[i + 1].ts : now; if (b > a) out.push({ state: e.state, a, b }); });
    return out;
  }
  // the bar runs from this agent's first step today (at least an hour back) to now
  const barStart = seg => Math.min(seg[0].a, Date.now() - 3600 * 1000);
  window.timelineBar = (me, big) => {
    const seg = segments(me), bar = el('div', { className: 'tl' + (big ? ' big' : '') });
    if (!seg.length) return bar;
    const s0 = barStart(seg), span = Date.now() - s0;
    seg.forEach(sg => bar.append(el('i', {
      title: `${STATE_LABEL[sg.state]} · ${hhmm(sg.a)}–${hhmm(sg.b)}`,
      style: `left:${(sg.a - s0) / span * 100}%;width:${Math.max(0.6, (sg.b - sg.a) / span * 100)}%;background:${STATE_COLOR[sg.state]}`,
    })));
    return bar;
  };
  function todayCard(me) {
    const seg = segments(me);
    if (!seg.length) return null;
    const total = {};
    seg.forEach(sg => { total[sg.state] = (total[sg.state] || 0) + sg.b - sg.a; });
    const dur = ms => ms < 60000 ? '<1m' : ms < 3600000 ? `${Math.round(ms / 60000)}m` : `${Math.floor(ms / 3600000)}h ${Math.round(ms % 3600000 / 60000)}m`;
    return el('div', { className: 'card' },
      el('label', { className: 'lbl2' }, '🕒 Today'),
      timelineBar(me, true),
      el('div', { className: 'tlx' }, el('span', {}, hhmm(barStart(seg))), el('span', {}, 'now')),
      el('div', { className: 'tlk' }, Object.entries(total).sort((x, y) => y[1] - x[1]).map(([st, ms]) =>
        el('span', {}, el('i', { style: `background:${STATE_COLOR[st]}` }), `${STATE_LABEL[st]} ${dur(ms)}`))));
  }

  // ---------- places: tap a building or room to see who's there ----------
  const places = placeLabels.map(([label, P], i) => {
    const key = Object.keys(PLACES).find(k => PLACES[k] === P);
    // a place with an href (the town's Cat Home) is a door: tapping it goes there
    label.addEventListener('click', () => P.href ? (location.href = P.href) : openPlace(i));
    return { i, key, icon: P.icon, name: P.name, desc: P.desc, rest: key ? (key === 'idle' ? 0 : null) : P.rest, group: P.group, href: P.href, tint: key ? TINT[key] : '#fff0f5' };
  });
  const whoIsAt = pl => [...agents.values()].filter(a => pl.rest == null ? a.state === pl.key : a.state === 'idle' && (a.rest || 0) === pl.rest);
  function openPlace(i) { view = { kind: 'place', i }; drawer.hidden = false; render(); }
  function renderPlace() {
    const pl = places[view.i], here = whoIsAt(pl);
    const head = el('div', { className: 'dh' },
      el('div', { className: 'face nodot', style: `background:${pl.tint}` }, pl.icon),
      el('div', { style: 'flex:1;min-width:0' }, el('h2', {}, pl.name), el('small', {}, pl.desc || '')),
      closeBtn());
    const list = here.length
      ? el('div', { className: 'who' }, here.map(a => {
        const row = el('button', { className: 'whorow' },
          el('span', { className: 'wf', style: `background:${a.color}` }, SPECIES[a.species].emoji),
          el('div', { style: 'min-width:0;flex:1' }, el('b', {}, a.name, el('em', {}, 'Lv ' + lvl(xpStore[a.id] || 0))),
            el('small', {}, a.walking ? '🚶 On the way…' : `${STATE_ICON[a.state]} ${a.msg || STATE_LABEL[a.state]}`)),
          el('span', {}, '›'));
        row.onclick = () => openAgent(a.id);
        return row;
      }))
      : el('p', { className: 'hint' }, 'Nobody here right now.');
    return [head, el('div', { className: 'db' }, el('div', {}, el('h3', {}, here.length ? `Here now · ${here.length}` : 'Here now'), list))];
  }

  // ---------- festivals: decorations that switch on by date (Bangkok time); try ?festival=halloween or ?festival=none ----------
  // add more here later (Loy Krathong, Christmas…): a date range, a wardrobe item, and a decor builder
  const FESTIVALS = { halloween: { from: [10, 24], to: [11, 1], hello: '🎃 Happy Halloween week! Everyone dressed up.' } };
  let festCache = [0, null];
  function festival() {
    if (Date.now() - festCache[0] < 60000) return festCache[1];
    const q = new URLSearchParams(location.search).get('festival');
    let f = null;
    if (q !== null) f = FESTIVALS[q] ? q : null;
    else {
      const p = bkk({ month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      const md = +p.find(x => x.type === 'month').value * 100 + +p.find(x => x.type === 'day').value;
      f = Object.keys(FESTIVALS).find(k => { const a = FESTIVALS[k].from[0] * 100 + FESTIVALS[k].from[1], b = FESTIVALS[k].to[0] * 100 + FESTIVALS[k].to[1]; return a <= b ? md >= a && md <= b : md >= a || md <= b; }) || null;
    }
    festCache = [Date.now(), f];
    return f;
  }
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd36b' });
  function pumpkin() {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; part(g, new THREE.SphereGeometry(0.17, 12, 10), i % 2 ? '#ff9a3c' : '#ff8c2e', [Math.cos(a) * 0.1, 0.17, Math.sin(a) * 0.1]).scale.set(0.85, 0.95, 0.85); }
    part(g, new THREE.CylinderGeometry(0.03, 0.045, 0.12, 8), '#7a8a3a', [0, 0.36, 0], [0, 0, 0.2]);
    // a friendly carved face that glows
    [-1, 1].forEach(sd => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 3), glowMat); e.position.set(sd * 0.075, 0.22, 0.255); e.rotation.x = Math.PI / 2; e.rotation.y = Math.PI; g.add(e); });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), glowMat); m.position.set(0, 0.12, 0.255); g.add(m);
    return g;
  }
  function ghost() {
    const g = new THREE.Group(), mat = wMat('#ffffff', { transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const add = (geo, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; g.add(m); return m; };
    add(new THREE.SphereGeometry(0.32, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0.3);
    add(new THREE.CylinderGeometry(0.32, 0.4, 0.42, 18, 1, true), 0.09);
    [-1, 1].forEach(sd => { part(g, new THREE.SphereGeometry(0.045, 8, 6), '#3d2f4a', [sd * 0.11, 0.38, 0.29]); const arm = add(new THREE.SphereGeometry(0.09, 10, 8), 0.2); arm.position.x = sd * 0.38; arm.scale.set(1, 0.6, 0.6); });
    part(g, new THREE.SphereGeometry(0.035, 8, 6), '#ff9fb5', [0, 0.27, 0.31]).scale.set(1, 1.3, 0.5);
    return g;
  }
  function bat() {
    const g = new THREE.Group(), dark = '#3d2f4a';
    part(g, new THREE.SphereGeometry(0.13, 12, 10), dark);
    [-1, 1].forEach(sd => part(g, new THREE.ConeGeometry(0.04, 0.09, 6), dark, [sd * 0.06, 0.13, 0]));
    [-1, 1].forEach(sd => part(g, new THREE.SphereGeometry(0.025, 6, 6), '#ffe08a', [sd * 0.045, 0.03, 0.115]));
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.5, 0.12); shape.lineTo(0.42, -0.02); shape.lineTo(0.3, 0.04); shape.lineTo(0.2, -0.06); shape.lineTo(0.08, -0.04); shape.lineTo(0, 0);
    const wings = [-1, 1].map(sd => {
      const pivot = new THREE.Group(); pivot.scale.x = sd; g.add(pivot);
      const w = part(pivot, new THREE.ShapeGeometry(shape), '#4a3a5c', [0.08, 0, 0], [-Math.PI / 2, 0, 0], { side: THREE.DoubleSide });
      return pivot;
    });
    g.userData.flap = t => wings.forEach(p => { p.rotation.z = Math.sin(t / 90) * 0.7; });
    return g;
  }
  let decor = null;
  function setFestive() {
    const f = festival();
    if ((decor && decor.key) === f) return;
    if (decor) { scene.remove(decor.g); decor = null; }
    agents.forEach(dressUp);
    if (f !== 'halloween' || typeof FESTIVE === 'undefined') return;
    const g = new THREE.Group(), anim = [];
    const facing = (x, z) => Math.atan2(CAM_HOME.x - x, CAM_HOME.z - z);
    FESTIVE.pumpkins.forEach(([x, y, z, sz]) => { const p = pumpkin(); p.position.set(x, y, z); p.scale.setScalar(sz); p.rotation.y = facing(x, z) + (Math.random() - 0.5) * 0.5; g.add(p); });
    FESTIVE.ghosts.forEach(([x, y, z], i) => {
      const h = ghost(); g.add(h);
      anim.push(t => { const a = t / 3200 + i * 2; h.position.set(x + Math.cos(a) * 0.8, y + Math.sin(t / 700 + i) * 0.25, z + Math.sin(a) * 0.8); h.rotation.y = facing(h.position.x, h.position.z) + Math.sin(t / 900 + i) * 0.3; });
    });
    const B = FESTIVE.bats;
    for (let i = 0; i < B.n; i++) {
      const b = bat(); g.add(b);
      const ph = i / B.n * Math.PI * 2, r = B.r * (0.75 + (i % 3) * 0.12), sp = (0.00022 + i * 0.00003) * (i % 2 ? 1 : -1), dy = (i % 2) * 1.2;
      anim.push(t => { const a = ph + t * sp; b.position.set(B.x + Math.cos(a) * r, B.y + dy + Math.sin(t / 500 + i) * 0.3, B.z + Math.sin(a) * r * 0.8); b.rotation.y = Math.atan2(-Math.sin(a) * Math.sign(sp), Math.cos(a) * 0.8 * Math.sign(sp)); b.userData.flap(t + i * 137); });
    }
    scene.add(g);
    decor = { key: f, g, anim };
  }
  animated.push(t => decor && decor.anim.forEach(fn => fn(t)));
  setFestive(); setInterval(setFestive, 60000);

  // ---------- once everything is built, merge what never moves (agents stay separate) ----------
  if (window.mergeStatic) mergeStatic(scene, { skip: o => [...agents.values()].some(a => a.cat.g === o), owners: new Set([...places.map(p => p.group), decor && decor.g].filter(Boolean)) });
  if (festival() && FESTIVALS[festival()].hello) setTimeout(() => toast(FESTIVALS[festival()].hello), 1200);

  // ---------- ambient sound, off until you turn it on: birds by day, crickets at night, rain and thunder when it's really wet ----------
  const SOUND_KEY = 'miw-town-sound';
  let soundOn = false;
  try { soundOn = localStorage.getItem(SOUND_KEY) === 'on'; } catch {}
  const sndBtn = el('button', { id: 'tSound', title: 'Ambient sound' });
  const paintSnd = () => { sndBtn.replaceChildren(soundOn ? '🔊' : '🔇', el('span', { className: 'txt' }, 'Sound')); sndBtn.setAttribute('aria-pressed', String(soundOn)); };
  paintSnd();
  tools.insertBefore(sndBtn, document.getElementById('tCam'));
  let ac = null, master, rainGain, noiseBuf;
  function startAudio() {
    if (ac) { ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource(); noise.buffer = noiseBuf; noise.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
    rainGain = ac.createGain(); rainGain.gain.value = 0;
    noise.connect(lp).connect(hp).connect(rainGain).connect(master); noise.start();
  }
  const blip = (t0, f0, f1, len, peak) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + len * 0.8);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + len * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + len + 0.02);
  };
  const chirp = at => { const n = 2 + Math.floor(Math.random() * 3), f = 2600 + Math.random() * 1400; for (let i = 0; i < n; i++) blip(at + i * 0.13, f, f * 1.45, 0.1, 0.045); };
  const cricket = at => { const f = 4300 + Math.random() * 300; for (let i = 0; i < 3; i++) blip(at + i * 0.07, f, f, 0.045, 0.016); };
  function thunder(at) {
    const src = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; lp.type = 'lowpass'; lp.frequency.value = 160;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.9, at + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, at + 3);
    src.connect(lp).connect(g).connect(master); src.start(at); src.stop(at + 3.1);
  }
  let nextBird = 0, nextCricket = 0, lastFlash = -1;
  setInterval(() => {
    if (!ac || !soundOn) return;
    const now = ac.currentTime, dk = darkness(hourNow()), kind = window.weather.kind, wet = kind === 'rain' || kind === 'storm';
    rainGain.gain.setTargetAtTime(wet ? (kind === 'storm' ? 0.35 : 0.22) : 0, now, 1.5);
    if (!wet && dk < 0.4 && now > nextBird) { chirp(now + 0.05); nextBird = now + 2 + Math.random() * 5; }
    if (dk > 0.6 && kind !== 'storm' && now > nextCricket) { cricket(now + 0.05); nextCricket = now + 0.6 + Math.random() * 0.9; }
    // thunder rolls in just after each lightning flash the scene draws
    const cycle = Math.floor(performance.now() / 9000);
    if (kind === 'storm' && cycle !== lastFlash && performance.now() % 9000 > 140) { lastFlash = cycle; thunder(now + 0.6); }
  }, 200);
  sndBtn.onclick = () => {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch {}
    paintSnd();
    if (soundOn) startAudio(); else if (ac) ac.suspend();
  };
  // browsers only play sound after a click, so a remembered "on" starts with your first tap
  if (soundOn) addEventListener('pointerdown', () => soundOn && startAudio(), { once: true });

  // ---------- speech bubbles that move a little, by state ----------
  window.setBubble = (me, text, kind) => {
    if (me.bubbleText === text && me.bubbleKind === kind) return;
    me.bubbleText = text; me.bubbleKind = kind;
    me.bubble.dataset.st = kind;
    const i = text.indexOf(' ');
    me.bubble.replaceChildren(el('span', { className: 'ic' }, i > 0 ? text.slice(0, i) : ''), i > 0 ? text.slice(i) : text, el('span', { className: 'fx' }));
  };

  // ---------- click an agent in the 3D scene ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const list = [...agents.values()];
    const hit = ray.intersectObjects(list.map(a => a.cat.g), true)[0];
    if (!hit) {
      const tapped = ray.intersectObjects(places.filter(p => p.group).map(p => p.group), true)[0];
      if (!tapped) return;
      const pl = places.find(p => { let o = tapped.object; while (o) { if (o === p.group) return true; o = o.parent; } return false; });
      if (pl) pl.href ? (location.href = pl.href) : openPlace(pl.i);
      return;
    }
    const me = list.find(a => { let o = hit.object; while (o) { if (o === a.cat.g) return true; o = o.parent; } return false; });
    if (me) openAgent(me.id);
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons) return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const targets = [...agents.values()].map(a => a.cat.g).concat(places.filter(p => p.group).map(p => p.group));
    renderer.domElement.style.cursor = ray.intersectObjects(targets, true).length ? 'pointer' : '';
  });
})();
