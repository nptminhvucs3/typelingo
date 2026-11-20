import React, { useState } from 'react';
import { useApp } from '../ctx.js';
import { MODES, GROUPS } from '../modes.js';
import { LANGS } from '../lib/words.js';
import { useCloud } from '../lib/hooks.js';
import AuthModal from './AuthModal.jsx';
import { statsData } from '../lib/stats.js';
import PiperToast from './PiperToast.jsx';

const TABS = [['home', '🏠', 'Tổng quan'], ['learn', '📚', 'Học'], ['speak', '🎙️', 'Nói'], ['settings', '⚙️', 'Cài đặt']];

export default function Layout({ children }) {
  const { lang, setLang, route, go, theme, toggleTheme, setAuthOpen } = useApp();
  const [open, setOpen] = useState(false);
  const info = useCloud();
  const nav = r => { go(r); setOpen(false); };
  const name = info.user ? (info.user.user_metadata?.full_name || info.user.email || 'Tài khoản').split('@')[0] : 'Khách';
  const onAcct = () => {
    if (info.cloudEnabled) setAuthOpen(true);
    else alert('Chưa cấu hình Supabase nên đang ở chế độ khách (lưu trên máy). Xem README để bật đăng nhập.');
  };
  const st = statsData();
  const inGame = MODES.some(m => m.id === route && m.group !== 'talk');
  const tabOn = t => t === route || (t === 'learn' && inGame);

  return (
    <div className="app">
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="brand" onClick={() => nav('home')}><span className="logo">T</span> TypeLingo</div>
        <nav>
          <a className={route === 'home' ? 'on' : ''} onClick={() => nav('home')}><i>🏠</i><span>Tổng quan</span></a>
          <a className={route === 'learn' ? 'on' : ''} onClick={() => nav('learn')}><i>📚</i><span>Tất cả bài học</span></a>
          {GROUPS.map(g => (
            <div key={g.id} className="navgroup">
              <h6><span className={'gdot ' + g.id} />{g.name}</h6>
              {MODES.filter(m => m.group === g.id).map(m => (
                <a key={m.id} className={route === m.id ? 'on' : ''} onClick={() => nav(m.id)}><i>{m.icon}</i><span>{m.name}</span></a>
              ))}
            </div>
          ))}
          <div className="navgroup">
            <h6>Khác</h6>
            <a className={route === 'settings' ? 'on' : ''} onClick={() => nav('settings')}><i>⚙️</i><span>Cài đặt</span></a>
          </div>
        </nav>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className={'main' + (inGame ? ' ingame' : '')}>
        <header className="top">
          <button className="icon-btn menu" aria-label="Mở menu" onClick={() => setOpen(o => !o)}>☰</button>
          <span className="top-brand" onClick={() => nav('home')}><span className="logo sm">T</span>TypeLingo</span>
          <div className="grow" />
          <span className={'hchip fire' + (st.playedToday ? ' on' : '')} title="Số ngày học liên tiếp">🔥 {st.streak}</span>
          <span className={'hchip xp' + (st.xpToday >= st.goal ? ' on' : '')} title={`XP hôm nay / mục tiêu ${st.goal} XP`}>⚡ {st.xpToday}<small>/{st.goal}</small></span>
          <div className="seg" role="group" aria-label="Ngôn ngữ học">
            {Object.values(LANGS).map(l => <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => setLang(l.code)} title={l.name}>{l.flag}</button>)}
          </div>
          <button className="icon-btn" onClick={toggleTheme} aria-label="Đổi giao diện">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <button className="acct" onClick={onAcct}>
            <span className="avatar">{name[0].toUpperCase()}</span><span className="aname">{name}</span>
            {info.user && <i className={'dot ' + info.status} />}
          </button>
        </header>
        <main className="content">{children}</main>
        {!inGame && <nav className="tabbar">
          {TABS.map(([r, ic, l]) => <a key={r} className={tabOn(r) ? 'on' : ''} onClick={() => nav(r)}><i>{ic}</i><span>{l}</span></a>)}
        </nav>}
      </div>
      <AuthModal info={info} />
      <PiperToast />
    </div>
  );
}
