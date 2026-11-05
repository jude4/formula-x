import { referenceManifest } from '../../models/vehicle/manifest';
import type { VehicleComponent } from '../../types/vehicle';
export const inspectableComponents = referenceManifest.components.filter((c) => c.selectable);
export const componentById = new Map(inspectableComponents.map((c) => [c.id, c]));
export function componentDetails(component: VehicleComponent) {
  if (component.sourceName.startsWith('wheel_')) return { role: 'Wheel assembly', description: 'Groups the rim, tire, and combined brake geometry at this corner of the reference vehicle.' };
  if (component.sourceName.startsWith('rim_')) return { role: 'Rim geometry', description: 'The independently addressable rim surface. Wheel dimensions, alloy composition, and load ratings are not supplied with this reference asset.' };
  if (component.sourceName === 'tire') return { role: 'Tire geometry', description: 'The outer rolling surface of this wheel. Compound, pressure, and performance specifications are not supplied.' };
  if (component.sourceName === 'brake') return { role: 'Combined brake geometry', description: 'Brake geometry is available as one component at this wheel. The disc and caliper are not independently separated in this asset.' };
  return { role: 'Steering wheel assembly', description: 'The reference vehicle’s steering wheel and associated trim. Articulation and cockpit controls are not implemented in this phase.' };
}
export function shortComponentName(component: VehicleComponent) {
  return component.displayName.includes(' / ') ? component.displayName.split(' / ')[1] : component.displayName;
}
export function relatedComponents(component: VehicleComponent) {
  return inspectableComponents.filter((c) => c.id !== component.id && (c.parentId === component.id || c.id === component.parentId || (c.parentId === component.parentId && component.kind !== 'assembly')));
}
