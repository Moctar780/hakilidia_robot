import { Save, Play, Settings, HelpCircle, Square, Plus, FolderOpen, Download, FlaskConical, Menu, PanelRightClose, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../context/ResponsiveContext';
import { downloadProjectFile, createProjectFile, importProjectFile } from '../../lib/projectFiles';

export function Header() {
  const { saveAiProject, loadAiProject, setSettingsOpen, setActiveModal, runtimeStatus, stopAiProgram, buildCurrentProject, blockly, newAiProject, switchAiProject, closeAiProject, projects, activeProjectIndex } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar, togglePanel } = useResponsive();
  const isRunning = runtimeStatus === 'running';

  const handleOpen = async () => {
    const file = await importProjectFile();
    if (!file) return;
    blockly?.loadXml(file.workspaceXml);
    loadAiProject({
      id: `project-${Date.now()}`,
      name: file.name,
      workspaceXml: file.workspaceXml,
      runtimeCode: file.runtimeCode,
      sprites: [],
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  };

  const handleExport = () => {
    const project = buildCurrentProject();
    const file = createProjectFile(project.name, project.workspaceXml, project.runtimeCode, project.createdAt);
    downloadProjectFile(file);
  };

  return (
    <header className="flex flex-col border-b border-[var(--color-border)] bg-white dark:bg-[#0F172A]">
      {/* Rangée supérieure : logo + actions */}
      <div className="flex h-12 items-center px-2 md:px-4">
        <button type="button" onClick={toggleSidebar}
          className="mr-1 flex cursor-pointer items-center justify-center rounded-lg p-2 md:hidden"
          style={{ color: 'var(--color-text-secondary)' }} aria-label="Menu blocs">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 md:gap-3">
          <img src="/blockly-static/blocklyduino/media/logo_only2.png" alt="Blockly IA" className="h-7 w-7 md:h-8 md:w-8" />
          <span className="hidden text-base font-semibold tracking-tight sm:inline md:text-lg" style={{ color: 'var(--color-text)' }}>Blockly IA</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden md:flex md:items-center md:gap-1">
            <ToolbarButton icon={Plus} label="Nouveau" onClick={newAiProject} />
            <ToolbarButton icon={FolderOpen} label="Ouvrir" onClick={handleOpen} />
            <ToolbarButton icon={Save} label="Enregistrer" onClick={saveAiProject} />
            <ToolbarButton icon={Download} label="Exporter" onClick={handleExport} />
            <ToolbarButton icon={FlaskConical} label="Compiler" onClick={() => window.dispatchEvent(new Event('blocklyduino:verify'))} />
            <div className="mx-2 h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>
          {isRunning ? (
            <button type="button" onClick={stopAiProgram}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95 md:gap-1.5 md:px-3 md:py-1.5 md:text-sm"
              style={{ backgroundColor: 'var(--color-error)' }}>
              <Square size={14} /><span className="hidden md:inline">Arrêter</span>
            </button>
          ) : (
            <button type="button" onClick={() => window.dispatchEvent(new Event('blocklyduino:run-ai-program'))}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 active:scale-95 md:gap-1.5 md:px-3 md:py-1.5 md:text-sm"
              style={{ backgroundColor: 'var(--color-primary)' }}>
              <Play size={14} /><span className="hidden md:inline">Exécuter</span>
            </button>
          )}
          <div className="mx-1 h-5 w-px md:mx-2 md:h-6" style={{ backgroundColor: 'var(--color-border)' }} />
          <button type="button" onClick={togglePanel}
            className="flex cursor-pointer items-center justify-center rounded-lg p-2 lg:hidden"
            style={{ color: 'var(--color-text-secondary)' }} aria-label="Panneau">
            <PanelRightClose size={18} />
          </button>
          <div className="hidden items-center gap-1 md:flex">
            <IconButton onClick={toggleTheme} label={theme === 'light' ? 'Mode sombre' : 'Mode clair'}>
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
              )}
            </IconButton>
            <IconButton onClick={() => setSettingsOpen(true)} label="Paramètres"><Settings size={18} /></IconButton>
            <IconButton onClick={() => setActiveModal('help')} label="Aide"><HelpCircle size={18} /></IconButton>
          </div>
        </div>
      </div>

      {/* Barre d'onglets projets */}
      {projects.length > 0 && (
        <div className="flex h-8 items-center gap-0 border-t px-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}>
          <div className="flex flex-1 items-center gap-0 overflow-x-auto">
            {projects.map((proj, index) => (
              <div
                key={proj.id}
                onClick={() => switchAiProject(index)}
                className={`group flex cursor-pointer items-center gap-1.5 rounded-t px-2.5 py-1 text-xs transition-colors ${
                  index === activeProjectIndex
                    ? 'bg-white font-medium shadow-sm dark:bg-[#1E293B]'
                    : 'hover:bg-white/50 dark:hover:bg-[#1E293B]/50'
                }`}
                style={{
                  color: index === activeProjectIndex ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  borderBottom: index === activeProjectIndex ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
              >
                {proj.name}
                <button type="button" onClick={(e) => { e.stopPropagation(); closeAiProject(index); }}
                  className="flex cursor-pointer items-center justify-center rounded p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-surface-alt)] group-hover:opacity-100"
                  style={{ color: 'var(--color-muted)' }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={newAiProject}
            className="flex cursor-pointer items-center justify-center rounded p-1 text-xs transition-colors hover:bg-[var(--color-surface-alt)]"
            style={{ color: 'var(--color-muted)' }} title="Nouveau projet">
            <Plus size={14} />
          </button>
        </div>
      )}
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
