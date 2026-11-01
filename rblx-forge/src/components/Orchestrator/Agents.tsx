// Agentes: 10 perfiles integrados + personalizados (crear/editar/duplicar/desactivar).
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useOrch } from '../../stores/orch';
import { useSessions } from '../../stores/sessions';
import { AgentGlyph, Empty } from './common';
import type { AgentProfile } from '../../lib/orch/types';

const ALL_PERMS = ['READ_PROJECT', 'WRITE_PROJECT', 'EXECUTE_COMMANDS', 'RUN_TESTS', 'ACCESS_STUDIO', 'MODIFY_PROJECT_CONFIG', 'INSTALL_DEPENDENCIES'];

function emptyProfile(): Record<string, unknown> {
  return {
    id: '', name: '', specialty: '', description: '', responsibilities: [], limits: [],
    skills: [], model: null, native_agent: null, tools: ['read'], permissions: ['READ_PROJECT'],
    acceptance: [], active: true,
  };
}

export function Agents() {
  const profiles = useOrch((s) => s.profiles);
  const saveProfile = useOrch((s) => s.saveProfile);
  const deleteProfile = useOrch((s) => s.deleteProfile);
  const nativeAgents = useOrch((s) => s.nativeAgents);
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [skillText, setSkillText] = useState('');
  const [skillSug, setSkillSug] = useState<Array<{ id: string; name: string; verdict?: string | null; score: number; reasons: string[] }>>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const current = profiles.find((p) => p.id === sel) ?? null;

  const startEdit = (p: AgentProfile | null) => {
    if (!p) {
      setEdit(emptyProfile());
    } else {
      setEdit({
        id: p.id, name: p.name, specialty: p.specialty, description: p.description,
        responsibilities: [...p.responsibilities], limits: [...p.limits], skills: [...p.skills],
        model: p.model, native_agent: p.native_agent, tools: [...p.tools],
        permissions: [...p.permissions], acceptance: [...p.acceptance], active: p.active,
      });
    }
    setMsg(null);
  };

  const save = async () => {
    setMsg(null);
    if (!edit) return;
    try {
      await saveProfile(edit);
      setEdit(null);
      setMsg('Perfil guardado.');
    } catch (e) {
      setMsg(String(e));
    }
  };

  const suggest = async (text: string) => {
    setSkillText(text);
    if (text.trim().length < 4) {
      setSkillSug([]);
      return;
    }
    try {
      setSkillSug(await invoke('orch_suggest_skills', { text, group: null, limit: 8 }));
    } catch {
      setSkillSug([]);
    }
  };

  return (
    <div className="flex h-full flex-col p-3 lg:flex-row lg:gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <p className="section-label">Perfiles ({profiles.length})</p>
          <button onClick={() => startEdit(null)} className="btn btn-primary ml-auto !py-1">+ Personalizado</button>
        </div>
        {profiles.length === 0 && <Empty title="Sin perfiles" hint="Deberían existir 10 integrados. Pulsa Actualizar en el módulo." />}
        <div className="grid gap-2 md:grid-cols-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSel(p.id); setMsg(null); }}
              className={`card card-hover anim-enter p-2.5 text-left ${sel === p.id ? '!border-forge-accent-dim' : ''} ${p.active ? '' : 'opacity-60'}`}
            >
              <div className="flex items-center gap-2">
                <AgentGlyph id={p.id} />
                <p className="text-[13px] font-bold">{p.name}</p>
                {p.is_builtin && <span className="mono rounded bg-forge-panel3 px-1 text-[10px] text-forge-faint">integrado</span>}
                {!p.active && <span className="mono rounded bg-forge-panel3 px-1 text-[10px] text-forge-faint">inactivo</span>}
              </div>
              <p className="mono mt-0.5 text-[10px] text-forge-faint">{p.specialty} · {p.skills.length} skills · {p.permissions.join(', ') || 'sin permisos'}</p>
              <p className="mt-1 line-clamp-2 text-[12px] text-forge-muted">{p.description}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 w-full shrink-0 lg:mt-0 lg:w-[26rem]">
        {!current && !edit && <p className="card p-3 text-[12px] text-forge-muted">Selecciona un perfil para verlo, o crea uno personalizado.</p>}
        {current && !edit && (
          <Detail p={current} onEdit={() => startEdit(current)} onDuplicate={() => {
            const c = { ...emptyProfile(), name: `${current.name} (copia)`, specialty: current.specialty, description: current.description, responsibilities: [...current.responsibilities], limits: [...current.limits], skills: [...current.skills], tools: [...current.tools], permissions: [...current.permissions], acceptance: [...current.acceptance] };
            setEdit(c);
          }} onDelete={async () => {
            setMsg(null);
            try {
              await deleteProfile(current.id);
              setSel(null);
            } catch (e) {
              setMsg(String(e));
            }
          }} msg={msg} />
        )}
        {edit && (
          <div className="card anim-enter max-h-full overflow-auto p-3">
            <p className="mb-2 font-bold">{edit['id'] ? `Editar ${(edit['name'] as string) || (edit['id'] as string)}` : 'Nuevo perfil'}</p>
            <label className="mb-1 block text-[12px]">ID (único, sin espacios)
              <input value={String(edit['id'] ?? '')} onChange={(e) => setEdit({ ...edit, id: e.target.value.trim() })} disabled={!!current} className="input mono mt-0.5 w-full !text-[11px]" />
            </label>
            <label className="mb-1 block text-[12px]">Nombre
              <input value={String(edit['name'] ?? '')} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="input mt-0.5 w-full" />
            </label>
            <label className="mb-1 block text-[12px]">Especialidad
              <input value={String(edit['specialty'] ?? '')} onChange={(e) => setEdit({ ...edit, specialty: e.target.value })} className="input mt-0.5 w-full" />
            </label>
            <label className="mb-1 block text-[12px]">Descripción
              <textarea value={String(edit['description'] ?? '')} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="input mt-0.5 min-h-16 w-full" />
            </label>
            <label className="mb-1 block text-[12px]">Límites (uno por línea)
              <textarea value={(edit['limits'] as string[]).join('\n')} onChange={(e) => setEdit({ ...edit, limits: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} className="input mono mt-0.5 min-h-14 w-full !text-[11px]" />
            </label>
            <div className="mb-1 text-[12px]">Skills ({(edit['skills'] as string[]).length})
              <div className="mb-1 flex flex-wrap gap-1">
                {(edit['skills'] as string[]).map((s) => (
                  <button key={s} onClick={() => setEdit({ ...edit, skills: (edit['skills'] as string[]).filter((x) => x !== s) })} className="mono rounded border border-forge-accent-dim px-1.5 py-0.5 text-[11px] text-forge-accent" title="Quitar">× {s}</button>
                ))}
              </div>
              <input value={skillText} onChange={(e) => suggest(e.target.value)} placeholder="Escribe la tarea para sugerir skills…" className="input w-full !text-[11px]" />
              {skillSug.map((s) => (
                <button key={s.id} onClick={() => {
                  const cur = edit['skills'] as string[];
                  if (!cur.includes(s.id) && cur.length < 8) setEdit({ ...edit, skills: [...cur, s.id] });
                }} className="mono mt-1 block w-full truncate rounded border border-forge-border-soft px-2 py-1 text-left text-[11px] text-forge-muted hover:text-forge-text" title={s.reasons.join(' · ')}>
                  + {s.id} <span className="text-forge-faint">({s.verdict ?? 'NOT_EVALUATED'})</span>
                </button>
              ))}
            </div>
            <div className="mb-1 text-[12px]">Permisos
              <div className="flex flex-wrap gap-1">
                {ALL_PERMS.map((p) => {
                  const has = (edit['permissions'] as string[]).includes(p);
                  return (
                    <button key={p} onClick={() => setEdit({ ...edit, permissions: has ? (edit['permissions'] as string[]).filter((x) => x !== p) : [...(edit['permissions'] as string[]), p] })} className={`mono rounded border px-1.5 py-0.5 text-[11px] ${has ? 'border-forge-ok text-forge-ok' : 'border-forge-border-soft text-forge-faint'}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="mb-1 block text-[12px]">Agente nativo OpenCode (opcional)
              <select value={String(edit['native_agent'] ?? '')} onChange={(e) => setEdit({ ...edit, native_agent: e.target.value || null })} className="mt-0.5 w-full rounded border border-forge-border bg-forge-bg px-2 py-1">
                <option value="">Ninguno (sesión normal)</option>
                {nativeAgents.map((a) => <option key={a.id} value={a.id}>{a.id}{a.mode ? ` · ${a.mode}` : ''}</option>)}
              </select>
            </label>
            <label className="mb-2 flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={Boolean(edit['active'])} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Activo
            </label>
            <div className="flex gap-1">
              <button onClick={save} className="btn btn-primary">Guardar</button>
              <button onClick={() => { setEdit(null); setSkillSug([]); }} className="btn btn-ghost">Cancelar</button>
            </div>
            {msg && <p className="mt-1 text-[12px] text-forge-muted">{msg}</p>}
            <p className="mt-1 text-[11px] text-forge-faint">Las skills deben existir en el registro (Evaluación → Re-escanear). Nada se duplica: solo se referencian IDs.</p>
          </div>
        )}
        {msg && !edit && <p className="card mt-2 p-2 text-[12px] text-forge-muted">{msg}</p>}
      </div>
    </div>
  );
}

function Detail({ p, onEdit, onDuplicate, onDelete, msg }: { p: AgentProfile; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; msg: string | null }) {
  const models = useSessions((s) => s.models);
  return (
    <div className="card anim-enter p-3">
      <div className="flex items-center gap-2">
        <AgentGlyph id={p.id} size={14} />
        <p className="font-bold">{p.name}</p>
        <span className="mono text-[11px] text-forge-faint">{p.specialty}</span>
      </div>
      <p className="mt-1 text-[12px] text-forge-muted">{p.description}</p>
      <p className="section-label mb-1 mt-2">Skills ({p.skills.length})</p>
      <div className="flex flex-wrap gap-1">
        {p.skills.map((s) => <span key={s} className="mono rounded border border-forge-border-soft px-1.5 py-0.5 text-[11px] text-forge-accent">{s}</span>)}
      </div>
      <p className="section-label mb-1 mt-2">Modelo</p>
      <p className="mono text-[11px] text-forge-muted">{p.model ? `${p.model.providerID}/${p.model.id}${p.model.variant ? ` · ${p.model.variant}` : ''}` : 'Heredado de la ejecución (sin fijar)'}</p>
      <p className="section-label mb-1 mt-2">Agente nativo</p>
      <p className="mono text-[11px] text-forge-muted">{p.native_agent ?? 'Ninguno'}{p.native_agent && !models.length ? ' (conecta OpenCode para validar)' : ''}</p>
      <p className="section-label mb-1 mt-2">Permisos</p>
      <p className="mono text-[11px] text-forge-muted">{p.permissions.join(', ') || '—'}</p>
      <p className="section-label mb-1 mt-2">Límites</p>
      {p.limits.map((l) => <p key={l} className="text-[12px] text-forge-muted">· {l}</p>)}
      <div className="mt-2 flex gap-1">
        <button onClick={onEdit} className="btn btn-ghost">Editar</button>
        <button onClick={onDuplicate} className="btn btn-ghost">Duplicar</button>
        {!p.is_builtin && <button onClick={onDelete} className="btn btn-ghost !text-forge-err">Eliminar</button>}
      </div>
      {msg && <p className="mt-1 text-[12px] text-forge-muted">{msg}</p>}
    </div>
  );
}
