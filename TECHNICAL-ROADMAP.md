# Halim AI Voice — Teknik Yol Haritası

## Ürün hedefi
Kullanıcının kendi sesinden, yalnızca kendi cihazında çalışan Türkçe kişisel seslendirme sistemi. Ses kayıtları ve kişisel ses profili üçüncü taraf sunuculara gönderilmeyecek.

## Aşama 1 — Yerel kayıt PWA
- [x] iPhone Safari'de açılan PWA arayüzü
- [x] IndexedDB üzerinde cihaz içi ses arşivi
- [x] Orijinal ses dosyasını indirme
- [x] Tarayıcı içinde WAV dönüştürme kodu
- [x] Kayıt süresi ve arşiv boyutunu gösterme
- [x] iPhone Dosyalar uygulamasından mevcut ses örneği içe aktarma
- [x] Arşivdeki kayıttan 5–10 saniyelik bölümü seçip mono 24 kHz WAV örneği oluşturma
- [ ] Gerçek iPhone üzerinde mikrofon, oynatma, WAV dışa aktarma ve veri kalıcılığı testleri

Not: WAV dönüştürme tarayıcının ses çözme desteğine bağlıdır; her kayıt biçimi ve iOS sürümünde doğrulanmış sayılmaz.

## Aşama 2 — Türkçe ses motoru ve kişisel ses
İki ayrı teknik problem olarak ele alınır:
1. Türkçe metni doğal konuşmaya dönüştüren temel TTS.
2. Bu TTS sesini kullanıcının kendi ses karakterine uyarlama (voice cloning / fine-tuning).

### Araştırma bulguları (14 Kasım 2026)
- EMA Lightning: Türkçe metin normalizasyonu ve TTS için küçük, Apache-2.0 lisanslı bir model. Proje açıklamasında çevrimdışı CPU/GPU çalışması belirtiliyor. Temel Türkçe TTS adayıdır; tek başına kullanıcının sesini klonladığı anlamına gelmez.
- Elphi Türkçe: EMA Lightning tabanlı Core ML dağıtımı; iPhone/iPad/Mac üzerinde model indirildikten sonra cihazda çevrimdışı seslendirme hedefliyor. Bu, iOS yerel TTS prototipi için önemli bir teknik adaydır; kişisel ses klonlama desteği ayrıca geliştirilmelidir.
- Okur TTS: Küçük Türkçe model; ONNX, Apple MLX ve tarayıcı/WebAssembly çalıştırma seçenekleri var. Tek sesli modeldir; kullanıcının sesini kopyaladığı doğrulanmış değildir.
- FreyaTTS-small: Türkçe odaklı, Apache-2.0 model; Core ML/Apple Silicon performans iddiaları var. Ses klonlama/kişiye özel ses adaptasyonu iPhone üzerinde doğrulanmış değil.
- Ahenk Cep: Küçük cihaz içi Türkçe TTS yaklaşımı; yayımlanan açıklamada öğrenci modelin Ahenk sesini öğrendiği belirtiliyor. Kullanıcının ayrı sesini kolayca kişiselleştirdiği anlamına gelmez.
- OnDeviceTTS/Kokoro iOS paketi: incelenen dağıtımda hazır sesler İngilizce; Türkçe dil yolu hazır değil.

### Yeni bulgu: kişisel sesi taklit edebilen Türkçe modeller

- **Pocket TTS Turkish (şu an birinci prototip adayı):** 110M parametre, yaklaşık 440 MB model, 24 kHz mono çıktı. Kendi sesinden 5–10 saniyelik temiz bir referansla ses profili çıkarabildiği ve beş duygu etiketi sunduğu belgelenmiş. Model ağırlıkları CC-BY-4.0, Python kodu Apache-2.0. Tek CPU iş parçacığında gerçek zamandan hızlı çalıştığı belirtiliyor. Ancak resmî paket Python/PyTorch tabanlı; iPhone Safari/PWA veya Core ML üzerinde yerel çalıştığı doğrulanmış değil. Bu nedenle henüz uygulamaya entegre edilmiş sayılmaz.
- **Anka TTS:** Türkçe zero-shot ses klonlama; 7–9 saniyelik referans ses ve birebir transkript istiyor. 336M parametre. CUDA, Apple MPS ve CPU arka uçları belgelenmiş; ancak iOS uygulaması/Core ML portu gösterilmemiş. Model ağırlıkları CC-BY-NC-4.0 olduğundan ticari kullanım için uygun değil; yalnızca kişisel/hobi/araştırma kullanımı lisans kapsamında.
- **EMA Lightning:** Hızlı ve küçük Türkçe temel TTS; fakat tek sesli ve ses klonlama özelliği yok. Kişisel ses motoru olarak tek başına kullanılamaz.

**Geçici karar:** Pocket TTS Turkish'i araştırma ve cihazda prototipleme için ilk sıraya al. Bu bir iPhone uyumluluk onayı değildir. Önce modelin Python/PyTorch bağımlılıklarını iOS'ta çalıştırmadan nasıl yerel Swift/Core ML veya başka bir mobil çalışma zamanına taşıyabileceğimizi doğrula. Model ağırlıklarını GitHub deposuna veya uygulama kaynaklarına koyma; cihazda indirme/kurulum stratejisi ve lisans atfı ayrıca tasarlanmalı.

### Seçim ilkeleri
1. Türkçe telaffuz ve noktalama başarısı.
2. Kullanıcının kendi kayıtlarından ses kimliği/konuşmacı uyarlaması.
3. Tamamen cihaz üzerinde çıkarım.
4. Model, veri ve kod lisanslarının uygunluğu.
5. iPhone 14 Pro Max'te bellek, hız, ısınma ve kalite testi.

Pocket TTS Turkish'in kendi proje belgeleri, 5–10 saniyelik sesle Türkçe voice cloning desteği iddia ediyor; ancak iOS'a taşınmış yerel bir sürüm veya iPhone 14 Pro Max üzerinde test sonucu doğrulanmadı. UnaMentis/pocket-tts-ios projesi upstream Pocket TTS için native iOS uygulaması ve Rust/Candle altyapısı sunuyor; bunun Türkçe model varyantıyla uyumlu olduğu henüz gösterilmedi. Dolayısıyla kişisel ses klonlaması için aday model mevcut, fakat iPhone'da tamamen çevrimdışı çalışma hâlâ doğrulanmış değil. Önce Türkçe temel TTS'yi Core ML üzerinde test edip, sonra kişisel ses adaptasyonunun mümkün olup olmadığını teknik olarak doğrulayacağız.

## Aşama 3 — Yerel iOS uygulaması
PWA kayıt prototipi korunacak. Model yeterliliği doğrulanırsa ayrı bir yerel SwiftUI uygulamasına geçilecek. Bu aşama için Xcode/macOS tabanlı derleme ve gerçek cihaz testi gerekir.

## Gizlilik
- Ses örnekleri GitHub deposuna eklenmez.
- Ses örnekleri, ses profili ve üretilen dosyalar cihazda tutulur.
- Model dosyaları ilk kurulum/güncelleme sırasında indirilebilir; üretim sırasında ağ bağlantısı kullanılmaz.
- Kullanıcı açıkça izin vermedikçe ses hiçbir harici servise aktarılmaz.
