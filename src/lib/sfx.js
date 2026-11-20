// Âm thanh hiệu ứng (đúng / sai / hoàn thành) tạo bằng Web Audio, không cần file âm thanh.
import { settings } from './store.js';

let ctx = null;
const ac = () => {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};
function tone(freq, t0, dur, { type = 'sine', vol = 0.18, slide = 0 } = {}) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
const on = () => settings.sfx !== false;
export const sfx = {
  ok() { if (!on()) return; tone(784, 0, 0.12, { type: 'triangle' }); tone(1175, 0.09, 0.2, { type: 'triangle' }); },
  bad() { if (!on()) return; tone(220, 0, 0.22, { type: 'square', vol: 0.06, slide: 0.7 }); tone(165, 0.12, 0.25, { type: 'square', vol: 0.05, slide: 0.8 }); },
  tap() { if (!on()) return; tone(660, 0, 0.05, { type: 'triangle', vol: 0.08 }); },
  done() { if (!on()) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22, { type: 'triangle', vol: 0.15 })); },
  combo() { if (!on()) return; tone(988, 0, 0.08, { type: 'triangle', vol: 0.12 }); tone(1319, 0.07, 0.15, { type: 'triangle', vol: 0.12 }); },
};
