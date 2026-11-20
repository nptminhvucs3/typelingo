// Ghép cặp: 3 bảng, mỗi bảng 6 cặp từ – nghĩa. Bấm 1 ô bên trái rồi 1 ô bên phải.
import React, { useMemo, useState } from 'react';
import { LANGS, pickWeighted, shuffle } from '../lib/words.js';
import { mark, accOf } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';
import GameBar from '../components/GameBar.jsx';

const PER = 6, BOARDS = 3;
export default function Match({ mode, items, lang, onFinish, onAgain, onExit }) {
  const boards = useMemo(() => {
    const used = [], out = [];
    for (let b = 0; b < BOARDS; b++) {
      const ws = [];
      while (ws.length < PER && used.length < items.length) {
        const w = pickWeighted(items, used);
        if (used.includes(w.id) || ws.some(x => x.vi === w.vi)) { used.push(w.id); continue; }
        used.push(w.id); ws.push(w);
      }
      if (ws.length >= 2) out.push({ left: shuffle(ws), right: shuffle(ws) });
    }
    return out;
  }, [items]);
  const [b, setB] = useState(0);
  const [selL, setSelL] = useState(null), [selR, setSelR] = useState(null);
  const [gone, setGone] = useState(new Set());
  const [wrong, setWrong] = useState(null);
  const [errs, setErrs] = useState(new Set());
  const [stat, setStat] = useState({ ok: 0, bad: 0, t0: Date.now() });
  const [done, setDone] = useState(false);
  const board = boards[b];

  const tryPair = (l, r) => {
    if (!l || !r) return;
    if (l.id === r.id) {
      const g = new Set(gone); g.add(l.id); setGone(g);
      mark(l, !errs.has(l.id)); speak(l.en, LANGS[lang].tts);
      const s = { ...stat, ok: stat.ok + 1 }; setStat(s);
      setSelL(null); setSelR(null);
      if (board.left.every(w => g.has(w.id))) {
        if (b + 1 < boards.length) setTimeout(() => { setB(b + 1); setGone(new Set()); }, 400);
        else { onFinish({ score: s.ok * 10 - s.bad * 3, accuracy: accOf(s.ok, s.bad), words: s.ok }); setTimeout(() => setDone(true), 400); }
      }
    } else {
      setStat({ ...stat, bad: stat.bad + 1 }); setErrs(new Set([...errs, l.id]));
      setWrong([l.id, r.id]); setTimeout(() => { setWrong(null); setSelL(null); setSelR(null); }, 500);
    }
  };

  if (!boards.length) return <div className="page"><div className="card"><p>Cần ít nhất 2 từ khác nghĩa.</p><button className="btn" onClick={onExit}>Quay lại</button></div></div>;
  if (done) {
    const missed = boards.flatMap(x => x.left).filter(w => errs.has(w.id));
    return <Result title="Ghép xong!" stats={[[stat.ok, 'cặp đúng'], [stat.bad, 'lần ghép sai'], [Math.round((Date.now() - stat.t0) / 1000) + 's', 'thời gian']]} missed={missed} onAgain={onAgain} onExit={onExit} />;
  }
  const cls = (w, side, sel) => 'tile' + (gone.has(w.id) ? ' gone' : '') + (sel?.id === w.id ? ' sel' : '') + (wrong && wrong[side] === w.id ? ' bad' : '');
  return (
    <div className="page narrow">
      <GameBar mode={mode} i={b} n={boards.length} onExit={onExit} extra={<span className="gb-count muted">Sai: {stat.bad}</span>} />
      <div className="match-head"><span>Từ</span><span>Nghĩa</span></div>
      <div className="match">
        <div>{board.left.map(w => <button key={w.id} className={cls(w, 0, selL)} disabled={gone.has(w.id)} onClick={() => { setSelL(w); tryPair(w, selR); }}>{w.disp}</button>)}</div>
        <div>{board.right.map(w => <button key={w.id} className={cls(w, 1, selR)} disabled={gone.has(w.id)} onClick={() => { setSelR(w); tryPair(selL, w); }}>{w.vi}</button>)}</div>
      </div>
    </div>
  );
}
