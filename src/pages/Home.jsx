// Trang chủ: lộ trình bài học (nút tròn zíc-zắc nối bằng đường cong), cột phải là mục tiêu ngày,
// chuỗi ngày, ôn lỗi, tổng kết. Trên điện thoại cột phải thành dải thẻ cuộn ngang phía trên lộ trình.
import React, { useLayoutEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { useApp } from '../ctx.js';
import { state, settings, saveSettings } from '../lib/store.js';
import { P, needReview, LANGS } from '../lib/words.js';
import { modeById, groupOf } from '../modes.js';
import { useCloud } from '../lib/hooks.js';
import { statsData } from '../lib/stats.js';
import Mascot from '../components/Mascot.jsx';

// Lộ trình mỗi ngày (dễ → khó), cuối cùng là Nói
const PATH = ['flash', 'match', 'quiz', 'listen', 'cloze', 'fallchoice', 'fall1', 'speak'];
const OFFS = [0, 70, 105, 70, 0, -70, -105, -70]; // độ lệch ngang tạo hình zíc-zắc
const GOALS = [[10, 'Nhẹ nhàng'], [20, 'Vừa phải'], [30, 'Nghiêm túc'], [50, 'Chăm chỉ']];

// Vẽ đường cong nối tâm các nút (đo vị trí thật sau khi hiển thị)
function usePathLines(ref, deps) {
  const [lines, setLines] = useState({ w: 0, h: 0, segs: [] });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const pts = [...el.querySelectorAll('.lp-btn')].map(b => {
        const r = b.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, done: b.classList.contains('done') };
      });
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], my = (a.y + b.y) / 2;
        segs.push({ d: `M${a.x} ${a.y} C${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`, done: a.done && b.done });
      }
      setLines({ w: box.width, h: box.height, segs });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line
  return lines;
}

export default function Home() {
  const { all, lang, go, setAuthOpen, refresh } = useApp();
  const info = useCloud();
  const d = statsData();
  const mastered = all.filter(w => P(w.id)?.box >= 3).length;
  const review = all.filter(needReview).length;
  const played = state.history.length > 0;
  const steps = PATH.map(modeById);
  const nextIdx = steps.findIndex(m => !d.todayModes.has(m.id));
  const pct = Math.min(100, Math.round(d.xpToday * 100 / d.goal));
  const max = Math.max(10, ...d.days.map(x => x.xp));
  const setGoal = g => { settings.dailyGoal = g; saveSettings(); refresh(); };
  const pathRef = useRef(null);
  const lines = usePathLines(pathRef, [nextIdx, d.todayModes.size]);

  return (
    <div className="page home">
      <div className="home-main">
        <div className="unit">
          <div>
            <small>{LANGS[lang].name} · {all.length} từ</small>
            <h2>{played ? 'Bài học hôm nay' : 'Bắt đầu từ đây 👇'}</h2>
            <p>{played ? 'Đi lần lượt từ trên xuống, bài trên dễ hơn bài dưới.' : 'Bấm nút nhấp nháy. Bài đầu chỉ cần bấm chọn nghĩa, không phải gõ.'}</p>
          </div>
          <button className="btn white unit-btn" onClick={() => go('learn')}><Icon name="tat-ca-bai-hoc" size={26} /> Tất cả bài</button>
        </div>

        <div className="lpath" ref={pathRef}>
          <svg className="lp-lines" width={lines.w} height={lines.h} aria-hidden="true">
            {lines.segs.map((s, i) => <path key={i} d={s.d} className={s.done ? 'done' : ''} />)}
          </svg>
          {steps.map((m, i) => {
            const done = d.todayModes.has(m.id), cur = i === nextIdx, locked = !done && nextIdx >= 0 && i > nextIdx;
            const g = groupOf(m.group), off = OFFS[i % OFFS.length];
            const showHead = i === 0 || steps[i - 1].group !== m.group;
            return (
              <React.Fragment key={m.id}>
                {showHead && <div className="lp-sep"><span className={'badge ' + m.group}>{g.name}</span></div>}
                <div className={'lp-node' + (cur ? ' is-cur' : '')} style={{ '--off': off + 'px' }}>
                  {cur && <div className="lp-bubble">BẮT ĐẦU</div>}
                  {cur && <Mascot mood="idle" size={100} className={'lp-mascot ' + (off > 0 ? 'left' : 'right')} />}
                  <button className={'lp-btn ' + m.group + (done ? ' done' : '') + (cur ? ' cur' : '') + (locked ? ' locked' : '')}
                    onClick={() => go(m.id)} aria-label={m.name + (done ? ' (đã xong hôm nay)' : locked ? ' (chưa tới lượt, vẫn có thể chơi)' : '')}>
                    <Icon name={m.ico} size={44} className="lp-ico" />{done && <Icon name="hoan-thanh" size={30} className="lp-done" />}
                    {locked && <em className="lock"><Icon name="khoa" size={20} /></em>}
                  </button>
                  <b>{m.name}</b>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <aside className="home-side">
        <div className="card side-card goal-card">
          <div className="sc-head"><h3 className="il"><Icon name={pct >= 100 ? 'dat-muc-tieu' : 'muc-tieu'} size={26} /> Mục tiêu hôm nay</h3><span className="sc-num">{d.xpToday}/{d.goal} XP</span></div>
          <div className="progress big butter"><i style={{ width: Math.max(pct, 3) + '%' }} /></div>
          <p className="note">{pct >= 100 ? 'Đã đạt mục tiêu hôm nay, giỏi lắm!' : `Còn ${d.goal - d.xpToday} XP. Mỗi từ đúng +1 XP, xong một bài +5 XP.`}</p>
          <div className="goalpick">{GOALS.map(([g, l]) => <button key={g} className={d.goal === g ? 'on' : ''} onClick={() => setGoal(g)}><b>{g}</b><small>{l}</small></button>)}</div>
        </div>

        <div className="card side-card">
          <div className="sc-head"><h3 className="il"><Icon name={d.playedToday ? 'streak' : 'streak-off'} size={26} /> {d.streak} ngày liên tiếp</h3><Mascot mood={d.streak ? 'streak' : played ? 'lost-streak' : 'sleeping'} size={56} /></div>
          <div className="week">{d.week.map((x, i) => <div key={i} className={(x.on ? 'on' : '') + (x.today ? ' today' : '')}><i>{x.on && <Icon name="streak" size={22} />}</i><small>{x.d}</small></div>)}</div>
          <p className="note">{d.playedToday ? 'Hôm nay bạn đã học rồi, mai nhớ giữ chuỗi nhé!' : 'Học ít nhất 1 bài hôm nay để giữ chuỗi.'}</p>
        </div>

        {review > 0 && (
          <div className="card side-card review-card">
            <h3 className="il"><Icon name="on-loi-sai" size={26} /> Ôn lỗi sai</h3>
            <p className="note">Có <b>{review}</b> từ bạn hay sai.</p>
            <button className="btn block" onClick={() => go('flash')}>Ôn ngay</button>
          </div>
        )}
        {info.cloudEnabled && !info.user && played && (
          <div className="card side-card"><h3>Lưu tiến độ</h3><p className="note">Đăng nhập để học tiếp trên máy khác.</p><button className="btn ghost block" onClick={() => setAuthOpen(true)}>Đăng nhập</button></div>
        )}

        <div className="card side-card sum-card">
          <h3 className="il"><Icon name="tong-ket" size={26} /> Tổng kết</h3>
          <div className="mini-stats">
            <div className="butter"><b><Icon name="xp" size={22} /> {d.totalXp}</b><small>Tổng XP</small></div>
            <div className="mint"><b><Icon name="tu-da-thuoc" size={22} /> {mastered}</b><small>Từ đã thuộc</small></div>
            <div className="sky"><b><Icon name="chinh-xac" size={22} /> {d.acc ? d.acc + '%' : '–'}</b><small>Chính xác</small></div>
            <div className="peach"><b><Icon name="tu-hom-nay" size={22} /> {d.wordsToday}</b><small>Từ hôm nay</small></div>
          </div>
          <p className="note il"><Icon name="lich" size={20} /> XP 14 ngày gần đây</p>
          <div className="bars" role="img" aria-label="XP mỗi ngày trong 14 ngày">
            {d.days.map(x => <div key={x.label} title={`${x.label}: ${x.xp} XP`}><i style={{ height: (x.xp * 100 / max) + '%' }} /><small>{x.label.split('/')[0]}</small></div>)}
          </div>
        </div>
      </aside>
    </div>
  );
}
