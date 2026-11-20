// Gọi Gemini trực tiếp từ trình duyệt bằng khóa của người dùng (lưu trên máy, không đồng bộ lên máy chủ).
import { settings } from './store.js';
import { saveGenSentence } from './words.js';

export const hasKey = () => !!settings.geminiKey?.trim();
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

export async function generate(prompt, opts = {}) {
  return chat([{ role: 'user', text: prompt }], opts);
}
// history: [{role:'user'|'model', text}]
export async function chat(history, { json = false, system, temperature = 0.7 } = {}) {
  if (!hasKey()) throw new Error('Chưa nhập Gemini API key (vào Cài đặt).');
  const body = { contents: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const r = await fetch(`${BASE}${encodeURIComponent(settings.textModel)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.geminiKey.trim() }, body: JSON.stringify(body),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const m = e?.error?.message || r.statusText;
    throw new Error(r.status === 429 ? 'Gemini báo quá giới hạn miễn phí, hãy đợi một lúc.' : r.status === 400 || r.status === 403 ? 'Gemini từ chối: ' + m : m);
  }
  const d = await r.json();
  const t = d.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  if (!json) return t;
  try { return JSON.parse(t); } catch (e) { throw new Error('Gemini trả về dữ liệu sai định dạng.'); }
}

// Sinh câu ví dụ cho các từ chưa có (ngôn ngữ học: 'en' | 'de'), lưu cache.
export async function ensureSentences(words, lang) {
  const need = words.filter(w => !w.ex);
  if (!need.length || !hasKey()) return words;
  const L = lang === 'de' ? 'tiếng Đức' : 'tiếng Anh';
  const list = need.map((w, i) => `${i}. ${w.disp} (${w.pos}) = ${w.vi}`).join('\n');
  const out = await generate(
    `Với mỗi từ ${L} dưới đây, viết 1 câu ví dụ tự nhiên, ngắn (6-12 từ), trình độ A2-B1, chứa CHÍNH XÁC từ đó (giữ nguyên dạng viết, không chia lại), kèm bản dịch tiếng Việt.\n` +
    `Trả về JSON mảng: [{"i":0,"ex":"...","exvi":"..."}]\n${list}`, { json: true });
  for (const r of Array.isArray(out) ? out : []) {
    const w = need[r.i]; if (!w || !r.ex || w.ex) continue;
    if (!r.ex.toLowerCase().includes(w.en.split(' ')[0].slice(0, 4))) continue;
    w.ex = r.ex; w.exvi = r.exvi || '';
    saveGenSentence(w.id, { ex: w.ex, exvi: w.exvi });
  }
  return words;
}
