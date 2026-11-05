import { create } from 'zustand';
export type CameraView = 'hero' | 'front' | 'rear' | 'side';
interface ShowroomState {
  entered: boolean; autoRotate: boolean; view: CameraView; resetKey: number; quality: 'high' | 'balanced';
  enter: () => void; setView: (view: CameraView) => void; toggleRotate: () => void; reset: () => void; toggleQuality: () => void;
}
export const useShowroom = create<ShowroomState>((set) => ({
  entered: false, autoRotate: false, view: 'hero', resetKey: 0, quality: 'high',
  enter: () => set({ entered: true }),
  setView: (view) => set((s) => ({ view, autoRotate: false, resetKey: s.resetKey + 1 })),
  toggleRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  reset: () => set((s) => ({ view: 'hero', autoRotate: false, resetKey: s.resetKey + 1 })),
  toggleQuality: () => set((s) => ({ quality: s.quality === 'high' ? 'balanced' : 'high' })),
}));
