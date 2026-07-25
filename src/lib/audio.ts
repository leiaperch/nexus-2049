// Couche sonore procedurale minimale (WebAudio, aucun fichier externe).
// Desactivee par defaut. Sons discrets : clic de decision, franchissement
// temporel, alerte. Respecte l'absence d'interaction avant activation.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;

function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setAudioEnabled(on: boolean) {
  enabled = on;
  if (on) ensure();
}

function blip(freq: number, dur: number, type: OscillatorType, gain = 1) {
  if (!enabled) return;
  const c = ensure();
  if (!c || !master) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g);
  g.connect(master);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  tick() {
    blip(880, 0.05, "triangle", 0.5);
  },
  year() {
    blip(523.25, 0.09, "sine", 0.7);
  },
  enact() {
    blip(392, 0.08, "sine", 0.9);
    window.setTimeout(() => blip(587.33, 0.12, "sine", 0.8), 70);
  },
  alert() {
    blip(220, 0.16, "sawtooth", 0.6);
  },
  ui() {
    blip(1320, 0.03, "square", 0.25);
  },
};
