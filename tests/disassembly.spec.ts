import { test, expect } from '@playwright/test';
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, Vector3 } from 'three';
import type { Object3D } from 'three';
import { referenceManifest } from '../src/models/vehicle/manifest';
import { createVehicleRegistry } from '../src/models/vehicle/registry';
import { createDisassemblyController } from '../src/features/disassembly/controller';
import { separationConfig, ancestors } from '../src/features/disassembly/config';
import { componentHidden, useDisassembly } from '../src/stores/disassembly-store';
function fixture() {
  const root = new Group(), nodes = new Map<number, Object3D>();
  const geometry = new BoxGeometry(), material = new MeshBasicMaterial();
  for (const c of referenceManifest.components) {
    const object = c.meshIndex === null ? new Group() : new Mesh(geometry, material);
    object.userData.sourceNodeIndex = c.sourceNodeIndex;
    object.position.fromArray(c.originalTransform.position); object.quaternion.fromArray(c.originalTransform.quaternion); object.scale.fromArray(c.originalTransform.scale);
    nodes.set(c.sourceNodeIndex, object);
  }
  for (const c of referenceManifest.components) (c.parentId ? nodes.get(referenceManifest.components.find((p) => p.id === c.parentId)!.sourceNodeIndex)! : root).add(nodes.get(c.sourceNodeIndex)!);
  root.rotation.set(0.1, 0.45, 0.2); root.scale.set(1.2, 0.9, 1.1);
  root.updateMatrixWorld(true);
  const registry = createVehicleRegistry(root, referenceManifest);
  const originalWorld = new Map([...registry.entries].map(([id, e]) => [id, e.object.getWorldPosition(new Vector3())]));
  return { root, registry, originalWorld, cleanup: () => { geometry.dispose(); material.dispose(); } };
}
const full = Object.fromEntries(separationConfig.map((c) => [c.id, 1]));
test('world-space vectors respect rotated parents, nesting and repeated exact reassembly', () => {
  const f = fixture(), controller = createDisassemblyController(f.registry, f.root);
  for (let pass = 0; pass < 20; pass++) {
    controller.animate(full, 1.5, true); controller.timeline!.totalProgress(1);
    for (const { object, metadata } of f.registry.entries.values()) {
      const inherited = new Vector3();
      for (const config of separationConfig) if (config.id === metadata.id || ancestors(metadata.id).includes(config.id)) inherited.add(new Vector3(...config.vector).multiplyScalar(1.5));
      const expected = f.originalWorld.get(metadata.id)!.clone().add(inherited);
      expect(object.getWorldPosition(new Vector3()).distanceTo(expected)).toBeLessThan(1e-7);
      expect(object.quaternion.toArray()).toEqual(metadata.originalTransform.quaternion);
      expect(object.scale.toArray()).toEqual(metadata.originalTransform.scale);
    }
    controller.animate({}, 1, true); controller.timeline!.totalProgress(1);
    for (const { object, metadata } of f.registry.entries.values()) expect(object.position.toArray()).toEqual(metadata.originalTransform.position);
  }
  controller.dispose(); f.cleanup();
});
test('interruptions preserve current positions, pause is real, visibility and isolation restore every mesh', () => {
  const f = fixture(); const extra = new Mesh(new BoxGeometry(), new MeshBasicMaterial()); f.registry.entries.get('reference.node.18')!.object.add(extra);
  const controller = createDisassemblyController(f.registry, f.root);
  controller.animate(full, 1, true); controller.timeline!.totalProgress(0.4); controller.pause(true);
  expect(controller.timeline!.paused()).toBe(true);
  const before = [...f.registry.entries.values()].map((e) => e.object.position.toArray());
  controller.animate({}, 1, true);
  expect([...f.registry.entries.values()].map((e) => e.object.position.toArray())).toEqual(before);
  controller.timeline!.totalProgress(1);
  controller.visibility({}, 'reference.node.48'); expect(extra.visible).toBe(false);
  controller.visibility({}, null); expect(extra.visible).toBe(true);
  controller.visibility({ 'reference.node.43': true }, null); expect(f.registry.entries.get('reference.node.43')!.object.visible).toBe(false);
  controller.reset(); expect(f.registry.entries.get('reference.node.43')!.object.visible).toBe(true);
  controller.animate(full, 1); controller.advance(0.3); controller.pause(true);
  const pausedPositions = [...f.registry.entries.values()].map((e) => e.object.position.toArray());
  controller.advance(5); expect([...f.registry.entries.values()].map((e) => e.object.position.toArray())).toEqual(pausedPositions);
  controller.pause(false); controller.advance(5); expect(controller.timeline!.totalProgress()).toBe(1);
  controller.reset();
  expect(() => controller.animate(full, Infinity)).toThrow('Invalid separation distance');
  expect(() => controller.animate({ 'reference.node.48': NaN }, 1)).toThrow('Invalid separation level');
  controller.dispose(); extra.geometry.dispose(); (extra.material as MeshBasicMaterial).dispose(); f.cleanup();
});
test('individual and group state, step limits, hidden ancestors and isolation follow selection', () => {
  const state = useDisassembly.getState(); state.enter(); state.separate('reference.node.48');
  expect(useDisassembly.getState().levels['reference.node.48']).toBe(1);
  state.restore('reference.node.43'); expect(useDisassembly.getState().levels['reference.node.48']).toBe(0);
  state.toggleVisibility('reference.node.43'); expect(componentHidden('reference.node.48', useDisassembly.getState().hidden)).toBe(true);
  state.toggleIsolation('reference.node.48'); expect(componentHidden('reference.node.48', useDisassembly.getState().hidden)).toBe(false);
  state.selectionChanged('reference.node.42'); expect(useDisassembly.getState().isolatedId).toBe('reference.node.42');
  state.setStep(99); expect(useDisassembly.getState().step).toBe(5);
  state.setDistance(-5); expect(useDisassembly.getState().distance).toBe(0);
  state.reset(); expect(useDisassembly.getState().levels).toEqual({}); expect(useDisassembly.getState().isolatedId).toBeNull();
  state.exit();
});
async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const source = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const url = source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1];
    const { _roots } = await import(/* @vite-ignore */ url);
    const state = _roots.get(document.querySelector('canvas')).store.getState();
    const positions: Record<string, number[]> = {}; const visible: number[] = [];
    state.scene.traverse((object: any) => {
      const index = object.userData.sourceNodeIndex;
      if (typeof index !== 'number') return;
      positions[index] = object.position.toArray();
      let shown = true, parent = object; while (parent) { if (!parent.visible) shown = false; parent = parent.parent; }
      if (shown && object.isMesh) visible.push(index);
    });
    return { positions, visible };
  });
}
async function open(page: import('@playwright/test').Page) {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('button', { name: 'Disassembly', exact: true })).toBeEnabled({ timeout: 60000 });
  await page.getByRole('button', { name: /Render quality/ }).click();
  const original = await snapshot(page);
  await page.getByRole('button', { name: 'Disassembly', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Disassembly controls' })).toBeVisible();
  return original;
}
test('real model explodes, pauses, resumes, changes distance, isolates, hides and resets exactly', async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  const original = await open(page);
  await page.evaluate(async () => {
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Explode all')!.click();
    await new Promise((resolve) => setTimeout(resolve, 150));
    document.querySelector<HTMLButtonElement>('[aria-label="Pause disassembly animation"]')!.click();
  });
  await expect(page.getByRole('button', { name: 'Resume disassembly animation' })).toBeVisible();
  const frozen = await snapshot(page); await page.waitForTimeout(400);
  expect((await snapshot(page)).positions).toEqual(frozen.positions);
  await page.getByRole('button', { name: 'Resume disassembly animation' }).click();
  await expect.poll(async () => (await snapshot(page)).positions['43'][0], { timeout: 15000 }).toBeGreaterThan(original.positions['43'][0] + 1.14);
  await page.getByRole('slider', { name: 'Explosion distance' }).focus(); await page.keyboard.press('End');
  await expect.poll(async () => (await snapshot(page)).positions['43'][0], { timeout: 15000 }).toBeGreaterThan(original.positions['43'][0] + 1.72);
  await page.screenshot({ path: '/tmp/formula-x-phase4-desktop.png' });
  await page.getByRole('searchbox', { name: 'Search components' }).fill('front right');
  await page.getByRole('button', { name: 'Front right wheel / tire', exact: true }).click();
  await page.getByRole('button', { name: 'Isolate selected', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([48]);
  await expect(page.locator('.component-label:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hide selected', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([]);
  await expect(page.locator('.component-label:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show selected', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([48]);
  await page.getByRole('button', { name: 'Reset disassembly', exact: true }).click();
  expect((await snapshot(page)).positions).toEqual(original.positions);
  expect((await snapshot(page)).visible).toEqual(original.visible);
  await page.getByRole('button', { name: 'Separate selected', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions['48'][0], { timeout: 15000 }).toBeGreaterThan(original.positions['48'][0] + 0.99);
  expect((await snapshot(page)).positions['43']).toEqual(original.positions['43']);
  await page.getByRole('button', { name: 'Assemble selected', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions['48'], { timeout: 15000 }).toEqual(original.positions['48']);
  await page.getByRole('button', { name: 'Explode all', exact: true }).click();
  await page.getByRole('button', { name: 'Components', exact: true }).click();
  expect((await snapshot(page)).positions).toEqual(original.positions);
  await expect(page.getByRole('region', { name: 'Disassembly controls' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Showroom', exact: true }).click();
  expect((await snapshot(page)).positions).toEqual(original.positions);
  expect(errors).toEqual([]);
});
test('mobile staged disassembly, labels, guides and reassembly remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const original = await open(page);
  await page.getByRole('button', { name: 'Next disassembly step' }).click();
  await expect(page.locator('.sequence-caption')).toHaveText('Move wheel assemblies');
  await expect.poll(async () => (await snapshot(page)).positions['43'][0], { timeout: 15000 }).toBeGreaterThan(original.positions['43'][0] + 1.14);
  await page.getByRole('checkbox', { name: 'Guide lines' }).uncheck();
  await page.getByRole('checkbox', { name: 'Assembly labels' }).uncheck();
  await expect(page.locator('.component-label')).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous assembly step' }).click();
  await expect.poll(async () => (await snapshot(page)).positions, { timeout: 15000 }).toEqual(original.positions);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button', { name: 'Explode all', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions['50'][1], { timeout: 15000 }).toBeGreaterThan(original.positions['50'][1] + 1.19);
  await page.screenshot({ path: '/tmp/formula-x-phase4-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Assemble all', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions, { timeout: 15000 }).toEqual(original.positions);
});
