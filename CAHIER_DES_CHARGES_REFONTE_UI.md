# Refonte de Blockly IA — Cahier des charges UI/UX

## Objectif

Créer une nouvelle version de **Blockly IA** avec une interface moderne, claire, ergonomique et professionnelle.

Le logiciel est un environnement de programmation visuelle permettant de programmer une caméra IA, Arduino et des objets connectés.

Le style doit être inspiré de :

- Visual Studio Code
- Figma
- Arduino IDE 2
- Node-RED
- Blockly officiel
- Google Material Design 3

L'interface doit être responsive et agréable à utiliser.

---

## Structure générale

L'application est composée de cinq zones principales.

```
+--------------------------------------------------------------+
| Barre supérieure                                              |
+----------+-------------------------------------+-------------+
|          |                                     |             |
| Palette  |        Zone Blockly                 | Panneau     |
| Blocs    |                                     | Propriétés  |
|          |                                     | Code        |
|          |                                     | IA          |
+----------+-------------------------------------+-------------+
| Console / Logs                                               |
+--------------------------------------------------------------+
| Barre d'état                                                 |
+--------------------------------------------------------------+
```

---

## 1. Barre supérieure

Hauteur : 64 px

Fond : Blanc ou gris très clair.

Contient :

- Logo Blockly IA
- Nom du projet
- Boutons :
  - Nouveau
  - Ouvrir
  - Enregistrer
  - Exporter
  - Compiler
  - Exécuter
  - Arrêter
- À droite :
  - Paramètres
  - Thème clair/sombre
  - Langue
  - Profil

Les boutons doivent avoir des icônes modernes.

---

## 2. Palette des blocs

Largeur : 280 px fixe.

En haut : champ de recherche.

Catégories avec :
- une icône
- une couleur
- un nom

Exemple :

- 🧠 IA Camera
- ⚙ Arduino
- 🔄 Boucles
- 📐 Math
- 📝 Texte
- 📋 Variables
- ⚡ Robot
- 📡 Communication
- 🎥 Caméra
- 🤖 IA
- 🔌 Relais
- 📍 GPS
- 📱 Téléphone
- 📦 Stockage

Chaque catégorie peut être réduite.

Les blocs doivent avoir :
- coins arrondis
- ombre légère
- couleurs plus douces
- animations lors du glisser-déposer

---

## 3. Zone Blockly

Occupe la majorité de l'écran.

Fond : gris très clair avec une grille discrète.

Fonctions :
- Zoom +
- Zoom -
- Réinitialiser
- Plein écran
- Mini-map
- Corbeille flottante

Support :
- Drag & Drop
- Sélection multiple
- Copier / Coller / Dupliquer
- Commentaires
- Alignement automatique

Les blocs doivent être plus grands, avec coins arrondis, ombres, police moderne.

---

## 4. Panneau de droite

Largeur : 360 px. Composé de cartes.

**Carte 1 — Code Arduino**
- Éditeur type VSCode
- Coloration syntaxique
- Copier / Télécharger / Plein écran

**Carte 2 — Scène IA**
- État : ● Connecté
- Boutons : Exécuter, Stop, Sauvegarder, Réinitialiser

**Carte 3 — Caméra**
- Choix caméra, Résolution, FPS, Rotation, Miroir
- Boutons : Ouvrir, Fermer, Actualiser
- Fenêtre caméra

**Carte 4 — Téléphone**
- Adresse IP, Connexion, Caméra téléphone, UDP, Bluetooth, WiFi, État

**Carte 5 — Reconnaissance IA**
- Choix modèle : YOLO, Face, Pose, OCR, QRCode, Détection couleur, Suivi objet
- Curseurs : Confiance, NMS
- Bouton : Tester

---

## 5. Console

Hauteur réglable.

Onglets : Console, Compilation, Logs, Erreurs, Debug

Recherche, bouton Effacer.

Coloration : Vert, Orange, Rouge.

---

## Barre d'état

En bas. Affiche : Carte connectée, Port COM, Bauds, État caméra, FPS, RAM utilisée, CPU, Version.

---

## Palette de couleurs

| Rôle | Couleur |
|------|---------|
| Primaire | `#0F766E` |
| Secondaire | `#7C3AED` |
| Succès | `#22C55E` |
| Erreur | `#EF4444` |
| Avertissement | `#F59E0B` |
| Fond | `#F8FAFC` |
| Cartes | `#FFFFFF` |

---

## Typographie

- Police : **Inter**
- Titres : 600
- Texte : 400
- Boutons : 500

---

## Icônes

Utiliser **Lucide** ou **Material Symbols**.

---

## Animations

- Transitions 200 ms
- Hover, ombres
- Boutons fluides
- Ouverture des cartes
- Drag & Drop animé
- Zoom fluide

---

## Thèmes

- Mode clair
- Mode sombre
- Les couleurs Blockly doivent s'adapter automatiquement

---

## Fonctionnalités supplémentaires

- Recherche globale des blocs
- Favoris
- Historique Annuler/Rétablir
- Sauvegarde automatique
- Onglets multiples
- Projets récents
- Notifications
- Gestion des raccourcis clavier

---

## Responsive

Support : 1920×1080, 1600×900, 1366×768, Tablette.

---

## Technologies recommandées

| Couche | Technologie |
|--------|-------------|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui |
| Éditeur | Blockly, Monaco Editor |
| Icônes | Lucide |
| Animations | Framer Motion |

---

## Résultat attendu

Créer une interface qui donne l'impression d'un logiciel professionnel comparable à Visual Studio Code ou Figma, avec :

- une navigation intuitive,
- une excellente lisibilité,
- une hiérarchie visuelle claire,
- des cartes bien organisées,
- des espacements cohérents,
- un design épuré,
- des animations fluides,
- une excellente expérience utilisateur.

L'application doit conserver toutes les fonctionnalités actuelles tout en modernisant complètement l'interface et en facilitant la prise en main pour les débutants comme pour les utilisateurs avancés.
