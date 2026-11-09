import { test, expect } from '@playwright/test';
import { cornerAssemblies, cornerSelectable, defaultLayers, engineeringHidden, engineeringLevels, validateEngineeringCatalog } from '../src/features/engineering/catalog';
import type { Corner } from '../src/features/engineering/catalog';
import { useEngineering } from '../src/stores/engineering-store';
import { useExplorer } from '../src/stores/explorer-store';

test('laboratory catalog resolves real corner children and state prevents cross-corner selection', () => {
  expect(() => validateEngineeringCatalog()).not.toThrow();
  expect(Object.keys(cornerAssemblies)).toHaveLength(4);
  for (const corner of Object.keys(cornerAssemblies) as Corner[]) {
    const c = cornerAssemblies[corner];
    expect(cornerSelectable(corner, c.parts.brake)).toBe(true);
    expect(cornerSelectable(corner, 'reference.node.18')).toBe(false);
    expect(Object.keys(engineeringHidden(corner, defaultLayers))).toHaveLength(5);
    expect(Object.keys(engineeringLevels(corner, true)).sort()).toEqual([c.parts.brake, c.parts.rim, c.parts.tire].sort());
  }
  useExplorer.getState().setOpen(true); useEngineering.getState().enter();
  useExplorer.getState().select(cornerAssemblies['front-left'].parts.brake);
  useExplorer.getState().select(cornerAssemblies['rear-right'].parts.brake);
  expect(useExplorer.getState().selectedId).toBe(cornerAssemblies['front-left'].parts.brake);
  useEngineering.getState().setSeparated(true);
  expect(useEngineering.getState().layers.rim).toBe(true);
  useEngineering.getState().toggleIsolation();
  useEngineering.getState().chooseCorner('rear-right');
  expect(useEngineering.getState().layers).toEqual(defaultLayers);
  expect(useEngineering.getState().separated).toBe(false);
  expect(useEngineering.getState().isolateSelected).toBe(false);
  useExplorer.getState().setOpen(false); expect(useEngineering.getState().active).toBe(false);
});
async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const text = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const url = text.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1];
    const { _roots } = await import(/* @vite-ignore */ url);
    const state = _roots.get(document.querySelector('canvas')).store.getState();
    const positions: Record<string, number[]> = {}; const visible: number[] = [];
    state.scene.traverse((o: any) => {
      const index = o.userData.sourceNodeIndex; if (typeof index !== 'number') return;
      positions[index] = o.position.toArray();
      let shown = true, parent = o; while (parent) { if (!parent.visible) shown = false; parent = parent.parent; }
      if (shown && o.isMesh) visible.push(index);
    });
    return { positions, visible: visible.sort((a, b) => a - b), camera: state.camera.position.toArray(), target: state.controls.target.toArray() };
  });
}
async function open(page: import('@playwright/test').Page) {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('button', { name: 'Engineering', exact: true })).toBeEnabled({ timeout: 60000 });
  await page.getByRole('button', { name: /Render quality/ }).click();
  const original = await snapshot(page);
  await page.getByRole('button', { name: 'Engineering', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Engineering laboratory' })).toBeVisible();
  return original;
}
test('actual brake lab switches corners, layers and isolation, then restores the showroom', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  const original = await open(page);
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([38]);
  const info = page.getByRole('region', { name: 'Laboratory component information' });
  await expect(info.getByText('Not supplied', { exact: true })).toBeVisible();
  for (const [corner, brake] of [['front-right', 44], ['rear-left', 31], ['rear-right', 27]] as const) {
    await page.getByRole('combobox', { name: 'Laboratory wheel corner' }).selectOption(corner);
    await expect.poll(async () => (await snapshot(page)).visible).toEqual([brake]);
  }
  await page.getByRole('combobox', { name: 'Laboratory wheel corner' }).selectOption('front-left');
  await page.getByRole('button', { name: 'Show wheel assembly', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([37, 38, 39, 40, 41, 42]);
  await page.getByRole('checkbox', { name: 'Tire geometry', exact: true }).uncheck();
  await expect.poll(async () => (await snapshot(page)).visible.includes(42)).toBe(false);
  await page.getByRole('button', { name: 'Rim geometry', exact: true }).click();
  await page.getByRole('button', { name: 'Isolate selected part', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([37]);
  await page.getByRole('button', { name: 'Combined brake geometry', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([38]);
  await page.getByRole('button', { name: 'Fit wheel assembly', exact: true }).click();
  await expect.poll(async () => Math.abs((await snapshot(page)).target[0] - original.positions['36'][0]), { timeout: 15000 }).toBeLessThan(0.1);
  await page.screenshot({ path: '/tmp/formula-x-phase5-desktop.png' });
  await expect(page.getByRole('region', { name: 'Systems awaiting assets' }).getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Close engineering laboratory' }).click();
  expect((await snapshot(page)).positions).toEqual(original.positions);
  expect((await snapshot(page)).visible).toEqual(original.visible);
  expect(errors).toEqual([]);
});
test('lab separation uses real corner geometry, pauses, assembles and restores when changing modes', async ({ page }) => {
  const original = await open(page);
  await page.evaluate(async () => {
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Separate assembly')!.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    document.querySelector<HTMLButtonElement>('[aria-label="Pause laboratory animation"]')!.click();
  });
  await expect(page.getByRole('button', { name: 'Resume laboratory animation' })).toBeVisible();
  const frozen = await snapshot(page); await page.waitForTimeout(300);
  expect((await snapshot(page)).positions).toEqual(frozen.positions);
  await page.getByRole('button', { name: 'Resume laboratory animation' }).click();
  await expect.poll(async () => (await snapshot(page)).positions['42'][0], { timeout: 15000 }).toBeLessThan(original.positions['42'][0] - 0.99);
  expect((await snapshot(page)).positions['36']).toEqual(original.positions['36']);
  expect((await snapshot(page)).positions['48']).toEqual(original.positions['48']);
  await page.getByRole('slider', { name: 'Laboratory separation distance' }).focus(); await page.keyboard.press('End');
  await expect.poll(async () => (await snapshot(page)).positions['42'][0], { timeout: 15000 }).toBeLessThan(original.positions['42'][0] - 1.49);
  await page.getByRole('button', { name: 'Assemble assembly', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions, { timeout: 15000 }).toEqual(original.positions);
  await page.getByRole('button', { name: 'Separate assembly', exact: true }).click();
  await page.getByRole('button', { name: 'Disassembly', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Disassembly controls' })).toBeVisible();
  expect((await snapshot(page)).positions).toEqual(original.positions);
  expect((await snapshot(page)).visible).toEqual(original.visible);
});
test('mobile brake study supports corner selection, separation and reset without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const original = await open(page);
  await page.getByRole('combobox', { name: 'Laboratory wheel corner' }).selectOption('rear-right');
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([27]);
  await page.getByRole('button', { name: 'Separate assembly', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions['24'][0], { timeout: 15000 }).toBeGreaterThan(original.positions['24'][0] + 0.99);
  await page.getByRole('button', { name: 'Reset laboratory', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).positions).toEqual(original.positions);
  await expect.poll(async () => (await snapshot(page)).visible).toEqual([27]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: '/tmp/formula-x-phase5-mobile.png', fullPage: true });
});
