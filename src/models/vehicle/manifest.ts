import data from './reference-manifest.json' with { type: 'json' };
import type { VehicleManifest } from '../../types/vehicle';
// JSON tuples are structurally validated before any runtime object is registered.
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export const referenceManifest = freeze(data) as unknown as VehicleManifest;
