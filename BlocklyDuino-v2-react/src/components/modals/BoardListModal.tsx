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
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
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
