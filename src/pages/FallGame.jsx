// Từ rơi. Chế độ 'fall' giữ kịch bản cũ: gõ từ ngoại ngữ → hiện nghĩa → gõ nghĩa tiếng Việt (Telex/VNI).
// Chế độ 'fall1' (gõ 1 bước): chỉ gõ từ ngoại ngữ, xong là hiện nghĩa bên dưới.
import React, { useEffect, useRef, useState } from 'react';
import { settings } from '../lib/store.js';
import { compose } from '../lib/engine.js';
import { POS_VI, LANGS, weight } from '../lib/words.js';
import { M, mark } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';
import { sfx } from '../lib/sfx.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default function FallGame({ mode, items, label, lang, onFinish, onAgain, onExit }) {
  const stageRef = useRef(null), inputRef = useRef(null), G = useRef(null);
  const [hud, setHud] = useState({ score: 0, lives: 5, level: 1, wpm: 0, combo: 1 });
  const [hint, setHint] = useState('Gõ từ đang rơi…');
  const [comp, setComp] = useState('');
  const [learned, setLearned] = useState(null);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState(null);
  const tl = LANGS[lang].tts;
  const one = mode.id === 'fall1';

  useEffect(() => {
    const stage = stageRef.current, input = inputRef.current;
    const g = G.current = { pool: items, words: [], score: 0, lives: 5, level: 1, done: 0, combo: 0, buf: '', correct: 0, errors: 0, elapsed: 0, spawnT: 0, missed: [], paused: false, over: false, composing: false, last: performance.now() };
    const H = () => stage.clientHeight, W = () => stage.clientWidth;
    const mult = () => 1 + Math.min(g.combo, 20) * 0.1;
    const wpm = () => (g.elapsed > 3 ? Math.round(g.correct / 5 / (g.elapsed / 60)) : 0);
    const pushHud = () => setHud({ score: g.score, lives: g.lives, level: g.level, wpm: wpm(), combo: mult() });
    const place = w => { w.el.style.transform = `translate(${w.x}px,${w.y}px)`; };
    function render(w, typed) {
      const d = w.d;
      if (w.stage === 'vi') w.el.innerHTML = `<em class="tag">${esc(d.disp)}</em><span><span class="done">${esc(d.vi.slice(0, typed))}</span>${esc(d.vi.slice(typed))}</span>`;
      else w.el.innerHTML = `<em class="tag">${esc(POS_VI[d.pos] || d.pos)}</em><span><span class="done">${esc(d.disp.slice(0, typed))}</span>${esc(d.disp.slice(typed))}</span>`;
      w.el.className = 'w ' + w.stage + (typed ? ' act' : '');
      w.typed = typed; w.h = w.el.offsetHeight; w.wd = w.el.offsetWidth;
      // Nghĩa tiếng Việt thường dài hơn từ gốc: đẩy thẻ vào lại trong khung để không bị cắt chữ
      const nx = clamp(w.x, 6, Math.max(6, W() - w.wd - 6));
      if (nx !== w.x) { w.x = nx; place(w); }
    }
    function pick() {
      const on = g.words.map(w => w.d.id), firsts = g.words.filter(w => w.stage === 'en').map(w => w.d.en[0]);
      let c = g.pool.filter(w => !on.includes(w.id));
      const better = c.filter(w => !firsts.includes(w.en[0])); if (better.length) c = better;
      if (!c.length) c = g.pool;
      let r = Math.random() * c.reduce((s, w) => s + weight(w), 0);
      for (const w of c) { r -= weight(w); if (r <= 0) return w; }
      return c[c.length - 1];
    }
    function spawn() {
      const d = pick(), el = document.createElement('div'); stage.appendChild(el);
      const w = { d, stage: 'en', x: 0, y: 0, speed: (15 + g.level * 4) * settings.speed * clamp(H() / 700, 0.5, 1.15) * (0.85 + Math.random() * 0.3), el, typed: 0 };
      render(w, 0);
      let best = 6, bs = -1;
      for (let i = 0; i < 14; i++) {
        const x = 6 + Math.random() * Math.max(1, W() - w.wd - 12); let sc = 1e9;
        for (const o of g.words) if (o.y < 150) sc = Math.min(sc, Math.abs(o.x - x));
        if (sc > bs) { bs = sc; best = x; }
      }
      w.x = best; w.y = -w.h - 4; g.words.push(w); place(w);
    }
    const typedLen = w => M.typedLen(w, g.buf);
    const refresh = () => { for (const w of g.words) { const n = typedLen(w); if (n !== w.typed) render(w, n); } };
    function updateHint() {
      const val = g.buf;
      setComp(val && g.words.some(w => w.stage === 'vi' && M.matches(w, val)) ? '→ ' + compose(val, settings.method) : '');
      input.classList.toggle('bad', !!g.dirty);
      if (g.dirty) setHint('Chưa khớp, nhấn xoá để sửa.');
      else if (settings.confirm === 'space' && val && g.words.some(w => M.isComplete(w, val))) setHint('✔ Đúng rồi, nhấn Space hoặc Enter.');
      else if (!val) setHint(g.words.some(w => w.stage === 'vi') ? 'Thẻ xanh: gõ nghĩa tiếng Việt (' + (settings.method === 'telex' ? 'Telex' : 'VNI') + ')' : 'Gõ từ đang rơi…');
      else setHint('');
    }
    const remove = w => { g.words = g.words.filter(x => x !== w); w.el.classList.add('pop'); setTimeout(() => w.el.remove(), 350); };
    function complete(w) {
      g.combo++; g.score += Math.round((w.stage === 'en' ? w.d.en : w.d.vi).length * 10 * mult());
      if (w.stage === 'en') {
        if (settings.speakEn) speak(w.d.en, tl);
        if (!one) { w.stage = 'vi'; w.y = Math.max(0, w.y - 60); render(w, 0); place(w); return; }
      } else if (settings.speakVi) speak(w.d.vi, 'vi-VN');
      sfx.ok(); setLearned(w.d); remove(w); mark(w.d, true); g.done++;
      if (g.done % 8 === 0) { g.level++; if (g.level > 20) { end(true); return; } }
      pushHud();
    }
    function miss(w) {
      sfx.bad(); remove(w); g.lives--; g.combo = 0; mark(w.d, false); g.missed.push(w.d);
      if (g.buf && !g.words.some(x => M.matches(x, g.buf))) { g.buf = ''; input.value = ''; g.dirty = false; }
      refresh(); updateHint(); pushHud();
      if (g.lives <= 0) end(false);
    }
    function end(win) {
      g.over = true; input.blur();
      const acc = g.correct + g.errors ? Math.round(g.correct * 100 / (g.correct + g.errors)) : 100;
      onFinish({ score: g.score, wpm: wpm(), accuracy: acc, words: g.done });
      setResult({ win, score: g.score, wpm: wpm(), acc, done: g.done, missed: g.missed });
    }
    function onType(raw) {
      if (g.over || g.paused) return;
      const val = raw.toLowerCase().replace(/^\s+/, ''); if (val !== raw) input.value = val;
      const prev = g.buf; if (val === prev) return;
      if (settings.confirm === 'space' && val.length === prev.length + 1 && val.endsWith(' ') && val.startsWith(prev) && prev && !prev.endsWith(' ')) {
        const fin = g.words.filter(w => M.isComplete(w, prev)).sort((a, b) => b.y - a.y)[0];
        if (fin) { g.buf = ''; input.value = ''; g.dirty = false; complete(fin); refresh(); updateHint(); return; }
      }
      const cands = g.words.filter(w => M.matches(w, val));
      if (!cands.length) {
        const isAppend = val.length === prev.length + 1 && val.startsWith(prev) && val.charCodeAt(val.length - 1) < 128;
        if (isAppend) { input.value = prev; g.errors++; g.combo = 0; const b = input.parentElement; b.classList.remove('err'); void b.offsetWidth; b.classList.add('err'); return; }
        g.buf = val; g.dirty = true; refresh(); updateHint(); return;
      }
      g.dirty = false;
      if (val.length > prev.length) g.correct += val.length - prev.length;
      g.buf = val;
      const done = settings.confirm === 'auto' ? cands.filter(w => M.isComplete(w, val)).sort((a, b) => b.y - a.y)[0] : null;
      if (done) { g.buf = ''; input.value = ''; complete(done); }
      refresh(); updateHint();
    }
    g.setPause = p => { if (g.over) return; g.paused = p; setPaused(p); if (!p) { g.last = performance.now(); input.focus({ preventScroll: true }); } else input.blur(); };
    const onInput = e => { if (e.isComposing || g.composing) return; onType(input.value); };
    const cs = () => { g.composing = true; }, ce = () => { g.composing = false; onType(input.value); };
    // Enter xác nhận từ giống Space (không xử lý khi bộ gõ đang ghép chữ)
    function confirmEnter() {
      if (g.over || g.paused || g.composing || !g.buf) return;
      const val = g.buf.replace(/\s+$/, '');
      const fin = g.words.filter(w => M.isComplete(w, val)).sort((a, b) => b.y - a.y)[0];
      if (fin) { g.buf = ''; input.value = ''; g.dirty = false; complete(fin); refresh(); updateHint(); }
    }
    const key = e => {
      if (e.key === 'Escape') g.setPause(!g.paused);
      if (e.key === 'Enter' || e.key === 'Tab') e.preventDefault();
      if (e.key === 'Enter' && !e.isComposing) confirmEnter();
    };
    const vis = () => { if (document.hidden && !g.over) g.setPause(true); };
    input.addEventListener('input', onInput); input.addEventListener('compositionstart', cs); input.addEventListener('compositionend', ce);
    document.addEventListener('keydown', key); document.addEventListener('visibilitychange', vis);
    input.focus({ preventScroll: true });
    let raf;
    const loop = t => {
      if (g.over) return;
      const dt = Math.min(0.05, (t - g.last) / 1000); g.last = t;
      if (!g.paused && H() >= 140) {
        g.elapsed += dt; g.spawnT -= dt;
        const maxW = Math.min(clamp(Math.floor(H() / 105), 2, 8), 2 + Math.floor(g.level / 3));
        if ((g.spawnT <= 0 && g.words.length < maxW) || !g.words.length) { spawn(); g.spawnT = Math.max(1.2, 3.4 - g.level * 0.12) / settings.speed; }
        for (const w of [...g.words]) { w.y += w.speed * dt; place(w); if (w.y + w.h >= H() - 6) { miss(w); if (g.over) return; } }
        if (((g.elapsed * 10) | 0) % 10 === 0) pushHud();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      g.over = true; cancelAnimationFrame(raf);
      input.removeEventListener('input', onInput); input.removeEventListener('compositionstart', cs); input.removeEventListener('compositionend', ce);
      document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', vis);
      stage.querySelectorAll('.w').forEach(e => e.remove());
    };
  }, []); // eslint-disable-line

  if (result) {
    return <Result title={result.win ? '🎉 Hoàn thành 20 mốc!' : 'Hết mạng rồi!'} missed={result.missed} onAgain={onAgain} onExit={onExit}
      stats={[[result.score, 'điểm'], [result.done, 'từ hoàn thành'], [result.wpm, 'WPM'], [result.acc + '%', 'chính xác']]} />;
  }
  return (
    <div className="fall">
      <p className="gb-tip">👉 {mode.tip}{one ? '' : ', khi thẻ chuyển xanh thì gõ nghĩa tiếng Việt'} · Esc tạm dừng</p>
      <div className="hud">
        <span>🏆 {hud.score}</span><span>Mốc {Math.min(hud.level, 20)}/20 · {label}</span>
        <span>{hud.wpm} WPM</span><span>x{hud.combo.toFixed(1)}</span><span className="hearts">{'♥'.repeat(Math.max(0, hud.lives))}</span>
        <button className="icon-btn" onClick={() => G.current.setPause(!G.current.paused)}>⏸</button>
      </div>
      <div className="stage" ref={stageRef} onPointerDown={e => { e.preventDefault(); inputRef.current?.focus({ preventScroll: true }); }}>
        {paused && (
          <div className="overlay"><div className="card"><h3>Tạm dừng</h3>
            <div className="row"><button className="btn" onClick={() => G.current.setPause(false)}>Tiếp tục</button><button className="btn ghost" onClick={onExit}>Thoát</button></div>
          </div></div>
        )}
        <div className="danger" />
      </div>
      {learned && <div className="learned"><b>{learned.disp}</b> {learned.ipa && <i>{learned.ipa}</i>} · {learned.vi}{learned.ex && <><br /><span>{learned.ex}</span> <em>({learned.exvi})</em></>}</div>}
      <div className="inputbar">
        <input ref={inputRef} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" enterKeyHint="done" aria-label="Ô gõ" />
        <span className="comp">{comp}</span>
      </div>
      <div className="hint">{hint}</div>
    </div>
  );
}
