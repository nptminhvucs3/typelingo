// Rơi chọn nghĩa: một từ rơi xuống, bên dưới có 3 nghĩa (gần nghĩa / cùng chủ đề) để chọn. Phím 1/2/3 cũng được.
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../ctx.js';
import { LANGS, POS_VI, pickWeighted, shuffle } from '../lib/words.js';
import { mark, accOf, distractors } from '../lib/answer.js';
import { settings } from '../lib/store.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';

export default function FallChoice({ mode, items, lang, onFinish, onAgain, onExit }) {
  const { all } = useApp();
  const stageRef = useRef(null), cardRef = useRef(null);
  const S = useRef({ y: 0, speed: 40, lives: 5, score: 0, ok: 0, bad: 0, combo: 0, n: 0, missed: [], lock: false, over: false, last: 0, recent: [] });
  const [cur, setCur] = useState(null); // {w, opts}
  const [fb, setFb] = useState(null); // {pick, ok}
  const [hud, setHud] = useState({ lives: 5, score: 0, combo: 0 });
  const [res, setRes] = useState(null);
  const tl = LANGS[lang].tts;

  const nextWord = () => {
    const s = S.current;
    const w = pickWeighted(items, s.recent);
    s.recent = [...s.recent, w.id].slice(-Math.min(8, items.length - 1));
    s.y = -60; s.lock = false; s.speed = (24 + s.n * 1.6) * settings.speed; s.n++;
    setFb(null); setCur({ w, opts: shuffle([w, ...distractors(w, items, all, 2)]) });
  };
  const end = () => {
    const s = S.current; s.over = true;
    onFinish({ score: s.score, accuracy: accOf(s.ok, s.bad), words: s.ok });
    setRes({ ...s });
  };
  const answer = (o, timeout) => {
    const s = S.current; if (s.lock || !cur) return; s.lock = true;
    const ok = !timeout && o.id === cur.w.id;
    mark(cur.w, ok);
    if (ok) { s.ok++; s.combo++; s.score += 10 + Math.min(s.combo, 10) * 2; speak(cur.w.en, tl); }
    else { s.bad++; s.combo = 0; s.lives--; s.missed.push(cur.w); }
    setHud({ lives: s.lives, score: s.score, combo: s.combo });
    setFb({ pick: o, ok });
    setTimeout(() => { if (s.over) return; if (s.lives <= 0) end(); else nextWord(); }, ok ? 450 : 1300);
  };

  useEffect(() => { nextWord(); }, []); // eslint-disable-line
  useEffect(() => {
    let raf; const s = S.current; s.last = performance.now();
    const loop = t => {
      if (s.over) return;
      const dt = Math.min(0.05, (t - s.last) / 1000); s.last = t;
      const st = stageRef.current, c = cardRef.current;
      if (st && c && !s.lock && !document.hidden) {
        s.y += s.speed * dt; c.style.transform = `translate(-50%, ${s.y}px)`;
        if (s.y + c.offsetHeight >= st.clientHeight - 4) answer(null, true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const key = e => { if (['1', '2', '3'].includes(e.key) && cur) answer(cur.opts[+e.key - 1]); };
    addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', key); };
  }); // chạy lại khi cur đổi để answer() thấy đúng từ hiện tại
  useEffect(() => () => { S.current.over = true; }, []);

  if (res) return <Result title="Hết mạng rồi!" stats={[[res.score, 'điểm'], [res.ok, 'chọn đúng'], [accOf(res.ok, res.bad) + '%', 'chính xác']]} missed={res.missed} onAgain={onAgain} onExit={onExit} />;
  return (
    <div className="fall choice">
      <p className="gb-tip">👉 {mode.tip} · phím 1, 2, 3</p>
      <div className="hud"><span>🏆 {hud.score}</span><span>combo {hud.combo}</span><span className="hearts">{'♥'.repeat(Math.max(0, hud.lives))}</span><button className="icon-btn" onClick={onExit}>✕</button></div>
      <div className="stage" ref={stageRef}>
        {cur && <div ref={cardRef} className={'w solo' + (fb ? (fb.ok ? ' okc' : ' badc') : '')}><em className="tag">{POS_VI[cur.w.pos]}</em><span>{cur.w.disp}</span></div>}
        <div className="danger" />
      </div>
      {cur && (
        <div className="choices">
          {cur.opts.map((o, k) => (
            <button key={o.id} className={'opt' + (fb ? (o.id === cur.w.id ? ' ok' : fb.pick === o ? ' bad' : ' dim') : '')} onClick={() => answer(o)}>
              <b>{k + 1}</b> {o.vi}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
