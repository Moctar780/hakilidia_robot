import './Header.css';

export function Header() {
  return (
    <header className="app-header">
      <div className="app-header__title">
        <img src="/blockly-static/blocklyduino/media/logo_only2.png" alt="" className="app-header__logo" />
        <span className="app-header__name">Blockly IA</span>
      </div>
      <div className="app-header__help">
        <span>Programme visuel avec caméra, scène et reconnaissance IA</span>
      </div>
    </header>
  );
}
