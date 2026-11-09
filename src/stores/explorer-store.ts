import { useCockpit } from './cockpit-store';
import { create } from 'zustand';
import { useCustomization } from './customization-store';
import { useEngineering } from './engineering-store';
import { cornerSelectable } from '../features/engineering/catalog';
import { useDisassembly } from './disassembly-store';
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
    useCockpit.getState().exit();
    useDisassembly.getState().exit();
    useEngineering.getState().exit();
    useCustomization.getState().exit();
    if (open) useShowroom.setState({ autoRotate: false, entered: true });
    else useShowroom.getState().reset();
    set({ open, selectedId: null, hoveredId: null, focus: null });
  },
  select(id) {
    if (!get().open || !referenceManifest.components.some((c) => c.id === id && c.selectable)) return;
    const lab = useEngineering.getState();
    if (lab.active && !cornerSelectable(lab.corner, id)) return;
    if (lab.active) lab.selectionChanged(id);
    useShowroom.setState({ autoRotate: false });
    useDisassembly.getState().selectionChanged(id);
    set((s) => ({ selectedId: id, inspectKey: s.inspectKey + 1 }));
  },
  hover: (hoveredId) => set({ hoveredId }),
  clear() { useEngineering.setState({ isolateSelected: false }); useDisassembly.getState().selectionChanged(null); set({ selectedId: null, hoveredId: null, focus: null }); useShowroom.getState().reset(); },
  refocus: () => set((s) => ({ inspectKey: s.inspectKey + 1 })),
  setFocus: (focus) => set({ focus }),
}));
