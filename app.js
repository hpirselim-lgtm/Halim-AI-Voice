const DB_NAME = "halim-ai-voice";
const STORE = "recordings";
let db;
let recorder;
let activeStream;
let chunks = [];

const $ = (id) => document.getElementById(id);
const recordButton = $("recordButton");
const stopButton = $("stopButton");
const statusLine = $("recordStatus");

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function safeDate(value) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function refreshRecordings() {
  const all = await transaction("readonly", store => store.getAll());
  all.sort((a, b) => b.createdAt - a.createdAt);
  $("recordingCount").textContent = all.length + (all.length === 1 ? " kayıt" : " kayıt");
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
    name.textContent = item.name;
    const meta = document.createElement("div");
    meta.className = "recording-meta";
    meta.textContent = safeDate(item.createdAt) + " · " + formatBytes(item.blob.size) + " · " + item.blob.type;
    info.append(name, meta);
    top.append(info);
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    const objectUrl = URL.createObjectURL(item.blob);
    audio.src = objectUrl;
    audio.addEventListener("emptied", () => URL.revokeObjectURL(objectUrl), { once: true });
    const tools = document.createElement("div");
    tools.className = "recording-tools";
    const download = document.createElement("button");
    download.className = "mini-button";
    download.textContent = "İndir";
    download.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = objectUrl;
      const extension = item.blob.type.includes("mp4") ? "m4a" : item.blob.type.includes("ogg") ? "ogg" : item.blob.type.includes("wav") ? "wav" : "webm";
      link.download = item.name.replace(/[^a-z0-9-_ğüşöçıİĞÜŞÖÇ ]/gi, "_") + "." + extension;
      link.click();
    });
    const remove = document.createElement("button");
    remove.className = "mini-button delete-button";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!confirm("Bu ses kaydını cihazdan silmek istiyor musun?")) return;
      await transaction("readwrite", store => store.delete(item.id));
      URL.revokeObjectURL(objectUrl);
      refreshRecordings();
    });
    tools.append(download, remove);
    row.append(top, audio, tools);
    container.append(row);
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    statusLine.textContent = "Bu tarayıcıda ses kaydı desteklenmiyor. iPhone'da Safari'nin güncel sürümünü kullan.";
    return;
  }
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(type => MediaRecorder.isTypeSupported(type));
    recorder = mimeType ? new MediaRecorder(activeStream, { mimeType }) : new MediaRecorder(activeStream);
    chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { statusLine.textContent = "Kayıt sırasında hata oluştu."; };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "application/octet-stream" });
      if (blob.size) {
        const name = $("recordingName").value.trim() || ("Ses kaydı " + new Date().toLocaleString("tr-TR"));
        await transaction("readwrite", store => store.add({ id: crypto.randomUUID(), name, createdAt: Date.now(), blob }));
        $("recordingName").value = "";
        statusLine.textContent = "Kayıt cihazına kaydedildi.";
        await refreshRecordings();
      } else {
        statusLine.textContent = "Kayıt boş görünüyor; tekrar deneyebilirsin.";
      }
      activeStream?.getTracks().forEach(track => track.stop());
      activeStream = null;
      recordButton.disabled = false;
      stopButton.disabled = true;
    };
    recorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
    statusLine.textContent = "Kayıt yapılıyor… Bitirmek için Kaydı bitir'e dokun.";
  } catch (error) {
    statusLine.textContent = error.name === "NotAllowedError" ? "Mikrofon izni verilmedi. Safari ayarlarından mikrofon iznini aç." : "Mikrofon başlatılamadı: " + error.message;
    activeStream?.getTracks().forEach(track => track.stop());
  }
}

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", () => {
  if (recorder && recorder.state !== "inactive") recorder.stop();
});

(async () => {
  try {
    db = await openDatabase();
    await refreshRecordings();
  } catch (error) {
    statusLine.textContent = "Cihaz içi kayıt alanı açılamadı: " + error.message;
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
})();