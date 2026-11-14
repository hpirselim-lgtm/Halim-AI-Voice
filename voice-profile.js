const SOURCE_DB = "halim-ai-voice";
const SOURCE_STORE = "recordings";
const PROFILE_DB = "halim-ai-voice-profile";
const PROFILE_STORE = "profiles";
const PROFILE_ID = "halim-primary-voice";
function openDb(name, storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Yerel veritabanı açılamadı."));
  });
}
function readAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error || new Error("Ses kayıtları okunamadı."));
  });
}
function saveProfile(db, profile) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROFILE_STORE, "readwrite");
    tx.objectStore(PROFILE_STORE).put(profile);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("Ses profili kaydedilemedi."));
  });
}
async function init() {
  const select = document.getElementById("halimVoiceSample");
  const button = document.getElementById("prepareHalimVoice");
  const status = document.getElementById("halimVoiceProfileStatus");
  if (!select || !button || !status) return;
  try {
    const sourceDb = await openDb(SOURCE_DB, SOURCE_STORE);
    const recordings = await readAll(sourceDb, SOURCE_STORE);
    const candidates = recordings.filter(item => item.blob && ((item.blob.type || "").includes("wav") || (item.name || "").toLowerCase().endsWith(".wav")) && Number(item.duration) >= 5 && Number(item.duration) <= 10);
    select.replaceChildren(new Option(candidates.length ? "WAV ses örneği seç" : "Önce 5–10 saniyelik WAV örneği oluştur", ""));
    for (const item of candidates) select.add(new Option((item.name || "Ses örneği") + " · " + Number(item.duration).toFixed(1) + " sn", item.id));
    select.addEventListener("change", () => { button.disabled = !select.value; });
    button.addEventListener("click", async () => {
      const item = candidates.find(entry => entry.id === select.value);
      if (!item) return;
      button.disabled = true;
      try {
        const buffer = await item.blob.arrayBuffer();
        const view = new DataView(buffer);
        const read = (at, length) => String.fromCharCode(...new Uint8Array(buffer, at, length));
        if (buffer.byteLength < 44 || read(0, 4) !== "RIFF" || read(8, 4) !== "WAVE") throw new Error("Geçerli WAV dosyası seç.");
        let offset = 12, fmt = null, dataSize = 0;
        while (offset + 8 <= buffer.byteLength) {
          const id = read(offset, 4), size = view.getUint32(offset + 4, true), start = offset + 8;
          if (start + size > buffer.byteLength) throw new Error("WAV dosyası eksik.");
          if (id === "fmt ") fmt = { type: view.getUint16(start, true), channels: view.getUint16(start + 2, true), rate: view.getUint32(start + 4, true), bits: view.getUint16(start + 14, true) };
          if (id === "data") dataSize = size;
          offset = start + size + (size % 2);
        }
        if (!fmt || fmt.type !== 1 || fmt.channels !== 1 || fmt.rate !== 24000 || fmt.bits !== 16 || !dataSize) throw new Error("WAV örneği 24 kHz mono PCM 16-bit olmalı. Uygulamanın WAV örneği aracını kullan.");
        const profileDb = await openDb(PROFILE_DB, PROFILE_STORE);
        await saveProfile(profileDb, { id: PROFILE_ID, name: "Halim", language: "tr-TR", sourceRecordingId: item.id, sourceName: item.name, referenceAudio: item.blob, sampleRate: fmt.rate, channels: fmt.channels, bitsPerSample: fmt.bits, updatedAt: Date.now(), embedding: null, status: "reference-saved-encoder-pending" });
        status.textContent = "Halim ses referansı bu cihazda ayrı olarak kaydedildi. Encoder modeli henüz bağlanmadığı için ses klonlama henüz etkin değil. Orijinal kayıt korundu.";
      } catch (error) { status.textContent = "Ses referansı hazırlanamadı: " + error.message; }
      finally { button.disabled = !select.value; }
    });
    status.textContent = candidates.length + " uygun WAV örneği bulundu. Yalnızca Halim profili ve Türkçe kullanılacak.";
  } catch (error) { status.textContent = "Ses profili başlatılamadı: " + error.message; }
}
init();
