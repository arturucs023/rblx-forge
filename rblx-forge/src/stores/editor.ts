import { create } from 'zustand';

export interface OpenFile {
  rel: string;
  disk: string;
  draft: string | null;
}

interface EditorState {
  files: OpenFile[];
  active: string | null;
  prefill: string | null;
  openFile: (rel: string, content: string) => void;
  closeFile: (rel: string) => void;
  setActive: (rel: string) => void;
  setDraft: (rel: string, draft: string) => void;
  markSaved: (rel: string, content: string) => void;
  setPrefill: (text: string | null) => void;
}

export const useEditor = create<EditorState>((set) => ({
  files: [],
  active: null,
  prefill: null,
  openFile: (rel, content) =>
    set((s) => ({
      files: s.files.some((f) => f.rel === rel) ? s.files : [...s.files, { rel, disk: content, draft: null }],
      active: rel,
    })),
  closeFile: (rel) =>
    set((s) => {
      const files = s.files.filter((f) => f.rel !== rel);
      return { files, active: s.active === rel ? (files[files.length - 1]?.rel ?? null) : s.active };
    }),
  setActive: (rel) => set({ active: rel }),
  setDraft: (rel, draft) =>
    set((s) => ({ files: s.files.map((f) => (f.rel === rel ? { ...f, draft } : f)) })),
  markSaved: (rel, content) =>
    set((s) => ({ files: s.files.map((f) => (f.rel === rel ? { ...f, disk: content, draft: null } : f)) })),
  setPrefill: (text) => set({ prefill: text }),
}));
