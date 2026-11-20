// Nói chuyện với AI: ưu tiên Gemini Live (giọng thời gian thực); lỗi thì tự chuyển sang
// nhận giọng của trình duyệt + Gemini văn bản + giọng đọc của thiết bị.
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../ctx.js';
import { settings, saveSettings } from '../lib/store.js';
import { LANGS } from '../lib/words.js';
import { hasKey, chat, generate } from '../lib/gemini.js';
import { startLive } from '../lib/live.js';
import { speak } from '../lib/speech.js';

const TOPICS = [
  ['free', '💬 Nói tự do'], ['intro', '🙋 Giới thiệu bản thân'], ['daily', '☀️ Sinh hoạt hằng ngày'], ['work', '💼 Công việc'],
  ['interview', '🤝 Phỏng vấn xin việc'], ['travel', '✈️ Du lịch, hỏi đường'], ['restaurant', '🍜 Gọi món ở nhà hàng'],
  ['shopping', '🛍️ Mua sắm'], ['hobby', '🎮 Sở thích'], ['tech', '💻 Công nghệ'], ['study', '🎓 Du học'], ['doctor', '🏥 Đi khám bệnh'],
];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

function systemPrompt(lang, level, topic) {
  const L = lang === 'de' ? 'German' : 'English';
  return `You are a friendly ${L} conversation partner and tutor for a Vietnamese learner at CEFR level ${level}.
Topic: ${topic === 'free' || !topic ? 'anything the learner wants to talk about' : topic}.
Rules:
- Speak only ${L}, using vocabulary and grammar suitable for ${level}. Keep each reply short (1-3 sentences) so the learner talks more.
- Always end with a natural follow-up question to keep the conversation going.
- If the learner makes a grammar or word-choice mistake, first repeat their sentence correctly in a natural way ("Oh, you mean: ..."), then continue.
- If the learner speaks Vietnamese or is stuck, tell them briefly how to say it in ${L}, then encourage them to repeat it.
- Start by greeting the learner and asking an opening question about the topic.`;
}

export default function Speak() {
  const { lang, go } = useApp();
  const [topic, setTopic] = useState('free');
  const [custom, setCustom] = useState('');
  const [level, setLevel] = useState(settings.level || 'B1');
  const [engine, setEngine] = useState('live'); // 'live' | 'fallback'
  const [state, setState] = useState('idle'); // idle | connecting | live | closed
  const [msgs, setMsgs] = useState([]); // {role:'user'|'ai', text}
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const live = useRef(null), rec = useRef(null), hist = useRef([]), endRef = useRef(null);
  const tl = LANGS[lang].tts;
  const topicText = custom.trim() || TOPICS.find(t => t[0] === topic)?.[1].replace(/^\S+\s/, '');

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [msgs]);
  useEffect(() => () => { live.current?.stop(); rec.current?.abort?.(); }, []);

  // Gộp phụ đề từng mẩu của Live vào tin nhắn cuối cùng cùng vai
  const append = (role, t) => setMsgs(m => {
    const last = m[m.length - 1];
    if (last && last.role === role && !last.closed) return [...m.slice(0, -1), { ...last, text: last.text + t }];
    return [...m, { role, text: t }];
  });
  const closeTurn = () => setMsgs(m => m.map(x => ({ ...x, closed: true })));

  async function start() {
    setErr(''); setMsgs([]); setReview(null); hist.current = [];
    settings.level = level; saveSettings();
    const system = systemPrompt(lang, level, topic === 'free' && !custom.trim() ? 'free' : topicText);
    if (engine === 'live') {
      setState('connecting');
      let fellBack = false;
      live.current = await startLive({
        system,
        onState: s => { if (s === 'closed' && fellBack) return; setState(s); if (s === 'live') live.current?.sendText?.('Hello!'); },
        onText: (role, t) => (role === 'turn' ? closeTurn() : append(role, t)),
        onError: m => {
          if (fellBack) return; fellBack = true;
          setErr(m + ' → Đã chuyển sang chế độ dự phòng (nhận giọng của trình duyệt + Gemini văn bản).');
          setEngine('fallback'); startFallback(system);
        },
      });
    } else startFallback(system);
  }
  async function startFallback(system) {
    hist.current = [{ role: 'user', text: 'Hello! Please start our conversation.' }];
    hist.sys = system;
    setState('live'); setBusy(true);
    try {
      const r = await chat(hist.current, { system });
      hist.current.push({ role: 'model', text: r }); setMsgs([{ role: 'ai', text: r, closed: true }]); speak(r, tl, 1);
    } catch (e) { setErr(e.message); setState('closed'); }
    setBusy(false);
  }
  async function sendFallback(t) {
    if (!t.trim()) return;
    setMsgs(m => [...m, { role: 'user', text: t, closed: true }]);
    hist.current.push({ role: 'user', text: t }); setBusy(true);
    try {
      const r = await chat(hist.current, { system: hist.sys });
      hist.current.push({ role: 'model', text: r }); setMsgs(m => [...m, { role: 'ai', text: r, closed: true }]); speak(r, tl, 1);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  function mic() {
    if (!SR) { setErr('Trình duyệt này không hỗ trợ nhận giọng nói. Hãy dùng Chrome/Edge/Safari hoặc gõ chữ.'); return; }
    if (listening) { rec.current?.stop(); return; }
    try { speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ }
    const r = rec.current = new SR(); r.lang = tl; r.interimResults = true; r.continuous = false;
    let final = '';
    r.onresult = e => { let s = ''; for (const x of e.results) s += x[0].transcript; final = s; setText(s); };
    r.onend = () => { setListening(false); if (final.trim()) { sendFallback(final); setText(''); } };
    r.onerror = e => { setListening(false); if (e.error !== 'no-speech' && e.error !== 'aborted') setErr('Lỗi micro: ' + e.error); };
    setListening(true); r.start();
  }
  function stop() {
    live.current?.stop(); live.current = null; rec.current?.abort?.();
    try { speechSynthesis.cancel(); } catch (e) { /* bỏ qua */ }
    setState('closed');
  }
  async function getReview() {
    const said = msgs.filter(m => m.role === 'user').map(m => '- ' + m.text.trim()).join('\n');
    if (!said) { setReview('Chưa có câu nào của bạn để nhận xét.'); return; }
    setBusy(true);
    try {
      setReview(await generate(`Đây là những câu một người Việt học ${LANGS[lang].name} (trình độ ${level}) đã nói trong buổi luyện nói (chuyển từ giọng nói thành chữ nên có thể thiếu dấu câu):\n${said}\n\n` +
        'Hãy nhận xét bằng tiếng Việt, ngắn gọn, theo mục: 1) Điểm tốt; 2) Lỗi sai và câu đã sửa (dạng "❌ ... → ✅ ..."); 3) 5 từ/cụm từ hữu ích nên học thêm cho chủ đề này, kèm nghĩa; 4) Điểm ước lượng /10 về độ trôi chảy. Không dùng markdown đậm.'));
    } catch (e) { setReview('Lỗi: ' + e.message); }
    setBusy(false);
  }

  if (!hasKey()) {
    return (
      <div className="page narrow">
        <div className="page-head"><h1>🎙️ Nói chuyện với AI</h1></div>
        <div className="card">
          <p>Chế độ này cần <b>Gemini API key</b> miễn phí của bạn. Key chỉ lưu trên máy này, không gửi lên máy chủ của app.</p>
          <ol className="steps"><li>Vào <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> → Create API key.</li><li>Dán key vào <b>Cài đặt → Gemini AI</b>.</li></ol>
          <button className="btn" onClick={() => go('settings')}>Mở Cài đặt</button>
        </div>
      </div>
    );
  }

  const running = state === 'connecting' || state === 'live';
  return (
    <div className="page speak">
      <div className="page-head"><h1>🎙️ Nói chuyện với AI</h1><p>Luyện nói {LANGS[lang].name.toLowerCase()} với Gemini. AI sẽ sửa lỗi nhẹ nhàng ngay trong hội thoại.</p></div>
      {!running && (
        <div className="card">
          <h3>Chủ đề</h3>
          <div className="chips">{TOPICS.map(([k, v]) => <span key={k} className={'chip' + (topic === k && !custom ? ' sel' : '')} onClick={() => { setTopic(k); setCustom(''); }}>{v}</span>)}</div>
          <input className="answer-in" placeholder="…hoặc tự nhập chủ đề (vd: kể về chuyến đi Đà Lạt)" value={custom} onChange={e => setCustom(e.target.value)} />
          <div className="grid2">
            <label>Trình độ<select value={level} onChange={e => setLevel(e.target.value)}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label>
            <label>Cách nói chuyện<select value={engine} onChange={e => setEngine(e.target.value)}>
              <option value="live">Gemini Live (giọng tự nhiên, thời gian thực)</option>
              <option value="fallback">Dự phòng: bấm mic từng câu</option>
            </select></label>
          </div>
          <button className="btn big" onClick={start}>🎙️ Bắt đầu nói</button>
          {msgs.length > 0 && <button className="btn ghost" onClick={getReview} disabled={busy}>📝 Nhận xét buổi vừa rồi</button>}
        </div>
      )}
      {err && <p className="note err">{err}</p>}
      {(running || msgs.length > 0) && (
        <div className="card chat">
          <div className="chat-head">
            <span className={'live-dot ' + state} />
            <span>{state === 'connecting' ? 'Đang kết nối…' : state === 'live' ? (engine === 'live' ? 'Đang nghe, cứ nói tự nhiên' : 'Bấm 🎤 để nói') : 'Đã kết thúc'}</span>
            <div className="grow" />
            {running && <button className="btn ghost small" onClick={stop}>Kết thúc</button>}
          </div>
          <div className="msgs">
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + m.role}>
                {m.text}
                {m.role === 'ai' && <button className="mini" onClick={() => speak(m.text, tl, 0.9)}>🔊</button>}
              </div>
            ))}
            {busy && <div className="msg ai typing">…</div>}
            <div ref={endRef} />
          </div>
          {running && engine === 'fallback' && (
            <div className="composer">
              <button className={'micbtn' + (listening ? ' on' : '')} onClick={mic} disabled={busy}>🎤</button>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Nói hoặc gõ câu trả lời…" onKeyDown={e => { if (e.key === 'Enter') { sendFallback(text); setText(''); } }} />
              <button className="btn small" onClick={() => { sendFallback(text); setText(''); }} disabled={busy}>Gửi</button>
            </div>
          )}
          {!running && <button className="btn ghost" onClick={getReview} disabled={busy}>📝 Nhận xét và sửa lỗi</button>}
        </div>
      )}
      {review && <div className="card review"><h3>📝 Nhận xét</h3><pre>{review}</pre></div>}
    </div>
  );
}
