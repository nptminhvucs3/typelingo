// Chấm đáp án và cập nhật tiến độ ôn tập ngắt quãng (box 0-4).
import { settings, saveProg } from './store.js';
import { makeMatcher } from './match.js';
import { prog } from './words.js';

export const M = makeMatcher(settings);
// Đúng từ ngoại ngữ? (tiếng Đức chấp nhận ae/oe/ue/ss)
export const foreignOk = (w, val) => {
  const v = val.trim().toLowerCase().replace(/\s+/g, ' ');
  return !!v && M.isComplete({ stage: 'en', d: { en: w.en } }, v);
};
export function mark(w, ok) {
  const p = prog(w.id);
  if (ok) { p.ok++; p.box = Math.min(4, p.box + 1); } else { p.miss++; p.box = 0; }
  saveProg([w.id]);
}
// Flashcard: 2 = nhớ, 1 = mơ hồ, 0 = quên
export function grade(w, g) {
  const p = prog(w.id);
  if (g === 2) { p.ok++; p.box = Math.min(4, p.box + 1); }
  else if (g === 1) { p.box = Math.max(1, p.box - 1); }
  else { p.miss++; p.box = 0; }
  saveProg([w.id]);
}
// Gợi ý: hiện chữ cái đầu mỗi từ, còn lại là gạch
export const hintOf = (s, reveal = 1) => s.split(' ').map(x => x.slice(0, reveal) + x.slice(reveal).replace(/./g, '_')).join(' ');
// Tách câu ví dụ thành [trước, từ cần điền, sau]; chấp nhận dạng chia (look → looked) nhờ so khớp tiền tố.
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function blankOf(ex, w) {
  if (!ex) return null;
  const L = 'a-zäöüßà-ỹ';
  let m = new RegExp(`(^|[^${L}])(${reEsc(w.en)})(?![${L}])`, 'i').exec(ex);
  if (!m && !w.en.includes(' ') && w.en.length >= 4) m = new RegExp(`(^|[^${L}])(${reEsc(w.en.slice(0, Math.max(3, w.en.length - 2)))}[${L}]*)`, 'i').exec(ex);
  if (!m) return null;
  const s = m.index + m[1].length;
  return [ex.slice(0, s), ex.slice(s, s + m[2].length), ex.slice(s + m[2].length)];
}
// Đáp án nhiễu: cùng loại từ, ưu tiên cùng chủ đề (dễ nhầm, gần nghĩa)
export function distractors(w, pool, all, n, key = 'id') {
  const same = x => x[key] === w[key] || x.vi === w.vi || x.en === w.en;
  const a = pool.filter(x => x.pos === w.pos && x.topic === w.topic && !same(x));
  const b = all.filter(x => x.pos === w.pos && !same(x));
  const out = [];
  for (const src of [a, b, all]) {
    const s = [...src].sort(() => Math.random() - 0.5);
    for (const x of s) { if (out.length >= n) break; if (!same(x) && !out.some(o => o.vi === x.vi || o.en === x.en)) out.push(x); }
  }
  return out;
}
export const accOf =(ok, bad) => (ok + bad ? Math.round(ok * 100 / (ok + bad)) : 100);
