import { referenceManifest } from '../../models/vehicle/manifest';
export type Corner = 'front-left' | 'front-right' | 'rear-left' | 'rear-right';
export type LabLayer = 'brake' | 'rim' | 'tire' | 'core' | 'centre' | 'fasteners';
export const layerLabels: Record<LabLayer, string> = {
  brake: 'Combined brake geometry', rim: 'Rim geometry', tire: 'Tire geometry',
  core: 'Wheel core geometry', centre: 'Centre trim geometry', fasteners: 'Fastener geometry',
};
export interface CornerAssembly { label: string; assembly: string; parts: Record<LabLayer, string> }
const id = (index: number) => `reference.node.${index}`;
export const cornerAssemblies: Record<Corner, CornerAssembly> = {
  'front-left': { label: 'Front left', assembly: id(36), parts: { brake: id(38), rim: id(37), tire: id(42), core: id(41), centre: id(39), fasteners: id(40) } },
  'front-right': { label: 'Front right', assembly: id(43), parts: { brake: id(44), rim: id(47), tire: id(48), core: id(46), centre: id(45), fasteners: id(49) } },
  'rear-left': { label: 'Rear left', assembly: id(29), parts: { brake: id(31), rim: id(34), tire: id(30), core: id(33), centre: id(32), fasteners: id(35) } },
  'rear-right': { label: 'Rear right', assembly: id(22), parts: { brake: id(27), rim: id(25), tire: id(24), core: id(23), centre: id(26), fasteners: id(28) } },
};
export const defaultLayers: Record<LabLayer, boolean> = { brake: true, rim: false, tire: false, core: false, centre: false, fasteners: false };
export function cornerSelectable(corner: Corner, componentId: string) {
  const c = cornerAssemblies[corner];
  return [c.assembly, c.parts.brake, c.parts.rim, c.parts.tire].includes(componentId);
}
export function layerForComponent(corner: Corner, componentId: string): LabLayer | undefined {
  return (Object.keys(layerLabels) as LabLayer[]).find((layer) => cornerAssemblies[corner].parts[layer] === componentId);
}
export function engineeringLevels(corner: Corner, separated: boolean) {
  const c = cornerAssemblies[corner];
  return separated ? { [c.parts.brake]: 1, [c.parts.rim]: 1, [c.parts.tire]: 1 } : {};
}
export function engineeringHidden(corner: Corner, layers: Record<LabLayer, boolean>) {
  return Object.fromEntries((Object.keys(layerLabels) as LabLayer[]).filter((layer) => !layers[layer]).map((layer) => [cornerAssemblies[corner].parts[layer], true]));
}
export const missingLabs = [
  { name: 'Engine laboratory', reason: 'No independently authored engine block, heads, intake, exhaust, cooling or lubrication geometry is supplied.' },
  { name: 'Suspension laboratory', reason: 'Springs, dampers and control arms are not available as independent assemblies.' },
  { name: 'Chassis laboratory', reason: 'A structural chassis and verified mounting points are not available. Merged body geometry is not a chassis substitute.' },
];
export function validateEngineeringCatalog() {
  for (const c of Object.values(cornerAssemblies)) {
    const parent = referenceManifest.components.find((entry) => entry.id === c.assembly);
    if (!parent?.selectable) throw Error('Missing wheel assembly');
    if (new Set(Object.values(c.parts)).size !== 6) throw Error('Duplicated laboratory layer');
    for (const [role, partId] of Object.entries(c.parts)) {
      const entry = referenceManifest.components.find((part) => part.id === partId);
      if (entry?.parentId !== c.assembly || entry.meshIndex === null) throw Error(`Incorrect laboratory part: ${partId}`);
      const expected: string | undefined = ({ brake: 'brake', tire: 'tire', core: 'wheel', centre: 'centre', fasteners: 'nuts' } as Record<string, string>)[role];
      if (role === 'rim' ? !entry.sourceName.startsWith('rim_') : entry.sourceName !== expected) throw Error(`Incorrect laboratory role: ${partId}`);
    }
  }
}
