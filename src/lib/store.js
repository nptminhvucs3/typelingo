// Lưu trữ cục bộ (localStorage) – nguồn dữ liệu chính khi chơi, đồng bộ lên Supabase khi có tài khoản.
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } },
};
export { ls };

const DEFAULT_SETTINGS = { method: 'telex', noDia: false, lang: 'en', viVoice: 'auto', dailyGoal: 20, sfx: true, speakEn: true, speakVi: true, speed: 1, confirm: 'space', theme: 'light', geminiKey: '', textModel: 'gemini-3.8-flash', liveModel: 'gemini-3.8-live', voiceName: 'Puck', level: 'B1', ttsRate: 0.85, voices: {} };
const saved = ls.get('tl_settings', {});
export const settings = Object.assign({}, DEFAULT_SETTINGS, saved);
if (saved.sound === false && saved.speakEn === undefined) { settings.speakEn = false; settings.speakVi = false; }
// Giao diện pastel (20/11/2026): chuyển mọi người sang theme sáng một lần, sau đó tôn trọng lựa chọn của người dùng
if (!saved.uiV3) { settings.theme = 'light'; settings.uiV3 = 1; settings.ts = Date.now(); ls.set('tl_settings', settings); }

export const state = {
  prog: ls.get('tl_prog', {}),          // { 'en|pos': {box, ok, miss, fav, ts} }
  custom: ls.get('tl_custom', []),      // [{en,pos,vi,topic,ts,deleted?}]
  best: ls.get('tl_best', { score: 0, wpm: 0 }),
  pending: ls.get('tl_pending', []),    // lượt chơi chưa đẩy lên máy chủ
  history: ls.get('tl_history', []),    // lịch sử lượt chơi (tối đa 500) để vẽ thống kê
  uid: ls.get('tl_uid', null),
};
// Dữ liệu cũ (bản 1-3): từ tự thêm là mảng 4 phần tử
state.custom = state.custom.map(w => Array.isArray(w) ? { en: w[0], pos: w[1], vi: w[2], topic: w[3] || 'Từ của tôi', ts: 1 } : w);

const listeners = new Set();
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = kind => listeners.forEach(f => { try { f(kind); } catch (e) { /* bỏ qua */ } });

export function saveSettings() { settings.ts = Date.now(); ls.set('tl_settings', settings); emit('settings'); }
export function saveProg(touched) {
  const now = Date.now();
  for (const id of touched || []) if (state.prog[id]) state.prog[id].ts = now;
  ls.set('tl_prog', state.prog); emit('prog');
}
export function saveCustom() { ls.set('tl_custom', state.custom); emit('custom'); }
export function saveBest() { ls.set('tl_best', state.best); }
export function savePending() { ls.set('tl_pending', state.pending); }
export function setUid(uid) { state.uid = uid; if (uid) ls.set('tl_uid', uid); else ls.del('tl_uid'); }
export function addSession(s) {
  state.last = s; // lượt vừa chơi, để màn kết quả hiện XP
  state.pending.push(s); savePending();
  state.history.push(s); if (state.history.length > 500) state.history.splice(0, state.history.length - 500);
  ls.set('tl_history', state.history); emit('session');
}
export function mergeHistory(rows) {
  const seen = new Set(state.history.map(x => x.at)); let add = 0;
  for (const r of rows) {
    const at = new Date(r.played_at).getTime(); if (seen.has(at)) continue; seen.add(at);
    state.history.push({ at, score: r.score, wpm: r.wpm, accuracy: r.accuracy, words: r.words_done, topic: r.topic }); add++;
  }
  if (add) { state.history.sort((a, b) => a.at - b.at); if (state.history.length > 500) state.history.splice(0, state.history.length - 500); ls.set('tl_history', state.history); }
}
export function resetProgress() { state.prog = {}; ls.set('tl_prog', state.prog); emit('prog'); }
export function replaceAll({ prog, custom, newSettings }) {
  if (prog) { state.prog = prog; ls.set('tl_prog', prog); }
  if (custom) { state.custom = custom; ls.set('tl_custom', custom); }
  if (newSettings) { Object.assign(settings, newSettings); ls.set('tl_settings', settings); }
}
export function wipeLocalUserData() {
  state.prog = {}; state.custom = []; state.pending = []; state.history = []; ls.set('tl_history', []);
  ls.set('tl_prog', {}); ls.set('tl_custom', []); ls.set('tl_pending', []);
}
export function exportAll() {
  return { app: 'typelingo', v: 2, at: new Date().toISOString(), settings, prog: state.prog, custom: state.custom, best: state.best, history: state.history };
}
