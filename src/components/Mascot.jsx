// Mascot của TypeLingo: chú mèo mướp xám, ảnh PNG nền trong suốt ở public/mascot/
//   expressions/<tên>.png : biểu cảm tĩnh
//   anim/<tên>-1..6.png   : khung hình động (idle, jump, wave, wrong)
// Cho mượt hơn dù chỉ có 6 khung: (1) các khung xếp chồng và hòa trộn (crossfade) khi đổi,
// (2) mỗi khung giữ thời gian riêng (vd. idle là chu kỳ chớp mắt: mở mắt lâu, chớp nhanh),
// (3) thêm chuyển động CSS nhẹ (thở, đung đưa, bật nhảy) chạy liên tục bên dưới.
import React, { useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL + 'mascot/';
const EXPRESSIONS = ['celebrate', 'cheer', 'correct', 'happy', 'listening', 'lost-streak', 'love', 'sleeping', 'speaking', 'streak', 'study', 'surprised', 'thinking', 'typing', 'wave', 'wrong'];
// Chuỗi khung: [số khung, thời gian giữ ms]. fade: thời gian hòa trộn. end: biểu cảm dừng lại khi chạy xong.
const ANIMS = {
  idle: { seq: [[1, 2200], [2, 220], [3, 90], [4, 130], [5, 90], [6, 260], [1, 1600], [2, 200], [6, 240]], loop: true, fade: 120 },
  wave: { seq: [[1, 260], [2, 170], [3, 190], [4, 190], [5, 190], [4, 190], [3, 190], [5, 190], [6, 230], [1, 1500]], loop: true, fade: 140 },
  jump: { seq: [[1, 110], [2, 110], [3, 150], [4, 230], [5, 140], [6, 260]], loop: false, fade: 90, end: 'correct' },
  wrong: { seq: [[1, 110], [2, 200], [3, 220], [4, 200], [5, 320]], loop: false, fade: 150, end: 'wrong' },
};
// Tên gọi tắt dùng trong code
const ALIAS = { ok: 'jump', bad: 'wrong', sad: 'wrong', win: 'celebrate', hi: 'wave' };

const exprUrl = n => `${BASE}expressions/${n}.png`;
const frameUrl = (a, i) => `${BASE}anim/${a}-${i}.png`;
const framesOf = n => [...new Set(ANIMS[n].seq.map(s => s[0]))].sort();
const loaded = new Set();
function preload(urls) { for (const u of urls) if (!loaded.has(u)) { loaded.add(u); const im = new Image(); im.src = u; } }
// Tải trước ảnh của các chuyển động / biểu cảm sắp dùng (tránh nháy trống lần đầu)
export function preloadMascot(names) {
  for (const n0 of names) {
    const n = ALIAS[n0] || n0, a = ANIMS[n];
    if (a) preload([...framesOf(n).map(i => frameUrl(n, i)), ...(a.end ? [exprUrl(a.end)] : [])]);
    else preload([exprUrl(n)]);
  }
}
const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Mascot({ mood = 'idle', size = 96, className = '', title = 'Mèo TypeLingo' }) {
  const name = ALIAS[mood] || (EXPRESSIONS.includes(mood) || ANIMS[mood] ? mood : 'happy');
  const anim = ANIMS[name];
  const [step, setStep] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setStep(0); setEnded(false);
    if (!anim) return;
    preloadMascot([name]);
    if (reduceMotion()) { if (anim.end) setEnded(true); return; }
    let i = 0, t;
    const tick = () => {
      i++;
      if (i >= anim.seq.length) {
        if (!anim.loop) { setEnded(true); return; }
        i = 0;
      }
      setStep(i); t = setTimeout(tick, anim.seq[i][1]);
    };
    t = setTimeout(tick, anim.seq[0][1]);
    return () => clearTimeout(t);
  }, [name]); // eslint-disable-line

  const box = { width: size, height: size };
  if (!anim) {
    return <img className={'mascot m-' + name + ' ' + className} src={exprUrl(name)} alt={title} width={size} height={size} draggable="false" style={box} />;
  }
  // Mọi khung xếp chồng, khung đang hiện có opacity 1 → trình duyệt hòa trộn khi đổi khung
  const cur = ended ? -1 : anim.seq[step][0];
  const fade = { transition: `opacity ${anim.fade}ms ease-in-out` };
  return (
    <span className={'mascot mascot-anim m-' + name + (ended ? ' ended' : '') + ' ' + className} style={box} role="img" aria-label={title}>
      <span className="m-move">
        {framesOf(name).map(i => <img key={i} src={frameUrl(name, i)} alt="" draggable="false" style={{ ...fade, opacity: cur === i ? 1 : 0 }} />)}
        {anim.end && <img src={exprUrl(anim.end)} alt="" draggable="false" style={{ ...fade, opacity: ended ? 1 : 0 }} />}
      </span>
    </span>
  );
}

// Mascot "nói": mèo + bong bóng thoại
export function MascotSay({ mood = 'study', size = 88, children, className = '' }) {
  return (
    <div className={'mascot-say ' + className}>
      <Mascot mood={mood} size={size} />
      <div className="say-bubble">{children}</div>
    </div>
  );
}
