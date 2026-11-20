// Giọng đọc chạy ngay trong trình duyệt bằng Piper TTS (mã nguồn mở, MIT) + ONNX Runtime Web.
// Dùng làm dự phòng khi máy không có giọng Việt và Google Dịch không đọc được.
// Lần đầu tải mô hình (~63MB) từ HuggingFace, sau đó lưu trong trình duyệt (OPFS) nên chạy được cả khi mất mạng.
export const PIPER_VOICES = { vi: 'vi_VN-vais1000-medium' };

let lib = null, session = null, sessionVoice = null, pending = null;
const cache = new Map(); // text -> blob URL
const listeners = new Set();
export const onPiperStatus = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = s => listeners.forEach(f => { try { f(s); } catch (e) { /* bỏ qua */ } });

async function getSession(voiceId) {
  if (session && sessionVoice === voiceId) return session;
  if (pending) return pending;
  pending = (async () => {
    lib = lib || await import('@mintplex-labs/piper-tts-web');
    let last = 0;
    emit({ loading: true, pct: 0 });
    const s = await lib.TtsSession.create({
      voiceId,
      progress: p => {
        if (!p?.total) return;
        const pct = Math.round(p.loaded * 100 / p.total);
        if (pct !== last) { last = pct; emit({ loading: true, pct }); }
      },
    });
    session = s; sessionVoice = voiceId;
    emit({ loading: false, ready: true });
    return s;
  })();
  try { return await pending; } catch (e) { emit({ loading: false, error: e.message || String(e) }); throw e; } finally { pending = null; }
}

// Đã tải mô hình về máy chưa
export async function piperStored(lang = 'vi') {
  try { lib = lib || await import('@mintplex-labs/piper-tts-web'); return (await lib.stored()).includes(PIPER_VOICES[lang]); } catch (e) { return false; }
}
export const piperBusy = () => !!pending;
export function preloadPiper(lang = 'vi') { return getSession(PIPER_VOICES[lang]); }

// Trả về URL âm thanh (wav) cho câu
export async function piperUrl(text, lang = 'vi') {
  const k = lang + '|' + text;
  if (cache.has(k)) return cache.get(k);
  const s = await getSession(PIPER_VOICES[lang]);
  const url = URL.createObjectURL(await s.predict(text));
  cache.set(k, url);
  if (cache.size > 300) { const [old, u] = cache.entries().next().value; URL.revokeObjectURL(u); cache.delete(old); }
  return url;
}
