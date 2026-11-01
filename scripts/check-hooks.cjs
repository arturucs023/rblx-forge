// Detecta returns anticipados a nivel de componente ANTES del último hook
// (React error #310). Respeta ámbitos: ignora returns dentro de callbacks
// (=> / function anidadas); SÍ cuenta `if (...) return` y `if { return }`.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'rblx-forge', 'src');
const HOOK = /\b(useState|useEffect|useRef|useMemo|useCallback|useContext|useReducer|use[A-Z][A-Za-z]*)\s*\(/;

function stripStrings(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/`(?:\\.|[^`\\])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function checkFile(fp) {
  const src = stripStrings(fs.readFileSync(fp, 'utf8'));
  const lines = src.split('\n');
  const out = [];
  let i = 0;
  const declRe = /^(?:export\s+)?(?:function\s+([A-Z][A-Za-z0-9]*)|const\s+([A-Z][A-Za-z0-9]*)\s*=[^;]*?=>)/;
  while (i < lines.length) {
    const dm = lines[i].match(declRe);
    if (!dm) { i++; continue; }
    const name = dm[1] || dm[2];
    // El cuerpo empieza en la primera { a partir de aquí (NO es frontera).
    let j = i;
    let stack = []; // true = frontera de función anidada
    let started = false;
    const hooks = [];
    const returns = [];
    for (; j < lines.length; j++) {
      const line = lines[j];
      if (!started) {
        const bi = line.indexOf('{');
        if (bi === -1) continue;
        started = true;
        stack.push(false);
        // Resto de la línea tras el { inicial: procesar como cuerpo.
        var rest = line.slice(bi + 1);
      } else {
        var rest = line;
      }
      // Recorrer caracteres: cada { anidado es frontera solo si lo abre
      // una flecha o un function (callbacks, efectos, helpers).
      const compLevelNow = () => !stack.includes(true);
      // Registrar hooks/returns del fragmento ANTES de aplicar sus llaves:
      // se evalúa por segmentos para no contaminar con callbacks inline.
      // (Aproximación por línea: basta para el patrón `if return` y hooks.)
      if (compLevelNow()) {
        const hm = rest.match(HOOK);
        if (hm && !/function\s+[a-z]/.test(rest)) hooks.push({ line: j + 1, hook: hm[1] });
        if (/(^|[\s{}(;])return\b/.test(rest)) returns.push(j + 1);
      }
      for (let c = 0; c < rest.length; c++) {
        if (rest[c] !== '{' && rest[c] !== '}') continue;
        if (rest[c] === '{') {
          const before = rest.slice(0, c);
          stack.push(/=>\s*$/.test(before) || /\bfunction\b/.test(before));
        } else {
          stack.pop();
        }
        if (stack.length === 0) break;
      }
      if (stack.length === 0) break;
    }
    if (hooks.length && returns.length) {
      const lastHook = hooks[hooks.length - 1].line;
      const early = [...new Set(returns.filter((r) => r < lastHook))];
      if (early.length) out.push({ name, hooks, early });
    }
    i = j + 1;
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

let found = 0;
for (const fp of walk(DIR)) {
  for (const p of checkFile(fp)) {
    found++;
    console.log(`${path.relative(DIR, fp)}: ${p.name} -> RETURN línea(s) ${p.early.join(',')} ANTES del último hook (línea ${p.hooks[p.hooks.length - 1].line}, ${p.hooks[p.hooks.length - 1].hook})`);
  }
}
console.log(found ? `\nTOTAL: ${found} sospechosos` : '\nLIMPIO');
