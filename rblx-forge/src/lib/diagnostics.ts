// Parseo de diagnósticos reales de Selene y StyLua.
// Fixtures de los tests: salida capturada de selene 0.32.0 y stylua 2.6.0
// sobre fixture.lua (`local x=1`, unused var, `print( x )`).

export interface Diagnostic {
  severity: 'error' | 'warning';
  code?: string;
  message: string;
  file: string;
  line: number;
  col: number;
}

/** Selene: `warning[unused_variable]: msg` + `┌─ path:linea:col`. */
export function parseSelene(output: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const lines = output.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(error|warning)\[([^\]]+)\]:\s*(.+)$/);
    if (!m) continue;
    let file = '';
    let line = 1;
    let col = 1;
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const loc = lines[j].match(/┌─\s*(.+):(\d+):(\d+)\s*$/);
      if (loc) {
        file = loc[1].trim();
        line = parseInt(loc[2], 10);
        col = parseInt(loc[3], 10);
        break;
      }
    }
    out.push({ severity: m[1] as 'error' | 'warning', code: m[2], message: m[3], file, line, col });
  }
  return out;
}

export interface StyluaFile {
  file: string;
  diff: string;
}

/** StyLua --check: bloques `Diff in <path>:` con el diff debajo. */
export function parseStyluaCheck(output: string): StyluaFile[] {
  const out: StyluaFile[] = [];
  const lines = output.split('\n');
  let cur: StyluaFile | null = null;
  for (const line of lines) {
    const m = line.match(/^Diff in (.+):$/);
    if (m) {
      cur = { file: m[1].trim(), diff: '' };
      out.push(cur);
    } else if (cur) {
      cur.diff += line + '\n';
    }
  }
  return out.filter((f) => f.diff.trim().length > 0);
}
