// Detalle de skill: información, hallazgos, perfil técnico, runs y regresión.
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useEval } from '../../stores/eval';
import { getWorkspaceDir } from '../panels';
import { VERDICT_LABELS, groupLabel, type ConceptHit } from '../../lib/eval/types';

const SEV_TONE: Record<string, string> = {
  CRITICAL: 'text-forge-err',
  HIGH: 'text-forge-err',
  MEDIUM: 'text-forge-warn',
  LOW: 'text-forge-muted',
  INFO: 'text-forge-info',
};

export function SkillDetailView({ onBack, visible }: { onBack: () => void; visible: boolean }) {
  const d = useEval((s) => s.skillDetail);
  const history = useEval((s) => s.history);
  const analyze = useEval((s) => s.analyze);
  const [hist, setHist] = useState<{ snapshots: Array<{ hash: string; created_at: number; findings?: number; critical?: number }>; regression_notes: string[] } | null>(null);
  const [profile, setProfile] = useState<ConceptHit[] | null>(null);
  const grpPairs = useEval((s) => s.groups);
  const [msg, setMsg] = useState<string | null>(null);
  if (!visible || !d) return null;
  const s = d.skill;

  const loadHist = async () => {
    setMsg(null);
    try {
      const h = (await history(s.id)) as typeof hist;
      setHist(h);
    } catch (e) {
      setMsg(String(e));
    }
  };
  const reanalyze = async () => {
    setMsg(null);
    try {
      const r = await analyze(s.id);
      const { openSkill } = useEval.getState();
      await openSkill(s.id);
      setMsg(`Analizada: ${r.analyzed} skill, ${r.critical} críticos.`);
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="border-t border-forge-border bg-forge-panel px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <button onClick={onBack} className="btn btn-ghost">← Lista</button>
        <p className="font-bold"><span className="mono text-forge-accent">{s.id}</span></p>
        <span className="text-[11px] text-forge-muted">{groupLabel(grpPairs, s.grp)} · {s.origin} · {s.status}</span>
        <button onClick={reanalyze} className="btn btn-ghost ml-auto">Analizar ahora</button>
        <button onClick={async () => {
          setMsg(null);
          try {
            const ws = await getWorkspaceDir();
            setProfile(await invoke<ConceptHit[]>('eval_tech_profile', { workspaceDir: ws, skillId: s.id }));
          } catch (e) {
            setMsg(String(e));
          }
        }} className="btn btn-ghost">Perfil técnico</button>
        <button onClick={loadHist} className="btn btn-ghost">Historial</button>
      </div>
      {msg && <p className="mb-2 text-[12px] text-forge-muted">{msg}</p>}
      <p className="mb-1 text-[13px] font-semibold">{s.name}</p>
      <p className="mb-2 max-w-4xl text-[12px] text-forge-muted">{s.description || 'Sin descripción.'}</p>
      <p className="mono mb-2 text-[11px] text-forge-faint">{s.path} · hash {s.hash.slice(0, 12)} · score {typeof s.last_score === 'number' ? s.last_score.toFixed(1) : '—'} {s.last_verdict ? `(${VERDICT_LABELS[s.last_verdict] ?? s.last_verdict})` : ''} · {s.runs_count} runs</p>

      <div className="grid gap-2 xl:grid-cols-2">
        <div className="card p-2">
          <p className="section-label mb-1">Hallazgos estáticos ({d.findings.length})</p>
          {d.findings.length === 0 && <p className="text-[12px] text-forge-muted">Sin analizar o sin hallazgos. Pulsa «Analizar ahora».</p>}
          {d.findings.map((f, i) => (
            <div key={i} className="mb-1 border-b border-forge-border-soft pb-1 text-[12px]">
              <span className={`mono font-bold ${SEV_TONE[f.severity]}`}>[{f.severity}]</span> <span className="mono text-forge-faint">{f.code}</span> {f.message}
              <div className="text-[11px] text-forge-muted">Por qué: {f.why}</div>
              <div className="text-[11px] text-forge-muted">Recomendación: {f.fix}{f.line ? ` (línea ${f.line})` : ''}</div>
            </div>
          ))}
        </div>
        <div className="card p-2">
          <p className="section-label mb-1">Runs ({d.runs.length}) y regresión</p>
          {d.runs.length === 0 && <p className="text-[12px] text-forge-muted">Esta skill aún no participó en ningún benchmark.</p>}
          {d.runs.slice(0, 10).map((r) => (
            <div key={r.id} className="mono mb-1 flex gap-2 text-[11px] text-forge-muted">
              <span>{new Date(r.created_at * 1000).toLocaleDateString()}</span>
              <span className="min-w-0 flex-1 truncate">{r.benchmark_id}</span>
              <span>{typeof r.score === 'number' ? r.score.toFixed(1) : '—'}</span>
              <span className={r.status === 'completada' ? 'text-forge-ok' : 'text-forge-err'}>{r.status}</span>
            </div>
          ))}
          {d.referenced_by.length > 0 && <p className="mt-2 text-[11px] text-forge-muted">Referenciada por: {d.referenced_by.slice(0, 8).join(', ')}</p>}
          {profile && (
            <div className="mt-2 border-t border-forge-border-soft pt-1">
              <p className="text-[12px] font-bold">Perfil técnico ({profile.length} conceptos con evidencia)</p>
              <p className="mb-1 text-[11px] text-forge-faint">«Aplicado» = evidencia de uso en código, NO corrección verificada. Todo aplicado queda NEEDS_VERIFICATION hasta contrastar con la doc oficial.</p>
              {profile.map((c) => (
                <div key={c.id} className="mb-1 text-[12px]">
                  <span className={`mono mr-1 rounded px-1 text-[10px] ${c.level === 'aplicado' ? 'bg-forge-warn-soft text-forge-warn' : c.level === 'explicado' ? 'bg-forge-ok-soft text-forge-ok' : 'bg-forge-panel3 text-forge-muted'}`}>{c.level}</span>
                  <span className="font-semibold">{c.label}</span>
                  <span className="mono ml-1 text-[10px] text-forge-faint">{c.verification}</span>
                  <a href={c.doc} target="_blank" rel="noreferrer" className="mono ml-1 text-[10px] text-forge-info underline">doc</a>
                  {c.evidence.slice(0, 2).map((e, i) => <div key={i} className="mono truncate text-[11px] text-forge-muted" title={e}>↳ {e}</div>)}
                </div>
              ))}
              {profile.length === 0 && <p className="text-[12px] text-forge-muted">Sin conceptos Roblox detectados en el texto.</p>}
            </div>
          )}
          {hist && (
            <div className="mt-2 border-t border-forge-border-soft pt-1">
              <p className="text-[12px] font-bold">Snapshots ({hist.snapshots.length})</p>
              {hist.snapshots.map((x, i) => (
                <div key={i} className="mono text-[11px] text-forge-muted">{new Date(x.created_at * 1000).toLocaleDateString()} · {x.hash.slice(0, 10)} · {x.findings} hallazgos · {x.critical} críticos</div>
              ))}
              {hist.regression_notes.map((n, i) => (
                <p key={i} className={`text-[12px] ${n.includes('REGRESIÓN') ? 'text-forge-err' : 'text-forge-ok'}`}>{n}</p>
              ))}
              {hist.regression_notes.length === 0 && <p className="text-[12px] text-forge-muted">Un solo snapshot: sin base de comparación.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
