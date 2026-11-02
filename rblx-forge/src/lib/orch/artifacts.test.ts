import { describe, expect, it } from 'vitest';
import { implementableTasks, isCodeFile, taskArtifactRels, taskNeedsImplementation } from './artifacts';
import type { Artifact, OrchTask } from './types';

const task = (state: string): OrchTask =>
  ({ id: 't1', state } as unknown as OrchTask);

const art = (task_id: string | null, rel: string): Artifact =>
  ({ task_id, rel, size: 1, hash: 'h', created_at: 1 } as Artifact);

describe('isCodeFile', () => {
  it('solo .luau/.lua cuentan como implementación', () => {
    expect(isCodeFile('src/x.luau')).toBe(true);
    expect(isCodeFile('a.LUA')).toBe(true);
    expect(isCodeFile('doc.md')).toBe(false);
    expect(isCodeFile('plan.json')).toBe(false);
  });
});

describe('taskNeedsImplementation', () => {
  it('COMPLETED solo con .md necesita implementar', () => {
    expect(taskNeedsImplementation(task('COMPLETED'), ['diseño.md'])).toBe(true);
    expect(taskNeedsImplementation(task('COMPLETED'), [])).toBe(true);
  });
  it('con .luau no necesita, y otros estados nunca', () => {
    expect(taskNeedsImplementation(task('COMPLETED'), ['diseño.md', 'src/a.luau'])).toBe(false);
    expect(taskNeedsImplementation(task('FAILED'), ['diseño.md'])).toBe(false);
    expect(taskNeedsImplementation(task('RUNNING'), [])).toBe(false);
  });
});

describe('implementableTasks', () => {
  it('filtra por tarea y devuelve sus rels', () => {
    const tasks = [task('COMPLETED'), { ...task('COMPLETED'), id: 't2' } as OrchTask];
    const arts = [art('t1', 'a.md'), art('t2', 'b.luau'), art('otra', 'c.md')];
    const out = implementableTasks(tasks, arts);
    expect(out.map((o) => o.task.id)).toEqual(['t1']);
    expect(out[0].rels).toEqual(['a.md']);
  });
});

describe('taskArtifactRels', () => {
  it('solo artefactos de la tarea', () => {
    expect(taskArtifactRels('t1', [art('t1', 'a.md'), art('t2', 'b.md')])).toEqual(['a.md']);
  });
});
