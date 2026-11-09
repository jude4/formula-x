export const paints = [
  { name: 'Obsidian Black', color: '#111418' }, { name: 'Racing Red', color: '#b51b28' },
  { name: 'Arctic White', color: '#e4e6e1' }, { name: 'Metallic Silver', color: '#9a9e96' },
  { name: 'British Racing Green', color: '#16493d' }, { name: 'Electric Blue', color: '#1958bb' },
  { name: 'Champagne Gold', color: '#b59e70' },
] as const;
export const bodyFinishes = { gloss: 'Gloss paint', matte: 'Matte paint', metallic: 'Metallic paint', carbon: 'Carbon fibre', brushed: 'Brushed metal' } as const;
export type BodyFinish = keyof typeof bodyFinishes;
export const wheelFinishes = {
  original: { name: 'Original finish', color: null, roughness: 0, metalness: 0 },
  silver: { name: 'Bright silver', color: '#bfc5ca', roughness: 0.19, metalness: 1 },
  black: { name: 'Satin black', color: '#191c20', roughness: 0.42, metalness: 0.7 },
  titanium: { name: 'Satin titanium', color: '#737a80', roughness: 0.36, metalness: 1 },
  champagne: { name: 'Champagne', color: '#ad9468', roughness: 0.27, metalness: 1 },
} as const;
export type WheelFinish = keyof typeof wheelFinishes;
export const brakeTints = [{ name: 'Original', color: null }, { name: 'Red', color: '#b9292b' }, { name: 'Graphite', color: '#323638' }, { name: 'Acid green', color: '#a8cf46' }, { name: 'Blue', color: '#306bd0' }] as const;
export const upholsteryColors = [{ name: 'Original', color: null }, { name: 'Carbon black', color: '#1a1b1b' }, { name: 'Saddle tan', color: '#8c5c38' }, { name: 'Ivory', color: '#d4ccb6' }, { name: 'Oxblood', color: '#5d1f2c' }] as const;
export const upholsteryFinishes = { original: 'Original material', smooth: 'Smooth appearance', matte: 'Soft matte appearance' } as const;
export const trimFinishes = { original: 'Original carbon groups', carbon: 'Woven carbon appearance', brushed: 'Brushed metal appearance' } as const;
export interface Appearance {
  paint: string; finish: BodyFinish; wheelFinish: WheelFinish; brakeTint: string | null;
  upholsteryColor: string | null; upholsteryFinish: keyof typeof upholsteryFinishes; trimFinish: keyof typeof trimFinishes;
}
export const defaultAppearance: Readonly<Appearance> = Object.freeze({ paint: '#9a9e96', finish: 'metallic', wheelFinish: 'original', brakeTint: null, upholsteryColor: null, upholsteryFinish: 'original', trimFinish: 'original' });
export function validColor(color: string) { return /^#[0-9a-f]{6}$/i.test(color); }
