import { BOARDS } from '../../constants';
import { useApp } from '../../context/AppContext';
import './Modal.css';

export function BoardListModal() {
  const { activeModal, setActiveModal, selectedBoardId, setSelectedBoardId, blockly } = useApp();
  const visible = activeModal === 'board';

  if (!visible) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <i className="fas fa-microchip" aria-hidden />
          <span>Sélection de la carte</span>
          <button type="button" className="modal__close" onClick={() => setActiveModal(null)}>
            ×
          </button>
        </header>
        <div className="modal__body">
          <p className="modal__group-label">C / C++</p>
          <ul className="modal__list">
            {BOARDS.map((board) => (
              <li key={board.id}>
                <button
                  type="button"
                  className={`modal__option${selectedBoardId === board.id ? ' modal__option--selected' : ''}`}
                  onClick={() => {
                    setSelectedBoardId(board.id);
                    blockly?.setBoard(board.id);
                  }}
                >
                  {board.label}
                  <span className="modal__option-meta">{board.fqbn}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" className="modal__ok" onClick={() => setActiveModal(null)}>
          ✔
        </button>
      </div>
    </div>
  );
}
