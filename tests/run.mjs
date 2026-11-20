// Chạy: npm test – kiểm tra bộ gõ (776 từ, Unikey tắt/bật) và logic gộp dữ liệu.
import fs from 'node:fs';
import { compose, plain } from '../src/lib/engine.js';
import { makeMatcher } from '../src/lib/match.js';
import { mergeProgress, diffToPush, mergeSettings } from '../src/lib/merge.js';
const rows = JSON.parse(fs.readFileSync(new URL('../src/lib/words.json', import.meta.url)));
const settings = { noDia: false, method: 'telex' };
const { matches, isComplete } = makeMatcher(settings);
let fail = 0; const bad = [];
const F = m => { fail++; if (bad.length < 20) bad.push(m); };
const TK = { 1: 's', 2: 'f', 3: 'r', 4: 'x', 5: 'j' }, TO = { '́': 1, '̀': 2, '̉': 3, '̃': 4, '̣': 5 };
const toTelex = vi => vi.split(' ').map(w => { let o = '', t = 0; for (const ch of w) { if (ch === 'đ') { o += 'dd'; continue; } const d = ch.normalize('NFD'); const b = d[0]; let m = ''; for (const x of d.slice(1)) { if (TO[x]) t = TO[x]; else if (x === '̂') m = 'c'; else if (x === '̆' || x === '̛') m = 'w'; } o += b + (m === 'c' ? b : m === 'w' ? 'w' : ''); } return o + (t ? TK[t] : ''); }).join(' ');
for (const [en, , vi] of rows) {
  const w = { d: { en, vi }, stage: 'vi' }, raw = toTelex(vi);
  for (let i = 1; i <= raw.length; i++) { if (!matches(w, raw.slice(0, i))) F('A ' + vi + ' ' + raw.slice(0, i)); if (i < raw.length && isComplete(w, raw.slice(0, i))) F('A sớm ' + vi); }
  if (!isComplete(w, raw)) F('A chưa xong ' + vi);
  for (let i = 1; i <= raw.length; i++) { const v = compose(raw.slice(0, i), 'telex'); if (!matches(w, v)) F('B ' + vi + ' ' + v); const mid = v.slice(0, -1); if (mid && !matches(w, mid)) F('B mid ' + vi + ' ' + mid); }
  if (!isComplete(w, compose(raw, 'telex'))) F('B chưa xong ' + vi);
  settings.noDia = true; if (!isComplete(w, plain(vi))) F('C ' + vi); settings.noDia = false;
  const e = { d: { en }, stage: 'en' };
  for (let i = 1; i <= en.length; i++) if (!matches(e, en.slice(0, i))) F('EN ' + en + i);
  if (!isComplete(e, en)) F('EN xong ' + en);
  if (!/(ss|ff|rr|xx|jj)$/.test(en) && !isComplete(e, compose(en, 'telex'))) F('EN unikey ' + en + ' -> ' + compose(en, 'telex'));
}
// tiếng Đức: gõ ä/ö/ü/ß hoặc ae/oe/ue/ss
{
  const de = JSON.parse(fs.readFileSync(new URL('../src/lib/words.de.json', import.meta.url)));
  const ds = { noDia: false, method: 'telex', lang: 'de' }, M = makeMatcher(ds);
  const alt = t => t.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  for (const [g, , vi] of de) {
    const t = g.toLowerCase(), w = { d: { en: t }, stage: 'en' };
    for (const v of [t, alt(t)]) {
      for (let i = 1; i <= v.length; i++) if (!M.matches(w, v.slice(0, i))) F('DE ' + t + ' ' + v.slice(0, i));
      if (!M.isComplete(w, v)) F('DE xong ' + v);
      if (v.length > 1 && M.isComplete(w, v.slice(0, -1))) F('DE sớm ' + v);
    }
    if (M.matches(w, t + 'x')) F('DE thừa ' + t);
    const wv = { d: { en: t, vi }, stage: 'vi' }, raw = toTelex(vi);
    if (!M.isComplete(wv, compose(raw, 'telex'))) F('DE vi ' + vi);
  }
  console.log('từ Đức:', de.length);
}
// merge
const L = { a: { box: 3, ok: 5, miss: 0, ts: 200 }, b: { box: 1, ok: 1, miss: 1, ts: 50 } };
const R = { a: { box: 1, ok: 2, miss: 1, ts: 100 }, b: { box: 4, ok: 9, miss: 0, ts: 300 }, c: { box: 2, ok: 2, miss: 0, ts: 10 } };
const m = mergeProgress(L, R);
if (m.a.box !== 3 || m.b.box !== 4 || !m.c) F('merge sai');
const push = diffToPush(m, R);
if (push.length !== 1 || push[0] !== 'a') F('diff sai ' + push);
if (mergeSettings({ ts: 5, speed: 1 }, { ts: 9, speed: 2 }).speed !== 2 || mergeSettings({ ts: 9, speed: 1 }, { ts: 5, speed: 2 }).speed !== 1) F('settings merge sai');
console.log('từ:', rows.length, '| lỗi:', fail);
if (bad.length) console.log(bad.join('\n'));
process.exit(fail ? 1 : 0);
