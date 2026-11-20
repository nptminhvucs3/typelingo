// Màn chuẩn bị chung cho mọi chế độ: hướng dẫn 3 bước + nút "Bắt đầu ngay".
// Chọn chủ đề / loại từ là tùy chọn (thu gọn), lựa chọn được nhớ theo ngôn ngữ.
import React, { useMemo, useState } from 'react';
import { useApp } from '../ctx.js';
import { POS_VI, P, needReview, pickWeighted } from '../lib/words.js';
import { hasKey, ensureSentences } from '../lib/gemini.js';
import { addSession, state, saveBest, ls } from '../lib/store.js';
import { groupOf } from '../modes.js';
import FallGame from '../pages/FallGame.jsx';
import Reverse from '../pages/Reverse.jsx';
import Listen from '../pages/Listen.jsx';
import Cloze from '../pages/Cloze.jsx';
import Flash from '../pages/Flash.jsx';
import Quiz from '../pages/Quiz.jsx';
import Match from '../pages/Match.jsx';
import FallChoice from '../pages/FallChoice.jsx';

const GAMES = { fall: FallGame, reverse: Reverse, listen: Listen, cloze: Cloze, flash: Flash, quiz: Quiz, match: Match, fallchoice: FallChoice };
const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export default function ModeShell({ mode }) {
  const { all, lang } = useApp();
  const key = 'tl_pick_' + lang;
  const saved = ls.get(key, { sel: [], pos: [] });
  const [sel, setSelRaw] = useState(() => new Set(saved.sel));
  const [pos, setPosRaw] = useState(() => new Set(saved.pos));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [play, setPlay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const topics = useMemo(() => [...new Set(all.map(w => w.topic))], [all]);
  const review = all.filter(needReview);
  const favs = all.filter(w => P(w.id)?.fav);
  const persist = (s, p) => ls.set(key, { sel: [...s], pos: [...p] });
  const setSel = s => { setSelRaw(s); persist(s, pos); };
  const setPos = p => { setPosRaw(p); persist(sel, p); };

  const pool = useMemo(() => {
    let p;
    if (sel.has('__review')) p = review;
    else if (sel.has('__fav')) p = favs;
    else p = all.filter(w => !sel.size || sel.has(w.topic));
    if (pos.size) p = p.filter(w => pos.has(w.pos));
    return p;
  }, [all, sel, pos]); // eslint-disable-line
  const label = sel.has('__review') ? 'Ôn từ hay sai' : sel.has('__fav') ? 'Từ yêu thích' : sel.size === 1 ? [...sel][0] : sel.size ? sel.size + ' chủ đề' : 'Tất cả chủ đề';
  const togPos = k => { const n = new Set(pos); n.has(k) ? n.delete(k) : n.add(k); setPos(n); };
  const toggleTopic = k => {
    if (k.startsWith('__')) setSel(sel.has(k) ? new Set() : new Set([k]));
    else { const n = new Set(sel); n.delete('__review'); n.delete('__fav'); n.has(k) ? n.delete(k) : n.add(k); setSel(n); }
  };
  const shown = q.trim() ? topics.filter(t => strip(t).includes(strip(q.trim()))) : topics;

  async function start() {
    setErr('');
    if (!pool.length) { setErr('Chưa có từ nào để chơi, hãy chọn chủ đề khác.'); setOpen(true); return; }
    let items = pool;
    if (mode.needsEx) {
      const have = pool.filter(w => w.ex);
      const src = hasKey() ? pool : have;
      const pick = [];
      while (pick.length < 12 && pick.length < src.length) {
        const w = pickWeighted(src, pick.map(x => x.id));
        if (pick.includes(w)) break;
        pick.push(w);
      }
      if (hasKey() && pick.some(w => !w.ex)) {
        setLoading(true);
        try { await ensureSentences(pick, lang); } catch (e) { setErr('Không sinh được câu bằng Gemini: ' + e.message); }
        setLoading(false);
      }
      items = pick.filter(w => w.ex);
      if (!items.length) items = have;
      if (!items.length) {
        setErr(hasKey() ? 'Không tạo được câu cho các từ này. Thử chủ đề khác.' : 'Chủ đề này chưa có câu ví dụ. Chọn chủ đề khác, hoặc nhập Gemini API key trong Cài đặt để tự sinh câu.');
        return;
      }
    }
    setPlay({ items, label, k: Date.now() });
  }

  if (play) {
    const G = GAMES[mode.id];
    const finish = s => {
      if (!s.words) return;
      if (s.score > state.best.score) state.best.score = s.score;
      if ((s.wpm || 0) > state.best.wpm) state.best.wpm = s.wpm;
      saveBest();
      addSession({ at: Date.now(), score: s.score, wpm: s.wpm || 0, accuracy: s.accuracy, words: s.words, topic: play.label, mode: mode.id });
    };
    return <G key={play.k} mode={mode} items={play.items} label={play.label} lang={lang} onFinish={finish} onAgain={start} onExit={() => setPlay(null)} />;
  }

  const g = groupOf(mode.group);
  return (
    <div className="page narrow">
      <div className="mode-hero">
        <span className="hero-icon">{mode.icon}</span>
        <div>
          <span className={'badge ' + mode.group}>{g?.short}</span>
          <h1>{mode.name}</h1>
          <p>{mode.desc}</p>
        </div>
      </div>

      <section className="card">
        <h3>Cách chơi</h3>
        <ol className="howto">{mode.steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
      </section>

      <section className="card startcard">
        <div className="pickline">
          <div>
            <small>Học với</small>
            <b>{label}</b>
            <small>{pool.length} từ{pos.size ? ' · ' + [...pos].map(k => POS_VI[k]).join(', ') : ''}</small>
          </div>
          <button className="btn ghost small" onClick={() => setOpen(o => !o)}>{open ? 'Thu gọn' : 'Đổi chủ đề'}</button>
        </div>
        {review.length > 0 && !sel.has('__review') && (
          <button className="quick" onClick={() => setSel(new Set(['__review']))}>🔁 Có <b>{review.length}</b> từ bạn hay sai, bấm để ôn chúng</button>
        )}
        {open && (
          <div className="picker">
            <input placeholder="🔍 Tìm chủ đề…" value={q} onChange={e => setQ(e.target.value)} />
            <div className="topics">
              {!q && <>
                <div className={'topic' + (!sel.size ? ' sel' : '')} onClick={() => setSel(new Set())}><b>🌐 Tất cả chủ đề</b><small>{all.length} từ</small></div>
                <div className={'topic special' + (sel.has('__review') ? ' sel' : '')} onClick={() => toggleTopic('__review')}><b>🔁 Ôn từ hay sai</b><small>{review.length} từ</small></div>
                <div className={'topic special' + (sel.has('__fav') ? ' sel' : '')} onClick={() => toggleTopic('__fav')}><b>★ Yêu thích</b><small>{favs.length} từ</small></div>
              </>}
              {shown.map(t => {
                const ws = all.filter(w => w.topic === t);
                const m = ws.filter(w => P(w.id)?.box >= 3).length;
                return (
                  <div key={t} className={'topic' + (sel.has(t) ? ' sel' : '')} onClick={() => toggleTopic(t)}>
                    <b>{t}</b><small>{m}/{ws.length} đã thuộc</small>
                    <div className="bar"><i style={{ width: (ws.length ? m * 100 / ws.length : 0) + '%' }} /></div>
                  </div>
                );
              })}
            </div>
            <h4>Chỉ học loại từ (không bắt buộc)</h4>
            <div className="chips">{Object.entries(POS_VI).map(([k, v]) => <span key={k} className={'chip' + (pos.has(k) ? ' sel' : '')} onClick={() => togPos(k)}>{v}</span>)}</div>
          </div>
        )}
        <button className="btn big block" onClick={start} disabled={loading}>{loading ? 'Đang tạo câu ví dụ bằng AI…' : '▶ Bắt đầu ngay'}</button>
        {mode.needsEx && !hasKey() && <p className="note center">Chỉ dùng những từ có sẵn câu ví dụ. Nhập Gemini key trong Cài đặt để có thêm câu.</p>}
        {err && <p className="note err">{err}</p>}
      </section>
    </div>
  );
}
