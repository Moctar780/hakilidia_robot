import { Wifi, WifiOff, Cpu, Camera, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function StatusBar() {
  const { selectedBoardLabel, selectedPort, aiServiceConnected, serviceConnected } = useApp();

  return (
    <footer
      className="flex h-6 items-center border-t px-2 text-[10px] md:h-7 md:px-3 md:text-[11px]"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-primary)',
        color: '#fff',
      }}
    >
      {/* Carte */}
      <span className="flex items-center gap-1">
        <Cpu size={10} />
        <span className="hidden sm:inline">{selectedBoardLabel || 'Arduino Uno'}</span>
        <span className="sm:hidden">{selectedBoardLabel?.replace('Arduino ', '') || 'Uno'}</span>
      </span>

      <span className="mx-2 opacity-50">|</span>

      {/* Port COM */}
      <span className="hidden sm:inline">{selectedPort || 'Aucun port'}</span>

      <span className="mx-1 opacity-50 hidden sm:inline">|</span>

      {/* Service IA */}
      {aiServiceConnected ? (
        <span className="hidden sm:flex items-center gap-1">
          <Wifi size={10} />
          IA
        </span>
      ) : (
        <span className="hidden sm:flex items-center gap-1 opacity-70">
          <WifiOff size={10} />
          IA
        </span>
      )}

      <span className="mx-1 opacity-50 hidden md:inline">|</span>

      {/* Service Arduino */}
      {serviceConnected ? (
        <span className="hidden md:flex items-center gap-1">
          <Camera size={10} />
          Service
        </span>
      ) : (
        <span className="hidden md:flex items-center gap-1 opacity-70">
          <Camera size={10} />
          Service
        </span>
      )}

      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <span className="hidden sm:flex items-center gap-1">
          <Globe size={10} />
          v0.1.0
        </span>
      </div>
    </footer>
  );
}
