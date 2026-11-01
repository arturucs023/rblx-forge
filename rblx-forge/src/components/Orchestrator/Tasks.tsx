// Tablero de tareas por estado + editor con sugerencia de skills y dependencias.
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useOrch } from '../../stores/orch';
import { AgentGlyph, Empty, StateBadge, fmtTs } from './common';
import { ModelPicker, type ModelValue } from '../ModelPicker';
import { effectiveSource, modelLabel } from '../../lib/orch/models';
import type { OrchTask, SkillSuggestion, TaskInput } from '../../lib/orch/types';

const COLS: Array<{ state: string; title: string }> = [
  { state: 'PENDING', title: 'Pendientes' },
  { state: 'READY', title: 'Listas' },
  { state: 'RUNNING', title: 'En ejecución' },
  { state: 'WAITING_APPROVAL', title: 'En revisión' },
  { state: 'BLOCKED', title: 'Bloqueadas' },
  { state: 'COMPLETED', title: 'Completadas' },
  { state: 'FAILED', title: 'Fallidas' },
  { state: 'CANCELLED', title: 'Canceladas' },
];

function blankTask(agentId: string): TaskInput {
  return {
    name: '', description: '', objective: '', agent_id: agentId, skills: [],
    model: null, priority: 3, acceptance: [], files: [], depends_on: [],
  };
}

export function Tasks() {
  const tasks = useOrch((s) => s.tasks);
  const profiles = useOrch((s) => s.profiles);
  const runDetail = useOrch((s) => s.runDetail);
  const activeRunId = useOrch((s) => s.activeRunId);
  const retryTask = useOrch((s) => s.retryTask);
  const setTaskState = useOrch((s) => s.setTaskState);
  const addTask = useOrch((s) => s.addTask);
  const updateTask = useOrch((s) => s.updateTask);
  const deleteTask = useOrch((s) => s.deleteTask);
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ id: string | null; data: TaskInput } | null>(null);
  const [sug, setSug] = useState<SkillSuggestion[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const current = tasks.find((t) => t.id === sel) ?? null;

  const openNew = () => {
    if (!activeRunId) return;
    setEdit({ id: null, data: blankTask(profiles.find((p) => p.active)?.id ?? '') });
    setMsg(null);
    setSug([]);
  };

  const save = async () => {
    setMsg(null);
    if (!edit || !activeRunId) return;
    try {
      if (edit.id) await updateTask(edit.id, edit.data);
      else await addTask(activeRunId, edit.data);
      setEdit(null);
    } catch (e) {
      setMsg(String(e));
    }
  };

  const suggest = async (text: string) => {
    if (text.trim().length < 4) {
      setSug([]);
      return;
    }
    try {
      setSug(await invoke<SkillSuggestion[]>('orch_suggest_skills', { text, group: null, limit: 8 }));
    } catch {
      setSug([]);
    }
  };

  if (!activeRunId) {
    return <Empty title="Sin ejecución seleccionada" hint="Elige una ejecución en el Panel para ver y editar sus tareas." />;
  }

  return (
    <div className="flex h-full flex-col p-3 lg:flex-row lg:gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <p className="section-label">Tareas ({tasks.length})</p>
          <button onClick={openNew} className="btn btn-primary ml-auto !py-1">+ Tarea</button>
        </div>
        {tasks.length === 0 && <Empty title="Plan vacío" hint="Añade tareas a mano o genera el plan con el coordinador en la pestaña Plan." />}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((c) => {
            const list = tasks.filter((t) => t.state === c.state);
            if (!list.length) return null;
            return (
              <div key={c.state} className="rounded border border-forge-border bg-forge-panel p-2">
                <p className="section-label mb-1">{c.title} ({list.length})</p>
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSel(t.id); setEdit(null); setMsg(null); }}
                    className={`card mb-1.5 w-full p-2 text-left ${sel === t.id ? '!border-forge-accent-dim' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AgentGlyph id={t.agent_id} />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{t.name}</span>
                    </div>
                    <div className="mono mt-0.5 flex justify-between text-[10px] text-forge-faint">
                      <span className="truncate">{t.agent_id} · {t.skills.length} skills</span>
                      <StateBadge state={t.state} />
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 w-full shrink-0 lg:mt-0 lg:w-[26rem]">
        {!current && !edit && <p className="card p-3 text-[12px] text-forge-muted">Selecciona una tarea para verla, o crea una nueva.</p>}
        {current && !edit && <TaskDetail t={current} agentName={profiles.find((p) => p.id === current.agent_id)?.name ?? current.agent_id} agentModel={profiles.find((p) => p.id === current.agent_id)?.model ?? null} runDefault={runDetail?.config.default_model ?? null} onEdit={() => setEdit({ id: current.id, data: {
          name: current.name, description: current.description, objective: current.objective, agent_id: current.agent_id,
          skills: [...current.skills], model: current.model, priority: current.priority, acceptance: [...current.acceptance],
          files: [...current.files], depends_on: [...current.depends_on],
        } })} onRetry={() => retryTask(current.id).catch((e) => setMsg(String(e)))} onForce={async (state) => {
          setMsg(null);
          try {
            await setTaskState(current.id, state);
          } catch (e) {
            setMsg(String(e));
          }
        }} onDelete={async () => {
          setMsg(null);
          try {
            await deleteTask(current.id);
            setSel(null);
          } catch (e) {
            setMsg(String(e));
          }
        }} msg={msg} />}
        {edit && (
          <TaskEditor
            data={edit.data}
            setData={(d) => setEdit({ ...edit, data: typeof d === 'function' ? (d as (x: TaskInput) => TaskInput)(edit.data) : d })}
            profiles={profiles}
            tasks={tasks}
            editingId={edit.id}
            sug={sug}
            onSuggest={suggest}
            onSave={save}
            onCancel={() => setEdit(null)}
            msg={msg}
          />
        )}
        {msg && !edit && !current && <p className="card mt-2 p-2 text-[12px] text-forge-muted">{msg}</p>}
      </div>
    </div>
  );
}

function TaskDetail({ t, agentName, agentModel, runDefault, onEdit, onRetry, onForce, onDelete, msg }: {
  t: OrchTask; agentName: string; agentModel: ModelValue | null; runDefault: ModelValue | null;
  onEdit: () => void; onRetry: () => void; onForce: (s: string) => void; onDelete: () => void;
  msg: string | null;
}) {
  const [effective, setEffective] = useState<ModelValue | null>(null);
  useEffect(() => {
    let alive = true;
    invoke<ModelValue | null>('orch_resolve_model', { task: t.model ?? null, agent: agentModel, runDefault })
      .then((m) => { if (alive) setEffective(m); })
      .catch(() => { if (alive) setEffective(null); });
    return () => { alive = false; };
  }, [t.id, t.model, agentModel, runDefault]);
  return (
    <div className="card anim-enter max-h-full overflow-auto p-3">
      <p className="font-bold">{t.name}</p>
      <p className="mono text-[11px] text-forge-faint">{t.id} · {fmtTs(t.created_at)}{t.finished_at ? ` → ${fmtTs(t.finished_at)}` : ''} · intentos {t.attempts}</p>
      <p className="mt-1"><StateBadge state={t.state} /> <span className="mono ml-1 text-[11px] text-forge-muted">{agentName}</span></p>
      <p className="section-label mb-1 mt-2">Modelo efectivo (origen: {effectiveSource(t.model ?? null, agentModel, runDefault)})</p>
      <p className="mono text-[11px] text-forge-muted">
        {modelLabel(effective)} · tarea: {modelLabel(t.model ?? null)} · agente: {modelLabel(agentModel)} · ejecución: {modelLabel(runDefault)}
      </p>
      <p className="mt-1 text-[12px] font-semibold">Objetivo</p>
      <p className="text-[12px] text-forge-muted">{t.objective || '—'}</p>
      {t.description && <><p className="mt-1 text-[12px] font-semibold">Descripción</p><p className="text-[12px] text-forge-muted">{t.description}</p></>}
      <p className="section-label mb-1 mt-2">Skills ({t.skills.length})</p>
      <div className="flex flex-wrap gap-1">
        {t.skills.map((s) => <span key={s} className="mono rounded border border-forge-border-soft px-1.5 py-0.5 text-[11px] text-forge-accent">{s}</span>)}
        {!t.skills.length && <span className="text-[12px] text-forge-faint">sin asignar</span>}
      </div>
      <p className="section-label mb-1 mt-2">Aceptación</p>
      {t.acceptance.map((a) => <p key={a} className="text-[12px] text-forge-muted">· {a}</p>)}
      {!t.acceptance.length && <p className="text-[12px] text-forge-faint">sin criterios</p>}
      {t.files.length > 0 && <><p className="section-label mb-1 mt-2">Archivos</p><p className="mono break-all text-[11px] text-forge-muted">{t.files.join(', ')}</p></>}
      {t.depends_on.length > 0 && <p className="mono mt-1 text-[11px] text-forge-muted">Depende de: {t.depends_on.join(', ')}</p>}
      {t.session_id && <p className="mono mt-1 truncate text-[11px] text-forge-faint" title={t.session_id}>sesión: {t.session_id}</p>}
      {t.result && <><p className="mt-1 text-[12px] font-semibold">Resultado</p><pre className="mono whitespace-pre-wrap text-[11px] text-forge-muted">{t.result.slice(0, 2000)}</pre></>}
      {t.error && <p className="mt-1 text-[12px] text-forge-err">{t.error}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {['PENDING', 'READY', 'BLOCKED', 'FAILED'].includes(t.state) && <button onClick={onEdit} className="btn btn-ghost">Editar</button>}
        {t.state === 'FAILED' && <button onClick={onRetry} className="btn btn-primary !py-1">Reintentar</button>}
        {t.state === 'WAITING_APPROVAL' && <span className="self-center text-[11px] text-forge-warn">Decide en Revisión.</span>}
        {['PENDING', 'READY', 'BLOCKED', 'FAILED', 'CANCELLED'].includes(t.state) && <button onClick={onDelete} className="btn btn-ghost !text-forge-err">Eliminar</button>}
        {(t.state === 'BLOCKED' || t.state === 'FAILED') && <button onClick={() => onForce('READY')} className="btn btn-ghost" title="Forzar a lista (registrado en auditoría)">Forzar lista</button>}
      </div>
      {msg && <p className="mt-1 text-[12px] text-forge-muted">{msg}</p>}
    </div>
  );
}

function TaskEditor({ data, setData, profiles, tasks, editingId, sug, onSuggest, onSave, onCancel, msg }: {
  data: TaskInput;
  setData: (d: TaskInput | ((x: TaskInput) => TaskInput)) => void;
  profiles: Array<{ id: string; name: string; active: boolean }>;
  tasks: OrchTask[];
  editingId: string | null;
  sug: SkillSuggestion[];
  onSuggest: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
  msg: string | null;
}) {
  const upd = (p: Partial<TaskInput>) => setData({ ...data, ...p });
  return (
    <div className="card anim-enter max-h-full overflow-auto p-3">
      <p className="mb-2 font-bold">{editingId ? 'Editar tarea' : 'Nueva tarea'}</p>
      <label className="mb-1 block text-[12px]">Nombre
        <input value={data.name} onChange={(e) => upd({ name: e.target.value })} className="input mt-0.5 w-full" />
      </label>
      <label className="mb-1 block text-[12px]">Objetivo
        <textarea value={data.objective} onChange={(e) => { upd({ objective: e.target.value }); onSuggest(e.target.value); }} className="input mt-0.5 min-h-16 w-full" />
      </label>
      <label className="mb-1 block text-[12px]">Descripción
        <textarea value={data.description} onChange={(e) => upd({ description: e.target.value })} className="input mt-0.5 min-h-14 w-full" />
      </label>
      <label className="mb-1 block text-[12px]">Agente
        <select value={data.agent_id} onChange={(e) => upd({ agent_id: e.target.value })} className="mt-0.5 w-full rounded border border-forge-border bg-forge-bg px-2 py-1">
          <option value="">Elegir…</option>
          {profiles.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <div className="mb-1 text-[12px]">Skills ({data.skills.length}/8)
        <div className="mb-1 flex flex-wrap gap-1">
          {data.skills.map((s) => (
            <button key={s} onClick={() => upd({ skills: data.skills.filter((x) => x !== s) })} className="mono rounded border border-forge-accent-dim px-1.5 py-0.5 text-[11px] text-forge-accent" title="Quitar">× {s}</button>
          ))}
        </div>
        {sug.length > 0 && sug.map((s) => (
          <button key={s.id} onClick={() => { if (!data.skills.includes(s.id) && data.skills.length < 8) upd({ skills: [...data.skills, s.id] }); }} className="mono mt-0.5 block w-full truncate rounded border border-forge-border-soft px-2 py-1 text-left text-[11px] text-forge-muted hover:text-forge-text" title={s.reasons.join(' · ')}>
            + {s.id} <span className="text-forge-faint">({s.verdict ?? 'NOT_EVALUATED'} · {s.score})</span>
          </button>
        ))}
        <p className="text-[11px] text-forge-faint">Sugerencias según el objetivo + veredictos del Evaluation Engine. FAILED/BLOCKED se evitan salvo decisión explícita.</p>
      </div>
      <label className="mb-1 block text-[12px]">Modelo (vacío = heredar del agente)
        <ModelPicker value={data.model ?? null} allowInherit inheritLabel="Heredar del agente" onChange={(v) => upd({ model: v })} />
      </label>
      <label className="mb-1 block text-[12px]">Aceptación (una por línea)
        <textarea value={data.acceptance.join('\n')} onChange={(e) => upd({ acceptance: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} className="input mono mt-0.5 min-h-14 w-full !text-[11px]" />
      </label>
      <label className="mb-1 block text-[12px]">Archivos esperados (rutas relativas, una por línea)
        <textarea value={data.files.join('\n')} onChange={(e) => upd({ files: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} className="input mono mt-0.5 min-h-14 w-full !text-[11px]" />
      </label>
      <label className="mb-2 block text-[12px]">Depende de (las dependencias van antes; sin ciclos)
        <div className="mt-0.5 flex flex-wrap gap-1">
          {tasks.filter((t) => t.id !== editingId).map((t) => {
            const has = data.depends_on.includes(t.id);
            return (
              <button key={t.id} onClick={() => upd({ depends_on: has ? data.depends_on.filter((x) => x !== t.id) : [...data.depends_on, t.id] })} className={`mono rounded border px-1.5 py-0.5 text-[11px] ${has ? 'border-forge-ok text-forge-ok' : 'border-forge-border-soft text-forge-faint'}`}>
                {t.name}
              </button>
            );
          })}
        </div>
      </label>
      <div className="flex gap-1">
        <button onClick={onSave} className="btn btn-primary">Guardar</button>
        <button onClick={onCancel} className="btn btn-ghost">Cancelar</button>
      </div>
      {msg && <p className="mt-1 text-[12px] text-forge-err">{msg}</p>}
    </div>
  );
}
