// Local development utility for Blender builds without a Draco import library.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const output = process.argv[2];
if (!output || !path.isAbsolute(output)) throw Error('Usage: node scripts/decode-reference.mjs /absolute/output.glb');
if (fs.existsSync(output)) throw Error('Refusing to overwrite an existing file');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_USE_BUNDLED_BROWSER ? undefined : (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium'), args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  const encoded = await page.evaluate(async () => {
    const load = (url) => import(/* @vite-ignore */ url);
    const { GLTFLoader } = await load('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { DRACOLoader } = await load('/node_modules/three/examples/jsm/loaders/DRACOLoader.js');
    const { GLTFExporter } = await load('/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
    const draco = new DRACOLoader().setDecoderPath('/draco/');
    try {
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync('/models/ferrari.glb');
      const binary = await new GLTFExporter().parseAsync(gltf.scene, { binary: true, onlyVisible: false });
      const bytes = new Uint8Array(binary); let text = '';
      for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(text);
    } finally { draco.dispose(); }
  });
  fs.writeFileSync(output, Buffer.from(encoded, 'base64'), { flag: 'wx' });
  console.log('Uncompressed development copy saved:', output, fs.statSync(output).size, 'bytes');
} finally { await browser.close(); }
