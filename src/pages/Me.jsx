// Trang "Tôi": tài khoản, ngôn ngữ học, sáng/tối, thống kê nhanh, đường dẫn sang Cài đặt.
// Trên điện thoại header không còn nút EN/DE và sáng/tối nên chúng nằm ở đây.
import React from 'react';
import Icon from '../components/Icon.jsx';
import { useApp } from '../ctx.js';
import { LANGS, P } from '../lib/words.js';
import { useCloud } from '../lib/hooks.js';
import { statsData } from '../lib/stats.js';
import * as cloud from '../lib/sync.js';
import Mascot from '../components/Mascot.jsx';

export default function Me() {
  const { lang, setLang, theme, toggleTheme, go, setAuthOpen, all, refresh } = useApp();
  const info = useCloud();
  const d = statsData();
  const name = info.user ? (info.user.user_metadata?.full_name || info.user.email || 'Tài khoản').split('@')[0] : 'Khách';
  const mastered = all.filter(w => P(w.id)?.box >= 3).length;

  return (
    <div className="page narrow">
      <section className="card me-head">
        <span className="avatar big">{name[0].toUpperCase()}</span>
        <div className="grow">
          <h2>{name}</h2>
          <p className="note">{info.user ? info.user.email : info.cloudEnabled ? 'Đang dùng chế độ khách, tiến độ chỉ lưu trên máy này.' : 'Chế độ khách (chưa cấu hình đăng nhập), tiến độ lưu trên máy này.'}</p>
        </div>
        <Mascot mood="wave" size={84} />
      </section>
      {info.cloudEnabled && (
        <div className="row wrap me-acct">
          {info.user
            ? <><button className="btn ghost" onClick={async () => { await cloud.syncNow(); refresh(); }}>🔄 Đồng bộ ngay</button><button className="btn ghost" onClick={async () => { await cloud.signOut(); refresh(); }}>Đăng xuất</button></>
            : <button className="btn" onClick={() => setAuthOpen(true)}>Đăng nhập / Tạo tài khoản</button>}
        </div>
      )}

      <div className="mini-stats me-stats">
        <div className="butter"><b><Icon name={d.playedToday ? 'streak' : 'streak-off'} size={22} /> {d.streak}</b><small>ngày liên tiếp</small></div>
        <div className="butter"><b><Icon name="xp" size={22} /> {d.totalXp}</b><small>tổng XP</small></div>
        <div className="mint"><b><Icon name="tu-da-thuoc" size={22} /> {mastered}</b><small>từ đã thuộc</small></div>
        <div className="sky"><b><Icon name="chinh-xac" size={22} /> {d.acc ? d.acc + '%' : '–'}</b><small>chính xác</small></div>
      </div>

      <section className="card">
        <h3>Ngôn ngữ đang học</h3>
        <div className="choice2">
          {Object.values(LANGS).map(l => (
            <button key={l.code} className={'pick-card' + (lang === l.code ? ' on' : '')} onClick={() => setLang(l.code)}>
              <b>{l.flag}</b><span>{l.name}</span>
            </button>
          ))}
        </div>
        <h3>Giao diện</h3>
        <div className="choice2">
          <button className={'pick-card' + (theme !== 'dark' ? ' on' : '')} onClick={() => theme === 'dark' && toggleTheme()}><Icon name="theme-light" size={36} /><span>Sáng</span></button>
          <button className={'pick-card' + (theme === 'dark' ? ' on' : '')} onClick={() => theme !== 'dark' && toggleTheme()}><Icon name="theme-dark" size={36} /><span>Tối</span></button>
        </div>
      </section>

      <button className="btn ghost block" onClick={() => go('settings')}><Icon name="cai-dat" size={24} /> Cài đặt khác (giọng đọc, Gemini, bộ gõ, dữ liệu)</button>
    </div>
  );
}
