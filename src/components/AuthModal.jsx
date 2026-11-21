import React, { useEffect, useState } from 'react';
import * as cloud from '../lib/sync.js';
import { useApp } from '../ctx.js';

const viErr = e => {
  const m = (e && e.message) || String(e);
  if (/Invalid login/i.test(m)) return 'Sai email hoặc mật khẩu.';
  if (/already registered|already been registered/i.test(m)) return 'Email này đã đăng ký, hãy đăng nhập.';
  if (/not confirmed/i.test(m)) return 'Bạn cần bấm link xác nhận trong email trước.';
  if (/at least 6|password should/i.test(m)) return 'Mật khẩu cần tối thiểu 6 ký tự.';
  if (/different from the old|same password/i.test(m)) return 'Mật khẩu mới phải khác mật khẩu cũ.';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Thử quá nhiều lần, hãy đợi một lúc.';
  if (/provider is not enabled|unsupported provider/i.test(m)) return 'Đăng nhập Google chưa được bật trên máy chủ.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  return m;
};

const STATUS = { synced: 'Đã đồng bộ', syncing: 'Đang đồng bộ…', error: 'Lỗi đồng bộ', offline: 'Đang offline', guest: '' };
export const syncText = info => {
  const s = STATUS[info.status] || '';
  if (info.status !== 'synced' || !info.lastSync) return s;
  const d = new Date(info.lastSync), now = new Date();
  const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return s + ' lúc ' + (d.toDateString() === now.toDateString() ? hm : hm + ' ' + d.toLocaleDateString('vi-VN'));
};

// Đăng xuất: dữ liệu đã lưu trên tài khoản, máy này sẽ trở về chế độ khách trống
export async function confirmSignOut(info) {
  const risky = info.status === 'error' || info.status === 'offline';
  const msg = risky
    ? 'Chưa đồng bộ được với máy chủ. Nếu đăng xuất bây giờ, tiến độ mới trên máy này có thể bị mất. Vẫn đăng xuất?'
    : 'Đăng xuất? Tiến độ đã lưu trên tài khoản và sẽ bị xoá khỏi máy này.';
  if (!confirm(msg)) return false;
  await cloud.signOut();
  return true;
}

export default function AuthModal({ info }) {
  const { authOpen, setAuthOpen, refresh } = useApp();
  const [mode, setMode] = useState('in'); // in | up | forgot
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [name, setName] = useState('');
  const [editName, setEditName] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // Thông báo từ link email (đã xác nhận / link hết hạn) hiện một lần trong modal
  useEffect(() => { if (authOpen && info.notice) { setMsg(info.notice); cloud.clearNotice(); } }, [authOpen, info.notice]);
  useEffect(() => { if (!authOpen) { setMsg(null); setPw(''); setPw2(''); setEditName(false); } }, [authOpen]);

  if (!authOpen) return null;
  const close = () => { if (!busy) setAuthOpen(false); };
  const run = async (fn, wait = 'Đang xử lý…') => {
    setBusy(true); setMsg({ t: wait });
    try { await fn(); } catch (err) { setMsg({ t: viErr(err), err: true }); }
    setBusy(false);
  };
  const switchMode = m => { setMode(m); setMsg(null); };

  // Đặt mật khẩu mới sau khi bấm link "quên mật khẩu" trong email
  if (info.recovery && info.user) {
    const submit = e => {
      e.preventDefault();
      if (pw !== pw2) { setMsg({ t: 'Hai mật khẩu chưa khớp.', err: true }); return; }
      run(async () => { await cloud.updatePassword(pw); setMsg({ t: 'Đã đổi mật khẩu.', ok: true }); setTimeout(() => setAuthOpen(false), 1200); });
    };
    return (
      <div className="modal">
        <div className="card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <form onSubmit={submit}>
            <h3 id="auth-title">Đặt mật khẩu mới</h3>
            <p className="note">{info.user.email}</p>
            <input type="password" placeholder="Mật khẩu mới" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoComplete="new-password" autoFocus />
            <input type="password" placeholder="Nhập lại mật khẩu" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={6} autoComplete="new-password" />
            {msg && <p className={'note ' + (msg.err ? 'err' : msg.ok ? 'ok' : '')} role="status">{msg.t}</p>}
            <button className="btn" disabled={busy}>Lưu mật khẩu</button>
          </form>
        </div>
      </div>
    );
  }

  if (info.user) {
    const saveName = e => {
      e.preventDefault();
      const n = name.trim(); if (!n) return;
      run(async () => { await cloud.updateName(n); setEditName(false); setMsg(null); });
    };
    return (
      <div className="modal" onClick={close}>
        <div className="card" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e => e.stopPropagation()}>
          {editName ? (
            <form onSubmit={saveName}>
              <h3 id="auth-title">Tên hiển thị</h3>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={40} required autoFocus />
              <div className="row"><button className="btn" disabled={busy}>Lưu</button><button type="button" className="btn ghost" onClick={() => setEditName(false)}>Huỷ</button></div>
            </form>
          ) : (
            <>
              <h3 id="auth-title">{cloud.displayName(info.user)} <button className="link" onClick={() => { setName(cloud.displayName(info.user)); setEditName(true); }}>đổi tên</button></h3>
              <p className="note">{info.user.email}</p>
              <p className="note">{syncText(info)}</p>
            </>
          )}
          {msg && <p className={'note ' + (msg.err ? 'err' : msg.ok ? 'ok' : '')} role="status">{msg.t}</p>}
          <div className="row">
            <button className="btn" disabled={busy || info.status === 'syncing'} onClick={() => run(async () => { await cloud.syncNow(); refresh(); setMsg(null); }, 'Đang đồng bộ…')}>🔄 Đồng bộ ngay</button>
            <button className="btn ghost" disabled={busy} onClick={async () => { if (await confirmSignOut(info)) { refresh(); setAuthOpen(false); } }}>Đăng xuất</button>
          </div>
        </div>
      </div>
    );
  }

  const submit = e => {
    e.preventDefault();
    const em = email.trim();
    if (mode === 'forgot') return run(async () => { await cloud.resetPassword(em); setMsg({ t: 'Đã gửi email đặt lại mật khẩu. Mở link trong email bằng trình duyệt này.', ok: true }); });
    if (mode === 'up' && pw !== pw2) { setMsg({ t: 'Hai mật khẩu chưa khớp.', err: true }); return; }
    run(async () => {
      if (mode === 'in') { await cloud.signIn(em, pw); setAuthOpen(false); }
      else {
        const d = await cloud.signUp(em, pw);
        if (d.session) setAuthOpen(false);
        else { setMsg({ t: 'Đã gửi email xác nhận tới ' + em + '. Bấm link trong email rồi quay lại đây.', ok: true }); setMode('in'); }
      }
    });
  };
  return (
    <div className="modal" onClick={close}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e => e.stopPropagation()}>
        <form onSubmit={submit}>
          {mode === 'forgot' ? <h3 id="auth-title">Quên mật khẩu</h3> : (
            <div className="tabs" role="tablist">
              <button type="button" id="auth-title" className={mode === 'in' ? 'on' : ''} onClick={() => switchMode('in')}>Đăng nhập</button>
              <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => switchMode('up')}>Tạo tài khoản</button>
            </div>
          )}
          {mode !== 'forgot' && <p className="note">Lưu tiến độ, chuỗi ngày và XP để học tiếp trên máy khác.</p>}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          {mode !== 'forgot' && <input type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={pw} onChange={e => setPw(e.target.value)} required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />}
          {mode === 'up' && <input type="password" placeholder="Nhập lại mật khẩu" value={pw2} onChange={e => setPw2(e.target.value)} required minLength={6} autoComplete="new-password" />}
          {msg && <p className={'note ' + (msg.err ? 'err' : msg.ok ? 'ok' : '')} role="status">{msg.t}</p>}
          <button className="btn" disabled={busy}>{mode === 'in' ? 'Đăng nhập' : mode === 'up' ? 'Đăng ký' : 'Gửi email đặt lại'}</button>
          {mode === 'in' && <button type="button" className="link" onClick={() => switchMode('forgot')}>Quên mật khẩu?</button>}
          {mode === 'forgot'
            ? <button type="button" className="link" onClick={() => switchMode('in')}>← Quay lại đăng nhập</button>
            : info.googleEnabled && <button type="button" className="btn ghost" disabled={busy} onClick={() => run(cloud.signInGoogle, 'Đang chuyển tới Google…')}>Đăng nhập bằng Google</button>}
          <button type="button" className="link" onClick={close}>Tiếp tục với tư cách khách</button>
          <p className="note center">Khi đăng nhập, bạn đồng ý với <a href="privacy.html" target="_blank" rel="noopener">chính sách quyền riêng tư</a>.</p>
        </form>
      </div>
    </div>
  );
}
