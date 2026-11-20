// Thông báo nhỏ khi đang tải giọng Piper (lần đầu, ~63MB).
import React, { useEffect, useState } from 'react';
import { onPiperStatus } from '../lib/piper.js';

export default function PiperToast() {
  const [s, set] = useState(null);
  useEffect(() => onPiperStatus(x => {
    set(x);
    if (!x.loading) setTimeout(() => set(null), x.error ? 5000 : 1500);
  }), []);
  if (!s) return null;
  return (
    <div className="toast">
      {s.loading ? `🔊 Đang tải giọng đọc tiếng Việt (chỉ lần đầu)… ${s.pct || 0}%`
        : s.error ? '⚠️ Không tải được giọng đọc tiếng Việt' : '✓ Đã sẵn sàng giọng đọc tiếng Việt'}
    </div>
  );
}
