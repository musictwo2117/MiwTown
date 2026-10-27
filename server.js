// Tiny state server for Miw's Town. No dependencies: `node server.js`
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = Number(process.env.AGENT_OFFICE_PORT || 19100);
const STALE_MS = 5 * 60 * 1000;   // busy for this long with no update → back to idle
const GONE_MS = 30 * 60 * 1000;   // silent for this long → leaves the room
const JOB_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_RUNNING = 3;
const CLAUDE = process.env.CLAUDE_BIN || (fs.existsSync(path.join(os.homedir(), '.local/bin/claude')) ? path.join(os.homedir(), '.local/bin/claude') : 'claude');
// tasks sent from the UI may read and edit files in their folder, but never run commands or reach the web
const TASK_FLAGS = ['--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
  '--disallowedTools', 'Bash', 'WebFetch', 'WebSearch', 'NotebookEdit', 'KillShell', 'BashOutput'];

// a fresh secret each run; only pages this server serves know it, so other websites can't start tasks
const TOKEN = crypto.randomBytes(24).toString('hex');
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

const agents = {};
const jobs = {};

function sweep() {
  const now = Date.now();
  for (const [id, a] of Object.entries(agents)) {
    if (now - a.ts > GONE_MS) delete agents[id];
    else if (now - a.ts > STALE_MS && a.state !== 'idle') { Object.assign(a, { state: 'idle', msg: '' }); a.history.push({ ts: now, state: 'idle', msg: '' }); }
  }
}

function readJson(req, cb) {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
  req.on('end', () => { try { cb(null, JSON.parse(body || '{}')); } catch (e) { cb(e); } });
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
}

// a project folder must be a real directory somewhere inside your home folder (not the home folder itself)
function checkFolder(dir) {
  if (!dir || typeof dir !== 'string') return 'Pick a folder for the task.';
  const abs = path.resolve(dir.replace(/^~(?=$|\/)/, os.homedir()));
  const home = os.homedir();
  if (abs === home || !abs.startsWith(home + path.sep)) return 'Pick a folder inside your home folder.';
  try { if (!fs.statSync(abs).isDirectory()) return "That path isn't a folder."; } catch { return "That folder doesn't exist."; }
  return { abs };
}

// if the server itself was started from inside a Claude Code session, it inherits that session's
// CLAUDE_* variables and API base URL; a task would then try to borrow that session's login and fail.
// Drop them so each task uses your own `claude` login (an ANTHROPIC_API_KEY you set yourself still works).
function taskEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^CLAUDE/.test(k) || k === 'ANTHROPIC_BASE_URL' || k === 'ANTHROPIC_AUTH_TOKEN') delete env[k];
  return env;
}

function startJob({ prompt, cwd, resume, label }) {
  if (Object.values(jobs).filter(j => j.status === 'running').length >= MAX_RUNNING) return { error: `Up to ${MAX_RUNNING} tasks can run at once. Wait for one to finish.` };
  const id = crypto.randomBytes(4).toString('hex');
  const args = ['-p', prompt, ...(resume ? ['--resume', resume, '--fork-session'] : []), ...TASK_FLAGS];
  const job = { id, prompt, cwd, label, resumeOf: resume || null, status: 'running', startedAt: Date.now(), sessionId: null, log: [], result: '' };
  jobs[id] = job;
  let child;
  try { child = spawn(CLAUDE, args, { cwd, env: taskEnv(), stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { Object.assign(job, { status: 'error', result: `Couldn't start Claude Code: ${e.message}` }); return { job }; }
  job.pid = child.pid;
  const note = line => { job.log.push(line.slice(0, 200)); if (job.log.length > 40) job.log.shift(); };
  let buf = '';
  child.stdout.on('data', c => {
    buf += c;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      if (ev.session_id && !job.sessionId) job.sessionId = ev.session_id;
      if (ev.type === 'assistant') for (const part of ev.message?.content || []) {
        if (part.type === 'text' && part.text.trim()) note('💬 ' + part.text.trim());
        if (part.type === 'tool_use') note(`🔧 ${part.name}${part.input?.file_path ? ' ' + path.basename(part.input.file_path) : ''}`);
      }
      if (ev.type === 'result') { job.result = String(ev.result || ''); job.status = ev.is_error ? 'error' : 'done'; }
    }
  });
  let errText = '';
  child.stderr.on('data', c => { errText = (errText + c).slice(-2000); });
  child.on('error', e => Object.assign(job, { status: 'error', result: e.code === 'ENOENT' ? "Couldn't find the claude command. Set CLAUDE_BIN to its path." : e.message }));
  child.on('close', code => {
    clearTimeout(job.timer);
    if (job.status === 'running') Object.assign(job, { status: code === 0 ? 'done' : 'error', result: job.result || errText.trim() || `Stopped (exit ${code}).` });
    job.endedAt = Date.now();
  });
  job.timer = setTimeout(() => { note('⏱️ Took too long, stopping.'); child.kill('SIGTERM'); }, JOB_TIMEOUT_MS);
  job.child = child;
  return { job };
}
// live Bangkok weather from Open-Meteo (free, no key), refreshed at most every 10 minutes
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code,cloud_cover&timezone=Asia%2FBangkok';
let weather = { kind: 'clear', temp: null, at: 0 };
function weatherKind(code, cloud) {
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 2 || cloud >= 70) return 'cloudy';
  return 'clear';
}
async function getWeather() {
  if (Date.now() - weather.at < 10 * 60 * 1000) return weather;
  try {
    const r = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(5000) });
    const c = (await r.json()).current;
    weather = { kind: weatherKind(c.weather_code, c.cloud_cover), temp: Math.round(c.temperature_2m), at: Date.now() };
  } catch { weather.at = Date.now() - 8 * 60 * 1000; }   // offline: keep the last reading, try again in 2 minutes
  return weather;
}

const publicJob = j => ({ id: j.id, prompt: j.prompt, cwd: j.cwd, label: j.label, resumeOf: j.resumeOf, status: j.status, startedAt: j.startedAt, endedAt: j.endedAt, sessionId: j.sessionId, log: j.log, result: j.result });

http.createServer((req, res) => {
  // refuse requests addressed to any other host name (blocks DNS-rebinding tricks)
  if (!ALLOWED_HOSTS.has(req.headers.host)) { res.statusCode = 403; return res.end(); }
  const url = req.url.split('?')[0];

  if (url === '/state' && req.method === 'GET') {
    sweep();
    return send(res, 200, Object.values(agents));
  }

  // the Claude Code hook reports here. Only the hook may: it sends JSON and no Origin, while a web page
  // posting here from a browser always sends an Origin, and can't send JSON cross-site without a preflight we never answer
  if (url === '/state' && req.method === 'POST') {
    if (req.headers.origin || !/^application\/json\b/.test(req.headers['content-type'] || '')) return send(res, 403, { error: 'forbidden' });
    return readJson(req, (err, d) => {
      if (err) return send(res, 400, { error: 'bad json' });
      const id = String(d.id || d.name || 'agent');
      if (d.state === 'gone') { delete agents[id]; return send(res, 200, { ok: true }); }
      const prev = agents[id] || {};
      const state = String(d.state || 'idle'), msg = String(d.msg || '');
      // a day of state changes, for the timeline
      const history = (prev.history || []).filter(h => Date.now() - h.ts < 24 * 3600 * 1000).slice(-399);
      if (prev.state !== state || prev.msg !== msg) history.push({ ts: Date.now(), state, msg });
      agents[id] = { id, name: String(d.name || prev.name || id), state, msg, ts: Date.now(), history,
        sessionId: d.sessionId ? String(d.sessionId) : prev.sessionId, cwd: d.cwd ? String(d.cwd) : prev.cwd };
      send(res, 200, { ok: true });
    });
  }

  if (url === '/weather' && req.method === 'GET') {
    return getWeather().then(w => send(res, 200, { kind: w.kind, temp: w.temp }));
  }

  // everything below changes things on this computer, so it needs the page's secret
  const authed = req.headers['x-miw-token'] === TOKEN;

  if (url === '/jobs' && req.method === 'GET') {
    if (!authed) return send(res, 403, { error: 'forbidden' });
    return send(res, 200, Object.values(jobs).sort((a, b) => b.startedAt - a.startedAt).slice(0, 20).map(publicJob));
  }

  // start a new task in a folder, or message an agent (continues its conversation in a fork)
  if (url === '/task' && req.method === 'POST') {
    if (!authed) return send(res, 403, { error: 'forbidden' });
    return readJson(req, (err, d) => {
      if (err) return send(res, 400, { error: 'bad json' });
      const prompt = String(d.prompt || '').trim();
      if (!prompt) return send(res, 400, { error: 'Write what you want done first.' });
      if (prompt.length > 4000) return send(res, 400, { error: 'Keep the task under 4,000 characters.' });
      let cwd, resume = null, label;
      if (d.agentId) {
        const a = agents[d.agentId];
        if (!a || !a.sessionId || !a.cwd) return send(res, 400, { error: "This agent can't take messages yet. It needs to do one more step first." });
        // the same folder rule as new tasks, so a reported folder can't take a task outside your home folder
        const f = checkFolder(a.cwd);
        if (typeof f === 'string') return send(res, 400, { error: `Can't message this agent from here: ${f}` });
        cwd = f.abs; resume = a.sessionId; label = `${a.name} 💬`;
      } else {
        const f = checkFolder(d.cwd);
        if (typeof f === 'string') return send(res, 400, { error: f });
        cwd = f.abs; label = path.basename(cwd);
      }
      const r = startJob({ prompt, cwd, resume, label });
      if (r.error) return send(res, 429, { error: r.error });
      send(res, 200, publicJob(r.job));
    });
  }

  const stop = url.match(/^\/jobs\/([0-9a-f]+)\/stop$/);
  if (stop && req.method === 'POST') {
    if (!authed) return send(res, 403, { error: 'forbidden' });
    const j = jobs[stop[1]];
    if (!j) return send(res, 404, { error: 'No such task.' });
    if (j.status === 'running' && j.child) { j.child.kill('SIGTERM'); j.log.push('✋ Stopped from the UI.'); }
    return send(res, 200, publicJob(j));
  }

  // folders the town already knows about, to suggest in the new-task dialog
  if (url === '/folders' && req.method === 'GET') {
    if (!authed) return send(res, 403, { error: 'forbidden' });
    const seen = new Set([...Object.values(agents).map(a => a.cwd), ...Object.values(jobs).map(j => j.cwd)].filter(Boolean));
    return send(res, 200, [...seen].filter(p => typeof checkFolder(p) !== 'string'));
  }

  const PAGES = { '/': 'town.html', '/town': 'town.html', '/room': 'room.html' };
  if (PAGES[url] && req.method === 'GET') {
    const html = fs.readFileSync(path.join(__dirname, PAGES[url]), 'utf8').replace('__MIW_TOKEN__', TOKEN);
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return res.end(html);
  }
  if ((url === '/panel.js' || url === '/scenery.js') && req.method === 'GET') {
    res.setHeader('content-type', 'text/javascript; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    return fs.createReadStream(path.join(__dirname, url.slice(1))).pipe(res);
  }

  res.statusCode = 404; res.end();
}).listen(PORT, '127.0.0.1', () => console.log(`Miw's Town → http://localhost:${PORT}`));

// don't leave tasks running if the town shuts down
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { Object.values(jobs).forEach(j => j.status === 'running' && j.child?.kill('SIGTERM')); process.exit(0); });
