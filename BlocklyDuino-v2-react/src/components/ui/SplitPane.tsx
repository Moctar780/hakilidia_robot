import { useCallback, useRef, type ReactNode } from 'react';

type Orientation = 'horizontal' | 'vertical';

type SplitPaneProps = {
  /** Orientation du splitter */
  orientation: Orientation;
  /** Gestionnaires fournis par `useProportionalResize` */
  handlers: {
    onMouseDown: (e: React.MouseEvent | MouseEvent) => void;
    onDoubleClick: () => void;
  };
  /** Enfant gauche/haut */
  children: [ReactNode, ReactNode];
  /** Classes additionnelles pour le conteneur */
  className?: string;
  /** Style additionnel pour le conteneur */
  style?: React.CSSProperties;
};

/**
 * SplitPane — reproduit le comportement des editor groups de VS Code.
 *
 * Fonctionnalités :
 * - Séparateur fin avec zone d'interaction large (8px).
 * - Survol : mise en évidence du séparateur.
 * - Glissement : redimensionnement proportionnel des deux panneaux adjacents.
 * - Double-clic : rétablit une taille égale pour les deux panneaux.
 * - Support tactile.
 */
export function SplitPane({
  orientation,
  handlers,
  children,
  className = '',
  style,
}: SplitPaneProps) {
  const isHorizontal = orientation === 'horizontal';
  const splitterRef = useRef<HTMLDivElement>(null);

  const { onMouseDown: handleMouseDown, onDoubleClick: handleDoubleClick } = handlers;

  // Support tactile : on simule un mousedown à partir du touchstart
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        handleMouseDown(mouseEvent);
      }
    },
    [handleMouseDown],
  );

  return (
    <div
      className={`split-pane split-pane--${orientation} ${className}`}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Premier panneau */}
      <div className="split-pane__panel split-pane__panel--first" style={{ overflow: 'hidden' }}>
        {children[0]}
      </div>

      {/* Séparateur — style VS Code : fin et discret */}
      <div
        ref={splitterRef}
        className={`
          split-pane__splitter
          split-pane__splitter--${isHorizontal ? 'col' : 'row'}
        `}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        style={{
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(isHorizontal
            ? { width: 12, cursor: 'col-resize' }
            : { height: 12, cursor: 'row-resize' }),
          backgroundColor: 'transparent',
          zIndex: 10,
        }}
      >
        {/* Barre visuelle fine */}
        <div
          className="split-pane__splitter-bar"
          style={{
            ...(isHorizontal
              ? { width: 3, height: 24, borderRadius: 2 }
              : { height: 3, width: 24, borderRadius: 2 }),
            backgroundColor: 'var(--color-border)',
            transition: 'background-color 0.15s, transform 0.15s',
          }}
        />
      </div>

      {/* Second panneau */}
      <div className="split-pane__panel split-pane__panel--second" style={{ overflow: 'hidden' }}>
        {children[1]}
      </div>
    </div>
  );
}
