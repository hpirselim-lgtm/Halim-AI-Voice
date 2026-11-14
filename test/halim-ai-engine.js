/**
 * Halim AI Engine — local synthesis orchestration core.
 * Owns text segmentation, sequential generation, per-chunk retry and WAV assembly.
 * The model runtime is intentionally injected; no VocoLoco runtime is loaded as a ready-made engine.
 */
const DEFAULTS = Object.freeze({ maxChars: 260, minChars: 90, retries: 2, retryDelayMs: 450 });

export function splitTextIntoChunks(input, options = {}) {
  const maxChars = Math.max(80, Number(options.maxChars) || DEFAULTS.maxChars);
  const minChars = Math.min(maxChars, Math.max(20, Number(options.minChars) || DEFAULTS.minChars));
  const text = String(input || "").replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?…])\s+|\n{2,}/u)
    .map(part => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  const push = value => { if (value.trim()) chunks.push(value.trim()); };
  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) { push(current); current = ""; }
      const words = sentence.split(/\s+/);
      let piece = "";
      for (const word of words) {
        if (piece && (piece + " " + word).length > maxChars) {
          push(piece);
          piece = word;
        } else piece += (piece ? " " : "") + word;
      }
      if (piece) current = piece;
      continue;
    }
    const candidate = current ? current + " " + sentence : sentence;
    if (candidate.length <= maxChars && (!current || current.length < minChars || candidate.length <= maxChars)) {
      current = candidate;
    } else {
      push(current);
      current = sentence;
    }
  }
  push(current);
  return chunks;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function parsePcmWav(buffer) {
  const view = new DataView(buffer);
  const read = (offset, length) => String.fromCharCode(...new Uint8Array(buffer, offset, length));
  if (buffer.byteLength < 44 || read(0, 4) !== "RIFF" || read(8, 4) !== "WAVE") {
    throw new Error("Motor parçası geçerli WAV verisi döndürmedi.");
  }
  let offset = 12, fmt = null, data = null;
  while (offset + 8 <= buffer.byteLength) {
    const id = read(offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > buffer.byteLength) throw new Error("WAV parçası eksik veya bozuk.");
    if (id === "fmt ") {
      fmt = {
        audioFormat: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        sampleRate: view.getUint32(start + 4, true),
        byteRate: view.getUint32(start + 8, true),
        blockAlign: view.getUint16(start + 12, true),
        bitsPerSample: view.getUint16(start + 14, true)
      };
    } else if (id === "data") data = new Uint8Array(buffer, start, size);
    offset = start + size + (size % 2);
  }
  if (!fmt || !data || fmt.audioFormat !== 1 || ![1, 2].includes(fmt.channels) || fmt.bitsPerSample !== 16) {
    throw new Error("Şimdilik yalnızca PCM 16-bit mono/stereo WAV birleştirilebilir.");
  }
  return { fmt, data };
}

export async function joinPcmWav(blobs) {
  if (!blobs.length) throw new Error("Birleştirilecek ses parçası yok.");
  const parsed = [];
  for (const blob of blobs) parsed.push(parsePcmWav(await blob.arrayBuffer()));
  const first = parsed[0].fmt;
  for (const item of parsed) {
    const f = item.fmt;
    if (f.channels !== first.channels || f.sampleRate !== first.sampleRate ||
        f.bitsPerSample !== first.bitsPerSample || f.audioFormat !== first.audioFormat) {
      throw new Error("Ses parçalarının WAV biçimleri aynı değil.");
    }
  }
  const dataLength = parsed.reduce((sum, item) => sum + item.data.byteLength, 0);
  const output = new ArrayBuffer(44 + dataLength);
  const view = new DataView(output);
  const bytes = new Uint8Array(output);
  const write = (at, value) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + dataLength, true); write(8, "WAVE");
  write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, first.channels, true); view.setUint32(24, first.sampleRate, true);
  view.setUint32(28, first.byteRate, true); view.setUint16(32, first.blockAlign, true);
  view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, dataLength, true);
  let cursor = 44;
  for (const item of parsed) { bytes.set(item.data, cursor); cursor += item.data.byteLength; }
  return new Blob([output], { type: "audio/wav" });
}

export function createHalimAIEngine(runtime, options = {}) {
  if (!runtime || typeof runtime.synthesizeChunk !== "function") {
    throw new Error("Halim AI Engine model çalışma zamanı henüz yüklenmedi.");
  }
  const config = { ...DEFAULTS, ...options };
  return {
    split: text => splitTextIntoChunks(text, config),
    async synthesize(text, { voiceSample, onProgress, signal } = {}) {
      if (!voiceSample) throw new Error("Kendi sesine ait WAV örneği seçilmelidir.");
      const chunks = splitTextIntoChunks(text, config);
      if (!chunks.length) throw new Error("Seslendirilecek metin boş.");
      const audioParts = [];
      for (let index = 0; index < chunks.length; index++) {
        if (signal?.aborted) throw new DOMException("İşlem iptal edildi.", "AbortError");
        let lastError;
        for (let attempt = 0; attempt <= config.retries; attempt++) {
          try {
            const part = await runtime.synthesizeChunk(chunks[index], { voiceSample, signal, index, total: chunks.length });
            if (!(part instanceof Blob) || !part.size) throw new Error("Motor boş ses parçası döndürdü.");
            audioParts.push(part);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            if (attempt < config.retries) await sleep(config.retryDelayMs * (attempt + 1));
          }
        }
        if (lastError) throw new Error((index + 1) + ". parça üretilemedi: " + lastError.message);
        onProgress?.({ completed: index + 1, total: chunks.length, text: chunks[index] });
      }
      return joinPcmWav(audioParts);
    }
  };
}
