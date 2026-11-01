// Verifica que el modelo RECIBE el contenido del adjunto (no solo HTTP 200).
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 28991;
const BASE = `http://127.0.0.1:${PORT}`;
let AUTH = {};
async function api(p, opts = {}) {
  const res = await fetch(BASE + p, { ...opts, headers: { 'Content-Type': 'application/json', ...AUTH, ...(opts.headers || {}) } });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
function unwrap(r) { const b = r.body; return b && typeof b === 'object' && 'data' in b ? b.data : b; }
(async () => {
  try { await fetch(BASE + '/api/info'); throw new Error('puerto ocupado'); }
  catch (e) { if (String(e.message).startsWith('puerto')) throw e; }
  const tmp = path.join(fs.realpathSync(os.tmpdir()), `forge-attach2-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  const SECRET = 'ZAFIRO-' + Math.floor(Math.random() * 9000 + 1000);
  fs.writeFileSync(path.join(tmp, 'clave.txt'), `La palabra secreta es ${SECRET}.\nNo la inventes, leela del adjunto.\n`);
  const fileUri = 'file:///' + path.join(tmp, 'clave.txt').replace(/\\/g, '/');
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); } catch { throw new Error('no opencode'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: os.tmpdir() });
  let password = null, out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  if (!password) throw new Error('sin password');
  AUTH = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64') };
  let info = null;
  for (let i = 0; i < 80; i++) { try { const r = await api('/api/info'); if (r.status === 200) { info = unwrap(r); break; } } catch {} await sleep(250); }
  if (!info) throw new Error('sin /api/info');
  const s = unwrap(await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'probe-attach2', directory: tmp }) }));
  await api(`/api/session/${s.id}/prompt`, { method: 'POST', body: JSON.stringify({ text: 'Repite EXACTAMENTE la palabra secreta del adjunto, sin nada más.', files: [{ uri: fileUri, name: 'clave.txt' }] }) });
  let found = null;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const msgs = unwrap(await api(`/api/session/${s.id}/message?limit=30&order=asc`)) || [];
    for (const m of msgs) {
      for (const p of m.content || m.parts || []) {
        if (p && typeof p.text === 'string' && p.text.includes(SECRET)) { found = p.text.trim().slice(0, 120); break; }
      }
      if (found) break;
    }
    if (found) break;
  }
  console.log(found ? `E2E-ATTACH OK: el modelo leyó "${found}"` : 'E2E-ATTACH FAIL: el modelo no devolvió la palabra del adjunto');
  await api(`/api/session/${s.id}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${info.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(found ? 0 : 1);
})().catch((e) => {
  console.error('FALLO:', e.message);
  try {
    const out = execSync('netstat -ano').toString().split('\n').find((l) => l.includes('127.0.0.1:28991') && l.includes('LISTENING'));
    const pid = out && out.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) execSync(`taskkill /F /PID ${pid}`);
  } catch {}
  process.exit(1);
});
