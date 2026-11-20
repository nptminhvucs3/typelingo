// Gộp dữ liệu giữa máy và máy chủ. Quy tắc: bản nào có thời gian cập nhật (ts) mới hơn thì thắng, theo từng từ.
export function mergeProgress(local, remote) {
  const out = {};
  const ids = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
  for (const id of ids) {
    const a = local?.[id], b = remote?.[id];
    if (!a) out[id] = b; else if (!b) out[id] = a;
    else out[id] = (b.ts || 0) > (a.ts || 0) ? b : a;
  }
  return out;
}
// Các id mà bản gộp khác với máy chủ → cần đẩy lên.
export function diffToPush(merged, remote) {
  const ids = [];
  for (const id of Object.keys(merged)) {
    const m = merged[id], r = remote?.[id];
    if (!r || (m.ts || 0) > (r.ts || 0)) ids.push(id);
  }
  return ids;
}
export function mergeCustom(local, remote) {
  const map = new Map();
  for (const w of [...(remote || []), ...(local || [])]) {
    const k = (w.en || '').toLowerCase() + '|' + w.pos;
    const cur = map.get(k);
    if (!cur || (w.ts || 0) >= (cur.ts || 0)) map.set(k, w);
  }
  return [...map.values()].filter(w => !w.deleted);
}
export function mergeSettings(local, remote) {
  if (!remote) return local;
  return (remote.ts || 0) > (local.ts || 0) ? { ...local, ...remote, geminiKey: local.geminiKey, voices: local.voices } : local;
}
