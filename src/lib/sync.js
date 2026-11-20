// Supabase: đăng nhập + đồng bộ. Nếu chưa cấu hình khoá thì app chạy hoàn toàn offline (chế độ khách).
import { createClient } from '@supabase/supabase-js';
import { settings, state, replaceAll, wipeLocalUserData, setUid, savePending, mergeHistory, ls, onChange } from './store.js';
import { mergeProgress, diffToPush, mergeCustom, mergeSettings } from './merge.js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudEnabled = !!(URL && KEY);
export const sb = cloudEnabled ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

let user = null, status = 'guest', timer = null, running = false, rerun = false;
const subs = new Set();
export const onStatus = fn => { subs.add(fn); fn(getInfo()); return () => subs.delete(fn); };
export const getInfo = () => ({ user, status, cloudEnabled });
function setStatus(s) { status = s; subs.forEach(f => f(getInfo())); }

export async function initAuth(afterLogin) {
  if (!cloudEnabled) { setStatus('guest'); return; }
  const { data } = await sb.auth.getSession();
  user = data.session?.user || null;
  setStatus(user ? 'synced' : 'guest');
  if (user) await afterAuth(afterLogin);
  sb.auth.onAuthStateChange(async (ev, session) => {
    const u = session?.user || null;
    if (u?.id === user?.id) return;
    user = u;
    setStatus(user ? 'syncing' : 'guest');
    if (user) await afterAuth(afterLogin);
  });
}
async function afterAuth(afterLogin) {
  // Đổi tài khoản trên cùng máy: không trộn dữ liệu của người khác
  if (state.uid && state.uid !== user.id) wipeLocalUserData();
  setUid(user.id);
  await syncNow();
  if (afterLogin) afterLogin();
}

export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data; // nếu bật xác nhận email thì chưa có session
}
export async function signIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signInGoogle() {
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  if (error) throw error;
}
export async function signOut() { await sb.auth.signOut(); user = null; setUid(null); setStatus('guest'); }

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
      const { error } = await sb.from('sessions').insert(batch.map(s => ({ user_id: uid, played_at: new Date(s.at).toISOString(), score: s.score, wpm: s.wpm, accuracy: s.accuracy, words_done: s.words, topic: s.topic })));
      if (error) throw error;
      state.pending = state.pending.slice(batch.length); savePending();
    }
    const hs = await sb.from('sessions').select('played_at,score,wpm,accuracy,words_done,topic').eq('user_id', uid).order('played_at', { ascending: false }).limit(500);
    if (hs.error) throw hs.error;
    mergeHistory(hs.data || []);
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
