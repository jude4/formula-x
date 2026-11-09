import { Crosshair, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEngineering } from '../../stores/engineering-store';
import { useExplorer } from '../../stores/explorer-store';
import { referenceManifest } from '../../models/vehicle/manifest';
import { componentDetails, componentById } from '../component-explorer/details';
import { cornerAssemblies, layerLabels, missingLabs } from './catalog';
import type { Corner, LabLayer } from './catalog';
export default function EngineeringPanel() {
  const state = useEngineering();
  const selectedId = useExplorer((s) => s.selectedId);
  const corner = cornerAssemblies[state.corner];
  const selected = selectedId ? componentById.get(selectedId) : undefined;
  const details = selected ? componentDetails(selected) : undefined;
  const mesh = selectedId ? referenceManifest.components.find((c) => c.id === selectedId) : undefined;
  const selectBrake = () => useExplorer.getState().select(corner.parts.brake);
  return <aside className="component-explorer engineering-panel" aria-label="Engineering laboratory">
    <div className="explorer-heading"><div><span className="eyebrow">ENGINEERING / REFERENCE STUDY</span><h2>Inside the assembly.</h2></div><button className="explorer-close" aria-label="Close engineering laboratory" onClick={() => useExplorer.getState().setOpen(false)}><X size={17}/></button></div>
    <div className="lab-status"><span className="status-dot"/>PARTIAL BRAKE LABORATORY</div>
    <p className="explorer-intro">Inspect the supplied wheel-corner assets. The brake-labelled mesh is not validated as a complete disc, caliper and hub assembly.</p>
    <label className="lab-corner-label" htmlFor="lab-corner">Wheel corner</label>
    <select id="lab-corner" aria-label="Laboratory wheel corner" value={state.corner} onChange={(event) => { const value = event.target.value as Corner; state.chooseCorner(value); useExplorer.getState().select(cornerAssemblies[value].parts.brake); }}>{Object.entries(cornerAssemblies).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}</select>
    <div className="lab-quick-actions"><button onClick={() => { state.brakeOnly(); selectBrake(); }}>Brake geometry only</button><button onClick={state.showAssembly}>Show wheel assembly</button></div>
    <section aria-label="Laboratory geometry layers" className="lab-layers"><span className="eyebrow">ACTUAL ASSET LAYERS</span>{(Object.keys(layerLabels) as LabLayer[]).map((layer) => <label key={layer}><input type="checkbox" checked={state.layers[layer]} onChange={() => state.toggleLayer(layer)}/><span>{layerLabels[layer]}</span></label>)}</section>
    <div className="lab-parts" aria-label="Inspectable laboratory parts"><span className="eyebrow">INSPECT A COMPONENT</span>{(['brake', 'rim', 'tire'] as const).map((layer) => <button key={layer} aria-pressed={selectedId === corner.parts[layer]} onClick={() => useExplorer.getState().select(corner.parts[layer])}>{layerLabels[layer]}</button>)}</div>
    <section className="lab-separation" aria-label="Laboratory assembly controls"><div className="disassembly-primary"><button onClick={() => state.setSeparated(true)}>Separate assembly</button><button onClick={() => state.setSeparated(false)}>Assemble assembly</button></div><label className="distance-label" htmlFor="lab-distance">Separation distance<output>{Math.round(state.distance * 100)}%</output></label><input id="lab-distance" type="range" min="0" max="1.5" step="0.05" value={state.distance} aria-label="Laboratory separation distance" onChange={(event) => state.setDistance(Number(event.target.value))}/><div className="disassembly-actions"><button aria-label={state.paused ? 'Resume laboratory animation' : 'Pause laboratory animation'} aria-pressed={state.paused} onClick={state.togglePause}>{state.paused ? <Play size={13}/> : <Pause size={13}/>} {state.paused ? 'Resume' : 'Pause'}</button><button onClick={() => { state.reset(); selectBrake(); }}><RotateCcw size={13}/>Reset laboratory</button></div><button className="focus-component" onClick={state.frame}><Crosshair size={14}/>Fit wheel assembly</button></section>
    <section className="component-detail" aria-label="Laboratory component information" aria-live="polite"><div className="detail-topline"><span className="eyebrow">{state.animating ? 'ANIMATING ASSEMBLY' : 'SELECTED REFERENCE GEOMETRY'}</span></div>{selected && details ? <><h3>{selected.displayName}</h3><p>{details.description}</p><dl><div><dt>Corner</dt><dd>{corner.label}</dd></div><div><dt>Asset materials</dt><dd>{mesh?.materials.join(', ') || 'Multiple source materials'}</dd></div><div><dt>Disc / caliper</dt><dd>Not independently supplied</dd></div><div><dt>Separate hub</dt><dd>Not verified</dd></div><div><dt>Dimensions / ratings</dt><dd>Not supplied</dd></div></dl><button className="focus-component" onClick={() => useExplorer.getState().refocus()}><Crosshair size={14}/>Focus selected part</button><button className="focus-component" aria-pressed={state.isolateSelected} onClick={state.toggleIsolation}>{state.isolateSelected ? 'Exit part isolation' : 'Isolate selected part'}</button></> : <p>Select a supplied component to inspect its source information.</p>}</section>
    <section className="lab-missing" aria-label="Systems awaiting assets"><span className="eyebrow">SYSTEM ASSET COVERAGE</span>{missingLabs.map((lab) => <article key={lab.name}><h3>{lab.name}<span>ASSET REQUIRED</span></h3><p>{lab.reason}</p></article>)}</section>
    <p className="asset-disclosure">Presentation offsets and generic component descriptions are illustrative. These assets do not establish verified engineering dimensions, performance or a maintenance procedure.</p>
  </aside>;
}
