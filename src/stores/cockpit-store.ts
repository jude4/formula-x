import { create } from 'zustand';
import { cockpitViews, lookLimits } from '../features/cockpit/poses';
import type { CockpitView } from '../features/cockpit/poses';
import type { EyeSafety } from '../features/cockpit/safety';
import { useShowroom } from './showroom-store';
interface CockpitState {
  active: boolean; view: CockpitView; yaw: number; pitch: number; fov: number; transitionKey: number;
  safety: EyeSafety | null; highlight: boolean; lights: boolean; brightness: number;
  enter: () => void; exit: () => void; setView: (view: CockpitView) => void; look: (yaw: number, pitch: number) => void;
  setFov: (fov: number) => void; recenter: () => void; toggleHighlight: () => void; inspectSteering: () => void;
  toggleLights: () => void; setBrightness: (brightness: number) => void; reset: () => void;
}
const defaults = { view: 'driver' as CockpitView, yaw: 0, pitch: -0.2, fov: 68, highlight: false, lights: false, brightness: 1.5 };
export const useCockpit = create<CockpitState>((set, get) => ({
  active: false, ...defaults, transitionKey: 0, safety: null,
  enter() { useShowroom.setState({ autoRotate: false, entered: true }); set((s) => ({ active: true, ...defaults, transitionKey: s.transitionKey + 1 })); },
  exit: () => set({ active: false, ...defaults }),
  setView(view) {
    if (!Object.hasOwn(cockpitViews, view)) return;
    const target = cockpitViews[view]; if (!get().safety?.[target.eye].safe) return;
    set((s) => ({ view, yaw: target.yaw, pitch: target.pitch, transitionKey: cockpitViews[s.view].eye !== target.eye ? s.transitionKey + 1 : s.transitionKey }));
  },
  look(yaw, pitch) { if (Number.isFinite(yaw) && Number.isFinite(pitch)) set({ yaw: Math.max(-lookLimits.yaw, Math.min(lookLimits.yaw, yaw)), pitch: Math.max(lookLimits.minPitch, Math.min(lookLimits.maxPitch, pitch)) }); },
  setFov(fov) { if (Number.isFinite(fov)) set({ fov: Math.max(lookLimits.minFov, Math.min(lookLimits.maxFov, fov)) }); },
  recenter() { const p = cockpitViews[get().view]; set({ yaw: p.yaw, pitch: p.pitch }); },
  toggleHighlight: () => set((s) => ({ highlight: !s.highlight })),
  inspectSteering() { get().setView('steering'); set({ highlight: true }); },
  toggleLights: () => set((s) => ({ lights: !s.lights })),
  setBrightness(brightness) { if (Number.isFinite(brightness)) set({ brightness: Math.max(0.2, Math.min(3, brightness)) }); },
  reset: () => set((s) => ({ ...defaults, transitionKey: s.transitionKey + 1 })),
}));
