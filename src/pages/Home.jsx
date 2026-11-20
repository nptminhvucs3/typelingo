import React from 'react';
import { useApp } from '../ctx.js';
import { state } from '../lib/store.js';
import { P, needReview, LANGS } from '../lib/words.js';
import { modeById } from '../modes.js';
import { useCloud } from '../lib/hooks.js';

// Lộ trình mỗi ngày: dễ → vừa → khó
const PATH = ['flash', 'match', 'quiz'];

const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function statsData() {
  const byDay = new Map();
  for (const s of state.history) { const k = dayKey(s.at); byDay.set(k, (byDay.get(k) || 0) + (s.words || 0)); }
  let streak = 0; const d = new Date(); if (!byDay.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (byDay.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const days = [];
  for (let i = 13; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); days.push({ label: x.getDate() + '/' + (x.getMonth() + 1), words: byDay.get(dayKey(x)) || 0 }); }
  const last = state.history.slice(-20);
  const todayModes = new Set(state.history.filter(s => dayKey(s.at) === dayKey(Date.now())).map(s => s.mode));
  return { streak, days, todayModes, today: byDay.get(dayKey(new Date())) || 0, acc: last.length ? Math.round(last.reduce((a, s) => a + (s.accuracy || 0), 0) / last.length) : 0 };
}

export default function Home() {
  const { all, lang, go, setAuthOpen } = useApp();
  const info = useCloud();
  const d = statsData();
  const mastered = all.filter(w => P(w.id)?.box >= 3).length;
  const review = all.filter(needReview).length;
  const max = Math.max(5, ...d.days.map(x => x.words));
  const played = state.history.length > 0;
  const steps = PATH.map(modeById);
  const nextStep = steps.find(m => !d.todayModes.has(m.id));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Chào {info.user ? (info.user.email || '').split('@')[0] : 'bạn'} 👋</h1>
        <p>Đang học {LANGS[lang].name} · {all.length} từ trong kho</p>
      </div>

      <section className="card path">
        <div className="path-head">
          <div>
            <h3>{played ? 'Bài học hôm nay' : 'Chưa biết bắt đầu từ đâu? Làm theo 3 bước này'}</h3>
            <p className="note">Mỗi bước khoảng 3 phút. Bắt đầu bằng bài dễ, chỉ cần bấm chọn.</p>
          </div>
          {nextStep
            ? <button className="btn big" onClick={() => go(nextStep.id)}>▶ {played ? 'Học tiếp' : 'Bắt đầu'}</button>
            : <span className="donebadge">🎉 Xong hôm nay</span>}
        </div>
        <div className="steps3">
          {steps.map((m, i) => {
            const done = d.todayModes.has(m.id), cur = m === nextStep;
            return (
              <button key={m.id} className={'step' + (done ? ' done' : '') + (cur ? ' cur' : '')} onClick={() => go(m.id)}>
                <span className="num">{done ? '✓' : i + 1}</span>
                <span className="sicon">{m.icon}</span>
                <b>{m.name}</b>
                <small>{m.desc}</small>
              </button>
            );
          })}
        </div>
      </section>

      {review > 0 && <div className="card nudge"><span>🔁 Bạn có <b>{review}</b> từ hay sai. Ôn lại bằng thẻ chọn nghĩa.</span><button className="btn small" onClick={() => go('flash')}>Ôn ngay</button></div>}
      {info.cloudEnabled && !info.user && played && (
        <div className="card nudge"><span>Đăng nhập để lưu tiến độ và học tiếp trên máy khác.</span><button className="btn small ghost" onClick={() => setAuthOpen(true)}>Đăng nhập</button></div>
      )}

      <div className="stats">
        {[['🔥 ' + d.streak, 'ngày liên tiếp'], [d.today, 'từ hôm nay'], [mastered, 'từ đã thuộc'], [d.acc ? d.acc + '%' : '–', 'độ chính xác']].map(([a, b]) => (
          <div key={b} className="stat"><b>{a}</b><span>{b}</span></div>
        ))}
      </div>
      <div className="card">
        <h3>Số từ mỗi ngày (14 ngày)</h3>
        <div className="bars" role="img" aria-label="Số từ học mỗi ngày trong 14 ngày">
          {d.days.map(x => <div key={x.label} title={`${x.label}: ${x.words} từ`}><i style={{ height: (x.words * 100 / max) + '%' }} /><small>{x.label.split('/')[0]}</small></div>)}
        </div>
      </div>
      <div className="row center"><button className="btn ghost" onClick={() => go('learn')}>📚 Xem tất cả bài học</button></div>
    </div>
  );
}
