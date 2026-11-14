#!/usr/bin/env python3
"""Localize the upstream Create Voice screen for Halim AI Voice (Turkish)."""
from pathlib import Path
p = Path("/tmp/chatterbox-coreml/ChatterboxApp/ChatterboxApp/CreateVoiceView.swift")
s = p.read_text(encoding="utf-8")
replacements = {
'''    private static let readAloud = """
    “Wait… did you hear that?” Mara whispered, her eyes wide.

    A low growl rumbled from the cave — and then, all at once, a tiny dragon \\
    tumbled out!

    “Oh! You’re just a baby,” she laughed, scooping him up. “But how on earth \\
    did you get all the way out here, little one?”

    The dragon sniffed, sneezed a puff of smoke, and curled up in her arms.

    What an extraordinary, unforgettable morning this had turned out to be!
    """''':
'''    private static let readAloud = """
    “Merhaba, beni duyabiliyor musunuz?” diye sordu. Sesi sakindi, fakat içinde tatlı bir heyecan vardı.

    Bir an durdu, derin bir nefes aldı ve gülümseyerek devam etti.

    “Bugün kendi sesimi kullanarak bir metni okutmayı deniyorum. Kelimeleri açıkça, acele etmeden ve doğal vurgularla söylemek istiyorum.”

    Sonra şaşkınlıkla ekledi: “Gerçekten ilginç, değil mi?”

    Bazen küçük bir deneme, yepyeni bir başlangıca dönüşebilir. İşte bugün benim için böyle bir gün.
    """''',
'''Section("Read this aloud — with feeling!")''':'''Section("Duygulu bir şekilde sesli oku")''',
'''Text("Perform it — whisper the whisper, sound excited at the “!”, lift your voice at the “?”. The more expression you give, the more of your voice the clone captures.")''':'''Text("Noktalama işaretlerine dikkat et. Soru cümlelerinde sesini yükselt, heyecanlı bölümleri canlı oku. Doğal ve anlaşılır konuşmaya çalış.")''',
'''Section("Reference audio")''':'''Section("Ses kaydı")''',
'''Text("Tap Record and read the passage above (about 25–30 seconds), then tap Stop. Or import an existing clip of clear, expressive speech.")''':'''Text("Kaydet düğmesine basıp yukarıdaki metni yaklaşık 25–30 saniyede oku, ardından Durdur'a bas. İstersen anlaşılır ve temiz bir ses kaydını da içe aktarabilirsin.")''',
'''? "Stop (%.1fs)"''':'''? "Durdur (%.1fs)"''',
'''? (recorder.recordedURL == nil ? "Record" : "Re-record")''':'''? (recorder.recordedURL == nil ? "Kaydet" : "Yeniden kaydet")''',
'''importedURL == nil ? "Import audio file…" : "Imported: \\(importedURL!.lastPathComponent)"''':'''importedURL == nil ? "Ses dosyası seç…" : "Seçildi: \\(importedURL!.lastPathComponent)"''',
'''Text("Using: \\(src.lastPathComponent)")''':'''Text("Kullanılacak kayıt: \\(src.lastPathComponent)")''',
'''Section("Name")''':'''Section("Ses profili adı")''',
'''TextField("Voice name (e.g. My Voice)", text: $name)''':'''TextField("Örn. Benim Sesim", text: $name)''',
'''Text("Please enter a valid name.")''':'''Text("Lütfen geçerli bir ad girin.")''',
'''status = "Cloning voice…"''':'''status = "Ses profili oluşturuluyor…"''',
'''status = "Done."''':'''status = "Tamamlandı."''',
'''status = "Failed: \\(error.localizedDescription)"''':'''status = "Hata: \\(error.localizedDescription)"''',
'''.navigationTitle("Create Voice")''':'''.navigationTitle("Sesimi Oluştur")''',
'''Button("Cancel") { recorder.cancel(); dismiss() }''':'''Button("İptal") { recorder.cancel(); dismiss() }''',
'''Button("Create") { create() }''':'''Button("Oluştur") { create() }'''
}
for old, new in replacements.items():
    if old not in s:
        raise SystemExit("Expected exact source fragment not found: " + old[:90].replace("\n"," "))
    s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")
print("Localized Create Voice screen and recording passage into Turkish.")
