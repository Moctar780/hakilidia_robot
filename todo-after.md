# ✅ Tous les bugs de détection IA corrigés

> Les **8 bugs** du pipeline de détection IA ont été corrigés.
> Ce fichier sert de référence pour les correctifs appliqués.

## Résumé des 8 bugs corrigés

| Bug | Correctif | Fichiers impactés |
|-----|-----------|-------------------|
| **B1** — Double normalisation dans `detect()` | Supprimé appels redondants à `normalizeDetectionResult()` et `setLastDetection()` | `AiStage.tsx` |
| **B2** — Fuite de polling overlay | `setOverlayDetectionKind(null)` dans `stopProgram()` | `AiStage.tsx` |
| **B3** — Vidéo pas prête avant capture | Nouvelle fonction `waitForVideoReady()` avec timeout (3s / 1.5s) | `AiStage.tsx` |
| **B4** — Concurrence WebSocket/détection | Supprimé `setLastDetection()` du handler WebSocket ; `inferWithAi()` seule source | `AppContext.tsx` |
| **B5** — Label incorrect dans yolo_infer.py | `"personne detectee"` → `"visage detecte"` pour `kind == "face"` | `yolo_infer.py` |
| **B6** — Aucune validation d'image côté serveur | Nouvelle `validateImage()` avec `sharp` ; renvoie 400 au lieu de fallback | `validate.ts` (nouveau), `index.ts` |
| **B7** — Fallback line dangereux | Retourne `{ label: "perdue", confidence: 0, offset: 0 }` systématiquement | `index.ts` |
| **B8** — Code `ai-blocks.js` dupliqué | En-tête source unique + script `npm run sync-blockly` existant | `ai-blocks.js` (source) |

## Pour construire & tester

```bash
# Synchroniser les assets Blockly (copie ai-blocks.js vers les cibles)
npm run sync-blockly

# Build le service AI (avec sharp pour la validation d'images)
npm run build:ai

# Lancer le frontend React
npm run dev:web

# Lancer le service AI
npm run dev:ai
```
