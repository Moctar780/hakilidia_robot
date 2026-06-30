# Version Android — Blockly IA

## Prérequis

- Node.js 22+
- Android Studio (dernière version)
- JDK 17+
- Android SDK (API 34+)

## Build

```bash
# 1. Builder l'app web
npm run build

# 2. Synchroniser avec Capacitor
npx cap sync android

# 3. Ouvrir dans Android Studio (ou build direct)
npx cap open android

# Build APK en ligne de commande
cd android && ./gradlew assembleDebug
```

L'APK sera dans : `android/app/build/outputs/apk/debug/app-debug.apk`

## Installation sur le téléphone

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Ou glisser-déposer l'APK sur le téléphone depuis le finder.

## Réseau local

L'AndroidManifest autorise le trafic HTTP vers les IP locales (192.168.x.x, 10.x.x.x)
pour communiquer avec les services backend :
- Service IA → `http://<IP>:5000`
- Service Arduino → `http://<IP>:7000`
- SensaGram (téléphone) → `http://<IP>:8090`

## Structure

```
BlocklyDuino-v2-react/
├── android/              ← Projet Android natif (gitignoré)
├── capacitor.config.ts   ← Configuration Capacitor
├── dist/                 ← Build web (gitignoré)
└── ANDROID.md            ← Ce fichier
```
