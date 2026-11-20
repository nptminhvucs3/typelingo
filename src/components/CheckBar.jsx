// Thanh dưới cùng của bài tập: lúc chưa trả lời là nút "Kiểm tra"; sau khi trả lời đổi sang
// thông báo xanh (đúng) / đỏ (sai) kèm đáp án và nút "Tiếp tục". Enter để bấm.
import React, { useEffect, useRef } from 'react';

const PRAISE = ['Tuyệt vời!', 'Chính xác!', 'Giỏi lắm!', 'Rất tốt!', 'Đúng rồi!'];

export default function CheckBar({ state, onCheck, onNext, canCheck = true, checkLabel = 'Kiểm tra', answer, detail, skip }) {
  const btn = useRef(null);
  const praise = useRef(PRAISE[(Math.random() * PRAISE.length) | 0]);
  useEffect(() => { if (state) { praise.current = PRAISE[(Math.random() * PRAISE.length) | 0]; btn.current?.focus({ preventScroll: true }); } }, [state]);
  return (
    <>
      <div className="checkbar-space" />
      <div className={'checkbar' + (state ? ' ' + state : '')}>
        <div className="cb-inner">
          {state ? (
            <div className="cb-msg">
              <span className="cb-icon">{state === 'ok' ? '✓' : '✕'}</span>
              <div>
                <b>{state === 'ok' ? praise.current : 'Chưa đúng'}</b>
                {state === 'bad' && answer && <p>Đáp án đúng: <strong>{answer}</strong></p>}
                {detail && <p className="cb-detail">{detail}</p>}
              </div>
            </div>
          ) : (skip ? <button className="btn ghost cb-skip" onClick={skip.onClick}>{skip.label}</button> : <span />)}
          {state
            ? <button ref={btn} className={'btn big cb-btn ' + state} onClick={onNext}>Tiếp tục</button>
            : onCheck && <button className="btn big cb-btn" disabled={!canCheck} onClick={onCheck}>{checkLabel}</button>}
        </div>
      </div>
    </>
  );
}
