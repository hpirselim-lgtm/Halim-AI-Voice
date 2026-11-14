#!/usr/bin/env python3
"""Safely localize only visible Swift string literals in CreateVoiceView."""
from pathlib import Path

p = Path("/tmp/chatterbox-coreml/ChatterboxApp/ChatterboxApp/CreateVoiceView.swift")
s = p.read_text(encoding="utf-8")

start = '    private static let readAloud = """'
end = '    """'
a = s.find(start)
if a < 0:
    raise SystemExit("Could not find read-aloud passage start")
b = s.find(end, a + len(start))
if b < 0:
    raise SystemExit("Could not find read-aloud passage end")
b += len(end)
sample = '''    private static let readAloud = """
    Merhaba, beni duyabiliyor musunuz? Bugün kendi sesimle bir metin okumayı deniyorum. Kelimeleri açıkça, acele etmeden ve doğal vurgularla söylemek istiyorum.

    Bazen küçük bir deneme, yepyeni bir başlangıca dönüşebilir. Yeter ki sakin olalım, kelimeleri doğru telaffuz edelim ve sesimizin doğal akışını koruyalım.
    """'''
s = s[:a] + sample + s[b:]

mapping = {
    "Read this aloud — with feeling!": "Duygulu bir şekilde sesli oku",
    "Reference audio": "Ses kaydı",
    "Name": "Ses profili adı",
    "Voice name (e.g. My Voice)": "Örn. Benim Sesim",
    "Please enter a valid name.": "Lütfen geçerli bir ad girin.",
    "Cloning voice…": "Ses profili oluşturuluyor…",
    "Done.": "Tamamlandı.",
    "Create Voice": "Sesimi Oluştur",
    "Cancel": "İptal",
}
for old, new in mapping.items():
    s = s.replace('"' + old + '"', '"' + new + '"')

# Replace visible explanatory copy by matching its complete literal.
s = s.replace('"Tap Record and read the passage above (about 25–30 seconds), then tap Stop. Or import an existing clip of clear, expressive speech."',
              '"Kaydet düğmesine basıp yukarıdaki metni yaklaşık 25–30 saniyede oku, ardından Durdur\'a bas. İstersen anlaşılır ve temiz bir ses kaydını da içe aktarabilirsin."')
s = s.replace('"Perform it — whisper the whisper, sound excited at the “!”, lift your voice at the “?”. The more expression you give, the more of your voice the clone captures."',
              '"Noktalama işaretlerine dikkat et. Soru cümlelerinde sesini yükselt, heyecanlı bölümleri canlı oku. Doğal ve anlaşılır konuşmaya çalış."')

# These are complete Swift string literal patterns; identifiers are untouched.
s = s.replace('"Stop (%.1fs)"', '"Durdur (%.1fs)"')
s = s.replace('"Record"', '"Kaydet"')
s = s.replace('"Re-record"', '"Yeniden kaydet"')
s = s.replace('"Import audio file…"', '"Ses dosyası seç…"')
s = s.replace('"Imported: \\(importedURL!.lastPathComponent)"', '"Seçildi: \\(importedURL!.lastPathComponent)"')
s = s.replace('"Using: \\(src.lastPathComponent)"', '"Kullanılacak kayıt: \\(src.lastPathComponent)"')
s = s.replace('"Failed: \\(error.localizedDescription)"', '"Hata: \\(error.localizedDescription)"')
s = s.replace('"Create"', '"Oluştur"')

if "Image(systemName:" not in s:
    raise SystemExit("Expected systemName identifier missing after localization")
if "Image(systemSes" in s:
    raise SystemExit("Unsafe replacement detected in Swift identifier")

p.write_text(s, encoding="utf-8")
print("Safely localized visible strings in CreateVoiceView.swift.")
