import { useDriving } from '../src/stores/driving-store';
import { Vector3 } from 'three';
import { test, expect } from '@playwright/test';
import type { DriverCommand } from '../src/features/driving/physics';
import { createDrivingPhysics, initializePhysics } from '../src/features/driving/physics';
import { track } from '../src/features/driving/track';
const wheels = [
  { x: -.84, y: .383, z: -1.155, radius: .35, front: true },
  { x: .83, y: .385, z: -1.155, radius: .35, front: true },
  { x: -.82, y: .383, z: 1.495, radius: .35, front: false },
  { x: .82, y: .383, z: 1.495, radius: .35, front: false },
];
const idle = { engine: true, throttle: 0, brake: 1, steer: 0, direction: 'D' as const };
function simulate(physics: ReturnType<typeof createDrivingPhysics>, seconds: number, command: DriverCommand = idle, hz = 60) { for (let i = 0; i < seconds * hz; i++) physics.advance(1 / hz, command); }
test('Rapier suspension supports the car; rear-wheel forces accelerate, brake and reverse', async () => {
  await initializePhysics(); const physics = createDrivingPhysics(wheels);
  try {
    simulate(physics, 2);
    expect(physics.telemetry().contacts).toBe(4); expect(physics.body.translation().y).toBeGreaterThan(.3);
    simulate(physics, 3, { ...idle, throttle: 1, brake: 0 });
    expect(physics.telemetry().speed).toBeGreaterThan(5); expect(physics.body.translation().z).toBeLessThan(track.spawn.z - 5);
    expect(physics.telemetry().gear).toBeGreaterThan(1);
    const spinning = physics.vehicle.wheelRotation(2); expect(Math.abs(spinning!)).toBeGreaterThan(1);
    const coastingSpeed = physics.telemetry().speed;
    simulate(physics, .25, { ...idle, engine: false, brake: 0 });
    expect(physics.telemetry().speed).toBeGreaterThan(coastingSpeed * .8); expect(physics.telemetry().rpm).toBe(0);
    simulate(physics, 2); expect(Math.abs(physics.telemetry().speed)).toBeLessThan(.5);
    simulate(physics, 2, { ...idle, direction: 'R', throttle: 1, brake: 0 }); expect(physics.telemetry().speed).toBeLessThan(-1);
  } finally { physics.dispose(); }
});
test('fixed integration is frame-rate independent and steering produces a physical turn', async () => {
  await initializePhysics(); const a = createDrivingPhysics(wheels), b = createDrivingPhysics(wheels);
  try {
    simulate(a, 2); simulate(b, 2); const command = { ...idle, throttle: 1, brake: 0 };
    simulate(a, 2, command, 30); simulate(b, 2, command, 120);
    expect(a.body.translation().z).toBeCloseTo(b.body.translation().z, 4);
    simulate(a, 1, { ...command, steer: .7 });
    expect(Math.abs(a.body.rotation().y)).toBeGreaterThan(.05); expect(a.body.translation().x).toBeLessThan(track.spawn.x - .2);
  } finally { a.dispose(); b.dispose(); }
});
test('collision barriers stop the rigid body and the vehicle can complete the circuit', async () => {
  await initializePhysics(); const physics = createDrivingPhysics(wheels);
  try {
    simulate(physics, 1);
    physics.body.setTranslation({ x: 38, y: .55, z: 0 }, true); physics.body.setLinvel({ x: 18, y: 0, z: 0 }, true);
    simulate(physics, .5); expect(physics.body.translation().x).toBeLessThan(39.15);
    const chase = physics.resolveCamera(new Vector3(45, .8, 0), new Vector3(32, .8, 0)); expect(chase.x).toBeLessThan(39.6);
    physics.reset(); simulate(physics, 1);
    const { circuit } = await import('../src/features/driving/track'); const points = circuit(32, 1);
    let last = 16, progress = 0, maxRoadError = 0;
    for (let i = 0; i < 60 * 85; i++) {
      const pos = physics.body.translation(), q = physics.body.rotation();
      let nearest = 0, min = Infinity;
      for (let n = 0; n < points.length; n++) { const d = Math.hypot(pos.x-points[n].x,pos.z-points[n].z); if(d<min){min=d;nearest=n;} }
      maxRoadError = Math.max(maxRoadError, min);
      let change = nearest-last; if(change < -points.length/2) change += points.length; if(change > points.length/2) change -= points.length;
      progress += change; last = nearest;
      const target = points[(nearest+7)%points.length];
      const yaw = Math.atan2(2*(q.w*q.y+q.x*q.z),1-2*(q.y*q.y+q.z*q.z));
      const desired = Math.atan2(-(target.x-pos.x),-(target.z-pos.z));
      const error = Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));
      const speed = physics.telemetry().speed;
      physics.advance(1/60,{ ...idle, throttle: Math.max(0,Math.min(1,(6-speed)*.5)), brake: speed>7 ? .2 : 0, steer: Math.max(-1,Math.min(1,error*2)) });
      if(progress > points.length) break;
    }
    expect(progress).toBeGreaterThan(points.length); expect(maxRoadError).toBeLessThan(5.5);
  } finally { physics.dispose(); }
});
async function snapshot(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const source = await (await fetch('/src/features/driving/Driving.tsx')).text();
    const fiberURL = source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1];
    const { _roots } = await import(/* @vite-ignore */ fiberURL); const state = _roots.get(document.querySelector('canvas')).store.getState();
    const storeURL = source.match(/from\s+["']([^"']*\/stores\/driving-store\.ts[^"']*)["']/)![1];
    const { useDriving } = await import(/* @vite-ignore */ storeURL); const s = useDriving.getState();
    const chassis = state.scene.getObjectByName('DrivingChassis') ?? state.scene, physics = chassis.userData.physics; const nodes: Record<number, any> = {}; const spins: number[][] = [];
    chassis.traverse((o: any) => { if(o.name.startsWith('DriveWheelSpin:')) spins.push(o.quaternion.toArray()); if(typeof o.userData.sourceNodeIndex!=='number') return; const m=o.isMesh?(Array.isArray(o.material)?o.material[0]:o.material):null; nodes[o.userData.sourceNodeIndex]={position:o.position.toArray(),quaternion:o.quaternion.toArray(),color:m?.color?.getHexString(),emission:m?.emissiveIntensity}; });
    return { active:s.active, ready:s.ready, engine:s.engine, input:s.input, direction:s.direction, paused:s.paused, muted:s.muted, cameraMode:s.camera, telemetry:s.telemetry, pose:chassis.position.toArray(), quaternion:chassis.quaternion.toArray(), camera:state.camera.position.toArray(), near:state.camera.near, nodes, spins, contacts:physics?.telemetry().contacts, wheels:physics?.wheels, suspension:physics?.wheels.map((_:any,i:number)=>physics.vehicle.wheelSuspensionLength(i)) };
  });
}
async function open(page: import('@playwright/test').Page) {
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('button',{name:'Drive',exact:true})).toBeEnabled({timeout:60000});
  await page.getByRole('button',{name:/Render quality/}).click();
  await page.getByRole('button',{name:'Drive',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start engine',exact:true})).toBeEnabled({timeout:60000});
  await expect.poll(async()=>(await snapshot(page)).contacts,{timeout:15000}).toBe(4);
}
test('actual reference drives with wheel spin, braking, reverse, safe cockpit and exact mode restoration', async ({page})=>{
  test.setTimeout(180000); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await open(page); const initial=await snapshot(page);
  expect(initial.muted).toBe(true); expect(initial.wheels.every((w:any)=>w.radius>.25&&w.radius<.45)).toBe(true);
  await page.getByRole('button',{name:'Start engine',exact:true}).click();
  await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await snapshot(page)).telemetry.speed,{timeout:30000}).toBeGreaterThan(4);
  await expect(page.getByRole('button',{name:'R',exact:true})).toBeDisabled();
  await page.keyboard.up('KeyW'); const moving=await snapshot(page);
  expect(moving.pose[2]).toBeLessThan(initial.pose[2]-1); expect(moving.spins).not.toEqual(initial.spins);
  await page.keyboard.down('KeyA'); await page.keyboard.down('KeyW');
  await expect.poll(async()=>Math.abs((await snapshot(page)).quaternion[1]),{timeout:15000}).toBeGreaterThan(.04);
  const turning=await snapshot(page); expect(turning.nodes[36].quaternion).not.toEqual(initial.nodes[36].quaternion);
  expect(turning.nodes[38].quaternion).toEqual(initial.nodes[38].quaternion);
  await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW');
  await page.keyboard.down('Space'); await expect.poll(async()=>Math.abs((await snapshot(page)).telemetry.speed),{timeout:20000}).toBeLessThan(.4);
  await expect.poll(async()=>(await snapshot(page)).nodes[3].emission).toBe(2.5); await page.keyboard.up('Space');
  await page.getByRole('button',{name:'R',exact:true}).click(); await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await snapshot(page)).telemetry.speed,{timeout:20000}).toBeLessThan(-1);
  await page.keyboard.up('KeyW'); await page.getByRole('button',{name:'Pause driving',exact:true}).click();
  const paused=await snapshot(page); await page.waitForTimeout(500); expect((await snapshot(page)).pose).toEqual(paused.pose);
  await page.getByRole('button',{name:'Switch driving camera',exact:true}).click();
  await expect.poll(async()=>(await snapshot(page)).near).toBeLessThan(.03); const cockpit=await snapshot(page);
  expect(cockpit.cameraMode).toBe('cockpit'); expect(cockpit.camera.every(Number.isFinite)).toBe(true);
  await page.getByRole('button',{name:'Unmute engine sound',exact:true}).click(); await expect(page.getByRole('button',{name:'Mute engine sound',exact:true})).toBeVisible();
  await page.screenshot({path:'/tmp/formula-x-phase8-cockpit.png'});
  await page.getByRole('button',{name:'Reset vehicle to track',exact:true}).click();
  await expect.poll(async()=>(await snapshot(page)).pose[2]).toBeCloseTo(24,1);
  await expect(page.getByRole('button',{name:'Start engine',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Switch driving camera',exact:true}).click();
  await page.screenshot({path:'/tmp/formula-x-phase8-desktop.png'});
  await page.getByRole('button',{name:'Components',exact:true}).click();
  await expect(page.getByRole('complementary',{name:'Component explorer'})).toBeVisible();
  await page.getByRole('button',{name:'Steering wheel assembly',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Steering wheel assembly'})).toBeVisible();
  await expect.poll(async()=>page.evaluate(async()=>{
    const source=await(await fetch('/src/features/driving/Driving.tsx')).text();
    const {_roots}=await import(/* @vite-ignore */ source.match(/from\s+["']([^"']*react-three_fiber[^"']*)["']/)![1]);
    const state=_roots.get(document.querySelector('canvas'))?.store.getState(); let loaded=false;
    state?.scene.traverse((o:any)=>{if(o.userData.sourceNodeIndex===36)loaded=true;}); return loaded;
  }),{timeout:30000}).toBe(true);
  const restored = await snapshot(page); expect(restored.near).toBe(.1); expect(restored.spins).toHaveLength(0);
  expect(restored.nodes[36].quaternion).toEqual(initial.nodes[36].quaternion); expect(restored.nodes[3].emission).not.toBe(2.5);
  expect(errors).toEqual([]);
});
test('mobile press-and-hold controls release on cancel; appearance survives driving and exit',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await open(page);
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  await page.getByRole('button',{name:'Paint Racing Red',exact:true}).click();
  await page.getByRole('button',{name:'Drive',exact:true}).click();
  await expect(page.getByRole('button',{name:'Start engine',exact:true})).toBeEnabled({timeout:60000});
  await expect.poll(async()=>(await snapshot(page)).nodes[18].color).toBe('b51b28');
  await page.getByRole('button',{name:'Start engine',exact:true}).click();
  const go=page.getByRole('button',{name:'Accelerate',exact:true}); await go.scrollIntoViewIfNeeded(); const box=(await go.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  await expect.poll(async()=>(await snapshot(page)).telemetry.speed,{timeout:30000}).toBeGreaterThan(1);
  await page.mouse.move(5,5); await page.mouse.up();
  await expect.poll(async()=>(await snapshot(page)).input.throttle).toBe(false);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2); await page.mouse.down();
  await expect.poll(async()=>(await snapshot(page)).input.throttle).toBe(true);
  await go.dispatchEvent('pointercancel',{pointerId:1}); await page.mouse.up();
  await expect.poll(async()=>(await snapshot(page)).input.throttle).toBe(false);
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:0}]});
  await expect.poll(async()=>(await snapshot(page)).input.throttle).toBe(true);
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>(await snapshot(page)).input.throttle).toBe(false);
  await page.screenshot({path:'/tmp/formula-x-phase8-mobile.png',fullPage:true});
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect.poll(async()=>(await snapshot(page)).paused).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'/tmp/formula-x-phase8-mobile-paused.png',fullPage:true});
  await page.getByRole('button',{name:'Exit driving mode'}).click();
  await expect(page.getByRole('button',{name:'Perspective',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Customize',exact:true}).click();
  await expect(page.getByRole('button',{name:'Paint Racing Red',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect.poll(async()=>(await snapshot(page)).nodes[18].color).toBe('b51b28');
});
test('driving state releases controls on pause/exit and locks direction while moving',()=>{
  const s=useDriving.getState(); s.enter(); s.setInput('throttle',true); expect(useDriving.getState().input.throttle).toBe(false);
  useDriving.setState({ready:true}); s.setInput('throttle',true); expect(useDriving.getState().input.throttle).toBe(true);
  s.togglePause(); expect(useDriving.getState().input.throttle).toBe(false); s.setInput('throttle',true); expect(useDriving.getState().input.throttle).toBe(false);
  useDriving.setState({telemetry:{...useDriving.getState().telemetry,speed:5}}); s.setDirection('R'); expect(useDriving.getState().direction).toBe('D');
  useDriving.setState({telemetry:{...useDriving.getState().telemetry,speed:0}}); s.setDirection('R'); expect(useDriving.getState().direction).toBe('R');
  s.togglePause(); s.toggleEngine(); expect(useDriving.getState().engine).toBe(true); s.setInput('throttle',true); s.exit();
  expect(useDriving.getState()).toMatchObject({active:false,engine:false,input:{throttle:false,brake:false,left:false,right:false}});
});
