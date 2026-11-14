# Halim AI Voice

Kişisel Türkçe ses stüdyosu. Web arayüzü GitHub Pages üzerinde, kişisel ses klonlama motoru ise ayrı ve parola korumalı sunucuda çalışacak şekilde hazırlanıyor.

## Özellikler
- iPhone Safari üzerinden mikrofonla ses kaydı
- Kayıtları IndexedDB içinde cihazda saklama
- Kayıtları dinleme, indirme ve silme
- 5–10 saniyelik mono 24 kHz WAV ses örneği hazırlama
- Ayrı sunucuya parola ile bağlanma
- Pocket TTS Turkish ile kişisel sesle Türkçe metin üretimi için API arayüzü
- Üretilen WAV sesini dinleme ve indirme

## Mimari ve gizlilik
- GitHub deposunda uygulama kaynak kodu bulunur; kişisel ses kayıtları ve model ağırlıkları depoya eklenmez.
- Kısa ses örneği, kullanıcı Sunucuya gönder düğmesine bastığında HTTPS üzerinden yalnızca yapılandırılmış kişisel API sunucusuna gönderilir.
- Sunucu erişimi APP_PASSWORD ile açılan ve 12 saat geçerli imzalı oturum anahtarıyla korunur.
- Sunucu referans sesini ve model önbelleğini kalıcı /data diskinde tutar.
- Uygulamada sunucudaki referans sesi silme işlemi bulunur.
- Cihazdaki ses arşivi IndexedDB'de kalır; tarayıcı verileri temizlenirse silinebilir.

## Sunucu kurulumu
Sunucu kodu ve dağıtım adımları için SERVER-DEPLOYMENT.md dosyasına bak. Render kurulumu yapılmadan önce güncel ücretler kontrol edilmeli ve kullanıcı tarafından onaylanmalıdır. Sunucu URL'si uygulama içindeki Sunucu adresi alanına girilir.

## Model
Pocket TTS Turkish, 5–10 saniyelik tek konuşmacı ses örneğiyle ses taklidi ve Türkçe metin üretimi sunar. Paket kodu Apache-2.0, model ağırlıkları CC-BY-4.0 lisanslıdır. Model ilk çalıştırmada sunucuya indirilir; yaklaşık 440 MB alan gerektirir. Kaynak ve atıf bilgileri upstream proje sayfasında yer alır:
https://github.com/witetech/pocket-tts-turkish

## Yayın
GitHub Pages, main dalındaki web arayüzünü yayınlar. Sunucu ayrı dağıtılır. Mikrofon erişimi için HTTPS ve kullanıcı izni gerekir.

## Mevcut durum
Web arayüzü ve sunucu API iskeleti depoya eklenmiştir. Render servisi henüz oluşturulmamış, model ilk kez indirilmemiş ve gerçek ses üretimi uçtan uca test edilmemiştir. Bu nedenle çevrim içi ses klonlama henüz kullanıma hazır olarak değerlendirilmemelidir.
