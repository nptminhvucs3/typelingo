// Thanh trên cùng của mỗi bài: nút thoát, tên bài, tiến độ "3/10" và một câu nhắc phải làm gì.
import React from 'react';

export default function GameBar({ mode, i, n, onExit, extra }) {
  return (
    <div className="gamebar">
      <div className="gb-top">
        <button className="back" onClick={onExit} aria-label="Thoát">←</button>
        <span className="gb-title">{mode.icon} {mode.name}</span>
        <div className="grow" />
        {extra}
        {n > 0 && <span className="gb-count">{Math.min(i + 1, n)}/{n}</span>}
      </div>
      {n > 0 && <div className="progress"><i style={{ width: (i * 100 / n) + '%' }} /></div>}
      {mode.tip && <p className="gb-tip">👉 {mode.tip}</p>}
    </div>
  );
}
