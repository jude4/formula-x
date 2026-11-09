import { test, expect } from '@playwright/test';
import { Group, Mesh, BoxGeometry, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import type { Object3D } from 'three';
import { referenceManifest } from '../src/models/vehicle/manifest';
import { createVehicleRegistry } from '../src/models/vehicle/registry';
import { createCustomizationController } from '../src/features/customization/controller';
import { createProjectedGeometry } from '../src/features/customization/projection';
import { createSurfaceTextures } from '../src/features/customization/textures';
import { defaultAppearance } from '../src/features/customization/catalog';
import { useCustomization } from '../src/stores/customization-store';

test('appearance validation rejects invalid input and procedural maps are real deterministic textures', () => {
  useCustomization.getState().reset();
  useCustomization.getState().update({ paint: 'invalid' }); expect(useCustomization.getState().appearance).toEqual(defaultAppearance);
  useCustomization.getState().update({ finish: 'unknown' as never }); expect(useCustomization.getState().appearance).toEqual(defaultAppearance);
  useCustomization.getState().update({ paint: '#AABBCC' }); expect(useCustomization.getState().appearance.paint).toBe('#aabbcc');
  useCustomization.getState().reset();
  const a = createSurfaceTextures(), b = createSurfaceTextures();
  expect(a.weaveColor.image.width).toBe(128); expect(a.weaveColor.image.height).toBe(128);
  const color = (x: number, y: number) => a.weaveColor.image.data[(y * 128 + x) * 4];
  expect(color(1, 1)).not.toBe(color(2, 1)); expect(color(1, 1)).not.toBe(color(1, 2));
  const normal = (x: number, y: number, channel: number) => Math.abs(a.weaveNormal.image.data[(y * 128 + x) * 4 + channel] - 128);
  expect(normal(1, 1, 1)).toBeGreaterThan(normal(1, 1, 0));
  expect(normal(9, 1, 0)).toBeGreaterThan(normal(9, 1, 1));
  expect(a.weaveColor.image.data).toEqual(b.weaveColor.image.data);
  expect(a.weaveNormal.image.data).not.toEqual(a.weaveColor.image.data);
  a.dispose(); b.dispose();
});

test('presentation UV projection retains every source triangle and never mutates the original geometry', () => {
  const source = new BoxGeometry();
  const originalUV = Array.from(source.getAttribute('uv').array);
  const mapped = createProjectedGeometry(source), positions = source.getAttribute('position'), result = mapped.getAttribute('position');
  const index = source.index!;
  expect(mapped).not.toBe(source); expect(mapped.index).toBeNull(); expect(result.count).toBe(index.count);
  for (let i = 0; i < result.count; i++) { expect(result.getX(i)).toBe(positions.getX(index.getX(i))); expect(result.getY(i)).toBe(positions.getY(index.getX(i))); expect(result.getZ(i)).toBe(positions.getZ(index.getX(i))); }
  const uv = mapped.getAttribute('uv');
  const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i)), vs = Array.from({ length: uv.count }, (_, i) => uv.getY(i));
  expect(Math.max(...us) - Math.min(...us)).toBeGreaterThan(0.4); expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(0.4);
  for (let i=0;i<uv.count;i+=3) { const area=(uv.getX(i+1)-uv.getX(i))*(uv.getY(i+2)-uv.getY(i))-(uv.getX(i+2)-uv.getX(i))*(uv.getY(i+1)-uv.getY(i)); expect(Math.abs(area)).toBeGreaterThan(1e-8); }
  expect(Array.from(source.getAttribute('uv').array)).toEqual(originalUV);
  mapped.dispose(); source.dispose();
});

test('material controller targets correct source groups, restores defaults and never mutates originals', () => {
  const root = new Group(), nodes = new Map<number, Object3D>(), originals = new Map<number, MeshStandardMaterial>();
  const geometry = new BoxGeometry(); let sourceGeometryDisposed = false; geometry.addEventListener('dispose', () => { sourceGeometryDisposed = true; });
  for (const c of referenceManifest.components) {
    const material = c.sourceNodeIndex === 18 ? new MeshPhysicalMaterial({ color: '#9a9e96', metalness: 0.88, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }) : new MeshStandardMaterial({ color: '#777777', roughness: 0.5 });
    material.name = c.materials[0] ?? ''; originals.set(c.sourceNodeIndex, material);
    const object = c.meshIndex === null ? new Group() : new Mesh(geometry, material);
    object.userData.sourceNodeIndex = c.sourceNodeIndex; object.position.fromArray(c.originalTransform.position); object.quaternion.fromArray(c.originalTransform.quaternion); object.scale.fromArray(c.originalTransform.scale); nodes.set(c.sourceNodeIndex, object);
  }
  for (const c of referenceManifest.components) (c.parentId ? nodes.get(referenceManifest.components.find((p) => p.id === c.parentId)!.sourceNodeIndex)! : root).add(nodes.get(c.sourceNodeIndex)!);
  const registry = createVehicleRegistry(root, referenceManifest), controller = createCustomizationController(registry);
  const material = (index: number) => (nodes.get(index) as Mesh).material as MeshPhysicalMaterial;
  controller.apply({ ...defaultAppearance, paint: '#b51b28', finish: 'matte', wheelFinish: 'black', brakeTint: '#306bd0', upholsteryColor: '#8c5c38', upholsteryFinish: 'matte', trimFinish: 'carbon' });
  expect(material(18).color.getHexString()).toBe('b51b28'); expect(material(18).roughness).toBe(0.82);
  expect(material(37).color.getHexString()).toBe('191c20'); expect(material(38).color.getHexString()).toBe('306bd0');
  expect(material(8).color.getHexString()).toBe('8c5c38'); expect(material(8).roughness).toBe(0.9);
  expect(material(14).normalMap?.isTexture).toBe(true); expect(material(42).color.getHexString()).toBe('777777');
  expect(originals.get(18)!.color.getHexString()).toBe('9a9e96'); expect(originals.get(37)!.color.getHexString()).toBe('777777');
  controller.apply({ ...defaultAppearance, finish: 'carbon' }); expect((nodes.get(18) as Mesh).geometry).not.toBe(geometry); expect(material(18).map?.isTexture).toBe(true); expect(material(18).normalMap?.isTexture).toBe(true);
  controller.apply({ ...defaultAppearance, finish: 'brushed' }); expect(material(18).anisotropy).toBe(0.8);
  for (let cycle = 0; cycle < 5; cycle++) {
    controller.apply({ ...defaultAppearance }); expect((nodes.get(18) as Mesh).geometry).toBe(geometry); expect(material(18).map).toBeNull(); expect(material(18).normalMap).toBeNull();
    expect(material(18).color.getHexString()).toBe('9a9e96'); expect(material(18).roughness).toBe(0.32); expect(material(37).color.getHexString()).toBe('777777');
    controller.dispose(); expect(material(18)).toBe(originals.get(18));
    controller.apply({ ...defaultAppearance, paint: '#1958bb' }); expect(material(18).color.getHexString()).toBe('1958bb');
  }
  controller.dispose(); expect(sourceGeometryDisposed).toBe(false);
  for (const entry of registry.entries.values()) expect(entry.object.position.toArray()).toEqual(entry.metadata.originalTransform.position);
  originals.forEach((m) => m.dispose()); geometry.dispose();
});
async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const text = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const url = text.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1];
    const { _roots } = await import(/* @vite-ignore */ url); const state = _roots.get(document.querySelector('canvas')).store.getState();
    const result: Record<string, any> = {};
    state.scene.traverse((o: any) => {
      const id = o.userData.sourceNodeIndex; if (typeof id !== 'number') return;
      const m = o.isMesh ? (Array.isArray(o.material) ? o.material[0] : o.material) : null;
      let uvSpan: number[] | null = null;
      if (id === 18 && o.geometry?.userData.fxPresentationUVs) { const uv = o.geometry.attributes.uv; let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity; for(let i=0;i<uv.count;i++){minU=Math.min(minU,uv.getX(i));maxU=Math.max(maxU,uv.getX(i));minV=Math.min(minV,uv.getY(i));maxV=Math.max(maxV,uv.getY(i));} uvSpan=[maxU-minU,maxV-minV]; }
      result[id] = { uvSpan, position: o.position.toArray(), color: m?.color?.getHexString(), roughness: m?.roughness, metalness: m?.metalness, clearcoat: m?.clearcoat, anisotropy: m?.anisotropy, map: m?.map?.name ?? null, normal: m?.normalMap?.name ?? null, roughnessMap: m?.roughnessMap?.name ?? null, uv: o.geometry?.attributes.uv?.count ?? 0 };
    });
    return { nodes: result, camera: state.camera.position.toArray() };
  });
}
async function open(page: import('@playwright/test').Page) {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('button', { name: 'Customize', exact: true })).toBeEnabled({ timeout: 60000 });
  await page.getByRole('button', { name: /Render quality/ }).click(); const original = await snapshot(page);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Customization studio' })).toBeVisible(); return original;
}
test('real vehicle paint, all body finishes and custom colour update actual materials without shader errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && /WebGLProgram|Shader Error|GL_INVALID/.test(message.text())) errors.push(message.text()); });
  const original = await open(page);
  await page.getByRole('button', { name: 'Paint Racing Red', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).nodes['18'].color).toBe('b51b28');
  await page.getByRole('button', { name: 'Matte paint', exact: true }).click(); await expect.poll(async () => (await snapshot(page)).nodes['18'].roughness).toBe(0.82);
  await page.getByRole('button', { name: 'Gloss paint', exact: true }).click(); await expect.poll(async () => (await snapshot(page)).nodes['18'].roughness).toBe(0.15);
  await page.getByRole('button', { name: 'Carbon fibre', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).nodes['18'].map).toBe('FX weave color');
  expect((await snapshot(page)).nodes['18'].uv).toBeGreaterThan(0);
  const span = (await snapshot(page)).nodes['18'].uvSpan; expect(span[0]).toBeGreaterThan(0.1); expect(span[1]).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Brushed metal', exact: true }).click(); await expect.poll(async () => (await snapshot(page)).nodes['18'].anisotropy).toBe(0.8);
  await page.getByRole('button', { name: 'Metallic paint', exact: true }).click();
  await page.getByLabel('Custom body colour').evaluate((input: HTMLInputElement) => { input.value = '#224466'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(async () => (await snapshot(page)).nodes['18'].color).toBe('224466');
  expect((await snapshot(page)).nodes['11']).toEqual(original.nodes['11']);
  await page.screenshot({ path: '/tmp/formula-x-phase6-desktop.png' });
  await page.getByRole('button', { name: 'Reset customization', exact: true }).click();
  expect((await snapshot(page)).nodes).toEqual(original.nodes); expect(errors).toEqual([]);
});
test('wheel, brake and upholstery choices persist into other modes and reset to the reference', async ({ page }) => {
  const original = await open(page);
  await page.getByRole('combobox', { name: 'Wheel finish', exact: true }).selectOption('black');
  await expect.poll(async () => (await snapshot(page)).nodes['37'].color).toBe('191c20');
  expect((await snapshot(page)).nodes['42']).toEqual(original.nodes['42']);
  await page.getByRole('button', { name: 'Brake tint Red', exact: true }).click(); await expect.poll(async () => (await snapshot(page)).nodes['38'].color).toBe('b9292b');
  await page.getByRole('button', { name: 'Upholstery Saddle tan', exact: true }).click(); await expect.poll(async () => (await snapshot(page)).nodes['8'].color).toBe('8c5c38');
  await page.getByRole('combobox', { name: 'Upholstery finish', exact: true }).selectOption('matte'); await expect.poll(async () => (await snapshot(page)).nodes['8'].roughness).toBe(0.9);
  await page.getByRole('combobox', { name: 'Carbon trim appearance', exact: true }).selectOption('carbon'); await expect.poll(async () => (await snapshot(page)).nodes['14'].map).toBe('FX weave color');
  await page.getByRole('button', { name: 'View upholstery', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).camera[1], { timeout: 15000 }).toBeGreaterThan(2.7);
  await page.getByRole('button', { name: 'Engineering', exact: true }).click(); expect((await snapshot(page)).nodes['38'].color).not.toBe(original.nodes['38'].color);
  await page.getByRole('button', { name: 'Customize', exact: true }).click(); await expect(page.getByRole('combobox', { name: 'Wheel finish', exact: true })).toHaveValue('black');
  await page.getByRole('button', { name: 'Reset customization', exact: true }).click(); expect((await snapshot(page)).nodes).toEqual(original.nodes);
  await page.getByRole('button', { name: 'Close customization studio' }).click(); await expect(page.getByRole('complementary', { name: 'Customization studio' })).not.toBeVisible();
});
test('mobile customization supports paint and material controls without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const original = await open(page);
  await page.getByRole('button', { name: 'Paint British Racing Green', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).nodes['18'].color).toBe('16493d');
  await page.getByRole('button', { name: 'Carbon fibre', exact: true }).click(); await expect.poll(async () => (await snapshot(page)).nodes['18'].map).toBe('FX weave color');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: '/tmp/formula-x-phase6-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Reset customization', exact: true }).click(); expect((await snapshot(page)).nodes).toEqual(original.nodes);
});
