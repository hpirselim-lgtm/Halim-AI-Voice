import { inspectDevice, releaseDevice, formatBytes } from "./vocoloco-integration.js";

const button = document.getElementById("checkEngineButton");
const status = document.getElementById("engineCheckStatus");
const details = document.getElementById("engineCheckDetails");

button?.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "WebGPU ve cihaz kaynakları kontrol ediliyor…";
  details.textContent = "Bu işlem ses dosyalarını değiştirmez ve model indirmez.";
  let report;
  try {
    report = await inspectDevice();
    const lines = [
      "Güvenli bağlantı: " + (report.secureContext ? "Evet" : "Hayır"),
      "WebGPU: " + (report.webgpu ? "Var" : "Yok"),
      report.adapter ? "GPU maksimum bellek bloğu: " + formatBytes(report.adapter.maxBufferSize) : "",
      report.storage ? "Tarayıcı depolama kullanımı: " + formatBytes(report.storage.usageBytes) : "",
      report.storage ? "Tarayıcı depolama kotası: " + formatBytes(report.storage.quotaBytes) : "",
      report.storage ? "Kalıcı depolama izni: " + (report.storage.persistent ? "Var" : "Yok") : ""
    ].filter(Boolean);
    status.textContent = report.reason;
    details.textContent = lines.join(" · ");
    releaseDevice(report.device);
  } catch (error) {
    status.textContent = "Kontrol tamamlanamadı: " + (error?.message || "Bilinmeyen hata");
  } finally {
    button.disabled = false;
  }
});
