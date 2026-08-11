# findyourbuddy-frontend

Etkinlik bazlı arkadaş/aktivite eşleştirme uygulamasının mobil istemcisi. Expo (React Native + TypeScript) ile yazılmıştır ve [findyourbuddy-backend](../findyourbuddy-backend) FastAPI servisini tüketir.

Tasarım, Keşfet/Eşleş/Mesajlar ekranlarını gösteren bir Figma mockup'ına göre kurgulandı: krem zemin, mor (#6C4CF1) aksiyon rengi, sarı/yeşil/kırmızı rozetler, Baloo 2 başlık + Inter gövde tipografisi, yüzen (floating) pill tab bar.

## Kurulum

```bash
npm install
cp .env.example .env   # EXPO_PUBLIC_API_BASE_URL değerini backend adresine göre ayarla
```

## Çalıştırma

Backend'in `http://127.0.0.1:8000` üzerinde ayakta olduğundan emin ol (bkz. `findyourbuddy-backend/README.md`).

```bash
npm run start     # Expo geliştirme sunucusu, QR ile Expo Go'da aç
npm run android
npm run ios
npm run web
npm test           # Jest — src/utils/ altındaki saf fonksiyonlar için unit test
```

## Proje yapısı

```
App.tsx                    Font yükleme (Baloo 2 / Inter) + splash + Auth/Messages provider'ları + RootNavigator
src/
  theme/                    Renk/tipografi/spacing token'ları — ekranlarda hardcoded stil yok
  constants/categories.ts   Etkinlik kategorisi → ikon + gradient + filtre chip eşlemesi (config-driven)
  utils/                    Saf yardımcı fonksiyonlar (tarih formatlama, uyum yüzdesi) + Jest testleri
  api/                      Backend endpoint'lerine karşılık gelen istek fonksiyonları
  context/                  AuthContext (oturum/token), MessagesContext (okunmamış mesaj rozeti)
  navigation/                RootNavigator — Auth stack + (Keşfet/Eşleş/Mesajlar) tab + Chat/Profile stack
  components/
    ui/                     Chip, Badge, PrimaryButton, Avatar, SectionHeader
    navigation/              FloatingTabBar — özel yüzen tab bar
    cards/                   EventCard, EventListItem, SwipeCandidateCard, MatchPreviewCard, ChatListItem
  screens/                  Login, Register, Discover, Swipe, Messages, Chat, Profile
  types/                    Backend Pydantic şemalarına karşılık gelen TS tipleri
```

## Backend sözleşmesi

- Kimlik doğrulama: `POST /auth/register`, `POST /auth/login` → JWT `access_token`, sonraki isteklerde `Authorization: Bearer <token>`
- Profil: `GET /users/me`, `PATCH /users/me`, `POST /users/me/photo`
- Etkinlikler: `GET /events/`, `GET /events/{id}`, `POST /events/`
- Swipe: `GET /swipes/candidates?event_id=`, `POST /swipes/`
- Eşleşmeler: `GET /matches/` — yanıt artık `other_user` (karşı kullanıcının adı/fotoğrafı) ve `last_message` (varsa son mesaj) içeriyor
- Mesajlar: `GET/POST /matches/{id}/messages/`

## Mockup'tan bilinçli sapmalar

- **Etkinlik/aday fotoğrafları gerçek değil.** Backend'de `Event`/`User` üzerinde gerçek bir fotoğraf alanı olsa da (`photo_url`), kategori bazlı sabit görsel/URL yok — etkinlik kartlarında kategoriye göre gradient + ikon placeholder kullanılıyor (`src/constants/categories.ts`), var olmayan bir URL uydurulmadı.
- **"X kişi ilgileniyor" sayacı ve avatar stack'i yok** — backend bu veriyi hesaplamıyor, sahte sayı üretilmedi.
- **Swipe aday kartında "Şimdi aktif" / "%uyum" rozetleri yok** — backend'de aday skoru ya da son görülme verisi yok. Gerçek eşleşme sonrası `Match.score`'dan türetilen uyum yüzdesi (`formatMatchScore`) gösteriliyor.
- **Eşleş ekranında mockup'ta görünmeyen küçük bir "Geç" ikon-butonu var** (üst sağda, X ikonu) — karşılıklı beğeniyle eşleşme kurulabilmesi için "sonraki adaya geç" yolu zorunlu, mockup'ın tek büyük CTA'sı sadece "beğen" aksiyonunu karşılıyor.
- **Eşleş sekmesi artık bağımsız bir alt sekme** (mockup'taki gibi), belirli bir etkinlik seçilmeden açılırsa otomatik olarak en yakın/yaklaşan etkinliği kapsam alır; Keşfet'ten "Kankaları Gör" ile açılırsa o etkinliğe odaklanır.
- **Mesajlar sekmesindeki okunmamış kırmızı nokta best-effort'tur.** Backend'de mesajı "okundu" işaretleyen bir endpoint henüz yok (bilinçli ertelenmiş karar, bkz. backend `docs/tech-kararlari.md`) — nokta, son çekilen `last_message.is_read` alanından hesaplanıyor; bir sohbeti açmak sunucu tarafında okundu işaretlemiyor.
- **Bookmark (kaydet) ikonu sadece ekran içi local state** — kalıcı değil, sayfa yenilenince sıfırlanır, backend'e dokunulmadı.
- **`ChatScreen` mockup'ta yok**, mevcut tema diliyle (krem zemin, mor/beyaz konuşma balonları) tutarlı olarak tasarlandı.

## Not

- Node motor sürüm uyarısı: proje `node ^20.19.4 || ^22.13.0` bekliyor, mevcut ortamda `v20.16.0` kurulu. `npm install` yine de tamamlanıyor; sorun yaşarsan Node'u güncelle.
- Backend, `datetime.utcnow()` ile saat dilimi bilgisi olmayan ISO zaman damgaları dönüyor. `src/utils/date.ts` bunu UTC olarak yorumlayacak şekilde (`parseApiDate`) düzeltiyor — ham `new Date(iso)` kullanmak, offset'siz string'leri yanlışlıkla yerel saat olarak yorumlar.
