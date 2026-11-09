import { useState } from 'react';
import { Camera, Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useDriving } from '../../stores/driving-store';
import type { DriveInput } from '../../stores/driving-store';
import { useExplorer } from '../../stores/explorer-store';
import { drivingAudio } from './audio';
function Pedal({ input, children }: { input: DriveInput; children: React.ReactNode }) {
  const pressed = useDriving(s => s.input[input]), disabled = useDriving(s => !s.ready || s.paused || !!s.error);
  return <button className={`drive-pad ${pressed ? 'pressed' : ''}`} disabled={disabled} aria-label={{ throttle: 'Accelerate', brake: 'Brake', left: 'Steer left', right: 'Steer right' }[input]} aria-pressed={pressed}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); useDriving.getState().setInput(input, true); }}
    onPointerUp={e => { useDriving.getState().setInput(input, false); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
    onPointerCancel={() => useDriving.getState().setInput(input, false)} onLostPointerCapture={() => useDriving.getState().setInput(input, false)}
    onKeyDown={e => { if (e.key === 'Enter') useDriving.getState().setInput(input, true); }} onKeyUp={e => { if (e.key === 'Enter') useDriving.getState().setInput(input, false); }} onBlur={() => useDriving.getState().setInput(input, false)}>{children}</button>;
}
export default function DrivingPanel() {
  const state = useDriving(), t = state.telemetry;
  const [audioError, setAudioError] = useState(false);
  async function toggleSound() { if (state.muted) { if (await drivingAudio?.unlock()) { state.toggleMute(); setAudioError(false); } else setAudioError(true); } else state.toggleMute(); }
  return <div className="driving-ui" aria-label="Driving controls">
    <div className="drive-title"><span className="eyebrow">FX / THE TEST CIRCUIT</span><h2>Engineering in motion.</h2><p>Reference vehicle · illustrative driving tune</p></div>
    <button className="drive-exit" aria-label="Exit driving mode" onClick={() => useExplorer.getState().setOpen(false)}><X size={18}/></button>
    <div className="drive-actions">
      <button disabled={!state.ready || state.paused} onClick={() => { state.toggleEngine(); void drivingAudio?.unlock(); }} aria-pressed={state.engine}>{state.engine ? 'Stop engine' : 'Start engine'}</button>
      <button disabled={!state.ready} onClick={state.togglePause} aria-label={state.paused ? 'Resume driving' : 'Pause driving'}>{state.paused ? <Play size={15}/> : <Pause size={15}/>}</button>
      <button onClick={state.toggleCamera} aria-label="Switch driving camera"><Camera size={15}/>{state.camera === 'chase' ? 'Chase' : 'Cockpit'}</button>
      <button onClick={toggleSound} aria-label={state.muted ? 'Unmute engine sound' : 'Mute engine sound'}>{state.muted ? <VolumeX size={15}/> : <Volume2 size={15}/>}</button>
      <button onClick={state.reset} disabled={!state.ready} aria-label="Reset vehicle to track"><RotateCcw size={15}/></button>
    </div>
    {state.error ? <div className="drive-message" role="alert">Driving could not load: {state.error}<button onClick={() => useExplorer.getState().setOpen(false)}>Return to showroom</button></div> : !state.ready ? <div className="drive-message" role="status">Preparing vehicle physics…</div> : state.paused && <div className="drive-message">Simulation paused<button onClick={state.togglePause}>Resume driving</button></div>}
    <div className="drive-dashboard" aria-label="Driving instrumentation"><div><strong data-testid="drive-speed">{Math.round(Math.abs(t.speed) * 3.6)}</strong><span>KM/H</span></div><div><strong data-testid="drive-gear">{state.direction === 'R' ? 'R' : state.engine ? t.gear || 1 : 'N'}</strong><span>GEAR</span></div><div className="drive-rpm"><span>{Math.round(t.rpm)} RPM</span><meter min={0} max={8000} value={t.rpm} aria-label="Simulated engine RPM"/><small>{t.offRoad ? 'GRASS / REDUCED GRIP' : 'TEST CIRCUIT'} · {(t.distance / 1000).toFixed(2)} KM</small></div></div>
    <div className="drive-inputs"><div className="drive-steer"><Pedal input="left">←</Pedal><Pedal input="right">→</Pedal></div><div className="drive-gears" aria-label="Transmission direction"><button aria-pressed={state.direction === 'D'} onClick={() => state.setDirection('D')} disabled={Math.abs(t.speed) >= .5}>D</button><button aria-pressed={state.direction === 'R'} onClick={() => state.setDirection('R')} disabled={Math.abs(t.speed) >= .5}>R</button></div><div className="drive-pedals"><Pedal input="brake">BRAKE</Pedal><Pedal input="throttle">GO</Pedal></div></div>
    <p className="drive-help">W / ↑ accelerate · S / ↓ / Space brake · A / D steer · R reverse at rest · C camera · E engine · P pause<br/><span>Hold the buttons for touch controls. Optional synthesized engine sound.{audioError && ' Audio is unavailable in this browser.'}</span></p>
  </div>;
}
