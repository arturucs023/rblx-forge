const s = require('../docs-openapi-2.2.4.json');
console.log('AgentAttachment:', JSON.stringify(s.components.schemas['Prompt.AgentAttachment'] || s.components.schemas['PromptInput.AgentAttachment'] || 'N/A').slice(0, 600));
const { spawn, execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const PORT = 28995;
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
    const data = j && typeof j === 'object' && 'data' in j ? j.data : j;
    return { status: r.status, body: data };
  };
  const a = await api('/api/agent');
  console.log('AGENTS-STATUS:', a.status);
  const list = Array.isArray(a.body) ? a.body : (a.body && a.body.data) || [];
  console.log('AGENTS-COUNT:', list.length);
  for (const ag of list.slice(0, 12)) {
    console.log(`- ${ag.id} | mode=${ag.mode} | model=${ag.model ? ag.model.providerID + '/' + ag.model.id : '?'} | hidden=${ag.hidden} | steps=${ag.steps}`);
  }
  execSync(`taskkill /F /T /PID ${child.pid}`);
  console.log('KILLED-OWN-SERVER');
})().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
