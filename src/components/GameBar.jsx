// Thanh trên cùng của mỗi bài: ✕ thoát, thanh tiến độ, "3/10", và một câu nhắc phải làm gì.
import React from 'react';
import Icon from './Icon.jsx';

export default function GameBar({ mode, i, n, onExit, extra }) {
  return (
    <div className={'gamebar ' + (mode.group || '')}>
      <div className="gb-top">
        <button className="back" onClick={onExit} aria-label="Thoát bài">✕</button>
        {n > 0
          ? <div className="progress lesson" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={i}><i style={{ width: Math.max(4, i * 100 / n) + '%' }} /></div>
          : <div className="grow" />}
        {extra}
        {n > 0 && <span className="gb-count">{Math.min(i + 1, n)}/{n}</span>}
      </div>
      {mode.tip && <p className="gb-tip"><span className="gb-icon"><Icon name={mode.ico} size={26} /></span>{mode.tip}</p>}
    </div>
  );
}
