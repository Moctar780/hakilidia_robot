import { useState, useRef, useEffect } from 'react';
import { Terminal, AlertCircle, FileText, Bug, Search, Trash2, GripHorizontal } from 'lucide-react';
import { SerialConsole } from '../workspace/SerialConsole';
import { useApp } from '../../context/AppContext';
import { useProportionalResize } from '../../hooks/useProportionalResize';

type ConsoleTab = 'console' | 'compilation' | 'logs' | 'errors' | 'debug';

const tabs: { id: ConsoleTab; label: string; icon: React.ComponentType<{ size?: number }>; color?: string }[] = [
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'compilation', label: 'Compilation', icon: FileText },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'errors', label: 'Erreurs', icon: AlertCircle, color: '#EF4444' },
  { id: 'debug', label: 'Débogage', icon: Bug },
];

export function Console() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('console');
  const [search, setSearch] = useState('');
  const [minimized, setMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [parentHeight, setParentHeight] = useState(600);
  const { clearRuntimeLogs } = useApp();

  // Mesure du parent pour le dimensionnement proportionnel vertical
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const measure = () => setParentHeight(el.clientHeight);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Gestion proportionnelle : [workspace, console]
  // La console prend ~18% de la hauteur disponible par défaut
  const {
    getPanelSizes,
    createVerticalSplitterHandlers,
  } = useProportionalResize(
    [0.82, 0.18],
    parentHeight,
    [100, 80], // hauteurs min : workspace 100px, console 80px
  );

  const panels = getPanelSizes();
  const consoleHeight = panels[1].size;
  const splitterHandlers = createVerticalSplitterHandlers(0); // workspace ↔ console

  // Détermine la couleur de l'onglet actif
  const activeTabColor = tabs.find((t) => t.id === activeTab)?.color;

  const displayHeight = minimized ? 28 : consoleHeight;

  return (
    <div
      ref={containerRef}
      className="flex shrink-0 flex-col border-t"
      style={{
        height: displayHeight,
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      {/* Barre de redimensionnement — style VS Code */}
      <div
        className="split-pane__splitter split-pane__splitter--row flex items-center justify-center py-0.5 transition-colors hover:bg-[var(--color-primary)]/10 hover:cursor-row-resize"
        onMouseDown={minimized ? undefined : splitterHandlers.onMouseDown}
        onDoubleClick={() => setMinimized(!minimized)}
        style={{ borderColor: 'var(--color-border)' }}
      >
        <GripHorizontal size={14} style={{ color: 'var(--color-muted)' }} />
      </div>

      {/* Onglets */}
      <div className="flex items-center border-b px-2" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex cursor-pointer items-center gap-1.5 border-b-2 px-1.5 py-1.5 text-xs font-medium transition-all md:px-3"
                style={{
                  borderBottomColor: isActive ? (activeTabColor ?? 'var(--color-primary)') : 'transparent',
                  color: isActive ? (activeTabColor ?? 'var(--color-primary)') : 'var(--color-muted)',
                }}
              >
                <tab.icon size={13} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bouton minimiser (visible sur mobile) */}
        <button
          type="button"
          onClick={() => setMinimized(!minimized)}
          className="inline-flex cursor-pointer items-center rounded p-1 text-xs transition-colors hover:bg-[var(--color-surface-alt)] md:hidden"
          style={{ color: 'var(--color-muted)' }}
          title={minimized ? 'Agrandir' : 'Minimiser'}
        >
          {minimized ? <span style={{ fontSize: 16 }}>▲</span> : <span style={{ fontSize: 16 }}>▼</span>}
        </button>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-32 rounded border bg-[var(--color-surface-alt)] py-0.5 pl-6 pr-1.5 text-xs outline-none"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
          <button
            type="button"
            onClick={clearRuntimeLogs}
            className="inline-flex cursor-pointer items-center rounded p-1 text-xs transition-colors hover:bg-[var(--color-surface-alt)]"
            style={{ color: 'var(--color-muted)' }}
            title="Effacer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Contenu (masqué si minimisé) */}
      {!minimized && (
      <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {activeTab === 'console' && <SerialConsole height={consoleHeight - 60} />}
        {activeTab === 'logs' && <RuntimeLogs />}
        {activeTab === 'errors' && (
          <div className="flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
            <AlertCircle size={14} />
            <span>Aucune erreur</span>
          </div>
        )}
        {activeTab === 'debug' && <span>Mode debug — affichage des trames brutes</span>}
        {activeTab === 'compilation' && <span>Compilation — résultats de compilation Arduino</span>}
      </div>
      )}
    </div>
  );
}

function RuntimeLogs() {
  const { runtimeLogs } = useApp();
  return (
    <div className="space-y-0.5">
      {runtimeLogs.map((log, i) => (
        <div key={i}>{log}</div>
      ))}
    </div>
  );
}
