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
import './styles/global.css';

/** Tailles fixes des panneaux */
const SIDEBAR_WIDTH = 280;
const PANEL_WIDTH = 360;
const PANEL_WIDTH_EXPANDED = '55%';

function AppLayout() {
  const { sidebarOpen, panelOpen, closeSidebar, closePanel } = useResponsive();
  const { cameraControlOpen, setCameraControlOpen, simulatorExpanded } = useApp();

  return (
    <div className="flex h-full flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* ===== SIDEBAR ===== */}
        <div
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                fixed inset-y-0 left-0 z-40 transition-transform duration-200
                md:relative md:z-auto md:translate-x-0 md:h-full
              `}
          style={{ width: SIDEBAR_WIDTH, flexShrink: 0 }}
        >
          <Sidebar />
        </div>

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

        {/* ===== RIGHT PANEL ===== */}
        <div
          className={`
                ${panelOpen ? 'translate-x-0' : 'translate-x-full'}
                fixed inset-y-0 right-0 z-40 max-w-[90vw] transition-transform duration-200
                lg:relative lg:z-auto lg:translate-x-0 lg:h-full
              `}
          style={{ width: simulatorExpanded ? PANEL_WIDTH_EXPANDED : PANEL_WIDTH, flexShrink: 0 }}
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
