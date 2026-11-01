// Sonda barata de cuota: ¿responde algún modelo gratuito a algo mínimo?
const { spawn, execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const PORT = 28986;
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
    return j && typeof j === 'object' && 'data' in j ? j.data : j;
  };
  const info = await api('/api/info');
  const srvPid = info.pid;
  let winner = null;
  for (const m of [{ id: 'glm-5.3-flash-free', providerID: 'opencode' }, { id: 'deepseek-v4.1-flash-free', providerID: 'opencode' }, { id: 'mimo-v2.6-flash-free', providerID: 'opencode' }]) {
    try {
      const s = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'quota-probe', model: m }) });
      await api(`/api/session/${s.id}/prompt`, { method: 'POST', body: JSON.stringify({ text: 'Reply with exactly: OK' }) });
      const t0 = Date.now();
      while (Date.now() - t0 < 45000) {
        await sleep(3000);
        const msgs = await api(`/api/session/${s.id}/message?limit=10&order=asc`);
        const n = (Array.isArray(msgs) ? msgs : []).flatMap((mm) => mm.content || mm.parts || []).filter((p) => p && typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning');
        if (n.length) { winner = m.id; break; }
      }
      await api(`/api/session/${s.id}`, { method: 'DELETE' }).catch(() => {});
      if (winner) break;
      console.log('sin respuesta:', m.id);
    } catch (e) { console.log('error', m.id, String(e.message).slice(0, 80)); }
  }
  console.log(winner ? 'HAY-CUOTA: ' + winner : 'SIN-CUOTA');
  execSync(`taskkill /F /T /PID ${srvPid}`);
  await sleep(1500);
  process.exit(0);
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
