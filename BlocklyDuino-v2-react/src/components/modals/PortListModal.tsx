import { useApp } from '../../context/AppContext';
import './Modal.css';

export function PortListModal() {
  const { activeModal, setActiveModal, selectedPort, setSelectedPort, ports, refreshPorts } = useApp();
  const visible = activeModal === 'port';

  if (!visible) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal__header">
          <i className="fab fa-usb" aria-hidden />
          <span>Sélection du port</span>
          <button type="button" className="modal__refresh" onClick={refreshPorts}>
            Rafraîchir
          </button>
          <button type="button" className="modal__close" onClick={() => setActiveModal(null)}>
            ×
          </button>
        </header>
        <div className="modal__body">
          <ul className="modal__list">
            {ports.length === 0 && <li className="modal__empty">Aucun port détecté. Lancez le service Arduino local puis rafraîchissez.</li>}
            {ports.map((port) => (
              <li key={port.address}>
                <button
                  type="button"
                  className={`modal__option${selectedPort === port.address ? ' modal__option--selected' : ''}`}
                  onClick={() => setSelectedPort(port.address)}
                >
                  {port.label}
                  <span className="modal__option-meta">{port.address}</span>
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
