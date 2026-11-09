import { create } from 'zustand';
import { bodyFinishes, defaultAppearance, trimFinishes, upholsteryFinishes, validColor, wheelFinishes } from '../features/customization/catalog';
import type { Appearance } from '../features/customization/catalog';
import { useShowroom } from './showroom-store';
interface CustomizationState {
  active: boolean; appearance: Appearance; inspection: 'exterior' | 'upholstery'; viewKey: number;
  enter: () => void; exit: () => void; update: (patch: Partial<Appearance>) => void;
  inspect: (view: 'exterior' | 'upholstery') => void; reset: () => void;
}
export const useCustomization = create<CustomizationState>((set) => ({
  active: false, appearance: { ...defaultAppearance }, inspection: 'exterior', viewKey: 0,
  enter() { useShowroom.getState().reset(); useShowroom.setState({ entered: true }); set((s) => ({ active: true, inspection: 'exterior', viewKey: s.viewKey + 1 })); },
  exit: () => set({ active: false }),
  update(patch) {
    if (patch.paint !== undefined && !validColor(patch.paint)) return;
    if (patch.brakeTint !== undefined && patch.brakeTint !== null && !validColor(patch.brakeTint)) return;
    if (patch.upholsteryColor !== undefined && patch.upholsteryColor !== null && !validColor(patch.upholsteryColor)) return;
    if (patch.finish !== undefined && !Object.hasOwn(bodyFinishes, patch.finish)) return;
    if (patch.wheelFinish !== undefined && !Object.hasOwn(wheelFinishes, patch.wheelFinish)) return;
    if (patch.upholsteryFinish !== undefined && !Object.hasOwn(upholsteryFinishes, patch.upholsteryFinish)) return;
    if (patch.trimFinish !== undefined && !Object.hasOwn(trimFinishes, patch.trimFinish)) return;
    set((s) => ({ appearance: { ...s.appearance, ...patch, ...(patch.paint ? { paint: patch.paint.toLowerCase() } : {}) } }));
  },
  inspect(inspection) { useShowroom.setState({ autoRotate: false }); set((s) => ({ inspection, viewKey: s.viewKey + 1 })); },
  reset() { useShowroom.setState({ autoRotate: false }); set((s) => ({ appearance: { ...defaultAppearance }, inspection: 'exterior', viewKey: s.viewKey + 1 })); },
}));
