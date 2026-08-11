# findyourbuddy-frontend

Etkinlik bazlı arkadaş/aktivite eşleştirme uygulamasının mobil istemcisi. Expo (React Native + TypeScript) ile yazılmıştır ve [findyourbuddy-backend](../findyourbuddy-backend) FastAPI servisini tüketir.

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
```

## Proje yapısı

```
App.tsx                  Uygulama kökü: AuthProvider + RootNavigator
src/
  api/                    Backend endpoint'lerine karşılık gelen istek fonksiyonları
  constants/config.ts     API taban URL'i ve storage anahtarları
  context/AuthContext.tsx Oturum durumu, token saklama (expo-secure-store)
  navigation/             Auth/Tab/Stack navigatörleri ve route tipleri
  screens/                Login, Register, Events, Swipe, Matches, Profile
  types/                  Backend Pydantic şemalarına karşılık gelen TS tipleri
```

## Backend sözleşmesi

- Kimlik doğrulama: `POST /auth/register`, `POST /auth/login` → JWT `access_token`, sonraki isteklerde `Authorization: Bearer <token>`
- Profil: `GET /users/me`, `PATCH /users/me`, `POST /users/me/photo`
- Etkinlikler: `GET /events/`, `GET /events/{id}`, `POST /events/`
- Swipe: `GET /swipes/candidates?event_id=`, `POST /swipes/`
- Eşleşmeler: `GET /matches/`

## Not

- Node motor sürüm uyarısı: proje `node ^20.19.4 || ^22.13.0` bekliyor, mevcut ortamda `v20.16.0` kurulu. `npm install` yine de tamamlanıyor; sorun yaşarsan Node'u güncelle.
- Swipe ekranı basit buton tabanlıdır (kart sürükleme jestleri kapsam dışı bırakıldı); ileride `react-native-gesture-handler` ile genişletilebilir.
