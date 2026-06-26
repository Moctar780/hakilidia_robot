import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { IconButton } from '../ui/IconButton';
import { PopupMenu, type PopupMenuItem } from '../menus/PopupMenu';
import './Toolbar.css';

const fa = (name: string) => <i className={`fas fa-${name}`} aria-hidden />;

export function Toolbar() {
  const {
    activePopup,
    setActivePopup,
    setActiveModal,
    setSettingsOpen,
    generatedCode,
    blockly,
    verifyCode,
    uploadCode,
    saveAiProject,
  } = useApp();

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadXmlFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,text/xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        blockly?.loadXml(await file.text());
      }
    };
    input.click();
  };

  const menuItems: PopupMenuItem[] = useMemo(
    () => [
      { id: 'new', label: 'Nouveau projet', icon: fa('file'), onPress: () => blockly?.newProject() },
      { id: 'load', label: 'Charger XML', icon: fa('folder-open'), onPress: loadXmlFile },
      { id: 'saveXml', label: 'Sauver XML', icon: fa('save'), onPress: () => blockly?.getXml() },
      { id: 'saveCode', label: 'Sauver le code', icon: fa('download'), onPress: () => downloadTextFile('sketch.ino', generatedCode), separatorAfter: true },
      { id: 'saveProject', label: 'Sauver projet IA', icon: fa('cloud-upload-alt'), onPress: saveAiProject, separatorAfter: true },
      { id: 'params', label: 'Paramètres', icon: fa('cog'), onPress: () => setSettingsOpen(true), separatorAfter: true },
      { id: 'reset', label: 'Réinitialiser', icon: fa('power-off'), onPress: () => blockly?.clear(), separatorAfter: true },
      { id: 'help', label: 'Aide', icon: fa('question'), onPress: () => setActiveModal('help') },
    ],
    [blockly, generatedCode, saveAiProject, setActiveModal, setSettingsOpen],
  );

  const toolsItems: PopupMenuItem[] = [
    { id: 'wiring', label: 'Câblage', icon: fa('code-branch'), onPress: () => window.open('/blockly-static/tools/hackcable/index.html', '_blank'), separatorAfter: true },
    { id: 'factory', label: 'Usine de blocs', icon: fa('industry'), onPress: () => window.open('/blockly-static/tools/blockFactory/blockFactory.html?lang=fr', '_blank'), separatorAfter: true },
    { id: 'html', label: 'HTML', icon: <i className="fab fa-firefox-browser" aria-hidden />, onPress: () => window.open('/blockly-static/tools/html/html_factory.html', '_blank'), separatorAfter: true },
    { id: 'color', label: 'Conversion couleurs', icon: fa('swatchbook'), separatorAfter: true },
    { id: 'data', label: 'Conversion données', icon: fa('exchange-alt') },
  ];

  const iotItems: PopupMenuItem[] = [
    { id: 'webserver', label: 'Serveur web', icon: fa('network-wired'), separatorAfter: true },
    { id: 'papyrus', label: 'Papyrus', icon: <span>📐</span>, separatorAfter: true },
    { id: 'arrowhead', label: 'Arrowhead', icon: <span>➡</span>, separatorAfter: true },
    { id: 'blynk', label: 'Blynk', icon: <span>📱</span> },
  ];

  const togglePopup = (id: 'menu' | 'tools' | 'iot') => {
    setActivePopup(activePopup === id ? null : id);
  };

  return (
    <nav className="toolbar">
      <IconButton icon={fa('ellipsis-v')} active={activePopup === 'menu'} onClick={() => togglePopup('menu')} />
      <IconButton icon={fa('expand-arrows-alt')} onClick={() => document.documentElement.requestFullscreen?.()} />
      <IconButton icon={fa('undo-alt')} onClick={() => blockly?.undo()} />
      <IconButton icon={fa('redo-alt')} onClick={() => blockly?.redo()} />
      <IconButton icon={fa('toolbox')} active={activePopup === 'tools'} onClick={() => togglePopup('tools')} />
      <IconButton icon={fa('link')} active={activePopup === 'iot'} onClick={() => togglePopup('iot')} />
      <IconButton icon={fa('microchip')} onClick={() => setActiveModal('board')} />
      <IconButton icon={fa('check')} variant="round" onClick={verifyCode} />
      <IconButton icon={<i className="fab fa-usb" aria-hidden />} onClick={() => setActiveModal('port')} />
      <IconButton icon={fa('sign-out-alt')} variant="round" onClick={uploadCode} />
      <IconButton icon={fa('search')} variant="round" onClick={() => {}} />

      <PopupMenu
        visible={activePopup === 'menu'}
        items={menuItems}
        onClose={() => setActivePopup(null)}
      />
      <PopupMenu
        visible={activePopup === 'tools'}
        items={toolsItems}
        onClose={() => setActivePopup(null)}
        align="center"
      />
      <PopupMenu
        visible={activePopup === 'iot'}
        items={iotItems}
        onClose={() => setActivePopup(null)}
      />
    </nav>
  );
}
