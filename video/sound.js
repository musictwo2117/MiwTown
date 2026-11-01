// Miw's Town video studio: little synthesized sounds, rendered offline so every hit lands on its exact sample.
// A clip describes its score as a list of events, and renderLoop() turns it into a seamless stereo WAV:
// it renders the score twice back to back and keeps the second pass, so tails that ring past the end of the
// loop wrap round into its start, the way they would when the clip plays on repeat.
(() => {
  const RATE = 48000;

  // ---------- instruments: each schedules itself on an (offline) audio context at time t ----------
  const env = (ctx, t, peak, attack, decay) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  };
  const tone = (ctx, out, t, { freq, type = 'sine', gain = 0.3, attack = 0.005, decay = 0.4, glide, pan = 0 }) => {
    const o = ctx.createOscillator(), g = env(ctx, t, gain, attack, decay), p = ctx.createStereoPanner();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + attack + decay * 0.6);
    p.pan.value = pan;
    o.connect(g).connect(p).connect(out);
    o.start(t); o.stop(t + attack + decay + 0.05);
  };
  let noiseBuf;
  const noise = ctx => {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let s = 1;   // seeded, so every render is identical
    for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
    return noiseBuf;
  };

  const SOUNDS = {
    // a music-box note: a bell-ish sine with a quiet octave
    musicbox: (ctx, out, t, { note, gain = 0.16, pan = 0 }) => {
      const f = 440 * 2 ** ((note - 69) / 12);
      tone(ctx, out, t, { freq: f, gain, decay: 0.9, pan });
      tone(ctx, out, t, { freq: f * 2, gain: gain * 0.25, decay: 0.35, pan });
      tone(ctx, out, t, { freq: f * 3.01, gain: gain * 0.08, decay: 0.2, pan });
    },
    // a soft pad chord under the beat: detuned triangles that swell in and fade out
    pad: (ctx, out, t, { notes, dur, gain = 0.035 }) => {
      notes.forEach((n, i) => [-4, 4].forEach(cents => {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = 440 * 2 ** ((n - 69) / 12); o.detune.value = cents;
        lp.type = 'lowpass'; lp.frequency.value = 1400;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.25);
        g.gain.setValueAtTime(gain, t + dur - 0.3);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.15);
        o.connect(lp).connect(g).connect(out);
        o.start(t); o.stop(t + dur + 0.2);
      }));
    },
    // a round, soft bass note on each beat
    bass: (ctx, out, t, { note, gain = 0.2 }) => tone(ctx, out, t, { freq: 440 * 2 ** ((note - 69) / 12), gain, attack: 0.01, decay: 0.7 }),
    // the hop: a springy "boing" sweeping up
    boing: (ctx, out, t, { gain = 0.22, pan = 0 }) => {
      const o = ctx.createOscillator(), g = env(ctx, t, gain, 0.01, 0.28), p = ctx.createStereoPanner(), wob = ctx.createOscillator(), wg = ctx.createGain();
      o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(720, t + 0.22);
      wob.frequency.value = 22; wg.gain.value = 18; wob.connect(wg).connect(o.frequency);
      p.pan.value = pan;
      o.connect(g).connect(p).connect(out);
      o.start(t); wob.start(t); o.stop(t + 0.35); wob.stop(t + 0.35);
    },
    // the landing: a soft squishy thump
    thump: (ctx, out, t, { gain = 0.45 }) => {
      tone(ctx, out, t, { freq: 150, glide: 55, gain, attack: 0.002, decay: 0.18 });
      const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = env(ctx, t, gain * 0.25, 0.002, 0.06);
      n.buffer = noise(ctx); lp.type = 'lowpass'; lp.frequency.value = 700;
      n.connect(lp).connect(g).connect(out); n.start(t, 0.3); n.stop(t + 0.1);
    },
    // the name tag: a bubbly pop
    pop: (ctx, out, t, { gain = 0.25, pan = 0 }) => tone(ctx, out, t, { freq: 520, glide: 1400, gain, attack: 0.003, decay: 0.09, pan }),
    // each letter landing: a tiny glassy tick
    tick: (ctx, out, t, { note, gain = 0.06, pan = 0 }) => tone(ctx, out, t, { freq: 440 * 2 ** ((note - 69) / 12), gain, attack: 0.002, decay: 0.08, pan }),
    // the table turning: a gentle airy whoosh
    whoosh: (ctx, out, t, { dur = 0.55, gain = 0.07 }) => {
      const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = noise(ctx); n.loop = true;
      bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(1800, t + dur * 0.5); bp.frequency.exponentialRampToValueAtTime(700, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
      n.connect(bp).connect(g).connect(out); n.start(t); n.stop(t + dur + 0.02);
    },
    // the shop's door bell: inharmonic partials, a long shimmer
    bell: (ctx, out, t, { gain = 0.1, pan = -0.4 }) => [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]].forEach(([k, a]) =>
      tone(ctx, out, t, { freq: 1180 * k, gain: gain * a, attack: 0.002, decay: 1.6 / Math.sqrt(k), pan })),
  };

  // ---------- render a looping score to a WAV blob ----------
  // events: [{ at: seconds, sound: name, ...options }]; loop: its length in seconds
  window.renderLoop = async (events, loop) => {
    const ctx = new OfflineAudioContext(2, Math.round(RATE * loop * 2), RATE);
    const bus = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
    bus.connect(comp).connect(ctx.destination);
    for (const pass of [0, 1]) events.forEach(e => SOUNDS[e.sound](ctx, bus, e.at + pass * loop, e));
    const two = await ctx.startRendering(), n = Math.round(RATE * loop);
    const L = two.getChannelData(0).slice(n, 2 * n), R = two.getChannelData(1).slice(n, 2 * n);
    return wav([L, R], RATE);
  };

  function wav(chans, rate) {
    const n = chans[0].length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
    const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) v.setInt16(44 + i * 4 + c * 2, Math.max(-1, Math.min(1, chans[c][i])) * 32767, true);
    return new Blob([buf], { type: 'audio/wav' });
  }
})();
