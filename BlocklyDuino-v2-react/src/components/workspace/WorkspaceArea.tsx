import { useCallback, useRef, useState } from 'react';
import { sizes } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { BlocklyPanel } from './BlocklyPanel';
import { CodeEditor } from './CodeEditor';
import { ResizeHandle } from './ResizeHandle';
import { BottomBar } from './BottomBar';
import { SerialConsole } from './SerialConsole';
import { AiStage } from '../ai/AiStage';
import './WorkspaceArea.css';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function WorkspaceArea() {
  const { codeReadOnly, setCodeReadOnly, blockly } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const sidePanelRef = useRef<HTMLElement>(null);
  const dragSnapshot = useRef({ codeWidth: 0, serialHeight: 0, sideCodeHeight: 0 });
  const [sidePanelWidth, setSidePanelWidth] = useState(sizes.sidePanelMin);
  const [sideCodeHeight, setSideCodeHeight] = useState(260);
  const [serialHeight, setSerialHeight] = useState(sizes.serialMinHeight);

  const notifyResize = useCallback(() => {
    requestAnimationFrame(() => blockly?.resize());
  }, [blockly]);

  const handleCodeDragStart = () => {
    dragSnapshot.current.codeWidth = sidePanelWidth;
  };

  const handleCodeDrag = (delta: number) => {
    const maxWidth = (containerRef.current?.clientWidth ?? 800) - sizes.blocksMin - sizes.separatorWidth;
    setSidePanelWidth(
      clamp(dragSnapshot.current.codeWidth - delta, sizes.sidePanelMin, Math.max(sizes.sidePanelMin, maxWidth)),
    );
  };

  const handleSerialDragStart = () => {
    dragSnapshot.current.serialHeight = serialHeight;
  };

  const handleSerialDrag = (delta: number) => {
    const maxHeight = (containerRef.current?.clientHeight ?? 600) * 0.5;
    setSerialHeight(clamp(dragSnapshot.current.serialHeight - delta, sizes.serialMinHeight, maxHeight));
  };

  const handleSideCodeDragStart = () => {
    dragSnapshot.current.sideCodeHeight = sideCodeHeight;
  };

  const handleSideCodeDrag = (delta: number) => {
    const sidePanelHeight = sidePanelRef.current?.clientHeight ?? 520;
    const reservedHeight = sizes.bottomBarHeight + sizes.sideAiMinHeight;
    const maxHeight = Math.max(sizes.sideCodeMinHeight, sidePanelHeight - reservedHeight);
    setSideCodeHeight(clamp(dragSnapshot.current.sideCodeHeight + delta, sizes.sideCodeMinHeight, maxHeight));
  };

  return (
    <main ref={containerRef} className="workspace-area">
      <div className="workspace-area__top">
        <BlocklyPanel />
        <ResizeHandle
          orientation="horizontal"
          onDragStart={handleCodeDragStart}
          onDrag={handleCodeDrag}
          onDragEnd={notifyResize}
        >
          <label className="switch">
            <input
              type="checkbox"
              checked={!codeReadOnly}
              onChange={(e) => setCodeReadOnly(!e.target.checked)}
            />
            <span className="slider" />
          </label>
        </ResizeHandle>
        <aside ref={sidePanelRef} className="workspace-area__side-panel" style={{ width: sidePanelWidth }}>
          <div className="workspace-area__side-header">
            <strong>Volet Arduino & IA</strong>
            <span>Code, scène et reconnaissance</span>
          </div>
          <section
            className="workspace-area__side-section workspace-area__side-section--code"
            style={{ flexBasis: sideCodeHeight }}
            aria-label="Code Arduino"
          >
            <div className="workspace-area__side-label">Code Arduino généré</div>
            <CodeEditor width={sidePanelWidth} />
          </section>
          <ResizeHandle
            orientation="vertical"
            className="workspace-area__side-resizer"
            onDragStart={handleSideCodeDragStart}
            onDrag={handleSideCodeDrag}
            onDragEnd={notifyResize}
          >
            <span className="workspace-area__resize-grip" />
          </ResizeHandle>
          <section className="workspace-area__side-section workspace-area__side-section--ai" aria-label="Scène IA">
            <AiStage />
          </section>
        </aside>
      </div>

      <ResizeHandle
        orientation="vertical"
        onDragStart={handleSerialDragStart}
        onDrag={handleSerialDrag}
        onDragEnd={notifyResize}
      >
        <BottomBar />
      </ResizeHandle>

      <SerialConsole height={serialHeight} />
    </main>
  );
}
