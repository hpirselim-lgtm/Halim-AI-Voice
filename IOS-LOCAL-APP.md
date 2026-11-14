# Halim AI Voice — iPhone'da Yerel Ses Klonlama

## Hedef

Halim AI Voice'in ayrı bir yerel iOS sürümü hazırlanacak. Kullanıcının kendi sesinden profil oluşturma ve Türkçe metni bu sesle okuma işlemleri iPhone üzerinde yapılacak. Ses kayıtları ve oluşturulan ses profili herhangi bir sunucuya gönderilmeyecek.

Mevcut GitHub Pages web sürümü korunur; bu çalışma onu silmez veya mevcut çevrim içi API'yi otomatik olarak değiştirmez.

## Araştırılan motor

- Runtime: [iliasaz/chatterbox-coreml](https://github.com/iliasaz/chatterbox-coreml)
- Multilingual Core ML ağırlıkları: [iliasaz/chatterbox-multilingual-coreml](https://huggingface.co/iliasaz/chatterbox-multilingual-coreml)
- Ana model: Chatterbox Multilingual, 23 dil; Türkçe (tr) dil listesinde.
- Lisans: runtime ve dönüştürülmüş model kartında MIT olarak belirtiliyor; upstream model lisansı ve gerekli atıflar dağıtım öncesi ayrıca korunmalı.
- iOS gereksinimi: runtime README'si iOS 18+ diyor. Örnek Xcode projesinin uygulama hedefi iOS 26 olarak ayarlanmış. Kullanıcının iOS 27 cihazı bu sürüm gereksinimini karşılıyor.
- Modelin Türkçe desteği listelenmiş olsa da geliştirici Türkçe ses kalitesini kulakla doğruladığını belirtmiyor; doğrulanan dil Rusça. Türkçe telaffuz ve ses benzerliği cihaz üzerinde test edilmeden vaat edilmemeli.
- Gerçek cihaz performans ölçümleri iPhone 17 Pro Max'te verilmiş. iPhone 14 Pro Max / A16 için doğrulanmış performans veya bellek sonucu yok.

## Yerel ses klonlama akışı

1. Kullanıcı uygulamada kendi sesini kaydeder veya kendi ses dosyasını seçer.
2. VoiceCloner, Core ML koşullandırma modelleriyle sesi cihazda işler.
3. Oluşan `*-conds.safetensors` ses profili uygulamanın yerel Documents alanında saklanır.
4. Kullanıcı Türkçe metin girer ve dil kodu `tr` ile multilingual modelden WAV üretir.
5. Üretilen WAV cihazda oynatılır veya kullanıcının isteğiyle Dosyalar'a aktarılır.

Model ağırlıkları ilk kullanımda indirilir. İndirme tamamlandıktan sonra model, ses profili ve üretim dosyaları cihazda tutulmalıdır. Çevrimdışı çalışma; ilk indirme ve ilk model yükleme tamamlandıktan sonra doğrulanacaktır.

## Gizlilik

- Ses kaydı, ses profili veya üretilen ses GitHub'a commit edilmeyecek.
- Ses örneği herhangi bir üçüncü taraf ses klonlama API'sine gönderilmeyecek.
- Uygulama model dosyalarını açıkça belirtilen model deposundan indirir; bu indirme ses kaydı içermez.
- Uygulamada analitik/telemetri veya arka planda ses yükleme eklenmeyecek.
- Ses profili ve kayıtlar kullanıcı tarafından uygulama içinden silinebilir olmalı.

## İlk doğrulama planı

1. Upstream Swift package ve demo app'in güncel commit'i sabitlenir.
2. Dil seçicisine Türkçe (`tr`) eklenir ve varsayılan dil yapılır.
3. Uygulama adı, simge ve tüm kullanıcı arayüzü Halim AI Voice / Türkçe olacak şekilde düzenlenir.
4. Xcode Cloud veya macOS GitHub Actions üzerinde imzasız derleme denenir.
5. iPhone 14 Pro Max üzerinde model indirme, bellek kullanımı, ilk yükleme süresi, kayıt klonlama, Türkçe üretim ve uçak modu testi yapılır.
6. Aşırı ısınma, bellek hatası veya kabul edilemez yavaşlık olursa model/quantization alternatifleri araştırılır.

## Dağıtım kısıtları

- Kaynak kodunu hazırlamak ve imzasız CI derlemesi denemek, uygulamanın iPhone'a yüklenmeye hazır olduğu anlamına gelmez.
- Fiziksel cihaza yükleme için Apple imzalama gerekir. TestFlight dağıtımı Apple Developer Program üyeliği gerektirir; ücret onayı olmadan üyelik veya ücretli servis başlatılmaz.
- Bu depo içinde henüz derlenmiş, imzalanmış veya cihazda test edilmiş bir uygulama yoktur.

## Mevcut durum

- [x] Chatterbox Core ML runtime ve multilingual model bulundu.
- [x] Türkçe dil kodu modelin desteklenen dilleri arasında doğrulandı.
- [x] On-device voice cloning akışı kaynak belgelerinde incelendi.
- [x] iOS 18+ runtime gereksinimi ve örnek uygulamanın iOS 26 hedefi incelendi.
- [ ] Türkçe ses kalitesi test edildi.
- [ ] iPhone 14 Pro Max performansı test edildi.
- [ ] Halim AI Voice markalı iOS arayüzü oluşturuldu.
- [x] Upstream Chatterbox Core ML demo uygulaması, GitHub Actions macOS 26 üzerinde imzasız iOS derlemesinden başarıyla geçti (run `43615556093`). Bu yalnızca upstream demo derlemesidir; Halim AI Voice'e özel Türkçe arayüz henüz eklenmedi.
- [ ] iPhone'a yükleme ve çevrimdışı test tamamlandı.

## CI derleme notu

14 Kasım 2026 tarihinde `macos-26` GitHub Actions işinde upstream kaynak kodu sabitlenmiş commit'ten indirildi, Swift paket bağımlılıkları çözüldü ve `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` adımı başarılı tamamlandı. İşlem sonucu: [GitHub Actions run 43615556093](https://github.com/hpirselim-lgtm/Halim-AI-Voice/actions/runs/43615556093). Derleme çıktısı artefakt olarak saklanmadı; dolayısıyla bu işlem iPhone'a yüklenebilir IPA üretildiği anlamına gelmez.
