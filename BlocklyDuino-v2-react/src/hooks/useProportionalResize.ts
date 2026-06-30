import { useCallback, useRef, useState } from 'react';

/**
 * Résultat d'un panneau géré par `useProportionalResize`.
 * `size` est la taille en pixels calculée à partir du ratio et de l'espace total.
 */
export type PanelInfo = {
  /** Ratio actuel du panneau (0..1) */
  ratio: number;
  /** Taille en pixels calculée */
  size: number;
};

/**
 * Hook reproduisant le mode de redimensionnement des editor groups de VS Code :
 * - Les panneaux sont dimensionnés via des ratios (fractions de l'espace total).
 * - Les ratios sont préservés lors du redimensionnement de la fenêtre.
 * - Le glissement d'un séparateur ajuste uniquement les deux panneaux adjacents.
 * - Double-clic sur un séparateur → taille égale pour les deux panneaux adjacents.
 *
 * @param initialRatios - Ratios initiaux (doivent sommer à 1).
 * @param totalSize - Taille totale disponible en pixels (largeur ou hauteur selon l'axe).
 * @param minSizes - Tailles minimales en pixels pour chaque panneau (optionnel).
 */
export function useProportionalResize(
  initialRatios: number[],
  totalSize: number,
  minSizes?: number[],
) {
  const [ratios, setRatios] = useState<number[]>(initialRatios);

  // Ref pour ne pas capturer de stale closure dans les event listeners
  const ratiosRef = useRef(ratios);
  ratiosRef.current = ratios;

  const minSizesRef = useRef(minSizes);
  minSizesRef.current = minSizes;

  /** Calcule les tailles en pixels à partir des ratios */
  const getPanelSizes = useCallback((): PanelInfo[] => {
    return ratiosRef.current.map((r) => ({
      ratio: r,
      size: r * totalSize,
    }));
  }, [totalSize]);

  /** Répartit les ratios pour qu'ils somment à 1 */
  const normalize = useCallback((newRatios: number[]): number[] => {
    const sum = newRatios.reduce((a, b) => a + b, 0);
    if (sum <= 0) return initialRatios;
    return newRatios.map((r) => r / sum);
  }, [initialRatios]);

  /**
   * Rétablit des ratios égaux pour deux panneaux adjacents (double-clic).
   * Les autres panneaux ne sont pas affectés.
   */
  const resetSplit = useCallback((index: number) => {
    setRatios((prev) => {
      if (index < 0 || index >= prev.length - 1) return prev;
      const next = [...prev];
      const total = next[index] + next[index + 1];
      next[index] = total / 2;
      next[index + 1] = total / 2;
      return next;
    });
  }, []);

  /**
   * Retourne les gestionnaires d'événements pour un séparateur.
   * `index` est l'index du séparateur (entre panel `index` et `index + 1`).
   */
  const createSplitterHandlers = useCallback(
    (index: number) => {
      let startX = 0;
      let startRatios: number[] = [];

      const onMouseDown = (e: React.MouseEvent | MouseEvent) => {
        e.preventDefault();
        startX = e.clientX;
        startRatios = [...ratiosRef.current];

        const onMouseMove = (e2: MouseEvent) => {
          const deltaPx = e2.clientX - startX;
          // Convertir le delta en ratio
          const deltaRatio = totalSize > 0 ? deltaPx / totalSize : 0;

          const newRatios = [...startRatios];
          const leftIdx = index;
          const rightIdx = index + 1;

          let newLeft = newRatios[leftIdx] + deltaRatio;
          let newRight = newRatios[rightIdx] - deltaRatio;

          // Appliquer les tailles minimales
          const mins = minSizesRef.current;
          const totalPx = totalSize;
          if (mins) {
            const leftMinRatio = totalPx > 0 ? mins[leftIdx] / totalPx : 0;
            const rightMinRatio = totalPx > 0 ? mins[rightIdx] / totalPx : 0;
            if (newLeft < leftMinRatio) {
              newRight -= newLeft - leftMinRatio;
              newLeft = leftMinRatio;
            }
            if (newRight < rightMinRatio) {
              newLeft -= newRight - rightMinRatio;
              newRight = rightMinRatio;
            }
          }

          newRatios[leftIdx] = Math.max(0.01, newLeft);
          newRatios[rightIdx] = Math.max(0.01, newRight);

          setRatios(normalize(newRatios));
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      };

      const onDoubleClick = () => {
        resetSplit(index);
      };

      return { onMouseDown, onDoubleClick };
    },
    [totalSize, normalize, resetSplit],
  );

  /**
   * Version verticale du handler (pour la console).
   */
  const createVerticalSplitterHandlers = useCallback(
    (index: number) => {
      let startY = 0;
      let startRatios: number[] = [];

      const onMouseDown = (e: React.MouseEvent | MouseEvent) => {
        e.preventDefault();
        startY = e.clientY;
        startRatios = [...ratiosRef.current];

        const onMouseMove = (e2: MouseEvent) => {
          const deltaPx = e2.clientY - startY;
          const deltaRatio = totalSize > 0 ? deltaPx / totalSize : 0;

          const newRatios = [...startRatios];
          const topIdx = index;
          const bottomIdx = index + 1;

          let newTop = newRatios[topIdx] + deltaRatio;
          let newBottom = newRatios[bottomIdx] - deltaRatio;

          const mins = minSizesRef.current;
          const totalPx = totalSize;
          if (mins) {
            const topMinRatio = totalPx > 0 ? mins[topIdx] / totalPx : 0;
            const bottomMinRatio = totalPx > 0 ? mins[bottomIdx] / totalPx : 0;
            if (newTop < topMinRatio) {
              newBottom -= newTop - topMinRatio;
              newTop = topMinRatio;
            }
            if (newBottom < bottomMinRatio) {
              newTop -= newBottom - bottomMinRatio;
              newBottom = bottomMinRatio;
            }
          }

          newRatios[topIdx] = Math.max(0.01, newTop);
          newRatios[bottomIdx] = Math.max(0.01, newBottom);

          setRatios(normalize(newRatios));
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
      };

      const onDoubleClick = () => {
        resetSplit(index);
      };

      return { onMouseDown, onDoubleClick };
    },
    [totalSize, normalize, resetSplit],
  );

  return {
    ratios,
    setRatios,
    getPanelSizes,
    normalize,
    resetSplit,
    createSplitterHandlers,
    createVerticalSplitterHandlers,
  };
}
