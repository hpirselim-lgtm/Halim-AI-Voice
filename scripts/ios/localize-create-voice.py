#!/usr/bin/env python3
"""Localize the upstream Create Voice screen for Halim AI Voice (Turkish)."""
from pathlib import Path

p = Path("/tmp/chatterbox-coreml/ChatterboxApp/ChatterboxApp/CreateVoiceView.swift")
s = p.read_text(encoding="utf-8")

pairs = [
    ("Read this aloud — with feeling!", "Duygulu bir şekilde sesli oku"),
    ("Perform it — whisper the whisper, sound excited at the “!”, lift your voice at the “?”. The more expression you give, the more of your voice the clone captures.", "Noktalama işaretlerine dikkat et. Soru cümlelerinde sesini yükselt, heyecanlı bölümleri canlı oku. Doğal ve anlaşılır konuşmaya çalış."),
    ("Reference audio", "Ses kaydı"),
    ("Tap Record and read the passage above (about 25–30 seconds), then tap Stop. Or import an existing clip of clear, expressive speech.", "Kaydet düğmesine basıp yukarıdaki metni yaklaşık 25–30 saniyede oku, ardından Durdur'a bas. İstersen anlaşılır ve temiz bir ses kaydını da içe aktarabilirsin."),
    ("Stop (%.1fs)", "Durdur (%.1fs)"),
    ("Record", "Kaydet"),
    ("Re-record", "Yeniden kaydet"),
    ("Import audio file…", "Ses dosyası seç…"),
    ("Imported: ", "Seçildi: "),
    ("Using: ", "Kullanılacak kayıt: "),
    ("Name", "Ses profili adı"),
    ("Voice name (e.g. My Voice)", "Örn. Benim Sesim"),
    ("Please enter a valid name.", "Lütfen geçerli bir ad girin."),
    ("Cloning voice…", "Ses profili oluşturuluyor…"),
    ("Done.", "Tamamlandı."),
    ("Failed: ", "Hata: "),
    ("Create Voice", "Sesimi Oluştur"),
    ("Cancel", "İptal"),
    ("Create", "Oluştur"),
]

# Replace the sample recording passage with a Turkish text of similar duration.
start = '    private static let readAloud = """'
end = '    """'
a = s.find(start)
if a < 0:
    raise SystemExit("Could not find read-aloud passage start")
b = s.find(end, a + len(start))
if b < 0:
    raise SystemExit("Could not find read-aloud passage end")
b += len(end)
turkish_passage = '''    private static let readAloud = """
    “Merhaba, beni duyabiliyor musunuz?” diye sordu. Sesi sakindi, fakat içinde tatlı bir heyecan vardı.

    Bir an durdu, derin bir nefes aldı ve gülümseyerek devam etti.

    “Bugün kendi sesimi kullanarak bir metni okutmayı deniyorum. Kelimeleri açıkça, acele etmeden ve doğal vurgularla söylemek istiyorum.”

    Sonra şaşkınlıkla ekledi: “Gerçekten ilginç, değil mi?”

    Bazen küçük bir deneme, yepyeni bir başlangıca dönüşebilir. İşte bugün benim için böyle bir gün.
    """'''
s = s[:a] + turkish_passage + s[b:]

for old, new in pairs:
    s = s.replace(old, new)

p.write_text(s, encoding="utf-8")
print("Localized Create Voice screen and recording passage into Turkish.")
