import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, InstancedMesh, Object3D } from 'three';
import { barriers, circuit, track } from './track';
function strip(offset: number, width: number) {
  const points = circuit(track.radius, 1.5), positions: number[] = [], indices: number[] = [];
  points.forEach((p, i) => {
    for (const side of [-1, 1]) { const d = offset + side * width; positions.push(p.x + Math.cos(p.yaw) * d, 0, p.z - Math.sin(p.yaw) * d); }
    const next = (i + 1) % points.length; indices.push(i * 2, next * 2, i * 2 + 1, next * 2, next * 2 + 1, i * 2 + 1);
  });
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
export default function Track() {
  const road = useMemo(() => strip(0, 6), []), inner = useMemo(() => strip(-5.65, 0.06), []), outer = useMemo(() => strip(5.65, 0.06), []);
  useEffect(() => () => { road.dispose(); inner.dispose(); outer.dispose(); }, [road, inner, outer]);
  const walls = useRef<InstancedMesh>(null), kerbs = useRef<InstancedMesh>(null), trees = useRef<InstancedMesh>(null);
  const curbPoints = useMemo(() => [-6.2, 6.2].flatMap(offset => circuit(32, 2).map((p, i) => ({ x: p.x + Math.cos(p.yaw) * offset, z: p.z - Math.sin(p.yaw) * offset, yaw: p.yaw, i }))), []);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    barriers.forEach((p, i) => { dummy.position.set(p.x, .5, p.z); dummy.rotation.set(0, p.yaw, 0); dummy.scale.set(1, 1, p.length); dummy.updateMatrix(); walls.current!.setMatrixAt(i, dummy.matrix); }); walls.current!.instanceMatrix.needsUpdate = true;
    curbPoints.forEach((p, i) => { dummy.position.set(p.x, .04, p.z); dummy.rotation.set(0, p.yaw, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); kerbs.current!.setMatrixAt(i, dummy.matrix); kerbs.current!.setColorAt(i, new Color(p.i % 2 ? '#d8dfd1' : '#a7c879')); }); kerbs.current!.instanceMatrix.needsUpdate = true; kerbs.current!.instanceColor!.needsUpdate = true;
    for (let i = 0; i < 28; i++) { const x = i % 2 ? -62 : 62, z = -95 + Math.floor(i / 2) * 14.5; dummy.position.set(x, 2, z); dummy.rotation.set(0, i, 0); dummy.scale.set(1, 1 + (i % 3) * .2, 1); dummy.updateMatrix(); trees.current!.setMatrixAt(i, dummy.matrix); } trees.current!.instanceMatrix.needsUpdate = true;
  }, [curbPoints]);
  return <group name="TestCircuit">
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[230, 230]}/><meshStandardMaterial color="#364532" roughness={1}/></mesh>
    <mesh geometry={road} position-y={.012} receiveShadow><meshStandardMaterial color="#343a3b" roughness={.92} side={2}/></mesh>
    {[inner, outer].map((geometry, i) => <mesh key={i} geometry={geometry} position-y={.018}><meshStandardMaterial color="#d4d6c3" roughness={1} side={2}/></mesh>)}
    <instancedMesh ref={walls} args={[undefined, undefined, barriers.length]} castShadow receiveShadow><boxGeometry args={[.56, 1, 1]}/><meshStandardMaterial color="#9aa499" roughness={.95}/></instancedMesh>
    <instancedMesh ref={kerbs} args={[undefined, undefined, curbPoints.length]} receiveShadow><boxGeometry args={[.7, .08, 1.9]}/><meshStandardMaterial roughness={.95}/></instancedMesh>
    <instancedMesh ref={trees} args={[undefined, undefined, 28]} castShadow><coneGeometry args={[2.8, 5, 9]}/><meshStandardMaterial color="#233e31" roughness={1}/></instancedMesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[26.5 + i, .025, 23]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1, 1]}/><meshStandardMaterial color={i % 2 ? '#e2e5dd' : '#111718'}/></mesh>)}
    <mesh position={[0, .05, 0]}><cylinderGeometry args={[14, 14, .1, 64]}/><meshStandardMaterial color="#253c32" roughness={1}/></mesh>
  </group>;
}
