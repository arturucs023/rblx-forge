// Feedback de revisión → reintento (puro y testeado).
// El revisor devuelve {verdict, notes, issues, missing}; esto lo convierte en
// el bloque que el ejecutor DEBE corregir, y localiza el último rechazo.
export interface ReviewVerdict {
  verdict?: string;
  notes?: string[];
  issues?: string[];
  missing?: string[];
}

const clean = (xs: unknown): string[] =>
  (Array.isArray(xs) ? xs : []).filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());

export function formatReviewFeedback(taskName: string, v: ReviewVerdict): string {
  const notes = clean(v.notes);
  const issues = clean(v.issues);
  const missing = clean(v.missing);
  const lines = [`FEEDBACK DE LA REVISIÓN ANTERIOR — "${taskName}" fue RECHAZADO. Corrige OBLIGATORIAMENTE lo siguiente antes de dar por hecha la tarea:`];
  if (issues.length) lines.push(`Fallos detectados:\n${issues.map((x) => `- ${x}`).join('\n')}`);
  if (notes.length) lines.push(`Notas del revisor:\n${notes.map((x) => `- ${x}`).join('\n')}`);
  if (missing.length) lines.push(`No verificado (compruébalo tú, no lo inventes):\n${missing.map((x) => `- ${x}`).join('\n')}`);
  if (!issues.length && !notes.length && !missing.length) {
    lines.push('(El revisor rechazó sin detallar: revisa los criterios de aceptación uno por uno.)');
  }
  return lines.join('\n\n').slice(0, 4000);
}

export interface ReviewMsg {
  kind: string;
  task_id?: string | null;
  content: string;
}

/** Último REJECT de una tarea (su contenido ya lleva el feedback formateado). */
export function findLastRejection(messages: ReviewMsg[], taskId: string): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind === 'REVIEW_REJECTED' && (m.task_id ?? null) === taskId && m.content.trim()) {
      return m.content;
    }
  }
  return null;
}
