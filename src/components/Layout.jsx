import React, { useState } from 'react';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import { useApp } from '../ctx.js';
import { MODES, GROUPS } from '../modes.js';
import { LANGS } from '../lib/words.js';
import { useCloud } from '../lib/hooks.js';
import AuthModal from './AuthModal.jsx';
import { statsData } from '../lib/stats.js';
import PiperToast from './PiperToast.jsx';

// Thanh tab dưới (điện thoại)
const TABS = [['home', 'tong-quan', 'Tổng quan'], ['learn', 'tat-ca-bai-hoc', 'Học'], ['listen', 'nghe-roi-go', 'Nghe'], ['speak', 'noi-chuyen-ai', 'Nói'], ['me', 'toi', 'Tôi']];

export default function Layout({ children }) {
  const { lang, setLang, route, go, theme, toggleTheme, setAuthOpen, playing } = useApp();
  const [open, setOpen] = useState(false);
  const info = useCloud();
  const nav = r => { go(r); setOpen(false); };
  const name = info.user ? (info.user.user_metadata?.full_name || info.user.email || 'Tài khoản').split('@')[0] : 'Khách';
  const st = statsData();
  const onAcct = () => {
    if (innerWidth <= 900) { nav('me'); return; }
    if (info.cloudEnabled) setAuthOpen(true);
    else nav('me');
  };
  const curMode = MODES.find(m => m.id === route);
  const tabOn = t => t === route || (t === 'learn' && curMode && !['listen', 'speak'].includes(route));

  return (
    <div className={'app' + (playing ? ' is-playing' : '')}>
      <aside className={'side' + (open ? ' open' : '')}>
        <div className="brand" onClick={() => nav('home')} role="link" aria-label="Về trang chủ"><Logo height={46} /></div>
        <nav>
          <a className={'easy' + (route === 'home' ? ' on' : '')} onClick={() => nav('home')}><i><Icon name="tong-quan" /></i><span>Tổng quan</span></a>
          <a className={'easy' + (route === 'learn' ? ' on' : '')} onClick={() => nav('learn')}><i><Icon name="tat-ca-bai-hoc" /></i><span>Tất cả bài học</span></a>
          {GROUPS.map(g => (
            <div key={g.id} className="navgroup">
              <h6><span className={'gdot ' + g.id} />{g.name}</h6>
              {MODES.filter(m => m.group === g.id).map(m => (
                <a key={m.id} className={g.id + (route === m.id ? ' on' : '')} onClick={() => nav(m.id)}><i><Icon name={m.ico} /></i><span>{m.name}</span></a>
              ))}
            </div>
          ))}
          <div className="navgroup">
            <h6>Khác</h6>
            <a className={'talk' + (route === 'me' ? ' on' : '')} onClick={() => nav('me')}><i><Icon name="toi" /></i><span>Tôi</span></a>
            <a className={'talk' + (route === 'settings' ? ' on' : '')} onClick={() => nav('settings')}><i><Icon name="cai-dat" /></i><span>Cài đặt</span></a>
          </div>
        </nav>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="top">
          <button className="icon-btn menu" aria-label="Mở menu" onClick={() => setOpen(o => !o)}>☰</button>
          <span className="top-brand" onClick={() => nav('home')} role="link" aria-label="Về trang chủ"><Logo height={34} className="tb-full" /><Logo variant="icon" height={38} className="tb-icon" /></span>
          <div className="grow" />
          <span className={'hchip fire' + (st.playedToday ? ' on' : '')} title="Số ngày học liên tiếp"><Icon name={st.playedToday ? 'streak' : 'streak-off'} size={22} /> {st.streak}</span>
          <span className={'hchip xp' + (st.xpToday >= st.goal ? ' on' : '')} title={`XP hôm nay / mục tiêu ${st.goal} XP`}><Icon name="xp" size={22} /> {st.xpToday}<small>/{st.goal}</small></span>
          <div className="seg desk-only" role="group" aria-label="Ngôn ngữ học">
            {Object.values(LANGS).map(l => <button key={l.code} className={lang === l.code ? 'on' : ''} onClick={() => setLang(l.code)} title={l.name}>{l.flag}</button>)}
          </div>
          <button className="icon-btn desk-only" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối"><Icon name={theme === 'dark' ? 'theme-light' : 'theme-dark'} size={24} /></button>
          <button className="acct" onClick={onAcct} aria-label="Tài khoản">
            <span className="avatar">{name[0].toUpperCase()}</span><span className="aname">{name}</span>
            {info.user && <i className={'dot ' + info.status} />}
          </button>
        </header>
        <main className="content">{children}</main>
        {!playing && <nav className="tabbar">
          {TABS.map(([r, ic, l]) => <a key={r} className={tabOn(r) ? 'on' : ''} onClick={() => nav(r)}><i><Icon name={ic} size={28} /></i><span>{l}</span></a>)}
        </nav>}
      </div>
      <AuthModal info={info} />
      <PiperToast />
    </div>
  );
}
