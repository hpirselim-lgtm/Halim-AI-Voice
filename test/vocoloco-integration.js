/**
 * Halim AI Voice — VocoLoco WebGPU integration foundation.
 *
 * This module performs capability, memory and storage checks only. It deliberately
 * does not download model weights or claim that speech synthesis is ready.
 * The upstream OmniVoice generation loop and licensed model assets are a
 * separate integration stage.
 */
const MODEL_BASE = "https://huggingface.co/Gigsu/vocoloco-onnx/resolve/main";

export async function inspectDevice() {
  const result = {
    webgpu: Boolean(navigator.gpu),
    secureContext: window.isSecureContext,
    storage: null,
    adapter: null,
    device: null,
    reason: ""
  };

  if (!result.secureContext) {
    result.reason = "WebGPU için HTTPS üzerinden açılmalıdır.";
    return result;
  }
  if (!navigator.gpu) {
    result.reason = "Bu tarayıcı WebGPU sunmuyor. Güncel Safari ve iOS sürümünü kontrol edin.";
    return result;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) throw new Error("Uygun GPU adaptörü bulunamadı.");
    result.adapter = {
      features: [...adapter.features],
      maxBufferSize: adapter.limits.maxBufferSize,
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize
    };
    const requiredFeatures = ["shader-f16", "timestamp-query"].filter(feature => adapter.features.has(feature));
    const limits = adapter.limits;
    result.device = await adapter.requestDevice({
      requiredFeatures,
      requiredLimits: {
        maxStorageBufferBindingSize: limits.maxStorageBufferBindingSize,
        maxBufferSize: limits.maxBufferSize,
        maxComputeWorkgroupStorageSize: limits.maxComputeWorkgroupStorageSize,
        maxComputeInvocationsPerWorkgroup: limits.maxComputeInvocationsPerWorkgroup
      }
    });
    result.reason = "WebGPU kullanılabilir. Model yükleme öncesi bellek ve lisans kontrolleri gerekiyor.";
  } catch (error) {
    result.reason = error?.message || "GPU başlatılamadı.";
  }

  if (navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      result.storage = {
        usageBytes: estimate.usage ?? 0,
        quotaBytes: estimate.quota ?? 0,
        persistent: navigator.storage.persisted ? await navigator.storage.persisted() : false
      };
    } catch (_) { /* Storage estimate is optional. */ }
  }
  return result;
}

export function releaseDevice(device) {
  try { device?.destroy(); } catch (_) { /* already released */ }
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Bilinmiyor";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return value.toFixed(unit ? 1 : 0) + " " + units[unit];
}

export { MODEL_BASE };
