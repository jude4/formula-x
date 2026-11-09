import { test, expect } from '@playwright/test';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, PlaneGeometry, MeshStandardMaterial } from 'three';
import { measureClearance, safeNearPlane } from '../src/features/cockpit/safety';
import { useCockpit } from '../src/stores/cockpit-store';

test('triangle clearance includes world transforms and near-plane corners remain inside clearance', () => {
  const root = new Group(), geometry = new PlaneGeometry(4, 4), material = new MeshStandardMaterial();
  root.add(new Mesh(geometry, material)); root.position.z = 2;
  expect(measureClearance(root, [[0, 0, 2.2], [0, 0, 2]])[0]).toBeCloseTo(0.2, 8);
  expect(measureClearance(root, [[0, 0, 2]])[0]).toBe(0);
  for (const aspect of [0.5, 1, 3, 8]) for (const fov of [48, 68, 78]) {
    const corner = safeNearPlane(0.1, fov, aspect) * Math.sqrt(1 + Math.tan(fov * Math.PI / 360) ** 2 * (1 + aspect ** 2));
    expect(corner).toBeLessThanOrEqual(0.04500001);
  }
  const collapsed = new BufferGeometry(); collapsed.setAttribute('position', new Float32BufferAttribute([0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0, 1,0,0], 3));
  const degenerate = new Group(); degenerate.add(new Mesh(collapsed, material));
  expect(measureClearance(degenerate, [[0.5, 0.2, 0]])[0]).toBeCloseTo(0.2, 8);
  collapsed.dispose(); geometry.dispose(); material.dispose();
});
test('look controls clamp finite input and refuse unsafe camera anchors', () => {
  useCockpit.setState({ safety: { driver: { safe: true, position: [0, 1, 0], clearance: 0.2 }, passenger: { safe: false, position: [1, 1, 0], clearance: 0 } } });
  const s = useCockpit.getState(); s.enter(); s.look(100, -100); s.setFov(100); s.setBrightness(100);
  expect(useCockpit.getState()).toMatchObject({ yaw: 1.45, pitch: -0.95, fov: 78, brightness: 3 });
  s.setView('seats'); expect(useCockpit.getState().view).toBe('driver');
  s.look(NaN, 0); s.setFov(Infinity); expect(useCockpit.getState().yaw).toBe(1.45); expect(useCockpit.getState().fov).toBe(78);
  s.reset(); expect(useCockpit.getState()).toMatchObject({ view: 'driver', yaw: 0, pitch: -0.2, fov: 68, lights: false, highlight: false }); s.exit();
});
async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const source = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const url = source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1];
    const { _roots } = await import(/* @vite-ignore */ url); const state = _roots.get(document.querySelector('canvas')).store.getState();
    const storeURL = source.match(/from\s+["']([^"']*\/stores\/cockpit-store\.ts[^"']*)["']/)![1];
    const { useCockpit } = await import(/* @vite-ignore */ storeURL);
    const s = useCockpit.getState(); const nodes: Record<number, any> = {}; let outlines = 0;
    state.scene.traverse((o: any) => { if (o.name === 'CockpitSteeringOutline') outlines++; const id = o.userData.sourceNodeIndex; if (typeof id !== 'number') return; let mesh = o; if (!o.isMesh) o.traverse((c: any) => { if (c.isMesh) mesh = c; }); const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material; nodes[id] = { position: o.position.toArray(), rotation: o.quaternion.toArray(), scale: o.scale.toArray(), intensity: m?.emissiveIntensity, material: m?.uuid, color: m?.color?.getHexString() }; });
    return { camera: state.camera.position.toArray(), near: state.camera.near, fov: state.camera.fov, rotation: state.camera.rotation.toArray(), controls: !!state.controls, safety: s.safety, yaw: s.yaw, pitch: s.pitch, active: s.active, view: s.view, nodes, outlines };
  });
}
async function open(page: import('@playwright/test').Page) {
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('button', { name: 'Cockpit', exact: true })).toBeEnabled({ timeout: 60000 });
  const original = await snapshot(page);
  await page.getByRole('button', { name: 'Cockpit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Driver view', exact: true })).toBeEnabled({ timeout: 30000 });
  await expect.poll(async () => (await snapshot(page)).near).toBeLessThan(0.03);
  return original;
}
test('actual cockpit keeps safe fixed eyes during drag, keyboard and optical zoom', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page); const initial = await snapshot(page);
  expect(initial.safety.driver.safe).toBe(true); expect(initial.safety.passenger.safe).toBe(true);
  expect(initial.camera).toEqual(initial.safety.driver.position); expect(initial.controls).toBe(false);
  const canvas = page.locator('canvas'), box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down(); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .7, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => (await snapshot(page)).yaw).toBeLessThan(-0.1);
  const afterDrag = await snapshot(page); expect(afterDrag.camera).toEqual(initial.camera);
  await canvas.focus(); await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await snapshot(page)).yaw).toBeGreaterThan(afterDrag.yaw);
  await page.getByRole('slider', { name: 'Cockpit view width' }).fill('48');
  await expect.poll(async () => (await snapshot(page)).fov).toBe(48); expect((await snapshot(page)).camera).toEqual(initial.camera);
  await page.getByRole('button', { name: 'Seat surfaces', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).camera).toEqual(initial.safety.passenger.position);
  await page.getByRole('button', { name: 'Centre console region', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).camera).toEqual(initial.camera);
  await page.screenshot({ path: '/tmp/formula-x-phase7-desktop.png' });
  expect(errors).toEqual([]);
});
test('steering highlight and actual light emission restore exactly on cockpit exit', async ({ page }) => {
  const original = await open(page);
  await page.getByRole('button', { name: 'Inspect steering assembly', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).outlines).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Switch steering lights on', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).nodes[56].intensity).toBe(1.5);
  await page.getByRole('slider', { name: 'Steering preview brightness' }).fill('2.7');
  await expect.poll(async () => (await snapshot(page)).nodes[56].intensity).toBe(2.7);
  const lit = await snapshot(page); expect(lit.nodes[56].material).not.toBe(original.nodes[56].material);
  for (const id of Object.keys(original.nodes)) { const index = Number(id); expect(lit.nodes[index].position).toEqual(original.nodes[index].position); expect(lit.nodes[index].rotation).toEqual(original.nodes[index].rotation); expect(lit.nodes[index].scale).toEqual(original.nodes[index].scale); }
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await snapshot(page)).active).toBe(false);
  await expect.poll(async () => (await snapshot(page)).nodes[56].material).toBe(original.nodes[56].material);
  expect((await snapshot(page)).outlines).toBe(0); expect((await snapshot(page)).near).toBe(0.1);
  await page.getByRole('button', { name: 'Cockpit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Switch steering lights on', exact: true })).toBeVisible();
});
test('mobile cockpit has usable safe views and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  await page.getByRole('button', { name: 'Steering wheel', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).view).toBe('steering');
  await page.getByRole('button', { name: 'Seat surfaces', exact: true }).click();
  const s = await snapshot(page); expect(s.camera).toEqual(s.safety.passenger.position);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/formula-x-phase7-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Exit cockpit inspection' }).click();
  await expect.poll(async () => (await snapshot(page)).near).toBe(0.1);
});
test('frontmost steering geometry is clickable and customization survives cockpit mode changes', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Steering wheel', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).rotation[0]).toBeCloseTo(-0.6, 4);
  const point = await page.evaluate(async () => {
    const source = await (await fetch('/src/three/scenes/Showroom.tsx')).text();
    const { _roots } = await import(/* @vite-ignore */ source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1]);
    const canvas = document.querySelector('canvas')!, state = _roots.get(canvas).store.getState(); const rect = canvas.getBoundingClientRect();
    for (let y = -0.9; y < 0.9; y += 0.06) for (let x = -0.9; x < 0.9; x += 0.06) {
      state.raycaster.setFromCamera({ x, y }, state.camera);
      const front = state.raycaster.intersectObject(state.scene.getObjectByName('ShowroomPlacement'), true).find((h: any) => { let o = h.object; while(o) { if (!o.visible) return false; o=o.parent; } return true; });
      let object = front?.object;
      while (object) { if (object.userData.sourceNodeIndex === 50) return { x: rect.x + (x+1)*rect.width/2, y: rect.y + (1-y)*rect.height/2 }; object = object.parent; }
    }
    return null;
  });
  expect(point).not.toBeNull(); await page.mouse.click(point!.x, point!.y);
  await expect.poll(async () => (await snapshot(page)).view).toBe('steering');
  await expect.poll(async () => (await snapshot(page)).outlines).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await page.getByRole('button', { name: 'Upholstery Saddle tan', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).nodes[8].color).toBe('8c5c38');
  await page.getByRole('button', { name: 'Cockpit', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).near).toBeLessThan(0.03);
  expect((await snapshot(page)).nodes[8].color).toBe('8c5c38');
  await page.getByRole('button', { name: 'Disassembly', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).active).toBe(false);
  expect((await snapshot(page)).near).toBe(0.1); expect((await snapshot(page)).nodes[8].color).toBe('8c5c38');
});
