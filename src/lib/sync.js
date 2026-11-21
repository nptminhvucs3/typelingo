// Supabase: đăng nhập + đồng bộ. Nếu chưa cấu hình khoá thì app chạy hoàn toàn offline (chế độ khách).
import { createClient } from '@supabase/supabase-js';
import { settings, state, replaceAll, wipeLocalUserData, setUid, savePending, mergeHistory, ls, onChange } from './store.js';
import { mergeProgress, diffToPush, mergeCustom, mergeSettings } from './merge.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudEnabled = !!(URL && KEY);
// PKCE: Supabase trả về ?code=… (query) thay vì #access_token=… để không đè lên định tuyến hash (#/fall…)
export const sb = cloudEnabled ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }) : null;

let user = null, status = 'guest', timer = null, running = false, rerun = false;
let lastSync = ls.get('tl_last_sync', 0), recovery = false, notice = null;
// Nhà cung cấp đăng nhập đang bật trên máy chủ (vd Google). null = chưa biết → vẫn hiện nút
let providers = ls.get('tl_auth_providers', null);
const subs = new Set();
export const onStatus = fn => { subs.add(fn); fn(getInfo()); return () => subs.delete(fn); };
export const getInfo = () => ({ user, status, cloudEnabled, lastSync, recovery, notice, googleEnabled: providers ? !!providers.google : true });
const emitInfo = () => subs.forEach(f => f(getInfo()));
function setStatus(s) { status = s; emitInfo(); }
export function clearNotice() { notice = null; emitInfo(); }

// Địa chỉ quay về sau khi bấm link email / đăng nhập Google: trang hiện tại, bỏ query và hash
const backUrl = () => location.origin + location.pathname;
// Đọc lỗi Supabase gắn trên URL (link hết hạn, mở link trên trình duyệt khác…) rồi dọn URL
function readUrlResult() {
  const q = new URLSearchParams(location.search);
  const h = new URLSearchParams(location.hash.replace(/^#\/?/, '').includes('=') ? location.hash.slice(1) : '');
  const err = q.get('error_description') || h.get('error_description');
  const had = q.has('code') || q.has('error') || h.has('error') || h.has('access_token');
  if (had) history.replaceState(history.state, '', backUrl() + (h.has('error') || h.has('access_token') ? '' : location.hash));
  return { err, had };
}

let inited = false, ready = false;
export async function initAuth(afterLogin) {
  if (!cloudEnabled) { setStatus('guest'); return; }
  if (inited) return; inited = true;
  fetch(URL + '/auth/v1/settings', { headers: { apikey: KEY } }).then(r => r.ok ? r.json() : null)
    .then(d => { if (d?.external) { providers = d.external; ls.set('tl_auth_providers', providers); emitInfo(); } }).catch(() => {});
  // Đăng ký sớm để bắt được PASSWORD_RECOVERY (phát ra lúc Supabase đổi ?code= từ link đặt lại mật khẩu)
  sb.auth.onAuthStateChange((ev, session) => {
    // Không gọi Supabase trực tiếp trong callback này (supabase-js có thể bị treo) → đẩy sang lượt sau
    setTimeout(() => onAuthEvent(ev, session, afterLogin), 0);
  });
  const init = await sb.auth.initialize(); // xử lý ?code= trên URL (nếu có)
  const { data } = await sb.auth.getSession();
  const url = readUrlResult();
  const em = (init?.error && init.error.message) || url.err || '';
  if (em && url.had) {
    // Link xác nhận email mở ở trình duyệt khác: email vẫn đã được xác nhận, chỉ chưa đăng nhập được
    notice = /code verifier|both auth code/i.test(em)
      ? { t: 'Email đã được xác nhận. Hãy đăng nhập bằng email và mật khẩu.', ok: true }
      : { t: 'Link không dùng được (có thể đã hết hạn hoặc đã dùng). Hãy thử lại.', err: true };
  }
  user = data.session?.user || null;
  ready = true;
  setStatus(user ? 'syncing' : 'guest');
  if (user) await afterAuth(afterLogin);
}
async function onAuthEvent(ev, session, afterLogin) {
  if (ev === 'PASSWORD_RECOVERY') { recovery = true; emitInfo(); }
  if (!ready) return; // initAuth tự xử lý phiên ban đầu
  const u = session?.user || null;
  if (u?.id === user?.id) { if (u) { user = u; emitInfo(); } return; } // làm mới token, đổi tên…
  if (!u) { // đăng xuất (có thể từ tab khác)
    user = null; localSignOut(); setStatus('guest'); if (afterLogin) afterLogin();
    return;
  }
  user = u;
  setStatus('syncing');
  await afterAuth(afterLogin);
}
async function afterAuth(afterLogin) {
  // Đổi tài khoản trên cùng máy: không trộn dữ liệu của người khác
  if (state.uid && state.uid !== user.id) wipeLocalUserData();
  setUid(user.id);
  await syncNow();
  if (afterLogin) afterLogin();
}

export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: backUrl() } });
  if (error) throw error;
  // Email đã đăng ký: Supabase không báo lỗi mà trả user không có identities
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('already registered');
  return data; // nếu bật xác nhận email thì chưa có session
}
export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signInGoogle() {
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: backUrl() } });
  if (error) throw error;
}
export async function resetPassword(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: backUrl() });
  if (error) throw error;
}
export async function updatePassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw error;
  recovery = false; emitInfo();
}
export async function updateName(name) {
  const { data, error } = await sb.auth.updateUser({ data: { full_name: name } });
  if (error) throw error;
  user = data.user; emitInfo();
  sb.from('profiles').update({ display_name: name }).eq('id', user.id).then(() => {}, () => {});
}
export const displayName = u => (u ? (u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'Tài khoản').split('@')[0] : 'Khách');

// Xoá dữ liệu cá nhân khỏi máy (cài đặt giao diện, key Gemini, giọng đọc vẫn giữ)
function localSignOut() {
  clearTimeout(timer);
  wipeLocalUserData(); setUid(null);
  lastSync = 0; ls.del('tl_last_sync'); recovery = false;
}
// Đăng xuất: đẩy nốt phần chưa đồng bộ rồi mới xoá dữ liệu trên máy
export async function signOut() {
  if (user) await syncNow();
  const unsynced = status === 'error' || status === 'offline';
  await sb.auth.signOut().catch(() => sb.auth.signOut({ scope: 'local' }));
  user = null; localSignOut(); setStatus('guest');
  return { unsynced };
}

// ---- Đồng bộ ----
async function fetchAll(table, cols, uid) {
  const out = []; let from = 0;
  for (;;) {
    const { data, error } = await sb.from(table).select(cols).eq('user_id', uid).range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}
export async function syncNow() {
  if (!cloudEnabled || !user) return;
  if (running) { rerun = true; return; }
  running = true; setStatus('syncing');
  try {
    const uid = user.id;
    const [pr, uw, st] = await Promise.all([
      fetchAll('progress', 'word_id,box,ok,miss,fav,ts', uid),
      fetchAll('user_words', 'en,pos,vi,topic,ts,deleted', uid),
      sb.from('settings').select('data,ts').eq('user_id', uid).maybeSingle(),
    ]);
    if (st.error) throw st.error;
    const remoteProg = {};
    for (const r of pr) remoteProg[r.word_id] = { box: r.box, ok: r.ok, miss: r.miss, fav: !!r.fav, ts: Number(r.ts) };
    const mergedProg = mergeProgress(state.prog, remoteProg);
    const mergedCustom = mergeCustomKeepTombstone(state.custom, uw.map(r => ({ ...r, ts: Number(r.ts) })));
    const remoteSet = st.data ? { ...st.data.data, ts: Number(st.data.ts) } : null;
    const mergedSet = mergeSettings(settings, remoteSet);
    replaceAll({ prog: mergedProg, custom: mergedCustom, newSettings: mergedSet });

    // đẩy phần mới hơn lên
    const ids = diffToPush(mergedProg, remoteProg);
    for (let i = 0; i < ids.length; i += 500) {
      const rows = ids.slice(i, i + 500).map(id => { const p = mergedProg[id]; return { user_id: uid, word_id: id, box: p.box | 0, ok: p.ok | 0, miss: p.miss | 0, fav: !!p.fav, ts: p.ts || Date.now() }; });
      const { error } = await sb.from('progress').upsert(rows, { onConflict: 'user_id,word_id' });
      if (error) throw error;
    }
    const remoteCustomMap = new Map(uw.map(r => [r.en + '|' + r.pos, Number(r.ts)]));
    const customRows = mergedCustom.filter(w => (w.ts || 0) > (remoteCustomMap.get(w.en + '|' + w.pos) ?? -1))
      .map(w => ({ user_id: uid, en: w.en, pos: w.pos, vi: w.vi, topic: w.topic || 'Từ của tôi', ts: w.ts || Date.now(), deleted: !!w.deleted }));
    if (customRows.length) { const { error } = await sb.from('user_words').upsert(customRows, { onConflict: 'user_id,en,pos' }); if (error) throw error; }
    if (!remoteSet || (settings.ts || 0) > (remoteSet.ts || 0)) {
      const { error } = await sb.from('settings').upsert({ user_id: uid, data: stripTs(settings), ts: settings.ts || Date.now() });
      if (error) throw error;
    }
    if (state.pending.length) {
      const batch = state.pending.slice();
      const rows = batch.map(s => ({ user_id: uid, played_at: new Date(s.at).toISOString(), score: s.score | 0, wpm: s.wpm | 0, accuracy: s.accuracy | 0, words_done: s.words | 0, topic: s.topic, mode: s.mode || null, xp: s.xp ?? null }));
      let { error } = await sb.from('sessions').insert(rows);
      // CSDL cũ chưa có cột mode/xp (chưa chạy lại schema.sql): vẫn đẩy được phần còn lại
      if (error && /mode|xp|column/i.test(error.message || '')) ({ error } = await sb.from('sessions').insert(rows.map(({ mode, xp, ...r }) => r)));
      if (error) throw error;
      state.pending = state.pending.slice(batch.length); savePending();
    }
    const hs = await sb.from('sessions').select('*').eq('user_id', uid).order('played_at', { ascending: false }).limit(500);
    if (hs.error) throw hs.error;
    mergeHistory(hs.data || []);
    lastSync = Date.now(); ls.set('tl_last_sync', lastSync);
    setStatus('synced');
  } catch (e) {
    console.warn('sync lỗi', e);
    setStatus(navigator.onLine ? 'error' : 'offline');
  } finally {
    running = false;
    if (rerun) { rerun = false; syncSoon(500); }
  }
}
const stripTs = s => { const c = { ...s }; delete c.ts; delete c.geminiKey; delete c.voices; return c; };
// Giữ "bia mộ" (deleted) để xoá từ lan sang máy khác
function mergeCustomKeepTombstone(local, remote) {
  const map = new Map();
  for (const w of [...remote, ...local]) {
    const k = (w.en || '').toLowerCase() + '|' + w.pos, cur = map.get(k);
    if (!cur || (w.ts || 0) >= (cur.ts || 0)) map.set(k, w);
  }
  return [...map.values()];
}
export function syncSoon(ms = 3000) { if (!cloudEnabled || !user) return; clearTimeout(timer); timer = setTimeout(syncNow, ms); }
onChange(() => syncSoon());
window.addEventListener('online', () => syncSoon(500));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncSoon(100); });

// ---- Kho từ chung trên máy chủ (có cache) ----
export async function fetchRemoteWords() {
  if (!cloudEnabled) return null;
  const out = []; let from = 0;
  for (;;) {
    const { data, error } = await sb.from('words').select('en,pos,vi,topic,ipa,example,example_vi').eq('active', true).order('id').range(from, from + 999);
    if (error) return null;
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (!out.length) return null;
  const rows = out.map(r => [r.en, r.pos, r.vi, r.topic, r.ipa || '', r.example || '', r.example_vi || '']);
  ls.set('tl_words_cache', rows);
  return rows;
}
export const cachedWords = () => ls.get('tl_words_cache', null);
