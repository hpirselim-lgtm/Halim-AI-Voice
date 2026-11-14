"use strict";

const DB_NAME = "halim-ai-voice";
const STORE = "recordings";
let db;
let recorder;
let activeStream;
let chunks = [];
let recordingStartedAt = 0;

const $ = id => document.getElementById(id);
const recordButton = $("recordButton");
const stopButton = $("stopButton");
const statusLine = $("recordStatus");

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Veritabanı açılamadı."));
    request.onblocked = () => reject(new Error("Veritabanı başka bir sekmede açık. Diğer sekmeyi kapatıp yenile."));
  });
}

function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let request;
    try { request = action(tx.objectStore(STORE)); }
    catch (error) { reject(error); return; }
    let result;
    if (request) {
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error || new Error("Kayıt işlemi başarısız."));
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("Veritabanı işlemi başarısız."));
    tx.onabort = () => reject(tx.error || new Error("Veritabanı işlemi iptal edildi."));
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Süre bilinmiyor";
  const s = Math.round(seconds);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function safeDate(value) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function safeFileBase(name) {
  return (name || "Halim_AI_Voice").replace(/[^a-z0-9-_ğüşöçıİĞÜŞÖÇ ]/gi, "_").trim().replace(/\s+/g, "_") || "Halim_AI_Voice";
}
function extensionFor(type) {
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) return "m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("caf")) return "caf";
  return "webm";
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function readAudioDuration(blob) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    audio.src = url;
  });
}
async function updateStorageInfo(totalBytes) {
  const el = $("storageInfo");
  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || totalBytes;
      const quota = estimate.quota;
      el.textContent = "Kayıt arşivi: " + formatBytes(totalBytes) +
        (quota ? " · Tarayıcı alanı: " + formatBytes(used) + " / " + formatBytes(quota) : "");
      return;
    } catch (_) {}
  }
  el.textContent = "Kayıt arşivi: " + formatBytes(totalBytes) + " · Depolama sınırı tarayıcı tarafından yönetilir.";
}
async function convertToWav(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Bu tarayıcıda WAV dönüştürme desteklenmiyor.");
  const context = new AudioContextClass();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const channels = Math.min(buffer.numberOfChannels, 2);
    const sampleRate = buffer.sampleRate;
    const frames = buffer.length;
    const blockAlign = channels * 2;
    const dataSize = frames * blockAlign;
    const wav = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wav);
    const writeText = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    writeText(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); writeText(8, "WAVE");
    writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); writeText(36, "data"); view.setUint32(40, dataSize, true);
    const channelData = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
    let offset = 44;
    for (let i = 0; i < frames; i++) for (let ch = 0; ch < channels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
    return new Blob([wav], { type: "audio/wav" });
  } finally { await context.close().catch(() => {}); }
}

async function refreshRecordings() {
  const all = await transaction("readonly", store => store.getAll());
  all.sort((a, b) => b.createdAt - a.createdAt);
  $("recordingCount").textContent = all.length + " kayıt";
  const totalBytes = all.reduce((sum, item) => sum + (item.blob?.size || 0), 0);
  await updateStorageInfo(totalBytes);
  const container = $("recordings");
  container.replaceChildren();
  if (!all.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Henüz kayıt yok. İlk ses örneğini oluşturabilirsin.";
    container.append(empty);
    return;
  }
  for (const item of all) {
    const row = document.createElement("article");
    row.className = "recording";
    const top = document.createElement("div");
    top.className = "recording-top";
    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "recording-name";
    name.textContent = item.name || "Ses kaydı";
    const meta = document.createElement("div");
    meta.className = "recording-meta";
    meta.textContent = safeDate(item.createdAt) + " · " + formatDuration(item.duration) + " · " +
      formatBytes(item.blob.size) + " · " + (item.blob.type || "ses dosyası");
    info.append(name, meta); top.append(info);
    const audio = document.createElement("audio");
    audio.controls = true; audio.preload = "metadata";
    const objectUrl = URL.createObjectURL(item.blob); audio.src = objectUrl;
    const tools = document.createElement("div"); tools.className = "recording-tools";
    const originalDownload = document.createElement("button");
    originalDownload.className = "mini-button"; originalDownload.textContent = "Orijinali indir";
    originalDownload.addEventListener("click", () => downloadBlob(item.blob, safeFileBase(item.name) + "." + extensionFor(item.blob.type || "")));
    const wavDownload = document.createElement("button");
    wavDownload.className = "mini-button"; wavDownload.textContent = "WAV indir";
    wavDownload.addEventListener("click", async () => {
      wavDownload.disabled = true; wavDownload.textContent = "Dönüştürülüyor…";
      statusLine.textContent = "WAV dönüşümü bu cihazda yapılıyor…";
      try {
        const wav = await convertToWav(item.blob);
        downloadBlob(wav, safeFileBase(item.name) + ".wav");
        statusLine.textContent = "WAV dosyası cihazında oluşturuldu.";
      } catch (error) { statusLine.textContent = "WAV dönüşümü yapılamadı: " + error.message; }
      finally { wavDownload.disabled = false; wavDownload.textContent = "WAV indir"; }
    });
    const remove = document.createElement("button");
    remove.className = "mini-button delete-button"; remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!confirm("Bu ses kaydını bu cihazdan silmek istiyor musun?")) return;
      try {
        await transaction("readwrite", store => store.delete(item.id));
        URL.revokeObjectURL(objectUrl);
        await refreshRecordings(); statusLine.textContent = "Kayıt cihazından silindi.";
      } catch (error) { statusLine.textContent = "Kayıt silinemedi: " + error.message; }
    });
    tools.append(originalDownload, wavDownload, remove);
    row.append(top, audio, tools); container.append(row);
  }
}

async function importAudioFile(file) {
  if (!file) return;
  if (!file.type.startsWith("audio/") && !/\.(m4a|mp3|wav|aac|caf|ogg|flac|mp4)$/i.test(file.name)) {
    statusLine.textContent = "Lütfen desteklenen bir ses dosyası seç.";
    return;
  }
  statusLine.textContent = "Ses dosyası cihazın arşivine ekleniyor…";
  try {
    const duration = await readAudioDuration(file);
    await transaction("readwrite", store => store.add({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
      name: file.name.replace(/\.[^.]+$/, "") || "İçe aktarılan ses",
      createdAt: Date.now(), duration, blob: file
    }));
    await refreshRecordings();
    statusLine.textContent = "Ses dosyası yalnızca bu cihazın arşivine eklendi.";
  } catch (error) {
    statusLine.textContent = "Dosya arşive eklenemedi: " + error.message;
  } finally { $("audioImport").value = ""; }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    statusLine.textContent = "Bu tarayıcıda ses kaydı desteklenmiyor. Güncel iPhone Safari kullan.";
    return;
  }
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
    const supportedTypes = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
    recorder = mimeType ? new MediaRecorder(activeStream, { mimeType }) : new MediaRecorder(activeStream);
    chunks = [];
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = event => { statusLine.textContent = "Kayıt hatası: " + (event.error?.message || "Bilinmeyen hata"); };
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || "application/octet-stream" });
        const duration = Math.max(0, (Date.now() - recordingStartedAt) / 1000);
        if (blob.size) {
          const name = $("recordingName").value.trim() || ("Ses kaydı " + new Date().toLocaleString("tr-TR"));
          await transaction("readwrite", store => store.add({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
            name, createdAt: Date.now(), duration, blob
          }));
          $("recordingName").value = "";
          statusLine.textContent = "Kayıt cihazına kaydedildi · " + formatDuration(duration) + " · " + formatBytes(blob.size);
          await refreshRecordings();
        } else statusLine.textContent = "Kayıt boş görünüyor; tekrar deneyebilirsin.";
      } catch (error) { statusLine.textContent = "Kayıt saklanamadı: " + error.message; }
      finally {
        activeStream?.getTracks().forEach(track => track.stop());
        activeStream = null; chunks = []; recordButton.disabled = false; stopButton.disabled = true;
      }
    };
    recorder.start(1000); recordingStartedAt = Date.now();
    recordButton.disabled = true; stopButton.disabled = false;
    statusLine.textContent = "Kayıt yapılıyor… Bitirmek için Kaydı bitir'e dokun.";
  } catch (error) {
    statusLine.textContent = error.name === "NotAllowedError"
      ? "Mikrofon izni verilmedi. Safari ayarlarından bu site için mikrofon iznini aç."
      : "Mikrofon başlatılamadı: " + error.message;
    activeStream?.getTracks().forEach(track => track.stop()); activeStream = null;
  }
}

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", () => { if (recorder && recorder.state !== "inactive") recorder.stop(); });
$("audioImport").addEventListener("change", event => importAudioFile(event.target.files?.[0]));

(async () => {
  try {
    db = await openDatabase();
    if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
    await refreshRecordings();
  } catch (error) { statusLine.textContent = "Cihaz içi kayıt alanı açılamadı: " + error.message; }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
})();