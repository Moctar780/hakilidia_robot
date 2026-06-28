import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { BlocklyCommand, BlocklyMessage } from '../types';

type Options = {
  onCodeChange?: (code: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  onXml?: (xml: string) => void;
  onXmlSnapshot?: (xml: string) => void;
  onBoardChanged?: (boardId: string) => void;
};

export function useBlocklyBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>, options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const postCommand = useCallback(
    (command: BlocklyCommand) => {
      iframeRef.current?.contentWindow?.postMessage({ target: 'blocklyduino-workspace', ...command }, '*');
    },
    [iframeRef],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as BlocklyMessage;
      if (!data || data.source !== 'blocklyduino-workspace') {
        return;
      }
      if (data.type === 'ready') {
        optionsRef.current.onReady?.();
      } else if (data.type === 'code') {
        optionsRef.current.onCodeChange?.(data.code);
      } else if (data.type === 'xml') {
        optionsRef.current.onXml?.(data.xml);
      } else if (data.type === 'xmlSnapshot') {
        optionsRef.current.onXmlSnapshot?.(data.xml);
      } else if (data.type === 'error') {
        optionsRef.current.onError?.(data.message);
      } else if (data.type === 'boardChanged') {
        optionsRef.current.onBoardChanged?.(data.boardId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return useMemo(
    () => ({
      undo: () => postCommand({ command: 'undo' }),
      redo: () => postCommand({ command: 'redo' }),
      clear: () => postCommand({ command: 'clear' }),
      newProject: () => postCommand({ command: 'newProject' }),
      getXml: () => postCommand({ command: 'getXml' }),
      loadXml: (xml: string) => postCommand({ command: 'loadXml', xml }),
      resize: (width?: number, height?: number) => postCommand({ command: 'resize', width, height }),
      setBoard: (boardId: string) => postCommand({ command: 'setBoard', boardId }),
      setLanguage: (language: string) => postCommand({ command: 'setLanguage', language }),
      setTheme: (theme: string) => postCommand({ command: 'setTheme', theme }),
      setRenderer: (renderer: string) => postCommand({ command: 'setRenderer', renderer }),
      toggleCategory: (categoryId: string, enabled: boolean) =>
        postCommand({ command: 'toggleCategory', categoryId, enabled }),
      addBlock: (blockType: string, x?: number, y?: number) =>
        postCommand({ command: 'addBlock', blockType, x, y }),
      setRenderingConstant: (value: number) => postCommand({ command: 'setRenderingConstant', value }),
      setAccessibility: (enabled: boolean) => postCommand({ command: 'setAccessibility', enabled }),
    }),
    [postCommand],
  );
}
