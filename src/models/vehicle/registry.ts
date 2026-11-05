import { Matrix4, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import type { VehicleComponent, VehicleManifest } from '../../types/vehicle';
export interface RegisteredComponent { readonly metadata: VehicleComponent; readonly object: Object3D }
export interface VehicleRegistry {
  readonly entries: ReadonlyMap<string, RegisteredComponent>;
  resolve: (object: Object3D) => RegisteredComponent | undefined;
  restore: () => void;
}
const finiteTuple = (tuple: readonly number[], length: number) => Array.isArray(tuple) && tuple.length === length && tuple.every(Number.isFinite);
export function validateManifest(manifest: VehicleManifest): void {
  if (manifest.schemaVersion !== 1 || !manifest.components.length) throw Error('Unsupported or empty vehicle manifest');
  const ids = new Map<string, VehicleComponent>(); const indices = new Set<number>();
  for (const c of manifest.components) {
    if (!c.id || ids.has(c.id) || !Number.isInteger(c.sourceNodeIndex) || c.sourceNodeIndex < 0 || indices.has(c.sourceNodeIndex)) throw Error('Duplicate or invalid component identity');
    ids.set(c.id, c); indices.add(c.sourceNodeIndex);
    const t = c.originalTransform;
    if (!finiteTuple(t.position, 3) || !finiteTuple(t.quaternion, 4) || !finiteTuple(t.scale, 3) || !finiteTuple(t.matrix, 16) || t.scale.some((s) => s === 0)) throw Error(`Invalid transform: ${c.id}`);
    const quaternion = new Quaternion(...t.quaternion);
    if (Math.abs(quaternion.length() - 1) > 1e-5) throw Error(`Invalid quaternion: ${c.id}`);
    const recomposed = new Matrix4().compose(new Vector3(...t.position), quaternion, new Vector3(...t.scale));
    if (recomposed.elements.some((v, i) => Math.abs(v - t.matrix[i]) > 1e-5)) throw Error(`Transform matrix mismatch: ${c.id}`);
    if (!finiteTuple(c.pivot.local, 3) || !finiteTuple(c.pivot.sourceWorld, 3)) throw Error(`Invalid pivot: ${c.id}`);
    if (c.explosionVector !== null && !finiteTuple(c.explosionVector, 3)) throw Error(`Invalid explosion vector: ${c.id}`);
    if (c.capabilities.disassemble && (c.explosionVector === null || c.kind === 'material-aggregate')) throw Error(`Unsupported disassembly claim: ${c.id}`);
    if (c.selectable && (!c.capabilities.inspect || c.kind === 'material-aggregate')) throw Error(`Unsupported selection claim: ${c.id}`);
  }
  for (const c of manifest.components) {
    const seen = new Set([c.id]); let parent = c.parentId;
    while (parent !== null) {
      if (!ids.has(parent) || seen.has(parent)) throw Error(`Missing or cyclic parent: ${c.id}`);
      seen.add(parent); parent = ids.get(parent)!.parentId;
    }
  }
}
export function createVehicleRegistry(root: Object3D, manifest: VehicleManifest): VehicleRegistry {
  validateManifest(manifest);
  const entries = new Map<string, RegisteredComponent>();
  const byObject = new WeakMap<Object3D, RegisteredComponent>();
  const byIndex = new Map<number, Object3D>();
  root.traverse((object) => {
    const index: unknown = object.userData.sourceNodeIndex;
    if (typeof index !== 'number') return;
    if (byIndex.has(index)) throw Error(`Duplicate source node ${index}`);
    byIndex.set(index, object);
  });
  if (byIndex.size !== manifest.components.length) throw Error('Source node count does not match manifest');
  for (const metadata of manifest.components) {
    const object = byIndex.get(metadata.sourceNodeIndex);
    if (!object) throw Error(`Missing source node: ${metadata.id}`);
    const expected = new Matrix4().fromArray(metadata.originalTransform.matrix);
    object.updateMatrix();
    if (object.matrix.elements.some((v, i) => Math.abs(v - expected.elements[i]) > 1e-5)) throw Error(`Source transform changed: ${metadata.id}`);
    if (metadata.meshIndex !== null && !(object instanceof Mesh) && !object.children.some((o) => o instanceof Mesh)) throw Error(`Missing geometry: ${metadata.id}`);
    const entry = Object.freeze({ metadata, object }); entries.set(metadata.id, entry); byObject.set(object, entry);
  }
  for (const { metadata, object } of entries.values()) {
    const expectedParent = metadata.parentId === null ? null : entries.get(metadata.parentId)!.object;
    if (expectedParent && object.parent !== expectedParent) throw Error(`Source hierarchy changed: ${metadata.id}`);
  }
  return {
    entries,
    resolve(object) { let current: Object3D | null = object; while (current) { const entry = byObject.get(current); if (entry?.metadata.selectable) return entry; if (current === root) break; current = current.parent; } return undefined; },
    restore() { for (const { object, metadata } of entries.values()) { const t = metadata.originalTransform; object.position.fromArray(t.position); object.quaternion.fromArray(t.quaternion); object.scale.fromArray(t.scale); object.visible = metadata.visible; object.updateMatrix(); } root.updateMatrixWorld(true); },
  };
}
