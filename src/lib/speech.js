// Giọng đọc.
// Ngoại ngữ: giọng rõ nhất của thiết bị (Natural/Online/Google/Apple); nếu máy chỉ có giọng máy cũ
// (Microsoft David/Zira…) thì dùng giọng Google Dịch.
// Tiếng Việt: giọng Việt của thiết bị (nếu có) → Google Dịch → Piper (chạy trong trình duyệt, xem piper.js).
// Lưu ý: Google Dịch trả 404 nếu request có Referer, vì vậy index.html đặt <meta name="referrer" content="no-referrer">.
import { settings } from './store.js';
import { piperUrl, PIPER_VOICES } from './piper.js';

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
  else if (/samantha|ava|allison|susan|karen|daniel|serena|moira|tessa|anna|petra|markus|yannick|helena|linh/i.test(n)) s += 50;
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

// Lựa chọn giọng ngoại ngữ: 'auto' | 'gt' (Google Dịch) | voiceURI
export const voicePref = lang => settings.voices?.[lang.slice(0, 2)] || 'auto';
export const rateOf = () => settings.ttsRate || 0.85;
// Giọng Việt: 'auto' | 'gt' | 'device' | 'piper' (bản cũ lưu 'gt' = tự động)
export const viPref = () => (settings.viVoice === 'gt' || !settings.viVoice ? 'auto' : settings.viVoice);

// Google Dịch hỏng (bị chặn / mất mạng) thì bỏ qua nó 5 phút để không bị trễ mỗi lần đọc
let gtDownUntil = 0;
const gtDown = () => Date.now() < gtDownUntil;

// Mô tả cho trang Cài đặt
export function describeVoice(lang) {
  if (lang.startsWith('vi')) {
    const p = viPref(), dv = voiceFor('vi-VN');
    if (p === 'piper') return 'Piper (chạy trên máy)';
    if (p === 'device') return dv ? dv.name : 'máy chưa có giọng Việt';
    if (dv && isGood(dv, 'vi-vn')) return dv.name;
    return gtDown() ? 'Piper (Google Dịch đang lỗi)' : 'Google Dịch, dự phòng Piper';
  }
  const pref = voicePref(lang);
  if (pref === 'gt') return 'Google Dịch (cần mạng)';
  if (pref !== 'auto') return VOICES.find(v => v.voiceURI === pref)?.name || 'không tìm thấy, dùng tự động';
  const v = voiceFor(lang);
  return isGood(v, lang) ? v.name : 'Google Dịch (máy chưa có giọng rõ)';
}

let audio = null, utter = null, seq = 0;
function stopAll() {
  seq++;
  try { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ }
  if (audio) { try { audio.onerror = null; audio.pause(); } catch (e) { /* bỏ qua */ } }
}
function playUrl(src, rate, fail) {
  try {
    const a = audio = new Audio();
    a.onerror = () => fail && fail();
    a.defaultPlaybackRate = a.playbackRate = Math.max(0.5, Math.min(1.5, rate));
    a.preservesPitch = true;
    a.src = src;
    const p = a.play(); if (p && p.catch) p.catch(e => { if (e?.name !== 'AbortError' && fail) fail(); });
  } catch (e) { fail && fail(); }
}
function speakGT(t, code, rate, fail) {
  if (gtDown()) { fail(); return; }
  const my = seq;
  playUrl(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${code}&q=${encodeURIComponent(t.slice(0, 190))}`, rate / 0.9,
    () => { gtDownUntil = Date.now() + 5 * 60e3; if (my === seq) fail(); });
}
function speakPiper(t, code, rate, fail) {
  if (!PIPER_VOICES[code]) { fail && fail(); return; }
  const my = seq;
  piperUrl(t, code).then(url => { if (my === seq) playUrl(url, rate, fail); }).catch(() => { if (my === seq && fail) fail(); });
}
function speakDevice(t, lang, rate, v) {
  v = v || voiceFor(lang);
  if (!v || typeof speechSynthesis === 'undefined') return false;
  try {
    const u = utter = new SpeechSynthesisUtterance(t); // giữ tham chiếu để Chrome không thu hồi giữa chừng
    u.lang = v.lang; u.rate = rate; u.voice = v; u.pitch = 1;
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

// slow: bỏ trống = tốc độ người dùng chọn; số nhỏ hơn 1 nhân thêm (ví dụ 0.7 = chậm hơn).
export function speak(text, lang, slow) {
  if (!text || !text.trim()) return;
  stopAll();
  const code = lang.slice(0, 2);
  const rate = Math.max(0.4, (code === 'vi' ? 1 : rateOf()) * (slow || 1));
  const dev = v => () => speakDevice(text, lang, rate, v);

  if (code === 'vi') {
    const p = viPref(), dv = voiceFor('vi-VN');
    const piper = () => speakPiper(text, 'vi', rate, dev(dv));
    if (p === 'piper') return piper();
    if (p === 'device') { if (!dev(dv)()) speakGT(text, 'vi', rate, piper); return; }
    if (dv && isGood(dv, 'vi-vn')) return dev(dv)();
    return speakGT(text, 'vi', rate, piper);
  }
  const pref = voicePref(lang);
  if (pref === 'gt') return speakGT(text, code, rate, dev());
  if (pref !== 'auto') { const v = VOICES.find(x => x.voiceURI === pref); if (v) return dev(v)(); }
  const best = voiceFor(lang);
  // Câu dài (hội thoại AI) vẫn dùng giọng thiết bị vì Google Dịch giới hạn độ dài
  if (isGood(best, lang) || (best && text.length > 190)) dev(best)();
  else speakGT(text, code, rate, dev(best));
}
