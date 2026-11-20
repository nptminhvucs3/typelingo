import React, { useEffect, useState } from 'react';
import { useApp } from '../ctx.js';
import { settings, saveSettings, state, saveProg, saveCustom, resetProgress, replaceAll, exportAll } from '../lib/store.js';
import { mergeProgress } from '../lib/merge.js';
import { POS_VI, LANGS } from '../lib/words.js';
import { speak, voiceFor, voicesFor, voicePref, describeVoice } from '../lib/speech.js';
import { generate } from '../lib/gemini.js';

function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function parseCSVLine(l) { const o = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ',') { o.push(cur); cur = ''; } else cur += c; } o.push(cur); return o.map(s => s.trim()); }

export default function Settings() {
  const { lang, refresh } = useApp();
  const [, bump] = useState(0);
  const [msg, setMsg] = useState('');
  const [keyMsg, setKeyMsg] = useState('');
  const set = (k, v) => { settings[k] = v; saveSettings(); bump(x => x + 1); };
  const tl = LANGS[lang].tts;
  useEffect(() => { // danh sách giọng nạp chậm trên Chrome
    if (typeof speechSynthesis === 'undefined') return;
    const f = () => setTimeout(() => bump(x => x + 1), 0);
    speechSynthesis.addEventListener('voiceschanged', f); return () => speechSynthesis.removeEventListener('voiceschanged', f);
  }, []);

  const testKey = async () => {
    setKeyMsg('Đang thử…');
    try { const r = await generate('Reply with exactly: OK', { temperature: 0 }); setKeyMsg('✓ Key hoạt động (' + r.trim().slice(0, 20) + ')'); }
    catch (e) { setKeyMsg('✗ ' + e.message); }
  };
  const importFile = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const o = JSON.parse(await f.text()); if (o.app !== 'typelingo') throw new Error('x');
      const map = new Map(); for (const w of [...(o.custom || []), ...state.custom]) { const k = w.en + '|' + w.pos, c = map.get(k); if (!c || (w.ts || 0) >= (c.ts || 0)) map.set(k, w); }
      replaceAll({ prog: mergeProgress(state.prog, o.prog || {}), custom: [...map.values()] }); saveProg(); saveCustom(); refresh();
      setMsg('Đã nhập tiến độ từ file.');
    } catch (err) { setMsg('File không đúng định dạng TypeLingo.'); }
    e.target.value = '';
  };
  const importCsv = async e => {
    const f = e.target.files[0]; if (!f) return;
    const lines = (await f.text()).replace(/^﻿/, '').split(/\r?\n/).filter(x => x.trim());
    const ts = Date.now(), map = new Map(state.custom.map(w => [w.en + '|' + w.pos, w])); let n = 0;
    for (const l of lines) {
      const p = parseCSVLine(l); if (p.length < 3 || /^english$/i.test(p[0])) continue;
      let pos = (p[1] || 'n').toLowerCase(); if (!POS_VI[pos]) pos = 'n';
      const en = p[0].toLowerCase().trim(); if (!en || !p[2]) continue;
      map.set(en + '|' + pos, { en, pos, vi: p[2].toLowerCase(), topic: p[3] || 'Từ của tôi', ts }); n++;
    }
    state.custom = [...map.values()]; saveCustom(); refresh(); setMsg(`Đã nhập ${n} từ.`); e.target.value = '';
  };

  return (
    <div className="page narrow">
      <div className="page-head"><h1>⚙️ Cài đặt</h1></div>

      <section className="card form">
        <h3>🔊 Giọng đọc</h3>
        <div className="grid2">
          <label>Giọng {LANGS[lang].name.toLowerCase()}
            <select value={voicePref(tl)} onChange={e => set('voices', { ...(settings.voices || {}), [lang]: e.target.value })}>
              <option value="auto">Tự động (chọn giọng rõ nhất)</option>
              <option value="gt">Google Dịch (rõ, cần mạng)</option>
              {voicesFor(tl).map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
          </label>
          <label>Tốc độ đọc: {Math.round((settings.ttsRate || 0.85) * 100)}%
            <input type="range" min="0.6" max="1.2" step="0.05" value={settings.ttsRate || 0.85} onChange={e => set('ttsRate', +e.target.value)} />
          </label>
        </div>
        <p className="note">Đang dùng: <b>{describeVoice(tl)}</b>. Giọng có chữ “Natural”, “Online” hoặc “Google” thường dễ nghe nhất (trên Windows nên dùng Edge hoặc Chrome).</p>
        <div className="row wrap">
          <button className="btn small" onClick={() => speak(lang === 'de' ? 'Guten Morgen! Wie geht es dir heute?' : 'Good morning! How are you today?', tl)}>🔊 Nghe thử</button>
        </div>
        <label className="check"><input type="checkbox" checked={settings.speakEn} onChange={e => set('speakEn', e.target.checked)} /> Tự đọc từ {LANGS[lang].name.toLowerCase()} khi hiện từ mới</label>
        <label className="check"><input type="checkbox" checked={settings.speakVi} onChange={e => set('speakVi', e.target.checked)} /> Đọc nghĩa tiếng Việt (chế độ từ rơi)</label>
        <label>Giọng tiếng Việt<select value={settings.viVoice} onChange={e => set('viVoice', e.target.value)}><option value="gt">Google Dịch (cần mạng)</option><option value="device">Giọng của thiết bị</option></select></label>
        <div className="row"><button className="btn ghost small" onClick={() => speak('xin chào, nhà bếp', 'vi-VN')}>🔊 Thử giọng Việt</button>{!voiceFor('vi-VN') && <span className="note">Máy chưa có giọng Việt</span>}</div>
      </section>

      <section className="card form">
        <h3>🤖 Gemini AI</h3>
        <p className="note">Dùng cho chế độ Nói chuyện với AI và để tự sinh câu ví dụ. Lấy key miễn phí tại <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>. Key chỉ lưu trên trình duyệt này, không đồng bộ lên tài khoản.</p>
        <label>API key<input type="password" value={settings.geminiKey} onChange={e => set('geminiKey', e.target.value.trim())} placeholder="AIza…" autoComplete="off" /></label>
        <div className="row"><button className="btn small" onClick={testKey} disabled={!settings.geminiKey}>Thử key</button><span className="note">{keyMsg}</span></div>
        <div className="grid2">
          <label>Model văn bản<input value={settings.textModel} onChange={e => set('textModel', e.target.value.trim())} /></label>
          <label>Model Live (giọng nói)<input value={settings.liveModel} onChange={e => set('liveModel', e.target.value.trim())} /></label>
          <label>Giọng AI<select value={settings.voiceName} onChange={e => set('voiceName', e.target.value)}>{['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'].map(v => <option key={v}>{v}</option>)}</select></label>
        </div>
        <p className="note">Nếu Google đổi tên model, sửa ở hai ô trên (xem danh sách tại aistudio.google.com).</p>
      </section>

      <section className="card form">
        <h3>⌨️ Gõ phím</h3>
        <div className="grid2">
          <label>Bộ gõ tiếng Việt<select value={settings.method} onChange={e => set('method', e.target.value)}><option value="telex">Telex</option><option value="vni">VNI</option></select></label>
          <label>Xác nhận từ (chế độ từ rơi)<select value={settings.confirm} onChange={e => set('confirm', e.target.value)}><option value="space">Nhấn Space hoặc Enter</option><option value="auto">Tự động khi gõ đủ</option></select></label>
          <label>Tốc độ rơi: x{settings.speed}<input type="range" min="0.5" max="2" step="0.1" value={settings.speed} onChange={e => set('speed', +e.target.value)} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={settings.noDia} onChange={e => set('noDia', e.target.checked)} /> Cho phép gõ tiếng Việt không dấu</label>
      </section>

      <section className="card form">
        <h3>💾 Dữ liệu</h3>
        <div className="row wrap">
          <button className="btn ghost small" onClick={() => download('typelingo-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(exportAll()), 'application/json')}>Xuất tiến độ</button>
          <label className="btn ghost small">Nhập tiến độ<input type="file" accept=".json" hidden onChange={importFile} /></label>
          <label className="btn ghost small">Nhập từ riêng (CSV, tiếng Anh)<input type="file" accept=".csv,text/csv" hidden onChange={importCsv} /></label>
          <button className="btn ghost small" onClick={() => download('mau-tu-vung.csv', 'english,pos,vietnamese,topic\nwindow,n,cửa sổ,Nhà cửa\n', 'text/csv;charset=utf-8')}>Tải file CSV mẫu</button>
        </div>
        <div className="row wrap">
          <button className="btn bad small" onClick={() => { if (confirm('Xóa tất cả từ bạn đã nhập?')) { const ts = Date.now(); state.custom = state.custom.map(w => ({ ...w, deleted: true, ts })); saveCustom(); refresh(); setMsg('Đã xóa từ nhập thêm.'); } }}>Xóa từ riêng</button>
          <button className="btn bad small" onClick={() => { if (confirm('Xóa toàn bộ tiến độ học?')) { resetProgress(); refresh(); setMsg('Đã xóa tiến độ.'); } }}>Xóa tiến độ</button>
        </div>
        {msg && <p className="note ok">{msg}</p>}
      </section>
    </div>
  );
}
