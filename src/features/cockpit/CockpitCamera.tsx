import { useEffect, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { useCockpit } from '../../stores/cockpit-store';
import { cockpitViews } from './poses';
import { safeNearPlane } from './safety';
export default function CockpitCamera() {
  const { camera, gl, size } = useThree();
  const view = useCockpit((s) => s.view), fov = useCockpit((s) => s.fov), safety = useCockpit((s) => s.safety);
  const eye = safety?.[cockpitViews[view].eye];
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !eye?.safe) return;
    camera.fov = fov; camera.near = safeNearPlane(eye.clearance, fov, size.width / size.height); camera.updateProjectionMatrix();
    camera.position.fromArray(eye.position);
  }, [camera, eye, fov, size.width, size.height]);
  useFrame(() => {
    const state = useCockpit.getState(), eye = state.safety?.[cockpitViews[state.view].eye];
    if (!eye?.safe) return;
    // Fixed eye positions and look-only rotation eliminate orbit/dolly clipping.
    camera.position.fromArray(eye.position); camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ'); camera.updateMatrixWorld(true);
  }, -1);
  useEffect(() => {
    const canvas = gl.domElement; const oldTab = canvas.getAttribute('tabindex'), oldLabel = canvas.getAttribute('aria-label');
    canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Cockpit view: drag or use arrow keys to look'); canvas.style.cursor = 'grab';
    let drag: { id: number; x: number; y: number; yaw: number; pitch: number } | null = null;
    function down(event: PointerEvent) { if (event.button !== 0 || drag) return; const state = useCockpit.getState(); drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch }; canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); canvas.style.cursor = 'grabbing'; }
    function move(event: PointerEvent) { if (drag?.id === event.pointerId) useCockpit.getState().look(drag.yaw - (event.clientX - drag.x) * 0.004, drag.pitch - (event.clientY - drag.y) * 0.004); }
    function up(event: PointerEvent) { if (drag?.id !== event.pointerId) return; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); drag = null; canvas.style.cursor = 'grab'; }
    function wheel(event: WheelEvent) { event.preventDefault(); const state = useCockpit.getState(); state.setFov(state.fov + event.deltaY * 0.025); }
    function key(event: KeyboardEvent) {
      if (document.activeElement !== canvas) return;
      const state = useCockpit.getState(); const delta = event.shiftKey ? 0.12 : 0.05;
      if (event.key === 'ArrowLeft') state.look(state.yaw + delta, state.pitch);
      else if (event.key === 'ArrowRight') state.look(state.yaw - delta, state.pitch);
      else if (event.key === 'ArrowUp') state.look(state.yaw, state.pitch + delta);
      else if (event.key === 'ArrowDown') state.look(state.yaw, state.pitch - delta);
      else return; event.preventDefault();
    }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('keydown', key);
    return () => {
      if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('wheel', wheel); window.removeEventListener('keydown', key);
      if (oldTab === null) canvas.removeAttribute('tabindex'); else canvas.setAttribute('tabindex', oldTab);
      if (oldLabel === null) canvas.removeAttribute('aria-label'); else canvas.setAttribute('aria-label', oldLabel);
      canvas.style.cursor = 'grab';
      if (camera instanceof PerspectiveCamera) { camera.near = 0.1; camera.fov = window.innerWidth <= 600 ? 43 : 32; camera.rotation.reorder('XYZ'); camera.position.set(4.4, 1.9, -5); camera.lookAt(0, 0.6, 0); camera.updateProjectionMatrix(); }
    };
  }, [camera, gl]);
  return null;
}
