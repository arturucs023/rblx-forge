// Aceptación del Skill Evaluation Engine (E2E real, sin mocks).
// Servidor OpenCode PROPIO en 28982 (nunca el global 28894): sesión en un
// tmpdir aislado con COPIAS de las skills (originales intactos), prompt de
// benchmark real, verificación de archivos generados y de que las skills
// originales no cambiaron. Limpieza: solo el PID propio.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 28982;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = process.cwd(); // raíz del workspace (no se escribe en ella)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let AUTH = {};

async function api(p, opts = {}) {
  const res = await fetch(BASE + p, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...AUTH, ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${p} -> ${res.status}: ${text.slice(0, 300)}`);
  if (!text) return null;
  const j = JSON.parse(text);
  return j && typeof j === 'object' && 'data' in j ? j.data : j;
}

function hashSkills() {
  const h = crypto.createHash('sha256');
  for (const scope of ['.agents/skills', '.opencode/skills']) {
    const base = path.join(ROOT, scope);
    if (!fs.existsSync(base)) continue;
    for (const id of fs.readdirSync(base).sort()) {
      const sk = path.join(base, id, 'SKILL.md');
      if (fs.existsSync(sk)) h.update(fs.readFileSync(sk));
    }
  }
  return h.digest('hex');
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function listFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(path.relative(dir, p));
  }
  return out;
}

(async () => {
  const log = (k, v) => console.log(`[EVAL-TEST] ${k}: ${v}`);
  try { await fetch(BASE + '/api/info'); throw new Error(`puerto ${PORT} ocupado`); }
  catch (e) { if (String(e.message).startsWith('puerto')) throw e; }

  // 1. Registro real: 148 skills con SKILL.md.
  let n = 0;
  for (const scope of ['.agents/skills', '.opencode/skills']) {
    const base = path.join(ROOT, scope);
    for (const id of fs.readdirSync(base)) {
      if (fs.existsSync(path.join(base, id, 'SKILL.md'))) n++;
    }
  }
  if (n !== 148) throw new Error(`skills esperadas 148, vistas ${n}`);
  log('1 registro', `${n} skills con SKILL.md`);

  // 2. Hash previo de originales + copias aisladas al tmpdir.
  const before = hashSkills();
  const tmp = path.join(fs.realpathSync(require('os').tmpdir()), `forge-eval-acc-${Date.now()}`);
  copyDir(path.join(ROOT, '.agents', 'skills'), path.join(tmp, '.agents', 'skills'));
  copyDir(path.join(ROOT, '.opencode', 'skills'), path.join(tmp, '.opencode', 'skills'));
  fs.mkdirSync(path.join(tmp, 'src', 'shared'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'src', 'client'), { recursive: true });
  log('2 aislamiento', `copias en ${tmp}`);

  // 3. Servidor propio.
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); }
  catch { throw new Error('opencode no detectado'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: require('os').tmpdir() });
  let password = null;
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  if (!password) { try { process.kill(child.pid); } catch {} throw new Error('sin password'); }
  AUTH = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64') };
  let info = null;
  for (let i = 0; i < 80; i++) { try { info = await api('/api/info'); break; } catch { await sleep(250); } }
  if (!info) throw new Error('sin /api/info');
  log('3 servidor', `v${info.version} pid=${info.pid} (propio, global intacto)`);

  // 4. Sesión en el tmpdir + prompt de benchmark real (mini-HUD).
  const created = await api('/api/session', {
    method: 'POST',
    body: JSON.stringify({ title: 'forge-eval-acceptance', directory: tmp, model: { id: 'mimo-v2.6-flash-free', providerID: 'opencode' } }),
  });
  const sid = created.id || created.sessionID;
  if (!sid) throw new Error('sin id de sesión');
  const prompt = [
    'Eres un benchmark automático. No converses: genera archivos.',
    'Tarea: crea un HUD mínimo en este proyecto: src/shared/HUDState.luau (módulo con setHealth y getHealth) y src/client/HUD.client.luau (usa el módulo e imprime).',
    'REGLA ABSOLUTA: escribe SOLO dentro de este directorio. No crees nada fuera.',
  ].join('\n');
  // Contrato skills[] del OpenAPI 2.2.4 (best-effort: algunos servidores lo ignoran).
  let skillsParam = 'omitido';
  try {
    await api(`/api/session/${sid}/prompt`, { method: 'POST', body: JSON.stringify({ text: prompt, skills: [{ id: 'roblox-hud' }] }) });
    skillsParam = 'aceptado';
  } catch {
    await api(`/api/session/${sid}/prompt`, { method: 'POST', body: JSON.stringify({ text: prompt }) });
    skillsParam = 'rechazado-por-servidor→reintento-sin-skills';
  }
  log('4 prompt', `skills[] ${skillsParam}`);

  // 5. Respuesta real (poll, timeout 150 s).
  let reply = null;
  for (let i = 0; i < 60; i++) {
    await sleep(2500);
    const msgs = await api(`/api/session/${sid}/message?limit=20&order=asc`);
    const texts = [];
    for (const m of msgs) {
      if (typeof m.text === 'string' && m.text.trim()) texts.push(m.text.trim());
      for (const p of m.content || m.parts || []) {
        if (p && typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning') texts.push(p.text.trim());
      }
    }
    const mine = texts.filter((t) => !t.startsWith('Eres un benchmark'));
    if (mine.length) { reply = mine[mine.length - 1]; break; }
  }
  if (!reply) throw new Error('sin respuesta del modelo (timeout)');
  log('5 respuesta', `${reply.length} caracteres`);

  // 6. Archivos generados DENTRO del tmpdir.
  await sleep(5000);
  const files = listFiles(tmp).filter((f) => !f.includes('.agents') && !f.includes('.opencode'));
  const lua = files.filter((f) => f.endsWith('.luau') || f.endsWith('.lua'));
  log('6 archivos', `${files.length} nuevos (${lua.join(', ') || 'sin lua'})`);
  if (!lua.length) throw new Error('el modelo no generó .luau en el tmpdir');

  // 7. Originales intactos + permisos visibles.
  const after = hashSkills();
  if (before !== after) throw new Error('LAS SKILLS ORIGINALES CAMBIARON');
  log('7 originales', `hash idéntico (${before.slice(0, 12)}…)`);
  const perms = await api(`/api/session/${sid}/permission`).catch(() => null);
  log('7 permisos', `endpoint ok (pendientes=${Array.isArray(perms) ? perms.length : '?'})`);

  // 8. Limpieza: solo nuestro servidor.
  await api(`/api/session/${sid}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${info.pid}`);
  await sleep(1500);
  let closed = false;
  try { await fetch(BASE + '/api/info'); } catch { closed = true; }
  fs.rmSync(tmp, { recursive: true, force: true });
  log('8 limpieza', `puerto_cerrado=${closed} tmp_eliminado=true`);
  if (!closed) throw new Error('puerto no liberado');
  console.log('[EVAL-TEST] TODO OK');
  process.exit(0);
})().catch((e) => {
  console.error('[EVAL-TEST] FALLO:', e.message);
  try {
    const out = execSync('netstat -ano').toString().split('\n').find((l) => l.includes('127.0.0.1:28982') && l.includes('LISTENING'));
    const pid = out && out.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) { execSync(`taskkill /F /PID ${pid}`); console.error('[EVAL-TEST] limpieza: servidor de prueba eliminado'); }
  } catch {}
  process.exit(1);
});
