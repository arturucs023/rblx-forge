// Diff línea a línea (LCS). Herramienta honesta de comparación textual:
// no es análisis semántico Luau. Tope anti-cuelgue en archivos grandes.

export interface DiffLine {
  type: ' ' | '-' | '+';
  text: string;
}

export const DIFF_LINE_LIMIT = 3000;

export function diffLines(a: string, b: string): DiffLine[] | null {
  const A = a.split('\n');
  const B = b.split('\n');
  if (A.length > DIFF_LINE_LIMIT || B.length > DIFF_LINE_LIMIT) return null;
  const n = A.length;
  const m = B.length;
  // LCS DP con solo dos filas + backtrack vía tabla de decisiones compacta.
  const prev = new Uint16Array(m + 1);
  const curr = new Uint16Array(m + 1);
  const take: Uint8Array[] = [];
  for (let i = 1; i <= n; i++) {
    const row = new Uint8Array(m + 1);
    for (let j = 1; j <= m; j++) {
      if (A[i - 1] === B[j - 1]) {
        curr[j] = prev[j - 1] + 1;
        row[j] = 1; // diagonal
      } else if (prev[j] >= curr[j - 1]) {
        curr[j] = prev[j];
        row[j] = 2; // arriba
      } else {
        curr[j] = curr[j - 1];
        row[j] = 3; // izquierda
      }
    }
    take.push(row);
    prev.set(curr);
  }
  const out: DiffLine[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && take[i - 1][j] === 1) {
      out.push({ type: ' ', text: A[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || take[i - 1][j] === 3)) {
      out.push({ type: '+', text: B[j - 1] });
      j--;
    } else {
      out.push({ type: '-', text: A[i - 1] });
      i--;
    }
  }
  return out.reverse();
}

export function diffStats(lines: DiffLine[]): { add: number; del: number; same: number } {
  let add = 0;
  let del = 0;
  let same = 0;
  for (const l of lines) {
    if (l.type === '+') add++;
    else if (l.type === '-') del++;
    else same++;
  }
  return { add, del, same };
}
