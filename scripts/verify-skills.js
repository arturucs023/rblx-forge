// Verificación de la biblioteca de skills (Fase 8).
// Uso: node verify-skills.js  (cwd = raíz del repo)
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const DIRS = [
  { scope: 'instalada', base: path.join(ROOT, '.agents', 'skills') },
  { scope: 'propia', base: path.join(ROOT, '.opencode', 'skills') },
];
const REQUIRED_HEADERS = ['## Objective', '## Scope', '## Use cases', '## Step-by-step', '## Best pr', '## Common', '## Quality', '## Limitations'];
let failures = 0;
const ids = new Set();
const rows = [];
for (const { scope, base } of DIRS) {
  if (!fs.existsSync(base)) { console.log(`FALTA DIRECTORIO ${base}`); failures++; continue; }
  for (const id of fs.readdirSync(base)) {
    const sk = path.join(base, id, 'SKILL.md');
    if (ids.has(id)) { console.log(`ID DUPLICADO: ${id}`); failures++; }
    ids.add(id);
    if (!fs.statSync(path.join(base, id)).isDirectory()) continue;
    if (!fs.existsSync(sk)) { console.log(`SIN SKILL.md [${scope}]: ${id}`); failures++; continue; }
    const raw = fs.readFileSync(sk, 'utf8');
    const lines = raw.split('\n').length;
    const fm = raw.match(/^---\n([\s\S]*?)\n---/);
    const bins = ['.exe', '.dll', '.zip', '.rbxm', '.rbxmx'].filter((e) => fs.readdirSync(path.join(base, id), { recursive: true }).some((f) => String(f).endsWith(e)));
    const status = [];
    if (scope === 'propia') {
      const hasName = fm && /^name:\s*.+/m.test(fm[1]);
      const hasDesc = fm && /^description:\s*.+/m.test(fm[1]);
      const descLen = hasDesc ? (fm[1].match(/^description:\s*(.*)/m) || [])[1].length : 0;
      const missing = REQUIRED_HEADERS.filter((h) => !raw.includes(h));
      if (!hasName) status.push('sin-name');
      if (!hasDesc) status.push('sin-description');
      if (descLen < 40) status.push('desc-corta');
      if (lines < 60) status.push(`fina(${lines}l)`);
      if (missing.length) status.push('faltan:' + missing.map((m) => m.replace('## ', '')).join(','));
    } else {
      // Instaladas de terceros (formato skills.sh, a menudo sin frontmatter):
      // título + descripción + estructura mínima con secciones.
      const head = raw.split('\n').slice(0, 30).join('\n');
      const hasTitle = /^#\s+.+/m.test(head);
      const hasDesc = /description\s*:/i.test(head) || /^>\s*.+/m.test(head);
      const sections = (raw.match(/^##\s+.+/gm) || []).length;
      if (!hasTitle) status.push('sin-titulo');
      if (!hasDesc) status.push('sin-description');
      if (sections < 3) status.push(`pocas-secciones(${sections})`);
      if (lines < 45) status.push(`fina(${lines}l)`);
    }
    if (bins.length) status.push('BINARIOS:' + bins.join(','));
    rows.push({ id, scope, lines, status: status.join(';') || 'OK' });
    if (status.length) failures++;
  }
}
const byScope = {};
for (const r of rows) byScope[r.scope] = (byScope[r.scope] || 0) + 1;
console.log(`\nTotal: ${rows.length} (instaladas: ${byScope.instalada || 0}, propias: ${byScope.propia || 0})`);
const bad = rows.filter((r) => r.status !== 'OK');
console.log(`Con problemas: ${bad.length}`);
for (const r of bad.slice(0, 60)) console.log(` - [${r.scope}] ${r.id} (${r.lines}l): ${r.status}`);
console.log(failures === 0 ? 'VERIFICACIÓN OK' : `FALLOS: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
