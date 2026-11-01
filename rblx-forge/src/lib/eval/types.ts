// Tipos compartidos del Skill Evaluation Engine.
// Contratos con el backend (src-tauri/src/eval.rs). Pesos de scoring
// idénticos en ambos lados; el cálculo vive en scoring.ts.

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type RunStatus = 'en-cola' | 'activa' | 'completada' | 'fallida' | 'cancelada' | 'cumplido-timeout';
export type Verdict = 'NOT_EVALUATED' | 'PASSED' | 'PASSED_WITH_WARNINGS' | 'NEEDS_IMPROVEMENT' | 'FAILED' | 'BLOCKED';

export interface EvalSkill {
  id: string;
  name: string;
  description: string;
  path: string;
  grp: string;
  origin: string;
  status: string;
  detected_at: number;
  modified_at: number;
  hash: string;
  analysis?: string | null;
  last_score?: number | null;
  last_verdict?: string | null;
  runs_count: number;
}

export interface Finding {
  code: string;
  severity: Severity;
  file: string;
  line?: number | null;
  message: string;
  why: string;
  fix: string;
  auto_fixable: boolean;
}

export interface Criterion {
  id: string;
  label: string;
  weight: number;
  kind: 'auto' | 'semantic';
}

export interface AutoCheck {
  kind: 'files_exist' | 'min_files' | 'min_lines' | 'lua_parseable';
  param: string;
  weight: number;
}

export interface Benchmark {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  objective: string;
  context: string;
  prompt: string;
  expected_skills: string[];
  constraints: string[];
  acceptance: string[];
  criteria: Criterion[];
  auto_checks: AutoCheck[];
}

export interface RunSummary {
  id: string;
  benchmark_id: string;
  skill_ids: string[];
  status: RunStatus;
  created_at: number;
  finished_at?: number | null;
  duration_ms?: number | null;
  score?: number | null;
  coverage?: number | null;
  verdict?: Verdict | null;
  error?: string | null;
}

export interface RunDetail extends RunSummary {
  opencode_version?: string | null;
  model?: string | null;
  config?: string | null;
  tmp_dir?: string | null;
  session_id?: string | null;
  prompt_excerpt?: string | null;
  transcript?: string | null;
  auto_results?: string | null;
  semantic?: string | null;
}

export interface SkillDetail {
  skill: EvalSkill;
  findings: Finding[];
  runs: RunSummary[];
  snapshots: Array<{ hash: string; created_at: number; findings?: number; critical?: number }>;
  referenced_by: string[];
}

export interface ConceptHit {
  id: string;
  label: string;
  level: 'mencionado' | 'explicado' | 'aplicado';
  evidence: string[];
  doc: string;
  verification: string;
}

export interface Dashboard {
  total_skills: number;
  analyzed_skills: number;
  pending_skills: number;
  benchmarks: number;
  runs: number;
  runs_completed: number;
  critical: number;
  avg_score: number | null;
  scored_runs: number;
  by_group: Record<string, number>;
  by_verdict: Record<string, number>;
  recent: RunSummary[];
}

export const GROUP_LABELS: Record<string, string> = {
  'ui-ux': 'UI/UX',
  'art-direction': 'Art direction',
  'environment-art': 'Environment art',
  'building-modeling': 'Building and modeling',
  'characters-animation': 'Characters and animation',
  'gameplay-systems': 'Gameplay systems',
  'game-genres': 'Game genres',
  audio: 'Audio',
  'multiplayer-networking': 'Multiplayer and networking',
  economy: 'Economy',
  'programming-architecture': 'Programming and architecture',
  tooling: 'Tooling',
  'testing-qa': 'Testing and QA',
  security: 'Security',
  performance: 'Performance',
};

/** Etiquetas servidas por el backend (fuente única); fallback local si falla. */
export type GroupPair = [string, string];
export function groupLabel(groups: GroupPair[] | null | undefined, id: string): string {
  const hit = groups?.find((g) => g[0] === id);
  if (hit) return hit[1];
  return GROUP_LABELS[id] ?? id;
}

export const VERDICT_LABELS: Record<string, string> = {
  NOT_EVALUATED: 'Sin evaluar',
  PASSED: 'Aprobada',
  PASSED_WITH_WARNINGS: 'Aprobada con avisos',
  NEEDS_IMPROVEMENT: 'Necesita mejora',
  FAILED: 'Fallida',
  BLOCKED: 'Bloqueada',
};
