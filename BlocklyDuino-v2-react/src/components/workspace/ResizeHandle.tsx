import { useCallback, useRef, type ReactNode } from 'react';
import './ResizeHandle.css';

type Props = {
  orientation: 'horizontal' | 'vertical';
  onDragStart?: () => void;
  onDrag: (delta: number) => void;
  onDragEnd?: () => void;
  children?: ReactNode;
  className?: string;
};

export function ResizeHandle({ orientation, onDragStart, onDrag, onDragEnd, children, className = '' }: Props) {
  const dragging = useRef(false);
  const startPos = useRef(0);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      onDragStart?.();
      dragging.current = true;
      startPos.current = orientation === 'horizontal' ? event.clientX : event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onDragStart, orientation],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging.current) {
        return;
      }
      const pos = orientation === 'horizontal' ? event.clientX : event.clientY;
      const delta = pos - startPos.current;
      onDrag(delta);
    },
    [onDrag, orientation],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging.current) {
        return;
      }
      dragging.current = false;
      event.currentTarget.releasePointerCapture(event.pointerId);
      onDragEnd?.();
    },
    [onDragEnd],
  );

  return (
    <div
      className={`resize-handle resize-handle--${orientation} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="separator"
      aria-orientation={orientation}
    >
      {children}
    </div>
  );
}
