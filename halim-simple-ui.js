import { createHalimAIEngine } from "./halim-ai-engine.js";

const text = document.getElementById("speechText");
const titleInput = document.getElementById("speechTitle");
const button = document.getElementById("generateSpeechButton");
const saveTextButton = document.getElementById("saveTextButton");
const status = document.getElementById("speechStatus");
const audioOutput = document.getElementById("generatedAudio");
const savedTextsEl = document.getElementById("savedTexts");
const savedAudioEl = document.getElementById("savedAudio");

const PROFILE_DB = "halim-ai-voice-profile";
const PROFILE_STORE = "profiles";
const PROFILE_ID = "halim-primary-voice";
const LIBRARY_DB = "halim-ai-library";
const LIBRARY_VERSION = 1;

function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LIBRARY_DB, LIBRARY_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("texts")) db.createObjectStore("texts", { keyPath: "id" });
      if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Yerel arşiv açılamadı."));
  });
}
function storeRequest(store, mode, action, value) {
  return new Promise((resolve, reject) => {
    const request = store[action](value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function allRecords(name) {
  const db = await openLibrary();
  try { return await storeRequest(db.transaction(name, "readonly").objectStore(name), "readonly", "getAll"); }
  finally { db.close(); }
}
async function putRecord(name, record) {
  const db = await openLibrary();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(name, "readwrite");
      tx.objectStore(name).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Kayıt saklanamadı."));
      tx.onabort = () => reject(tx.error || new Error("Kayıt işlemi iptal edildi."));
    });
  } finally { db.close(); }
}
async function deleteRecord(name, id) {
  const db = await openLibrary();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(name, "readwrite");
      tx.objectStore(name).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Kayıt silinemedi."));
    });
  } finally { db.close(); }
}
function makeId() {
  return globalThis.crypto?.randomUUID?.() || "r" + Date.now() + Math.random().toString(16).slice(2);
}
function displayDate(value) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
function currentTitle() {
  const explicit = titleInput.value.trim();
  if (explicit) return explicit;
  const firstLine = text.value.trim().split("\n").find(line => line.trim()) || "Başlıksız metin";
  return firstLine.slice(0, 80);
}
async function saveCurrentText(showMessage = true) {
  const body = text.value.trim();
  if (!body) {
    if (showMessage) status.textContent = "Kaydetmek için önce metin yaz.";
    return null;
  }
  const record = { id: makeId(), title: currentTitle(), text: body, createdAt: Date.now(), updatedAt: Date.now() };
  await putRecord("texts", record);
  await renderLibraries();
  if (showMessage) status.textContent = "Metin başlığıyla birlikte bu cihaza kaydedildi.";
  return record;
}
async function readHalimProfile() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PROFILE_DB, 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) { db.close(); resolve(null); return; }
      const get = db.transaction(PROFILE_STORE, "readonly").objectStore(PROFILE_STORE).get(PROFILE_ID);
      get.onsuccess = () => { const value = get.result || null; db.close(); resolve(value); };
      get.onerror = () => { db.close(); reject(get.error); };
    };
    request.onerror = () => reject(request.error);
  });
}
function renderTextRecords(records) {
  savedTextsEl.replaceChildren();
  if (!records.length) {
    savedTextsEl.innerHTML = '<p class="empty">Henüz kaydedilmiş metin yok.</p>';
    return;
  }
  records.sort((a,b) => b.updatedAt - a.updatedAt).forEach(record => {
    const item = document.createElement("article");
    item.className = "library-item";
    const heading = document.createElement("strong");
    heading.textContent = record.title;
    const meta = document.createElement("small");
    meta.textContent = displayDate(record.updatedAt || record.createdAt);
    const preview = document.createElement("p");
    preview.textContent = record.text.slice(0, 150) + (record.text.length > 150 ? "…" : "");
    const actions = document.createElement("div");
    actions.className = "library-actions";
    const open = document.createElement("button");
    open.className = "mini-button";
    open.textContent = "Metni aç";
    open.addEventListener("click", () => {
      titleInput.value = record.title;
      text.value = record.text;
      window.scrollTo({ top: 0, behavior: "smooth" });
      status.textContent = "Kaydedilmiş metin düzenleme alanına getirildi.";
    });
    const remove = document.createElement("button");
    remove.className = "mini-button delete-button";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!confirm("Bu metin kaydını silmek istiyor musun?")) return;
      await deleteRecord("texts", record.id);
      await renderLibraries();
    });
    actions.append(open, remove);
    item.append(heading, meta, preview, actions);
    savedTextsEl.append(item);
  });
}
function renderAudioRecords(records) {
  savedAudioEl.replaceChildren();
  if (!records.length) {
    savedAudioEl.innerHTML = '<p class="empty">Henüz oluşturulmuş ses yok.</p>';
    return;
  }
  records.sort((a,b) => b.createdAt - a.createdAt).forEach(record => {
    const item = document.createElement("article");
    item.className = "library-item";
    const heading = document.createElement("strong");
    heading.textContent = record.title;
    const meta = document.createElement("small");
    meta.textContent = displayDate(record.createdAt) + " · İlgili metin saklandı";
    const player = document.createElement("audio");
    player.controls = true;
    const url = URL.createObjectURL(record.audioBlob);
    player.src = url;
    const download = document.createElement("a");
    download.className = "mini-button";
    download.href = url;
    download.download = (record.title || "halim-ses").replace(/[^\p{L}\p{N}-]+/gu, "-") + ".wav";
    download.textContent = "Sesi indir";
    const preview = document.createElement("p");
    preview.textContent = record.text.slice(0, 150) + (record.text.length > 150 ? "…" : "");
    item.append(heading, meta, preview, player, download);
    savedAudioEl.append(item);
  });
}
async function renderLibraries() {
  const [texts, audio] = await Promise.all([allRecords("texts"), allRecords("audio")]);
  renderTextRecords(texts);
  renderAudioRecords(audio);
}
saveTextButton.addEventListener("click", async () => {
  saveTextButton.disabled = true;
  try { await saveCurrentText(); }
  catch (error) { status.textContent = "Metin kaydedilemedi: " + error.message; }
  finally { saveTextButton.disabled = false; }
});

let fixedVoiceProfile = null;
try {
  fixedVoiceProfile = await readHalimProfile();
  status.textContent = fixedVoiceProfile?.referenceAudio
    ? "Halim'in ses profili bulundu. Metin hafızası ve ses arşivi bu cihazda hazır."
    : "Metin hafızası hazır. Halim'in ses profili bu tarayıcıda henüz bulunamadı.";
} catch {
  status.textContent = "Ses profili okunamadı; yerel metin ve ses arşivi kullanılabilir.";
}
await renderLibraries();

button.addEventListener("click", async () => {
  const value = text.value.trim();
  if (!value) { status.textContent = "Önce okutmak istediğin metni yaz."; text.focus(); return; }
  if (!fixedVoiceProfile?.referenceAudio) {
    status.textContent = "Halim'in kayıtlı ses profili bulunamadı. Aynı tarayıcıdaki ses örneği gerekli.";
    return;
  }
  const runtime = globalThis.HalimAIEngineRuntime;
  if (!runtime || typeof runtime.synthesizeChunk !== "function") {
    status.textContent = "Metin ve arşiv hazır. Gerçek ses üretimi için OmniVoice çalışma motoru henüz bağlanmadı; ses üretilmedi.";
    return;
  }
  button.disabled = true;
  saveTextButton.disabled = true;
  status.textContent = "Metin parçalara ayrılıyor ve seslendiriliyor…";
  try {
    const engine = createHalimAIEngine(runtime);
    const blob = await engine.synthesize(value, {
      voiceSample: fixedVoiceProfile.referenceAudio,
      onProgress: progress => { status.textContent = "Seslendiriliyor: " + progress.completed + "/" + progress.total; }
    });
    const record = {
      id: makeId(), title: currentTitle(), text: value, audioBlob: blob,
      createdAt: Date.now(), sampleRate: 24000, language: "tr-TR"
    };
    await putRecord("audio", record);
    await saveCurrentText(false);
    const url = URL.createObjectURL(blob);
    audioOutput.replaceChildren();
    const player = document.createElement("audio");
    player.controls = true; player.src = url;
    const download = document.createElement("a");
    download.className = "button primary"; download.href = url;
    download.download = "halim-seslendirme.wav"; download.textContent = "Sesi indir";
    audioOutput.append(player, download);
    audioOutput.hidden = false;
    await renderLibraries();
    status.textContent = "Ses üretildi; ilgili metinle birlikte ses arşivine kaydedildi.";
  } catch (error) {
    status.textContent = "Ses üretilemedi: " + (error?.message || "Bilinmeyen hata");
  } finally {
    button.disabled = false;
    saveTextButton.disabled = false;
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(error => {
    console.warn("Çevrimdışı uygulama kaydı yapılamadı:", error);
  });
}
