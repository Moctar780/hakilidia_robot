import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AI_SERVICE_DEFAULT_URL,
  ARDUINO_SERVICE_DEFAULT_URL,
  BOARDS,
  DEFAULT_AI_PROJECT,
  DEFAULT_CODE,
  boardById,
  createAiClient,
  createStorageAdapter,
  type AiDetectionResult,
  type AiInferenceRequest,
  type AiProject,
  type AiSprite,
  type PortInfo,
  type SparkiCommandResponse,
} from '../constants';
import type { ModalId, PopupId } from '../types';

type BlocklyActions = {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  newProject: () => void;
  getXml: () => void;
  loadXml: (xml: string) => void;
  resize: (width?: number, height?: number) => void;
  setBoard: (boardId: string) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: string) => void;
  setRenderer: (renderer: string) => void;
  toggleCategory: (categoryId: string, enabled: boolean) => void;
  setRenderingConstant: (value: number) => void;
  setAccessibility: (enabled: boolean) => void;
};

type AppContextValue = {
  generatedCode: string;
  setGeneratedCode: (code: string) => void;
  codeReadOnly: boolean;
  setCodeReadOnly: (value: boolean) => void;
  detailedCompilation: boolean;
  setDetailedCompilation: (value: boolean) => void;
  selectedBoardId: string;
  setSelectedBoardId: (id: string) => void;
  selectedPort: string;
  setSelectedPort: (port: string) => void;
  selectedBoardLabel: string;
  workspaceXml: string;
  setWorkspaceXml: (xml: string) => void;
  aiProject: AiProject;
  aiServiceUrl: string;
  setAiServiceUrl: (url: string) => void;
  aiServiceConnected: boolean;
  sprites: AiSprite[];
  setSprites: (sprites: AiSprite[] | ((prev: AiSprite[]) => AiSprite[])) => void;
  lastDetection: AiDetectionResult | null;
  setLastDetection: (result: AiDetectionResult | null) => void;
  runtimeStatus: 'idle' | 'running' | 'stopped' | 'error';
  setRuntimeStatus: (status: AppContextValue['runtimeStatus']) => void;
  runtimeLogs: string[];
  appendRuntimeLog: (message: string) => void;
  clearRuntimeLogs: () => void;
  activePopup: PopupId;
  setActivePopup: (id: PopupId) => void;
  activeModal: ModalId;
  setActiveModal: (id: ModalId) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  serialOutput: string;
  setSerialOutput: (value: string | ((prev: string) => string)) => void;
  ports: PortInfo[];
  serviceUrl: string;
  setServiceUrl: (url: string) => void;
  serviceConnected: boolean;
  compileStatus: 'idle' | 'running' | 'success' | 'error';
  refreshPorts: () => Promise<void>;
  verifyCode: () => Promise<void>;
  uploadCode: () => Promise<void>;
  sendSparkiCommand: (command: string, expectReply?: boolean) => Promise<SparkiCommandResponse>;
  saveAiProject: () => Promise<void>;
  loadAiProject: (project: AiProject) => void;
  inferWithAi: (request: AiInferenceRequest) => Promise<AiDetectionResult>;
  blockly: BlocklyActions | null;
  setBlocklyActions: (actions: BlocklyActions | null) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [generatedCode, setGeneratedCode] = useState(DEFAULT_CODE);
  const [workspaceXml, setWorkspaceXml] = useState('');
  const [aiProject, setAiProject] = useState<AiProject>(DEFAULT_AI_PROJECT);
  const [aiServiceUrl, setAiServiceUrl] = useState(AI_SERVICE_DEFAULT_URL);
  const [aiServiceConnected, setAiServiceConnected] = useState(false);
  const [sprites, setSprites] = useState<AiSprite[]>(DEFAULT_AI_PROJECT.sprites);
  const [lastDetection, setLastDetection] = useState<AiDetectionResult | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<AppContextValue['runtimeStatus']>('idle');
  const [runtimeLogs, setRuntimeLogs] = useState<string[]>(['Runtime IA prêt.']);
  const [codeReadOnly, setCodeReadOnly] = useState(false);
  const [detailedCompilation, setDetailedCompilation] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState('arduino_uno');
  const [selectedPort, setSelectedPort] = useState('');
  const [activePopup, setActivePopup] = useState<PopupId>(null);
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serialOutput, setSerialOutput] = useState('Console série prête...\n');
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [serviceUrl, setServiceUrl] = useState(ARDUINO_SERVICE_DEFAULT_URL);
  const [serviceConnected, setServiceConnected] = useState(false);
  const [compileStatus, setCompileStatus] = useState<AppContextValue['compileStatus']>('idle');
  const [blockly, setBlocklyActions] = useState<BlocklyActions | null>(null);
  const storage = useMemo(() => createStorageAdapter(window.localStorage), []);
  const aiClient = useMemo(() => createAiClient(aiServiceUrl), [aiServiceUrl]);

  const appendRuntimeLog = useCallback((message: string) => {
    setRuntimeLogs((prev) => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const clearRuntimeLogs = useCallback(() => setRuntimeLogs([]), []);

  useEffect(() => {
    const wsUrl = `${serviceUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/events`;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setServiceConnected(true);
    socket.onclose = () => setServiceConnected(false);
    socket.onerror = () => setServiceConnected(false);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as { message?: string; data?: string };
        const text = data.message ?? data.data;
        if (text) {
          setSerialOutput((prev) => `${prev}${text}`);
        }
      } catch {
        setSerialOutput((prev) => `${prev}${String(event.data)}\n`);
      }
    };
    return () => socket.close();
  }, [serviceUrl]);

  useEffect(() => {
    let active = true;
    storage.get('blocklyduino-ai-project').then((raw) => {
      if (!active || !raw) {
        return;
      }
      try {
        const project = JSON.parse(raw) as AiProject;
        setAiProject(project);
        setSprites(project.sprites);
        setWorkspaceXml(project.workspaceXml);
        if (project.runtimeCode) {
          setGeneratedCode(project.runtimeCode);
        }
      } catch {
        appendRuntimeLog('Impossible de relire la sauvegarde locale.');
      }
    });
    return () => {
      active = false;
    };
  }, [appendRuntimeLog, storage]);

  useEffect(() => {
    const socket = aiClient.connectEvents((event) => {
      if (event.type === 'serviceStatus') {
        setAiServiceConnected(event.connected);
      } else if (event.type === 'inferenceResult') {
        setLastDetection(event.result);
        appendRuntimeLog(`IA: ${event.result.label} (${Math.round(event.result.confidence * 100)} %)`);
      } else if (event.type === 'projectSaved') {
        appendRuntimeLog(`Projet synchronisé: ${event.project.name}`);
      } else if (event.type === 'runtimeLog') {
        appendRuntimeLog(event.message);
      }
    });
    socket.onopen = () => setAiServiceConnected(true);
    socket.onclose = () => setAiServiceConnected(false);
    socket.onerror = () => setAiServiceConnected(false);
    return () => socket.close();
  }, [aiClient, appendRuntimeLog]);

  const selectedBoardLabel = useMemo(
    () => BOARDS.find((b) => b.id === selectedBoardId)?.label ?? '...',
    [selectedBoardId],
  );

  async function callService<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${serviceUrl}${path}`, {
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    setServiceConnected(true);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Service Arduino indisponible (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  const refreshPorts = async () => {
    try {
      const data = await callService<{ ports: PortInfo[] }>('/ports');
      setPorts(data.ports);
    } catch (error) {
      setServiceConnected(false);
      setSerialOutput((prev) => `${prev}${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  const runCompileAction = async (path: '/verify/' | '/upload/') => {
    const board = boardById(selectedBoardId);
    setCompileStatus('running');
    setSerialOutput((prev) => `${prev}> ${path === '/verify/' ? 'Vérification' : 'Upload'} ${board.label}\n`);
    try {
      const result = await callService<{ ok: boolean; output: string }>(path, {
        method: 'POST',
        body: JSON.stringify({
          code: generatedCode,
          boardId: board.id,
          fqbn: board.fqbn,
          port: selectedPort,
          detailed: detailedCompilation,
        }),
      });
      setSerialOutput((prev) => `${prev}${result.output}\n`);
      setCompileStatus(result.ok ? 'success' : 'error');
    } catch (error) {
      setCompileStatus('error');
      setServiceConnected(false);
      setSerialOutput((prev) => `${prev}${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  const verifyCode = () => runCompileAction('/verify/');
  const uploadCode = () => runCompileAction('/upload/');

  const sendSparkiCommand = useCallback(
    async (command: string, expectReply?: boolean) => {
      const result = await callService<SparkiCommandResponse>('/sparki/command', {
        method: 'POST',
        body: JSON.stringify({
          command,
          port: selectedPort || undefined,
          baud: 9600,
          expectReply,
        }),
      });
      setSerialOutput((prev) => `${prev}> Sparki ${command}${result.reply ? ` -> ${result.reply}` : ''}\n`);
      return result;
    },
    [selectedPort, serviceUrl],
  );

  const buildCurrentProject = useCallback((): AiProject => {
    const now = new Date().toISOString();
    return {
      ...aiProject,
      workspaceXml,
      runtimeCode: generatedCode,
      sprites,
      updatedAt: now,
      createdAt: aiProject.createdAt === new Date(0).toISOString() ? now : aiProject.createdAt,
    };
  }, [aiProject, generatedCode, sprites, workspaceXml]);

  useEffect(() => {
    const project = buildCurrentProject();
    storage.set('blocklyduino-ai-project', JSON.stringify(project)).catch(() => {
      appendRuntimeLog('Autosauvegarde locale indisponible.');
    });
  }, [appendRuntimeLog, buildCurrentProject, storage]);

  const saveAiProject = useCallback(async () => {
    const project = buildCurrentProject();
    await storage.set('blocklyduino-ai-project', JSON.stringify(project));
    try {
      const saved = await aiClient.saveProject(project);
      setAiProject(saved);
      setAiServiceConnected(true);
      appendRuntimeLog(`Projet "${saved.name}" sauvegardé.`);
    } catch (error) {
      setAiServiceConnected(false);
      appendRuntimeLog(`Sauvegarde locale uniquement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [aiClient, appendRuntimeLog, buildCurrentProject, storage]);

  const loadAiProject = useCallback(
    (project: AiProject) => {
      setAiProject(project);
      setWorkspaceXml(project.workspaceXml);
      setSprites(project.sprites);
      setGeneratedCode(project.runtimeCode || DEFAULT_CODE);
      if (project.workspaceXml) {
        blockly?.loadXml(project.workspaceXml);
      }
      appendRuntimeLog(`Projet "${project.name}" chargé.`);
    },
    [appendRuntimeLog, blockly],
  );

  const inferWithAi = useCallback(
    async (request: AiInferenceRequest) => {
      const result = await aiClient.infer(request);
      setAiServiceConnected(true);
      setLastDetection(result);
      return result;
    },
    [aiClient],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      generatedCode,
      setGeneratedCode,
      workspaceXml,
      setWorkspaceXml,
      aiProject,
      aiServiceUrl,
      setAiServiceUrl,
      aiServiceConnected,
      sprites,
      setSprites,
      lastDetection,
      setLastDetection,
      runtimeStatus,
      setRuntimeStatus,
      runtimeLogs,
      appendRuntimeLog,
      clearRuntimeLogs,
      codeReadOnly,
      setCodeReadOnly,
      detailedCompilation,
      setDetailedCompilation,
      selectedBoardId,
      setSelectedBoardId,
      selectedPort,
      setSelectedPort,
      selectedBoardLabel,
      activePopup,
      setActivePopup,
      activeModal,
      setActiveModal,
      settingsOpen,
      setSettingsOpen,
      serialOutput,
      setSerialOutput,
      ports,
      serviceUrl,
      setServiceUrl,
      serviceConnected,
      compileStatus,
      refreshPorts,
      verifyCode,
      uploadCode,
      sendSparkiCommand,
      saveAiProject,
      loadAiProject,
      inferWithAi,
      blockly,
      setBlocklyActions,
    }),
    [
      generatedCode,
      workspaceXml,
      aiProject,
      aiServiceUrl,
      aiServiceConnected,
      sprites,
      lastDetection,
      runtimeStatus,
      runtimeLogs,
      appendRuntimeLog,
      clearRuntimeLogs,
      codeReadOnly,
      detailedCompilation,
      selectedBoardId,
      selectedPort,
      selectedBoardLabel,
      activePopup,
      activeModal,
      settingsOpen,
      serialOutput,
      ports,
      serviceUrl,
      serviceConnected,
      compileStatus,
      sendSparkiCommand,
      saveAiProject,
      loadAiProject,
      inferWithAi,
      blockly,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp doit être utilisé dans AppProvider');
  }
  return ctx;
}
