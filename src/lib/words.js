import BUNDLED_EN from './words.json';
import BUNDLED_DE from './words.de.json';
import { state, ls } from './store.js';
import { cachedWords } from './sync.js';

export const POS_VI = { n: 'Danh từ', v: 'Động từ', adj: 'Tính từ', adv: 'Trạng từ', prep: 'Giới từ', conj: 'Liên từ', phr: 'Cụm từ' };
export const LANGS = {
  en: { code: 'en', tts: 'en-US', name: 'Tiếng Anh', flag: 'EN' },
  de: { code: 'de', tts: 'de-DE', name: 'Tiếng Đức', flag: 'DE' },
};

// Câu ví dụ do Gemini sinh, lưu trên máy: { [wordId]: {ex, exvi} }
export const getGenSentences = () => ls.get('tl_gen_sentences', {});
export function saveGenSentence(id, v) { const m = getGenSentences(); m[id] = v; ls.set('tl_gen_sentences', m); }

export function buildWords(lang, remoteRows) {
  const de = lang === 'de';
  const base = de ? BUNDLED_DE : (remoteRows || cachedWords() || BUNDLED_EN);
  const custom = de ? [] : state.custom.filter(w => !w.deleted).map(w => [w.en, w.pos, w.vi, w.topic, '', '', '']);
  const gen = getGenSentences();
  const seen = new Set(), all = [];
  for (const [en, pos, vi, topic, ipa, ex, exvi] of [...base, ...custom]) {
    const id = (de ? 'de:' : '') + en.toLowerCase().trim() + '|' + pos;
    if (seen.has(id)) continue; seen.add(id);
    const g = gen[id];
    all.push({ id, disp: en.trim(), en: en.toLowerCase().trim(), pos, vi: vi.toLowerCase().trim(), topic, ipa: ipa || '', ex: ex || g?.ex || '', exvi: exvi || g?.exvi || '' });
  }
  return all;
}
export const topicsOf = all => [...new Set(all.map(w => w.topic))];

export const P = id => state.prog[id];
export const prog = id => state.prog[id] || (state.prog[id] = { box: 0, ok: 0, miss: 0, fav: false, ts: 0 });
export const needReview = w => P(w.id) && P(w.id).box <= 1 && P(w.id).miss > 0;
export const weight = w => { const p = P(w.id); if (!p) return 3; return [6, 4, 2.5, 1.2, 0.4][Math.min(p.box, 4)]; };

export function pickWeighted(pool, exclude = []) {
  let c = pool.filter(w => !exclude.includes(w.id));
  if (!c.length) c = pool;
  let tot = c.reduce((s, w) => s + weight(w), 0), r = Math.random() * tot;
  for (const w of c) { r -= weight(w); if (r <= 0) return w; }
  return c[c.length - 1];
}
export const shuffle = a => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [r[i], r[j]] = [r[j], r[i]]; } return r; };
export const sample = (a, n) => shuffle(a).slice(0, n);
