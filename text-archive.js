"use strict";

const DB_NAME = "halim-ai-text-archive";
const STORE = "texts";
const STARTER_TEXT = "Kara Tanker Operatörü Nasıl Olunur?\n\nBir akaryakıt tankerinin direksiyonuna geçmek, bu mesleği yapmak için yeterli midir? Kesinlikle hayır.\n\nÇünkü kara tanker operatörlüğü, dışarıdan göründüğü gibi yalnızca bir aracı kullanarak yakıtı bir noktadan başka bir noktaya taşımak değildir.\n\nBu meslekte sürüş kadar önemli olan başka bir konu vardır: Taşınan ürünü tanımak, yükleme planını doğru anlamak, tanker bölmelerini bilmek ve teslimatın her aşamasını kontrol altında tutmak.\n\nKara tanker operatörlüğünde işin en kolay kısmı aracı sürmektir. Operatörün sorumluluğu, yükleme tesisine giriş yaptığı andan itibaren başlar. Yükün doğru şekilde yüklenmesi, güvenli bir şekilde taşınması ve eksiksiz teslim edilmesine kadar devam eder.\n\nPeki, bu mesleğe girmek isteyen bir kişi nereden başlamalı? Hangi belgelere sahip olmalı? İşe nasıl girmeli ve kendisini nasıl yetiştirmeli?\n\nBu videoda kara tanker operatörlüğüne ilk adımı atmak isteyenler için mesleğin gerekliliklerini, çalışma düzenini ve bilinmesi gereken temel konuları baştan sona ele alacağız.";
const STARTER_TITLE = "Kara Tanker Operatörü Nasıl Olunur?";

const byId = id => document.getElementById(id);
let textDb;

function openTextDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Metin arşivi açılamadı."));
  });
}
function textTransaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = textDb.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    let result;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error("Metin işlemi başarısız."));
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("Metin arşivi işlemi başarısız."));
  });
}
async function refreshTextArchive() {
  const entries = (await textTransaction("readonly", store => store.getAll()))
    .sort((a,b) => b.updatedAt - a.updatedAt);
  const select = byId("savedTextSelect");
  const previous = select.value;
  select.replaceChildren(new Option("Metin seç", ""));
  for (const item of entries) select.add(new Option(item.title, item.id));
  if (entries.some(item => item.id === previous)) select.value = previous;
  byId("loadSavedTextButton").disabled = !select.value;
  const list = byId("savedTextList");
  list.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Henüz kayıtlı metin yok.";
    list.append(empty);
    return;
  }
  for (const item of entries) {
    const row = document.createElement("div");
    row.className = "recording";
    const heading = document.createElement("div");
    heading.className = "recording-name";
    heading.textContent = item.title;
    const meta = document.createElement("div");
    meta.className = "recording-meta";
    meta.textContent = item.body.length.toLocaleString("tr-TR") + " karakter · " +
      new Date(item.updatedAt).toLocaleDateString("tr-TR");
    const actions = document.createElement("div");
    actions.className = "recording-tools";
    const edit = document.createElement("button");
    edit.className = "mini-button";
    edit.textContent = "Düzenle";
    edit.addEventListener("click", () => {
      byId("archiveTextTitle").value = item.title;
      byId("archiveTextBody").value = item.body;
      byId("textArchiveStatus").textContent = "Metin düzenleme alanına alındı. Kaydettiğinde güncellenecek.";
      byId("saveArchiveTextButton").dataset.editId = item.id;
      byId("archiveTextTitle").focus();
    });
    const remove = document.createElement("button");
    remove.className = "mini-button delete-button";
    remove.textContent = "Sil";
    remove.addEventListener("click", async () => {
      if (!confirm("Bu metni cihazındaki arşivden silmek istiyor musun?")) return;
      await textTransaction("readwrite", store => store.delete(item.id));
      byId("textArchiveStatus").textContent = "Metin arşivden silindi.";
      await refreshTextArchive();
    });
    actions.append(edit, remove);
    row.append(heading, meta, actions);
    list.append(row);
  }
}
async function saveText() {
  const title = byId("archiveTextTitle").value.trim();
  const body = byId("archiveTextBody").value.trim();
  if (!title || !body) {
    byId("textArchiveStatus").textContent = "Kaydetmek için başlık ve metin alanlarını doldur.";
    return;
  }
  const button = byId("saveArchiveTextButton");
  const editId = button.dataset.editId;
  const item = {
    id: editId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    title, body, updatedAt: Date.now()
  };
  await textTransaction("readwrite", store => store.put(item));
  button.dataset.editId = "";
  byId("archiveTextTitle").value = "";
  byId("archiveTextBody").value = "";
  byId("textArchiveStatus").textContent = "Metin bu cihazdaki arşive kaydedildi.";
  await refreshTextArchive();
}
async function seedApprovedText() {
  const entries = await textTransaction("readonly", store => store.getAll());
  if (!entries.some(item => item.title === STARTER_TITLE)) {
    await textTransaction("readwrite", store => store.add({
      id: "approved-kara-tanker-opening-2026-11-13",
      title: STARTER_TITLE,
      body: STARTER_TEXT,
      updatedAt: Date.now()
    }));
  }
}
async function initTextArchive() {
  try {
    textDb = await openTextDb();
    await seedApprovedText();
    await refreshTextArchive();
    byId("savedTextSelect").addEventListener("change", () => {
      byId("loadSavedTextButton").disabled = !byId("savedTextSelect").value;
    });
    byId("loadSavedTextButton").addEventListener("click", async () => {
      const item = await textTransaction("readonly", store => store.get(byId("savedTextSelect").value));
      if (!item) return;
      const speech = byId("speechText");
      speech.value = item.body;
      speech.dispatchEvent(new Event("input", { bubbles: true }));
      byId("speechStudio").scrollIntoView({ behavior: "smooth", block: "start" });
      byId("textArchiveStatus").textContent = "“" + item.title + "” seslendirme alanına aktarıldı. Ses üretim motoru henüz bağlanmadığı için şu an üretim yapılamaz.";
    });
    byId("saveArchiveTextButton").addEventListener("click", saveText);
  } catch (error) {
    byId("textArchiveStatus").textContent = "Metin arşivi başlatılamadı: " + error.message;
  }
}
initTextArchive();
