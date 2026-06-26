import { Header } from './components/layout/Header';
import { Toolbar } from './components/layout/Toolbar';
import { WorkspaceArea } from './components/workspace/WorkspaceArea';
import { BoardListModal } from './components/modals/BoardListModal';
import { PortListModal } from './components/modals/PortListModal';
import { HelpModal } from './components/modals/HelpModal';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { AppProvider } from './context/AppContext';
import './styles/global.css';

export default function App() {
  return (
    <AppProvider>
      <div className="app-shell">
        <Header />
        <Toolbar />
        <WorkspaceArea />
        <BoardListModal />
        <PortListModal />
        <HelpModal />
        <SettingsPanel />
      </div>
    </AppProvider>
  );
}
