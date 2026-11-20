// Nghe rồi gõ: nghe từ (có nút nghe chậm), gõ lại. Có sẵn nghĩa và khung số chữ cái để gợi ý.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LANGS, POS_VI, pickWeighted } from '../lib/words.js';
import { foreignOk, mark, accOf, hintOf } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';
import GameBar from '../components/GameBar.jsx';
import CheckBar from '../components/CheckBar.jsx';
import { sfx } from '../lib/sfx.js';

const N = 10;
export default function Listen({ mode, items, lang, onFinish, onAgain, onExit }) {
  const list = useMemo(() => { const o = []; while (o.length < Math.min(N, items.length)) { const w = pickWeighted(items, o.map(x => x.id)); if (o.includes(w)) break; o.push(w); } return o; }, [items]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [fb, setFb] = useState(null); // {ok}
  const [tries, setTries] = useState(0);
  const [reveal, setReveal] = useState(1);
  const [log, setLog] = useState([]);
  const ref = useRef(null);
  const tl = LANGS[lang].tts, w = list[i];

  useEffect(() => { if (w) { speak(w.en, tl); ref.current?.focus(); } }, [i]); // eslint-disable-line

  const finishWord = ok => {
    mark(w, ok && tries === 0 && reveal <= 1);
    setFb({ ok }); setLog(l => [...l, { w, ok, first: tries === 0 && reveal <= 1 }]); ok ? sfx.ok() : sfx.bad();
    speak(w.en, tl);
  };
  const submit = () => {
    if (fb) { next(); return; }
    if (!val.trim()) { speak(w.en, tl); return; }
    const ok = foreignOk(w, val);
    if (!ok && tries === 0) { sfx.bad(); setTries(1); setVal(''); setReveal(r => Math.max(r, 2)); speak(w.en, tl, 0.7); ref.current?.focus(); return; }
    finishWord(ok);
  };
  const next = () => {
    if (i + 1 >= list.length) {
      const ok = log.filter(x => x.ok).length;
      onFinish({ score: log.reduce((s, x) => s + (x.ok ? (x.first ? 10 : 5) : 0), 0), accuracy: accOf(ok, log.length - ok), words: ok });
      setI(list.length); return;
    }
    setI(i + 1); setVal(''); setFb(null); setTries(0); setReveal(1);
  };

  if (i >= list.length) {
    const ok = log.filter(x => x.ok).length;
    return <Result title={`Nghe đúng ${ok}/${list.length}`} stats={[[ok, 'đúng'], [log.filter(x => x.ok && x.first).length, 'đúng ngay lần đầu'], [list.length - ok, 'sai']]} missed={log.filter(x => !x.ok).map(x => x.w)} onAgain={onAgain} onExit={onExit} />;
  }
  return (
    <div className="page narrow">
      <GameBar mode={mode} i={i} n={list.length} onExit={onExit} />
      <div className="card exercise">
        <div className="row center">
          <button className="btn big" onClick={() => speak(w.en, tl)}>🔊 Nghe lại</button>
          <button className="btn ghost big" onClick={() => speak(w.en, tl, 0.6)}>🐢 Chậm</button>
        </div>
        <div className="hintbox">
          <span>Nghĩa: <b>{w.vi}</b> · {POS_VI[w.pos] || w.pos}</span>
          <span className="letters">{fb ? w.disp : hintOf(w.disp, reveal)}</span>
          <small>{w.disp.replace(/\s/g, '').length} chữ cái</small>
        </div>
        {tries === 1 && !fb && <p className="note err center">Chưa đúng. Đã hiện thêm chữ cái, nghe chậm lại và thử lần nữa.</p>}
        <input ref={ref} className={'answer-in ' + (fb ? (fb.ok ? 'ok' : 'bad') : '')} value={val} onChange={e => setVal(e.target.value)} readOnly={!!fb}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} placeholder="Gõ từ bạn nghe được rồi nhấn Enter…" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" enterKeyHint="done" />
        {!fb && <div className="row center"><button className="btn ghost small" onClick={() => { setReveal(r => Math.min(r + 1, w.disp.length)); ref.current?.focus(); }}>💡 Hiện thêm chữ</button></div>}
      </div>
      <CheckBar state={fb ? (fb.ok ? 'ok' : 'bad') : null} onCheck={submit} canCheck={!!val.trim()} onNext={next} answer={w.disp}
        detail={fb && <>{w.disp} {w.ipa} · {w.vi}</>} skip={{ label: 'Xem đáp án', onClick: () => finishWord(false) }} />
    </div>
  );
}
