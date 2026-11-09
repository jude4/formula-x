import type { Vec3 } from '../../types/vehicle';
export type Eye = 'driver' | 'passenger';
export type CockpitView = 'driver' | 'steering' | 'dashboard' | 'console' | 'seats';
export const eyePositions: Record<Eye, Vec3> = { driver: [-0.34, 1.1, 0.1], passenger: [0.34, 1.1, 0.1] };
export const cockpitViews: Record<CockpitView, { name: string; eye: Eye; yaw: number; pitch: number; description: string }> = {
  driver: { name: 'Driver view', eye: 'driver', yaw: 0, pitch: -0.2, description: 'Look through the actual reference cockpit from a fixed driver eye point.' },
  steering: { name: 'Steering wheel', eye: 'driver', yaw: 0.015, pitch: -0.6, description: 'Inspect the independently authored steering-wheel assembly and its supplied trim.' },
  dashboard: { name: 'Dashboard region', eye: 'driver', yaw: -0.25, pitch: -0.18, description: 'A view of the supplied dashboard surfaces. Independent gauges and infotainment controls are not authored.' },
  console: { name: 'Centre console region', eye: 'driver', yaw: -1.05, pitch: -0.85, description: 'Inspect the visible console geometry. This view does not represent independently operable switches.' },
  seats: { name: 'Seat surfaces', eye: 'passenger', yaw: 1.25, pitch: -0.5, description: 'Inspect shared seat and upholstery geometry from the passenger eye point.' },
};
export const lookLimits = { yaw: 1.45, minPitch: -0.95, maxPitch: 0.4, minFov: 48, maxFov: 78 };
