import { ThemeProvider } from './context/ThemeContext';
import { ResponsiveProvider, useResponsive } from './context/ResponsiveContext';
import { AppProvider } from './context/AppContext';
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
import { X } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import './styles/global.css';

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 480;
const PANEL_MIN = 240;
const PANEL_MAX = 600;

function useDragResize(
  ref: React.RefObject<HTMLDivElement | null>,
  onResize: (delta: number) => void,
) {
  const state = useRef({ dragging: false, lastX: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      state.current.dragging = true;
      state.current.lastX = e.clientX;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!state.current.dragging) return;
      const delta = e.clientX - state.current.lastX;
      state.current.lastX = e.clientX;
      onResize(delta);
    };
    const onMouseUp = () => {
      if (!state.current.dragging) return;
      state.current.dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [ref, onResize]);
}

function DragHandle({ dragRef }: { dragRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={dragRef}
      className="flex h-full w-3 cursor-col-resize items-center justify-center transition-colors hover:bg-[var(--color-primary)]/10 active:bg-[var(--color-primary)]/20"
    >
      <div className="h-8 w-0.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

function AppLayout() {
  const { sidebarOpen, panelOpen, closeSidebar, closePanel } = useResponsive();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [panelWidth, setPanelWidth] = useState(360);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const sidebarDragRef = useRef<HTMLDivElement | null>(null);
  const panelDragRef = useRef<HTMLDivElement | null>(null);

  useDragResize(sidebarDragRef, useCallback((delta: number) => {
    setSidebarWidth((w) => clamp(w + delta, SIDEBAR_MIN, SIDEBAR_MAX));
  }, []));

  useDragResize(panelDragRef, useCallback((delta: number) => {
    setPanelWidth((w) => clamp(w - delta, PANEL_MIN, PANEL_MAX));
  }, []));

  return (
    <div className="flex h-full flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            fixed inset-y-0 left-0 z-40 transition-transform duration-200
            md:relative md:z-auto md:translate-x-0 md:h-full
          `}
          style={{ width: sidebarWidth }}
        >
          <Sidebar />
        </div>

        {/* Poignée de redimensionnement sidebar */}
        <div className="relative hidden md:block">
          <DragHandle dragRef={sidebarDragRef} />
        </div>

        {/* Overlay mobile pour le sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Zone Blockly + console */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <WorkspaceArea />
          <Console />
        </div>

        {/* Poignée de redimensionnement right panel */}
        <div className="relative hidden lg:block">
          <DragHandle dragRef={panelDragRef} />
        </div>

        {/* RightPanel */}
        <div
          className={`
            ${panelOpen ? 'translate-x-0' : 'translate-x-full'}
            fixed inset-y-0 right-0 z-40 max-w-[90vw] transition-transform duration-200
            lg:relative lg:z-auto lg:translate-x-0 lg:h-full
          `}
          style={{ width: panelWidth }}
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

        {/* Overlay mobile pour le right panel */}
        {panelOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={closePanel}
          />
        )}
      </div>

      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ResponsiveProvider>
        <AppProvider>
          <AppLayout />
          <BoardListModal />
          <PortListModal />
          <HelpModal />
          <SettingsPanel />
        </AppProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  );
}
