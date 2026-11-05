import { create } from 'zustand';
import { referenceManifest } from '../models/vehicle/manifest';
import { useShowroom } from './showroom-store';
import type { Vec3 } from '../types/vehicle';
export interface ComponentFocus { target: Vec3; position: Vec3; request: number }
interface ExplorerState {
  open: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  inspectKey: number;
  focus: ComponentFocus | null;
  setOpen: (open: boolean) => void;
  select: (id: string) => void;
  hover: (id: string | null) => void;
  clear: () => void;
  refocus: () => void;
  setFocus: (focus: ComponentFocus) => void;
}
export const useExplorer = create<ExplorerState>((set, get) => ({
  open: false, selectedId: null, hoveredId: null, inspectKey: 0, focus: null,
  setOpen(open) {
    if (open) useShowroom.setState({ autoRotate: false, entered: true });
    else useShowroom.getState().reset();
    set({ open, selectedId: null, hoveredId: null, focus: null });
  },
  select(id) {
    if (!get().open || !referenceManifest.components.some((c) => c.id === id && c.selectable)) return;
    useShowroom.setState({ autoRotate: false });
    set((s) => ({ selectedId: id, inspectKey: s.inspectKey + 1 }));
  },
  hover: (hoveredId) => set({ hoveredId }),
  clear() { set({ selectedId: null, hoveredId: null, focus: null }); useShowroom.getState().reset(); },
  refocus: () => set((s) => ({ inspectKey: s.inspectKey + 1 })),
  setFocus: (focus) => set({ focus }),
}));
