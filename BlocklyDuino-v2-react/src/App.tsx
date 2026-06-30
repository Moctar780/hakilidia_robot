import { ThemeProvider } from './context/ThemeContext';
import { ResponsiveProvider, useResponsive } from './context/ResponsiveContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { WorkspaceArea } from './components/workspace/WorkspaceArea';
import { RightPanel } from './components/layout/RightPanel';
import { Console } from './components/layout/Console';
import { StatusBar } from './components/layout/StatusBar';
import { BoardListModal } from './components/modals/BoardListModal';
import { PortListModal } from './components/modals/PortListModal';
import { HelpModal } from './components/modals/HelpModal';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { ModelPreloader } from './components/simulator/ModelPreloader';
import { CameraControlOverlay } from './components/simulator/CameraControlOverlay';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useProportionalResize } from './hooks/useProportionalResize';
import './styles/global.css';

/** Tailles minimales des 3 panneaux horizontaux : sidebar, centre, right panel */
const MIN_SIZES = [180, 200, 280];

/**
 * Compteur de splitters pour collisions entre overlays mobiles et handlers.
 * On désactive le resize proportionnel quand un overlay mobile est ouvert
 * pour éviter les interférences.
 */

function Splitter({
  handlers,
  className = '',
}: {
  handlers: { onMouseDown: (e: React.MouseEvent | MouseEvent) => void; onDoubleClick: () => void };
  className?: string;
}) {
  return (
    <div
      className={`split-pane__splitter split-pane__splitter--col ${className}`}
      onMouseDown={handlers.onMouseDown}
      onDoubleClick={handlers.onDoubleClick}
    >
      <div className="split-pane__splitter-bar" />
    </div>
  );
}

function AppLayout() {
  const { sidebarOpen, panelOpen, closeSidebar, closePanel } = useResponsive();
  const { cameraControlOpen, setCameraControlOpen } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mainWidth, setMainWidth] = useState(1200);

  // Mesure de la largeur disponible pour les panneaux
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setMainWidth(el.clientWidth);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Gestion proportionnelle des 3 panneaux (sidebar, centre, right panel)
  // Ratios par défaut : ~18% sidebar, ~52% centre, ~30% panel
  const {
    getPanelSizes,
    createSplitterHandlers,
  } = useProportionalResize(
    [0.18, 0.52, 0.30],
    mainWidth,
    MIN_SIZES,
  );

  const panels = getPanelSizes();

  // Les handlers des splitters sont stables (memoïsés dans le hook)
  const splitter0 = createSplitterHandlers(0); // sidebar ↔ centre
  const splitter1 = createSplitterHandlers(1); // centre ↔ right panel

  return (
    <div className="flex h-full flex-col">
      <Header />

      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <div
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                fixed inset-y-0 left-0 z-40 transition-transform duration-200
                md:relative md:z-auto md:translate-x-0 md:h-full
              `}
          style={{ width: panels[0].size, flexShrink: 0 }}
        >
          <Sidebar />
        </div>

        {/* Splitter sidebar ↔ centre (masqué sur mobile) */}
        <Splitter handlers={splitter0} className="hidden md:block" />

        {/* Overlay mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* ===== ZONE CENTRALE (Blockly + Console) ===== */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <WorkspaceArea />
          <Console />
        </div>

        {/* Splitter centre ↔ right panel (masqué sur tablette et mobile) */}
        <Splitter handlers={splitter1} className="hidden lg:block" />

        {/* ===== RIGHT PANEL ===== */}
        <div
          className={`
                ${panelOpen ? 'translate-x-0' : 'translate-x-full'}
                fixed inset-y-0 right-0 z-40 max-w-[90vw] transition-transform duration-200
                lg:relative lg:z-auto lg:translate-x-0 lg:h-full
              `}
          style={{ width: panels[2].size, flexShrink: 0 }}
        >
          <div className="relative h-full">
            <button
              type="button"
              onClick={closePanel}
              className="absolute right-2 top-2 z-10 flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-black/10 lg:hidden"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={16} />
            </button>
            <RightPanel />
          </div>
        </div>

        {/* Overlay mobile right panel */}
        {panelOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={closePanel}
          />
        )}
      </div>

      <StatusBar />
      {cameraControlOpen && (
        <CameraControlOverlay onClose={() => setCameraControlOpen(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ResponsiveProvider>
        <AppProvider>
          <AppLayout />
          <ModelPreloader />
          <BoardListModal />
          <PortListModal />
          <HelpModal />
          <SettingsPanel />
        </AppProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  );
}
