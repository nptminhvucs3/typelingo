// Thẻ chọn nghĩa: từ ngoại ngữ ở trên, 3 nghĩa tiếng Việt bên dưới. Chọn (phím 1/2/3, đổi ý được) rồi bấm Kiểm tra (Enter).
// Chọn sai thì thẻ quay lại cuối bộ để gặp lại.
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../ctx.js';
import { LANGS, POS_VI, pickWeighted, shuffle } from '../lib/words.js';
import { mark, accOf, distractors } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import { settings } from '../lib/store.js';
import Result from '../components/Result.jsx';
import GameBar from '../components/GameBar.jsx';
import CheckBar from '../components/CheckBar.jsx';
import { sfx } from '../lib/sfx.js';

const N = 12;
export default function Flash({ mode, items, lang, onFinish, onAgain, onExit }) {
  const { all } = useApp();
  const init = useMemo(() => {
    const o = [];
    while (o.length < Math.min(N, items.length)) { const w = pickWeighted(items, o.map(x => x.id)); if (o.includes(w)) break; o.push(w); }
    return o;
  }, [items]);
  const [deck, setDeck] = useState(init);
  const [opts, setOpts] = useState([]);
  const [sel, setSel] = useState(null);   // đáp án đang chọn, chưa chấm
  const [pick, setPick] = useState(null); // đáp án đã chấm
  const [done, setDone] = useState(0);
  const [turn, setTurn] = useState(0);
  const [log, setLog] = useState([]); // {w, ok}
  const tl = LANGS[lang].tts, w = deck[0];

  useEffect(() => {
    if (!w) return;
    setOpts(shuffle([w, ...distractors(w, items, all, 2)]));
    setPick(null); setSel(null);
    if (settings.speakEn) speak(w.en, tl);
  }, [turn]); // eslint-disable-line

  const choose = o => { if (!pick && o) { setSel(o); sfx.tap(); } };
  const check = () => {
    const o = sel;
    if (pick || !o) return;
    const ok = o.id === w.id;
    setPick(o);
    const first = !log.some(x => x.w.id === w.id);
    if (first) mark(w, ok);
    setLog(l => [...l, { w, ok }]);
    if (ok) sfx.ok(); else { sfx.bad(); speak(w.en, tl); }
  };
  const next = () => {
    const ok = pick.id === w.id;
    let rest = deck.slice(1);
    if (!ok) rest = [...rest, w];
    else setDone(d => d + 1);
    setDeck(rest); setTurn(t => t + 1);
    if (!rest.length) {
      const firstOk = init.filter(x => log.find(l => l.w.id === x.id)?.ok).length;
      onFinish({ score: firstOk * 10, accuracy: accOf(firstOk, init.length - firstOk), words: init.length });
    }
  };
  useEffect(() => {
    const k = e => {
      if (!w) return;
      const onBtn = e.target.tagName === 'BUTTON' && !e.target.classList.contains('opt');
      if (!pick && ['1', '2', '3'].includes(e.key)) choose(opts[+e.key - 1]);
      else if (e.key === 'Enter' && !onBtn) { e.preventDefault(); if (pick) next(); else check(); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });

  if (!w) {
    const wrong = [...new Map(log.filter(x => !x.ok).map(x => [x.w.id, x.w])).values()];
    const firstOk = init.length - wrong.length;
    return <Result title={firstOk === init.length ? '🎉 Đúng hết ngay lần đầu!' : 'Xong bộ thẻ'} stats={[[firstOk + '/' + init.length, 'đúng ngay lần đầu'], [wrong.length, 'từ cần ôn']]} missed={wrong} onAgain={onAgain} onExit={onExit} />;
  }
  const ok = pick && pick.id === w.id;
  return (
    <div className="page narrow">
      <GameBar mode={mode} i={done} n={init.length} onExit={onExit} />
      <div className="wordcard">
        <small className="pos">{POS_VI[w.pos] || w.pos}</small>
        <h2>{w.disp}</h2>
        {w.ipa && <i className="ipa">{w.ipa}</i>}
        <div className="row center">
          <button className="sound" onClick={() => speak(w.en, tl)} aria-label="Nghe">🔊</button>
          <button className="sound" onClick={() => speak(w.en, tl, 0.7)} aria-label="Nghe chậm">🐢</button>
        </div>
      </div>
      <p className="ask">Từ này nghĩa là gì?</p>
      <div className="choices col">
        {opts.map((o, k) => (
          <button key={o.id} className={'opt big' + (pick ? (o.id === w.id ? ' ok' : pick === o ? ' bad' : ' dim') : sel === o ? ' sel' : '')} onClick={() => choose(o)} aria-pressed={sel === o}>
            <b className="key">{k + 1}</b><span>{o.vi}</span>{pick && o.id !== w.id && <small>{o.disp}</small>}
          </button>
        ))}
      </div>
      <CheckBar state={pick ? (ok ? 'ok' : 'bad') : null} onCheck={check} canCheck={!!sel} onNext={next} answer={w.vi}
        detail={pick && (w.ex ? <>{w.disp} = {w.vi}<br />{w.ex}<br /><em>{w.exvi}</em></> : <>{w.disp} = {w.vi}</>)} />
    </div>
  );
}
