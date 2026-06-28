import { Save, Play, Settings, HelpCircle, Square, Plus, FolderOpen, Download, FlaskConical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

export function Header() {
  const { saveAiProject, setSettingsOpen, setActiveModal, runtimeStatus, stopAiProgram } = useApp();
  const { theme, toggleTheme } = useTheme();
  const isRunning = runtimeStatus === 'running';

  return (
    <header className="flex h-16 items-center border-b border-[var(--color-border)] bg-white px-4 dark:bg-[#0F172A]">
      {/* Logo + Nom */}
      <div className="flex items-center gap-3">
        <img src="/blockly-static/blocklyduino/media/logo_only2.png" alt="Blockly IA" className="h-8 w-8" />
        <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--color-text)' }}>Blockly IA</span>
      </div>

      {/* Titre central */}
      <div className="mx-6 hidden items-center gap-2 text-sm md:flex" style={{ color: 'var(--color-muted)' }}>
        <span>Programme visuel — IA, Robotique, IoT</span>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton icon={Plus} label="Nouveau" onClick={() => window.dispatchEvent(new Event('blocklyduino:new-project'))} />
        <ToolbarButton icon={FolderOpen} label="Ouvrir" />
        <ToolbarButton icon={Save} label="Enregistrer" onClick={saveAiProject} />
        <ToolbarButton icon={Download} label="Exporter" />
        <ToolbarButton icon={FlaskConical} label="Compiler" onClick={() => window.dispatchEvent(new Event('blocklyduino:verify'))} />

        <div className="mx-2 h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />

        {isRunning ? (
          <button
            type="button"
            onClick={stopAiProgram}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--color-error)' }}
          >
            <Square size={16} />
            Arrêter
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('blocklyduino:run-ai-program'))}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Play size={16} />
            Exécuter
          </button>
        )}

        <div className="mx-2 h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />

        <IconButton onClick={toggleTheme} label={theme === 'light' ? 'Mode sombre' : 'Mode clair'}>
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          )}
        </IconButton>
        <IconButton onClick={() => setSettingsOpen(true)} label="Paramètres">
          <Settings size={18} />
        </IconButton>
        <IconButton onClick={() => setActiveModal('help')} label="Aide">
          <HelpCircle size={18} />
        </IconButton>
      </div>
    </header>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all hover:bg-[var(--color-surface-alt)] active:scale-95"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <Icon size={16} />
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex cursor-pointer items-center justify-center rounded-lg p-2 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {children}
    </button>
  );
}
