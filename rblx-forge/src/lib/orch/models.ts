// Origen efectivo del modelo (herencia tarea > agente > ejecución > sesión).
// Puro y testeado: la resolución real la valida el backend (orch_resolve_model).
import type { ModelValue } from '../../components/ModelPicker';

export function effectiveSource(
  task: ModelValue | null | undefined,
  agent: ModelValue | null | undefined,
  runDefault: ModelValue | null | undefined,
): 'tarea' | 'agente' | 'ejecución' | 'sesión' {
  if (task && typeof task.id === 'string' && typeof task.providerID === 'string') return 'tarea';
  if (agent && typeof agent.id === 'string' && typeof agent.providerID === 'string') return 'agente';
  if (runDefault && typeof runDefault.id === 'string' && typeof runDefault.providerID === 'string') return 'ejecución';
  return 'sesión';
}

export function modelLabel(m: ModelValue | null | undefined): string {
  if (!m) return 'heredado';
  return `${m.providerID}/${m.id}${m.variant ? ` · ${m.variant}` : ''}`;
}
