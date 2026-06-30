# Application native Windows (Electron)

## 📦 Installateur

Télécharge le fichier `Blockly IA-{version}-Setup.exe` depuis les **GitHub Actions** :
1. Va sur [Actions](https://github.com/Moctar780/hakilidia_robot/actions)
2. Sélectionne le dernier workflow réussi
3. Scrolle jusqu'à la section **Artifacts**
4. Télécharge `blockly-ia-electron-win`
5. Extrais le zip et lance `Blockly IA-{version}-Setup.exe`

> L'installateur crée un raccourci sur le bureau et dans le menu Démarrer.

## 🖥️ Version portable

Un fichier `Blockly IA-{version}-Portable.exe` est aussi disponible dans le même artifact.  
Aucune installation nécessaire — exécute-le directement depuis une clé USB ou un dossier.

## 🛠️ Builder soi-même

### Prérequis

- **Node.js 22+**
- **npm 10+**

### Commandes

```bash
# 1. Installer les dépendances (depuis la racine du monorepo)
cd ../..
npm install

# 2. Builder le package partagé
npm run build:shared

# 3. Build l'application web
cd BlocklyDuino-v2-react
npm run build:web

# 4. Builder l'exécutable Windows
npm run electron:build:win
```

Le résultat se trouve dans `release/Blockly IA-{version}-Setup.exe`.

### Autres plateformes

```bash
npm run electron:build:linux   # AppImage + .deb
npm run electron:build:mac     # .dmg
npm run electron:build:all     # Windows + Linux + macOS
```

### Mode développement

```bash
npm run electron:dev   # Lance avec DevTools ouverts
```

## 📁 Structure des fichiers

```
BlocklyDuino-v2-react/
├── electron/
│   ├── main.cjs        # Process principal Electron
│   └── preload.cjs     # Script de préchargement (sécurité)
├── dist/               # Build web (généré par Vite)
├── release/            # Exécutables (généré par electron-builder)
└── package.json        # Scripts + configuration electron-builder
```

## ⚙️ Configuration

- **App ID** : `cc.hakilidia.blocklyia`
- **Nom** : `Blockly IA`
- **Installateur** : NSIS (Windows), AppImage/deb (Linux), DMG (macOS)
- **Architecture** : x64 uniquement
