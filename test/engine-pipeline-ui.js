import { splitTextIntoChunks } from "./halim-ai-engine.js";

const button = document.getElementById("prepareEngineTextButton");
const status = document.getElementById("halimEngineStatus");
const preview = document.getElementById("engineChunkPreview");
const source = document.getElementById("speechText");

button?.addEventListener("click", () => {
  const chunks = splitTextIntoChunks(source?.value || "");
  preview.replaceChildren();
  if (!chunks.length) {
    status.textContent = "Önce Türkçe seslendirme alanına bir metin yaz veya metin arşivinden aktar.";
    return;
  }
  chunks.forEach((chunk, index) => {
    const item = document.createElement("li");
    item.textContent = (index + 1) + ". parça · " + chunk.length + " karakter: " + chunk;
    preview.append(item);
  });
  status.textContent = chunks.length + " parça hazırlandı. Cümle bütünlüğü korunarak sırayla üretilecek şekilde planlandı; gerçek ses üretimi için yerel model çalışma zamanı henüz gerekli.";
});
