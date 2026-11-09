import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BufferAttribute, BufferGeometry, Group, Mesh, LineBasicMaterial, LineSegments, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { VehicleRegistry } from '../../models/vehicle/registry';
import { useExplorer } from '../../stores/explorer-store';
import { useDisassembly } from '../../stores/disassembly-store';
import { separationConfig } from './config';
export function effectivelyVisible(object: Object3D) {
  let current: Object3D | null = object; while (current) { if (!current.visible) return false; current = current.parent; }
  if (object instanceof Mesh) return true;
  let hasVisibleMesh = false;
  object.traverse((child) => { if (!(child instanceof Mesh)) return; let current: Object3D | null = child; while (current && current !== object) { if (!current.visible) return; current = current.parent; } hasVisibleMesh = true; });
  return hasVisibleMesh;
}
export function FollowingLabel({ object, name, raised = false }: { object: Object3D; name: string; raised?: boolean }) {
  const anchor = useRef<Group>(null); const label = useRef<HTMLDivElement>(null); const position = useMemo(() => new Vector3(), []);
  useFrame(() => {
    if (!anchor.current) return;
    object.getWorldPosition(position); if (raised) position.y += 0.5;
    anchor.current.position.copy(position); anchor.current.visible = effectivelyVisible(object); if (label.current) label.current.style.display = anchor.current.visible ? 'flex' : 'none';
  });
  return <group ref={anchor}><Html style={{ pointerEvents: 'none' }} zIndexRange={[4, 0]}><div ref={label} className="component-label">{name}</div></Html></group>;
}
export function DisassemblyPresentation({ registry }: { registry: VehicleRegistry }) {
  const isolatedId = useDisassembly((s) => s.isolatedId);
  const selectedId = useExplorer((s) => s.selectedId);
  const guides = useDisassembly((s) => s.guides), labels = useDisassembly((s) => s.labels);
  const data = useMemo(() => {
    const entries = separationConfig.filter((c) => c.stage === 0 || c.stage === 4).map((c) => registry.entries.get(c.id)!);
    // Original world pivots are reconstructed from the immutable glTF hierarchy, not current animation state.
    const starts = entries.map((entry) => {
      const source = new Vector3(...entry.metadata.pivot.sourceWorld);
      let parent = entry.object; while (parent.parent && parent.name !== 'ShowroomPlacement') parent = parent.parent;
      return source.add(parent.name === 'ShowroomPlacement' ? parent.position : new Vector3());
    });
    const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(new Float32Array(entries.length * 6), 3));
    const material = new LineBasicMaterial({ color: '#b1c79c', transparent: true, opacity: 0.25, depthWrite: false });
    const lines = new LineSegments(geometry, material); lines.name = 'DisassemblyGuideLines'; lines.raycast = () => {};
    return { entries, starts, geometry, material, lines };
  }, [registry]);
  const current = useMemo(() => new Vector3(), []);
  useEffect(() => () => { data.geometry.dispose(); data.material.dispose(); }, [data]);
  useFrame(() => {
    const positions = data.geometry.attributes.position as BufferAttribute;
    data.entries.forEach((entry, index) => {
      const start = data.starts[index]; entry.object.getWorldPosition(current);
      if (!effectivelyVisible(entry.object)) current.copy(start);
      positions.setXYZ(index * 2, start.x, start.y, start.z); positions.setXYZ(index * 2 + 1, current.x, current.y, current.z);
    });
    positions.needsUpdate = true; data.geometry.computeBoundingSphere();
  });
  return <><primitive object={data.lines} visible={guides && !isolatedId}/>{labels && !isolatedId && data.entries.filter((entry) => entry.metadata.id !== selectedId).map((entry) => <FollowingLabel key={entry.metadata.id} object={entry.object} name={entry.metadata.displayName} raised/>)}</>;
}
