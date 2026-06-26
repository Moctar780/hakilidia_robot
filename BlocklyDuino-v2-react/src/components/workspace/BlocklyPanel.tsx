import { useEffect, useRef } from 'react';
import { BLOCKLY_WORKSPACE_URL } from '../../constants';
import { useApp } from '../../context/AppContext';
import { useBlocklyBridge } from '../../hooks/useBlocklyBridge';
import './BlocklyPanel.css';

export function BlocklyPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<ReturnType<typeof useBlocklyBridge> | null>(null);
  const { setGeneratedCode, setBlocklyActions, setSelectedBoardId, setWorkspaceXml } = useApp();

  const bridge = useBlocklyBridge(iframeRef, {
    onCodeChange: setGeneratedCode,
    onReady: () => {
      const el = containerRef.current;
      if (el && bridgeRef.current) {
        bridgeRef.current.resize(el.clientWidth, el.clientHeight);
      }
    },
    onXml: (xml) => {
      setWorkspaceXml(xml);
      const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sketch.xml';
      link.click();
      URL.revokeObjectURL(url);
    },
    onXmlSnapshot: setWorkspaceXml,
    onBoardChanged: setSelectedBoardId,
    onError: (message) => console.error('Blockly:', message),
  });

  bridgeRef.current = bridge;

  useEffect(() => {
    setBlocklyActions(bridge);
    return () => setBlocklyActions(null);
  }, [bridge, setBlocklyActions]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !window.ResizeObserver) {
      return;
    }
    const observer = new ResizeObserver(() => {
      bridge.resize(el.clientWidth, el.clientHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [bridge]);

  return (
    <div ref={containerRef} className="blockly-panel">
      <iframe
        ref={iframeRef}
        title="Blockly workspace"
        src={BLOCKLY_WORKSPACE_URL}
        className="blockly-panel__iframe"
      />
    </div>
  );
}
