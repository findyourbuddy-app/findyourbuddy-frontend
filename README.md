# findyourbuddy-frontend

Etkinlik bazlı arkadaş/aktivite eşleştirme uygulamasının mobil istemcisi.
Expo (React Native + TypeScript, SDK 54) ile yazılmıştır ve
[findyourbuddy-backend](../findyourbuddy-backend) FastAPI servisini tüketir.
Kimlik doğrulama ve gerçek zamanlı sohbet için Firebase (Auth + Firestore) kullanılır.

Tasarım dili: krem/koyu zemin (tema seçilebilir), mor (#6C4CF1) aksiyon rengi,
sarı/yeşil/kırmızı rozetler, Baloo 2 başlık + Inter gövde tipografisi, yüzen
(floating) pill tab bar. Arayüz Türkçe/İngilizce (`src/constants/translations.ts`).

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içinde doldurulması gerekenler:

- `EXPO_PUBLIC_API_BASE_URL` — dev'de boş bırakılabilir (LAN IP otomatik
  algılanır, port 8001), production build'de zorunlu.
- `EXPO_PUBLIC_FIREBASE_*` — Firebase proje ayarları (Auth + Firestore).
- `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` — Google ile giriş.
- `EXPO_PUBLIC_GIPHY_API_KEY` — sohbette GIF arama.

## Çalıştırma

Backend'in ayakta olduğundan emin ol (bkz. `findyourbuddy-backend/README.md`).
Lokal geliştirmede backend'i `python run_server.py` ile başlatmak dev fallback'in
beklediği 8001 portunu verir.

```bash
npm run start      # Expo dev sunucusu
npm run android
npm run ios
npm run web
npm test           # Jest — src/utils/ ve src/api/ altındaki saf fonksiyonlar
```

### Native modüller (Expo Go'da devre dışı)

Aşağıdaki 3 özellik native modül gerektirdiği için Expo Go'da placeholder ile
çalışır; gerçek kod dosyada yorum bloğunda durur. Tam sürüm için EAS/development
build gerekir (`eas.json` hazır, bkz. `findyourbuddy-backend/docs/yapilacaklar.md`):

- `src/screens/CallScreen.tsx` — WebRTC sesli/görüntülü arama (`react-native-webrtc`)
- `src/components/maps/EventsMapView.tsx` — harita görünümü (`react-native-maps`)
- `src/components/maps/MapLocationPicker.tsx` — harita ile konum seçimi

`*.web.tsx` varyantları web'de sorunsuz çalışır.

## Proje yapısı

```
App.tsx                    Font yükleme + splash + Theme/Auth/Messages provider'ları + RootNavigator
src/
  theme/                   Renk/tipografi/spacing/shadow token'ları — ekranlarda hardcoded stil yok
  constants/               categories, interests, hobbies, languages, prompts, translations (TR/EN), config
  config/firebase.ts       Firebase app + Auth + Firestore init
  utils/                   Saf yardımcılar (tarih, uyum yüzdesi, profil tamamlanma, konum, hata) + Jest testleri
  api/                     Backend endpoint sarmalayıcıları (auth, users, events, swipes, matches, messages,
                           notifications, safety, bookmarks, subscriptions, geocoding, universities, calls,
                           doubleBuddy, giphy) + ortak axios client
  context/                 AuthContext (oturum/token/kullanıcı), MessagesContext (okunmamış rozeti),
                           ThemeContext (açık/koyu tema + dil)
  navigation/RootNavigator Auth stack + (Keşfet/Eşleş/Mesajlar) tab + ana stack (Chat, Profil, Ayarlar, ...)
  components/
    ui/                    Chip, Badge, PrimaryButton, Avatar, SectionHeader, VoiceNotePlayer, ...
    navigation/            FloatingTabBar
    cards/                 EventCard, SwipeCandidateCard, MatchPreviewCard, ChatListItem, ...
    overlays/              Modal'lar (eşleşme kutlaması, filtreler, foto doğrulama, etkinlik puanlama, ...)
    maps/ profile/ chat/   Harita, profil ve sohbet parçaları
  screens/                 ~27 ekran (aşağıda)
  types/index.ts           Backend Pydantic şemalarına karşılık gelen TS tipleri
```

### Ekranlar

- **Auth:** Welcome, Login, Register, ForgotPassword, PhoneVerification, Legal
- **Onboarding:** Onboarding (kayıt sonrası tek seferlik profil tamamlama)
- **Ana sekmeler:** Discover (etkinlikler), Swipe (aday beğenme), Messages
- **Sohbet:** Chat (Firestore ile gerçek zamanlı, GIF + sesli not), Call
- **Profil:** Profile, ViewProfile, EditProfile, MyPhotos
- **Etkinlik:** CreateEvent, EventDetail (katılım + puanlama)
- **Sosyal:** CandidateProfile, LikesReceived, SavedEvents, AIRecommendations
- **Ayarlar:** Settings, ChangePassword, BlockedUsers, CommunityGuidelines, Notifications

## Backend sözleşmesi (özet)

- **Auth:** `POST /auth/register`, `POST /auth/login` → JWT `access_token` +
  `refresh_token`. Firebase ile giriş: `POST /auth/firebase-login` (id_token).
  Sonraki isteklerde `Authorization: Bearer <access_token>`.
- **Profil:** `GET/PATCH /users/me`, `POST /users/me/photo`, `/users/me/photos`
- **Etkinlikler:** `GET /events/`, `GET/POST /events/`, `POST /events/{id}/rating`
- **Swipe/Eşleşme:** `GET /swipes/candidates?event_id=`, `POST /swipes/`, `GET /matches/`
- **Mesajlar:** `GET/POST /matches/{id}/messages/`,
  `PATCH /matches/{id}/messages/read`. Gerçek zamanlı teslim Firestore üzerinden;
  backend mesajı hem Postgres'e yazar hem Firestore'a relaylar.
- **Diğer:** `/notifications/`, `/safety/*` (blok/rapor), `/bookmarks/`,
  `/subscriptions/*` (iyzico), `/calls/ice-servers`, `/double-buddy/*`

## Notlar

- Backend saat dilimi bilgisi olmayan ISO zaman damgaları dönüyor;
  `src/utils/date.ts` (`parseApiDate`) bunları UTC olarak yorumlar — ham
  `new Date(iso)` kullanma.
- `EXPO_PUBLIC_API_BASE_URL` boşken dev fallback native'de Expo `hostUri`'den
  LAN IP'sini, web'de `window.location.hostname`'i alır (bkz.
  `src/constants/config.ts`).
