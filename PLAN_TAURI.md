# Plan de migration : Electron + Capacitor → Tauri v2

## 🎯 Objectif

Remplacer **Electron** (desktop) et **Capacitor** (Android) par **Tauri v2** pour avoir :
- Un seul outil pour **Windows + macOS + Linux + Android + iOS**
- Des binaires **10× plus petits** (~10 Mo au lieu de ~180 Mo)
- Une empreinte mémoire **4× plus faible**

---

## 📦 Architecture cible

```
BlocklyDuino-v2-react/
├── src/                          # React (inchangé)
├── src-tauri/                    # ← NOUVEAU : backend Rust + config Tauri
│   ├── Cargo.toml                # Dépendances Rust
│   ├── tauri.conf.json           # Configuration Tauri
│   ├── capabilities/             # Permissions (Android/iOS)
│   ├── icons/                    # Icônes par plateforme
│   ├── build.rs
│   └── src/
│       ├── main.rs               # Point d'entrée (remplace electron/main.cjs)
│       └── lib.rs                # Logique Rust (commandes natives)
├── src/                          # React (existant, inchangé)
├── public/                       # Assets statiques (inchangé)
├── dist/                         # Build web (généré par Vite)
├── package.json                  # Scripts modifiés
└── vite.config.ts                # Peut rester inchangé
```

---

## 🔄 Plan de migration (7 étapes)

### Étape 1 : Installer Tauri CLI + Rust

```bash
# Installer Rust (si pas déjà fait)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Installer Tauri CLI
npm install -D @tauri-apps/cli@latest
```

### Étape 2 : Initialiser le projet Tauri

```bash
cd BlocklyDuino-v2-react
npx tauri init
```

Ceci génère `src-tauri/` avec la config de base.

### Étape 3 : Adapter `tauri.conf.json`

```json
{
  "productName": "Blockly IA",
  "version": "0.1.0",
  "identifier": "cc.hakilidia.blocklyia",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build:web"
  },
  "app": {
    "windows": [
      {
        "title": "Blockly IA",
        "width": 1400,
        "height": 900,
        "resizable": true
      }
    ]
  }
}
```

### Étape 4 : Remplacer `electron/main.cjs` par `src-tauri/src/main.rs`

```rust
// Le main process Tauri est écrit en Rust
// Pour les interactions simples, on utilise les commandes Tauri
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Étape 5 : Adapter le CI (`.github/workflows/build.yml`)

Remplacer les jobs Electron + Capacitor par un job Tauri unique :

```yaml
jobs:
  tauri:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - name: Installer dépendances
        run: npm ci && npm run build:shared
      - name: Build Tauri
        run: npm run tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: blockly-ia-${{ matrix.os }}
          path: src-tauri/target/release/bundle/

  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }
      - uses: android-actions/setup-android@v3
      - run: npm ci && npm run build:shared && npm run build:web
      - run: npx tauri android build
      - uses: actions/upload-artifact@v4
        with:
          name: blockly-ia-android-apk
          path: src-tauri/gen/android/app/build/outputs/apk/
```

### Étape 6 : Mettre à jour les scripts `package.json`

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:android": "tauri android build",
    "tauri:ios": "tauri ios build"
  }
}
```

### Étape 7 : Nettoyer l'ancienne config

Supprimer les fichiers devenus inutiles :
- ❌ `electron/main.cjs` (remplacé par `src-tauri/src/main.rs`)
- ❌ `electron/preload.cjs`
- ❌ `capacitor.config.ts`
- ❌ `WINDOWS.md` (sera remplacé)
- ❌ `android/` (dossier gitignoré)
- ❌ Dépendances : `electron`, `electron-builder`, `@capacitor/*`

---

## 📊 Comparaison avant/après

| Métrique | Avant (Electron + Capacitor) | Après (Tauri v2) |
|---|---|---|
| **Dépendances** | 7 packages | 1 package + Rust |
| **Taille binaire Windows** | ~150 Mo | ~8 Mo |
| **Taille APK Android** | ~26 Mo | ~6 Mo |
| **RAM au lancement** | ~200 Mo | ~50 Mo |
| **Android** | ✅ | ✅ |
| **iOS** | ❌ | ✅ |
| **Maintenance CI** | 2 jobs différents | 1 job unifié |

---

## ⚠️ Points d'attention

1. **`window.__TAURI__`** : Les appels à `window.electronAPI` dans le code doivent être adaptés à l'API Tauri
2. **Blockly workspace** : Le chargement de `workspace.html` via iframe peut nécessiter des permissions `asset:` dans Tauri
3. **Modèles 3D (rover.glb)** : Vérifier le chemin d'accès dans Tauri (utiliser `asset_protocol_scope`)
4. **Rust sur le CI** : `actions-rust-lang/setup-rust-toolchain` s'installe en ~30s
5. **Android/iOS** : Nécessite les SDK natifs (Android SDK déjà OK, iOS nécessite macOS + Xcode)

---

## 🚀 Résultat attendu

Après migration, une seule commande produit le binaire pour chaque plateforme :

```bash
npm run tauri:build       # Build desktop (OS actuel)
npm run tauri:android     # Build Android APK
npm run tauri:ios         # Build iOS IPA (macOS uniquement)
```

Et le CI produira **5 artefacts** : `.exe`/`.msi`, `.dmg`, `.AppImage`/`.deb`, `.apk`, `.ipa`
