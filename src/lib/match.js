// So khớp chữ người chơi gõ với từ đang rơi.
// Chấp nhận: (1) gõ Telex/VNI của game, (2) chữ nguyên (từ mượn: sofa, taxi, web),
// (3) chữ đã bị Unikey/Gboard biến đổi sẵn.
import { compose, plain, splitTone } from './engine.js';

export function makeMatcher(settings) {
  const wordEq = (a, b) => {
    if (settings.noDia) return plain(a) === plain(b);
    const x = splitTone(a), y = splitTone(b);
    return x.base === y.base && x.tone === y.tone;
  };
  function viWordScan(rw, t) {
    const c = compose(rw, settings.method), cand = [];
    if (plain(t).startsWith(plain(c))) cand.push({ len: c.length, done: wordEq(c, t) });
    if (t.startsWith(rw)) cand.push({ len: rw.length, done: rw === t });
    if (compose(t, 'telex') === c) cand.push({ len: t.length, done: true });
    else for (let k = 1; k < t.length; k++) if (compose(t.slice(0, k), 'telex') === c) { cand.push({ len: k, done: false }); break; }
    if (!cand.length) return null;
    return cand.find(x => x.done) || cand[0];
  }
  function viScan(val, t) {
    const rw = val.split(' '), tw = t.split(' ');
    if (rw.length > tw.length) return null;
    let len = 0, done = false;
    for (let i = 0; i < rw.length; i++) {
      const r = viWordScan(rw[i], tw[i]), last = i === rw.length - 1;
      if (!r || (!last && !r.done)) return null;
      len += r.len + (last ? 0 : 1);
      if (last) done = r.done && rw.length === tw.length;
    }
    return { len, done };
  }
  // Tiếng Đức: gõ ä/ö/ü/ß hoặc ae/oe/ue/ss đều được (có thể trộn lẫn).
  const DE = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
  function deK(t, val) {
    let i = 0, k = 0;
    while (k < t.length && i < val.length) {
      const c = t[k];
      if (val[i] === c) { i++; k++; continue; }
      const a = DE[c];
      if (a) {
        const rest = val.slice(i);
        if (rest.startsWith(a)) { i += a.length; k++; continue; }
        if (a.startsWith(rest)) return { k, done: false };
      }
      return null;
    }
    if (i < val.length) return null;
    return { k, done: k === t.length };
  }
  function enK(w, val) {
    const t = w.d.en;
    if (settings.lang === 'de') return deK(t, val);
    if (compose(t, 'telex') === val && val !== t && !t.startsWith(val)) return { k: t.length, done: true };
    if (t.startsWith(val)) return { k: val.length, done: val === t };
    for (let k = 1; k < t.length; k++) if (compose(t.slice(0, k), 'telex') === val) return { k, done: false };
    return null;
  }
  const matches = (w, val) => w.stage === 'en' ? enK(w, val) !== null : viScan(val, w.d.vi) !== null;
  const isComplete = (w, val) => { const r = w.stage === 'en' ? enK(w, val) : viScan(val, w.d.vi); return !!(r && r.done); };
  const typedLen = (w, val) => {
    if (!val) return 0;
    if (w.stage === 'en') { const r = enK(w, val); return r ? r.k : 0; }
    const r = viScan(val, w.d.vi); return r ? r.len : 0;
  };
  return { matches, isComplete, typedLen };
}
