import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three';
/** Original seamless appearance maps. They illustrate a surface; they do not certify its construction. */
export function createSurfaceTextures() {
  const size = 128, weave = new Float32Array(size * size), brush = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const horizontal = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
    const cross = horizontal ? y : x, along = horizontal ? x : y;
    weave[y * size + x] = 0.3 + 0.5 * Math.sin(Math.PI * ((cross % 8 + 0.5) / 8)) + 0.035 * Math.sin(along * Math.PI * 0.75);
    brush[y * size + x] = 0.5 + 0.09 * Math.sin(y * Math.PI / 2) + 0.035 * Math.sin(y * Math.PI / 8);
  }
  const textures: DataTexture[] = [];
  function make(height: Float32Array, kind: 'color' | 'normal' | 'roughness', repeat: number) {
    const data = new Uint8Array(size * size * 4);
    const at = (x: number, y: number) => height[((y + size) % size) * size + (x + size) % size];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4, value = at(x, y);
      if (kind === 'normal') {
        const dx = (at(x + 1, y) - at(x - 1, y)) * 1.7, dy = (at(x, y + 1) - at(x, y - 1)) * 1.7;
        const length = Math.sqrt(dx * dx + dy * dy + 1);
        data[offset] = Math.round((0.5 - dx / length / 2) * 255); data[offset + 1] = Math.round((0.5 - dy / length / 2) * 255); data[offset + 2] = Math.round((0.5 + 1 / length / 2) * 255);
      } else { const shade = kind === 'color' ? 90 + value * 110 : 150 + value * 80; data[offset] = data[offset + 1] = data[offset + 2] = Math.round(shade); }
      data[offset + 3] = 255;
    }
    const texture = new DataTexture(data, size, size, RGBAFormat);
    texture.name = `FX ${height === weave ? 'weave' : 'brush'} ${kind}`;
    texture.wrapS = texture.wrapT = RepeatWrapping; texture.repeat.set(repeat, repeat);
    texture.magFilter = LinearFilter; texture.minFilter = LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.anisotropy = 4;
    if (kind === 'color') texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true; textures.push(texture); return texture;
  }
  const result = { weaveColor: make(weave, 'color', 28), weaveNormal: make(weave, 'normal', 28), weaveRoughness: make(weave, 'roughness', 28), brushNormal: make(brush, 'normal', 12), brushRoughness: make(brush, 'roughness', 12) };
  return { ...result, refresh: () => textures.forEach((t) => { t.needsUpdate = true; }), dispose: () => textures.forEach((t) => t.dispose()) };
}
