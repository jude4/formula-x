/** Original Web Audio synthesis. No recording or claimed Ferrari/V12 engine signature. */
export function createEngineAudio() {
  let context: AudioContext | null = null, gain: GainNode | null = null, filter: BiquadFilterNode | null = null;
  let oscillators: OscillatorNode[] = [], disposed = false;
  return {
    async unlock() {
      if (disposed) return false;
      try {
        if (!context) {
          context = new AudioContext(); gain = context.createGain(); gain.gain.value = 0;
          filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = 0.8;
          filter.connect(gain); gain.connect(context.destination);
          oscillators = [1, 2.01, 4.02].map((ratio, i) => { const o = context!.createOscillator(); o.type = i ? 'triangle' : 'sawtooth'; o.frequency.value = 35 * ratio; const level = context!.createGain(); level.gain.value = [0.3, 0.13, 0.08][i]; o.connect(level); level.connect(filter!); o.start(); return o; });
        }
        await context.resume(); return context.state === 'running';
      } catch { return false; }
    },
    update(engine: boolean, muted: boolean, rpm: number, throttle: number, paused: boolean) {
      if (!context || !gain || !filter || disposed) return;
      const t = context.currentTime, hz = Math.max(28, rpm / 60 * 2);
      oscillators.forEach((o, i) => o.frequency.setTargetAtTime(hz * [1, 2.01, 4.02][i], t, 0.06));
      filter.frequency.setTargetAtTime(450 + throttle * 1100 + rpm * 0.07, t, 0.08);
      gain.gain.setTargetAtTime(engine && !muted && !paused ? 0.22 + throttle * 0.12 : 0, t, 0.05);
    },
    dispose() { disposed = true; oscillators.forEach(o => o.stop()); oscillators = []; if (context) void context.close(); context = null; gain = null; filter = null; },
  };
}
// UI gestures unlock audio; the rendering loop owns gain/pitch and cleanup.
export let drivingAudio: ReturnType<typeof createEngineAudio> | null = null;
export function bindDrivingAudio(audio: ReturnType<typeof createEngineAudio> | null) { drivingAudio = audio; }
