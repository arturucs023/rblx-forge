// Sonda: qué devuelve /api/model de verdad (campo variants).
const { spawn, execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const PORT = 28993;
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); } catch { throw new Error('no opencode'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: require('os').tmpdir() });
  let password = null, out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  const AUTH = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64') };
  let models = null;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/model`, { headers: AUTH });
      const j = await r.json();
      models = j.data ?? j;
      break;
    } catch { await sleep(250); }
  }
  console.log('MODELS:', Array.isArray(models) ? models.length : typeof models);
  let withVar = 0;
  for (const m of (Array.isArray(models) ? models.slice(0, 400) : [])) {
    if (Array.isArray(m.variants) && m.variants.length) {
      withVar++;
      if (withVar <= 6) console.log(`- ${m.providerID}/${m.modelID || m.id} variants=[${m.variants.map((v) => v.id).join(',')}]`);
    }
  }
  console.log('WITH-VARIANTS:', withVar);
  const d = await (await fetch(`http://127.0.0.1:${PORT}/api/model/default`, { headers: AUTH })).json();
  console.log('DEFAULT:', JSON.stringify(d.data ?? d).slice(0, 200));
  execSync(`taskkill /F /T /PID ${child.pid}`);
  console.log('KILLED-OWN-SERVER');
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
