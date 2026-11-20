// Gemini Live API qua WebSocket: gửi mic PCM16 16kHz, nhận âm thanh PCM 24kHz + phụ đề.
import { settings } from './store.js';

const WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=';
const b64 = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };

const WORKLET = `class P extends AudioWorkletProcessor{process(i){const c=i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('p',P)`;

// handlers: onState(s), onText(role,text,final), onError(msg)
export async function startLive({ system, onState, onText, onError }) {
  let ws, ctx, stream, node, playCtx, playAt = 0, closed = false, ready = false;
  const sources = new Set();
  const fail = m => { onError?.(m); stop(); };
  function stop() {
    if (closed) return; closed = true;
    try { ws?.close(); } catch (e) { /* bỏ qua */ }
    try { node?.disconnect(); ctx?.close(); playCtx?.close(); } catch (e) { /* bỏ qua */ }
    stream?.getTracks().forEach(t => t.stop());
    onState?.('closed');
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  } catch (e) { onError?.('Không mở được micro. Hãy cho phép quyền micro cho trang này.'); onState?.('closed'); return { stop() {} }; }
  onState?.('connecting');
  ws = new WebSocket(WS + encodeURIComponent(settings.geminiKey.trim()));
  playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  ws.onopen = () => {
    ws.send(JSON.stringify({ setup: {
      model: 'models/' + settings.liveModel,
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceName } } } },
      systemInstruction: { parts: [{ text: system }] },
      inputAudioTranscription: {}, outputAudioTranscription: {},
    } }));
  };
  ws.onerror = () => fail('Không kết nối được Gemini Live.');
  ws.onclose = ev => { if (!closed) { if (!ready) onError?.(ev.reason || 'Gemini Live đóng kết nối (kiểm tra API key / tên model Live).'); else if (ev.code !== 1000 && ev.reason) onError?.(ev.reason); stop(); } };
  ws.onmessage = async ev => {
    let m; try { m = JSON.parse(typeof ev.data === 'string' ? ev.data : await ev.data.text()); } catch (e) { return; }
    if (m.setupComplete) { ready = true; onState?.('live'); startMic(); return; }
    const c = m.serverContent; if (!c) return;
    if (c.interrupted) { sources.forEach(s => { try { s.stop(); } catch (e) { /* bỏ qua */ } }); sources.clear(); playAt = 0; }
    for (const p of c.modelTurn?.parts || []) if (p.inlineData?.data) play(unb64(p.inlineData.data));
    if (c.inputTranscription?.text) onText?.('user', c.inputTranscription.text);
    if (c.outputTranscription?.text) onText?.('ai', c.outputTranscription.text);
    if (c.turnComplete) onText?.('turn', '');
  };
  function play(buf) {
    const i16 = new Int16Array(buf), f = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f[i] = i16[i] / 32768;
    const ab = playCtx.createBuffer(1, f.length, 24000); ab.copyToChannel(f, 0);
    const s = playCtx.createBufferSource(); s.buffer = ab; s.connect(playCtx.destination);
    playAt = Math.max(playAt, playCtx.currentTime + 0.03); s.start(playAt); playAt += ab.duration;
    sources.add(s); s.onended = () => sources.delete(s);
  }
  async function startMic() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url); URL.revokeObjectURL(url);
      node = new AudioWorkletNode(ctx, 'p');
      const rate = ctx.sampleRate;
      node.port.onmessage = e => {
        if (ws.readyState !== 1) return;
        const f = e.data, i16 = new Int16Array(f.length);
        for (let i = 0; i < f.length; i++) i16[i] = Math.max(-1, Math.min(1, f[i])) * 32767;
        ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64(i16.buffer), mimeType: 'audio/pcm;rate=' + rate } } }));
      };
      ctx.createMediaStreamSource(stream).connect(node);
    } catch (e) { fail('Trình duyệt này không hỗ trợ thu âm cho Live. Hãy dùng chế độ dự phòng.'); }
  }
  return { stop, sendText: t => ws.readyState === 1 && ws.send(JSON.stringify({ realtimeInput: { text: t } })) };
}
