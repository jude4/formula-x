import { referenceManifest } from '../../models/vehicle/manifest';
import type { Vec3 } from '../../types/vehicle';
export interface SeparationConfig { id: string; vector: Vec3; stage: number }
// Authored WORLD-space offsets in model units. Illustrative presentation, not a service procedure.
export const separationConfig: readonly SeparationConfig[] = [
  { id: 'reference.node.22', vector: [1.15, 0.2, 0.18], stage: 0 },
  { id: 'reference.node.29', vector: [-1.15, 0.2, 0.18], stage: 0 },
  { id: 'reference.node.36', vector: [-1.15, 0.2, -0.18], stage: 0 },
  { id: 'reference.node.43', vector: [1.15, 0.2, -0.18], stage: 0 },
  { id: 'reference.node.24', vector: [1.0, 0, 0], stage: 1 },
  { id: 'reference.node.30', vector: [-1.0, 0, 0], stage: 1 },
  { id: 'reference.node.42', vector: [-1.0, 0, 0], stage: 1 },
  { id: 'reference.node.48', vector: [1.0, 0, 0], stage: 1 },
  { id: 'reference.node.25', vector: [0.55, 0, 0], stage: 2 },
  { id: 'reference.node.34', vector: [-0.55, 0, 0], stage: 2 },
  { id: 'reference.node.37', vector: [-0.55, 0, 0], stage: 2 },
  { id: 'reference.node.47', vector: [0.55, 0, 0], stage: 2 },
  { id: 'reference.node.27', vector: [0.2, 0, 0], stage: 3 },
  { id: 'reference.node.31', vector: [-0.2, 0, 0], stage: 3 },
  { id: 'reference.node.38', vector: [-0.2, 0, 0], stage: 3 },
  { id: 'reference.node.44', vector: [0.2, 0, 0], stage: 3 },
  { id: 'reference.node.50', vector: [0, 1.2, -0.3], stage: 4 },
];
export const separationStages = ['Move wheel assemblies', 'Separate tire geometry', 'Separate rim geometry', 'Separate combined brake geometry', 'Lift steering wheel assembly'] as const;
export const separationIds = new Set(separationConfig.map((c) => c.id));
export function ancestors(id: string): string[] {
  const result: string[] = []; let parent = referenceManifest.components.find((c) => c.id === id)?.parentId;
  while (parent) { result.push(parent); parent = referenceManifest.components.find((c) => c.id === parent)?.parentId; }
  return result;
}
export function descendants(id: string) { return separationConfig.filter((c) => c.id === id || ancestors(c.id).includes(id)).map((c) => c.id); }
