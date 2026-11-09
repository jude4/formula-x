import { useDriving } from '../../stores/driving-store';
import type { DriveInput } from '../../stores/driving-store';
import { drivingAudio } from './audio';
const keys: Record<string, DriveInput> = { KeyW: 'throttle', ArrowUp: 'throttle', KeyS: 'brake', ArrowDown: 'brake', Space: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
export function bindDrivingInput() {
  const held = new Set<string>();
  const editable = (target: EventTarget | null) => target instanceof HTMLElement && (!!target.closest('input,select,textarea,[contenteditable=true],[role=dialog]'));
  function down(e: KeyboardEvent) {
    const state = useDriving.getState(); if (!state.active || editable(e.target) || document.querySelector('[role=dialog]')) return;
    if (keys[e.code]) { e.preventDefault(); held.add(e.code); state.setInput(keys[e.code], true); }
    else if (!e.repeat) {
      if (e.code === 'KeyE') { e.preventDefault(); state.toggleEngine(); void drivingAudio?.unlock(); }
      else if (e.code === 'KeyC') { e.preventDefault(); state.toggleCamera(); }
      else if (e.code === 'KeyP') { e.preventDefault(); state.togglePause(); }
      else if (e.code === 'KeyR') { e.preventDefault(); state.setDirection(state.direction === 'D' ? 'R' : 'D'); }
    }
  }
  function up(e: KeyboardEvent) { if (!keys[e.code]) return; held.delete(e.code); useDriving.getState().setInput(keys[e.code], [...held].some(code => keys[code] === keys[e.code])); }
  function release() { held.clear(); useDriving.getState().release(); }
  function pause() { release(); useDriving.setState({ paused: true }); drivingAudio?.update(false, true, 0, 0, true); }
  function hidden() { if (document.hidden) pause(); }
  window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
  return () => { release(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden); };
}
