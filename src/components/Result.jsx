// Màn hoàn thành bài: XP nhận được, độ chính xác, mục tiêu ngày, danh sách từ cần ôn.
import React, { useEffect, useState } from 'react';
import { P, prog } from '../lib/words.js';
import { saveProg, state } from '../lib/store.js';
import { statsData } from '../lib/stats.js';
import { sfx } from '../lib/sfx.js';

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
      <div className="trophy">{uniq.length ? '💪' : '🏆'}</div>
      <h2>{last ? 'Hoàn thành bài học!' : title}</h2>
      {last && <p className="note">{title}</p>}
      <div className="kv">
        {last && <div className="kv-xp"><span>Tổng XP</span><b>⚡ {last.xp}</b></div>}
        {stats.map(([v, l]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}
      </div>
      <div className="goalline">
        <span>🎯 Mục tiêu hôm nay</span>
        <div className="progress"><i style={{ width: pct + '%' }} /></div>
        <b>{d.xpToday}/{d.goal} XP</b>
      </div>
      {d.streak > 0 && <p className="streakline">🔥 Chuỗi <b>{d.streak}</b> ngày học liên tiếp</p>}
      {uniq.length > 0 && (
        <div className="card misscard">
          <h4>Từ cần ôn lại <small>(bấm ★ để lưu vào yêu thích)</small></h4>
          <ul className="miss">{uniq.map(w => <li key={w.id}><button className={'star' + (P(w.id)?.fav ? ' on' : '')} onClick={() => fav(w.id)}>★</button><b>{w.disp}</b> — {w.vi}</li>)}</ul>
        </div>
      )}
      <div className="row center"><button className="btn ghost big" onClick={onExit}>Chọn chủ đề khác</button><button className="btn big" onClick={onAgain}>Học tiếp</button></div>
    </div>
  );
}
