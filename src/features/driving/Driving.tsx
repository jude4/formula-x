import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, useGLTF } from '@react-three/drei';
import { Group, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { prepareReferenceVehicle } from '../../models/vehicle/prepare';
import { useCustomization } from '../../stores/customization-store';
import { useDriving } from '../../stores/driving-store';
import { useShowroom } from '../../stores/showroom-store';
import { createCustomizationController } from '../customization/controller';
import { assessCockpit, safeNearPlane } from '../cockpit/safety';
import { bindDrivingAudio, createEngineAudio } from './audio';
import { bindDrivingInput } from './input';
import { bodyHeight, createDrivingPhysics, initializePhysics } from './physics';
import type { DrivingPhysics } from './physics';
import { createBrakeLights, prepareDrivingWheels } from './visuals';
import Track from './Track';
interface Runtime { physics: DrivingPhysics; wheels: ReturnType<typeof prepareDrivingWheels>; lights: ReturnType<typeof createBrakeLights>; eye: Vector3; clearance: number }
function DrivingVehicle() {
  const gltf = useGLTF('/models/ferrari.glb', '/draco/');
  const prepared = useMemo(() => prepareReferenceVehicle(gltf), [gltf]);
  const appearance = useCustomization(s => s.appearance), resetKey = useDriving(s => s.resetKey);
  const customizer = useMemo(() => createCustomizationController(prepared.registry), [prepared]);
  useLayoutEffect(() => { customizer.apply(appearance); }, [customizer, appearance]);
  useEffect(() => () => { customizer.dispose(); prepared.dispose(); }, [customizer, prepared]);
  const chassis = useRef<Group>(null), runtime = useRef<Runtime | null>(null);
  const previousCamera = useRef<string>(''), elapsed = useRef(0);
  const { camera, size, gl } = useThree();
  const audio = useRef<ReturnType<typeof createEngineAudio> | null>(null);
  useEffect(() => {
    const instance = createEngineAudio(); audio.current = instance; bindDrivingAudio(instance); const unbind = bindDrivingInput();
    return () => { unbind(); instance.dispose(); audio.current = null; bindDrivingAudio(null); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const root = chassis.current!, originalPosition = prepared.placement.position.clone();
    let owned: Runtime | null = null;
    let createdWheels: Runtime['wheels'] | null = null, createdPhysics: DrivingPhysics | null = null, createdLights: Runtime['lights'] | null = null;
    const cleanup = () => {
      runtime.current = null; delete root.userData.physics;
      createdLights?.dispose(); createdLights = null;
      createdWheels?.dispose(); createdWheels = null;
      createdPhysics?.dispose(); createdPhysics = null;
      root.remove(prepared.placement); prepared.placement.position.copy(originalPosition);
      root.position.set(0, 0, 0); root.quaternion.identity();
    };
    useDriving.setState({ ready: false, error: null });
    void initializePhysics().then(() => {
      if (cancelled) return;
      const safety = assessCockpit(prepared.placement);
      if (!safety.driver.safe) throw Error('Driver eye clearance is unavailable');
      const wheels = createdWheels = prepareDrivingWheels(prepared.registry, prepared.placement);
      const physics = createdPhysics = createDrivingPhysics(wheels.specs), lights = createdLights = createBrakeLights(prepared.registry);
      prepared.placement.position.y -= bodyHeight;
      const eye = new Vector3(...safety.driver.position); eye.y -= bodyHeight;
      owned = { physics, wheels, lights, eye, clearance: safety.driver.clearance }; runtime.current = owned;
      root.add(prepared.placement); root.userData.physics = physics;
      useDriving.setState({ ready: true });
    }).catch(error => { if (cancelled) return; cleanup(); useDriving.setState({ ready: false, error: error instanceof Error ? error.message : 'Physics initialization failed' }); });
    return () => {
      cancelled = true; cleanup();
    };
  }, [prepared]);
  useEffect(() => { runtime.current?.physics.reset(); runtime.current?.wheels.reset(); previousCamera.current = ''; }, [resetKey]);
  const position = useMemo(() => new Vector3(), []), target = useMemo(() => new Vector3(), []), look = useMemo(() => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.08), []);
  useEffect(() => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute('aria-label', 'Driving view. W accelerate, S brake, A and D steer.'); }, [gl]);
  useFrame((_, delta) => {
    const r = runtime.current; if (!r || !(camera instanceof PerspectiveCamera)) return;
    const state = useDriving.getState();
    const command = { throttle: state.input.throttle ? 1 : 0, brake: state.input.brake ? 1 : 0, steer: Number(state.input.left) - Number(state.input.right), engine: state.engine, direction: state.direction };
    if (!state.paused) r.physics.advance(delta, command);
    const p = r.physics.body.translation(), q = r.physics.body.rotation();
    chassis.current!.position.set(p.x, p.y, p.z); chassis.current!.quaternion.set(q.x, q.y, q.z, q.w); chassis.current!.updateWorldMatrix(true, true);
    r.wheels.update(r.physics);
    const telemetry = r.physics.telemetry(); r.lights.update(telemetry.braking);
    audio.current?.update(state.engine, state.muted, telemetry.rpm, command.throttle, state.paused);
    elapsed.current += delta; if (elapsed.current > .1) { useDriving.setState({ telemetry }); elapsed.current = 0; }
    const cut = previousCamera.current !== state.camera; previousCamera.current = state.camera;
    if (state.camera === 'cockpit') {
      position.copy(r.eye).applyQuaternion(chassis.current!.quaternion).add(chassis.current!.position);
      camera.position.copy(position); camera.quaternion.copy(chassis.current!.quaternion).multiply(look);
      camera.fov = 68; camera.near = safeNearPlane(r.clearance, 68, size.width / size.height);
    } else {
      // A stable horizon and speed-sensitive chase distance retain the road ahead in view.
      position.set(0, 2.5, 6.6 + Math.min(2, Math.abs(telemetry.speed) * .08)).applyQuaternion(chassis.current!.quaternion).add(chassis.current!.position);
      target.copy(chassis.current!.position); target.y += .5;
      r.physics.resolveCamera(position, target);
      if (cut) camera.position.copy(position); else camera.position.lerp(position, 1 - Math.exp(-Math.min(delta, .1) * 6));
      r.physics.resolveCamera(camera.position, target);
      target.set(0, .25, -3).applyQuaternion(chassis.current!.quaternion).add(chassis.current!.position);
      camera.up.set(0, 1, 0); camera.lookAt(target); camera.fov = 55; camera.near = .1;
    }
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);

  });
  return <group ref={chassis} name="DrivingChassis"/>;
}
export default function Driving() {
  const quality = useShowroom(s => s.quality);
  return <Canvas shadows dpr={quality === 'high' ? [1, 1.5] : 1} camera={{ position: [32, 3, 31], fov: 55, near: .1, far: 260 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor('#91a4a7'); gl.toneMappingExposure = 1.05; }} fallback={<div className="webgl-fallback">Driving requires WebGL with hardware acceleration.</div>}>
    <fog attach="fog" args={['#91a4a7', 95, 225]}/><hemisphereLight args={['#dfeaf4', '#4d6347', 2]}/>
    <directionalLight position={[-30, 60, -25]} intensity={3.2} castShadow shadow-mapSize={[quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={100} shadow-camera-bottom={-100} shadow-camera-far={180} shadow-bias={-.001}/>
    <Track/>
    <Suspense fallback={<Html center><div className="scene-loading">LOADING TEST VEHICLE…</div></Html>}><Environment files="/models/studio.hdr" environmentIntensity={.6}/><DrivingVehicle/></Suspense>
  </Canvas>;
}
