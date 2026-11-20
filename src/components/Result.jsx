import React, { useState } from 'react';
import { P, prog } from '../lib/words.js';
import { saveProg } from '../lib/store.js';

export default function Result({ title, stats, missed = [], onAgain, onExit }) {
  const [, bump] = useState(0);
  const uniq = [...new Map(missed.map(d => [d.id, d])).values()];
  const fav = id => { prog(id).fav = !P(id)?.fav; saveProg([id]); bump(x => x + 1); };
  return (
    <div className="result card">
      <h2>{title}</h2>
      <div className="kv">{stats.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
      {uniq.length > 0 && (
        <>
          <h4>Từ cần ôn lại (bấm ★ để thêm vào yêu thích)</h4>
          <ul className="miss">{uniq.map(d => <li key={d.id}><button className={'star' + (P(d.id)?.fav ? ' on' : '')} onClick={() => fav(d.id)}>★</button>{d.disp} — {d.vi}</li>)}</ul>
        </>
      )}
      <div className="row"><button className="btn" onClick={onAgain}>Chơi lại</button><button className="btn ghost" onClick={onExit}>Chọn chủ đề khác</button></div>
    </div>
  );
}
