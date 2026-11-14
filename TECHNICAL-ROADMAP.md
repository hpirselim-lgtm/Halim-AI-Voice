# Halim AI Voice — Teknik Yol Haritası

## Ürün hedefi
Kullanıcının kendi sesinden, yalnızca kendi cihazında çalışan Türkçe kişisel seslendirme sistemi. Ses kayıtları ve kişisel ses profili üçüncü taraf sunuculara gönderilmeyecek.

## Aşama 1 — Yerel kayıt PWA
- [x] iPhone Safari'de açılan PWA arayüzü
- [x] IndexedDB üzerinde cihaz içi ses arşivi
- [x] Orijinal ses dosyasını indirme
- [x] Tarayıcı içinde WAV dönüştürme kodu
- [x] Kayıt süresi ve arşiv boyutunu gösterme
- [ ] Gerçek iPhone üzerinde mikrofon, tekrar oynatma, WAV dışa aktarma ve veri kalıcılığı testleri

Not: WAV dönüştürme tarayıcının ses çözme desteğine bağlıdır; her kayıt biçimi ve her iOS sürümünde doğrulanmış sayılmaz.

## Aşama 2 — Türkçe model seçimi
Model seçimi için zorunlu ölçütler:
1. Türkçe metni doğal telaffuz etmesi.
2. Kullanıcının kendi ses örneğinden ses profili oluşturabilmesi.
3. İnternet olmadan iPhone üzerinde çıkarım yapabilmesi.
4. Model ve uygulama lisanslarının kullanım amacına uygun olması.
5. iPhone 14 Pro Max üzerinde bellek, hız ve ısınma testlerini geçmesi.

### İlk araştırma bulguları
- PocketTTS + FluidAudio, iOS/Core ML üzerinde yerel çalıştırma için teknik açıdan ilgi çekici. Ancak PocketTTS'nin yayımlanmış dil listesinde Türkçe bulunmuyor; bu nedenle Türkçe ürün motoru olarak şu an seçilmedi.
- Qwen3-TTS'nin resmî yayımlanmış dil listesinde Türkçe yok. Topluluk tarafından hazırlanmış Türkçe uyarlamalar deneysel ve telaffuz/aksan sınırlamaları bildiriyor; üretim motoru olarak kabul edilmedi.
- Swift/FluidAudio tabanlı iOS mimarisi, yerel Core ML çalıştırma yönünden incelenmeye değer. Bu, tek başına Türkçe ses klonlama desteğinin hazır olduğu anlamına gelmez.

## Aşama 3 — Yerel iOS uygulaması
PWA kayıt prototipi korunacak. Model yeterliliği doğrulanırsa ayrı bir yerel SwiftUI uygulamasına geçilecek. Bu aşama için Xcode/macOS tabanlı derleme ve gerçek cihaz testi gerekir.

## Gizlilik
- Ses örnekleri GitHub deposuna eklenmez.
- Ses örnekleri, ses profili ve üretilen dosyalar cihazda tutulur.
- Model dosyaları yalnızca ilk kurulum/güncelleme sırasında indirilir; üretim sırasında ağ bağlantısı kullanılmaz.
- Kullanıcı açıkça izin vermedikçe ses hiçbir harici servise aktarılmaz.
