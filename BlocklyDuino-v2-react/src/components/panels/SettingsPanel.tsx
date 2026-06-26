import { useApp } from '../../context/AppContext';
import './SettingsPanel.css';

export function SettingsPanel() {
  const {
    settingsOpen,
    setSettingsOpen,
    blockly,
    serviceUrl,
    setServiceUrl,
    serviceConnected,
    refreshPorts,
  } = useApp();

  if (!settingsOpen) {
    return null;
  }

  return (
    <>
      <div className="settings-overlay" onClick={() => setSettingsOpen(false)} role="presentation" />
      <aside className="settings-panel" aria-label="Paramètres">
        <header className="settings-panel__header">
          <h2>Paramètres</h2>
          <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Fermer">
            ×
          </button>
        </header>

        <section className="settings-panel__section">
          <h3>Interface</h3>
          <label>
            Langue
            <select defaultValue="fr" onChange={(event) => blockly?.setLanguage(event.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            Thème Blockly
            <select defaultValue="classic" onChange={(event) => blockly?.setTheme(event.target.value)}>
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="dark">Dark</option>
              <option value="zelos">Zelos</option>
            </select>
          </label>
          <label>
            Renderer
            <select defaultValue="geras" onChange={(event) => blockly?.setRenderer(event.target.value)}>
              <option value="geras">Geras</option>
              <option value="thrasos">Thrasos</option>
              <option value="zelos">Zelos</option>
              <option value="minimalist">Minimalist</option>
            </select>
          </label>
        </section>

        <section className="settings-panel__section">
          <h3>Accessibilité</h3>
          <label className="settings-panel__row">
            <input type="checkbox" onChange={(event) => blockly?.setAccessibility(event.target.checked)} />
            Activer la navigation clavier Blockly
          </label>
          <label>
            Taille de rendu
            <input
              type="range"
              min="3"
              max="50"
              defaultValue="14"
              onChange={(event) => blockly?.setRenderingConstant(Number(event.target.value))}
            />
          </label>
        </section>

        <section className="settings-panel__section">
          <h3>Arduino CLI</h3>
          <p className="settings-panel__hint">
            État du service : {serviceConnected ? 'connecté' : 'non connecté'}.
          </p>
          <label>
            URL du service local
            <input type="text" value={serviceUrl} onChange={(event) => setServiceUrl(event.target.value)} />
          </label>
          <button type="button" className="settings-panel__button" onClick={refreshPorts}>
            Tester et rafraîchir les ports
          </button>
        </section>
      </aside>
    </>
  );
}
