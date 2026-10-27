#!/usr/bin/env node
// Claude Code hook → Miw's Town. Reads the hook event on stdin and posts a state.
// Each Claude Code session becomes its own cat, named after its project folder.
const PORT = process.env.AGENT_OFFICE_PORT || 19100;
const base = s => String(s || '').split('/').filter(Boolean).pop() || '';
const clip = (s, n = 40) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

let input = '';
process.stdin.on('data', c => { input += c; }).on('end', () => {
  let e = {};
  try { e = JSON.parse(input); } catch {}
  const ev = e.hook_event_name, tool = e.tool_name || '', ti = e.tool_input || {};
  let state, msg = '';

  if (ev === 'SessionStart') { state = 'idle'; msg = 'Hi there!'; }
  else if (ev === 'UserPromptSubmit') { state = 'thinking'; msg = 'Thinking…'; }
  else if (ev === 'PreToolUse') {
    if (tool === 'Read') { state = 'researching'; msg = `Reading ${base(ti.file_path)}`; }
    else if (/^(Grep|Glob|LS)$/.test(tool)) { state = 'researching'; msg = `Searching ${ti.pattern || ''}`; }
    else if (/^Web(Fetch|Search)$/.test(tool)) { state = 'researching'; msg = 'Browsing the web'; }
    else if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) { state = 'writing'; msg = `Editing ${base(ti.file_path || ti.notebook_path)}`; }
    else if (tool === 'Bash') { state = 'executing'; msg = ti.description || ti.command; }
    else if (/^(Task|Agent)$/.test(tool)) { state = 'syncing'; msg = 'Handing off to a helper'; }
    else if (tool.startsWith('mcp__')) { state = 'syncing'; msg = tool.split('__').pop(); }
    else { state = 'executing'; msg = tool; }
  }
  else if (ev === 'PostToolUseFailure') { state = 'error'; msg = `Oops, ${tool.split('__').pop()} failed`; }
  else if (ev === 'Notification') { state = 'idle'; msg = 'Waiting for you'; }
  else if (ev === 'Stop') { state = 'idle'; msg = 'All done ✨'; }
  else if (ev === 'SessionEnd') { state = 'gone'; }
  else process.exit(0);

  const body = JSON.stringify({
    id: String(e.session_id || 'claude').slice(0, 8),
    name: clip(base(e.cwd) || 'claude', 16),
    state,
    msg: clip(msg),
    // full id and folder let the town message this agent later
    sessionId: e.session_id || '',
    cwd: e.cwd || '',
  });
  // never block Claude: give up quickly if the office isn't running
  setTimeout(() => process.exit(0), 800);
  fetch(`http://127.0.0.1:${PORT}/state`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    .catch(() => {})
    .finally(() => process.exit(0));
});
