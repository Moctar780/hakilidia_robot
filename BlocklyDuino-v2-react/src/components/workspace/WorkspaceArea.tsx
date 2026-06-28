import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { BlocklyPanel } from './BlocklyPanel';

export function WorkspaceArea() {
  const { blockly } = useApp();

  const notifyResize = useCallback(() => {
    requestAnimationFrame(() => blockly?.resize());
  }, [blockly]);

  return (
    <main className="flex flex-1 overflow-hidden" onMouseUp={notifyResize}>
      <BlocklyPanel />
    </main>
  );
}
