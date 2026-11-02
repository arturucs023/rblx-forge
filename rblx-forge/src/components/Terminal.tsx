import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function Terminal({ cwd }: { cwd: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = new XTerm({
      theme: { background: '#ffffff', foreground: '#292a2e', cursor: '#1868db', selectionBackground: '#cfe1fd' },
      fontFamily: '"Cascadia Code", Consolas, monospace',
      fontSize: 12,
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current!);
    fit.fit();
    term.writeln('Terminal Forge — escribe y pulsa Enter. Nada se ejecuta solo.');

    let pty: number | null = null;
    let pending = '';
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    (async () => {
      if (!cwd) {
        term.writeln('\r\n[Sin directorio de trabajo: abre un proyecto o configura tu workspace en Configuración]');
        return;
      }
      try {
        const info = await invoke<{ id: number; cwd: string }>('pty_create', {
          cwd,
          rows: term.rows,
          cols: term.cols,
        });
        if (disposed) {
          await invoke('pty_close', { id: info.id });
          return;
        }
        pty = info.id;
        if (pending) {
          await invoke('pty_write', { id: pty, data: pending });
          pending = '';
        }
      } catch (e) {
        term.writeln(`\r\n[error PTY: ${String(e)}]`);
      }
      unlisteners.push(await listen<{ id: number; data: string }>('forge:pty-output', (e) => {
        if (e.payload.id === pty) term.write(e.payload.data);
      }));
      unlisteners.push(await listen<{ id: number }>('forge:pty-exit', (e) => {
        if (e.payload.id === pty) {
          term.writeln('\r\n[proceso terminado]');
          pty = null;
        }
      }));
    })();

    const dispData = term.onData((data) => {
      if (pty !== null) {
        invoke('pty_write', { id: pty, data }).catch(() => {});
      } else {
        pending += data;
      }
    });
    const onResize = () => {
      try {
        fit.fit();
        if (pty !== null) invoke('pty_resize', { id: pty, rows: term.rows, cols: term.cols }).catch(() => {});
      } catch { /* montando */ }
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      dispData.dispose();
      for (const u of unlisteners) u();
      if (pty !== null) invoke('pty_close', { id: pty }).catch(() => {});
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
