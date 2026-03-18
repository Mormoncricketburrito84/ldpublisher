# 🧟‍♂️ LDPUBLISHER - Left 4 Dead 2 Atölye Yönetim Aracı

> *"Eski, hantal komut satırlarına ve tarihi eser arayüzlere veda edin. L4D2 modlama topluluğu için modern, hızlı ve kusursuz bir çözüm."*

[![Version](https://img.shields.io/badge/Versiyon-1.0.0-success.svg)]()
[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)]()
[![License](https://img.shields.io/badge/Lisans-EULA-orange.svg)]()

## 📥 İndirme Linki

Uygulamayı kullanmaya başlamak için aşağıdaki butona tıklayarak en son sürüm kurulum dosyasını indirebilirsiniz:

[![İndir LDPUBLISHER](https://img.shields.io/badge/LDPUBLISHER-Hemen_İndir_(v1.0.0)-brightgreen?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/alpcaliskan/ldpublisher/releases/latest/download/LDPUBLISHER_Setup.exe)

---

## 📖 Hikayemiz & Vizyon
Yıllardır Left 4 Dead 2 topluluğu, atölyeye mod yüklemek veya VPK dosyalarıyla uğraşmak için komut satırlarında boğuşmak veya ne idüğü belirsiz eski araçları kullanmak zorundaydı. **LDPUBLISHER**, tam olarak bu çileye bir son vermek için tasarlandı. Amacımız, mod geliştiricilerine ve oyunculara hak ettikleri o pürüzsüz, modern ve şık deneyimi sunmaktı. Gecelerce süren kodlamalar, arayüz tasarımları ve Steam entegrasyonu testleri sonucunda, karmaşık Atölye yönetimini tek bir tıkla halledebileceğiniz bu yapıyı inşa ettik. Bizim için sadece bir araç değil, topluluğa bırakılmış profesyonel bir mirastır.

## 🚀 Temel Özellikler

* 📦 **Tek Tıkla Atölye Yayını:** Hazırladığınız ham mod klasörünü seçin, bilgileri girin ve gerisini LDPUBLISHER'a bırakın. Otomatik `addoninfo.txt` oluşturma, VPK paketleme ve Steam'e yükleme işlemleri arka planda şipşak hallolur.
* 📥 **Gelişmiş İndirme Yöneticisi:** Sadece tekil modları değil, devasa Atölye Koleksiyonlarını bile ID üzerinden tespit edip klasörler halinde bilgisayarınıza indirir. (Arka planda SteamCMD gücüyle çalışır).
* 🛠️ **Dahili VPK Parçalayıcı (Unpacker):** İndirdiğiniz veya elinizde bulunan kilitli `.vpk` dosyalarını anında parçalayarak, düzenlenebilir ham dosyalara (models, materials, sound vb.) çevirir.
* 🎮 **SteamWorks Entegrasyonu:** Uygulamaya girdiğiniz an Steam profilinizle eşleşir, durumunuzu *"Left 4 dead 2 in LDPUBLISHER"* olarak günceller ve atölye öğelerinize (beğeni, abone sayısı, dosya boyutu) doğrudan erişim sağlar.
* 🎨 **Modern & Resmi Arayüz:** Göz yormayan karanlık tema (Dark Mode) ve tamamen profesyonel, kullanıcı dostu diyalog ekranları.

## 💻 Kullanılan Teknolojiler
Bu proje, güncel ve stabil altyapılar üzerine inşa edilmiştir:
* **[Electron.js](https://electronjs.org/):** Güçlü masaüstü uygulama iskeleti.
* **[Node.js](https://nodejs.org/):** Arka plan işlemleri, asenkron dosya ve süreç yönetimi.
* **[SteamWorks.js](https://github.com/ceifa/steamworks.js):** Steam API ve Atölye (Workshop) entegrasyonu.
* **Valve Core Tools:** VPK Tool (`vpk.exe`) ve SteamCMD entegrasyonları.

## ⚙️ Kurulum & Kullanım

Uygulamayı sıfırdan derlemekle uğraşmanıza gerek yok, sizin için en stabil halini profesyonel bir setup olarak paketledik:

1.  Bu sayfanın sağ tarafındaki **Releases** sekmesine gidin.
2.  En güncel `LDPUBLISHER_Setup.exe` dosyasını indirin.
3.  Kurulum sihirbazını başlatın, dilinizi seçin, lisans sözleşmesini onaylayın ve kurulumu tamamlayın.
4.  Arka planda **Steam'in açık olduğundan emin olun** ve masaüstünüzdeki LDPUBLISHER kısayolundan uygulamaya giriş yapın. Atölye artık emrinizde!

## ⚠️ Sorumluluk Reddi (Disclaimer)
Bu yazılım bağımsız olarak geliştirilmiştir ve Valve Corporation ile hiçbir resmi bağlantısı veya ortaklığı bulunmamaktadır. Left 4 Dead 2, Steam ve Steamworks, Valve Corporation'ın tescilli markalarıdır. Uygulama üzerinden yayınlanan veya indirilen içeriklerin telif ve kullanım sorumluluğu tamamen kullanıcıya aittir.

---
**Geliştirici:** Alp | *Topluluk için, topluluktan biri tarafından büyük bir tutkuyla geliştirildi.* 🩸
