# Halim AI Voice — çevrim içi sunucu kurulumu

## Mimari
- Web uygulaması GitHub Pages üzerinde kalır.
- Ses klonlama API'si ayrı bir Render Docker servisi olarak çalışır.
- Pocket TTS Turkish CPU üzerinde çalışır; model ağırlıkları ilk başlatmada Hugging Face üzerinden sunucu diskine indirilir.
- Ses örneği yalnızca bu API'ye, parola ile açılan imzalı oturum üzerinden gönderilir.
- Referans ses ve model önbelleği /data kalıcı diskinde tutulur. GitHub deposuna ses dosyası veya model ağırlığı konmaz.

## Güvenlik
Render ortam değişkenleri:
- APP_PASSWORD: güçlü ve benzersiz parola.
- TOKEN_SECRET: en az 32 karakterlik rastgele gizli anahtar; Render blueprint bunu otomatik üretir.
- CORS_ORIGIN: GitHub Pages uygulama adresi.

API oturumu 12 saat geçerlidir. Ses yükleme sınırı 15 MB, metin sınırı 2.500 karakterdir. Korumalı ses silme uç noktası bulunur.

## Dağıtım
1. Render hesabında New > Blueprint seç ve bu depoyu bağla.
2. render.yaml dosyasını incele. Blueprint starter planında kalıcı 5 GB disk tanımlar. Ücretli kaynak oluşturmadan önce Render'ın güncel fiyatını kontrol et ve onayla.
3. APP_PASSWORD için uzun, benzersiz bir parola gir.
4. Deploy tamamlanınca servis URL'sinin sonuna /health ekleyerek sağlık kontrolü yap.
5. Servis URL'sini web uygulamasındaki Sunucu adresi alanına gir.

## Önemli
- Bu servis henüz Render hesabına dağıtılmış değildir.
- İlk model indirmesi yaklaşık 440 MB'dır; ilk başlatma uzun sürebilir.
- Üretim kalitesi ve sunucu performansı gerçek denemeyle değerlendirilmelidir.
- /data diski silinirse yüklenmiş ses referansı ve model önbelleği kaybolabilir.
- Kullanıcı /api/voice DELETE isteğiyle referans sesini silebilir.
- Model ağırlıkları CC-BY-4.0, paket kodu Apache-2.0 lisanslıdır. Dağıtımda atıf bilgilerini koru.
