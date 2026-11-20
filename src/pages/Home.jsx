// Trang chủ: lộ trình bài học dạng các nút tròn (dễ → khó), cột phải là mục tiêu ngày, chuỗi ngày, ôn tập.
import React from 'react';
import { useApp } from '../ctx.js';
import { state, settings, saveSettings } from '../lib/store.js';
import { P, needReview, LANGS } from '../lib/words.js';
import { modeById, groupOf } from '../modes.js';
import { useCloud } from '../lib/hooks.js';
import { statsData } from '../lib/stats.js';

// Lộ trình mỗi ngày
const PATH = ['flash', 'match', 'quiz', 'listen', 'cloze', 'fallchoice', 'fall1'];
const OFFS = [0, 60, 90, 60, 0, -60, -90, -60]; // độ lệch ngang tạo hình zíc-zắc
const GOALS = [[10, 'Nhẹ nhàng'], [20, 'Vừa phải'], [30, 'Nghiêm túc'], [50, 'Chăm chỉ']];

export default function Home() {
  const { all, lang, go, setAuthOpen, refresh } = useApp();
  const info = useCloud();
  const d = statsData();
  const mastered = all.filter(w => P(w.id)?.box >= 3).length;
  const review = all.filter(needReview).length;
  const played = state.history.length > 0;
  const steps = PATH.map(modeById);
  const next = steps.find(m => !d.todayModes.has(m.id)) || null;
  const pct = Math.min(100, Math.round(d.xpToday * 100 / d.goal));
  const max = Math.max(10, ...d.days.map(x => x.xp));
  const setGoal = g => { settings.dailyGoal = g; saveSettings(); refresh(); };

  return (
    <div className="page home">
      <div className="home-main">
        <div className="unit">
          <div>
            <small>{LANGS[lang].name} · {all.length} từ</small>
            <h2>{played ? 'Bài học hôm nay' : 'Bắt đầu từ đây 👇'}</h2>
            <p>{played ? 'Đi lần lượt từ trên xuống, bài trên dễ hơn bài dưới.' : 'Bấm nút đầu tiên. Bài đầu chỉ cần bấm chọn nghĩa, không phải gõ.'}</p>
          </div>
          <button className="btn unit-btn" onClick={() => go('learn')}>📚 Tất cả bài</button>
        </div>

        <div className="lpath">
          {steps.map((m, i) => {
            const done = d.todayModes.has(m.id), cur = m === next;
            const g = groupOf(m.group);
            const showHead = i === 0 || steps[i - 1].group !== m.group;
            return (
              <React.Fragment key={m.id}>
                {showHead && <div className="lp-sep"><span className={'badge ' + m.group}>{g.name}</span></div>}
                <div className={'lp-node' + (cur ? ' is-cur' : '')} style={{ transform: `translateX(${OFFS[i % OFFS.length]}px)` }}>
                  {cur && <div className="lp-bubble">BẮT ĐẦU</div>}
                  <button className={'lp-btn ' + m.group + (done ? ' done' : '') + (cur ? ' cur' : '')} onClick={() => go(m.id)} aria-label={m.name}>
                    <span>{done ? '✓' : m.icon}</span>
                  </button>
                  <b>{m.name}</b>
                </div>
              </React.Fragment>
            );
          })}
          <div className="lp-sep"><span className="badge talk">Nói</span></div>
          <div className="lp-node"><button className="lp-btn talk" onClick={() => go('speak')} aria-label="Nói chuyện với AI"><span>🎙️</span></button><b>Nói chuyện với AI</b></div>
        </div>
      </div>

      <aside className="home-side">
        <div className="card side-card">
          <div className="sc-head"><h3>🎯 Mục tiêu hôm nay</h3><span className="note">{d.xpToday}/{d.goal} XP</span></div>
          <div className="progress big"><i style={{ width: pct + '%' }} /></div>
          <p className="note">{pct >= 100 ? '🎉 Đã đạt mục tiêu hôm nay!' : `Còn ${d.goal - d.xpToday} XP nữa. Mỗi từ đúng được 1 XP, xong một bài được thêm 5 XP.`}</p>
          <div className="goalpick">{GOALS.map(([g, l]) => <button key={g} className={d.goal === g ? 'on' : ''} onClick={() => setGoal(g)}><b>{g}</b><small>{l}</small></button>)}</div>
        </div>

        <div className="card side-card">
          <div className="sc-head"><h3>🔥 {d.streak} ngày liên tiếp</h3></div>
          <div className="week">{d.week.map((x, i) => <div key={i} className={(x.on ? 'on' : '') + (x.today ? ' today' : '')}><i>{x.on ? '🔥' : ''}</i><small>{x.d}</small></div>)}</div>
          <p className="note">{d.playedToday ? 'Hôm nay bạn đã học rồi, giữ chuỗi ngày mai nhé!' : 'Học ít nhất 1 bài hôm nay để giữ chuỗi.'}</p>
        </div>

        {review > 0 && (
          <div className="card side-card review-card">
            <h3>🔁 Ôn lỗi sai</h3>
            <p className="note">Có <b>{review}</b> từ bạn hay sai.</p>
            <button className="btn block" onClick={() => go('flash')}>Ôn ngay</button>
          </div>
        )}
        {info.cloudEnabled && !info.user && played && (
          <div className="card side-card"><p className="note">Đăng nhập để lưu tiến độ và học trên máy khác.</p><button className="btn ghost block" onClick={() => setAuthOpen(true)}>Đăng nhập</button></div>
        )}

        <div className="card side-card">
          <h3>📈 Tổng kết</h3>
          <div className="mini-stats">
            <div><b>⚡ {d.totalXp}</b><small>Tổng XP</small></div>
            <div><b>📗 {mastered}</b><small>Từ đã thuộc</small></div>
            <div><b>🎯 {d.acc ? d.acc + '%' : '–'}</b><small>Chính xác</small></div>
            <div><b>📝 {d.wordsToday}</b><small>Từ hôm nay</small></div>
          </div>
          <div className="bars" role="img" aria-label="XP mỗi ngày trong 14 ngày">
            {d.days.map(x => <div key={x.label} title={`${x.label}: ${x.xp} XP`}><i style={{ height: (x.xp * 100 / max) + '%' }} /><small>{x.label.split('/')[0]}</small></div>)}
          </div>
        </div>
      </aside>
    </div>
  );
}
