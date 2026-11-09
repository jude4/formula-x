export const track = { radius: 32, halfStraight: 40, roadHalfWidth: 6, barrierInner: 24, barrierOuter: 40, ground: 115, spawn: { x: 32, y: 0.8, z: 24 } } as const;
export interface TrackPoint { x: number; z: number; yaw: number }
/** Clockwise from the north end of the right straight; forward is local -Z. */
export function circuit(radius: number, spacing = 3): TrackPoint[] {
  const result: TrackPoint[] = [], straight = 80, arc = Math.PI * radius, length = straight * 2 + arc * 2;
  const count = Math.ceil(length / spacing);
  for (let i = 0; i < count; i++) {
    const d = i / count * length;
    if (d < straight) result.push({ x: radius, z: 40 - d, yaw: 0 });
    else if (d < straight + arc) { const a = -(d - straight) / radius; result.push({ x: Math.cos(a) * radius, z: -40 + Math.sin(a) * radius, yaw: -a }); }
    else if (d < straight * 2 + arc) result.push({ x: -radius, z: -40 + d - straight - arc, yaw: Math.PI });
    else { const a = Math.PI - (d - straight * 2 - arc) / radius; result.push({ x: Math.cos(a) * radius, z: 40 + Math.sin(a) * radius, yaw: Math.PI * 2 - a }); }
  }
  return result;
}
export function onRoad(x: number, z: number) {
  const distance = Math.hypot(x, Math.max(0, Math.abs(z) - track.halfStraight));
  return Math.abs(distance - track.radius) <= track.roadHalfWidth;
}
export const barriers = [track.barrierInner, track.barrierOuter].flatMap((radius) => circuit(radius, 3).map(p => ({ ...p, length: 3.2 })));
