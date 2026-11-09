import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Crosshair, Search, X } from 'lucide-react';
import { useDisassembly } from '../../stores/disassembly-store';
import { DisassemblyControls, SelectedDisassemblyControls } from '../disassembly/DisassemblyControls';
import { useExplorer } from '../../stores/explorer-store';
import { componentById, componentDetails, inspectableComponents, relatedComponents, shortComponentName } from './details';
export default function ComponentExplorer() {
  const disassembly = useDisassembly((s) => s.active);
  const selectedId = useExplorer((s) => s.selectedId);
  const select = useExplorer((s) => s.select);
  const [query, setQuery] = useState('');
  const hierarchy = useRef<HTMLUListElement>(null);
  const panel = useRef<HTMLElement>(null);
  useLayoutEffect(() => { panel.current?.scrollTo({ top: 0 }); }, [disassembly]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['reference.node.36']));
  const selected = selectedId ? componentById.get(selectedId) : undefined;
  const details = selected ? componentDetails(selected) : undefined;
  useEffect(() => { if (selected?.parentId) setExpanded((old) => new Set([...old, selected.parentId!])); }, [selected]);
  const roots = useMemo(() => inspectableComponents.filter((c) => !componentById.has(c.parentId ?? '')), []);
  useLayoutEffect(() => {
    if (!selectedId || !hierarchy.current) return;
    const row = hierarchy.current.querySelector<HTMLElement>(`[data-component-id="${selectedId}"]`);
    if (!row) return;
    const listBounds = hierarchy.current.getBoundingClientRect(), rowBounds = row.getBoundingClientRect();
    if (rowBounds.top < listBounds.top) hierarchy.current.scrollTop -= listBounds.top - rowBounds.top;
    else if (rowBounds.bottom > listBounds.bottom) hierarchy.current.scrollTop += rowBounds.bottom - listBounds.bottom;
  }, [selectedId, expanded, query]);
  const needle = query.trim().toLowerCase();
  const matches = inspectableComponents.filter((c) => `${c.displayName} ${c.category} ${c.materials.join(' ')}`.toLowerCase().includes(needle));
  return <aside ref={panel} className="component-explorer" aria-label="Component explorer">
    <div className="explorer-heading"><div><span className="eyebrow">THE COMPONENT STUDY</span><h2>Look closer.</h2></div><button className="explorer-close" aria-label="Close component explorer" onClick={() => useExplorer.getState().setOpen(false)}><X size={17}/></button></div>
    <p className="explorer-intro">Select a wheel or steering wheel in the studio, or browse the available geometry.</p>
    {disassembly && <DisassemblyControls/>}
    <label className="component-search"><Search size={14}/><input type="search" placeholder="Find a component…" aria-label="Search components" value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim()) setExpanded(new Set(roots.map((root) => root.id))); }}/></label>
    <div className="hierarchy-heading"><span>REFERENCE COMPONENTS</span><span>{matches.length} / {inspectableComponents.length}</span></div>
    <ul ref={hierarchy} className="component-tree" aria-label="Component hierarchy">
      {roots.map((root) => {
        const children = inspectableComponents.filter((c) => c.parentId === root.id);
        const rootMatches = matches.includes(root);
        const visibleChildren = rootMatches ? children : children.filter((c) => matches.includes(c));
        if (!rootMatches && !visibleChildren.length) return null;
        const isExpanded = expanded.has(root.id);
        return <li key={root.id}><div className="component-root-row">{children.length > 0 ? <button className="hierarchy-toggle" aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${root.displayName}`} aria-expanded={isExpanded} onClick={() => setExpanded((old) => { const next = new Set(old); if (isExpanded) next.delete(root.id); else next.add(root.id); return next; })}>{isExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}</button> : <span className="hierarchy-spacer"/>}<button data-component-id={root.id} className="component-row" aria-pressed={selectedId === root.id} onClick={() => select(root.id)}>{root.displayName}</button></div>{children.length > 0 && isExpanded && <ul>{visibleChildren.map((child) => <li key={child.id}><button data-component-id={child.id} className="component-row component-child" aria-label={child.displayName} aria-pressed={selectedId === child.id} onClick={() => select(child.id)}><span/>{shortComponentName(child)}</button></li>)}</ul>}</li>;
      })}
    </ul>
    {matches.length === 0 && <p className="empty-search" role="status">No matching components. Try “tire”, “rim”, or “brake”.</p>}
    <section className="component-detail" aria-label="Selected component" aria-live="polite">
      {selected && details ? <><div className="detail-topline"><span className="eyebrow">SELECTED GEOMETRY</span><button aria-label="Clear component selection" onClick={() => useExplorer.getState().clear()}><X size={14}/></button></div><h3>{selected.displayName}</h3><p>{details.description}</p><dl><div><dt>System</dt><dd>{selected.category === 'wheels' ? 'Wheels & brakes' : 'Interior'}</dd></div><div><dt>Role</dt><dd>{details.role}</dd></div><div><dt>Asset materials</dt><dd>{selected.materials.length ? selected.materials.join(', ') : 'Multiple child materials'}</dd></div><div><dt>Engineering specs</dt><dd>Not supplied</dd></div><div><dt>Articulation pivot</dt><dd>Unverified</dd></div></dl><button className="focus-component" onClick={() => useExplorer.getState().refocus()}><Crosshair size={14}/>Focus component</button>{disassembly && <SelectedDisassemblyControls/>}{relatedComponents(selected).length > 0 && <div className="related-components"><span>RELATED GEOMETRY</span>{relatedComponents(selected).map((component) => <button key={component.id} onClick={() => select(component.id)}>{shortComponentName(component)}<ChevronRight size={12}/></button>)}</div>}</> : <div className="selection-empty"><Crosshair size={20}/><h3>A different kind of detail.</h3><p>Select a component to inspect its geometry and relationships.</p></div>}
    </section>
    <p className="asset-disclosure">Reference geometry only. Body panels and mechanical internals are not independently available. {disassembly ? 'Only the documented reference geometry separates.' : 'Use Disassembly to separate the verified geometry.'}</p>
  </aside>;
}
