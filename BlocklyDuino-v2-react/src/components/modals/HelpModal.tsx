import { useApp } from '../../context/AppContext';
import './Modal.css';

export function HelpModal() {
  const { activeModal, setActiveModal } = useApp();
  const visible = activeModal === 'help';

  if (!visible) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)} role="presentation">
      <div className="modal modal--help" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <i className="fas fa-question" aria-hidden />
          <span>Aide BlocklyDuino</span>
          <button type="button" className="modal__close" onClick={() => setActiveModal(null)}>
            ×
          </button>
        </header>
        <div className="modal__body modal__body--text">
          <p>
            BlocklyDuino permet de programmer des cartes Arduino par blocs visuels. Le code C/C++ est
            généré automatiquement dans le panneau de droite.
          </p>
          <p>
            Utilisez <kbd>Shift + Ctrl + K</kbd> pour activer le mode accessibilité clavier (comme la
            version originale).
          </p>
        </div>
      </div>
    </div>
  );
}
