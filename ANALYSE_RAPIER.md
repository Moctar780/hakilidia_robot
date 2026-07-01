# Analyse : Intégration de Rapier.js pour la physique du rover

## 📦 Statut actuel

`@react-three/rapier` (v2.2.0) est déclaré dans `package.json` mais **pas installé** dans `node_modules` et **pas utilisé** dans le code.

---

## 🔧 Installation

```bash
cd BlocklyDuino-v2-react
npm install
# Vérifier : ls node_modules/@react-three/rapier/
```

---

## 🧩 Architecture Rapier

### 1. `<Physics>` — Le moteur physique

Enveloppe toute la scène 3D pour activer la physique :

```tsx
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

<Physics gravity={[0, -9.81, 0]} debug={false}>
  {/* Corps physiques ici */}
</Physics>
```

### 2. `<RigidBody>` — Le corps physique

Remplace les `mesh` du rover et des obstacles :

```tsx
<RigidBody
  ref={roverRef}
  type="dynamic"          // dynamic | fixed | kinematicPosition | kinematicVelocity
  position={[0, 0.5, 0]}
  colliders="cuboid"      // auto-détection ou "cuboid" | "ball" | "hull"
  enabledRotations={[false, true, false]}  // rotation libre sur Y seulement
>
  <mesh geometry={roverGeometry} material={roverMaterial} />
</RigidBody>
```

### 3. Types de `RigidBody`

| Type | Usage |
|---|---|
| `dynamic` | Affecté par la gravité et les forces — pour le rover |
| `fixed` | Immobile — pour le sol, les murs, les obstacles |
| `kinematicPosition` | Contrôlé manuellement en position — pour objets animés |
| `kinematicVelocity` | Contrôlé manuellement en vitesse — alternatives |

---

## 🚀 Mouvement du rover avec Rapier

### Approche 1 : Force motrice (recommandée pour l'accélération)

```tsx
const roverRef = useRef<RigidBodyApi>(null);

// Appliquer une force vers l'avant (direction du rover)
const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(roverRef.current.rotation());
roverRef.current.applyImpulse(
  forwardDir.multiplyScalar(forceMagnitude * deltaTime),
  true
);

// Appliquer un couple pour la rotation
roverRef.current.applyTorqueImpulse(
  new THREE.Vector3(0, torqueMagnitude, 0),
  true
);
```

### Approche 2 : Vitesse linéaire (mouvement direct, moins réaliste)

```tsx
roverRef.current.setLinvel(
  new THREE.Vector3(velocityX, 0, velocityZ),
  true
);
```

### Approche 3 : Translation/Rotation par frame (cinématique)

```tsx
// Pour un contrôle total sans physique de collision
roverRef.current.setNextKinematicTranslation(
  new THREE.Vector3(targetX, 0.5, targetZ)
);
```

---

## 🔄 Migration depuis l'approche actuelle

### Actuellement (sans physique)

```
Rover3DModels.tsx : useFrame() → lerp manuel de la position du groupe
Rover3DCanvas.tsx : pas de Physics wrapper
aiRuntime.ts      : updateRover() → position calculée + sleep()
```

### Avec Rapier

```
Rover3DCanvas.tsx :
  <Physics gravity={[0, -9.81, 0]}>
    <Rover3DScene />     ← sol + colliders
    <Rover3DLoadedModel /> ← remplacé par RigidBody
  </Physics>

Rover3DModels.tsx :
  <RigidBody ref={roverRef} type="dynamic" ...>
    <primitive object={scene} />
  </RigidBody>
  
  useFrame(() => {
    // Lire la vraie position depuis Rapier
    const pos = roverRef.current.translation();
    const rot = roverRef.current.rotation();
  })

aiRuntime.ts :
  updateRover() → plus besoin de calculer la position manuellement
  // Envoyer plutôt des impulsions/forces via le ref
```

---

## 📐 Accélération et inertie

Rapier gère **l'accélération et l'inertie nativement** :

```tsx
// Accélération progressive (force constante)
roverRef.current.addForce(
  forwardVector.multiplyScalar(engineForce),
  true
);

// Freinage
roverRef.current.addForce(
  currentVelocity.multiplyScalar(-dragCoefficient),
  true
);

// Rotation avec inertie
roverRef.current.addTorque(
  new THREE.Vector3(0, turnTorque, 0),
  true
);
```

**Propriétés de masse et inertie :**

```tsx
<RigidBody
  mass={2}           // masse en kg
  centerOfMass={[0, -0.2, 0]}  // centre de masse plus bas pour stabilité
>
```

---

## 🛑 Collisions et sol

```tsx
// Sol fixe
<RigidBody type="fixed" colliders="cuboid">
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
    <planeGeometry args={[50, 50]} />
  </mesh>
</RigidBody>

// Détection de collision
<RigidBody onCollisionEnter={(payload) => console.log('Collision!', payload)}>
```

---

## 📋 Plan d'intégration

### Phase 1 : Installation et test

1. `npm install` pour installer `@react-three/rapier`
2. Ajouter `<Physics>` dans `Rover3DCanvas.tsx`
3. Remplacer le groupe du rover par un `<RigidBody type="dynamic">`

### Phase 2 : Mouvement physique

4. Modifier `aiRuntime.ts` pour appliquer des **forces/impulsions** au lieu de calculer des positions
5. Remplacer les `updateRover()` par des appels `applyImpulse()` / `addForce()`
6. Lire la position/rotation depuis Rapier pour l'affichage

### Phase 3 : Environnement physique

7. Ajouter des colliders pour l'environnement (sol, murs, obstacles)
8. Activer les collisions rover ↔ environnement

---

## ⚠️ Points d'attention

1. **Communication runtime → physique** : Le runtime (`aiRuntime.ts`) doit pouvoir accéder aux refs Rapier. Solution : stocker les refs dans un contexte ou un store global.
2. **Performance mobile** : Rapier utilise WASM, performant mais à tester sur Android.
3. **Précision des pas** : Rapier utilise un pas fixe (1/60s par défaut). Les mouvements très rapides peuvent nécessiter `gravityScale` ou des pas plus petits.
4. **Position initiale** : Le rover commence à `position: {x:0, y:0, z:0}`. Avec Rapier, le placer à `y: 0.5` (au-dessus du sol) pour éviter le clip.
5. **Damping** : Ajouter `linearDamping` et `angularDamping` sur le RigidBody pour éviter que le rover glisse indéfiniment.
