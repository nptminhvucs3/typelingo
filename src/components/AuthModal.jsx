import React, { useState } from 'react';
import * as cloud from '../lib/sync.js';
import { useApp } from '../ctx.js';

const viErr = e => {
  const m = (e && e.message) || String(e);
  if (/Invalid login/i.test(m)) return 'Sai email hoặc mật khẩu.';
  if (/already registered/i.test(m)) return 'Email này đã đăng ký, hãy đăng nhập.';
  if (/not confirmed/i.test(m)) return 'Bạn cần bấm link xác nhận trong email trước.';
  if (/at least 6|password should/i.test(m)) return 'Mật khẩu cần tối thiểu 6 ký tự.';
  if (/rate limit|too many/i.test(m)) return 'Thử quá nhiều lần, hãy đợi một lúc.';
  return m;
};

export default function AuthModal({ info }) {
  const { authOpen, setAuthOpen, refresh } = useApp();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!authOpen) return null;
  const close = () => { setAuthOpen(false); setMsg(null); };
  const submit = async e => {
    e.preventDefault(); setBusy(true); setMsg({ t: 'Đang xử lý…' });
    try {
      if (mode === 'in') { await cloud.signIn(email.trim(), pw); close(); }
      else {
        const d = await cloud.signUp(email.trim(), pw);
        if (d.session) close(); else setMsg({ t: 'Đã gửi email xác nhận. Hãy bấm link trong email rồi đăng nhập.', ok: true });
      }
    } catch (err) { setMsg({ t: viErr(err), err: true }); }
    setBusy(false);
  };
  return (
    <div className="modal" onClick={close}>
      <div className="card" onClick={e => e.stopPropagation()}>
        {info.user ? (
          <>
            <h3>{info.user.email}</h3>
            <p className="note">Trạng thái: {({ synced: 'đã đồng bộ', syncing: 'đang đồng bộ…', error: 'lỗi đồng bộ', offline: 'offline' })[info.status]}</p>
            <div className="row">
              <button className="btn" onClick={async () => { await cloud.syncNow(); refresh(); close(); }}>Đồng bộ ngay</button>
              <button className="btn ghost" onClick={async () => { await cloud.signOut(); refresh(); close(); }}>Đăng xuất</button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="tabs">
              <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Đăng nhập</button>
              <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Tạo tài khoản</button>
            </div>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            <input type="password" placeholder="Mật khẩu" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
            {msg && <p className={'note ' + (msg.err ? 'err' : msg.ok ? 'ok' : '')}>{msg.t}</p>}
            <button className="btn" disabled={busy}>{mode === 'in' ? 'Đăng nhập' : 'Đăng ký'}</button>
            <button type="button" className="btn ghost" onClick={async () => { try { await cloud.signInGoogle(); } catch (e) { setMsg({ t: viErr(e), err: true }); } }}>Đăng nhập bằng Google</button>
            <button type="button" className="link" onClick={close}>Tiếp tục với tư cách khách</button>
          </form>
        )}
      </div>
    </div>
  );
}
