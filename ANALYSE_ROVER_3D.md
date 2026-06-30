# Analyse technique : Substitution du simulateur 2D par un rover 3D

> **Date :** 2026-06-30  
> **Projet :** Blockly IA (BlocklyDuino-v2-react)  
> **Objet :** Analyse de faisabilité et proposition d'architecture pour remplacer `RobotSimulator` (canvas 2D) par un environnement de rover 3D temps réel.

---

## Table des matières

1. [État actuel du simulateur 2D](#1-état-actuel-du-simulateur-2d)
2. [Analyse du modèle de données](#2-analyse-du-modèle-de-données)
3. [Intégration avec le runtime IA](#3-intégration-avec-le-runtime-ia)
4. [Options technologiques 3D](#4-options-technologiques-3d)
5. [Architecture proposée](#5-architecture-proposée)
6. [Plan de migration progressif](#6-plan-de-migration-progressif)
7. [Impacts et dépendances](#7-impacts-et-dépendances)
8. [Recommandation finale](#8-recommandation-finale)

---

## 1. État actuel du simulateur 2D

### 1.1 Composants existants

| Composant | Fichier | Rôle |
|---|---|---|
| `RobotSimulator` | `src/components/simulator/RobotSimulator.tsx` | Canvas 2D avec grille, axes, traînée, robot |
| `SimulatorCard` | `src/components/layout/RightPanel.tsx` | Carte onglet Simulateur dans le panneau droit |
| `SimulatorOverlay` | `src/components/layout/RightPanel.tsx` | Overlay plein écran du simulateur |

### 1.2 Fonctionnalités actuelles

- **Grille** quadrillée 40×40px avec axes centraux (X, Y) étiquetés de -4 à +4
- **Sprite robot** : forme rectangulaire arrondie avec tête (capteur avant), yeux LEDs, couleur `#0F766E`
- **Traînée** (`trail`) : trajectoire du robot affichée en violet semi-transparent (`#7C3AED`)
- **Position textuelle** : `x: {v}  y: {v}  dir: {v}°`
- **Redimensionnement automatique** via `ResizeObserver` (dans le panneau et en overlay)
- **Mode simulation/physique** : toggle ON/OFF

### 1.3 Limites identifiées

| Limite | Détail |
|---|---|
| **2D uniquement** | Pas de profondeur (Z), pas de rotation 3 axes |
| **Rendu abstrait** | Le sprite est une forme géométrique simple, pas un rover réaliste |
| **Pas d'obstacles** | L'environnement est une grille vide sans murs ni objets |
| **Pas de physique** | Aucune simulation de collision, gravité, inertie, frottement |
| **Échelle fixe** | `GRID_SIZE = 40`, `ROBOT_SIZE = 24` — pas de monde à l'échelle |
| **Un seul sprite** | `SimulatorCard` n'affiche que `sprites[0]` |
| **Pas de caméra 3D** | Point de vue fixe (vue de dessus) |

---

## 2. Analyse du modèle de données

### 2.1 Type `AiSprite` (défini dans `packages/shared/src/index.ts`)

```typescript
type AiSprite = {
  id: string;
  name: string;
  x: number;        // position X (grille)
  y: number;        // position Y (grille)
  direction: number; // rotation en degrés (0-360)
  size: number;      // échelle (100 = 100%)
  costume: 'robot' | 'cat' | 'rocket';
  visible: boolean;
};
```

### 2.2 Contraintes identifiées

- **Pas de Z** : pas de coordonnée verticale / altitude
- **Pas de rotation en X/Y** : `direction` n'est qu'un angle horizontal (Yaw)
- **Pas de vitesse** : aucune notion de vélocité linéaire ou angulaire
- **Costume limité** : 3 valeurs fixes (`'robot' | 'cat' | 'rocket'`), pas de modèle 3D
- **Taille normalisée** : `size` est un pourcentage, pas une dimension physique

### 2.3 Évolution nécessaire du modèle

Pour supporter un rover 3D, `AiSprite` doit évoluer vers :

```typescript
type Rover3D = {
  id: string;
  name: string;

  // Position 3D (unité : cm ou mètre dans le monde simulé)
  position: { x: number; y: number; z: number };

  // Rotation 3 axes (degrés)
  rotation: { x: number; y: number; z: number };

  // Vitesses
  linearVelocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };

  // État du rover
  speed: number;           // vitesse linéaire (cm/s)
  gripperState: 'open' | 'closed' | 'stopped';
  gripperWidth: number;    // ouverture pince (cm)

  // Apparence
  modelId: string;         // identifiant du modèle 3D (GLTF/GLB)
  size: number;            // échelle
  visible: boolean;

  // Capteurs simulés
  sensors: {
    ultrasonic?: number;   // distance avant (cm)
    color?: string;        // couleur du sol détectée
    linePosition?: number; // position de la ligne (-1 à +1)
    battery?: number;       // niveau batterie (%)
  };
};
```

**Stratégie de compatibilité** : Conserver `AiSprite` comme type hérité pour les projets existants, créer `Rover3D` comme type natif du simulateur 3D, avec une fonction de conversion `spriteToRover(sprite: AiSprite): Rover3D`.

---

## 3. Intégration avec le runtime IA

### 3.1 Flux actuel

```
Code utilisateur (Blockly)
         │
         ▼
   runAiProgram(code, context)
         │
         ▼
   executeCommand(line, context)
         │
         ▼
   context.updateSprite(updater)  ← met à jour sprites[0]
         │
         ▼
   RobotSimulator (canvas 2D)  ← lit sprite.x, sprite.y, sprite.direction
```

Les commandes qui impactent le sprite :

| Commande | Action actuelle | Équivalent 3D |
|---|---|---|
| `FORWARD n` | `sprite.x += n` | Avancer dans la direction du rover |
| `BACKWARD n` | `sprite.x -= n` | Reculer |
| `TURN_LEFT n` | `sprite.direction -= n` | Rotation Yaw |
| `TURN_RIGHT n` | `sprite.direction += n` | Rotation Yaw |
| `SPRITE_MOVE n` | `sprite.x += n` | Mouvement relatif |
| `SPRITE_TURN n` | `sprite.direction += n` | Rotation relative |
| `SET_SPEED n` | `V n` (commande Sparki) | Vitesse linéaire |
| `STOP` | `s` (commande Sparki) | Arrêt |
| `GRIPPER_OPEN n` | `GO n` (commande Sparki) | Ouverture pince |
| `GRIPPER_CLOSE n` | `GC n` (commande Sparki) | Fermeture pince |

### 3.2 Points d'extension

Le `RuntimeContext` dans `aiRuntime.ts` expose `updateSprite` :

```typescript
updateSprite: (updater: (sprite: AiSprite) => AiSprite) => void;
```

Pour la 3D, il faudrait :

- **Option A** : Étendre `updateSprite` pour accepter aussi `Rover3D`
- **Option B** : Ajouter `updateRover` dans le contexte
- **Option C** : Remplacer `updateSprite` par un système d'événements plus riche

**Recommandation : Option B** — ajouter `updateRover(updater: (rover: Rover3D) => Rover3D)` dans le contexte, ce qui permet une coexistence progressive.

### 3.3 Nouvelles commandes Blockly à prévoir

```typescript
// Mouvement 3D
ROVER_MOVE_FORWARD(steps)     // Avancer
ROVER_MOVE_BACKWARD(steps)    // Reculer
ROVER_MOVE_LEFT(steps)        // Translation latérale gauche
ROVER_MOVE_RIGHT(steps)       // Translation latérale droite
ROVER_MOVE_UP(steps)          // Monter (drone/bras)
ROVER_MOVE_DOWN(steps)        // Descendre

// Rotation 3 axes
ROVER_ROLL(degrees)           // Rotation axe X
ROVER_PITCH(degrees)          // Rotation axe Y
ROVER_YAW(degrees)            // Rotation axe Z (actuel TURN)

// Capteurs simulés
ROVER_READ_ULTRASONIC()       // Distance obstacle avant (cm)
ROVER_READ_COLOR()            // Couleur du sol
ROVER_READ_LINE()             // Position ligne (suivi)
ROVER_READ_BATTERY()          // Niveau batterie

// Actionneurs
ROVER_GRIPPER_OPEN(cm)
ROVER_GRIPPER_CLOSE(cm)
ROVER_SET_SPEED(pct)
ROVER_STOP()
```

---

## 4. Options technologiques 3D

### 4.1 Comparatif des bibliothèques 3D pour React

| Bibliothèque | Type | Bundle | Courbe app. | Intégration React | Physique | GLTF/GLB | PWA |
|---|---|---|---|---|---|---|---|
| **Three.js** (vanilla) | Moteur 3D low-level | ~550 KB | Haute | Manuel (refs) | Plugin (Rapier, Cannon) | ✅ Natif | ✅ |
| **React Three Fiber (R3F)** | Three.js + React | ~600 KB | Moyenne | ✅ Déclaratif | `@react-three/rapier` | ✅ | ✅ |
| **Trois.js** | Three.js + Vue | N/A | — | ❌ (Vue) | — | ❌ | — |
| **Babylon.js** | Moteur 3D complet | ~1.2 MB | Haute | Manuel | ✅ Intégré | ✅ | ✅ |
| **A-Frame** | WebVR/AR (Trois) | ~400 KB | Faible | ❌ (HTML) | Plugin | ✅ | ✅ |
| **LÖVE 3D** | (hors navigateur) | — | — | ❌ | — | — | ❌ |
| **CSS 3D** | Transformations CSS | 0 KB | Très faible | ✅ Natif | ❌ | ❌ | ✅ |

### 4.2 Recommandation : React Three Fiber (R3F) + Rapier

**Pourquoi R3F + Rapier :**

1. **Intégration React native** — Déclaratif, hooks, refs, états React
2. **Bundle raisonnable** — Tree-shakable, ~150 KB gzippé
3. **Écosystème riche** : `@react-three/drei` (helpers), `@react-three/rapier` (physique), `@react-three/postprocessing` (effets)
4. **GLTF/GLB natif** — Utilisation directe de modèles 3D de rover
5. **Performance** — WebGL 2.0, instancing, LOD
6. **Documentation** — vaste communauté, exemples nombreux

### 4.3 Dépendances à ajouter (npm)

```json
{
  "dependencies": {
    "three": "^0.170.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0",
    "@react-three/rapier": "^2.0.0"
  },
  "devDependencies": {
    "@types/three": "^0.170.0"
  }
}
```

**Estimation bundle additionnel :** ~250-300 KB gzippé (acceptable pour une PWA).

---

## 5. Architecture proposée

### 5.1 Nouvelle arborescence

```
src/components/simulator/
├── RobotSimulator.tsx           ← ACTUEL (conservé pour fallback)
├── Rover3DCanvas.tsx            ← NOUVEAU : Canvas Three.js + R3F
├── Rover3DScene.tsx             ← NOUVEAU : Scène 3D (sol, lumières, décor)
├── Rover3DModel.tsx             ← NOUVEAU : Chargement/affichage du rover GLTF
├── Rover3DController.tsx        ← NOUVEAU : Pont entre état React et objets Three
├── Rover3DUI.tsx                ← NOUVEAU : HUD superposé (infos, radar, joystick)
├── Rover3DTrail.tsx             ← NOUVEAU : Traînée de mouvement 3D
├── Rover3DOverlay.tsx           ← NOUVEAU : Overlay plein écran (remplace SimulatorOverlay)
├── physics/
│   ├── PhysicsWorld.ts          ← NOUVEAU : Monde physique Rapier
│   ├── Colliders.ts             ← NOUVEAU : Collisionneurs (murs, obstacles)
│   └── sensors.ts               ← NOUVEAU : Capteurs simulés (ultrason, ligne, etc.)
└── models/
    ├── rover.glb                ← FICHIER : Modèle 3D du rover (à créer/trouver)
    ├── obstacle.glb             ← FICHIER : Obstacles (optionnel)
    └── terrain.glb              ← FICHIER : Terrain (optionnel)
```

### 5.2 Flux de données (3D)

```
Code utilisateur (Blockly)
         │
         ▼
   runAiProgram(code, context)
         │
         ▼
   context.updateRover(updater)   ← NOUVEAU
         │
         ▼
   AppContext (state Rover3D)
         │
         ├──► Rover3DController (synchro state → Three.js)
         │         │
         │         ├──► Rover3DModel (position, rotation, animation)
         │         ├──► Rover3DTrail (points de trajectoire)
         │         └──► PhysicsWorld (mise à jour physique)
         │
         └──► Rover3DUI (affichage HUD : vitesse, capteurs, batterie)
```

### 5.3 Intégration dans l'UI existante

Dans `RightPanel.tsx`, le `SimulatorCard` aurait une variante 3D :

```tsx
// SimulatorCard (modifié)
function SimulatorCard() {
  const { rovers, use3D } = useApp();
  // ...
  return (
    <>
      {use3D ? (
        <Rover3DCanvas rover={rovers[0]} trail={trail} />
      ) : (
        <RobotSimulator sprite={sprite} trail={trail} />
      )}
    </>
  );
}
```

Un toggle `use3D` pourrait être ajouté dans les paramètres ou directement dans la carte simulateur.

### 5.4 Modèle 3D du rover

Deux options :

1. **Modèle libre existant** (recommandé pour MVP)
   - Chercher sur [Sketchfab](https://sketchfab.com), [Poly Pizza](https://poly.pizza), [Open3DModel](https://open3dmodel.com) un rover martien ou robot mobile
   - Format : GLTF/GLB (~300 KB max)
   - Licence : CC0 ou CC-BY (attribution)

2. **Modélisation sur mesure** (phase 2)
   - Créer un rover simple avec pince + roues + caméra + capteurs avant
   - Outils : Blender, Onshape
   - Export : GLTF avec squelettes d'animations (roues qui tournent, pince qui s'ouvre)

---

## 6. Plan de migration progressif

### Phase 0 — Preuve de concept (1-2 jours)

- [ ] Ajouter Three.js + R3F au projet
- [ ] Créer `Rover3DScene.tsx` : sol quadrillé, ciel, lumières
- [ ] Créer `Rover3DModel.tsx` : un cube/cylindre coloré comme rover placeholder
- [ ] Créer `Rover3DCanvas.tsx` : `<Canvas>` R3F avec la scène
- [ ] Remplacer `RobotSimulator` par `Rover3DCanvas` dans `SimulatorCard`
- [ ] Vérifier que le rendu 3D s'affiche correctement

### Phase 1 — Mouvement et physique (2-3 jours)

- [ ] Ajouter `@react-three/rapier` pour la physique
- [ ] Créer le type `Rover3D` dans le modèle de données
- [ ] Ajouter `updateRover` dans `RuntimeContext`
- [ ] Créer `Rover3DController` : synchronise state → position/rotation Three.js
- [ ] Créer `Rover3DTrail` : traînée 3D (ligne dans l'espace)
- [ ] Adapter `aiRuntime.ts` : `FORWARD`/`BACKWARD`/`TURN_LEFT`/`TURN_RIGHT` travaillent sur `Rover3D`
- [ ] Ajouter `use3D` toggle dans les paramètres

### Phase 2 — Modèle 3D réaliste (2-3 jours)

- [ ] Trouver/créer un modèle GLTF de rover avec roues + pince
- [ ] Intégrer le modèle avec `useGLTF` de `@react-three/drei`
- [ ] Animer les roues en rotation lors du déplacement
- [ ] Animer la pince (ouverture/fermeture)
- [ ] Ajouter des obstacles (murs, cônes) dans la scène 3D
- [ ] Ajouter la détection de collision (ultrason simulé)

### Phase 3 — Capteurs et HUD (2-3 jours)

- [ ] Créer les capteurs simulés : ultrason (raycast), ligne (couleur sol), couleur
- [ ] Créer `Rover3DUI` : HUD overlay avec :
  - Vue caméra embarquée (optionnel : render target Three.js)
  - Indicateur de vitesse
  - Radar des obstacles
  - Niveau batterie
  - Mini-carte (vue de dessus)
- [ ] Ajouter les blocs Blockly `ROVER_READ_*`
- [ ] Ajouter au générateur Arduino les nouvelles commandes

### Phase 4 — Overlay plein écran (1 jour)

- [ ] Créer `Rover3DOverlay.tsx` (remplace `SimulatorOverlay`)
- [ ] Mode "conduite" immersive
- [ ] Contrôles tactiles si mobile
- [ ] Vue à la première personne (caméra embarquée)

### Phase 5 — Optimisation et polish (2-3 jours)

- [ ] Performance : instancing, LOD, frustum culling
- [ ] Sons : moteur, clic pince, détection obstacle
- [ ] Particules : poussière quand le rover roule
- [ ] Éclairage : cycle jour/nuit (optionnel)
- [ ] Tests : compatibilité mobile, 60 FPS

**Durée totale estimée :** 10-15 jours homme

---

## 7. Impacts et dépendances

### 7.1 Impact sur les composants existants

| Composant | Impact | Action |
|---|---|---|
| `RobotSimulator.tsx` | Conservé (fallback) | Optionnel : renommer `RobotSimulator2D` |
| `RightPanel.tsx` (SimulatorCard) | Modifié | Ajout condition `use3D` |
| `RightPanel.tsx` (SimulatorOverlay) | Remplacé | Par `Rover3DOverlay` quand `use3D` |
| `aiRuntime.ts` | Étendu | Ajout `updateRover`, nouvelles commandes |
| `AppContext.tsx` | Étendu | Ajout `rovers: Rover3D[]`, `use3D`, `updateRover` |
| `AiSprite` (shared) | Conservé | `Rover3D` est un nouveau type |
| `AiStage.tsx` | Faible | Optionnel : sélecteur de mode 2D/3D |

### 7.2 Performance

| Métrique | Actuel (2D) | Cible (3D) | Seuil acceptable |
|---|---|---|---|
| FPS | 60 | 30-60 | ≥30 FPS sur mobile |
| Bundle size | ~150 KB JS | +300 KB (Three.js+R3F+Rapier) | ≤500 KB gzippé |
| Mémoire GPU | 0 | ~50-100 MB | <200 MB |
| Initialisation | Instantanée | <1s (load GLTF) | <3s |

**Mitigations :**
- Chargement asynchrone du modèle 3D (squelette UI avant modèle)
- Compression draco des GLTF
- Utilisation du même contexte WebGL (pas de fuite mémoire)

### 7.3 Compatibilité navigateur

| Technologie | Chrome | Firefox | Safari | Edge | Mobile |
|---|---|---|---|---|---|
| WebGL 2.0 | ✅ | ✅ | ✅ (15+) | ✅ | ✅ |
| Three.js | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rapier (WASM) | ✅ | ✅ | ✅ | ✅ | ✅ |
| GLTF | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 8. Recommandation finale

### ✅ Faisabilité

**Oui, la substitution est techniquement faisable et pertinente.** Le projet Blockly IA est bien architecturé (React + TypeScript, séparation des préoccupations), ce qui rend l'intégration de Three.js via React Three Fiber propre et progressive.

### 📊 Priorité recommandée

| Phase | Priorité | Effort | Valeur |
|---|---|---|---|
| **P0** — Preuve de concept 3D | Haute | 2j | Débloque tout le projet |
| **P1** — Mouvement + physique | Haute | 3j | Rendu interactif |
| **P2** — Modèle rover réaliste | Moyenne | 3j | Aspect professionnel |
| **P3** — Capteurs + HUD | Haute | 3j | Utilité pédagogique |
| **P4** — Overlay immersif | Basse | 1j | Confort |
| **P5** — Polish + optimisation | Moyenne | 3j | Qualité produit |

### 🎯 MVP viable (Phase 0 + 1)

Un **rover 3D minimum** peut être livré en **5 jours** avec :
- Sol quadrillé 3D avec axes X/Y/Z
- Rover représenté par un modèle 3D simple (cube/cylindre) ou un GLTF basique
- Physique de base (collision avec les bords du monde)
- Mouvement : avancer, reculer, tourner (compatible avec les commandes `FORWARD`/`BACKWARD`/`TURN_LEFT`/`TURN_RIGHT` existantes)
- Traînée 3D
- Vue caméra ajustable (orbite)

### ⚠️ Risques et atténuations

| Risque | Probabilité | Atténuation |
|---|---|---|
| Performance insuffisante sur mobile | Faible | LOD, réduire la qualité, instancing |
| Taille du bundle trop importante | Faible | Code splitting, lazy load Three.js |
| Le modèle 3D n'existe pas | Moyenne | Utiliser un modèle générique (cube texturé) |
| Rupture de compatibilité avec projets existants | Moyenne | `AiSprite` conservé, toggle 2D/3D |
| Courbe d'apprentissage Three.js | Faible | R3F abstrait la complexité |

---

*Document rédigé le 30 juin 2026 — À valider avant implémentation.*
