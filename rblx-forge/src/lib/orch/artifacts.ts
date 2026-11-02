// Detección pura de tareas "solo diseño": completadas sin ningún .luau.
// El orquestador implementa en Roblox; un informe .md no es implementación.
import type { Artifact, OrchTask } from './types';

export function isCodeFile(rel: string): boolean {
  return /\.(luau|lua)$/i.test(rel.trim());
}

/** Rutas de los artefactos de una tarea (solo lectura, sin inventar). */
export function taskArtifactRels(taskId: string, artifacts: Artifact[]): string[] {
  return artifacts.filter((a) => a.task_id === taskId).map((a) => a.rel);
}

/**
 * Una tarea COMPLETED necesita implementación si ninguno de sus artefactos
 * es código (.luau/.lua): o solo generó .md/documentación, o no generó nada
 * aplicable. Solo COMPLETED: otros estados tienen su propio flujo.
 */
export function taskNeedsImplementation(
  task: Pick<OrchTask, 'state'>,
  rels: string[],
): boolean {
  if (task.state !== 'COMPLETED') return false;
  return !rels.some(isCodeFile);
}

/** Las que puede reprogramar el botón "Implementar diseño". */
export function implementableTasks(
  tasks: OrchTask[],
  artifacts: Artifact[],
): Array<{ task: OrchTask; rels: string[] }> {
  return tasks
    .filter((t) => taskNeedsImplementation(t, taskArtifactRels(t.id, artifacts)))
    .map((task) => ({ task, rels: taskArtifactRels(task.id, artifacts) }));
}
