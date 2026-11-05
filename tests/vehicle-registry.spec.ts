import { test, expect } from '@playwright/test';
import { Object3D, Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { createVehicleRegistry, validateManifest } from '../src/models/vehicle/registry';
import { referenceManifest } from '../src/models/vehicle/manifest';
function fixture() {
  const root = new Group(); const nodes = new Map<number, Object3D>();
  for (const c of referenceManifest.components) {
    const o = c.meshIndex === null ? new Group() : new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    o.userData.sourceNodeIndex = c.sourceNodeIndex;
    o.position.fromArray(c.originalTransform.position); o.quaternion.fromArray(c.originalTransform.quaternion); o.scale.fromArray(c.originalTransform.scale);
    nodes.set(c.sourceNodeIndex, o);
  }
  for (const c of referenceManifest.components) (c.parentId === null ? root : nodes.get(referenceManifest.components.find((p) => p.id === c.parentId)!.sourceNodeIndex)!).add(nodes.get(c.sourceNodeIndex)!);
  return { root, nodes };
}
test('registry resolves duplicate wheel child names by node identity and restores exact transforms repeatedly', () => {
  const { root } = fixture(); const registry = createVehicleRegistry(root, referenceManifest);
  expect(registry.entries.size).toBe(58);
  const tires = [...registry.entries.values()].filter((e) => e.metadata.sourceName === 'tire');
  expect(tires).toHaveLength(4);
  expect(new Set(tires.map((e) => registry.resolve(e.object)?.metadata.id)).size).toBe(4);
  for (let pass = 0; pass < 20; pass++) {
    for (const { object } of registry.entries.values()) { object.position.addScalar(10); object.rotation.x += 1; object.scale.multiplyScalar(2); object.visible = false; }
    registry.restore();
    for (const { object, metadata } of registry.entries.values()) {
      expect(object.position.toArray()).toEqual(metadata.originalTransform.position);
      expect(object.quaternion.toArray()).toEqual(metadata.originalTransform.quaternion);
      expect(object.scale.toArray()).toEqual(metadata.originalTransform.scale);
      expect(object.visible).toBe(true);
    }
  }
  expect(registry.resolve(registry.entries.get('reference.node.18')!.object)).toBeUndefined();
});
test('rejects stale assets, duplicate identities and false aggregate selection claims', () => {
  const missing = fixture(); missing.nodes.get(42)!.removeFromParent();
  expect(() => createVehicleRegistry(missing.root, referenceManifest)).toThrow('Source node count');
  const changed = fixture(); changed.nodes.get(18)!.position.x += 1;
  expect(() => createVehicleRegistry(changed.root, referenceManifest)).toThrow('Source transform changed');
  const invalid = structuredClone(referenceManifest);
  // Intentionally corrupt JSON as a malformed imported manifest.
  (invalid.components[18] as { selectable: boolean }).selectable = true;
  expect(() => validateManifest(invalid)).toThrow('Unsupported selection claim');
  const duplicate = structuredClone(referenceManifest);
  (duplicate.components[1] as { id: string }).id = duplicate.components[0].id;
  expect(() => validateManifest(duplicate)).toThrow('Duplicate or invalid');
});
test('actual Draco asset binds all manifest nodes and remains independently addressable', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('button', { name: 'Enter the experience' })).toBeEnabled({ timeout: 60000 });
  const result = await page.evaluate(async () => {
    // Import the same Vite-served preparation pipeline used by the showroom.
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { GLTFLoader } = await load('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { DRACOLoader } = await load('/node_modules/three/examples/jsm/loaders/DRACOLoader.js');
    const { prepareReferenceVehicle } = await load('/src/models/vehicle/prepare.ts');
    const decoder = new DRACOLoader().setDecoderPath('/draco/');
    const gltf = await new GLTFLoader().setDRACOLoader(decoder).loadAsync('/models/ferrari.glb');
    const prepared = prepareReferenceVehicle(gltf);
    const entries = [...prepared.registry.entries.values()] as import('../src/models/vehicle/registry').RegisteredComponent[];
    const wheels = entries.filter((e) => e.metadata.sourceName.startsWith('wheel_'));
    const initial = wheels.map((e) => e.object.matrix.toArray());
    for (let pass = 0; pass < 5; pass++) { wheels.forEach((e) => e.object.position.x += 2); prepared.registry.restore(); }
    const restored = wheels.every((e, index) => e.object.matrix.elements.every((n, i) => n === initial[index][i]));
    const resolved = wheels.every((e) => prepared.registry.resolve(e.object)?.metadata.id === e.metadata.id);
    const unchanged = gltf.scene.getObjectByName('body')!.material !== prepared.registry.entries.get('reference.node.18')!.object.material;
    prepared.dispose(); decoder.dispose();
    return { count: entries.length, wheels: wheels.length, restored, resolved, unchanged };
  });
  expect(result).toEqual({ count: 58, wheels: 4, restored: true, resolved: true, unchanged: true });
});
