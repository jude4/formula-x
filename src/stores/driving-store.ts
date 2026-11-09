import { create } from 'zustand';
export type DriveCamera = 'chase' | 'cockpit';
export type DriveGear = 'D' | 'R';
export type DriveInput = 'throttle' | 'brake' | 'left' | 'right';
export const emptyInput = () => ({ throttle: false, brake: false, left: false, right: false });
export interface Telemetry { speed: number; rpm: number; gear: number; distance: number; contacts: number; braking: boolean; offRoad: boolean }
export const idleTelemetry = (): Telemetry => ({ speed: 0, rpm: 0, gear: 0, distance: 0, contacts: 0, braking: true, offRoad: false });
interface DrivingState {
  active: boolean; ready: boolean; error: string | null; engine: boolean; paused: boolean; muted: boolean; camera: DriveCamera; direction: DriveGear;
  input: ReturnType<typeof emptyInput>; telemetry: Telemetry; resetKey: number;
  enter: () => void; exit: () => void; setInput: (key: DriveInput, down: boolean) => void; release: () => void;
  toggleEngine: () => void; togglePause: () => void; toggleCamera: () => void; toggleMute: () => void; setDirection: (gear: DriveGear) => void; reset: () => void;
}
export const useDriving = create<DrivingState>((set, get) => ({
  active: false, ready: false, error: null, engine: false, paused: false, muted: true, camera: 'chase', direction: 'D', input: emptyInput(), telemetry: idleTelemetry(), resetKey: 0,
  enter: () => set(s => ({ active: true, ready: false, error: null, engine: false, paused: false, camera: 'chase', direction: 'D', input: emptyInput(), telemetry: idleTelemetry(), resetKey: s.resetKey + 1 })),
  exit: () => set({ active: false, ready: false, engine: false, paused: false, input: emptyInput(), telemetry: idleTelemetry() }),
  setInput(key, down) { if (!get().active || !get().ready || get().paused || !Object.hasOwn(emptyInput(), key)) return; set(s => ({ input: { ...s.input, [key]: down } })); },
  release: () => set({ input: emptyInput() }),
  toggleEngine() { if (!get().ready || get().paused) return; set(s => ({ engine: !s.engine, input: emptyInput() })); },
  togglePause() { if (get().ready) set(s => ({ paused: !s.paused, input: emptyInput() })); },
  toggleCamera: () => set(s => ({ camera: s.camera === 'chase' ? 'cockpit' : 'chase' })),
  toggleMute: () => set(s => ({ muted: !s.muted })),
  setDirection(direction) { if ((direction === 'D' || direction === 'R') && Math.abs(get().telemetry.speed) < 0.5) set({ direction, input: emptyInput() }); },
  reset: () => set(s => ({ resetKey: s.resetKey + 1, engine: false, paused: false, direction: 'D', input: emptyInput(), telemetry: idleTelemetry() })),
}));
