// Thanh dưới cùng của bài tập: lúc chưa trả lời là nút "Kiểm tra"; sau khi trả lời đổi sang
// thông báo xanh (đúng) / đỏ (sai) kèm mascot, đáp án và nút "Tiếp tục". Enter để bấm.
import React, { useEffect, useRef } from 'react';
import Mascot, { preloadMascot } from './Mascot.jsx';
import { Stars } from './Burst.jsx';

const PRAISE = ['Tuyệt vời!', 'Chính xác!', 'Giỏi lắm!', 'Rất tốt!', 'Đúng rồi!'];
const CHEER = ['Không sao, thử tiếp nhé!', 'Gần đúng rồi!', 'Lần sau sẽ nhớ thôi!'];
const pickOne = a => a[(Math.random() * a.length) | 0];

export default function CheckBar({ state, onCheck, onNext, canCheck = true, checkLabel = 'Kiểm tra', answer, detail, skip }) {
  const btn = useRef(null);
  useEffect(() => { preloadMascot(['ok', 'bad', 'celebrate']); }, []);
  const msg = useRef({ ok: pickOne(PRAISE), bad: pickOne(CHEER) });
  useEffect(() => {
    if (state) { msg.current = { ok: pickOne(PRAISE), bad: pickOne(CHEER) }; btn.current?.focus({ preventScroll: true }); }
  }, [state]);
  return (
    <>
      <div className="checkbar-space" />
      <div className={'checkbar' + (state ? ' ' + state : '')}>
        <div className="cb-inner">
          {state ? (
            <div className="cb-msg">
              <span className="cb-mascot"><Mascot mood={state === 'ok' ? 'ok' : 'bad'} size={72} />{state === 'ok' && <Stars />}</span>
              <div>
                <b>{state === 'ok' ? msg.current.ok : 'Chưa đúng'}</b>
                {state === 'bad' && answer && <p>Đáp án đúng: <strong>{answer}</strong></p>}
                {detail && <p className="cb-detail">{detail}</p>}
                {state === 'bad' && !detail && <p className="cb-detail">{msg.current.bad}</p>}
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
