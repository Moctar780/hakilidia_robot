import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ResponsiveContextValue = {
  sidebarOpen: boolean;
  panelOpen: boolean;
  toggleSidebar: () => void;
  togglePanel: () => void;
  closeSidebar: () => void;
  closePanel: () => void;
};

const ResponsiveContext = createContext<ResponsiveContextValue | null>(null);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <ResponsiveContext.Provider value={{ sidebarOpen, panelOpen, toggleSidebar, togglePanel, closeSidebar, closePanel }}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) throw new Error('useResponsive must be used within ResponsiveProvider');
  return ctx;
}
