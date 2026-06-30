import { useGLTF } from '@react-three/drei';

/**
 * Précharge les modèles 3D au démarrage de l'application.
 * À placer dans le composant racine ou dans un Suspense.
 */
export function ModelPreloader() {
  useGLTF.preload('/models/rover.glb');
  useGLTF.preload('/models/structure.glb');
  return null;
}
