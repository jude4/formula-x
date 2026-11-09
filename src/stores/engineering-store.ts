import { create } from 'zustand';
import { cornerAssemblies, defaultLayers, layerForComponent } from '../features/engineering/catalog';
import type { Corner, LabLayer } from '../features/engineering/catalog';
import { useShowroom } from './showroom-store';
import type { Vec3 } from '../types/vehicle';
interface EngineeringState {
  active: boolean; corner: Corner; layers: Record<LabLayer, boolean>; separated: boolean; distance: number;
  paused: boolean; animating: boolean; isolateSelected: boolean; resetKey: number; framingKey: number;
  focus: { target: Vec3; position: Vec3; request: number } | null;
  enter: () => void; exit: () => void; chooseCorner: (corner: Corner) => void; setSeparated: (separated: boolean) => void;
  setDistance: (distance: number) => void; toggleLayer: (layer: LabLayer) => void; showAssembly: () => void;
  brakeOnly: () => void; selectionChanged: (id: string) => void; toggleIsolation: () => void;
  togglePause: () => void; frame: () => void; reset: () => void;
}
const baseline = { layers: defaultLayers, separated: false, distance: 1, paused: false, animating: false, isolateSelected: false, focus: null };
export const useEngineering = create<EngineeringState>((set, get) => ({
  active: false, corner: 'front-left', ...baseline, resetKey: 0, framingKey: 0,
  enter() { useShowroom.setState({ autoRotate: false, entered: true }); set((s) => ({ active: true, corner: 'front-left', ...baseline, resetKey: s.resetKey + 1, framingKey: s.framingKey + 1 })); },
  exit: () => set((s) => ({ active: false, ...baseline, resetKey: s.resetKey + 1 })),
  chooseCorner(corner) { if (!Object.hasOwn(cornerAssemblies, corner)) return; set((s) => ({ corner, ...baseline, resetKey: s.resetKey + 1, framingKey: s.framingKey + 1 })); },
  setSeparated(separated) { if (!get().active) return; set((s) => ({ separated, paused: false, isolateSelected: false, layers: separated ? { ...defaultLayers, tire: true, rim: true } : s.layers, framingKey: s.framingKey + 1 })); },
  setDistance(distance) { if (Number.isFinite(distance)) set((s) => ({ distance: Math.max(0, Math.min(1.5, distance)), framingKey: s.framingKey + 1 })); },
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  showAssembly: () => set((s) => ({ layers: Object.fromEntries(Object.keys(defaultLayers).map((layer) => [layer, true])) as Record<LabLayer, boolean>, isolateSelected: false, framingKey: s.framingKey + 1 })),
  brakeOnly: () => set((s) => ({ layers: defaultLayers, isolateSelected: false, framingKey: s.framingKey + 1 })),
  selectionChanged(id) { const layer = layerForComponent(get().corner, id); if (layer) set((s) => ({ layers: { ...s.layers, [layer]: true } })); },
  toggleIsolation: () => set((s) => ({ isolateSelected: !s.isolateSelected })),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  frame: () => set((s) => ({ framingKey: s.framingKey + 1 })),
  reset: () => set((s) => ({ ...baseline, resetKey: s.resetKey + 1, framingKey: s.framingKey + 1 })),
}));
