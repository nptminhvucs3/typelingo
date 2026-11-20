// Đảo chiều: bảng 2 cột, cột trái nghĩa tiếng Việt, cột phải ô gõ từ ngoại ngữ. Mỗi vòng 10 từ.
import React, { useMemo, useRef, useState } from 'react';
import { POS_VI, LANGS, pickWeighted } from '../lib/words.js';
import { foreignOk, mark, accOf, hintOf } from '../lib/answer.js';
import { speak } from '../lib/speech.js';
import Result from '../components/Result.jsx';
import GameBar from '../components/GameBar.jsx';

const N = 8;
export default function Reverse({ mode, items, lang, onFinish, onAgain, onExit }) {
  const rows = useMemo(() => { const out = []; while (out.length < Math.min(N, items.length)) out.push(pickWeighted(items, out.map(x => x.id))); return out; }, [items]);
  const [vals, setVals] = useState(() => rows.map(() => ''));
  const [st, setSt] = useState(() => rows.map(() => null)); // null | 'ok' | 'bad' | 'shown'
  const [hints, setHints] = useState(() => rows.map(() => 0));
  const [done, setDone] = useState(null);
  const refs = useRef([]);
  const tl = LANGS[lang].tts;

  const check = i => {
    if (st[i] || !vals[i].trim()) return;
    const ok = foreignOk(rows[i], vals[i]);
    const n = [...st]; n[i] = ok ? 'ok' : 'bad'; setSt(n);
    mark(rows[i], ok && !hints[i]);
    if (ok) speak(rows[i].en, tl);
    const next = n.findIndex((x, k) => k > i && !x);
    if (next >= 0) refs.current[next]?.focus();
  };
  const hint = i => {
    const h = hints[i] + 1, w = rows[i].disp;
    const nh = [...hints]; nh[i] = h; setHints(nh);
    const nv = [...vals]; nv[i] = w.slice(0, h); setVals(nv);
    refs.current[i]?.focus();
  };
  const finish = () => {
    const n = st.map((x, i) => x || (vals[i].trim() ? (foreignOk(rows[i], vals[i]) ? 'ok' : 'bad') : 'bad'));
    n.forEach((x, i) => { if (!st[i]) mark(rows[i], x === 'ok' && !hints[i]); });
    setSt(n);
    const ok = n.filter(x => x === 'ok').length;
    const score = n.reduce((s, x, i) => s + (x === 'ok' ? (hints[i] ? 5 : 10) : 0), 0);
    onFinish({ score, accuracy: accOf(ok, rows.length - ok), words: ok });
    setDone({ ok, score, missed: rows.filter((_, i) => n[i] !== 'ok') });
  };
  const all = st.every(Boolean);

  if (done) return <Result title={`Đúng ${done.ok}/${rows.length} từ`} stats={[[done.score, 'điểm'], [done.ok, 'đúng'], [rows.length - done.ok, 'sai']]} missed={done.missed} onAgain={onAgain} onExit={onExit} />;
  return (
    <div className="page">
      <GameBar mode={mode} i={st.filter(Boolean).length} n={rows.length} onExit={onExit} />
      {lang === 'de' && <p className="note">Danh từ tiếng Đức gõ kèm mạo từ (der/die/das).</p>}
      <div className="card twocol">
        <div className="tc-head"><span>Tiếng Việt</span><span>{LANGS[lang].name}</span></div>
        {rows.map((w, i) => (
          <div key={w.id} className={'tc-row ' + (st[i] || '')}>
            <div className="tc-vi"><b>{w.vi}</b><small>{POS_VI[w.pos] || w.pos}</small></div>
            <div className="tc-in">
              <input ref={el => (refs.current[i] = el)} value={vals[i]} placeholder={hintOf(w.disp, 1) + '  (' + w.disp.replace(/\s/g, '').length + ' chữ)'} autoFocus={i === 0} disabled={!!st[i]} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" enterKeyHint="next"
                onChange={e => { const nv = [...vals]; nv[i] = e.target.value; setVals(nv); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); check(i); } }} />
              {!st[i] && <button className="mini" onClick={() => hint(i)} title="Gợi ý chữ cái">💡</button>}
              {st[i] === 'bad' && <span className="answer">→ {w.disp}</span>}
              {st[i] === 'ok' && <span className="okmark">✓</span>}
            </div>
          </div>
        ))}
        <div className="startbar"><span className="note">Gợi ý trừ nửa điểm của từ đó.</span><button className="btn" onClick={finish}>{all ? 'Xem kết quả' : 'Nộp bài'}</button></div>
      </div>
    </div>
  );
}
