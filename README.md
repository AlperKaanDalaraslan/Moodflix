# Moodflix

**Moodflix**, ruh haline göre film keşfetmeni sağlayan bir **React Native** uygulamasıdır. [The Movie Database (TMDB)](https://www.themoviedb.org/) API’si ile gerçek zamanlı listeler, detaylar ve fragmanlar sunar; arayüz metinleri içerik diline göre yerelleştirilir, açık ve koyu tema desteklenir.

## Ne iş yapar?

- **Ana sayfa:** Haftanın trendleri, popüler, en yüksek puan, vizyondakiler, yakında gelecekler ve türe göre hızlı giriş noktaları.
- **Keşfet (Discover):** Birden fazla “ruh hali” (mutlu, melankolik, gerilim vb.) TMDB türleriyle eşlenir; yıl aralığı, minimum puan ve tür seçimiyle kişiselleştirilmiş öneri akışı üretir.
- **Kaydır (Swipe):** Kart tabanlı keşif; popüler / top rated / vizyon / yakında kaynakları karıştırarak tekrarı azaltır, varsa fragman ve özetle zengin kart deneyimi.
- **Ara:** TMDB üzerinden film araması.
- **Favoriler:** Seçtiğin filmler cihazda saklanır (AsyncStorage).
- **Film detayı:** Özet, puan, süre; fragman modalı; favoriye ekleme.
- **Profil:** İçerik dili (TMDB dil kodları), tema ve uygulamadaki **Premium** giriş noktası (şu an bilgilendirme / yer tutucu; aşağıdaki gelir modeliyle genişletilebilir).

Özetle: “Bugün ne izlesem?” sorusunu ruh haline ve filtrelere bağlayan, hızlı ve görsel bir film keşif uygulaması.

## Teknik özet

| Alan | Seçim |
|------|--------|
| Çatı | React Native 0.85, React 19 |
| Navigasyon | React Navigation (tab + stack) |
| Veri | TMDB REST (`src/api/tmdbClient.js`) |
| Yerel depolama | AsyncStorage (ayarlar, favoriler) |
| Animasyon | Reanimated |
| Çok dillilik | TMDB içerik yereline bağlı UI paketleri (`src/i18n/`) |

## Kurulum

**Gereksinimler:** Node.js **≥ 22.11** (bkz. `package.json`), Xcode / Android Studio ve TMDB hesabı.

1. Depoyu klonla ve bağımlılıkları kur:

   ```sh
   npm install
   ```

2. Ortam değişkeni: kökte `.env.example` dosyasını `.env` olarak kopyala ve [TMDB API anahtarını](https://www.themoviedb.org/settings/api) ekle:

   ```sh
   cp .env.example .env
   # .env içinde TMDB_API_KEY=...
   ```

   Metro, `scripts/write-env-shim.js` ile `@env` shim’ini üretir; `.env` dosyasını repoya **commit etme**.

3. Metro:

   ```sh
   npm start
   ```

4. **iOS:** (ilk sefer ve native bağımlılık güncellemelerinde)

   ```sh
   bundle install
   bundle exec pod install
   npm run ios
   ```

5. **Android:**

   ```sh
   npm run android
   ```

Diğer: `npm run lint`, `npm test`, çeviri paketleri için `npm run i18n:build`.

---

## Premium ve gelir modeli (ürün / yatırımcı notu)

Aşağıdaki başlıklar, mevcut özellik setinin **doğal uzantıları** olarak hem kullanıcı değeri hem de gelir oluşturur. Profil ekranındaki Premium alanı bu vizyonla uyumludur; ödeme altyapısı (StoreKit, Google Play Billing, RevenueCat vb.) ayrıca entegre edilir.

### Ücretsiz çekirdek (bugünkü değer)

- Temel listeler, arama, favoriler (cihaz içi), tek cihazda sınırsız gezinme mantığı.
- Keşfet ve Swipe ile “ruh haline yakın” keşif.

### Premium’da paraya dönüşen fırsatlar

1. **Gelişmiş keşif ve kayıtlı profiller**  
   Keşfet ekranındaki tür / yıl / puan kombinasyonlarını “Profilim: hafta sonu”, “Çift filmi” gibi **kaydedilmiş preset** olarak saklamak; ücretsiz kullanıcıda 1–2 preset, Premium’da sınırsız veya senkron.

2. **Bulut senkron ve çok cihaz**  
   Favoriler ve preset’lerin hesaba bağlanması (giriş + backend). Ücretsiz: sadece cihaz; Premium: yedek + cihazlar arası senkron — abonelik gerekçesi güçlü.

3. **Swipe ve keşif limiti + reklamsız**  
   Günlük swipe veya “yeni öneri yenileme” sayısı; reklam gösterimi ücretsiz katmanda. Premium: **reklamsız**, daha yüksek veya sınırsız günlük kart.

4. **“Nerede izlenir?” ve ortaklık geliri**  
   Film detayında bölgeye göre yayın platformları (JustWatch benzeri API veya manuel mapping) + **affiliate** linkleri; Premium kullanıcıya öne çıkan rozet veya erken erişim listesi.

5. **Erken erişim ve içerik paketleri**  
   Yeni ruh hali paketleri, özel listeler (ör. festival seçkisi), tema paketleri — tek seferlik IAP veya abonelik katmanı.

6. **B2B / marka**  
   “Ruh haline göre haftalık seçki” widget’ı veya lisanslı beyaz etiket; kurumsal kampanyalar için API anahtarı / özel tema.

### Fiyatlandırma önerisi (örnek)

- Aylık / yıllık abonelik (en yüksek LTV): senkron + reklamsız + preset.  
- Tek seferlik “Yaşam boyu” veya “Pro sezon” IAP: tema + preset paketi.  
- Reklam (AdMob vb.) + freemium limit: dönüşüm hunisini besler.

Bu bölüm README’nin bir parçası olarak yatırımcıya veya ekip arkadaşına “**neden bu repo para kazanabilir**” sorusuna kısa cevap verir; teknik detay kodda, iş modeli burada netleşir.

## Lisans ve veri

Film verileri ve görseller TMDB koşullarına tabidir; ticari kullanımda [TMDB API ve marka kurallarını](https://www.themoviedb.org/documentation/api) kontrol et.

---

*Varsayılan React Native şablon metinleri bu dosyadan çıkarılmıştır; ortam kurulumu için resmi [React Native ortam rehberi](https://reactnative.dev/docs/set-up-your-environment) yedek kaynak olarak kullanılabilir.*
