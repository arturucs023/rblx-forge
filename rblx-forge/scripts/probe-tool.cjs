// Sonda: ¿acepta /prompt files:[{uri}]? ¿Qué forma tienen los tool parts?
// Servidor PROPIO en 28991 (nunca el global). Limpieza: solo el PID propio.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 28990;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let AUTH = {};

async function api(p, opts = {}) {
  const res = await fetch(BASE + p, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...AUTH, ...(opts.headers || {}) },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text.slice(0, 500) };
}
function unwrap(r) {
  const b = r.body;
  return b && typeof b === 'object' && 'data' in b ? b.data : b;
}

(async () => {
  try { await fetch(BASE + '/api/info'); throw new Error(`puerto ${PORT} ocupado`); }
  catch (e) { if (String(e.message).startsWith('puerto')) throw e; }

  const tmp = path.join(fs.realpathSync(os.tmpdir()), `forge-probe-tool-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
    const fileUri = 'file:///' + path.join(tmp, 'nota.txt').replace(/\\/g, '/');
  fs.writeFileSync(path.join(tmp, 'nota.txt'), 'hola\n');

  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); }
  catch { throw new Error('opencode no detectado'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: os.tmpdir() });
  let password = null, out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  if (!password) { try { process.kill(child.pid); } catch {} throw new Error('sin password'); }
  AUTH = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64') };

  let info = null;
  for (let i = 0; i < 80; i++) { try { const r = await api('/api/info'); if (r.status === 200) { info = unwrap(r); break; } } catch {} await sleep(250); }
  if (!info) throw new Error('sin /api/info');
  console.log('[PROBE] servidor v' + info.version + ' pid=' + info.pid);

  const created = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'probe-attach', directory: tmp }) });
  const sid = unwrap(created).id;
  if (!sid) throw new Error('sin sid: ' + JSON.stringify(created).slice(0, 200));
  console.log('[PROBE] sesion ' + sid);

  // 1. ¿Acepta files:[{uri}]?
  const withFiles = await api(`/api/session/${sid}/prompt`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Responde solo con la palabra OK.', files: [] }),
  });
  console.log('[PROBE] prompt+files status=' + withFiles.status + ' ' + (withFiles.raw || '').slice(0, 200));

  // 2. Forzar tool-call y volcar la forma real del part.
  await sleep(2000);
  const ask = await api(`/api/session/${sid}/prompt`, {
    method: 'POST', body: JSON.stringify({ text: 'Lista los archivos del directorio de trabajo. Solo nombres, uno por línea.' }),
  });
  console.log('[PROBE] prompt-read status=' + ask.status);
  let toolShape = null;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const msgs = await api(`/api/session/${sid}/message?limit=30&order=asc`);
    const arr = Array.isArray(unwrap(msgs)) ? unwrap(msgs) : [];
    for (const m of arr) {
      for (const p of m.content || m.parts || []) {
        if (p && p.type === 'tool' && !toolShape) {
          toolShape = JSON.stringify(p).slice(0, 1500);
        }
      }
    }
    const texts = [];
    for (const m of arr) {
      for (const p of m.content || m.parts || []) {
        if (p && typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning') texts.push(p.text.trim());
      }
    }
    if (toolShape && texts.length >= 2) break;
  }
  console.log('[PROBE] tool-shape: ' + (toolShape || '(sin tool-call observado)'));

  await api(`/api/session/${sid}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${info.pid}`);
  await sleep(1500);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('[PROBE] TODO OK');
  process.exit(0);
})().catch((e) => {
  console.error('[PROBE] FALLO:', e.message);
  try {
    const out = execSync('netstat -ano').toString().split('\n').find((l) => l.includes('127.0.0.1:28990') && l.includes('LISTENING'));
    const pid = out && out.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) { execSync(`taskkill /F /PID ${pid}`); }
  } catch {}
  process.exit(1);
});
