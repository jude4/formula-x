export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];
export interface VehicleComponent {
  readonly id: string;
  readonly sourceNodeIndex: number;
  readonly sourceName: string;
  readonly displayName: string;
  readonly parentId: string | null;
  readonly category: string;
  readonly kind: string;
  readonly originalTransform: { readonly position: Vec3; readonly quaternion: Quat; readonly scale: Vec3; readonly matrix: readonly number[] };
  readonly pivot: { readonly local: Vec3; readonly sourceWorld: Vec3; readonly status: string };
  readonly meshIndex: number | null;
  readonly materials: readonly string[];
  readonly selectable: boolean;
  readonly visible: boolean;
  readonly explosionVector: Vec3 | null;
  readonly capabilities: { readonly inspect: boolean; readonly independentlyAddressable: boolean; readonly disassemble: boolean; readonly articulate: boolean };
}
export interface VehicleManifest {
  readonly schemaVersion: number;
  readonly assetId: string;
  readonly url: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly licenseStatus: string;
  readonly coordinateSystem: string;
  readonly counts: { readonly nodes: number; readonly meshNodes: number; readonly meshes: number; readonly selectable: number };
  readonly components: readonly VehicleComponent[];
  readonly unavailable: readonly string[];
}
