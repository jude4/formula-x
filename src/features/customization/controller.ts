import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import type { BufferGeometry, Material } from 'three';
import type { VehicleRegistry } from '../../models/vehicle/registry';
import { cornerAssemblies } from '../engineering/catalog';
import { createProjectedGeometry } from './projection';
import { createSurfaceTextures } from './textures';
import { validColor, wheelFinishes } from './catalog';
import type { Appearance } from './catalog';
type Role = 'body' | 'wheel' | 'brake' | 'upholstery' | 'trim';
export function createCustomizationController(registry: VehicleRegistry) {
  const surfaces = createSurfaceTextures();
  const wheelIds = new Set(Object.values(cornerAssemblies).flatMap((c) => [c.parts.rim, c.parts.core]));
  const brakeIds = new Set(Object.values(cornerAssemblies).map((c) => c.parts.brake));
  const entries: { mesh: Mesh; original: Material | Material[]; originalGeometry: BufferGeometry; mappedGeometry?: BufferGeometry; owned: Material[]; roles: (Role | null)[] }[] = [];
  const seen = new Set<Mesh>();
  for (const { object, metadata } of registry.entries.values()) {
    object.traverse((child) => {
      if (!(child instanceof Mesh) || seen.has(child)) return;
      // Register only a source node's own primitives, not descendant component nodes.
      if (child !== object && child.userData.sourceNodeIndex !== undefined) return;
      const originals = Array.isArray(child.material) ? child.material : [child.material];
      const roles = originals.map((m): Role | null => {
        if (metadata.sourceName === 'body') return 'body';
        if (wheelIds.has(metadata.id) && !/yellow|badge/i.test(m.name)) return 'wheel';
        if (brakeIds.has(metadata.id)) return 'brake';
        if (/^Leather(?:_red)?$/i.test(m.name)) return 'upholstery';
        if (m.name === 'Carbon_Fiber') return 'trim';
        return null;
      });
      if (!roles.some(Boolean)) return;
      seen.add(child); entries.push({ mesh: child, original: child.material, originalGeometry: child.geometry, owned: originals.map((m) => m.clone()), roles });
    });
  }
  if (!entries.some((e) => e.roles.includes('body'))) throw Error('Body appearance material missing');
  function carbon(material: MeshStandardMaterial) { material.map = surfaces.weaveColor; material.normalMap = surfaces.weaveNormal; material.normalScale.set(0.35, 0.35); material.roughnessMap = surfaces.weaveRoughness; material.roughness = 0.58; material.metalness = 0.25; }
  function brushed(material: MeshStandardMaterial) { material.normalMap = surfaces.brushNormal; material.normalScale.set(0.035, 0.035); material.roughnessMap = surfaces.brushRoughness; material.roughness = 0.42; material.metalness = 1; if (material instanceof MeshPhysicalMaterial) { material.anisotropy = 0.8; material.anisotropyRotation = Math.PI / 2; } }
  return {
    apply(appearance: Appearance) {
      if (!validColor(appearance.paint)) throw Error('Invalid paint color');
      surfaces.refresh();
      for (const entry of entries) {
        const mappedBody = entry.roles.includes('body') && (appearance.finish === 'carbon' || appearance.finish === 'brushed');
        const mappedTrim = entry.roles.includes('trim') && appearance.trimFinish !== 'original';
        if (mappedBody || mappedTrim) { entry.mappedGeometry ??= createProjectedGeometry(entry.originalGeometry); entry.mesh.geometry = entry.mappedGeometry; }
        else entry.mesh.geometry = entry.originalGeometry;
        const originals = Array.isArray(entry.original) ? entry.original : [entry.original];
        entry.owned.forEach((material, i) => {
          material.copy(originals[i]);
          if (!(material instanceof MeshStandardMaterial)) return;
          const role = entry.roles[i];
          if (role === 'body' && material instanceof MeshPhysicalMaterial) {
            material.color.set(appearance.paint);
            if (appearance.finish === 'gloss') { material.roughness = 0.15; material.metalness = 0.25; material.clearcoat = 1; material.clearcoatRoughness = 0.07; }
            if (appearance.finish === 'matte') { material.roughness = 0.82; material.metalness = 0.05; material.clearcoat = 0; }
            if (appearance.finish === 'carbon') { carbon(material); material.color.multiplyScalar(0.5); material.clearcoat = 0.35; material.clearcoatRoughness = 0.2; }
            if (appearance.finish === 'brushed') { brushed(material); material.clearcoat = 0; }
          }
          if (role === 'wheel') { const finish = wheelFinishes[appearance.wheelFinish]; if (finish.color) { material.color.set(finish.color); material.roughness = finish.roughness; material.metalness = finish.metalness; } }
          if (role === 'brake' && appearance.brakeTint) material.color.set(appearance.brakeTint);
          if (role === 'upholstery') { if (appearance.upholsteryColor) material.color.set(appearance.upholsteryColor); if (appearance.upholsteryFinish === 'smooth') material.roughness = 0.45; if (appearance.upholsteryFinish === 'matte') material.roughness = 0.9; }
          if (role === 'trim' && appearance.trimFinish === 'carbon') { carbon(material); material.color.set('#3a3e38'); }
          if (role === 'trim' && appearance.trimFinish === 'brushed') { brushed(material); material.color.set('#858b87'); }
          material.needsUpdate = true;
        });
        // Rebind on each application, including React Strict Mode's effect reactivation.
        entry.mesh.material = Array.isArray(entry.original) ? entry.owned : entry.owned[0];
      }
    },
    dispose() { for (const entry of entries) { entry.mesh.material = entry.original; entry.mesh.geometry = entry.originalGeometry; entry.mappedGeometry?.dispose(); entry.owned.forEach((m) => m.dispose()); } surfaces.dispose(); },
  };
}
