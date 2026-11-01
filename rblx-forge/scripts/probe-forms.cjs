// Sonda: endpoints de forms contra OpenCode real.
const { spawn, execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const PORT = 28994;
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); } catch { throw new Error('no opencode'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: require('os').tmpdir() });
  let password = null, out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  const H = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64'), 'Content-Type': 'application/json' };
  const api = async (p, opts = {}) => {
    const r = await fetch(`http://127.0.0.1:${PORT}` + p, { ...opts, headers: { ...H, ...(opts.headers || {}) } });
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
    return { status: r.status, body: j && typeof j === 'object' && 'data' in j ? j.data : (j ?? t) };
  };
  const s = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'probe-forms' }) });
  const sid = s.body.id;
  const list = await api(`/api/session/${sid}/form`);
  console.log('LIST:', list.status, JSON.stringify(list.body).slice(0, 120));
  const bad = await api(`/api/session/${sid}/form/nope/reply`, { method: 'POST', body: JSON.stringify({ answer: { a: 'b' } }) });
  console.log('REPLY-BOGUS:', bad.status, JSON.stringify(bad.body).slice(0, 200));
  const del = await api(`/api/session/${sid}/form/nope`, { method: 'DELETE' });
  console.log('DELETE-BOGUS:', del.status, JSON.stringify(del.body).slice(0, 200));
  await api(`/api/session/${sid}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${child.pid}`);
  console.log('KILLED-OWN-SERVER');
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
