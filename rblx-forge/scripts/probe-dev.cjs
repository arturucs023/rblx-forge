// Diagnóstico: ¿qué hace el dev con el prompt real? (transcript + permisos + archivos)
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const PORT = 28988;
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); } catch { throw new Error('no opencode'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: os.tmpdir() });
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
    return j && typeof j === 'object' && 'data' in j ? j.data : j;
  };
  const info = await api('/api/info');
  const tmp = path.join(fs.realpathSync(os.tmpdir()), `forge-devprobe-${Date.now()}`);
  for (const d of ['src/server', 'src/client', 'src/shared']) fs.mkdirSync(path.join(tmp, d), { recursive: true });
  const s = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'devprobe', directory: tmp, model: { id: 'iceman-contributor-free', providerID: 'opencode-go' } }) });
  const prompt = 'Eres Luau Developer. No converses: implementa.\nTAREA: Crea src/shared/GameConfig.luau (valores por defecto + función validate) y src/server/ConfigCheck.server.luau que lo use con pcall.\nREGLA ABSOLUTA: escribe SOLO dentro de este directorio.';
  await api(`/api/session/${s.id}/prompt`, { method: 'POST', body: JSON.stringify({ text: prompt }) });
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    if (i % 4 === 0) {
      const perms = await api(`/api/session/${s.id}/permission`).catch(() => null);
      if (perms && perms.length) console.log('PERMISOS:', JSON.stringify(perms).slice(0, 400));
    }
    const msgs = await api(`/api/session/${s.id}/message?limit=20&order=asc`);
    const arr = Array.isArray(msgs) ? msgs : [];
    const last = arr[arr.length - 1];
    if (last) {
      const parts = [];
      if (typeof last.text === 'string') parts.push(last.text.slice(0, 120));
      for (const p of last.content || last.parts || []) parts.push(`[${p.type}] ${(p.text || JSON.stringify(p).slice(0, 80))}`.slice(0, 140));
      console.log(`[${i}] role=${last.role} type=${last.type}:`, parts.join(' || ').slice(0, 300));
    }
  }
  const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, o) : o.push(path.relative(tmp, p)); } return o; };
  console.log('FILES:', walk(tmp).join(', ') || '(ninguno)');
  await api(`/api/session/${s.id}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${info.pid}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('KILLED');
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
