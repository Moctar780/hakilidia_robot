import { useEffect, useCallback, useRef, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { Rover3DCanvas } from './Rover3DCanvas';
import type { Rover3D } from '../../constants';

export function Rover3DOverlay({
  rover,
  trail,
  onClose,
}: {
  rover: Rover3D;
  trail: { x: number; z: number }[];
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [, setSize] = useState(600);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const measure = () => {
      const s = Math.min(el.clientWidth, el.clientHeight) - 48;
      setSize(Math.max(300, s));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={overlayRef}
        className="relative flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-2xl dark:bg-[#0F172A]"
        style={{
          borderColor: 'var(--color-border)',
          width: '92vmin',
          height: '92vmin',
        }}
      >
        {/* Barre de titre */}
        <div className="flex w-full items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            Rover 3D
            <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
              ● Simulation
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              x: {rover.position.x.toFixed(1)}&nbsp; z: {rover.position.z.toFixed(1)}&nbsp;
              dir: {rover.rotation.y.toFixed(0)}°&nbsp;
            </span>
            <span className="text-xs" style={{ color: 'var(--color-warning)' }}>
              ● {rover.sensors.battery.toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-2 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 dark:bg-[#1E293B]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              title="Réduire"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </div>

        {/* Canvas 3D */}
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg">
          <Rover3DCanvas rover={rover} trail={trail} />
        </div>
      </div>
    </div>
  );
}
