import { create } from 'zustand';
import { ancestors, descendants, separationConfig, separationIds, separationStages } from '../features/disassembly/config';
import { useShowroom } from './showroom-store';
interface DisassemblyState {
  active: boolean; levels: Record<string, number>; distance: number; step: number;
  paused: boolean; animating: boolean; hidden: Record<string, boolean>; isolatedId: string | null;
  guides: boolean; labels: boolean; resetKey: number; framingKey: number;
  enter: () => void; exit: () => void; explode: () => void; assemble: () => void; setStep: (step: number) => void;
  setDistance: (distance: number) => void; togglePause: () => void; reset: () => void;
  separate: (id: string) => void; restore: (id: string) => void; toggleVisibility: (id: string) => void;
  toggleIsolation: (id: string) => void; selectionChanged: (id: string | null) => void;
  showAll: () => void; toggleGuides: () => void; toggleLabels: () => void;
}
const cleared = { levels: {}, distance: 1, step: 0, paused: false, animating: false, hidden: {}, isolatedId: null };
export function componentHidden(id: string, hidden: Record<string, boolean>) { return !!hidden[id] || ancestors(id).some((parent) => hidden[parent]); }
export const useDisassembly = create<DisassemblyState>((set, get) => ({
  active: false, ...cleared, guides: true, labels: true, resetKey: 0, framingKey: 0,
  enter() { useShowroom.setState({ autoRotate: false }); set((s) => ({ active: true, ...cleared, resetKey: s.resetKey + 1, framingKey: s.framingKey + 1 })); },
  exit: () => set((s) => ({ active: false, ...cleared, resetKey: s.resetKey + 1 })),
  explode: () => get().setStep(separationStages.length),
  assemble: () => get().setStep(0),
  setStep(value) {
    if (!get().active || !Number.isFinite(value)) return;
    const step = Math.max(0, Math.min(separationStages.length, Math.round(value)));
    set((s) => ({ step, levels: Object.fromEntries(separationConfig.map((c) => [c.id, c.stage < step ? 1 : 0])), paused: false, framingKey: s.framingKey + 1 }));
  },
  setDistance(value) { if (Number.isFinite(value)) set((s) => ({ distance: Math.max(0, Math.min(1.5, value)), framingKey: s.framingKey + 1 })); },
  togglePause: () => set((s) => ({ paused: !s.paused })),
  reset() { useShowroom.getState().reset(); set((s) => ({ ...cleared, guides: true, labels: true, resetKey: s.resetKey + 1, framingKey: s.framingKey + 1 })); },
  separate(id) { if (get().active && separationIds.has(id)) set((s) => ({ levels: { ...s.levels, [id]: 1 }, framingKey: s.framingKey + 1 })); },
  restore(id) { if (get().active && separationIds.has(id)) set((s) => ({ levels: { ...s.levels, ...Object.fromEntries(descendants(id).map((child) => [child, 0])) }, framingKey: s.framingKey + 1 })); },
  toggleVisibility(id) {
    if (!separationIds.has(id)) return;
    set((s) => { const hidden = { ...s.hidden }; if (componentHidden(id, hidden)) [id, ...ancestors(id)].forEach((key) => delete hidden[key]); else hidden[id] = true; return { hidden }; });
  },
  toggleIsolation(id) { if (separationIds.has(id)) set((s) => { const hidden = { ...s.hidden }; [id, ...ancestors(id)].forEach((key) => delete hidden[key]); return { isolatedId: s.isolatedId === id ? null : id, hidden }; }); },
  selectionChanged: (id) => set((s) => { if (!s.isolatedId) return { isolatedId: null }; const hidden = { ...s.hidden }; if (id) [id, ...ancestors(id)].forEach((key) => delete hidden[key]); return { isolatedId: id, hidden }; }),
  showAll: () => set({ hidden: {}, isolatedId: null }),
  toggleGuides: () => set((s) => ({ guides: !s.guides })),
  toggleLabels: () => set((s) => ({ labels: !s.labels })),
}));
