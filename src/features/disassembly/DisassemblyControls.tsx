import { Pause, Play, RotateCcw, ArrowLeft, ArrowRight, Eye, EyeOff, Focus } from 'lucide-react';
import { useDisassembly, componentHidden } from '../../stores/disassembly-store';
import { useExplorer } from '../../stores/explorer-store';
import { separationConfig, separationStages } from './config';
export function DisassemblyControls() {
  const state = useDisassembly();
  const custom = separationConfig.some((c) => (state.levels[c.id] ?? 0) !== (c.stage < state.step ? 1 : 0));
  return <section className="disassembly-controls" aria-label="Disassembly controls">
    <div className="disassembly-title"><span className="eyebrow">REFERENCE EXPLODED VIEW</span><span aria-live="polite">{state.paused ? 'PAUSED' : state.animating ? 'IN MOTION' : 'READY'}</span></div>
    <div className="disassembly-primary"><button onClick={state.explode}>Explode all</button><button onClick={state.assemble}>Assemble all</button></div>
    <label className="distance-label" htmlFor="explosion-distance">Explosion distance <output>{Math.round(state.distance * 100)}%</output></label>
    <input id="explosion-distance" aria-label="Explosion distance" type="range" min="0" max="1.5" step="0.05" value={state.distance} onChange={(event) => state.setDistance(Number(event.target.value))}/>
    <div className="sequence-row"><button aria-label="Previous assembly step" disabled={state.step === 0} onClick={() => state.setStep(state.step - 1)}><ArrowLeft size={14}/></button><span>STEP {state.step} / {separationStages.length}</span><button aria-label="Next disassembly step" disabled={state.step === separationStages.length} onClick={() => state.setStep(state.step + 1)}><ArrowRight size={14}/></button></div>
    <p className="sequence-caption">{custom ? 'Individual component arrangement' : state.step ? separationStages[state.step - 1] : 'Assembled reference'}</p>
    <div className="disassembly-actions"><button aria-label={state.paused ? 'Resume disassembly animation' : 'Pause disassembly animation'} aria-pressed={state.paused} onClick={state.togglePause}>{state.paused ? <Play size={13}/> : <Pause size={13}/>} {state.paused ? 'Resume' : 'Pause'}</button><button onClick={state.reset}><RotateCcw size={13}/>Reset disassembly</button></div>
    <div className="disassembly-toggles"><label><input type="checkbox" checked={state.guides} onChange={state.toggleGuides}/>Guide lines</label><label><input type="checkbox" checked={state.labels} onChange={state.toggleLabels}/>Assembly labels</label></div>
    {(Object.keys(state.hidden).length > 0 || state.isolatedId) && <button className="show-all-components" onClick={state.showAll}><Eye size={13}/>Show all components</button>}
    <p className="separation-disclosure">17 reference components. Offsets illustrate spatial relationships; this is not a mechanical service procedure.</p>
  </section>;
}
export function SelectedDisassemblyControls() {
  const selectedId = useExplorer((s) => s.selectedId);
  const state = useDisassembly();
  if (!selectedId) return null;
  const hidden = componentHidden(selectedId, state.hidden);
  return <div className="selected-disassembly" aria-label="Selected component disassembly">
    <div><button onClick={() => state.separate(selectedId)}>Separate selected</button><button onClick={() => state.restore(selectedId)}>Assemble selected</button></div>
    <div><button aria-pressed={state.isolatedId === selectedId} onClick={() => state.toggleIsolation(selectedId)}><Focus size={13}/>{state.isolatedId === selectedId ? 'Exit isolation' : 'Isolate selected'}</button><button onClick={() => state.toggleVisibility(selectedId)}>{hidden ? <Eye size={13}/> : <EyeOff size={13}/>} {hidden ? 'Show selected' : 'Hide selected'}</button></div>
  </div>;
}
