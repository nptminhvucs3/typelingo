// Điền từ vào câu: câu ví dụ khuyết một từ, gợi ý nghĩa + chữ cái đầu, gõ từ còn thiếu.
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { LANGS, POS_VI } from '../lib/words.js';
import { mark, accOf, blankOf, hintOf } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';
import GameBar from '../components/GameBar.jsx';

const norm = s => s.trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/\s+/g, ' ');

export default function Cloze({ mode, items, lang, onFinish, onAgain, onExit }) {
  const qs = useMemo(() => items.map(w => ({ w, b: blankOf(w.ex, w) })).filter(q => q.b).slice(0, 10), [items]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [fb, setFb] = useState(null);
  const [reveal, setReveal] = useState(1);
  const [log, setLog] = useState([]);
  const ref = useRef(null);
  const tl = LANGS[lang].tts, q = qs[i];
  useEffect(() => { ref.current?.focus(); }, [i]);

  const submit = () => {
    if (fb) {
      if (i + 1 >= qs.length) { const ok = [...log].filter(x => x.ok).length; onFinish({ score: ok * 10, accuracy: accOf(ok, log.length - ok), words: ok }); }
      setI(i + 1); setVal(''); setFb(null); setReveal(1); return;
    }
    if (!val.trim()) return;
    const ok = norm(val) === norm(q.b[1]) || norm(val) === norm(q.w.en);
    reveal_(ok);
  };
  const reveal_ = ok => { mark(q.w, ok && reveal <= 1); setFb({ ok }); setLog(l => [...l, { w: q.w, ok }]); speak(q.w.ex, tl); ref.current?.focus(); };

  if (!qs.length) return <div className="page"><div className="card"><p>Không tìm được câu phù hợp cho các từ này.</p><button className="btn" onClick={onExit}>Quay lại</button></div></div>;
  if (i >= qs.length) {
    const ok = log.filter(x => x.ok).length;
    return <Result title={`Điền đúng ${ok}/${qs.length} câu`} stats={[[ok * 10, 'điểm'], [ok, 'đúng'], [qs.length - ok, 'sai']]} missed={log.filter(x => !x.ok).map(x => x.w)} onAgain={onAgain} onExit={onExit} />;
  }
  return (
    <div className="page narrow">
      <GameBar mode={mode} i={i} n={qs.length} onExit={onExit} />
      <div className="card exercise">
        <div className="hintbox"><span>Từ cần điền nghĩa là: <b>{q.w.vi}</b> · {POS_VI[q.w.pos] || q.w.pos}</span><small>{q.b[1].length} chữ cái, chữ đầu là “{q.b[1][0]}”</small></div>
        <p className="sentence">{q.b[0]}<span className={'blank ' + (fb ? (fb.ok ? 'ok' : 'bad') : '')}>{fb ? q.b[1] : hintOf(q.b[1], reveal)}</span>{q.b[2]}</p>
        {fb && <div className={'feedback ' + (fb.ok ? 'ok' : 'bad')}>{fb.ok ? '✅ Đúng rồi!' : <>❌ Đáp án: <b>{q.b[1]}</b></>}{q.w.exvi && <><br /><em>{q.w.exvi}</em></>}</div>}
        <input ref={ref} className="answer-in" value={val} onChange={e => setVal(e.target.value)} readOnly={!!fb}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} placeholder="Gõ từ còn thiếu rồi nhấn Enter…" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" enterKeyHint="done" />
        <div className="row">
          {!fb && <button className="btn ghost" onClick={() => { setReveal(r => Math.min(r + 1, q.b[1].length)); ref.current?.focus(); }}>💡 Thêm chữ</button>}
          {!fb && <button className="btn ghost" onClick={() => reveal_(false)}>Xem đáp án</button>}
          <div className="grow" />
          <button className="btn" onClick={submit}>{fb ? 'Tiếp →' : 'Kiểm tra'}</button>
        </div>
      </div>
    </div>
  );
}
