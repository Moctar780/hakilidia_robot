import { ThemeProvider } from './context/ThemeContext';
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
import './styles/global.css';

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <div className="flex h-full flex-col">
          {/* 1. Barre supérieure */}
          <Header />

          {/* Corps principal: sidebar | blockly | right panel */}
          <div className="flex flex-1 overflow-hidden">
            {/* 2. Palette de blocs */}
            <Sidebar />

            {/* 3. Zone Blockly + console */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <WorkspaceArea />
              {/* 5. Console */}
              <Console />
            </div>

            {/* 4. Panneau de droite */}
            <RightPanel />
          </div>

          {/* 6. Barre d'état */}
          <StatusBar />
        </div>

        <BoardListModal />
        <PortListModal />
        <HelpModal />
        <SettingsPanel />
      </AppProvider>
    </ThemeProvider>
  );
}
