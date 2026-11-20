// Giọng đọc. Ngoại ngữ: tự chọn giọng rõ nhất trên thiết bị (Natural/Online/Google/Apple),
// nếu máy chỉ có giọng máy cũ (Microsoft David/Zira…) thì dùng giọng Google Dịch.
// Người dùng có thể chọn giọng cụ thể và tốc độ trong Cài đặt (settings.voices, lưu riêng từng máy).
import { settings } from './store.js';

let VOICES = [];
const load = () => { try { VOICES = speechSynthesis.getVoices() || []; } catch (e) { VOICES = []; } };
if (typeof speechSynthesis !== 'undefined') { load(); try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { /* bỏ qua */ } }
const norm = v => v.lang.toLowerCase().replace('_', '-');

// Điểm "dễ nghe" của một giọng. Âm = giọng máy cũ, khó nghe.
function score(v, lang) {
  const n = v.name;
  let s = 0;
  if (/natural|neural/i.test(n)) s += 100;
  else if (/online/i.test(n)) s += 80;
  else if (/^google/i.test(n)) s += 70;
  else if (/enhanced|premium|siri/i.test(n)) s += 65;
  else if (/samantha|ava|allison|susan|karen|daniel|serena|moira|tessa|anna|petra|markus|yannick|helena/i.test(n)) s += 50;
  else if (/microsoft/i.test(n)) s -= 40; // giọng SAPI cũ trên Windows
  else if (/espeak|festival|pico/i.test(n)) s -= 80;
  else s += 10;
  if (norm(v) === lang) s += 15; // đúng vùng (en-US) ưu tiên hơn en-IN, en-AU…
  if (/en-(us|gb)/.test(norm(v))) s += 5;
  if (v.localService === false && s < 60) s += 5;
  return s;
}
export function voicesFor(lang) {
  const l = lang.toLowerCase(), p = l.slice(0, 2);
  return VOICES.filter(v => norm(v).startsWith(p)).sort((a, b) => score(b, l) - score(a, l));
}
// Giọng tốt nhất của thiết bị (có thể là giọng kém nếu máy chỉ có vậy)
export const voiceFor = lang => voicesFor(lang)[0];
const isGood = (v, lang) => v && score(v, lang.toLowerCase()) >= 0;

// Lựa chọn giọng: 'auto' | 'gt' (Google Dịch) | voiceURI
export const voicePref = lang => settings.voices?.[lang.slice(0, 2)] || 'auto';
export const rateOf = () => settings.ttsRate || 0.85;
// Mô tả cho trang Cài đặt
export function describeVoice(lang) {
  const pref = voicePref(lang);
  if (pref === 'gt') return 'Google Dịch (cần mạng)';
  if (pref !== 'auto') return VOICES.find(v => v.voiceURI === pref)?.name || 'không tìm thấy, dùng tự động';
  const v = voiceFor(lang);
  return isGood(v, lang) ? v.name : 'Google Dịch (máy chưa có giọng rõ)';
}

let audio = null, utter = null;
function speakGT(t, code, rate, fail) {
  try {
    if (audio) { audio.onerror = null; audio.pause(); }
    const a = audio = new Audio(); a.referrerPolicy = 'no-referrer';
    a.onerror = fail;
    a.src = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${code}&q=${encodeURIComponent(t.slice(0, 190))}`;
    a.playbackRate = Math.max(0.5, Math.min(1.5, rate / 0.9));
    a.preservesPitch = true;
    const p = a.play(); if (p && p.catch) p.catch(fail);
  } catch (e) { fail(); }
}
function speakDevice(t, lang, rate, v) {
  v = v || voiceFor(lang);
  if (!v || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = utter = new SpeechSynthesisUtterance(t); // giữ tham chiếu để Chrome không thu hồi giữa chừng
    u.lang = v.lang; u.rate = rate; u.voice = v; u.pitch = 1;
    speechSynthesis.speak(u);
  } catch (e) { /* bỏ qua */ }
}
// rate: bỏ trống = tốc độ người dùng chọn; số nhỏ hơn 1 nhân thêm (ví dụ 0.7 = chậm hơn).
export function speak(text, lang, slow) {
  if (!text || !text.trim()) return;
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ }
  if (audio) { try { audio.pause(); } catch (e) { /* bỏ qua */ } }
  const code = lang.slice(0, 2);
  const rate = code === 'vi' ? 1 : Math.max(0.4, rateOf() * (slow || 1));
  const dev = v => () => speakDevice(text, lang, rate, v);
  if (code === 'vi') {
    if (settings.viVoice !== 'device') speakGT(text, 'vi', rate, dev()); else dev()();
    return;
  }
  const pref = voicePref(lang);
  if (pref === 'gt') return speakGT(text, code, rate, dev());
  if (pref !== 'auto') { const v = VOICES.find(x => x.voiceURI === pref); if (v) return dev(v)(); }
  const best = voiceFor(lang);
  // Câu dài (hội thoại AI) vẫn dùng giọng thiết bị vì Google Dịch giới hạn độ dài
  if (isGood(best, lang) || (best && text.length > 190)) dev(best)();
  else speakGT(text, code, rate, dev(best));
}
