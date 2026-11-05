import fs from 'node:fs';
import crypto from 'node:crypto';
import { Matrix4, Quaternion, Vector3 } from 'three';

const input = 'public/models/ferrari.glb';
const output = 'src/models/vehicle/reference-manifest.json';
const bytes = fs.readFileSync(input);
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw Error('Invalid GLB header');
const length = bytes.readUInt32LE(12);
if (bytes.readUInt32LE(16) !== 0x4e4f534a) throw Error('GLB JSON chunk missing');
const gltf = JSON.parse(bytes.subarray(20, 20 + length).toString());
const parents = new Map();
gltf.nodes.forEach((node, index) => (node.children ?? []).forEach((child) => {
  if (parents.has(child)) throw Error('Multiple parents for node ' + child);
  parents.set(child, index);
}));
const id = (index) => `reference.node.${index}`;
const wheels = { wheel_fl: 'Front left wheel assembly', wheel_fr: 'Front right wheel assembly', wheel_rl: 'Rear left wheel assembly', wheel_rr: 'Rear right wheel assembly' };
const world = new Map();
function localMatrix(node) {
  return node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
}
function worldMatrix(index, seen = new Set()) {
  if (world.has(index)) return world.get(index);
  if (seen.has(index)) throw Error('Cyclic node graph');
  seen.add(index);
  const matrix = localMatrix(gltf.nodes[index]);
  if (parents.has(index)) matrix.premultiply(worldMatrix(parents.get(index), seen));
  world.set(index, matrix);
  return matrix;
}
const components = gltf.nodes.map((node, index) => {
  const parentIndex = parents.get(index);
  const wheelParent = wheels[gltf.nodes[parentIndex]?.name];
  const semantic = !!wheels[node.name] || node.name === 'steering_wheel' || (!!wheelParent && /^(rim_|tire$|brake$)/.test(node.name));
  const displayName = wheels[node.name] ?? (node.name === 'steering_wheel' ? 'Steering wheel assembly' : wheelParent ? `${wheelParent.replace(' assembly', '')} / ${node.name.startsWith('rim_') ? 'rim geometry' : node.name === 'brake' ? 'combined brake geometry' : node.name}` : `${node.name} (${node.mesh === undefined ? 'group' : 'merged geometry'})`);
  const position = new Vector3(), quaternion = new Quaternion(), scale = new Vector3();
  localMatrix(node).decompose(position, quaternion, scale);
  const materials = [...new Set((gltf.meshes[node.mesh]?.primitives ?? []).map((p) => gltf.materials[p.material]?.name ?? 'default'))];
  return {
    id: id(index), sourceNodeIndex: index, sourceName: node.name, displayName,
    parentId: parentIndex === undefined ? null : id(parentIndex),
    category: wheels[node.name] || wheelParent ? 'wheels' : node.name.startsWith('steering') ? 'interior' : 'aggregate',
    kind: node.mesh === undefined ? 'assembly' : semantic ? 'geometry' : 'material-aggregate',
    originalTransform: { position: node.matrix ? position.toArray() : (node.translation ?? [0, 0, 0]), quaternion: node.matrix ? quaternion.toArray() : (node.rotation ?? [0, 0, 0, 1]), scale: node.matrix ? scale.toArray() : (node.scale ?? [1, 1, 1]), matrix: localMatrix(node).toArray() },
    pivot: { local: [0, 0, 0], sourceWorld: new Vector3().setFromMatrixPosition(worldMatrix(index)).toArray(), status: 'source-origin-unverified' },
    meshIndex: node.mesh ?? null, materials, selectable: semantic, visible: true,
    explosionVector: null,
    capabilities: { inspect: semantic, independentlyAddressable: true, disassemble: false, articulate: false },
  };
});
const manifest = {
  schemaVersion: 1, assetId: 'ferrari-458-reference', url: '/models/ferrari.glb', sha256: crypto.createHash('sha256').update(bytes).digest('hex'), byteLength: bytes.length,
  licenseStatus: 'original-license-unverified', coordinateSystem: 'glTF right-handed Y-up; model front -Z; source units not independently verified',
  counts: { nodes: components.length, meshNodes: components.filter((c) => c.meshIndex !== null).length, meshes: gltf.meshes.length, selectable: components.filter((c) => c.selectable).length },
  components,
  unavailable: ['independent body panels', 'independent doors and hinges', 'engine block and cylinder heads', 'intake and exhaust assemblies', 'transmission and differential', 'suspension and control arms', 'separate brake discs and calipers', 'structural chassis', 'separate seats and dashboard', 'validated mechanical pivots'],
};
const serialized = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== serialized) throw Error('Manifest is stale: run npm run assets:audit');
  console.log('Asset hash, hierarchy and transform manifest verified:', manifest.counts);
} else {
  fs.writeFileSync(output, serialized);
  console.log('Manifest generated:', manifest.counts);
}
