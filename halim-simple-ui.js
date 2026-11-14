const text = document.getElementById("speechText");
const button = document.getElementById("generateSpeechButton");
const status = document.getElementById("speechStatus");
const audioOutput = document.getElementById("generatedAudio");

const PROFILE_DB = "halim-ai-voice-profile";
const PROFILE_STORE = "profiles";
const PROFILE_ID = "halim-primary-voice";

function readHalimProfile() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PROFILE_DB, 1);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        db.close();
        resolve(null);
        return;
      }
      const get = db.transaction(PROFILE_STORE, "readonly").objectStore(PROFILE_STORE).get(PROFILE_ID);
      get.onsuccess = () => { const value = get.result || null; db.close(); resolve(value); };
      get.onerror = () => { db.close(); reject(get.error); };
    };
    request.onerror = () => reject(request.error);
  });
}

let fixedVoiceProfile = null;
readHalimProfile().then(profile => {
  fixedVoiceProfile = profile;
  status.textContent = profile?.referenceAudio
    ? "Halim'in kayıtlı ses profili hazır."
    : "Halim'in sabit ses profili bu tarayıcıda henüz bulunamadı.";
}).catch(() => {
  status.textContent = "Halim'in ses profili okunamadı. Aynı tarayıcıdaki kayıtlı profil kullanılmalı.";
});

button.addEventListener("click", async () => {
  const value = text.value.trim();
  if (!value) {
    status.textContent = "Önce okutmak istediğin metni yaz.";
    text.focus();
    return;
  }
  if (!fixedVoiceProfile?.referenceAudio) {
    status.textContent = "Halim'in kayıtlı ses profili bulunamadı. Mevcut ses profili bu tarayıcıya aktarılmalı.";
    return;
  }
  const engine = globalThis.HalimAIEngineRuntime;
  if (!engine || typeof engine.synthesize !== "function") {
    status.textContent = "Ses profili bulundu. Ancak gerçek Türkçe ses üretim motoru henüz bu ekrana bağlanmadı; henüz ses üretilmedi.";
    return;
  }
  button.disabled = true;
  status.textContent = "Metin Halim'in sesiyle hazırlanıyor…";
  try {
    const blob = await engine.synthesize(value, { voiceSample: fixedVoiceProfile.referenceAudio });
    const url = URL.createObjectURL(blob);
    audioOutput.replaceChildren();
    const player = document.createElement("audio");
    player.controls = true;
    player.src = url;
    const download = document.createElement("a");
    download.className = "button primary";
    download.href = url;
    download.download = "halim-seslendirme.wav";
    download.textContent = "Sesi indir";
    audioOutput.append(player, download);
    audioOutput.hidden = false;
    status.textContent = "Seslendirme tamamlandı.";
  } catch (error) {
    status.textContent = "Ses üretilemedi: " + (error?.message || "Bilinmeyen hata");
  } finally {
    button.disabled = false;
  }
});
