import { useApp } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import './BottomBar.css';

export function BottomBar() {
  const {
    detailedCompilation,
    setDetailedCompilation,
    selectedBoardLabel,
    selectedPort,
  } = useApp();

  return (
    <div className="bottom-bar">
      <label className="bottom-bar__compilation">
        <input
          type="checkbox"
          checked={detailedCompilation}
          onChange={(e) => setDetailedCompilation(e.target.checked)}
        />
        <span>Compilation détaillée</span>
      </label>
      <div className="bottom-bar__info">
        <span>{selectedBoardLabel}</span>
        <span> | {selectedPort || 'aucun port'}</span>
        <IconButton icon={<i className="fas fa-external-link-alt" aria-hidden />} onClick={() => {}} />
      </div>
    </div>
  );
}
