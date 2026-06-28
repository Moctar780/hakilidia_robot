import { Wifi, WifiOff, Cpu, Camera, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function StatusBar() {
  const { selectedBoardLabel, selectedPort, aiServiceConnected, serviceConnected } = useApp();

  return (
    <footer
      className="flex h-7 items-center border-t px-3 text-[11px]"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
      }}
    >
      {/* Carte */}
      <span className="flex items-center gap-1">
        <Cpu size={12} />
        {selectedBoardLabel || 'Arduino Uno'}
      </span>

      <span className="mx-2 opacity-50">|</span>

      {/* Port COM */}
      <span>{selectedPort || 'Aucun port'}</span>

      <span className="mx-2 opacity-50">|</span>

      {/* Service IA */}
      {aiServiceConnected ? (
        <span className="flex items-center gap-1">
          <Wifi size={12} />
          IA connecté
        </span>
      ) : (
        <span className="flex items-center gap-1 opacity-70">
          <WifiOff size={12} />
          IA hors-ligne
        </span>
      )}

      <span className="mx-2 opacity-50">|</span>

      {/* Service Arduino */}
      {serviceConnected ? (
        <span className="flex items-center gap-1">
          <Camera size={12} />
          Service OK
        </span>
      ) : (
        <span className="flex items-center gap-1 opacity-70">
          <Camera size={12} />
          Service déconnecté
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="flex items-center gap-1">
          <Globe size={12} />
          v0.1.0
        </span>
      </div>
    </footer>
  );
}
