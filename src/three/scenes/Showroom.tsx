import { useReducedMotion } from 'framer-motion';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF, useProgress, Html } from '@react-three/drei';
import { Color, PerspectiveCamera, Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useDisassembly } from '../../stores/disassembly-store';
import { createDisassemblyController } from '../../features/disassembly/controller';
import { DisassemblyPresentation, FollowingLabel } from '../../features/disassembly/DisassemblyPresentation';
import { useExplorer } from '../../stores/explorer-store';
import { componentFocus, highlightComponent } from '../../features/component-explorer/selection';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { prepareReferenceVehicle } from '../../models/vehicle/prepare';
import { useShowroom } from '../../stores/showroom-store';

function Vehicle({ onReady }: { onReady: () => void }) {
  const gltf = useGLTF('/models/ferrari.glb', '/draco/');
  const prepared = useMemo(() => prepareReferenceVehicle(gltf), [gltf]);
  const open = useExplorer((s) => s.open);
  const selectedId = useExplorer((s) => s.selectedId);
  const inspectKey = useExplorer((s) => s.inspectKey);
  const hoveredId = useExplorer((s) => s.hoveredId);
  const disassembly = useDisassembly((s) => s.active);
  const levels = useDisassembly((s) => s.levels), distance = useDisassembly((s) => s.distance);
  const paused = useDisassembly((s) => s.paused), resetKey = useDisassembly((s) => s.resetKey);
  const hidden = useDisassembly((s) => s.hidden), isolatedId = useDisassembly((s) => s.isolatedId);
  const reduceMotion = useReducedMotion();
  const controller = useMemo(() => createDisassemblyController(prepared.registry, prepared.placement, (animating) => useDisassembly.setState({ animating })), [prepared]);
  useEffect(() => () => controller.dispose(), [controller]);
  useLayoutEffect(() => { controller.reset(); }, [controller, resetKey, disassembly]);
  useLayoutEffect(() => { if (disassembly) controller.animate(levels, distance, paused, !!reduceMotion); }, [controller, disassembly, levels, distance, reduceMotion, resetKey]);
  useLayoutEffect(() => { controller.pause(paused); }, [controller, paused]);
  useFrame((_, delta) => controller.advance(delta));
  useLayoutEffect(() => { controller.visibility(disassembly ? hidden : {}, disassembly ? isolatedId : null); }, [controller, disassembly, hidden, isolatedId, resetKey]);
  const gl = useThree((s) => s.gl);
  useEffect(() => { onReady(); }, [onReady]);
  useEffect(() => () => prepared.dispose(), [prepared]);
  useLayoutEffect(() => {
    const selected = selectedId ? prepared.registry.entries.get(selectedId) : undefined;
    if (!open || !selected) return;
    const cleanup = highlightComponent(selected.object);
    useExplorer.getState().setFocus(componentFocus(selected, inspectKey));
    return cleanup;
  }, [open, selectedId, inspectKey, prepared]);
  useEffect(() => { gl.domElement.style.cursor = open && hoveredId ? 'pointer' : 'grab'; return () => { gl.domElement.style.cursor = ''; }; }, [open, hoveredId, gl]);
  function hit(event: ThreeEvent<PointerEvent | MouseEvent>) {
    // Invisible meshes are excluded explicitly because Three.js raycasting can still hit them.
    const front = event.intersections.find((hit) => { let object: import('three').Object3D | null = hit.object; while (object) { if (!object.visible) return false; object = object.parent; } return true; });
    return front ? prepared.registry.resolve(front.object) : undefined;
  }
  return <group onClick={(event) => {
    if (!open || event.delta > 5) return;
    const entry = hit(event); if (!entry) return;
    event.stopPropagation(); useExplorer.getState().select(entry.metadata.id);
  }} onPointerMove={(event) => { if (open) useExplorer.getState().hover(hit(event)?.metadata.id ?? null); }} onPointerLeave={() => useExplorer.getState().hover(null)}>
    <primitive object={prepared.placement} />
    {open && selectedId && prepared.registry.entries.has(selectedId) && <FollowingLabel object={prepared.registry.entries.get(selectedId)!.object} name={prepared.registry.entries.get(selectedId)!.metadata.displayName}/>}
    {disassembly && <DisassemblyPresentation registry={prepared.registry}/>}

  </group>;
}
function Loading() {
  const { progress } = useProgress();
  return <Html center><div className="scene-loading"><span className="loading-line"/><span>PREPARING THE STUDIO</span><strong>{Math.round(progress)}%</strong></div></Html>;
}
const views = { hero: [4.4, 1.9, -5.0], front: [0, 1.65, -7.4], rear: [0, 1.9, 7.4], side: [7.4, 1.65, 0] } as const;
function CameraRig({ mobile }: { mobile: boolean }) {
  const reduceMotion = useReducedMotion();
  const camera = useThree((s) => s.camera);
  useEffect(() => { if (camera instanceof PerspectiveCamera) { camera.fov = mobile ? 43 : 32; camera.updateProjectionMatrix(); } }, [camera, mobile]);
  const controls = useRef<OrbitControlsImpl>(null);
  const { view, resetKey, autoRotate } = useShowroom();
  const focus = useExplorer((s) => s.focus);
  const disassembly = useDisassembly((s) => s.active);
  const framingKey = useDisassembly((s) => s.framingKey);
  const open = useExplorer((s) => s.open);
  const targetLookAt = useRef(new Vector3(0, 0.6, 0));
  const moving = useRef(true);
  const targetPosition = useRef(new Vector3(...views.hero));
  useEffect(() => { targetPosition.current.fromArray(views[view]).multiplyScalar(disassembly ? 1.9 : 1); targetLookAt.current.set(0, 0.6, 0); moving.current = true; }, [view, resetKey, disassembly]);
  useEffect(() => {
    if (!open || !focus) return;
    targetPosition.current.fromArray(focus.position); targetLookAt.current.fromArray(focus.target); moving.current = true;
  }, [open, focus]);
  useEffect(() => {
    if (!disassembly) return;
    const distance = useDisassembly.getState().distance;
    targetPosition.current.set(8 + distance * 1.5, 4 + distance, -9.5 - distance * 1.5).multiplyScalar(mobile ? 0.76 : 1);
    targetLookAt.current.set(0, 0.8, 0); moving.current = true;
  }, [disassembly, framingKey, mobile]);
  useFrame(({ camera }, delta) => {
    if (!moving.current || !controls.current) return;
    camera.position.lerp(targetPosition.current, reduceMotion ? 1 : 1 - Math.exp(-delta * 3.5));
    controls.current.target.lerp(targetLookAt.current, reduceMotion ? 1 : 1 - Math.exp(-delta * 3.5));
    controls.current.update();
    if (camera.position.distanceTo(targetPosition.current) < 0.015 && controls.current.target.distanceTo(targetLookAt.current) < 0.015) moving.current = false;
  });
  return <OrbitControls ref={controls} makeDefault target={[0, 0.6, 0]} minDistance={open ? 0.8 : 4} maxDistance={disassembly ? 22 : 12} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2 - 0.035} enableDamping dampingFactor={0.06} autoRotate={autoRotate} autoRotateSpeed={0.45} onStart={() => { moving.current = false; }} />;
}
export default function Showroom({ onReady }: { onReady: () => void }) {
  const quality = useShowroom((s) => s.quality);
  const disassembly = useDisassembly((s) => s.active);
  const [mobile, setMobile] = useState(() => window.innerWidth <= 600);
  useEffect(() => { const media = window.matchMedia('(max-width: 600px)'); const update = () => setMobile(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  return <Canvas onPointerMissed={(event) => { if (event.type === 'click' && useExplorer.getState().selectedId) useExplorer.getState().clear(); }} shadows dpr={quality === 'high' ? [1, 1.75] : [1, 1]} camera={{ position: [5.2, 2.3, -5.9], fov: mobile ? 43 : 32, near: 0.1, far: 70 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor(new Color('#141713'), 0); gl.toneMappingExposure = 1.15; }} fallback={<div className="webgl-fallback">WebGL is unavailable. Please open FORMULA X in a browser with hardware acceleration enabled.</div>}>
    <fog attach="fog" args={['#151713', 15, 35]} />
    <ambientLight intensity={0.25} />
    <Suspense fallback={<Loading />}>
      <Vehicle onReady={onReady} />
      <Environment resolution={256} environmentIntensity={1}>
        <Environment files="/models/studio.hdr" background backgroundIntensity={0.08} environmentIntensity={0.08} />
        <Lightformer form="rect" intensity={5} color="#ffffff" position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 3, 1]} />
        <Lightformer intensity={3} color="#e5efd5" position={[-5, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[7, 1.5, 1]} />
        <Lightformer intensity={4} color="#ffffff" position={[4, 3, -3]} rotation={[0, -Math.PI / 3, 0]} scale={[6, 2, 1]} />
      </Environment>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.75} scale={14} blur={2.8} far={4} resolution={disassembly ? 256 : quality === 'high' ? 1024 : 512} color="#000000" frames={disassembly ? Infinity : 1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#060805" metalness={0.12} roughness={0.85} envMapIntensity={0.02} /></mesh>
    </Suspense>
    <CameraRig mobile={mobile} />
  </Canvas>;
}
