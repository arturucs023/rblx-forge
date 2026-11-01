// Scoring del Evaluation Engine (puro, determinista, testeado).
// Pesos de la especificación: técnica 25, resultado 25, especialización 15,
// completitud 15, aplicabilidad 10, consistencia 10.
// REGLA DURA: sin puntuación si faltan criterios; los NOT_EVALUATED no son 0.

export type DimId = 'tecnica' | 'resultado' | 'especializacion' | 'completitud' | 'aplicabilidad' | 'consistencia';

export const DIM_WEIGHTS: Record<DimId, number> = {
  tecnica: 0.25,
  resultado: 0.25,
  especializacion: 0.15,
  completitud: 0.15,
  aplicabilidad: 0.10,
  consistencia: 0.10,
};

export interface DimInput {
  /** 0–100 o null si no evaluado. */
  score: number | null;
  /** Evidencia textual (obligatoria si hay score). */
  evidence?: string;
}

export interface ScoreResult {
  /** null = no hay puntuación disponible (cobertura insuficiente). */
  score: number | null;
  coverage: number; // 0–1, peso evaluado / peso total
  evaluated: DimId[];
  missing: DimId[];
  verdict: 'NOT_EVALUATED' | 'PASSED' | 'PASSED_WITH_WARNINGS' | 'NEEDS_IMPROVEMENT' | 'FAILED' | 'BLOCKED';
  blockedByCritical: boolean;
}

export function computeScore(
  dims: Record<DimId, DimInput>,
  opts: { criticalCount: number; autoOk: boolean | null },
): ScoreResult {
  let num = 0;
  let den = 0;
  const evaluated: DimId[] = [];
  const missing: DimId[] = [];
  for (const [k, w] of Object.entries(DIM_WEIGHTS) as Array<[DimId, number]>) {
    const d = dims[k];
    if (d && typeof d.score === 'number' && Number.isFinite(d.score)) {
      num += Math.min(100, Math.max(0, d.score)) * w;
      den += w;
      evaluated.push(k);
    } else {
      missing.push(k);
    }
  }
  const coverage = den; // los pesos ya suman 1
  if (opts.criticalCount > 0) {
    return { score: null, coverage, evaluated, missing, verdict: 'BLOCKED', blockedByCritical: true };
  }
  if (den === 0) {
    return { score: null, coverage: 0, evaluated, missing, verdict: 'NOT_EVALUATED', blockedByCritical: false };
  }
  const score = Math.round((num / den) * 10) / 10;
  // Veredicto: FAILED si lo automático falló; warnings si cobertura parcial.
  let verdict: ScoreResult['verdict'];
  if (opts.autoOk === false) verdict = 'FAILED';
  else if (coverage < 1) verdict = 'NEEDS_IMPROVEMENT';
  else if (score >= 85) verdict = 'PASSED';
  else if (score >= 60) verdict = 'PASSED_WITH_WARNINGS';
  else verdict = 'NEEDS_IMPROVEMENT';
  return { score, coverage, evaluated, missing, verdict, blockedByCritical: false };
}

/** Resultado de un AutoCheck ejecutado sobre archivos del tmpdir. */
export interface AutoCheckOutcome {
  kind: string;
  param: string;
  weight: number;
  passed: boolean | null; // null = no evaluable (no se inventa)
  detail: string;
}

export function autoVerdict(outcomes: AutoCheckOutcome[]): boolean | null {
  const evald = outcomes.filter((o) => o.passed !== null);
  if (evald.length === 0) return null;
  return evald.every((o) => o.passed === true);
}
