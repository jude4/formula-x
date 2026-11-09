import { useDriving } from '../stores/driving-store';
import DrivingPanel from '../features/driving/DrivingPanel';
import { useCockpit } from '../stores/cockpit-store';
import CockpitPanel from '../features/cockpit/CockpitPanel';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowRight, RotateCcw, Rotate3D, Maximize, Minimize, X, MoveUpRight, Mouse, ChevronDown, Info, Check, Settings2 } from 'lucide-react';
import { useCustomization } from '../stores/customization-store';
import CustomizationPanel from '../features/customization/CustomizationPanel';
import { useEngineering } from '../stores/engineering-store';
import { cornerAssemblies } from '../features/engineering/catalog';
import EngineeringPanel from '../features/engineering/EngineeringPanel';
import { useDisassembly } from '../stores/disassembly-store';
import { useExplorer } from '../stores/explorer-store';
import ComponentExplorer from '../features/component-explorer/ComponentExplorer';
import { useShowroom } from '../stores/showroom-store';
import type { CameraView } from '../stores/showroom-store';
import { SceneErrorBoundary } from '../components/ui/ErrorBoundary';
const Driving = lazy(() => import('../features/driving/Driving'));
const Showroom = lazy(() => import('../three/scenes/Showroom'));
const perspectives: { id: CameraView; label: string }[] = [{ id: 'hero', label: 'Perspective' }, { id: 'front', label: 'Front' }, { id: 'side', label: 'Side' }, { id: 'rear', label: 'Rear' }];
export default function App() {
  const [ready, setReady] = useState(false);
  const [about, setAbout] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menu, setMenu] = useState(false);
  const state = useShowroom();
  const driving = useDriving(s => s.active);
  const cockpit = useCockpit();
  const customization = useCustomization((s) => s.active);
  const engineering = useEngineering((s) => s.active);
  const disassembly = useDisassembly((s) => s.active);
  const explorerOpen = useExplorer((s) => s.open);
  const selectedId = useExplorer((s) => s.selectedId);
  const reduceMotion = useReducedMotion();
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { if (!document.querySelector('[role="dialog"]') && (useCockpit.getState().active || useDriving.getState().active)) useExplorer.getState().setOpen(false); setAbout(false); setMenu(false); } };
    document.addEventListener('fullscreenchange', onFullscreen); window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('fullscreenchange', onFullscreen); window.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { if (about && useDriving.getState().active) { useDriving.setState({ paused: true }); useDriving.getState().release(); } if (about) document.getElementById('close-about')?.focus(); }, [about]);
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Browser may reject fullscreen; no app state is changed. */ } }
  return <main className={`experience${explorerOpen || customization || cockpit.active || driving ? " explorer-open" : ""}${selectedId ? " has-selection" : ""}${disassembly ? " disassembly-open" : ""}${engineering ? " engineering-open" : ""}${customization ? " customizer-open" : ""}${cockpit.active ? " cockpit-open" : ""}${driving ? " driving-open" : ""}`}>
    <header className="header">
      <a className="brand" href="/" aria-label="Formula X home">FORMULA<span className="brand-x">X</span><span className="brand-caption">AUTOMOTIVE EXPLORATION</span></a>
      <nav aria-label="Main navigation"><button aria-pressed={!explorerOpen && !customization && !cockpit.active && !driving} className={!explorerOpen && !customization && !cockpit.active && !driving ? "nav-active" : ""} onClick={() => useExplorer.getState().setOpen(false)}>Showroom</button><button aria-pressed={explorerOpen && !disassembly && !engineering} className={explorerOpen && !disassembly && !engineering ? "nav-active" : ""} disabled={!ready} onClick={() => useExplorer.getState().setOpen(true)}>Components</button><button aria-pressed={disassembly} className={disassembly ? "nav-active" : ""} disabled={!ready} onClick={() => { if (!disassembly) { useExplorer.getState().setOpen(true); useDisassembly.getState().enter(); } }}>Disassembly</button><button aria-pressed={engineering} className={engineering ? "nav-active" : ""} disabled={!ready} onClick={() => { if (!engineering) { useExplorer.getState().setOpen(true); useEngineering.getState().enter(); useExplorer.getState().select(cornerAssemblies[useEngineering.getState().corner].parts.brake); } }}>Engineering</button><button aria-pressed={customization} className={customization ? "nav-active" : ""} disabled={!ready} onClick={() => { if (!customization) { useExplorer.getState().setOpen(false); useCustomization.getState().enter(); } }}>Customize</button><button aria-pressed={cockpit.active} className={cockpit.active ? "nav-active" : ""} disabled={!ready} onClick={() => { if (!cockpit.active) { useExplorer.getState().setOpen(false); useCockpit.getState().enter(); } }}>Cockpit</button><button aria-pressed={driving} className={driving ? "nav-active" : ""} disabled={!ready} onClick={() => { if (!driving) { setMenu(false); useExplorer.getState().setOpen(false); useDriving.getState().enter(); } }}>Drive</button><button onClick={() => setAbout(true)}>The project <ArrowUpRight size={13}/></button></nav>
      <div className="header-end"><span className="status-dot"/><span>LIVE 3D EXPERIENCE</span><span className="edition">VOL. 001</span></div>
    </header>
    <section className="showroom" aria-label="Interactive automotive showroom">
      <div className="studio-grain"/>
      <div className="studio-word" aria-hidden="true">FORMULA X</div>
      <motion.div className="hero-copy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.8 }}>
        <div className="eyebrow"><span className="short-line"/> ENGINEERED TO BE EXPLORED</div>
        <h1>BEYOND<br/>THE MACHINE<span>.</span></h1>
        <p>A closer look at extraordinary engineering.<br/>Every curve. Every detail. Every possibility.</p>
      </motion.div>
      <div className="scene"><SceneErrorBoundary><Suspense fallback={<div className="initial-loading">OPENING THE STUDIO…</div>}>{driving ? <Driving/> : <Showroom onReady={onReady}/>}</Suspense></SceneErrorBoundary></div>
      <div className="scene-topline"><span>{driving ? '07 / TEST CIRCUIT' : cockpit.active ? '06 / COCKPIT STUDY' : customization ? '05 / MATERIAL STUDIO' : engineering ? '04 / ENGINEERING STUDY' : disassembly ? '03 / REFERENCE DISASSEMBLY' : explorerOpen ? '02 / COMPONENT STUDY' : '01 / THE SHOWROOM'}</span><span className="live-mark"><span className="status-dot"/>{ready ? 'REAL-TIME RENDER' : 'LOADING ASSETS'}</span></div>
      {driving ? <DrivingPanel/> : cockpit.active ? <CockpitPanel/> : customization ? <CustomizationPanel/> : engineering ? <EngineeringPanel/> : explorerOpen && <ComponentExplorer/>}<aside className="vehicle-card"><span className="eyebrow">THE FIRST STUDY</span><h2>Form meets<br/>performance.</h2><p>An exploration of the supercar.<br/>Presented in its purest form.</p><div className="vehicle-card-line"/><div className="reference-label">458 ITALIA <span>REFERENCE SERIES</span></div><button className="text-button" onClick={() => setAbout(true)}>About this study <ArrowUpRight size={15}/></button></aside>
      <div className="floor-label" aria-hidden="true"><span>FX—001</span><span>DESIGN / ENGINEERING / EXPLORATION</span></div>
      <div className="bottom-content">
        <div className="intro-action"><AnimatePresence mode="wait">{!state.entered ? <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="enter-button" disabled={!ready} onClick={state.enter}>{ready ? 'Enter the experience' : 'Preparing experience'}<ArrowUpRight size={19}/></button><span className="entry-caption">A DIFFERENT PERSPECTIVE AWAITS</span></motion.div> : <motion.div key="entered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="exploring"><span className="status-dot"/> THE STUDIO IS YOURS<span>Drag to explore every angle.</span></motion.div>}</AnimatePresence></div>
        <div className="orbit-hint"><Mouse size={17}/><span>Drag to orbit <i/> Scroll to zoom</span></div>
        <div className="scene-number"><span>360°</span><small>NO ORDINARY POINT OF VIEW</small></div>
      </div>
      {cockpit.active && <motion.div key={cockpit.transitionKey} className="cockpit-fade" initial={{ opacity: 1 }} animate={{ opacity: cockpit.safety ? 0 : 1 }} transition={{ duration: reduceMotion ? 0 : 0.45 }} aria-hidden="true"/>}
      <div className="camera-toolbar" aria-label="Camera controls">
        {!driving && (cockpit.active ? <button className="view-button" onClick={cockpit.recenter}><RotateCcw size={16}/>Recenter look</button> : <><div className="view-selector"><button className="view-button" aria-expanded={menu} onClick={() => setMenu(!menu)}><span className="camera-icon"><MoveUpRight size={15}/></span>{perspectives.find((p) => p.id === state.view)?.label}<ChevronDown size={13}/></button>{menu && <div className="view-menu">{perspectives.map((p) => <button key={p.id} onClick={() => { state.setView(p.id); setMenu(false); }} aria-pressed={state.view === p.id}>{p.label}{state.view === p.id && <Check size={14}/>}</button>)}</div>}</div>
        <span className="toolbar-divider"/>
        <button className={state.autoRotate ? 'tool active' : 'tool'} aria-label="Toggle automatic rotation" aria-pressed={state.autoRotate} onClick={state.toggleRotate} title="Automatic rotation"><Rotate3D size={18}/></button>
        <button className="tool" aria-label="Reset camera" onClick={state.reset} title="Reset camera"><RotateCcw size={17}/></button></>)}
        <button className="tool quality-button" aria-label={`Render quality: ${state.quality}. Click to switch.`} onClick={state.toggleQuality} title={`Quality: ${state.quality}`}><Settings2 size={17}/><span>{state.quality === 'high' ? 'HQ' : 'ECO'}</span></button>
        {document.fullscreenEnabled && <><span className="toolbar-divider"/><button className="tool" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={toggleFullscreen}>{fullscreen ? <Minimize size={17}/> : <Maximize size={17}/>}</button></>}
      </div>
      <span className="side-index" aria-hidden="true">EST. 2026 — CONCEPT STUDIES</span>
    </section>
    <footer><span>BUILT ON CURIOSITY. DRIVEN BY DETAIL.</span><button onClick={() => setAbout(true)}><Info size={13}/> Phase 08 — Test circuit <ArrowRight size={13}/></button><span className="footer-brand">BEYOND THE MACHINE <span>↗</span></span></footer>
    <AnimatePresence>{about && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbout(false)}><section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.getElementById('close-about')?.focus(); } }}><button id="close-about" className="close-button" aria-label="Close project information" onClick={() => setAbout(false)}><X size={20}/></button><div className="eyebrow">FORMULA X / DEVELOPMENT STUDY</div><h2 id="about-title">Anatomy of<br/>an experience.</h2><p>Phase 08 adds a compact driving circuit, Rapier vehicle physics, keyboard and touch controls, chase and cockpit cameras, wheel and brake-light animation, and optional synthesized engine audio. Earlier exploration modes and customization remain available.</p><div className="phase-note"><span>08</span><div><strong>Test circuit</strong><p>Reference study · limited asset coverage</p></div><Info size={18}/></div><p>The Ferrari 458 Italia is a temporary reference asset by vicent091036, distributed with the Three.js car example. It is not the original FORMULA X V12. Attribution is recorded in the repository. Original model licensing must be confirmed before publication.</p><p>The reference has independent wheel geometry but lacks separate body panels and mechanical internals. A licensed original vehicle is required for full vehicle coverage. The explorer covers verified reference geometry. The exploded view covers the available wheel and steering geometry. The brake study is partial; engine, suspension and structural chassis assets are missing. Material customization is available on the supplied groups. Cockpit viewpoints use a fade rather than door animation. Separate doors, hinges, interactive gauges and console switches are missing. Alternate geometry and independent stitching remain unavailable. Driving uses an illustrative physics tune and synthesized audio; it is not calibrated to a Ferrari or the original FORMULA X concept. Suspension response is simulated, while separate suspension geometry is missing.</p><div className="modal-bottom">CONCEPT SPECIFICATIONS ARE ILLUSTRATIVE<span>FX—001</span></div></section></motion.div>}</AnimatePresence>
  </main>;
}
