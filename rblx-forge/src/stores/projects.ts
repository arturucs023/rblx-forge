import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface ProjectInfo {
  name: string;
  path: string;
  modified: string;
  has_forge_file: boolean;
  has_rojo: boolean;
  has_git: boolean;
  favorite: boolean;
}

export interface FsEntry {
  name: string;
  rel: string;
  kind: 'dir' | 'file';
  size?: number;
  modified?: number;
}

export interface SearchHit {
  rel: string;
  line: number;
  snippet: string;
}

export interface RojoStatus {
  has_file: boolean;
  valid: boolean;
  name?: string;
  error?: string;
  missing_paths: string[];
  binary?: { path: string; version: string };
}

interface ProjectsState {
  recents: ProjectInfo[];
  active: ProjectInfo | null;
  tree: FsEntry[];
  treeRoot: string;
  preview: { rel: string; content: string } | null;
  rojo: RojoStatus | null;
  searchHits: SearchHit[];
  error: string | null;
  busy: boolean;

  refreshRecents: () => Promise<void>;
  create: (name: string, parentDir: string, template: string, initGit: boolean) => Promise<void>;
  open: (path: string) => Promise<void>;
  importRojo: (path: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  toggleFavorite: (path: string) => Promise<void>;
  loadTree: (rel: string) => Promise<void>;
  previewFile: (rel: string) => Promise<void>;
  writeFile: (rel: string, content: string) => Promise<void>;
  mkdir: (rel: string) => Promise<void>;
  renameEntry: (from: string, to: string) => Promise<void>;
  deleteEntry: (rel: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  checkRojo: () => Promise<void>;
  clearError: () => void;
}

export const DEFAULT_PARENT = '';

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    throw new Error(typeof e === 'string' ? e : JSON.stringify(e));
  }
}

export const useProjects = create<ProjectsState>((set, get) => ({
  recents: [],
  active: null,
  tree: [],
  treeRoot: '',
  preview: null,
  rojo: null,
  searchHits: [],
  error: null,
  busy: false,

  clearError: () => set({ error: null }),

  refreshRecents: async () => {
    try {
      set({ recents: await call<ProjectInfo[]>('projects_recents') });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  create: async (name, parentDir, template, initGit) => {
    set({ busy: true, error: null });
    try {
      const p = await call<ProjectInfo>('project_create', { name, parentDir, template, initGit });
      await get().refreshRecents();
      await get().open(p.path);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  open: async (path) => {
    set({ busy: true, error: null });
    try {
      const p = await call<ProjectInfo>('project_open', { path });
      set({ active: p, preview: null, searchHits: [], rojo: null });
      await get().refreshRecents();
      await get().loadTree('');
      await get().checkRojo();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  importRojo: async (path) => {
    set({ busy: true, error: null });
    try {
      const p = await call<ProjectInfo>('project_import_rojo', { path });
      await get().refreshRecents();
      await get().open(p.path);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  remove: async (path) => {
    set({ busy: true, error: null });
    try {
      await call<boolean>('project_delete', { path, confirm: true });
      if (get().active?.path === path) set({ active: null, tree: [], preview: null, rojo: null });
      await get().refreshRecents();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  toggleFavorite: async (path) => {
    try {
      await call<boolean>('project_toggle_favorite', { path });
      await get().refreshRecents();
      const a = get().active;
      if (a?.path === path) set({ active: { ...a, favorite: !a.favorite } });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadTree: async (rel) => {
    const a = get().active;
    if (!a) return;
    try {
      set({ tree: await call<FsEntry[]>('fs_list', { projectDir: a.path, rel }), treeRoot: rel });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  previewFile: async (rel) => {
    const a = get().active;
    if (!a) return;
    try {
      set({ preview: { rel, content: await call<string>('fs_read', { projectDir: a.path, rel }) } });
    } catch (e) {
      set({ error: String(e), preview: null });
    }
  },

  writeFile: async (rel, content) => {
    const a = get().active;
    if (!a) return;
    try {
      await call<number>('fs_write', { projectDir: a.path, rel, content });
      set({ preview: { rel, content } });
      await get().loadTree(get().treeRoot);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  mkdir: async (rel) => {
    const a = get().active;
    if (!a) return;
    try {
      await call<boolean>('fs_mkdir', { projectDir: a.path, rel });
      await get().loadTree(get().treeRoot);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  renameEntry: async (from, to) => {
    const a = get().active;
    if (!a) return;
    try {
      await call<boolean>('fs_rename', { projectDir: a.path, from, to });
      await get().loadTree(get().treeRoot);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteEntry: async (rel) => {
    const a = get().active;
    if (!a) return;
    try {
      await call<boolean>('fs_delete', { projectDir: a.path, rel, confirm: true });
      if (get().preview?.rel === rel) set({ preview: null });
      await get().loadTree(get().treeRoot);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  search: async (query) => {
    const a = get().active;
    if (!a) return;
    try {
      set({ searchHits: await call<SearchHit[]>('fs_search', { projectDir: a.path, query }) });
    } catch (e) {
      set({ error: String(e), searchHits: [] });
    }
  },

  checkRojo: async () => {
    const a = get().active;
    if (!a) return;
    try {
      const [det] = await Promise.all([
        call<RojoStatus>('rojo_detect', { projectDir: a.path }),
      ]);
      set({ rojo: det });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
