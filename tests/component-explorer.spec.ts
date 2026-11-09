import { test, expect } from '@playwright/test';
import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import { highlightComponent } from '../src/features/component-explorer/selection';
import { useExplorer } from '../src/stores/explorer-store';

test('highlight restores source materials and temporary edges; unverified components cannot be selected', () => {
  const material = new MeshStandardMaterial({ color: '#555555' });
  const object = new Mesh(new BoxGeometry(), material);
  const original = material.emissive.clone();
  for (let pass = 0; pass < 5; pass++) {
    const restore = highlightComponent(object);
    expect(object.material).not.toBe(material);
    expect(object.children).toHaveLength(1);
    expect(material.emissive.equals(original)).toBe(true);
    restore(); expect(object.material).toBe(material); expect(object.children).toHaveLength(0);
  }
  useExplorer.getState().setOpen(true);
  useExplorer.getState().select('reference.node.18'); // Merged body is not a selectable panel.
  expect(useExplorer.getState().selectedId).toBeNull();
  useExplorer.getState().select('reference.node.42');
  expect(useExplorer.getState().selectedId).toBe('reference.node.42');
  useExplorer.getState().setOpen(false);
  expect(useExplorer.getState().selectedId).toBeNull();
  let sourceDisposed = false; object.geometry.addEventListener('dispose', () => { sourceDisposed = true; });
  const restoreOutline = highlightComponent(object, { edgeOpacity: 0.08, emissiveIntensity: 0.015 });
  expect(object.children[0].name).toBe('ComponentSelectionEdges');
  restoreOutline(); expect(sourceDisposed).toBe(false); expect(object.material).toBe(material);
  object.geometry.dispose(); material.dispose();
});

async function openExplorer(page: import('@playwright/test').Page) {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeEnabled({ timeout: 60000 });
  await page.getByRole('button', { name: 'Components', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Component explorer' })).toBeVisible();
}

test('search, hierarchy, camera focus, selection restoration and empty results work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await openExplorer(page);
  const search = page.getByRole('searchbox', { name: 'Search components' });
  await search.fill('front left');
  await page.getByRole('button', { name: 'Collapse Front left wheel assembly', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Front left wheel / tire', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Expand Front left wheel assembly', exact: true }).click();
  await page.getByRole('button', { name: 'Front left wheel / tire', exact: true }).click();
  const detail = page.getByRole('region', { name: 'Selected component' });
  await expect(detail.getByRole('heading', { name: 'Front left wheel / tire', exact: true })).toBeVisible();
  await expect(detail.getByText('Not supplied', { exact: true })).toBeVisible();
  await expect(page.locator('.component-label')).toHaveText('Front left wheel / tire');
  await page.getByRole('button', { name: 'Focus component', exact: true }).click();
  await search.fill('no-such-component');
  await expect(page.getByRole('status')).toContainText('No matching components');
  await expect(detail.getByRole('heading', { name: 'Front left wheel / tire', exact: true })).toBeVisible();
  await search.fill('');
  await page.getByRole('button', { name: 'Collapse Front left wheel assembly', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Front left wheel / tire', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Expand Front left wheel assembly', exact: true }).click();
  await page.getByRole('button', { name: 'Clear component selection' }).click();
  await expect(page.locator('.component-label')).not.toBeVisible();
  await page.getByRole('button', { name: 'Close component explorer' }).click();
  await expect(page.getByRole('complementary', { name: 'Component explorer' })).not.toBeVisible();
  await expect(page.getByRole('heading', { name: /BEYOND/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a real frontmost raycast click selects visible geometry and focuses the camera', async ({ page }) => {
  await openExplorer(page);
  const projected = await page.evaluate(async () => {
    const source = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const fiberUrl = source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)?.[1];
    if (!fiberUrl) throw Error('Cannot locate renderer module');
    const fiber = await import(/* @vite-ignore */ fiberUrl);
    const canvas = document.querySelector('canvas')!;
    const state = fiber._roots.get(canvas).store.getState();
    const three = await import(/* @vite-ignore */ '/node_modules/three/build/three.module.js');
    state.scene.updateMatrixWorld(true); state.camera.updateMatrixWorld(true);
    const ids = new Set([24, 30, 42, 48]); let candidate: any;
    state.scene.traverse((o: any) => { if (ids.has(o.userData.sourceNodeIndex) && o.isMesh) candidate = o; });
    const meshes: any[] = []; state.scene.traverse((o: any) => { if (o.isMesh) meshes.push(o); });
    const positions = candidate.geometry.attributes.position;
    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < positions.count; i += Math.max(1, Math.floor(positions.count / 180))) {
      const point = new three.Vector3().fromBufferAttribute(positions, i).applyMatrix4(candidate.matrixWorld).project(state.camera);
      if (Math.abs(point.x) >= 0.95 || Math.abs(point.y) >= 0.95) continue;
      const ray = new three.Raycaster(); ray.setFromCamera({ x: point.x, y: point.y }, state.camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit && ids.has(hit.object.userData.sourceNodeIndex)) return { x: rect.x + (point.x + 1) * rect.width / 2, y: rect.y + (1 - point.y) * rect.height / 2, camera: state.camera.position.toArray() };
    }
    throw Error('No visible tire surface found');
  });
  await page.mouse.click(projected.x, projected.y);
  await expect(page.getByRole('region', { name: 'Selected component' }).getByRole('heading', { name: /tire/ })).toBeVisible();
  await expect(page.locator('.component-label')).toContainText('tire');
  await expect.poll(() => page.evaluate(async (previous) => {
    const source = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const moduleUrl = source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1];
    const { _roots } = await import(/* @vite-ignore */ moduleUrl);
    const current = _roots.get(document.querySelector('canvas')).store.getState();
    const storeUrl = source.match(/from\s+["']([^"']*\/stores\/explorer-store\.ts[^"']*)["']/)![1];
    const { useExplorer } = await import(/* @vite-ignore */ storeUrl);
    const target = useExplorer.getState().focus.target;
    return { moved: current.camera.position.toArray().some((n: number, i: number) => Math.abs(n - previous[i]) > 0.2), focused: current.controls.target.toArray().every((n: number, i: number) => Math.abs(n - target[i]) < 0.08), edges: current.scene.getObjectByName('ComponentSelectionEdges') !== undefined };
  }, projected.camera), { timeout: 10000 }).toEqual({ moved: true, focused: true, edges: true });
  await page.screenshot({ path: '/tmp/formula-x-components-desktop.png' });
});

test('mobile explorer remains navigable and search selects the steering assembly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExplorer(page);
  await page.getByRole('searchbox', { name: 'Search components' }).fill('steering');
  await page.getByRole('button', { name: 'Steering wheel assembly', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Selected component' }).getByRole('heading', { name: 'Steering wheel assembly' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: '/tmp/formula-x-components-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Close component explorer' }).click();
  await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();
});
