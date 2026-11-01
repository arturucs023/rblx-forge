import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type ConnState = 'desconocido' | 'detectando' | 'no-encontrado' | 'detenido' | 'iniciando' | 'conectado' | 'error';

export interface DetectInfo {
  found: boolean;
  path?: string;
  version?: string;
  tried?: string[];
}

export interface ServerState {
  managed: boolean;
  url?: string;
  pid?: number;
  alive: boolean;
  version?: string;
  /** Password en memoria (nunca persistir): firma las peticiones loopback. */
  password?: string;
}

export interface ActivityEntry {
  id: number;
  ts: string;
  level: string;
  target: string;
  message: string;
}

interface AppState {
  conn: ConnState;
  detect: DetectInfo | null;
  server: ServerState | null;
  error: string | null;
  activity: ActivityEntry[];
  seq: number;
  pushActivity: (level: string, target: string, message: string) => void;
  clearActivity: () => void;
  detectOpencode: () => Promise<void>;
  startServer: (port?: number) => Promise<void>;
  stopServer: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

let logListenerOff: (() => void) | null = null;

export const useApp = create<AppState>((set, get) => ({
  conn: 'desconocido',
  detect: null,
  server: null,
  error: null,
  activity: [],
  seq: 0,
  pushActivity: (level, target, message) =>
    set((s) => ({
      seq: s.seq + 1,
      activity: [
        ...s.activity.slice(-499),
        { id: s.seq + 1, ts: new Date().toISOString(), level, target, message },
      ],
    })),
  clearActivity: () => set({ activity: [] }),

  detectOpencode: async () => {
    set({ conn: 'detectando', error: null });
    try {
      const d = await invoke<DetectInfo>('opencode_detect');
      set({ detect: d, conn: d.found ? 'detenido' : 'no-encontrado' });
      get().pushActivity('info', 'forge', d.found ? `OpenCode ${d.version} en ${d.path}` : 'OpenCode no encontrado en PATH');
      if (logListenerOff === null) {
        logListenerOff = await listen<{ level: string; target: string; message: string }>(
          'forge:log',
          (e) => get().pushActivity(e.payload.level, e.payload.target, e.payload.message),
        );
      }
    } catch (e) {
      set({ conn: 'error', error: String(e) });
    }
  },

  startServer: async (port) => {
    set({ conn: 'iniciando', error: null });
    try {
      const s = await invoke<ServerState>('opencode_start', { port: port ?? null });
      set({ server: s, conn: s.alive ? 'conectado' : 'error' });
    } catch (e) {
      set({ conn: 'error', error: String(e) });
      get().pushActivity('error', 'forge', String(e));
    }
  },

  stopServer: async () => {
    try {
      await invoke<boolean>('opencode_stop');
      set({ server: null, conn: 'detenido' });
      get().pushActivity('info', 'forge', 'Servidor gestionado detenido.');
    } catch (e) {
      set({ error: String(e) });
    }
  },

  refreshStatus: async () => {
    try {
      const s = await invoke<ServerState>('opencode_status');
      set({ server: s, conn: s.managed ? (s.alive ? 'conectado' : 'error') : 'detenido' });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
