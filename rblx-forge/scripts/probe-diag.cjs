// Diagnóstico: sesión con modelo explícito, volcado CRUDO de mensajes.
const { spawn, execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const PORT = 28987;
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); } catch { throw new Error('no opencode'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: require('os').tmpdir() });
  let password = null, out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  const H = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64'), 'Content-Type': 'application/json' };
  const api = async (p, opts = {}) => {
    const r = await fetch(`http://127.0.0.1:${PORT}` + p, { ...opts, headers: { ...H } });
    const t = await r.text();
    let j = null;
    try { j = JSON.parse(t); } catch {}
    return { status: r.status, body: j && typeof j === 'object' && 'data' in j ? j.data : j };
  };
  const info = await api('/api/info');
  const srvPid = info.body.pid;
  // 1. ¿Cómo es REALMENTE una entrada de modelo gratuito?
  const models = await api('/api/model');
  const mimo = (Array.isArray(models.body) ? models.body : []).find((m) => (m.modelID || m.id) === 'mimo-v2.6-flash-free');
  console.log('MODEL-ENTRY:', JSON.stringify(mimo).slice(0, 600));
  // 2. Default del servidor.
  const def = await api('/api/model/default');
  console.log('DEFAULT:', JSON.stringify(def.body).slice(0, 300));
  // 3. Sesión CON modelo explícito (el mismo default que funciona solo).
  const s = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'diag-explicit-model', model: { id: 'iceman-contributor-free', providerID: 'opencode-go' } }) });
  console.log('SESSION:', JSON.stringify(s.body).slice(0, 300));
  await api(`/api/session/${s.body.id}/prompt`, { method: 'POST', body: JSON.stringify({ text: 'Reply with exactly: OK' }) });
  await sleep(20000);
  const msgs = await api(`/api/session/${s.body.id}/message?limit=10&order=asc`);
  const arr = Array.isArray(msgs.body) ? msgs.body : [];
  console.log('N-MSGS:', arr.length);
  for (const m of arr) console.log('RAW-MSG:', JSON.stringify(m).slice(0, 900));
  await api(`/api/session/${s.body.id}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${srvPid}`);
  console.log('KILLED');
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
