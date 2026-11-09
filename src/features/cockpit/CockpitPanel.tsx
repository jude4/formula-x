import { Lightbulb, RotateCcw, X } from 'lucide-react';
import { useCockpit } from '../../stores/cockpit-store';
import { useExplorer } from '../../stores/explorer-store';
import { cockpitViews, lookLimits } from './poses';
import type { CockpitView } from './poses';
export default function CockpitPanel() {
  const state = useCockpit(); const available = state.safety?.[cockpitViews[state.view].eye].safe;
  return <aside className="component-explorer cockpit-panel" aria-label="Cockpit inspection">
    <div className="explorer-heading"><div><span className="eyebrow">INTERIOR / REFERENCE STUDY</span><h2>A closer perspective.</h2></div><button className="explorer-close" aria-label="Exit cockpit inspection" onClick={() => useExplorer.getState().setOpen(false)}><X size={17}/></button></div>
    <p className="explorer-intro">Open-roof inspection with fixed eye positions. Drag or use arrow keys on the view to look around; scroll changes view width.</p>
    {!state.safety && <p role="status" className="cockpit-status">Checking camera clearance…</p>}
    {state.safety && !available && <p role="alert" className="cockpit-status">This eye position does not have enough surface clearance. Use a supplied safe view or exit.</p>}
    <section className="cockpit-views" aria-label="Interior viewpoints">{Object.entries(cockpitViews).map(([id, pose]) => <button key={id} aria-pressed={state.view === id} disabled={!state.safety?.[pose.eye].safe} onClick={() => state.setView(id as CockpitView)}>{pose.name}</button>)}</section>
    <p className="cockpit-view-description">{cockpitViews[state.view].description}</p>
    <section className="cockpit-look" aria-label="Cockpit look controls"><label htmlFor="cockpit-fov">View width<output>{state.fov}°</output></label><input id="cockpit-fov" aria-label="Cockpit view width" type="range" min={lookLimits.minFov} max={lookLimits.maxFov} step="1" value={state.fov} disabled={!available} onChange={(event) => state.setFov(Number(event.target.value))}/><button onClick={state.recenter} disabled={!available}><RotateCcw size={13}/>Recenter look</button></section>
    <section className="cockpit-wheel" aria-label="Steering assembly inspection"><h3>Steering-wheel assembly</h3><p>This is an independent source assembly. Other seat, dashboard and console surfaces are merged material geometry.</p><button className="focus-component" onClick={state.inspectSteering} disabled={!available}>Inspect steering assembly</button><label className="cockpit-check"><input type="checkbox" checked={state.highlight} onChange={state.toggleHighlight} disabled={!available}/>Highlight steering geometry</label></section>
    <section className="cockpit-light" aria-label="Steering light preview"><h3>Reference light preview</h3><button className="focus-component" aria-pressed={state.lights} onClick={state.toggleLights} disabled={!available}><Lightbulb size={14}/>{state.lights ? 'Switch steering lights off' : 'Switch steering lights on'}</button><label className="cockpit-brightness" htmlFor="cockpit-brightness">Preview brightness<output>{state.brightness.toFixed(1)}</output></label><input id="cockpit-brightness" aria-label="Steering preview brightness" type="range" min="0.2" max="3" step="0.1" value={state.brightness} disabled={!available || !state.lights} onChange={(event) => state.setBrightness(Number(event.target.value))}/><p>Changes emission on the actual steering red-light mesh. This does not start an engine or simulate instrument telemetry.</p></section>
    <button className="reset-customization" onClick={state.reset} disabled={!available}><RotateCcw size={14}/>Reset cockpit controls</button>
    <p className="asset-disclosure">Door and hinge meshes, separate gauges, infotainment controls and independently operable console switches are not supplied. Entry uses a fade/cut into the open-roof reference, not a door animation. Driving is a later phase.</p>
  </aside>;
}
