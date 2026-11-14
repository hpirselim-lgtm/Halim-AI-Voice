# Halim AI Voice

Kişisel ses stüdyosu için cihaz öncelikli PWA prototipi.

## İlk sürüm
- Tarayıcı üzerinden mikrofonla ses kaydı
- Kayıtları IndexedDB içinde bu cihazda saklama
- Kayıtları dinleme, indirme ve silme
- Uygulama kabuğu için çevrimdışı önbellek
- iPhone Safari üzerinden ana ekrana eklenebilir web uygulaması

## Gizlilik
Ses kayıtları herhangi bir sunucuya yüklenmez. GitHub deposunda yalnızca uygulama kaynak kodları bulunur. Kayıtlar tarayıcının yerel IndexedDB alanında saklanır. Tarayıcı verilerini silmek kayıtları da silebilir.

## Önemli sınırlar
Bu sürüm henüz kişisel ses klonlama veya yapay zekâ seslendirme yapmaz. Yapay zekâ motoru, iPhone üzerinde tamamen yerel çalışması ve lisans koşulları doğrulandıktan sonra ayrı bir aşamada entegre edilecektir.

## Yayın
GitHub Actions, `main` dalına yapılan güncellemeleri GitHub Pages üzerinde yayınlar. Mikrofon erişimi için HTTPS ve kullanıcı izni gerekir.