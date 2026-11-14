#!/usr/bin/env python3
"""Apply Halim AI Voice's minimal Turkish defaults to the pinned upstream demo."""
from pathlib import Path

root = Path("/tmp/chatterbox-coreml/ChatterboxApp/ChatterboxApp")
path = root / "ContentView.swift"
source = path.read_text(encoding="utf-8")

anchor = '''    /// English demos with paralinguistic tags stripped — for the multilingual
'''
turkish = '''    /// Turkish demos (multilingual). Tag-free because multilingual has no tag support.
    static let turkish: [DemoText] = [
        DemoText(id: "Günlük konuşma",
                 text: "Merhaba. Bugün sizinle kendi sesimle konuşmanın nasıl mümkün olduğunu göstermek istiyorum. Sesimin doğal tonunu, kelimelerin vurgusunu ve konuşma hızını korumaya çalışıyorum."),
        DemoText(id: "Haber anlatımı",
                 text: "Türkiye'nin farklı şehirlerinde bugün hava durumu değişkenlik gösteriyor. Sürücülerin yola çıkmadan önce güzergâhlarını kontrol etmeleri ve trafik kurallarına dikkat etmeleri gerekiyor."),
        DemoText(id: "Duygulu anlatım",
                 text: "Bazen küçük bir adım, hayatımızda büyük bir değişimin başlangıcı olur. Yeter ki kendimize güvenelim, sabırlı olalım ve hedefimizden vazgeçmeyelim."),
        DemoText(id: "Hız ve telaffuz",
                 text: "Şu köşe yaz köşesi, şu köşe kış köşesi, ortada su şişesi. Bir berber bir berbere, bre berber, beri gel diye bar bar bağırmış."),
        DemoText(id: "Uzun metin",
                 text: "İyi akşamlar. Bugün yeni bir teknoloji deniyoruz. Bu uygulama, yalnızca sizin cihazınızda oluşturulan ses profilini kullanarak yazdığınız metinleri seslendirmeyi amaçlıyor. İlk kurulumdan sonra internet bağlantısı olmadan çalışmasını da test edeceğiz.")
    ]

'''
if source.count(anchor) != 1:
    raise SystemExit("Expected unique Turkish demo insertion point not found")
source = source.replace(anchor, turkish + anchor, 1)
source = source.replace('@State private var variant: ModelRepository.Variant = .turbo',
                        '@State private var variant: ModelRepository.Variant = .multilingual', 1)
source = source.replace('@State private var language = "ru"',
                        '@State private var language = "tr"', 1)
old = '''        if variant == .multilingual {
            return language.hasPrefix("ru") ? DemoText.russian : DemoText.englishTagFree
        }
'''
new = '''        if variant == .multilingual {
            if language.hasPrefix("tr") { return DemoText.turkish }
            return language.hasPrefix("ru") ? DemoText.russian : DemoText.englishTagFree
        }
'''
if source.count(old) != 1:
    raise SystemExit("Expected multilingual demo selection block not found")
source = source.replace(old, new, 1)
path.write_text(source, encoding="utf-8")
print("Applied Turkish language, multilingual model, and Turkish demo text defaults.")
