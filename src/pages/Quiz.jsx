// Trắc nghiệm câu: chọn từ để điền vào chỗ trống (từ đang chọn hiện thử trong câu, đổi ý được) rồi bấm Kiểm tra.
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../ctx.js';
import { LANGS, shuffle } from '../lib/words.js';
import { mark, accOf, blankOf, distractors } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';
import GameBar from '../components/GameBar.jsx';
import CheckBar from '../components/CheckBar.jsx';
import { sfx } from '../lib/sfx.js';

export default function Quiz({ mode, items, lang, onFinish, onAgain, onExit }) {
  const { all } = useApp();
  const qs = useMemo(() => items.map(w => ({ w, b: blankOf(w.ex, w) })).filter(q => q.b).slice(0, 10)
    .map(q => ({ ...q, opts: shuffle([q.w, ...distractors(q.w, items, all, 3)]) })), [items, all]);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(null);
  const [pick, setPick] = useState(null);
  const [log, setLog] = useState([]);
  const [vi, setVi] = useState(false);
  const q = qs[i];

  const choose = o => { if (!pick && o) { setSel(o); sfx.tap(); } };
  const check = () => {
    const o = sel;
    if (pick || !o) return;
    const ok = o.id === q.w.id;
    setPick(o); mark(q.w, ok); setLog(l => [...l, { w: q.w, ok }]); ok ? sfx.ok() : sfx.bad();
    speak(q.w.ex, LANGS[lang].tts);
  };
  const next = () => {
    if (i + 1 >= qs.length) { const ok = log.filter(x => x.ok).length; onFinish({ score: ok * 10, accuracy: accOf(ok, log.length - ok), words: ok }); }
    setI(i + 1); setPick(null); setSel(null); setVi(false);
  };

  useEffect(() => {
    const k = e => {
      if (!q) return;
      const onBtn = e.target.tagName === 'BUTTON' && !e.target.classList.contains('opt');
      if (!pick && ['1', '2', '3', '4'].includes(e.key)) choose(q.opts[+e.key - 1]);
      else if (e.key === 'Enter' && !onBtn) { e.preventDefault(); if (pick) next(); else check(); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });

  if (!qs.length) return <div className="page"><div className="card"><p>Không tìm được câu phù hợp.</p><button className="btn" onClick={onExit}>Quay lại</button></div></div>;
  if (i >= qs.length) {
    const ok = log.filter(x => x.ok).length;
    return <Result title={`Đúng ${ok}/${qs.length} câu`} stats={[[ok * 10, 'điểm'], [ok, 'đúng'], [qs.length - ok, 'sai']]} missed={log.filter(x => !x.ok).map(x => x.w)} onAgain={onAgain} onExit={onExit} />;
  }
  return (
    <div className="page narrow">
      <GameBar mode={mode} i={i} n={qs.length} onExit={onExit} />
      <div className="card exercise">
        <p className="sentence">{q.b[0]}<span className={'blank ' + (pick ? (pick.id === q.w.id ? 'ok' : 'bad') : sel ? 'sel' : '')}>{pick ? q.b[1] : sel ? sel.disp : '______'}</span>{q.b[2]}</p>
        {q.w.exvi && ((pick || vi) ? <p className="trans">Nghĩa: {q.w.exvi}</p> : <button className="btn ghost small self-start" onClick={() => setVi(true)}>💡 Xem nghĩa câu</button>)}
        <div className="choices grid">
          {q.opts.map((o, k) => (
            <button key={o.id} className={'opt' + (pick ? (o.id === q.w.id ? ' ok' : o === pick ? ' bad' : ' dim') : sel === o ? ' sel' : '')} onClick={() => choose(o)} aria-pressed={sel === o}>
              <b className="key">{k + 1}</b><span>{o.disp}</span>{pick && <small>{o.vi}</small>}
            </button>
          ))}
        </div>
      </div>
      <CheckBar state={pick ? (pick.id === q.w.id ? 'ok' : 'bad') : null} onCheck={check} canCheck={!!sel} onNext={next} answer={q.w.disp} detail={pick && <>{q.w.disp} = {q.w.vi}</>} />
    </div>
  );
}
