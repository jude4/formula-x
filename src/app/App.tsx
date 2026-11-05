import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ArrowRight, RotateCcw, Rotate3D, Maximize, Minimize, X, MoveUpRight, Mouse, ChevronDown, Info, Check, Settings2 } from 'lucide-react';
import { useShowroom } from '../stores/showroom-store';
import type { CameraView } from '../stores/showroom-store';
import { SceneErrorBoundary } from '../components/ui/ErrorBoundary';
const Showroom = lazy(() => import('../three/scenes/Showroom'));
const perspectives: { id: CameraView; label: string }[] = [{ id: 'hero', label: 'Perspective' }, { id: 'front', label: 'Front' }, { id: 'side', label: 'Side' }, { id: 'rear', label: 'Rear' }];
export default function App() {
  const [ready, setReady] = useState(false);
  const [about, setAbout] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [menu, setMenu] = useState(false);
  const state = useShowroom();
  const reduceMotion = useReducedMotion();
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const onFullscreen = () => setFullscreen(!!document.fullscreenElement);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setAbout(false); setMenu(false); } };
    document.addEventListener('fullscreenchange', onFullscreen); window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('fullscreenchange', onFullscreen); window.removeEventListener('keydown', onKey); };
  }, []);
  useEffect(() => { if (about) document.getElementById('close-about')?.focus(); }, [about]);
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { /* Browser may reject fullscreen; no app state is changed. */ } }
  return <main className="experience">
    <header className="header">
      <a className="brand" href="/" aria-label="Formula X home">FORMULA<span className="brand-x">X</span><span className="brand-caption">AUTOMOTIVE EXPLORATION</span></a>
      <nav aria-label="Main navigation"><span className="nav-active"><span/>Showroom</span><button onClick={() => setAbout(true)}>The project <ArrowUpRight size={13}/></button></nav>
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
      <div className="scene"><SceneErrorBoundary><Suspense fallback={<div className="initial-loading">OPENING THE STUDIO…</div>}><Showroom onReady={onReady}/></Suspense></SceneErrorBoundary></div>
      <div className="scene-topline"><span>01 / THE SHOWROOM</span><span className="live-mark"><span className="status-dot"/>{ready ? 'REAL-TIME RENDER' : 'LOADING ASSETS'}</span></div>
      <aside className="vehicle-card"><span className="eyebrow">THE FIRST STUDY</span><h2>Form meets<br/>performance.</h2><p>An exploration of the supercar.<br/>Presented in its purest form.</p><div className="vehicle-card-line"/><div className="reference-label">458 ITALIA <span>REFERENCE SERIES</span></div><button className="text-button" onClick={() => setAbout(true)}>About this study <ArrowUpRight size={15}/></button></aside>
      <div className="floor-label" aria-hidden="true"><span>FX—001</span><span>DESIGN / ENGINEERING / EXPLORATION</span></div>
      <div className="bottom-content">
        <div className="intro-action"><AnimatePresence mode="wait">{!state.entered ? <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="enter-button" disabled={!ready} onClick={state.enter}>{ready ? 'Enter the experience' : 'Preparing experience'}<ArrowUpRight size={19}/></button><span className="entry-caption">A DIFFERENT PERSPECTIVE AWAITS</span></motion.div> : <motion.div key="entered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="exploring"><span className="status-dot"/> THE STUDIO IS YOURS<span>Drag to explore every angle.</span></motion.div>}</AnimatePresence></div>
        <div className="orbit-hint"><Mouse size={17}/><span>Drag to orbit <i/> Scroll to zoom</span></div>
        <div className="scene-number"><span>360°</span><small>NO ORDINARY POINT OF VIEW</small></div>
      </div>
      <div className="camera-toolbar" aria-label="Camera controls">
        <div className="view-selector"><button className="view-button" aria-expanded={menu} onClick={() => setMenu(!menu)}><span className="camera-icon"><MoveUpRight size={15}/></span>{perspectives.find((p) => p.id === state.view)?.label}<ChevronDown size={13}/></button>{menu && <div className="view-menu">{perspectives.map((p) => <button key={p.id} onClick={() => { state.setView(p.id); setMenu(false); }} aria-pressed={state.view === p.id}>{p.label}{state.view === p.id && <Check size={14}/>}</button>)}</div>}</div>
        <span className="toolbar-divider"/>
        <button className={state.autoRotate ? 'tool active' : 'tool'} aria-label="Toggle automatic rotation" aria-pressed={state.autoRotate} onClick={state.toggleRotate} title="Automatic rotation"><Rotate3D size={18}/></button>
        <button className="tool" aria-label="Reset camera" onClick={state.reset} title="Reset camera"><RotateCcw size={17}/></button>
        <button className="tool quality-button" aria-label={`Render quality: ${state.quality}. Click to switch.`} onClick={state.toggleQuality} title={`Quality: ${state.quality}`}><Settings2 size={17}/><span>{state.quality === 'high' ? 'HQ' : 'ECO'}</span></button>
        {document.fullscreenEnabled && <><span className="toolbar-divider"/><button className="tool" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={toggleFullscreen}>{fullscreen ? <Minimize size={17}/> : <Maximize size={17}/>}</button></>}
      </div>
      <span className="side-index" aria-hidden="true">EST. 2026 — CONCEPT STUDIES</span>
    </section>
    <footer><span>BUILT ON CURIOSITY. DRIVEN BY DETAIL.</span><button onClick={() => setAbout(true)}><Info size={13}/> Phase 02 — Asset preparation <ArrowRight size={13}/></button><span className="footer-brand">BEYOND THE MACHINE <span>↗</span></span></footer>
    <AnimatePresence>{about && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbout(false)}><section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.getElementById('close-about')?.focus(); } }}><button id="close-about" className="close-button" aria-label="Close project information" onClick={() => setAbout(false)}><X size={20}/></button><div className="eyebrow">FORMULA X / DEVELOPMENT STUDY</div><h2 id="about-title">Anatomy of<br/>an experience.</h2><p>The studio foundation is preserved. Phase 02 adds a validated component registry and an asset preparation workflow. Orbit, pan, zoom, choose a perspective, or let the camera rotate.</p><div className="phase-note"><span>02</span><div><strong>Asset preparation</strong><p>In progress · original vehicle required</p></div><Info size={18}/></div><p>The Ferrari 458 Italia is a temporary reference asset by vicent091036, distributed with the Three.js car example. It is not the original FORMULA X V12. Attribution is recorded in the repository. Original model licensing must be confirmed before publication.</p><p>The reference has independent wheel geometry but lacks separate body panels and mechanical internals. A licensed original vehicle is required to complete this phase. The component explorer and later experiences have not started.</p><div className="modal-bottom">CONCEPT SPECIFICATIONS ARE ILLUSTRATIVE<span>FX—001</span></div></section></motion.div>}</AnimatePresence>
  </main>;
}
