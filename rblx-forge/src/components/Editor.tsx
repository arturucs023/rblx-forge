import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import { useEditor } from '../stores/editor';
import { useProjects } from '../stores/projects';
import { useSessions } from '../stores/sessions';
import { parseSelene, parseStyluaCheck, type Diagnostic } from '../lib/diagnostics';
import { DiffViewer } from './DiffViewer';

// Editor Luau (resaltado base Lua de Monaco; Luau añade tipos/strict que el
// resaltado no distingue: limitación declarada, no autocompletado fingido).
// Diagnósticos 100% reales: StyLua y Selene vendoreados vía tool_run.
export function LuauEditor() {
  const { files, active } = useEditor();
  const project = useProjects((s) => s.active);
  const st = useEditor.getState();
  const monacoRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [diags, setDiags] = useState<Diagnostic[]>([]);
  const [formatMsg, setFormatMsg] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [busy, setBusy] = useState(false);

  const file = files.find((f) => f.rel === active) ?? null;
  const text = file ? (file.draft ?? file.disk) : '';
  const dirty = !!file && file.draft !== null && file.draft !== file.disk;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.rel, text]);

  if (!project) return <p className="p-3 text-forge-muted">Abre un proyecto para editar sus scripts.</p>;

  const save = async () => {
    if (!file || !dirty) return;
    setBusy(true);
    try {
      await invoke('fs_write', { projectDir: project.path, rel: file.rel, content: file.draft });
      st.markSaved(file.rel, file.draft!);
    } finally {
      setBusy(false);
    }
  };

  const runTool = async (tool: 'stylua' | 'selene', write: boolean) => {
    if (!file) return;
    if (file.draft !== null && file.draft !== file.disk) await save();
    setBusy(true);
    setFormatMsg(null);
    try {
      const r = await invoke<{ success: boolean; stdout: string; stderr: string }>('tool_run', {
        projectDir: project.path,
        tool,
        rel: file.rel,
        write,
      });
      if (tool === 'stylua' && write) {
        // Releer el archivo formateado.
        const content = await invoke<string>('fs_read', { projectDir: project.path, rel: file.rel });
        st.markSaved(file.rel, content);
        setFormatMsg(r.success ? 'Formateado con StyLua.' : 'StyLua terminó con errores.');
      } else if (tool === 'selene') {
        const d = parseSelene(r.stdout + '\n' + r.stderr);
        setDiags(d);
        setFormatMsg(d.length === 0 ? 'Selene: sin hallazgos.' : `Selene: ${d.length} hallazgo(s).`);
      } else {
        const f = parseStyluaCheck(r.stdout + '\n' + r.stderr);
        setFormatMsg(f.length === 0 ? 'StyLua: formato correcto.' : `StyLua: ${f.length} archivo(s) con diff.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const goTo = (d: Diagnostic) => {
    monacoRef.current?.revealLineInCenter(d.line);
    monacoRef.current?.setPosition({ lineNumber: d.line, column: d.col });
    monacoRef.current?.focus();
  };

  const sendSelection = (kind: string) => {
    const model = monacoRef.current?.getModel();
    const sel = model ? model.getValueInRange(monacoRef.current!.getSelection()!) : '';
    const code = sel || text;
    if (!code.trim()) return;
    useSessions.getState().setAssistantDraft(
      `${kind} (archivo ${file?.rel}):\n\`\`\`lua\n${code.slice(0, 4000)}\n\`\`\``,
    );
    document.dispatchEvent(new CustomEvent('forge:go-assistant'));
  };

  const onMount: OnMount = (editor, monaco) => {
    monacoRef.current = editor;
    monaco.editor.defineTheme('forge-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#0b0e14' },
    });
    monaco.editor.setTheme('forge-dark');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-forge-border px-1 py-1">
        {files.length === 0 && <span className="px-2 text-[12px] text-forge-muted">Sin archivos abiertos (doble clic en el explorador o pulsa “Abrir en editor”).</span>}
        {files.map((f) => (
          <div key={f.rel} className={`flex items-center gap-1 rounded px-2 py-0.5 text-[12px] ${f.rel === active ? 'bg-forge-panel2 text-forge-accent' : 'text-forge-muted'}`}>
            <button onClick={() => st.setActive(f.rel)} className="max-w-48 truncate" title={f.rel}>
              {(f.draft !== null && f.draft !== f.disk ? '● ' : '')}{f.rel.split('/').pop()}
            </button>
            <button onClick={() => st.closeFile(f.rel)} className="hover:text-forge-err">✕</button>
          </div>
        ))}
      </div>
      {file && (
        <div className="flex flex-wrap items-center gap-1 border-b border-forge-border px-2 py-1 text-[12px]">
          <span className="mono mr-1 truncate text-forge-muted">{file.rel}</span>
          <button onClick={save} disabled={!dirty || busy} className="rounded border border-forge-border px-2 py-0.5 disabled:opacity-50">Guardar{dirty ? ' ●' : ''}</button>
          <button onClick={() => runTool('stylua', true)} disabled={busy} className="rounded border border-forge-border px-2 py-0.5">Formatear (StyLua)</button>
          <button onClick={() => runTool('stylua', false)} disabled={busy} className="rounded border border-forge-border px-2 py-0.5">Comprobar formato</button>
          <button onClick={() => runTool('selene', false)} disabled={busy} className="rounded border border-forge-border px-2 py-0.5">Analizar (Selene)</button>
          <button onClick={() => setShowDiff((v) => !v)} disabled={!dirty} className="rounded border border-forge-border px-2 py-0.5 disabled:opacity-50">Diff vs disco</button>
          <button onClick={() => sendSelection('Explica este código')} className="rounded border border-forge-accent-dim px-2 py-0.5 text-forge-accent" title="Envía el código al Asistente (OpenCode lo procesa)">Explicar en Asistente →</button>
          {formatMsg && <span className="text-forge-muted">{formatMsg}</span>}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {file ? (
          showDiff && dirty ? (
            <DiffViewer original={file.disk} modified={file.draft ?? ''} title={`Cambios sin guardar · ${file.rel}`} />
          ) : (
            <Editor
              height="100%"
              language="lua"
              value={text}
              onChange={(v) => file && st.setDraft(file.rel, v ?? '')}
              onMount={onMount}
              options={{ minimap: { enabled: true }, fontSize: 13, fontFamily: '"Cascadia Code", Consolas, monospace', automaticLayout: true, find: { addExtraSpaceOnTop: false } }}
            />
          )
        ) : (
          <p className="p-3 text-forge-muted">Editor vacío.</p>
        )}
      </div>
      {diags.length > 0 && (
        <div className="max-h-36 overflow-y-auto border-t border-forge-border">
          {diags.map((d, i) => (
            <button key={i} onClick={() => goTo(d)} className="mono block w-full truncate px-2 py-0.5 text-left text-[11px] hover:bg-forge-panel2">
              <span className={d.severity === 'error' ? 'text-forge-err' : 'text-forge-warn'}>[{d.severity}]</span>{' '}
              {d.file}:{d.line}:{d.col} {d.code && `(${d.code})`} {d.message.slice(0, 160)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
