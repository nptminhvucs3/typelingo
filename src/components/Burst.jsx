// Hiệu ứng chúc mừng không cần thư viện: vài ngôi sao bay ra (khi trả lời đúng)
// hoặc pháo giấy rơi (khi hoàn thành bài). Tắt khi người dùng bật "giảm chuyển động".
import React, { useMemo } from 'react';

const COLORS = ['#7DD3B0', '#9AD1FF', '#FFB5A7', '#B7A6F2', '#FFE08A'];

export function Stars({ n = 7 }) {
  const items = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = 46 + Math.random() * 30;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 10, c: COLORS[i % COLORS.length], s: 12 + Math.random() * 10, delay: Math.random() * 80 };
  }), [n]);
  return (
    <span className="stars" aria-hidden="true">
      {items.map((t, i) => <i key={i} style={{ '--x': t.x + 'px', '--y': t.y + 'px', color: t.c, fontSize: t.s + 'px', animationDelay: t.delay + 'ms' }}>★</i>)}
    </span>
  );
}

export function Confetti({ n = 40 }) {
  const items = useMemo(() => Array.from({ length: n }, (_, i) => ({
    left: Math.random() * 100, c: COLORS[i % COLORS.length], delay: Math.random() * 600, dur: 1600 + Math.random() * 1400,
    rot: Math.random() * 360, w: 6 + Math.random() * 6, h: 10 + Math.random() * 8, drift: (Math.random() - 0.5) * 160,
  })), [n]);
  return (
    <div className="confetti" aria-hidden="true">
      {items.map((p, i) => <i key={i} style={{ left: p.left + '%', background: p.c, width: p.w, height: p.h, animationDelay: p.delay + 'ms', animationDuration: p.dur + 'ms', '--r': p.rot + 'deg', '--dx': p.drift + 'px' }} />)}
    </div>
  );
}
