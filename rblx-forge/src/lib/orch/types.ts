// Tipos del Multi-Agent Orchestrator (contratos con src-tauri/src/orch.rs).
// Estados y tipos cerrados: nada se inventa, todo se valida en backend.

export type TaskState = 'PENDING' | 'READY' | 'RUNNING' | 'WAITING_APPROVAL' | 'BLOCKED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type RunStatus = 'borrador' | 'pendiente_aprobacion' | 'en_ejecucion' | 'pausado' | 'completada' | 'fallida' | 'cancelada';

export interface AgentProfile {
  id: string;
  name: string;
  specialty: string;
  description: string;
  responsibilities: string[];
  limits: string[];
  skills: string[];
  model: { id: string; providerID: string; variant?: string } | null;
  native_agent: string | null;
  tools: string[];
  permissions: string[];
  acceptance: string[];
  is_builtin: boolean;
  active: boolean;
}

export interface OrchTask {
  id: string;
  run_id: string;
  name: string;
  description: string;
  objective: string;
  agent_id: string;
  skills: string[];
  model: { id: string; providerID: string; variant?: string } | null;
  priority: number;
  state: TaskState;
  acceptance: string[];
  result?: string | null;
  error?: string | null;
  attempts: number;
  created_at: number;
  finished_at?: number | null;
  session_id?: string | null;
  files: string[];
  depends_on: string[];
}

export interface OrchRun {
  id: string;
  goal: string;
  project_dir: string;
  status: RunStatus;
  created_at: number;
  finished_at?: number | null;
}

export interface RunDetail extends OrchRun {
  config: {
    default_model?: { id: string; providerID: string; variant?: string } | null;
    max_parallel?: number;
    task_timeout_ms?: number;
    global_timeout_ms?: number;
    max_retries?: number;
    scope?: 'project' | 'tmp';
  };
  report?: string | null;
  tmp_dir?: string | null;
}

export interface ApplyResult {
  copied: string[];
  skipped_identical: string[];
  skipped_seed: string[];
  conflicts: string[];
  target: string;
}

export interface TaskInput {
  name: string;
  description: string;
  objective: string;
  agent_id: string;
  skills: string[];
  model: { id: string; providerID: string; variant?: string } | null;
  priority: number;
  acceptance: string[];
  files: string[];
  depends_on: string[];
}

export interface SkillSuggestion {
  id: string;
  name: string;
  grp: string;
  verdict?: string | null;
  score: number;
  reasons: string[];
}

export interface PlanIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface OrchExecution {
  id: string;
  task_id: string;
  agent_id: string;
  session_id?: string | null;
  model?: string | null;
  skills: string[];
  status: string;
  started_at: number;
  finished_at?: number | null;
  tokens?: string | null;
  cost?: number | null;
  attempt: number;
}

export interface AgentMessage {
  id: number;
  task_id?: string | null;
  kind: string;
  from: string;
  to: string;
  content: string;
  files: string[];
  state: string;
  created_at: number;
}

export interface Approval {
  id: string;
  task_id?: string | null;
  kind: string;
  summary: string;
  payload?: string | null;
  status: string;
  decided_by?: string | null;
  decided_at?: number | null;
  created_at: number;
}

export interface Artifact {
  task_id?: string | null;
  execution_id?: string | null;
  rel: string;
  size: number;
  hash: string;
  created_at: number;
}

export interface AuditEntry {
  actor: string;
  action: string;
  tool?: string | null;
  files: string[];
  permission?: string | null;
  result: string;
  created_at: number;
}

export interface OrchDashboard {
  profiles: number;
  runs: number;
  pending_approvals: number;
  blocked_tasks: number;
  running_tasks: number;
  by_state: Record<string, number>;
  recent: Array<{ id: string; goal: string; status: string; created_at: number }>;
}

export const STATE_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  READY: 'Lista',
  RUNNING: 'En ejecución',
  WAITING_APPROVAL: 'Esperando aprobación',
  BLOCKED: 'Bloqueada',
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
};

export const RUN_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_aprobacion: 'Pendiente de aprobación',
  en_ejecucion: 'En ejecución',
  pausado: 'Pausado',
  completada: 'Completada',
  fallida: 'Fallida',
  cancelada: 'Cancelada',
};

export const BUILTIN_PROFILE_META: Record<string, { color: string; glyph: string }> = {
  coordinator: { color: 'var(--color-forge-accent)', glyph: '✦' },
  architect: { color: '#6aa8ff', glyph: '⬣' },
  'luau-developer': { color: '#4cc38a', glyph: '⌨' },
  'ui-ux-designer': { color: '#c792ea', glyph: '▤' },
  'gameplay-designer': { color: '#ffcb6b', glyph: '⚄' },
  'environment-artist': { color: '#7fdbca', glyph: '⛰' },
  'character-specialist': { color: '#f78c6c', glyph: '☻' },
  'multiplayer-engineer': { color: '#82aaff', glyph: '⛁' },
  'security-auditor': { color: '#f26d6d', glyph: '⛨' },
  'qa-engineer': { color: '#addb67', glyph: '✓' },
};
