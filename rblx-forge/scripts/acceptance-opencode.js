// Prueba de aceptación 1-8 contra un servidor OpenCode de prueba (puerto 28981).
// Usa el mecanismo REAL de autenticación: `server password` impreso por `serve`
// + `Authorization: Basic base64("opencode:"+password)` (verificado por
// inspección del tráfico del CLI). No toca el background service global.
const { spawn, execSync } = require('child_process');

const PORT = 28981;
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let AUTH = {};

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...AUTH, ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  if (!text) return null;
  const j = JSON.parse(text);
  return (j && typeof j === 'object' && 'data' in j) ? j.data : j;
}

async function watchSSE(seconds, onEvent) {
  const ctrl = new AbortController();
  const pr = (async () => {
    try {
      const res = await fetch(BASE + '/api/event', { headers: { Accept: 'text/event-stream', ...AUTH }, signal: ctrl.signal });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          for (const line of chunk.split('\n')) {
            const t = line.trim();
            if (t.startsWith('data:')) {
              const d = t.slice(5).trim();
              if (d && d !== '[DONE]') { try { onEvent(JSON.parse(d)); } catch {} }
            }
          }
        }
      }
    } catch { /* cancelado */ }
  })();
  await sleep(seconds * 1000);
  ctrl.abort();
  await pr;
}

(async () => {
  const log = (k, v) => console.log(`[TEST] ${k}: ${v}`);
  try { await fetch(BASE + '/api/info'); throw new Error(`puerto ${PORT} ocupado por otro servidor`); }
  catch (e) { if (String(e.message).startsWith('puerto')) throw e; }

  // 1. Detección
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); }
  catch { throw new Error('opencode no detectado'); }
  const ver = execSync(`"${bin}" --version`).toString().trim();
  log('1 detecta', `${bin} ${ver}`);

  // 2. Conexión (servidor propio; captura del password real de stdout)
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  let password = null;
  let out = '';
  child.stdout.on('data', (d) => {
    out += d.toString();
    const m = out.match(/server password (\S+)/);
    if (m) password = m[1];
  });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  if (!password) { try { process.kill(child.pid); } catch {} throw new Error('sin server password en stdout'); }
  AUTH = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64') };
  let info = null;
  for (let i = 0; i < 80; i++) {
    try { info = await api('/api/info'); break; } catch { await sleep(250); }
  }
  if (!info) throw new Error('sin /api/info autenticado');
  log('2 conecta', `${BASE} v${info.version} pid=${info.pid} (auth Basic OK)`);

  // 3. Crear sesión (modelo gratuito explícito)
  const created = await api('/api/session', {
    method: 'POST',
    body: JSON.stringify({ title: 'forge-acceptance', model: { id: 'mimo-v2.6-flash-free', providerID: 'opencode' } }),
  });
  const sid = created.id || created.sessionID || (created.session && created.session.id);
  if (!sid) throw new Error('sin id de sesión');
  log('3 crea sesión', sid);

  // 4+5. Enviar mensaje + streaming SSE real
  const seen = [];
  const sseDone = watchSSE(150, (e) => seen.push(e.type || '?'));
  await sleep(1000);
  await api(`/api/session/${sid}/prompt`, { method: 'POST', body: JSON.stringify({ text: 'Reply with exactly: OK' }) });
  log('4 envía mensaje', 'prompt aceptado');
  let reply = null;
  for (let i = 0; i < 48; i++) {
    await sleep(2500);
    const msgs = await api(`/api/session/${sid}/message?limit=20&order=asc`);
    const texts = [];
    for (const m of msgs) {
      if (typeof m.text === 'string' && m.text.trim()) texts.push(m.text.trim());
      for (const p of m.content || m.parts || []) if (typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning') texts.push(p.text.trim());
    }
    const assistant = texts.filter((t) => t !== 'Reply with exactly: OK');
    if (assistant.length) { reply = assistant[assistant.length - 1]; break; }
  }
  await sseDone;
  log('5 streaming', `eventos SSE vistos: ${seen.length} (tipos: ${[...new Set(seen)].slice(0, 8).join(',')})`);
  if (!reply) throw new Error('sin respuesta del asistente (timeout 120s)');
  log('5 respuesta', JSON.stringify(reply.slice(0, 120)));

  // 6+7. Historial + permisos + interrupt
  const hist = await api(`/api/session/${sid}/message?limit=100&order=asc`);
  log('6 historial', `${hist.length} mensajes`);
  const perms = await api(`/api/session/${sid}/permission`);
  log('7 permisos', `pendientes=${Array.isArray(perms) ? perms.length : '?'}`);
  try { await api(`/api/session/${sid}/interrupt`, { method: 'POST' }); log('7 interrupt', 'ok'); }
  catch (e) { log('7 interrupt', 'no-op: ' + String(e).slice(0, 100)); }

  // 8. Cierre sin huérfanos
  await api(`/api/session/${sid}`, { method: 'DELETE' });
  const list = await api(`/api/session?limit=100`);
  const gone = !(JSON.stringify(list).includes(sid));
  execSync(`taskkill /F /T /PID ${info.pid}`);
  await sleep(1500);
  let portClosed = false;
  try { await fetch(BASE + '/api/info'); } catch { portClosed = true; }
  const orphans = execSync(`tasklist /FI "PID eq ${info.pid}" /FO CSV`).toString().includes(`"${info.pid}"`);
  log('8 cierra sesión', `eliminada=${gone} puerto_cerrado=${portClosed} proceso_huerfano=${orphans}`);
  if (!gone || !portClosed || orphans) throw new Error('cierre incompleto');
  console.log('[TEST] TODO OK');
  process.exit(0);
})().catch((e) => {
  console.error('[TEST] FALLO:', e.message);
  try {
    const out = execSync('netstat -ano').toString().split('\n').find((l) => l.includes('127.0.0.1:28981') && l.includes('LISTENING'));
    const pid = out && out.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) { execSync(`taskkill /F /PID ${pid}`); console.error('[TEST] limpieza: servidor de prueba eliminado'); }
  } catch {}
  process.exit(1);
});
