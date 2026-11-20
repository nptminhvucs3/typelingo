// Thống kê dùng chung: XP, chuỗi ngày, mục tiêu ngày (cách tính tham khảo các app học ngôn ngữ).
import { state, settings } from './store.js';

export const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
// XP của một lượt: lượt cũ chưa có trường xp thì lấy số từ đúng
export const xpOf = s => (s.xp != null ? s.xp : (s.words || 0));
// XP cho lượt vừa chơi: mỗi từ đúng 1 XP, hoàn thành bài +5, không sai câu nào +5
export const calcXp = s => (s.words || 0) + (s.words ? 5 : 0) + (s.words && s.accuracy >= 100 ? 5 : 0);
export const goalOf = () => settings.dailyGoal || 20;

export function statsData() {
  const xpDay = new Map(), wordsDay = new Map();
  for (const s of state.history) {
    const k = dayKey(s.at);
    xpDay.set(k, (xpDay.get(k) || 0) + xpOf(s));
    wordsDay.set(k, (wordsDay.get(k) || 0) + (s.words || 0));
  }
  const today = dayKey(Date.now());
  let streak = 0; const d = new Date(); if (!xpDay.has(today)) d.setDate(d.getDate() - 1);
  while (xpDay.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  const days = [];
  for (let i = 13; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); days.push({ label: x.getDate() + '/' + (x.getMonth() + 1), xp: xpDay.get(dayKey(x)) || 0, words: wordsDay.get(dayKey(x)) || 0 }); }
  const week = [];
  for (let i = 6; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); week.push({ d: 'CN T2 T3 T4 T5 T6 T7'.split(' ')[x.getDay()], on: xpDay.has(dayKey(x)), today: i === 0 }); }
  const last = state.history.slice(-20);
  const todayModes = new Set(state.history.filter(s => dayKey(s.at) === today).map(s => s.mode));
  const totalXp = state.history.reduce((a, s) => a + xpOf(s), 0);
  return {
    streak, days, week, todayModes, totalXp,
    xpToday: xpDay.get(today) || 0, wordsToday: wordsDay.get(today) || 0, goal: goalOf(),
    playedToday: xpDay.has(today),
    acc: last.length ? Math.round(last.reduce((a, s) => a + (s.accuracy || 0), 0) / last.length) : 0,
  };
}
