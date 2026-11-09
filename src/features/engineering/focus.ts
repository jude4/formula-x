import { Vector3 } from 'three';
import type { VehicleRegistry } from '../../models/vehicle/registry';
import type { CameraView } from '../../stores/showroom-store';
import { cornerAssemblies } from './catalog';
import type { Corner } from './catalog';
export function engineeringFocus(registry: VehicleRegistry, corner: Corner, separated: boolean, distance: number, view: CameraView, request: number) {
  const assembly = registry.entries.get(cornerAssemblies[corner].assembly);
  if (!assembly) throw Error('Laboratory assembly missing');
  const side = corner.endsWith('left') ? -1 : 1;
  const target = assembly.object.getWorldPosition(new Vector3());
  if (separated) target.x += side * distance * 0.45;
  const directions = { hero: [side, 0.4, 0.7], front: [side * 0.15, 0.3, -1], rear: [side * 0.15, 0.3, 1], side: [side, 0.15, 0] };
  const direction = new Vector3().fromArray(directions[view]).normalize();
  const position = target.clone().addScaledVector(direction, separated ? 2.6 + distance : 1.8);
  return { target: target.toArray(), position: position.toArray(), request };
}
