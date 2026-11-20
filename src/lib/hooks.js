import { useEffect, useReducer } from 'react';
import { onChange } from './store.js';
import * as cloud from './sync.js';

// Render lại khi dữ liệu trong store đổi.
export function useStore() {
  const [, bump] = useReducer(x => x + 1, 0);
  useEffect(() => onChange(() => bump()), []);
}
export function useCloud() {
  const [info, set] = useReducer((_, v) => v, cloud.getInfo());
  useEffect(() => cloud.onStatus(i => set({ ...i })), []);
  return info;
}
