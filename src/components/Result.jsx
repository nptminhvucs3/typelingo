// Màn hoàn thành bài: XP nhận được, độ chính xác, mục tiêu ngày, danh sách từ cần ôn.
import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { P, prog } from '../lib/words.js';
import { saveProg, state } from '../lib/store.js';
import { statsData } from '../lib/stats.js';
import { sfx } from '../lib/sfx.js';
import Mascot from './Mascot.jsx';
import { Confetti } from './Burst.jsx';

export default function Result({ title, stats, missed = [], onAgain, onExit }) {
  const [, bump] = useState(0);
  const uniq = [...new Map(missed.map(d => [d.id, d])).values()];
  const fav = id => { prog(id).fav = !P(id)?.fav; saveProg([id]); bump(x => x + 1); };
  const last = state.last && Date.now() - state.last.at < 15000 ? state.last : null;
  const d = statsData();
  useEffect(() => { sfx.done(); }, []);
  const pct = Math.min(100, Math.round(d.xpToday * 100 / d.goal));
  return (
    <div className="result">
      <Confetti />
      <div className="trophy"><Mascot mood="celebrate" size={160} /></div>
      <h2>{last ? 'Hoàn thành bài học!' : title}</h2>
      {last && <p className="note">{title}</p>}
      <div className="kv">
        {last && <div className="kv-xp butter"><span>Tổng XP</span><b><Icon name="xp" size={26} /> {last.xp}</b></div>}
        {stats.map(([v, l], i) => <div key={l} className={['mint', 'sky', 'peach', 'lavender'][i % 4]}><span>{l}</span><b>{v}</b></div>)}
      </div>
      <div className="goalline">
        <span className="il"><Icon name={d.xpToday >= d.goal ? 'dat-muc-tieu' : 'muc-tieu'} size={24} /> Mục tiêu hôm nay</span>
        <div className="progress"><i style={{ width: pct + '%' }} /></div>
        <b>{d.xpToday}/{d.goal} XP</b>
      </div>
      {d.streak > 0 && <p className="streakline il"><Icon name="streak" size={24} /> Chuỗi <b>{d.streak}</b> ngày học liên tiếp</p>}
      {uniq.length > 0 && (
        <div className="card misscard">
          <h4 className="il"><Icon name="on-loi-sai" size={22} /> Từ cần ôn lại <small>(bấm ngôi sao để lưu vào yêu thích)</small></h4>
          <ul className="miss">{uniq.map(w => <li key={w.id}><button className={'star' + (P(w.id)?.fav ? ' on' : '')} onClick={() => fav(w.id)} aria-label="Yêu thích"><Icon name="sao" size={24} /></button><b>{w.disp}</b> — {w.vi}</li>)}</ul>
        </div>
      )}
      <div className="row center"><button className="btn ghost big" onClick={onExit}>Chọn chủ đề khác</button><button className="btn big" onClick={onAgain}>Học tiếp</button></div>
    </div>
  );
}
